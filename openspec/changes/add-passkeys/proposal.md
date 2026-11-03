# Proposal

## Why

Auf einem neuen Gerät weist man sich heute mit einem 4-stelligen Code aus, den man vom Erstgerät ablesen und abtippen muss. Passkeys (WebAuthn) machen daraus einen Fingerabdruck oder Face ID: bequemer, nicht abschreibbar, nicht erratbar. Die App läuft produktiv über HTTPS, und seit `hide-attendee-secrets` prüft der Server die Identität. Der Passkey kann also als dritter Beweis neben festem Code und TOTP andocken, ohne die bestehenden Abläufe zu ändern.

Beim Blick auf das Deployment fiel außerdem auf, dass der Backend-Server hinter zwei Proxys (nginx im Container, Reverse Proxy davor) die Client-IP nicht kennt: `nginx.conf` leitet kein `X-Forwarded-For` weiter und Express hat kein `trust proxy`. Damit gelten die IP-Sperren aus `hide-attendee-secrets` für alle Besucher gemeinsam.

## What Changes

- **Passkey einrichten:** Eine angemeldete Person kann im Profil einen oder mehrere Passkeys anlegen (Handy, Laptop) und wieder löschen. Nach der ersten Anmeldung auf einem Gerät erscheint einmalig ein Hinweis „Nächstes Mal mit Passkey?“, der sich dauerhaft wegklicken lässt.
- **Mit Passkey anmelden:** Im „Wer bist du?“-Dialog der Agenda-Seite und im Login-Dialog der Startseite gibt es „Mit Passkey anmelden“. Nach erfolgreicher Prüfung erhält das Gerät die eigenen Geheimnisse der Person, genau wie beim Login per Code. Auf der Agenda-Seite läuft danach derselbe Ablauf wie „Als Anna beitreten“.
- **Fallback bleibt:** Code, TOTP und QR-Transfer ändern sich nicht. Der Passkey-Knopf erscheint nur, wenn der Browser WebAuthn unterstützt.
- **Schutz:** Passkey anlegen und löschen verlangt den Nachweis per eigenem Code. Passkey-Login ist pro IP begrenzt. Challenges verfallen nach 5 Minuten.
- **Client-IP hinter Proxys:** `nginx.conf` leitet `X-Forwarded-For`, `X-Forwarded-Proto` und `Host` weiter; Express bekommt `trust proxy` (konfigurierbar per `TRUST_PROXY`, Standard 1).
- **Konfiguration:** `WEBAUTHN_RP_ID` und `WEBAUTHN_ORIGIN` als Umgebungsvariablen, mit `localhost`-Defaults für die Entwicklung.

## Capabilities

### New Capabilities
- `passkey-authentication`: Passkeys als Nachweis der Identität einer Person: einrichten, anmelden, verwalten, Schutz der Endpoints.

### Modified Capabilities
- `attendee-identity`: Die Ausnahmeliste „Antworten, mit denen ein Gerät die eigenen Geheimnisse erhält“ bekommt den Passkey-Login dazu. Die IP-Begrenzung MUSS hinter Reverse Proxys die echte Client-IP verwenden.

## Impact

- **Backend:** neue Abhängigkeit `@simplewebauthn/server`; neues Modell `PasskeyCredential`; neue Routen unter `/api/passkeys`; `app.ts` mit `trust proxy`; Konfiguration per Umgebungsvariablen. Backend-Tests mit vorgefertigten WebAuthn-Antworten.
- **Frontend:** neue Abhängigkeit `@simplewebauthn/browser`; neuer Service `passkeyService.ts`; Änderungen in [UserIdentificationModal.tsx](../../../frontend/src/components/UserIdentificationModal.tsx), [UserCodeLoginModal.tsx](../../../frontend/src/components/UserCodeLoginModal.tsx), [UserProfileModal.tsx](../../../frontend/src/components/UserProfileModal.tsx) und ein Hinweis-Banner auf der Agenda-Seite.
- **Deployment:** [nginx.conf](../../../frontend/nginx.conf) und [docker-compose.yml](../../../docker-compose.yml) (neue Umgebungsvariablen). README-Abschnitt zur Konfiguration.
- **Tests:** E2E mit dem virtuellen Authenticator von Chromium (CDP `WebAuthn.addVirtualAuthenticator`), nur in den Chromium-Projekten; in WebKit werden die Passkey-Tests übersprungen.
- **Nicht enthalten:** Sitzungs-Tokens und die Prüfung der Schreib-Endpoints (Stufe 3). Der Passkey-Login liefert dafür aber künftig die Grundlage.
