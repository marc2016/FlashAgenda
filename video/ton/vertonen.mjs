// Generates the voice-over and background music for the product video.
// Voice: Piper (de_DE-thorsten-high, local) by default, TTS=gemini for Gemini TTS, TTS=say for macOS.
// Music: Lyria with GOOGLE_GENAI_API_KEY (environment or ../.env), otherwise a synthesized track.
// Result: public/<ordner>ton/<key>.wav, musik.* and ton.json. Existing files are reused while text and voice are unchanged.
//   npm run vertonen                      product video: only missing or changed parts
//   npm run vertonen -- --video details   other script (see src/drehbuecher)
//   npm run vertonen -- --musik  regenerate the music
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DREHBUECHER } from "../src/drehbuecher/index.ts";
import { sprechertexte } from "../src/zeitplan.ts";
import { musikSynthetisieren } from "./musik.mjs";

const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
const VIDEO = process.argv.includes("--video") ? process.argv[process.argv.indexOf("--video") + 1] : "produkt";
const DREHBUCH = DREHBUECHER[VIDEO];
if (!DREHBUCH) throw new Error(`Unbekanntes Video "${VIDEO}", vorhanden: ${Object.keys(DREHBUECHER).join(", ")}`);
const ZIEL = join(WURZEL, "public", DREHBUCH.ordner, "ton");
const TTS_MODELL = process.env.TTS_MODELL ?? "gemini-3.8-flash-tts";
const MUSIK_MODELL = process.env.MUSIK_MODELL ?? "lyria-3-pro-preview";
const MUSIK_PROMPT =
  "Instrumental background music for a playful, upbeat product video of a comic-styled meeting agenda app. Punchy drums, " +
  "bright plucked synths, warm bass, a little ukulele or marimba, cheerful and energetic, around 115 BPM, steady energy that sits " +
  "under a voice-over, no vocals. Duration about 1 minute 15 seconds with a short intro and a clean ending.";

function schluessel() {
  if (process.env.GOOGLE_GENAI_API_KEY) return process.env.GOOGLE_GENAI_API_KEY;
  const env = join(WURZEL, "..", ".env");
  const zeile = existsSync(env) && readFileSync(env, "utf8").match(/^GOOGLE_GENAI_API_KEY=(.+)$/m);
  return zeile ? zeile[1].trim().replace(/^["']|["']$/g, "") : "";
}
const KEY = schluessel();
const PIPER_DATEN = process.env.PIPER_DATA_DIR ?? join(homedir(), "piper-voices");
const hatPiper = (() => { try { execFileSync("which", ["piper"], { stdio: "ignore" }); return true; } catch { return false; } })();
/** Voice engine: TTS=piper|gemini|say; default Piper (local), otherwise Gemini with a key, otherwise macOS say. */
const TTS = process.env.TTS ?? (hatPiper ? "piper" : KEY ? "gemini" : "say");
if (TTS === "gemini" && !KEY) throw new Error("TTS=gemini braucht GOOGLE_GENAI_API_KEY");
const STIMME = process.env.STIMME ?? { piper: "de_DE-thorsten-high", gemini: "Puck", say: "Anna" }[TTS];
console.log(`Stimme: ${TTS} / ${STIMME}${KEY ? "" : " · Musik: synthetisch (kein GOOGLE_GENAI_API_KEY)"}`);

async function generieren(modell, body) {
  for (let versuch = 1; ; versuch++) {
    const antwort = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modell}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(300_000),
    });
    const json = await antwort.json();
    const teil = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (teil) return { mime: teil.inlineData.mimeType, daten: Buffer.from(teil.inlineData.data, "base64") };
    if (json.error?.code === 429 && versuch < 8) {
      const verzoegerung = json.error.details?.find((d) => d.retryDelay)?.retryDelay;
      const sekunden = Math.ceil(parseFloat(verzoegerung ?? "30")) + 2;
      console.warn(`  ${modell}: Kontingent erreicht, warte ${sekunden} s …`);
      await new Promise((r) => setTimeout(r, sekunden * 1000));
      continue;
    }
    if (versuch >= 3) throw new Error(`${modell}: keine Audiodaten - ${JSON.stringify(json).slice(0, 300)}`);
    console.warn(`  ${modell}: Versuch ${versuch} ohne Audio, neuer Versuch …`);
  }
}

