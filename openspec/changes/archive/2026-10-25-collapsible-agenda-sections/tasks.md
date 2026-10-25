# Tasks

## 1. Bausteine

- [x] 1.1 Hook `frontend/src/hooks/useCollapsedSection.ts` anlegen (gemeinsamer Schlüssel `flashagenda_collapsed_sections`, JSON-Objekt, `try/catch` beim Lesen und Schreiben, Standard ausgeklappt). Prüfen: `npx tsc --noEmit -p tsconfig.app.json` läuft fehlerfrei
- [x] 1.2 Komponente `frontend/src/components/SectionCollapseToggle.tsx` anlegen (Chevron-Icon, `aria-expanded`, `aria-label`, `data-testid="collapse-toggle-<sectionId>"`). Prüfen: Typecheck fehlerfrei

## 2. Abschnitte einbauen

- [x] 2.1 `AgendaHeader.tsx`: neue Überschriftszeile „Details“ mit Toggle unter dem Titel; Kacheln und Karte nur ausgeklappt rendern. Prüfen: Screenshot ein- und ausgeklappt bei 1440px und 390px, Titel bleibt sichtbar
- [x] 2.2 `AgendaAttendees.tsx`: Toggle vor „Personen“; Karten nur ausgeklappt rendern. Prüfen: `e2e/agenda-detail.spec.ts` und `e2e/achievements.spec.ts` (Anker `h3:has-text("Personen")`) grün
- [x] 2.3 `AgendaAchievementBanner.tsx`: Toggle vor der Überschrift; Inhalt nur ausgeklappt rendern. Prüfen: `e2e/achievements.spec.ts` grün
- [x] 2.4 `AgendaTimeline.tsx`: Toggle vor „Agendapunkte“; Fortschritts-Badge bleibt; Sortier-Buttons und Liste nur ausgeklappt rendern. Prüfen: `e2e/agenda-interactions.spec.ts` und `e2e/live-meeting.spec.ts` grün

## 3. Tests und Abnahme

- [x] 3.1 Neue Spec `frontend/e2e/collapsible-sections.spec.ts` mit den Szenarien aus `specs/agenda-page-sections/spec.md`: jeden Abschnitt ein- und ausklappen (Überschrift bleibt), Unabhängigkeit, Zustand nach Neuladen, Zustand in anderer Agenda, Standard ausgeklappt, ungültiges JSON im Speicher. Prüfen: Spec grün in allen 4 Playwright-Projekten
- [x] 3.2 Abnahme: `npm run build` im Frontend und komplette Playwright-Suite grün (mit von Playwright gestartetem Dev-Server, kein eigener auf Port 5188)
