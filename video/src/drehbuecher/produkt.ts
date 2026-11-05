import type { Drehbuch } from "../zeitplan.ts";

/** Product video, about 60 seconds: home, details, items, live meeting, phone. */
export const PRODUKT: Drehbuch = {
  id: "Produktvideo",
  ordner: "",
  untertitel: "Agenden in Sekunden –\nfür Stammtisch, Verein und Team.",
  sprecherIntro: "FlashAgenda. Agenden in Sekunden – für Stammtisch, Verein und Team.",
  sprecherOutro: "FlashAgenda. Agenda starten – und los!",
  outroPunkte: ["Kein Konto nötig", "Abstimmen, Daumen hoch, Kommentare", "Live-Sitzung mit Protokoll", "Als App, auch offline"],
  kapitel: [
    {
      szene: "01-start",
      bereich: "Startseite",
      titel: "Alle Agenden im Blick",
      sprecher: "Auf der Startseite siehst du alle deine Agenden: mit Karte, Datum, Status und dem Fortschritt der abgehakten Punkte.",
    },
    {
      szene: "02-details",
      bereich: "Agenda",
      titel: "Teilen per Link oder QR-Code",
      sprecher: "Datum, Ort und Speisekarte stehen ganz oben. Geteilt wird per Link oder QR-Code – ein Konto braucht niemand.",
    },
    {
      szene: "03-punkte",
      bereich: "Agendapunkte",
      titel: "Alle machen mit",
      sprecher: "Jeder trägt seine Themen selbst ein, gibt Daumen hoch, stimmt ab und kommentiert – in Echtzeit, auf allen Geräten.",
    },
    {
      szene: "04-live",
      bereich: "Live-Sitzung",
      titel: "Punkt für Punkt durch die Sitzung",
      sprecher: "In der Live-Sitzung führst du Punkt für Punkt durch die Agenda – mit Timer, Anwesenheit und Beschlüssen. Das Protokoll gibt es gleich dazu.",
    },
    {
      szene: "05-handy",
      bereich: "Unterwegs",
      titel: "Auf dem Handy",
      sprecher: "Und auf dem Handy installierst du FlashAgenda wie eine App. Sie funktioniert sogar offline.",
      punkte: ["Installierbar als App", "Funktioniert offline", "Synchronisiert automatisch"],
    },
  ],
};
