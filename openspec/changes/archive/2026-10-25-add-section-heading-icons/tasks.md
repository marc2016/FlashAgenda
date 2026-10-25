# Tasks

## 1. Voraussetzung

- [x] 1.1 Sicherstellen, dass `collapsible-agenda-sections` archiviert ist und `openspec/specs/agenda-page-sections/spec.md` existiert. Prüfen: `openspec list --specs` listet `agenda-page-sections`

## 2. Icons einbauen

- [x] 2.1 In den Überschriftszeilen von `AgendaHeader.tsx` (Details), `AgendaAttendees.tsx` (Personen), `AgendaAchievementBanner.tsx` (Erfolge) und `AgendaTimeline.tsx` (Agendapunkte) je ein `<i className="mdi mdi-… text-yellow-500 …" aria-hidden="true" />` vor die `h3` setzen, beide in einem `flex align-items-center gap-2`-Container. Prüfen: `npx tsc --noEmit -p tsconfig.app.json` fehlerfrei und Screenshot aus- und eingeklappt bei 1440px und 390px

## 3. Tests und Abnahme

- [x] 3.1 In `frontend/e2e/collapsible-sections.spec.ts` prüfen: Vor jeder Überschrift steht das zugeordnete Icon (`.mdi-card-text-outline`, `.mdi-account-group`, `.mdi-trophy`, `.mdi-format-list-checks`), ausgeklappt und eingeklappt sichtbar, mit `aria-hidden="true"`; der `h3`-Text bleibt exakt „Personen“. Prüfen: Spec grün in allen 4 Playwright-Projekten
- [x] 3.2 Abnahme: `npm run build` und komplette Playwright-Suite grün (Playwright startet den Dev-Server selbst)
