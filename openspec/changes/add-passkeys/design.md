# Design

## Context

- Identität läuft seit `hide-attendee-secrets` über den Server: `verify`, `claim` und `login-by-code` geben einem Gerät die eigenen Geheimnisse (`ownUserResponse` in `agenda.ts`). `isCodeValidFor(att, code)` prüft festen Code und TOTP.
- Es gibt kein globales Nutzer-Modell. Personen liegen als `attendees` in Agenden, aber ihre `id` (vom Erstgerät erzeugte UUID) bleibt über Agenden hinweg gleich, weil `handleUseRememberedUser` sie mitschickt.
- `login-by-code` sucht über alle Agenden; die Anmeldung per Passkey kann dasselbe Suchmuster nutzen (`attendees.id = personId`, neueste Agenda zuerst).
- Frontend-Dialoge: `UserIdentificationModal` (Agenda-Seite), `UserCodeLoginModal` (Startseite), `UserProfileModal` (Profil mit Code und QR). Banner-Muster: `PwaInstallBanner` mit `localStorage`-Flag.
- Deployment: Browser → Reverse Proxy (TLS) → nginx im Frontend-Container (`location /api/` → `backend:3001`) → Express. `nginx.conf` setzt keine `X-Forwarded-*`-Header, `app.ts` kein `trust proxy`.
- Tests: Backend mit Vitest/Supertest und gemocktem Modell; E2E mit Playwright, nur die Chromium-Projekte laufen in der Remote-Umgebung.

## Goals / Non-Goals

**Goals:**
- Passkey als zusätzlicher Nachweis, der am Ende dasselbe `user`-Objekt liefert wie `login-by-code`. Alle Folgeabläufe bleiben unverändert.
- Registrieren und Löschen nur mit Nachweis des eigenen Codes.
- Konfiguration per Umgebungsvariablen, Dev funktioniert ohne Einstellungen.

**Non-Goals:**
- Sitzungs-Tokens, Cookies, Schutz der Schreib-Endpoints (Stufe 3).
- Entfernen des Codes.
- Challenge-Speicher über mehrere Server-Instanzen.
- Passkey-Tests in WebKit (virtueller Authenticator nur in Chromium).

## Decisions

### 1. Bibliothek: `@simplewebauthn/server` und `@simplewebauthn/browser`
Aktuelle Major-Version (14.x: Server 14.0.3, Browser 14.0.0), exakt gepinnt. Sie kapselt Challenge-Erzeugung, Attestation/Assertion-Prüfung, Zähler und Origin-/RP-Prüfung.
*Alternative:* WebAuthn selbst parsen (CBOR, COSE). Verworfen, zu fehleranfällig.

### 2. Modell `PasskeyCredential` (`backend/src/models/PasskeyCredential.ts`)
```
credentialId  String  unique (base64url)
personId      String  index
personName    String
publicKey     Buffer
counter       Number
transports    [String]
deviceType    String  ('singleDevice' | 'multiDevice')
backedUp      Boolean
label         String  (z. B. „iPhone“, aus User-Agent abgeleitet, editierbar später)
createdAt, lastUsedAt  Date
```
Keine Verknüpfung über Mongo-Referenzen; `personId` ist die stabile Attendee-ID.

### 3. Routen `backend/src/routes/passkeys.ts`, gemountet unter `/api/passkeys`
| Route | Body | Antwort |
|---|---|---|
| `POST /register/options` | `{ personId, name, code }` | WebAuthn-Optionen + `challengeToken` |
| `POST /register/verify` | `{ challengeToken, response, label? }` | `{ credential }` (ohne Public Key) |
| `POST /login/options` | `{}` | Optionen (discoverable, `allowCredentials` leer) + `challengeToken` |
| `POST /login/verify` | `{ challengeToken, response }` | `{ success, user }` wie `login-by-code` |
| `GET /list?personId=&code=` | – | `[{ id, label, createdAt, lastUsedAt }]` |
| `DELETE /:credentialId` | `{ personId, code }` | `{ success }` |

**Nachweis:** `register/options`, `list` und `DELETE` prüfen `code` mit `isCodeValidFor` gegen die Person in irgendeiner Agenda, in der `attendees.id = personId` steht (gleiche Suche wie `login-by-code`). Dafür wird `isCodeValidFor` exportiert und eine Hilfsfunktion `findAttendeeAcrossAgendas(personId)` in `agenda.ts` ergänzt. Fehlversuche zählen in denselben Zähler wie `verify` (Schlüssel `passkey:<personId>`).

**Login:** `login/verify` sucht das Credential über `credentialId`, prüft mit `verifyAuthenticationResponse`, speichert den neuen Zähler und `lastUsedAt`, sucht die Person über `personId` und antwortet mit `ownUserResponse`. Ist die Person in keiner Agenda mehr vorhanden, `404`.

### 4. Challenges
`Map<challengeToken, { challenge, personId?, expiresAt }>` im Speicher; `challengeToken` ist eine zufällige UUID, die der Client beim `verify` zurückschickt. Einträge werden beim Verify gelöscht (einmalig) und beim Zugriff aufgeräumt (5 Minuten TTL). Gleiches Muster wie der Fehlversuchs-Zähler, keine neue Abhängigkeit.
*Alternative:* Challenge in einem Cookie. Verworfen, weil die App bisher keine Cookies nutzt und `cors origin: '*'` damit nicht zusammengeht.

