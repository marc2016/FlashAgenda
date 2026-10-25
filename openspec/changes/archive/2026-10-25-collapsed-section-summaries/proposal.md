# Proposal

## Why

Eingeklappt sieht man von Details, Personen und Erfolgen nur noch die Überschrift. Um kurz nachzusehen, wann und wo das Treffen ist oder wie viele dabei sind, muss man den Abschnitt aufklappen. Eine dezente Zusammenfassung neben der Überschrift beantwortet das, ohne den kompakten Zustand aufzugeben. Bei den Agendapunkten leistet das schon der Zähler „x/y besprochen“.

## What Changes

- Ist ein Abschnitt eingeklappt, steht rechts neben seiner Überschrift eine kurze Zusammenfassung in kleiner, grauer Schrift, ohne Rahmen und ohne Hintergrund:
  - **Details:** Datum mit Uhrzeit und Ort, z. B. „26.10.2026 · 19:00 · Brauhaus am Markt, Köln“. Fehlende Angaben werden weggelassen, ohne beide steht „Noch keine Details“.
  - **Personen:** Anzahl, z. B. „3 Personen“ bzw. „1 Person“.
  - **Erfolge:** freigeschaltete eigene Erfolge, z. B. „2 von 8 Erfolgen“.
- Ausgeklappt wird keine Zusammenfassung angezeigt.
- Ist die Zusammenfassung zu lang, wird sie mit „…“ gekürzt. Pfeil und Überschrift bleiben vollständig sichtbar.
- **Agendapunkte bleiben unverändert:** keine zusätzliche Zusammenfassung, der bestehende Zähler bleibt.

**Abhängigkeit:** Baut auf `clickable-section-headings` auf (klickbare Überschriften-Gruppe). Erst nach dessen Archivierung umsetzen.

## Capabilities

### New Capabilities
<!-- keine -->

### Modified Capabilities
- `agenda-page-sections`: neue Anforderung „Zusammenfassung im eingeklappten Zustand“.

## Impact

- **Code:** [AgendaHeader.tsx](../../../frontend/src/components/AgendaHeader.tsx) (Details), [AgendaAttendees.tsx](../../../frontend/src/components/AgendaAttendees.tsx) (Personen), [AgendaAchievementBanner.tsx](../../../frontend/src/components/AgendaAchievementBanner.tsx) (Erfolge). Keine Änderung an `AgendaTimeline.tsx`.
- **Tests:** Erweiterung von `frontend/e2e/collapsible-sections.spec.ts`.
- **Backend / API:** keine Änderung. Alle Daten liegen in den Komponenten bereits vor.
