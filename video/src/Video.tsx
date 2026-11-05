import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Audio, Freeze, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as ladeBangers } from "@remotion/google-fonts/Bangers";
import { loadFont as ladeInter } from "@remotion/google-fonts/Inter";
import { DREHBUECHER } from "./drehbuecher";
import { AUFNAHME, FPS, HANDY, introFrames, type Kapitel, kapitelFrames, outroFrames, STIMME_VORLAUF, type Szene, type Szenen, type Ton } from "./zeitplan";

const { fontFamily: COMIC } = ladeBangers();
const { fontFamily: INTER } = ladeInter("normal", { weights: ["500", "700", "800"], subsets: ["latin", "latin-ext"] });

// FlashAgenda colors (frontend/src/index.css)
const ROT = "#b71c1c";
const GELB = "#facc15";
const SCHWARZ = "#000";
const DUNKEL = "#1f2937";

const einblenden = (frame: number, dauer: number, rein = 10, raus = 10) =>
  interpolate(frame, [0, rein, dauer - raus, dauer], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** Comic text: Bangers with a black outline and an offset shadow. */
const comicText = (groesse: number, farbe = "white"): CSSProperties => ({
  fontFamily: COMIC,
  fontSize: groesse,
  color: farbe,
  letterSpacing: groesse * 0.02,
  WebkitTextStroke: `${Math.max(2, groesse / 28)}px ${SCHWARZ}`,
  paintOrder: "stroke fill",
  textShadow: `${groesse / 16}px ${groesse / 16}px 0 ${SCHWARZ}`,
  lineHeight: 1,
});

/** Red stage with a subtle halftone pattern and a slowly moving light. */
const Buehne = ({ children }: { children: ReactNode }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: ROT, fontFamily: INTER, color: "white", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          backgroundImage: "radial-gradient(#00000026 2.2px, transparent 2.6px)",
          backgroundSize: "22px 22px",
          backgroundPosition: `${frame * 0.4}px ${frame * 0.2}px`,
        }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(1100px 700px at 30% 10%, #ffffff1f, transparent), radial-gradient(900px 700px at 100% 100%, #00000055, transparent)" }} />
      {children}
    </AbsoluteFill>
  );
};

/** Comic burst lines behind the logo. */
const Strahlen = ({ drehung }: { drehung: number }) => (
  <svg width={1800} height={1800} viewBox="-900 -900 1800 1800" style={{ position: "absolute", left: "50%", top: "50%", marginLeft: -900, marginTop: -900, transform: `rotate(${drehung}deg)`, opacity: 0.18 }}>
    {Array.from({ length: 24 }, (_, i) => {
      const a = (i / 24) * Math.PI * 2;
      const b = a + Math.PI / 24;
      return <path key={i} d={`M0 0 L${Math.cos(a) * 1300} ${Math.sin(a) * 1300} L${Math.cos(b) * 1300} ${Math.sin(b) * 1300} Z`} fill="#ffe08a" />;
    })}
  </svg>
);

const Logo = ({ groesse }: { groesse: number }) => (
  <Img src={staticFile("logo.svg")} style={{ width: groesse, height: groesse, filter: `drop-shadow(${groesse / 22}px ${groesse / 22}px 0 ${SCHWARZ})` }} />
);

const Intro = ({ dauer, untertitel, kicker }: { dauer: number; untertitel: string; kicker?: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame, fps, config: { damping: 9, stiffness: 120 } });
  const titel = spring({ frame: frame - 8, fps, config: { damping: 12 } });
  const text = spring({ frame: frame - 18, fps, config: { damping: 200 } });
  return (
    <Buehne>
      <Strahlen drehung={frame * 0.25} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: einblenden(frame, dauer, 1, 12) }}>
        <div style={{ transform: `scale(${logo}) rotate(${(1 - logo) * -25}deg)` }}>
          <Logo groesse={300} />
        </div>
        <div style={{ position: "relative", marginTop: 26, transform: `scale(${0.6 + titel * 0.4})`, opacity: titel }}>
          <div style={comicText(170)}>FlashAgenda</div>
          {kicker && (
            <div
              style={{
                position: "absolute",
                right: -70,
                top: -48,
                transform: `rotate(8deg) scale(${spring({ frame: frame - 22, fps, config: { damping: 8, stiffness: 160 } })})`,
                background: GELB,
                border: `6px solid ${SCHWARZ}`,
                boxShadow: `8px 8px 0 ${SCHWARZ}`,
                padding: "10px 26px 4px",
                ...comicText(58, SCHWARZ),
                WebkitTextStroke: "0",
                textShadow: "none",
              }}
            >
              {kicker}
            </div>
          )}
        </div>
        <div style={{ marginTop: 34, fontSize: 46, fontWeight: 700, textAlign: "center", lineHeight: 1.3, whiteSpace: "pre-line", opacity: text, transform: `translateY(${(1 - text) * 25}px)`, textShadow: "3px 3px 0 #0006" }}>
          {untertitel}
        </div>
      </AbsoluteFill>
    </Buehne>
  );
};

