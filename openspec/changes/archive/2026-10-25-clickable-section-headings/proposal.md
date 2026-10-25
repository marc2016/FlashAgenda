# Proposal

## Why

Zum Ein- und Ausklappen muss man heute den kleinen Pfeil ganz rechts treffen. Gerade auf großen Bildschirmen liegt er weit weg von der Überschrift, und auf dem Handy ist er ein kleines Ziel. Intuitiver ist es, direkt auf die Überschrift zu klicken.

## What Changes

- Ein Klick auf die Überschrift eines Abschnitts (Icon und Text) klappt genau diesen Abschnitt ein oder aus, genau wie der Pfeil rechts.
- Die Überschrift zeigt beim Überfahren einen Hand-Cursor. Ein Doppelklick markiert keinen Text.
- Bei den Agendapunkten löst nur Icon und Text „Agendapunkte“ das Klappen aus. Zähler-Badge, „Sitzung starten“ und Sortier-Buttons behalten ihre eigene Funktion.
- Der Pfeil-Button bleibt erhalten und ist weiter der Weg per Tastatur und für Screenreader. Der Zustand wird wie bisher im Browser gemerkt.

**Abhängigkeit:** Baut auf `add-section-heading-icons` auf (Icon vor der Überschrift). Dieser Change wird erst umgesetzt, wenn jener archiviert ist.

## Capabilities

### New Capabilities
<!-- keine -->

### Modified Capabilities
- `agenda-page-sections`: Die Anforderung „Einklappbare Hauptabschnitte“ wird erweitert: Auch ein Klick auf die Überschrift klappt den Abschnitt um.

## Impact

- **Code:** Die Überschriften-Gruppen (Icon + `h3`) in [AgendaHeader.tsx](../../../frontend/src/components/AgendaHeader.tsx), [AgendaAttendees.tsx](../../../frontend/src/components/AgendaAttendees.tsx), [AgendaAchievementBanner.tsx](../../../frontend/src/components/AgendaAchievementBanner.tsx) und [AgendaTimeline.tsx](../../../frontend/src/components/AgendaTimeline.tsx) bekommen `onClick`, `cursor-pointer` und `select-none`.
- **Tests:** Erweiterung von `frontend/e2e/collapsible-sections.spec.ts`. Bestehende Anker (`h3:has-text(...)`) bleiben gültig.
- **Backend / API:** keine Änderung.
