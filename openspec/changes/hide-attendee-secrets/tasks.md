# Tasks

## 1. Backend: Geheimnisse nicht mehr ausliefern

- [x] 1.1 `toJSON`-Transform am `AttendeeSchema` (`backend/src/models/Agenda.ts`) entfernt `securityCode` und `secretGuid`. Prüfen: neuer Test in `backend/tests/` – `JSON.stringify(new Agenda({...}))` enthält keine Geheimnisse, `isRegistered` bleibt; `cd backend && npm test` grün
- [x] 1.2 Test: `GET /api/agendas/:id` und das an `broadcastAgendaEvent` übergebene Payload enthalten keine Geheimnisse (Socket-Service gemockt). Prüfen: `npm test` grün
- [x] 1.3 `POST /login-by-code` baut sein `user`-Objekt weiterhin ausdrücklich mit den eigenen Geheimnissen (unverändert lauffähig nach 1.1). Prüfen: bestehender Login-Test grün

## 2. Backend: Geheimnisse beim Schreiben schützen

- [x] 2.1 `mergeAttendeeSecrets` in `agenda.ts` anlegen und in `PUT /:id` vor dem Übernehmen von `attendees` anwenden (Design, Entscheidung 2). Prüfen: Test „Liste ohne Geheimnisse speichern behält Codes“ und „Body-Code überschreibt nicht“ grün
- [x] 2.2 `POST /:id/attendees`: Geheimnisse nur für neue Person mit `isRegistered: true` übernehmen bzw. ergänzen; sonst ignorieren. Prüfen: Tests „Person für andere anlegen“ (nicht registriert, kein Code gespeichert) und „Selbst eintragen behält eigenen Code“ grün
- [x] 2.3 `GET /:id` ergänzt fehlende Geheimnisse registrierter Personen und speichert einmal. Prüfen: Test mit registrierter Person ohne Code → danach in DB-Mock gesetzt, nicht in der Antwort

## 3. Backend: Prüfen, Übernehmen, Begrenzen

- [x] 3.1 `POST /:id/attendees/:attendeeId/verify` (fester Code + TOTP 300 s/60 s; 200/401/404). Prüfen: Tests für richtigen festen Code, richtigen TOTP-Code, falschen Code (ohne Geheimnisse in der Antwort)
- [x] 3.2 Fehlversuchs-Zähler pro Person (5 in 15 Minuten → 429, auch bei richtigem Code). Prüfen: Test mit 5 falschen und danach einem richtigen Code → 429
- [x] 3.3 `POST /:id/attendees/:attendeeId/claim` (409 bei registrierter Person; sonst registrieren, Geheimnisse erzeugen, Socket-Update ohne Geheimnisse, 200 mit eigenen Geheimnissen). Prüfen: Tests für beide Fälle
- [x] 3.4 Rate-Limit am `POST /login-by-code` (5 Fehlversuche pro IP in 15 Minuten, Erfolge zählen nicht). Prüfen: Test mit 5 falschen Codes → 6. Anfrage 429

## 4. Frontend

- [x] 4.1 `UserIdentificationModal.tsx`: Code-Pflicht nur nach `isRegistered`; Prüfen über verify, Übernehmen über claim; Hinweis bei 429; lokale TOTP-Prüfung und Code-Erzeugung entfernen; `handleUseRememberedUser` schickt eigene Geheimnisse mit `isRegistered: true`. Prüfen: `npx tsc --noEmit -p tsconfig.app.json` fehlerfrei
- [x] 4.2 `AgendaAttendees.tsx`: Ergänzung fehlender Codes entfernen; neue Personen ohne Code anlegen; `RotatingTotpBadge` und QR-Transfer aus `currentUser`. Prüfen: Typecheck fehlerfrei, `grep -n "att.securityCode\|att.secretGuid\|qrUser.securityCode\|qrUser.secretGuid"` ohne Treffer
- [x] 4.3 Wo `currentUser` aus Teilnehmerdaten neu gebaut wird (`AgendaDetail.tsx`), bleiben lokale `securityCode`/`secretGuid` erhalten. Prüfen: E2E „eigener Code bleibt nach Socket-Update sichtbar“ (siehe 5.1)

## 5. E2E und Abnahme

- [x] 5.1 E2E-Mocks in `attendees-totp`, `agenda-detail`, `user-profile` auf Agenden ohne fremde Geheimnisse umstellen und neue Fälle ergänzen: Beitreten mit richtigem/falschem Code über verify, Übernehmen über claim, 429-Hinweis, kein Code auf fremden Karten, eigener Code im Profil und auf eigener Karte. Prüfen: Specs grün in chromium und mobile-chrome
- [x] 5.2 Abnahme: Backend-Tests, `npm run build` und komplette Playwright-Suite (chromium, mobile-chrome) grün; zusätzlich manuell per Skript: `GET /api/agendas/<seed-id>` gegen den Dev-Server (gemockte DB) enthält kein `securityCode`/`secretGuid` (Vermerk: Build, Backend 94/94, E2E chromium + mobile-chrome 228/228 grün; der manuelle GET-Check ist durch den Supertest in `attendeeIdentityRoutes.test.ts` mit echtem Modell und echten Routen abgedeckt, da hier keine MongoDB läuft; WebKit nicht geprüft)