### 5. Konfiguration (`backend/src/config/webauthn.ts`)
- `WEBAUTHN_RP_ID`: Domain, Default `localhost`.
- `WEBAUTHN_ORIGIN`: kommagetrennte Liste erlaubter Origins, Default `http://localhost:5188,http://localhost:3188`.
- `WEBAUTHN_RP_NAME`: Default `FlashAgenda`.
- `TRUST_PROXY`: Zahl oder Express-Schlüsselwort, Default `1` (nginx im Container). Mit externem Reverse Proxy davor `2`.

`docker-compose.yml` bekommt die Variablen mit Platzhaltern, README einen Abschnitt.

### 6. Client-IP
`nginx.conf`: `proxy_set_header Host $host; X-Real-IP $remote_addr; X-Forwarded-For $proxy_add_x_forwarded_for; X-Forwarded-Proto $scheme;` im `/api/`-Block (und für `/socket.io/`, falls vorhanden). `app.ts`: `app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY))`. Backend-Test: zwei Requests mit unterschiedlichem `X-Forwarded-For` landen in getrennten Limits.

### 7. Frontend
- `frontend/src/services/passkeyService.ts`: `isPasskeySupported()`, `registerPasskey(user, label)`, `loginWithPasskey()`, `listPasskeys(user)`, `deletePasskey(user, id)`. Fehler werden in drei Klassen übersetzt: `cancelled` (NotAllowedError), `unsupported`, `failed`.
- `UserIdentificationModal`: Knopf „Mit Passkey anmelden“ oben im Dialog (nur bei Support). Ergebnis `user` geht durch `handleUseRememberedUser(user)`, damit „Person in Agenda?“ und „sonst eintragen“ wie heute laufen. Abbruch zeigt `CODE_ERRORS.cancelled`-artigen Hinweis im Hauptdialog.
- `UserCodeLoginModal`: Knopf „Mit Passkey anmelden“ unter dem Code-Feld, Erfolg wie Code-Login (`onLoginSuccess(user)`).
- `UserProfileModal`: Abschnitt „Passkeys“ mit Liste, „Passkey einrichten“ und Löschen. Nachweis-Code kommt aus `currentUser` (fester Code, sonst aktueller TOTP), die Person muss nichts tippen.
- `PasskeyHintBanner` auf der Agenda-Seite: erscheint, wenn `isPasskeySupported()`, `currentUser` gesetzt, Flag `flashagenda_passkey_hint_dismissed` nicht gesetzt und `listPasskeys` leer. „Passkey einrichten“ ruft `registerPasskey` direkt auf; „Nicht mehr fragen“ setzt das Flag. Nach erfolgreichem Einrichten wird das Flag ebenfalls gesetzt.
- Alle Passkey-Knöpfe bekommen `data-testid` (`passkey-login`, `passkey-register`, `passkey-hint`).

### 8. E2E mit virtuellem Authenticator
Playwright-Chromium: `page.context().newCDPSession(page)` → `WebAuthn.enable` → `WebAuthn.addVirtualAuthenticator({ protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true })`. Damit laufen Einrichten und Anmelden echt gegen Browser-APIs; der Server wird dabei gemockt mit Antworten, die `@simplewebauthn/server` in einem Test-Helfer erzeugt, oder die E2E-Spec läuft gegen den echten Backend-Test-Helfer. Entscheidung: **Mock mit festen Optionen** (RP `localhost`, Challenge fest), weil die E2E-Suite keinen Backend-Server startet. In WebKit-Projekten `test.skip`.

## Risks / Trade-offs

- [RP-ID falsch konfiguriert] → Passkeys lassen sich nicht anlegen; klare Fehlermeldung im Profil („Passkeys sind auf dieser Domain nicht eingerichtet“) und README-Abschnitt.
- [Person in keiner Agenda mehr] → `login/verify` antwortet `404` mit Hinweis; das Credential bleibt, falls sie wieder beitritt.
- [Fehlversuchs-Zähler und Challenges nur im Speicher] → akzeptabel für eine Instanz, wie bisher.
- [`trust proxy` zu hoch oder zu niedrig] → zu niedrig: alte Sammelsperre bleibt; zu hoch: Clients könnten IPs fälschen. Deshalb konfigurierbar mit dokumentiertem Default und Hinweis für den externen Proxy.
- [Passkey-Login gibt Geheimnisse frei] → Das ist gewollt und entspricht `login-by-code`; der Nachweis ist stärker als der Code.
- [Browser ohne Biometrie, aber mit WebAuthn] → der Knopf erscheint, die Plattform bietet dann Sicherheitsschlüssel oder Gerätesperre an; Abbruch wird sauber behandelt.

## Migration Plan

Keine Datenmigration. Neue Collection entsteht bei der ersten Registrierung. Deployment in einem Release mit neuen Umgebungsvariablen; ohne sie gelten die `localhost`-Defaults, dann funktionieren Passkeys produktiv nicht, alles andere schon. Rollback: vorheriger Release, die Collection stört nicht.
