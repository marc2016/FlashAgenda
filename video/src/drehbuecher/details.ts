import type { Drehbuch } from "../zeitplan.ts";

/** Deep dive into a single agenda: details, people, new item, comments, ordering, export. */
export const DETAILS: Drehbuch = {
  id: "Details",
  ordner: "details/",
  kicker: "Im Detail",
  untertitel: "So holst du alles\naus deiner Agenda heraus.",
  sprecherIntro: "FlashAgenda im Detail. So holst du alles aus deiner Agenda heraus.",
  sprecherOutro: "FlashAgenda. Agenda starten – und alle machen mit!",
  outroPunkte: ["Details mit Karte und Annahmeschluss", "Personen mit persönlichem Code", "Markdown, Bilder und Abstimmungen", "Kommentare mit Reaktionen", "Sortieren, Anpinnen, Einklappen", "Kalender-Export und Audit-Log"],
  kapitel: [
    {
      szene: "01-details",
      bereich: "Details",
      titel: "Alles Wichtige ganz oben",
      sprecher:
        "Oben in jeder Agenda stehen die Details: Datum, Ort mit Karte, ein Link zur Speisekarte und der Annahmeschluss für neue Punkte. " +
        "Auf Wunsch stehen Begrüßung, neuer Termin und Location automatisch auf der Agenda.",
    },
    {
      szene: "02-personen",
      bereich: "Personen",
      titel: "Wer ist dabei?",
      sprecher: "Bei den Personen siehst du, wer dabei ist und wer zuletzt online war. Neue Leute fügst du mit einem Klick hinzu – wiedererkannt wird jeder über einen kurzen Code.",
    },
    {
      szene: "03-neuer-punkt",
      bereich: "Agendapunkte",
      titel: "Neuer Punkt mit Abstimmung",
      sprecher: "Ein neuer Punkt ist schnell angelegt: Titel, eine Beschreibung mit Markdown und auf Wunsch gleich eine Abstimmung dazu.",
    },
    {
      szene: "04-kommentare",
      bereich: "Kommentare",
      titel: "Vorher schon klären",
      sprecher: "Zu jedem Punkt wird diskutiert: mit Kommentaren, Emoji-Reaktionen und PDF-Anhängen. So ist vor der Sitzung schon vieles geklärt.",
    },
    {
      szene: "05-ordnen",
      bereich: "Überblick",
      titel: "Einklappen und sortieren",
      sprecher: "Abschnitte lassen sich einklappen und zeigen dann eine kurze Zusammenfassung. Die Punkte sortierst du nach Datum, nach Daumen oder zufällig – Wichtiges pinnst du nach oben.",
    },
    {
      szene: "06-export",
      bereich: "Export",
      titel: "Kalender und Audit-Log",
      sprecher: "Und zum Schluss: Mit einem Klick landet der Termin im Kalender, und das Audit-Log hält jede Änderung nachvollziehbar fest.",
    },
  ],
};
