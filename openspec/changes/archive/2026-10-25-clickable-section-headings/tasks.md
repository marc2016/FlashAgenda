# Tasks

## 1. Voraussetzung

- [x] 1.1 Sicherstellen, dass `add-section-heading-icons` archiviert ist und `openspec/specs/agenda-page-sections/spec.md` die Anforderung „Icons vor den Abschnitts-Überschriften“ enthält. Prüfen: `openspec list --json` zeigt `add-section-heading-icons` nicht mehr als aktiv

## 2. Klickbare Überschriften

- [x] 2.1 In `AgendaHeader.tsx` (details), `AgendaAttendees.tsx` (attendees), `AgendaAchievementBanner.tsx` (achievements) und `AgendaTimeline.tsx` (items) die Gruppe aus Icon und `h3` mit `onClick={toggle…}`, `className="… cursor-pointer select-none"` und `data-testid="section-heading-<id>"` versehen; bei den Agendapunkten Badge und „Sitzung starten“ außerhalb der Gruppe lassen. Prüfen: `npx tsc --noEmit -p tsconfig.app.json` fehlerfrei; manuell: Hand-Cursor über der Überschrift, Klick klappt

## 3. Tests und Abnahme

- [x] 3.1 `frontend/e2e/collapsible-sections.spec.ts` erweitern: Klick auf jede Überschrift klappt genau diesen Abschnitt ein und wieder aus (`aria-expanded` am Pfeil wechselt); Klick auf das Icon wirkt gleich; Klick auf einen Sortier-Button und auf das Zähler-Badge ändert den Zustand der Agendapunkte nicht. Prüfen: Spec grün in allen 4 Playwright-Projekten
- [x] 3.2 Abnahme: `npm run build` und komplette Playwright-Suite grün (Playwright startet den Dev-Server selbst)
