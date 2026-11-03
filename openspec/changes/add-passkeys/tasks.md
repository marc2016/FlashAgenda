# Tasks

## 1. Client-IP hinter Proxys

- [x] 1.1 `frontend/nginx.conf`: `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto` im `/api/`-Block (und Socket-Block) setzen. Prüfen: `nginx -t` mit der Datei im offiziellen nginx-Image oder Review der Datei; Docker-Build läuft
- [x] 1.2 `backend/src/app.ts`: `trust proxy` aus `TRUST_PROXY` (Default 1) setzen; `docker-compose.yml` und README dokumentieren die Variable. Prüfen: Backend-Test – zwei `login-by-code`-Fehlversuchsreihen mit unterschiedlichem `X-Forwarded-For` werden getrennt gezählt

## 2. Backend: Passkeys

- [ ] 2.1 `@simplewebauthn/server` (exakt gepinnt) installieren; `backend/src/config/webauthn.ts` mit `WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGIN`, `WEBAUTHN_RP_NAME` und Defaults. Prüfen: `npx tsc --noEmit -p .` fehlerfrei
- [ ] 2.2 Modell `backend/src/models/PasskeyCredential.ts` laut design.md. Prüfen: Schema-Validierungstest grün
- [ ] 2.3 In `agenda.ts`: `findAttendeeAcrossAgendas(personId)` ergänzen und `isCodeValidFor` exportieren; Fehlversuchs-Zähler für Schlüssel `passkey:<personId>` nutzbar machen. Prüfen: Unit-Tests grün
- [ ] 2.4 Routen `backend/src/routes/passkeys.ts`: `register/options`, `register/verify`, `login/options`, `login/verify`, `list`, `DELETE /:credentialId`; Challenge-Speicher mit 5 Minuten TTL und Einmal-Verwendung; Rate-Limit 10/15 min für `login/verify`; in `app.ts` unter `/api/passkeys` mounten. Prüfen: Backend-Tests mit vorbereiteten WebAuthn-Antworten (Fixtures aus `@simplewebauthn/server`-Beispieldaten oder selbst erzeugt per Test-Authenticator) für: Registrieren mit/ohne Nachweis, Login gültig/ungültig, abgelaufene und doppelt verwendete Challenge, falsche Origin, Löschen eigen/fremd, Rate-Limit
- [ ] 2.5 Test: `login/verify` liefert nur die eigene Person mit Geheimnissen (Ergänzung in `attendeeIdentityRoutes.test.ts`). Prüfen: `cd backend && npm test` grün

## 3. Frontend: Service und Anmeldung

- [ ] 3.1 `@simplewebauthn/browser` (exakt gepinnt) installieren; `frontend/src/services/passkeyService.ts` mit `isPasskeySupported`, `registerPasskey`, `loginWithPasskey`, `listPasskeys`, `deletePasskey` und Fehlerklassen `cancelled | unsupported | failed`. Prüfen: `npx tsc --noEmit -p tsconfig.app.json` fehlerfrei
- [ ] 3.2 `UserIdentificationModal.tsx`: Knopf „Mit Passkey anmelden“ (`data-testid="passkey-login"`, nur bei Support), Ergebnis über `handleUseRememberedUser`, Hinweis bei Abbruch/Fehler. Prüfen: Typecheck; E2E in 5.1
- [ ] 3.3 `UserCodeLoginModal.tsx`: Knopf „Mit Passkey anmelden“, Erfolg wie Code-Login. Prüfen: Typecheck; E2E in 5.1

## 4. Frontend: Verwalten und Hinweis

- [ ] 4.1 `UserProfileModal.tsx`: Abschnitt „Passkeys“ mit Liste (Bezeichnung, Datum), „Passkey einrichten“ (`data-testid="passkey-register"`) und Löschen; Nachweis-Code aus `currentUser`; Fehlermeldung bei falscher RP-ID. Prüfen: Typecheck; Screenshot
- [ ] 4.2 `PasskeyHintBanner.tsx` auf der Agenda-Seite mit „Passkey einrichten“ und „Nicht mehr fragen“ (`flashagenda_passkey_hint_dismissed`); nach Einrichten kein Hinweis mehr. Prüfen: Typecheck; E2E in 5.1

## 5. E2E, Doku, Abnahme

- [ ] 5.1 Neue Spec `frontend/e2e/passkeys.spec.ts` mit virtuellem Authenticator (CDP) und gemocktem Server: Knopf fehlt ohne Support, Einrichten im Profil, Anmelden im „Wer bist du?“-Dialog, Anmelden auf der Startseite, Person fehlt in Agenda → Beitreten, Abbruch-Hinweis, Hinweis-Banner erscheint/verschwindet, Löschen. In WebKit `test.skip`. Prüfen: Spec grün in chromium und mobile-chrome
- [ ] 5.2 README: Abschnitt „Passkeys & Reverse Proxy“ mit `WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGIN`, `TRUST_PROXY` und Hinweis auf HTTPS. Prüfen: Abschnitt vorhanden und Variablen stimmen mit `docker-compose.yml` überein
- [ ] 5.3 Abnahme: Backend-Tests, `npm run build` und komplette Playwright-Suite (chromium, mobile-chrome) grün
