# Tasks

## 1. Backend: schlanke Zusammenfassung

- [x] 1.1 In `backend/src/routes/agenda.ts` eine Funktion `toAgendaSummary` anlegen und `GET /user-agendas` darauf umstellen (Suche inkl. TOTP unverändert, `.lean()`, Felder laut design.md). Prüfen: `cd backend && npm test` grün
- [x] 1.2 `backend/tests/agendaRoutes.test.ts` um drei Fälle ergänzen: keine `securityCode`/`secretGuid` in der Antwort, `itemCount`/`completedCount` stimmen, keine `items`/`auditLogs` in der Antwort. Bestehende Treffer-Tests bleiben unverändert grün. Prüfen: `cd backend && npm test` grün

## 2. Frontend: Logik

- [x] 2.1 `frontend/src/utils/agendaOverview.ts` mit `getAgendaStatus`, `sortAgendas` und `isAgendaClosedForItems` anlegen (mit `now`-Parameter; Fallback auf `items`, wenn Zähler fehlen). Prüfen: `npx tsc --noEmit -p tsconfig.app.json` fehlerfrei
- [x] 2.2 `AgendaTimeline.tsx` auf `isAgendaClosedForItems` umstellen. Prüfen: `e2e/agenda-interactions.spec.ts` und `e2e/standard-items.spec.ts` grün
- [x] 2.3 Den Leaflet-Marker-Fix aus `AgendaHeader.tsx` nach `frontend/src/utils/leafletSetup.ts` verschieben und dort importieren. Prüfen: Die Karte auf der Agenda-Seite zeigt weiterhin den Marker (`e2e/agenda-detail.spec.ts` grün, Screenshot)

## 3. Frontend: Kachel und Mini-Karte

- [x] 3.1 `frontend/src/components/AgendaMiniMap.tsx`: nicht interaktive Leaflet-Karte (Zoom 15, alle Handler aus, `pointer-events: none`, Attribution klein sichtbar), Lazy-Mount per `IntersectionObserver`, Platzhalter gleicher Höhe ohne Ort. Prüfen: Typecheck fehlerfrei und Screenshot mit Seed-Daten (`npm run reset`)
- [x] 3.2 `frontend/src/components/AgendaOverviewCard.tsx`: Karte als Banner, Titel, Datum/Uhrzeit, Relativzeit (`date-fns`, `de`), Ort, Fortschrittsbalken „x/y“, bis zu 5 `PersonChip` plus „+N“, Status-Badge, Schloss- und Archiv-Icon, `data-testid`s laut design.md. Prüfen: Screenshot einer vollständigen und einer leeren Agenda

## 4. Frontend: Startseite

- [x] 4.1 `Home.tsx`: alte Liste ersetzen durch Tabs (Alle/Anstehend/Abgeschlossen mit Anzahl, Start auf „Anstehend“), sortiertes Grid (1/2/3 Spalten bei <640/≥640/≥1024 px, kein interner Scroll), Leerhinweis mit Link zu „Alle“, Hinweis „Noch keine Agenden vorhanden.“ bei null Agenden. Prüfen: Screenshots bei 1440, 800 und 390 px
- [ ] 4.2 `frontend/e2e/home.spec.ts` um Szenarien aus `specs/home-agenda-overview/spec.md` erweitern (Uhr fest per `page.clock`): Spaltenanzahl bei 1280/390 px, Status-Badges (LIVE vor vergangenem Datum, beendet vor Datum, archiviert), Sortierreihenfolge, Tabs und Leerhinweis, Schloss-Icon, Klick auf Karte öffnet Agenda, Karte verschiebt sich nicht bei Drag. Prüfen: Spec grün in allen Playwright-Projekten

## 5. Abnahme

- [ ] 5.1 `npm run build` im Frontend und komplette Playwright-Suite plus Backend-Tests grün (Playwright startet den Dev-Server selbst, kein eigener auf Port 5188)
- [x] 5.2 README-Screenshot der Startseite mit Seed-Daten aktualisieren (falls einer existiert), sonst neuen Screenshot `docs/images/home.png` ergänzen und im README verlinken. Prüfen: Bild ist im README sichtbar