/** Chapter label as a comic banner: yellow box with a black frame, tilted a little. */
const Banner = ({ k, nr }: { k: Kapitel; nr: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - 4, fps, config: { damping: 11, stiffness: 140 } });
  return (
    <div style={{ position: "absolute", top: 36, left: 160, display: "flex", alignItems: "center", gap: 22, transform: `translateX(${(1 - s) * -60}px) rotate(-1.5deg)`, opacity: Math.min(1, s * 1.5) }}>
      <div style={{ background: GELB, border: `5px solid ${SCHWARZ}`, boxShadow: `7px 7px 0 ${SCHWARZ}`, padding: "8px 22px 4px", ...comicText(54, SCHWARZ), WebkitTextStroke: "0", textShadow: "none" }}>
        {nr}
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "#fde68a", textShadow: "2px 2px 0 #0007" }}>{k.bereich}</div>
        <div style={comicText(62)}>{k.titel}</div>
      </div>
    </div>
  );
};

/** Holds the last frame of the recording while the voice is still speaking. */
const Clip = ({ s, frames }: { s: Szene; frames: number }) => {
  const ende = Math.round(s.dauer * FPS);
  return (
    <>
      <Sequence durationInFrames={ende} layout="none">
        <OffthreadVideo src={staticFile(s.datei)} muted style={{ width: "100%", height: "100%" }} />
      </Sequence>
      {frames > ende && (
        <Sequence from={ende} layout="none">
          <AbsoluteFill>
            <Freeze frame={0}>
              <OffthreadVideo src={staticFile(s.datei)} trimBefore={Math.max(0, ende - 3)} muted style={{ width: "100%", height: "100%" }} />
            </Freeze>
          </AbsoluteFill>
        </Sequence>
      )}
    </>
  );
};

