# Design

## Context

- `index.css` lädt Bangers bereits per Google-Fonts-Import und definiert `.comic-font { font-family: 'Bangers', cursive, sans-serif; letter-spacing: 2px; }`. Genutzt wird die Klasse im Startseiten-Logo, im Erfolge-Dialog und im Admin-Bereich.
- Titel: `h1` in `AgendaHeader.tsx` mit `text-3xl sm:text-4xl md:text-6xl font-bold`, gelbem Farbverlauf per `bg-clip-text` und `drop-shadow`. Bearbeitet wird er über `openEdit('title', agenda.title)`, der Bearbeiten-Dialog liest also aus den Daten, nicht aus dem DOM.
- Abschnitts-Überschriften: vier `h3` mit `text-xl sm:text-2xl` (Agendapunkte: `text-2xl`), `font-bold`, `textShadow: '2px 2px 0px #000'`. Davor steht jeweils ein Icon, daneben eventuell eine Zusammenfassung, rechts der Pfeil.
- Bangers hat nur Großbuchstaben und zeigt „ß“ fehlerhaft an (Ergebnis des Schriftvergleichs im Explore-Gespräch).

## Goals / Non-Goals

**Goals:**
- Einheitliche Comic-Schrift für Titel und Abschnitts-Überschriften, ohne neue Schrift und ohne Änderung an den Daten.

**Non-Goals:**
- Präsentation, Dialoge, Startseite und alle übrigen Texte.
- Eine allgemeine „ß“-Behandlung für andere Bangers-Stellen (z. B. Erfolge-Dialog).

## Decisions

### 1. Bestehende Klasse `.comic-font` wiederverwenden
Der Titel-`h1` und die vier `h3` bekommen die Klasse `comic-font`. `font-bold` entfällt, weil Bangers nur einen Schnitt hat und künstliches Fettsetzen unsauber aussieht. Farbe, Verlauf und Schatten bleiben.
*Alternative:* eine neue Klasse speziell für Überschriften. Verworfen, weil es mit `.comic-font` schon eine passende gibt.

### 2. Größen
Bangers ist schmaler als Inter fett. Die `h3` gehen von `text-xl sm:text-2xl` auf `text-2xl sm:text-3xl` (Agendapunkte von `text-2xl` auf `text-2xl sm:text-3xl`), die Icons wachsen mit. Der Titel behält seine Größe. Die endgültigen Werte werden per Screenshot bei 1440, 390 und 320 px geprüft. Kriterium: Pfeil und Zusammenfassung behalten Platz, und es gibt kein horizontales Scrollen.

### 2a. Mehr Abstand zur Zusammenfassung
Neben den größeren Bangers-Überschriften wirkt die Zusammenfassung im eingeklappten Zustand zu dicht. `SectionSummary` bekommt zusätzlich `ml-2`, zusammen mit dem `gap-2` der Zeile sind das 16 px.

### 3. „ß“ → „SS“ nur in der Anzeige des Titels
Ein kleiner Helper `toComicCaps(text)` ersetzt „ß“ durch „SS“ und wird nur beim Rendern des Titels genutzt: `{toComicCaps(agenda.title)}`. Die Daten und `openEdit('title', agenda.title)` bleiben unverändert.
*Alternative:* `text-transform: uppercase` mit `lang="de"`. Verworfen, weil Browser „ß“ dabei unterschiedlich behandeln und Bangers die Großbuchstaben ohnehin selbst liefert.
*Alternative:* `font-feature-settings` oder eine Ersatz-Schrift nur für „ß“ über `unicode-range`. Verworfen, weil das aufwendiger und bei per Google Fonts geladenen Schriften unzuverlässig ist.

## Risks / Trade-offs

- [Der Titel ist in Bangers schmaler oder breiter, Umbruch und Live-Kasten verschieben sich] → Screenshot-Prüfung mit Live-Kasten bei allen drei Breiten.
- [Größere Überschriften lassen „Agenda-Erfolge & Wanderpokale“ auf dem Handy früher umbrechen] → Bangers ist schmal, das gleicht sich weitgehend aus. Die Prüfung erfolgt per Screenshot und mit dem bestehenden 320-px-Test.
