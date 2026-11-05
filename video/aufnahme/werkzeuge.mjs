// Shared helpers for the recording script: browser with mocked API (frontend only), visible cursor and clicks,
// scenes with time marks. The demo data comes straight from backend/scripts/seedData.ts.
import { chromium, devices } from "playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const WURZEL = join(dirname(fileURLToPath(import.meta.url)), "..");
export const FRONTEND = process.env.FRONTEND_URL ?? "http://localhost:5188";
/** Viewport and video size; Remotion shows the recording 1:1 inside the frame. */
export const VIEWPORT = { width: 1600, height: 900 };
export const HANDY = { width: 390, height: 844 };

export const pause = (ms) => new Promise((r) => setTimeout(r, ms));
export const tippen = (locator, text) => locator.pressSequentially(text, { delay: 40 });

/** Loads the backend seed data (TypeScript, CommonJS package) as an ES module. */
async function seedDaten() {
  const quelle = readFileSync(join(WURZEL, "..", "backend", "scripts", "seedData.ts"), "utf8");
  const js = stripTypeScriptTypes(quelle);
  return import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
}

/** A few plausible audit entries in addition to "Agenda erstellt". */
const AUDIT_EXTRA = (a) => {
  if (!a) return [];
  const t = (stunden) => new Date(Date.now() - stunden * 3600_000).toISOString();
  const [p1, p2, p3] = a.attendees.map((x) => x.name);
  const titel = a.items.filter((i) => !i.systemKey).map((i) => i.title);
  return [
    { action: "Person hinzugefügt", user: p1, details: `${p2} wurde zur Agenda hinzugefügt.`, timestamp: t(300) },
    { action: "Agendapunkt erstellt", user: p2, details: `Agendapunkt "${titel[0]}" wurde erstellt.`, timestamp: t(120) },
    { action: "Abstimmung", user: p3 ?? p1, details: `Stimme zu "${titel[0]}" abgegeben.`, timestamp: t(50) },
    { action: "Kommentar hinzugefügt", user: p3 ?? p2, details: `Kommentar zu "${titel[0]}".`, timestamp: t(26) },
    { action: "Daumen hoch", user: p1, details: `Daumen hoch für "${titel[1] ?? titel[0]}".`, timestamp: t(3) },
  ];
};

const json = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

/** Mocks all API calls with the seed agendas; PUT updates are kept in memory. Max is the signed-in user. */
async function mocken(context) {
  const { buildSeedAgendas, SEED_PEOPLE } = await seedDaten();
  const agendas = JSON.parse(JSON.stringify(buildSeedAgendas()));
  for (const a of agendas) a.items.forEach((it, i) => { it._id ??= `${a._id}-item-${i}`; it.comments ??= []; it.upvotes ??= []; });
  const max = SEED_PEOPLE.max;
  const user = { id: max.id, name: max.name, email: max.email, cardColor: max.cardColor, securityCode: max.securityCode, secretGuid: `${max.id}-secret`, isRegistered: true };

  await context.addInitScript(({ user, ids }) => {
    try {
      localStorage.setItem("flashagenda_last_user", JSON.stringify(user));
      for (const id of ids) localStorage.setItem(`flashagenda_${id}_user`, JSON.stringify(user));
      localStorage.setItem("flashagenda_pwa_banner_dismissed", "true");
      localStorage.setItem("flashagenda_passkey_hint_dismissed", "true");
    } catch {}
  }, { user, ids: agendas.map((a) => a._id) });

  await context.route("**/socket.io/**", (r) => r.abort());
  await context.route("**/api/**", async (route) => {
    const req = route.request();
    const p = new URL(req.url()).pathname;
    if (p.includes("/achievements")) return json(route, { teamMilestones: [], personalAchievements: [], dynamicLeaders: [], milestonesUnlocked: 0, totalMilestones: 0 });
    if (p.endsWith("/user-stats")) return json(route, { agendasCount: agendas.length, totalItemsContributed: 7 });
    if (p.endsWith("/user-agendas")) return json(route, agendas);
    if (p.endsWith("/user-profile")) return json(route, { success: true });
    if (p.includes("/audits")) {
      const a = agendas.find((x) => p.includes(x._id));
      return json(route, [...(a?.auditLogs ?? []), ...AUDIT_EXTRA(a)].sort((x, y) => new Date(y.timestamp) - new Date(x.timestamp)));
    }
    if (p.includes("/passkeys")) return json(route, []);
    const m = p.match(/^\/api\/agendas\/([^/]+)(\/.*)?$/);
    if (m) {
      const a = agendas.find((x) => x._id === m[1]);
      if (!a) return json(route, { message: "not found" }, 404);
      if (req.method() === "POST" && m[2] === "/attendees") {
        const neu = req.postDataJSON() ?? {};
        a.attendees.push({ id: `neu-${Date.now()}`, isRegistered: false, attendanceStatus: "unconfirmed", joinedAt: new Date().toISOString(), lastSeen: new Date().toISOString(), ...neu });
        return json(route, a);
      }
      if (req.method() === "PUT" && !m[2]) {
        const { userId, userName, ...rest } = req.postDataJSON() ?? {};
        Object.assign(a, rest);
        a.items?.forEach((it, i) => { it._id ??= `${a._id}-neu-${Date.now()}-${i}`; });
      }
      return json(route, a);
    }
    return json(route, []);
  });
}