/** Desktop recording in a comic panel (thick black frame, hard offset shadow). */
const Desktop = ({ k, s, nr, dauer }: { k: Kapitel; s: Szene; nr: number; dauer: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rein = spring({ frame, fps, config: { damping: 15, stiffness: 110 } });
  const SKALA = 0.9;
  const breite = AUFNAHME.breite * SKALA;
  const hoehe = AUFNAHME.hoehe * SKALA;
  return (
    <Buehne>
      <div
        style={{
          position: "absolute",
          left: (1920 - breite) / 2 - 9,
          top: 190,
          width: breite,
          height: hoehe,
          border: `8px solid ${SCHWARZ}`,
          borderRadius: 22,
          overflow: "hidden",
          background: DUNKEL,
          boxShadow: `18px 18px 0 ${SCHWARZ}`,
          opacity: Math.min(rein * 1.4, einblenden(frame, dauer, 1, 8)),
          transform: `translateY(${(1 - rein) * 120}px) rotate(${(1 - rein) * 2}deg)`,
        }}
      >
        <div style={{ width: AUFNAHME.breite, height: AUFNAHME.hoehe, transform: `scale(${SKALA})`, transformOrigin: "0 0" }}>
          <Clip s={s} frames={dauer} />
        </div>
      </div>
      <Banner k={k} nr={nr} />
    </Buehne>
  );
};

/** Phone recording in a device frame, bullet points on the left. */
const Handy = ({ k, s, nr, dauer }: { k: Kapitel; s: Szene; nr: number; dauer: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rein = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  const SKALA = 0.98;
  const RAND = 14;
  return (
    <Buehne>
      <div
        style={{
          position: "absolute",
          right: 300,
          top: 112 + (1 - rein) * 500,
          padding: RAND,
          background: "#111",
          borderRadius: 66,
          border: `6px solid ${SCHWARZ}`,
          boxShadow: `18px 18px 0 ${SCHWARZ}, inset 0 0 0 3px #3a3a3a`,
          transform: `rotate(${3 - rein * 1}deg)`,
          opacity: einblenden(frame, dauer, 1, 8),
        }}
      >
        <div style={{ width: HANDY.breite * SKALA, height: HANDY.hoehe * SKALA, borderRadius: 48, overflow: "hidden", position: "relative", background: ROT }}>
          <div style={{ width: HANDY.breite, height: HANDY.hoehe, transform: `scale(${SKALA})`, transformOrigin: "0 0" }}>
            <Clip s={s} frames={dauer} />
          </div>
          <div style={{ position: "absolute", top: 12, left: "50%", width: 120, height: 34, marginLeft: -60, borderRadius: 20, background: "#000" }} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 200, top: 340, display: "flex", flexDirection: "column", gap: 34 }}>
        {(k.punkte ?? []).map((p, i) => {
          const sp = spring({ frame: frame - 20 - i * 12, fps, config: { damping: 12 } });
          return (
            <div key={p} style={{ display: "flex", alignItems: "center", gap: 24, opacity: sp, transform: `translateX(${(1 - sp) * -50}px)` }}>
              <div style={{ width: 62, height: 62, borderRadius: 14, background: GELB, border: `5px solid ${SCHWARZ}`, boxShadow: `5px 5px 0 ${SCHWARZ}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 800, color: SCHWARZ }}>✓</div>
              <div style={{ fontSize: 46, fontWeight: 800, textShadow: "4px 4px 0 #0007" }}>{p}</div>
            </div>
          );
        })}
      </div>
      <Banner k={k} nr={nr} />
    </Buehne>
  );
};

const Outro = ({ dauer, punkte }: { dauer: number; punkte: string[] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame, fps, config: { damping: 10, stiffness: 120 } });
  return (
    <Buehne>
      <Strahlen drehung={-frame * 0.25} />
      <AbsoluteFill style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 110, opacity: einblenden(frame, dauer, 10, 24) }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${logo})` }}>
          <Logo groesse={260} />
          <div style={{ ...comicText(120), marginTop: 22 }}>FlashAgenda</div>
          <div style={{ marginTop: 40, background: GELB, color: SCHWARZ, border: `6px solid ${SCHWARZ}`, boxShadow: `9px 9px 0 ${SCHWARZ}`, borderRadius: 14, padding: "18px 40px", fontSize: 44, fontWeight: 800, letterSpacing: 1 }}>
            ⚡ AGENDA STARTEN!
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {punkte.map((p, i) => {
            const s = spring({ frame: frame - 12 - i * 7, fps, config: { damping: 13 } });
            return (
              <div key={p} style={{ fontSize: 44, fontWeight: 800, opacity: s, transform: `translateX(${(1 - s) * 40}px)`, display: "flex", gap: 20, alignItems: "center", textShadow: "3px 3px 0 #0007" }}>
                <span style={{ color: GELB, ...comicText(52, GELB) }}>✓</span> {p}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Buehne>
  );
};

/** Voice slightly below full level so it sits with the music. */
const STIMME_LAUTSTAERKE = 0.8;

/** Music quieter while the voice speaks (soft ramps), fade at start and end. */
const musikLautstaerke = (frame: number, sprechen: [number, number][], gesamt: number) => {
  const RAMPE = 12;
  const nah = Math.min(1, ...sprechen.map(([a, b]) => (frame < a ? (a - frame) / RAMPE : frame > b ? (frame - b) / RAMPE : 0)));
  const laut = interpolate(nah, [0, 1], [0.12, 0.55]);
  return laut * interpolate(frame, [0, 15, gesamt - 45, gesamt], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
};

export const Video = ({ video, szenen, ton }: { video: string; szenen: Szenen; ton: Ton }) => {
  const DREHBUCH = DREHBUECHER[video];
  const kapitel = DREHBUCH.kapitel.filter((k) => szenen[k.szene]);
  const intro = introFrames(ton);
  const outro = outroFrames(ton);
  const abschnitte: { schluessel: string; von: number; dauer: number; kapitel?: Kapitel; nr: number }[] = [{ schluessel: "intro", von: 0, dauer: intro, nr: 0 }];
  let start = intro;
  kapitel.forEach((k, i) => {
    const dauer = kapitelFrames(k, szenen[k.szene], ton);
    abschnitte.push({ schluessel: k.szene, von: start, dauer, kapitel: k, nr: i + 1 });
    start += dauer;
  });
  abschnitte.push({ schluessel: "outro", von: start, dauer: outro, nr: 0 });
  const gesamt = start + outro;

  const stimmen = abschnitte.filter((a) => ton.stimmen[a.schluessel]).map((a) => ({ ...ton.stimmen[a.schluessel], von: a.von + STIMME_VORLAUF }));
  const sprechen = stimmen.map((st): [number, number] => [st.von, st.von + Math.ceil(st.dauer * FPS)]);

  return (
    <AbsoluteFill style={{ background: ROT }}>
      {abschnitte.map((a) => {
        const k = a.kapitel;
        const s = k && szenen[k.szene];
        return (
          <Sequence key={a.schluessel} from={a.von} durationInFrames={a.dauer}>
            {a.schluessel === "intro" && <Intro dauer={a.dauer} untertitel={DREHBUCH.untertitel} kicker={DREHBUCH.kicker} />}
            {a.schluessel === "outro" && <Outro dauer={a.dauer} punkte={DREHBUCH.outroPunkte} />}
            {k && s && (s.handy ? <Handy k={k} s={s} nr={a.nr} dauer={a.dauer} /> : <Desktop k={k} s={s} nr={a.nr} dauer={a.dauer} />)}
          </Sequence>
        );
      })}
      {stimmen.map((st) => (
        <Sequence key={st.datei} from={st.von} durationInFrames={Math.ceil(st.dauer * FPS) + 2} layout="none">
          <Audio src={staticFile(st.datei)} volume={STIMME_LAUTSTAERKE} />
        </Sequence>
      ))}
      {ton.musik && <Audio src={staticFile(ton.musik)} volume={(f) => musikLautstaerke(f, sprechen, gesamt)} />}
    </AbsoluteFill>
  );
};
