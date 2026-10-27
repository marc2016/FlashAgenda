# Tasks

## 1. Schrift umstellen

- [x] 1.1 Helper `toComicCaps(text)` (ersetzt „ß“ durch „SS“) anlegen, z. B. in `frontend/src/utils/textUtils.ts`. Prüfen: `npx tsc --noEmit -p tsconfig.app.json` fehlerfrei
- [x] 1.2 Titel-`h1` in `AgendaHeader.tsx`: Klasse `comic-font` ergänzen, `font-bold` entfernen, Inhalt über `toComicCaps(agenda.title)` rendern; `openEdit('title', agenda.title)` unverändert lassen. Prüfen: Typecheck fehlerfrei
- [x] 1.3 Die vier Abschnitts-`h3` (Details, Personen, Erfolge, Agendapunkte): `comic-font` statt `font-bold`, Größe auf `text-2xl sm:text-3xl`, Icons entsprechend. Prüfen: Screenshots aus- und eingeklappt bei 1440, 390 und 320 px; mit aktivem Live-Kasten neben dem Titel; kein horizontales Scrollen

## 2. Tests und Abnahme

- [x] 2.1 `frontend/e2e/collapsible-sections.spec.ts` erweitern: berechnete `font-family` von Titel-`h1` und den vier `h3` enthält „Bangers“; eine Zusammenfassung und der Fortschritts-Zähler enthalten es nicht; Agenda mit Titel „Straßenfest“ zeigt im `h1` „StraSSenfest“, der Bearbeiten-Dialog enthält „Straßenfest“. Prüfen: Spec grün in allen 4 Playwright-Projekten
- [x] 2.2 Abnahme: `npm run build` und komplette Playwright-Suite grün (Playwright startet den Dev-Server selbst)
