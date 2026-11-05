// Records the product video scenes with Playwright. Needs only the frontend dev server (cd frontend && npm run dev),
// the API is mocked with the seed data. Result: public/aufnahmen/<szene>.webm and szenen.json.
//   npm run aufnehmen                    all scenes
//   npm run aufnehmen -- --nur 04-live   single scene(s), the others are kept
//   npm run aufnehmen -- --sichtbar      with a visible browser
import { aufnahme, FRONTEND, hoeheVon, klick, pause, scrollen, tippen, zeigen } from "./werkzeuge.mjs";

const STAMMTISCH = "65f000000000000000000001";
const STRASSENFEST = "65f000000000000000000003";

const { neueSeite, szene, schliessen } = await aufnahme();

// --- 1. Home: all agendas as tiles ----------------------------------------------------------------
let page = await neueSeite();
await szene("01-start", page, async () => {
  await page.goto(`${FRONTEND}/`);
  await page.getByText("Stammtisch Oktober").first().waitFor();
  await page.mouse.move(1250, 260);
}, async (markiere) => {
  await pause(600);
  await scrollen(page, 520, 1800);
  markiere("kacheln");
  await zeigen(page.getByText("Vereinssitzung Straßenfest").first(), 500);
  await zeigen(page.getByText("Stammtisch Oktober").first(), 500);
  await klick(page.locator("button, [role=tab]", { hasText: /^\s*Alle/i }).first());
  await pause(700);
  await zeigen(page.getByText("Team-Retro Sprint 42").first(), 900);
});

// --- 2. Agenda details: date, place, menu, QR code ------------------------------------------------
page = await neueSeite();
await szene("02-details", page, async () => {
  await page.goto(`${FRONTEND}/agenda/${STAMMTISCH}`);
  await page.getByText("Brauhaus am Markt, Köln").first().waitFor();
  await page.mouse.move(1100, 650);
}, async (markiere) => {
  await zeigen(page.getByText("Brauhaus am Markt, Köln").first(), 500);
  await zeigen(page.getByText("Speisekarte öffnen").first(), 500);
  markiere("qr");
  await klick(page.locator('button[title="QR-Code anzeigen"], button[title="QR-Code"]').first());
  await pause(2800);
  await page.keyboard.press("Escape");
  await pause(500);
});

// --- 3. Agenda items: vote, thumbs up -------------------------------------------------------------
page = await neueSeite();
await szene("03-punkte", page, async () => {
  await page.goto(`${FRONTEND}/agenda/${STAMMTISCH}`);
  const grillfest = page.getByText("Grillfest im Sommer planen").first();
  await grillfest.waitFor();
  await page.evaluate(async (y) => window.scrollTo(0, y), await hoeheVon(grillfest, 200));
  await page.mouse.move(1100, 420);
}, async (markiere) => {
  await klick(page.getByRole("button", { name: "Abstimmen" }).first());
  await pause(700);
  markiere("abstimmung");
  await klick(page.getByText("19./20. Juli").last());
  await pause(300);
  await klick(page.getByRole("button", { name: "Stimme abgeben" }));
  await pause(1200);
  const kasse = page.getByText("Vereinskasse: Stand und Ausblick").first();
  await scrollen(page, await hoeheVon(kasse, 420), 1200);
  markiere("daumen");
  const daumen = page.locator('xpath=//*[contains(text(),"Vereinskasse: Stand und Ausblick")]/ancestor::*[.//button[@title="Daumen hoch"]][1]//button[@title="Daumen hoch"]').first();
  await klick(daumen);
  await pause(1200);
});

// --- 4. Live meeting: note a decision, check off and continue -------------------------------------
page = await neueSeite();
await szene("04-live", page, async () => {
  await page.goto(`${FRONTEND}/agenda/${STRASSENFEST}`);
  await page.getByText("Standplan und Genehmigung").first().waitFor();
  await page.mouse.move(1250, 700);
}, async (markiere) => {
  const notiz = page.getByPlaceholder(/Beschluss oder Notiz/);
  await klick(notiz);
  markiere("notiz");
  await tippen(notiz, "Strom kommt vom Vereinsheim, Tom klärt das bis Freitag.");
  await pause(300);
  await klick(page.getByRole("button", { name: "Notiz speichern" }));
  await pause(800);
  markiere("weiter");
  await klick(page.getByRole("button", { name: /Abhaken & Weiter/ }));
  await pause(2200);
});

// --- 5. Phone: the same agenda on a small screen --------------------------------------------------
page = await neueSeite({ handy: true });
await szene("05-handy", page, async () => {
  await page.goto(`${FRONTEND}/agenda/${STAMMTISCH}`);
  await page.getByText("Brauhaus am Markt, Köln").first().waitFor();
}, async () => {
  await pause(700);
  await scrollen(page, 900, 2200);
  await pause(400);
  await scrollen(page, await hoeheVon(page.getByText("Grillfest im Sommer planen").first(), 120), 2200);
  await pause(1500);
});

await schliessen();