/** Visible cursor (follows mouse events) with a yellow click ripple, matching the comic look. */
const MAUSZEIGER = `(() => {
  const an = () => {
    if (document.getElementById("demo-zeiger")) return;
    const z = document.createElement("div");
    z.id = "demo-zeiger";
    z.innerHTML = '<svg width="34" height="34" viewBox="0 0 24 24"><path d="M4 2l16 10-7 1.5L9.5 21z" fill="white" stroke="black" stroke-width="1.8" stroke-linejoin="round"/></svg>';
    z.style.cssText = "position:fixed;left:-60px;top:-60px;z-index:2147483647;pointer-events:none;transform:translate(-5px,-3px);filter:drop-shadow(2px 3px 0 rgba(0,0,0,.45))";
    document.documentElement.appendChild(z);
    addEventListener("mousemove", (e) => { z.style.left = e.clientX + "px"; z.style.top = e.clientY + "px"; }, true);
    addEventListener("mousedown", (e) => {
      const w = document.createElement("div");
      w.style.cssText = "position:fixed;z-index:2147483646;pointer-events:none;width:48px;height:48px;margin:-24px 0 0 -24px;border-radius:50%;border:5px solid #facc15;transition:transform .45s ease-out,opacity .45s ease-out;transform:scale(.3)";
      w.style.left = e.clientX + "px"; w.style.top = e.clientY + "px";
      document.documentElement.appendChild(w);
      requestAnimationFrame(() => { w.style.transform = "scale(1.5)"; w.style.opacity = "0"; });
      setTimeout(() => w.remove(), 500);
    }, true);
  };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", an); else an();
})();`;

/** Moves the cursor visibly onto the element (no click). */
export async function zeigen(locator, verweilen = 0) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (box) await locator.page().mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 22 });
  await pause(150 + verweilen);
}

/** Moves the cursor visibly to the element and clicks. */
export async function klick(locator, optionen) {
  await zeigen(locator, 120);
  await locator.click(optionen);
}

/** Smooth scroll to `y` (page pixels) within `ms`. */
export const scrollen = (page, y, ms = 1400) =>
  page.evaluate(([y, ms]) => new Promise((fertig) => {
    const s = window.scrollY, d = y - s, t0 = performance.now();
    const schritt = (jetzt) => {
      const t = Math.min(1, (jetzt - t0) / ms);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      window.scrollTo(0, s + d * e);
      t < 1 ? requestAnimationFrame(schritt) : fertig();
    };
    requestAnimationFrame(schritt);
  }), [y, ms]);

/** Page y position of an element minus `abstand`, as a scroll target. */
export const hoeheVon = async (locator, abstand = 120) => {
  const box = await locator.boundingBox();
  return (await locator.page().evaluate(() => window.scrollY)) + box.y - abstand;
};

/**
 * Starts a recording into public/<ordner>aufnahmen/ with szenen.json (durations and time marks).
 * `--nur <a,b>` records only these scenes and keeps the others, `--sichtbar` shows the browser.
 */
export async function aufnahme(ordner = "") {
  const ziel = join(WURZEL, "public", ordner, "aufnahmen");
  mkdirSync(ziel, { recursive: true });
  const nur = process.argv.includes("--nur") ? process.argv[process.argv.indexOf("--nur") + 1].split(",") : [];
  const datei = join(ziel, "szenen.json");
  const szenen = existsSync(datei) ? JSON.parse(readFileSync(datei, "utf8")) : {};
  const browser = await chromium.launch({ headless: !process.argv.includes("--sichtbar") });

  return {
    async neueSeite({ handy = false } = {}) {
      const context = await browser.newContext({
        ...(handy ? devices["iPhone 14"] : {}),
        viewport: handy ? HANDY : VIEWPORT,
        deviceScaleFactor: handy ? 3 : 2,
        locale: "de-DE",
        serviceWorkers: "block",
      });
      await mocken(context);
      await context.addInitScript(MAUSZEIGER);
      const page = await context.newPage();
      page.on("pageerror", (e) => console.warn("  pageerror:", e.message));
      return page;
    },
    /** Records a scene; `markiere(name)` stores a time mark in seconds since the scene start. */
    async szene(name, page, vorbereiten, ablauf) {
      if (nur.length && !nur.includes(name)) return console.log(`⏭ ${name}`);
      console.log(`▶ ${name}`);
      await vorbereiten();
      await page.waitForLoadState("networkidle").catch(() => {});
      await pause(600);
      const groesse = page.viewportSize();
      const handy = groesse.width < 600;
      await page.screencast.start({ path: join(ziel, `${name}.webm`), size: groesse, quality: 90 });
      const start = Date.now();
      const marken = {};
      try {
        await pause(700);
        await ablauf((m) => (marken[m] = (Date.now() - start) / 1000));
        await pause(1000);
      } finally {
        await page.screencast.stop();
      }
      szenen[name] = { datei: `${ordner}aufnahmen/${name}.webm`, dauer: (Date.now() - start) / 1000, marken, handy };
      writeFileSync(datei, JSON.stringify(szenen, null, 2));
      await page.context().close();
    },
    async schliessen() {
      await browser.close();
      console.log(`Fertig: ${ziel}`);
    },
  };
}
