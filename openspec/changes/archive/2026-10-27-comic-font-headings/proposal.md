# Proposal

## Why

Die Agenda-Seite hat einen Comic-Look (rotes Rot, schwarze Rahmen, harte Schatten), die Überschriften stehen aber in der neutralen Inter. Das Logo auf der Startseite und der Erfolge-Dialog nutzen schon die Comic-Schrift Bangers. Titel und Abschnitts-Überschriften sollen dazu passen.

## What Changes

- Der **Agenda-Titel** und die vier **Abschnitts-Überschriften** (Details, Personen, Agenda-Erfolge & Wanderpokale, Agendapunkte) werden in **Bangers** gesetzt, über die bestehende Klasse `.comic-font`.
- Im Agenda-Titel wird **„ß“ automatisch als „SS“ angezeigt**, weil Bangers nur Großbuchstaben hat und das „ß“ dort falsch aussieht (z. B. „Straßenfest“ → „STRASSENFEST“). Gespeichert und im Bearbeiten-Dialog bleibt der Originaltext mit „ß“.
- Die Abschnitts-Überschriften werden leicht vergrößert, damit sie in Bangers genauso kräftig wirken wie vorher.
- Alles andere bleibt in Inter: Kacheln, Zusammenfassungen, Zähler, Live-Kasten, Präsentation, Dialoge.

## Capabilities

### New Capabilities
<!-- keine -->

### Modified Capabilities
- `agenda-page-sections`: neue Anforderung „Comic-Schrift für Titel und Abschnitts-Überschriften“.

## Impact

- **Code:** [AgendaHeader.tsx](../../../frontend/src/components/AgendaHeader.tsx) (Titel-`h1`, Überschrift „Details“), [AgendaAttendees.tsx](../../../frontend/src/components/AgendaAttendees.tsx), [AgendaAchievementBanner.tsx](../../../frontend/src/components/AgendaAchievementBanner.tsx), [AgendaTimeline.tsx](../../../frontend/src/components/AgendaTimeline.tsx). Die Schrift ist bereits in [index.css](../../../frontend/src/index.css) eingebunden, es kommt keine neue Abhängigkeit dazu.
- **Tests:** Bestehende Tests vergleichen Text, nicht Schrift. Titel mit „ß“ kommen in den Tests nicht vor. Eine neue Prüfung kommt in `frontend/e2e/collapsible-sections.spec.ts`.
- **Backend / API:** keine Änderung.
