# Tasks

## 1. Voraussetzung

- [x] 1.1 Sicherstellen, dass `clickable-section-headings` archiviert ist. Prüfen: `openspec list --json` zeigt ihn nicht mehr als aktiv

## 2. Zusammenfassungen

- [x] 2.1 Komponente `frontend/src/components/SectionSummary.tsx` anlegen (dezente Schrift, kein Rahmen, Ellipsis, `title`, `data-testid="section-summary-<id>"`). Prüfen: `npx tsc --noEmit -p tsconfig.app.json` fehlerfrei
- [x] 2.2 In `AgendaHeader.tsx` (Details), `AgendaAttendees.tsx` (Personen) und `AgendaAchievementBanner.tsx` (Erfolge) die Zusammenfassung nur bei `collapsed` zwischen klickbarer Gruppe und Klapp-Button einsetzen; Texte wie in design.md. `AgendaTimeline.tsx` bleibt unverändert. Prüfen: Screenshot eingeklappt bei 1440px, 390px und 320px

## 3. Tests und Abnahme

- [x] 3.1 `frontend/e2e/collapsible-sections.spec.ts` erweitern: Zusammenfassungen für Details („Datum · Uhrzeit · Ort“ und „Noch keine Details“), Personen („2 Personen“) und Erfolge („x von y Erfolgen“) nur eingeklappt sichtbar; keine `section-summary-items`; kein horizontales Scrollen bei 320px. Prüfen: Spec grün in allen 4 Playwright-Projekten
- [x] 3.2 Abnahme: `npm run build` und komplette Playwright-Suite grün (Playwright startet den Dev-Server selbst)
