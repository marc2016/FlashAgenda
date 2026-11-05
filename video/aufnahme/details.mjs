// Records the "Details" video: a deep dive into one agenda (Stammtisch Oktober from the seed data).
// Needs only the frontend dev server; result: public/details/aufnahmen/<szene>.webm and szenen.json.
//   npm run aufnehmen:details                        all scenes
//   npm run aufnehmen:details -- --nur 03-neuer-punkt
import { aufnahme, FRONTEND, hoeheVon, klick, pause, scrollen, tippen, zeigen } from "./werkzeuge.mjs";

const STAMMTISCH = `${FRONTEND}/agenda/65f000000000000000000001`;
const { neueSeite, szene, schliessen } = await aufnahme("details/");

/** A control inside the agenda item card with the given title. */
const imPunkt = (page, titel, selektor) =>
  page.locator(`xpath=//*[normalize-space(text())="${titel}"]/ancestor::*[.//${selektor}][1]//${selektor}`).first();

async function oeffnen(page, text = "Brauhaus am Markt, Köln") {
  await page.goto(STAMMTISCH);
  await page.getByText(text).first().waitFor();
}

// --- 1. Details: date, place with map, menu, deadline, standard items ------------------------------
let page = await neueSeite();
await szene("01-details", page, async () => {
  await oeffnen(page);
  await page.mouse.move(800, 120);
}, async (markiere) => {
  await zeigen(page.locator("input").first(), 500);
  await zeigen(page.getByText("Brauhaus am Markt, Köln").first(), 300);
  markiere("karte");
  await klick(page.locator('button[title="Zum Veranstaltungsort zoomen"]').first());
  await pause(1200);
  await zeigen(page.getByText("Speisekarte öffnen").first(), 600);
  await zeigen(page.getByText(/Schluss: 12h vorher/).first(), 700);
  await zeigen(page.getByText(/Standardpunkte: An/).first(), 900);
});

// --- 2. People: cards, add a person --------------------------------------------------------------------
page = await neueSeite();
await szene("02-personen", page, async () => {
  await oeffnen(page);
  await page.evaluate((y) => window.scrollTo(0, y), await hoeheVon(page.locator('[data-testid="collapse-toggle-attendees"]'), 60));
  await page.mouse.move(800, 300);
}, async (markiere) => {
  await zeigen(page.getByText("Anna Schmidt").first(), 400);
  await zeigen(page.getByText("Lena Wagner").first(), 400);
  markiere("hinzufuegen");
  await klick(page.locator('[title="Person hinzufügen"]').first());
  await pause(500);
  const name = page.getByPlaceholder("Name der Person...");
  await klick(name);
  await tippen(name, "Jonas Klein");
  await pause(300);
  await klick(page.getByRole("button", { name: "Hinzufügen", exact: true }));
  await pause(1500);
  await zeigen(page.getByText("Jonas Klein").first(), 1200);
});

// --- 3. New item with markdown description and a poll ------------------------------------------------
page = await neueSeite();
await szene("03-neuer-punkt", page, async () => {
  await oeffnen(page, "Grillfest im Sommer planen");
  await page.evaluate((y) => window.scrollTo(0, y), await hoeheVon(page.getByText("Ausflug ins Phantasialand?").first(), 300));
  await page.mouse.move(1100, 500);
}, async (markiere) => {
  await klick(page.locator('button[title="Neuen Agendapunkt hinzufügen"]'));
  await pause(600);
  const dialog = page.getByRole("dialog");
  const titel = dialog.getByPlaceholder("Titel");
  await tippen(titel, "Weihnachtsfeier organisieren");
  await pause(200);
  await klick(dialog.getByText("Details & Bild hinzufügen"));
  const editor = dialog.locator('[contenteditable="true"]').first();
  await editor.waitFor();
  await pause(900);
  await klick(editor);
  await pause(200);
  await page.keyboard.type("Wer kümmert sich um Location, Essen und Wichteln?", { delay: 30 });
  await pause(300);
  markiere("abstimmung");
  await klick(dialog.getByRole("button", { name: "Abstimmung hinzufügen", exact: true }));
  await pause(400);
  for (const [i, text] of ["Restaurant", "Vereinsheim"].entries()) {
    const feld = dialog.getByPlaceholder(`Option ${i + 1}`);
    await klick(feld);
    await feld.press("ControlOrMeta+a");
    await tippen(feld, text);
  }
  await pause(400);
  await klick(dialog.getByRole("button", { name: "Speichern", exact: true }));
  await pause(900);
  const neu = page.getByText("Weihnachtsfeier organisieren").first();
  await scrollen(page, await hoeheVon(neu, 260), 1200);
  await zeigen(neu, 1300);
});

// --- 4. Comments: reaction and a new comment --------------------------------------------------------
page = await neueSeite();
await szene("04-kommentare", page, async () => {
  await oeffnen(page, "Grillfest im Sommer planen");
  await page.evaluate((y) => window.scrollTo(0, y), await hoeheVon(page.getByText("Grillfest im Sommer planen").first(), 200));
  await page.mouse.move(1100, 300);
}, async (markiere) => {
  await klick(imPunkt(page, "Grillfest im Sommer planen", 'button[@title="Kommentare"]'));
  await pause(900);
  const kommentar = page.getByText("Ich kann meinen Gasgrill mitbringen.").first();
  await scrollen(page, await hoeheVon(kommentar, 300), 1100);
  markiere("reaktion");
  const reaktion = page.locator('xpath=//*[contains(text(),"Ich kann meinen Gasgrill mitbringen.")]/ancestor::*[.//button[.//span[text()="🎉"]]][1]//button[.//span[text()="🎉"]]').first();
  await klick(reaktion);
  await pause(600);
  const feld = page.getByPlaceholder("Schreibe einen Kommentar...");
  await klick(feld);
  await tippen(feld, "Ich bringe Würstchen und Brötchen mit! 🌭");
  await pause(300);
  await klick(page.getByRole("button", { name: "Kommentieren", exact: true }));
  await pause(1600);
});

// --- 5. Ordering: collapse sections, sort by thumbs, pin -------------------------------------------
page = await neueSeite();
await szene("05-ordnen", page, async () => {
  await oeffnen(page);
  await page.mouse.move(900, 400);
}, async (markiere) => {
  await klick(page.locator('[data-testid="collapse-toggle-details"]'));
  await pause(700);
  await klick(page.locator('[data-testid="collapse-toggle-attendees"]'));
  await pause(700);
  await klick(page.locator('[data-testid="collapse-toggle-achievements"]'));
  await pause(900);
  markiere("sortieren");
  await klick(page.locator('button[title="Nach Bewertung sortieren"]'));
  await pause(1400);
  const anpinnen = imPunkt(page, "Neue Mitglieder vorstellen", 'button[@title="Agendapunkt anpinnen"]');
  await klick(anpinnen);
  await pause(1500);
});

// --- 6. Export: audit log and calendar --------------------------------------------------------------
page = await neueSeite();
await szene("06-export", page, async () => {
  await oeffnen(page);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.mouse.move(900, 500);
}, async (markiere) => {
  await zeigen(page.getByRole("button", { name: "Kalender (.ics)", exact: true }), 900);
  markiere("audit");
  await klick(page.getByRole("button", { name: "Audit-Log", exact: true }));
  await pause(3200);
  await page.keyboard.press("Escape");
  await pause(600);
});

await schliessen();