/** Duration of a PCM WAV file in seconds. */
function wavDauer(buf) {
  let pos = 12;
  let byteRate = 0;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4);
    const groesse = buf.readUInt32LE(pos + 4);
    if (id === "fmt ") byteRate = buf.readUInt32LE(pos + 16);
    if (id === "data") return Math.min(groesse, buf.length - pos - 8) / byteRate;
    pos += 8 + groesse;
  }
  throw new Error("Keine WAV-Datei");
}

/** Wraps raw PCM (16 bit, mono) into a WAV file. */
function alsWav(pcm, rate) {
  const kopf = Buffer.alloc(44);
  kopf.write("RIFF", 0);
  kopf.writeUInt32LE(36 + pcm.length, 4);
  kopf.write("WAVEfmt ", 8);
  kopf.writeUInt32LE(16, 16);
  kopf.writeUInt16LE(1, 20);
  kopf.writeUInt16LE(1, 22);
  kopf.writeUInt32LE(rate, 24);
  kopf.writeUInt32LE(rate * 2, 28);
  kopf.writeUInt16LE(2, 32);
  kopf.writeUInt16LE(16, 34);
  kopf.write("data", 36);
  kopf.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([kopf, pcm]);
}

/** Local voices read the product name in English only when it is spelled out. */
const lokal = (text) => text.replaceAll("FlashAgenda", "Fläsch-Agenda");

async function sprechen(text) {
  if (TTS === "piper") {
    const wav = join(ZIEL, "tmp.wav");
    execFileSync("piper", ["--data-dir", PIPER_DATEN, "-m", STIMME, "-f", wav], { input: lokal(text), stdio: ["pipe", "ignore", "inherit"] });
    const daten = readFileSync(wav);
    rmSync(wav);
    return daten;
  }
  if (TTS === "gemini") {
    const { mime, daten } = await generieren(TTS_MODELL, {
      contents: [{ parts: [{ text }] }],
      generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: STIMME } } } },
    });
    return mime.includes("wav") ? daten : alsWav(daten, Number(mime.match(/rate=(\d+)/)?.[1] ?? 24000));
  }
  // macOS fallback: spell the product name so the German voice says it in English.
  const aiff = join(ZIEL, "tmp.aiff");
  const wav = join(ZIEL, "tmp.wav");
  execFileSync("say", ["-v", STIMME, "-r", "172", "-o", aiff, lokal(text).replaceAll("–", ",")]);
  execFileSync("afconvert", ["-f", "WAVE", "-d", "LEI16@48000", aiff, wav]);
  const daten = readFileSync(wav);
  rmSync(aiff);
  rmSync(wav);
  return daten;
}

mkdirSync(ZIEL, { recursive: true });
const tonDatei = join(ZIEL, "ton.json");
const alt = existsSync(tonDatei) ? JSON.parse(readFileSync(tonDatei, "utf8")) : { stimmen: {} };
const ton = { musik: alt.musik, stimmen: {} };

for (const [name, text] of Object.entries(sprechertexte(DREHBUCH))) {
  const datei = `${DREHBUCH.ordner}ton/${name}.wav`;
  const vorher = alt.stimmen?.[name];
  if (vorher?.text === text && vorher.stimme === STIMME && vorher.tts === TTS && existsSync(join(WURZEL, "public", datei))) {
    ton.stimmen[name] = vorher;
    continue;
  }
  console.log(`🎙  ${name}`);
  const wav = await sprechen(text);
  writeFileSync(join(WURZEL, "public", datei), wav);
  ton.stimmen[name] = { datei, dauer: wavDauer(wav), text, stimme: STIMME, tts: TTS };
  writeFileSync(tonDatei, JSON.stringify(ton, null, 2));
}

const musikFehlt = !ton.musik || !existsSync(join(WURZEL, "public", ton.musik));
if (musikFehlt || process.argv.includes("--musik")) {
  console.log("🎵 Musik");
  if (KEY) {
    const { daten } = await generieren(MUSIK_MODELL, { contents: [{ parts: [{ text: MUSIK_PROMPT }] }] });
    writeFileSync(join(ZIEL, "musik.mp3"), daten);
    ton.musik = `${DREHBUCH.ordner}ton/musik.mp3`;
  } else {
    writeFileSync(join(ZIEL, "musik.wav"), musikSynthetisieren(150));
    ton.musik = `${DREHBUCH.ordner}ton/musik.wav`;
  }
}

writeFileSync(tonDatei, JSON.stringify(ton, null, 2));
for (const [name, s] of Object.entries(ton.stimmen)) console.log(`  ${name.padEnd(12)} ${s.dauer.toFixed(1)} s`);
console.log(`Fertig: ${ZIEL}`);
