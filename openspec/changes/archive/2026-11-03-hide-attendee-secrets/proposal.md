# Proposal

## Why

Jede Agenda-Antwort (`GET /api/agendas/:id`, Antworten auf Änderungen und alle Socket-Updates) enthält `securityCode` und `secretGuid` aller Teilnehmer. Wer den Link zu einer Agenda hat, kann damit jeden Code auslesen und sich als jede Person anmelden. Das macht die Wiedererkennung per Code wertlos. Der Grund dafür ist, dass der Browser die Codes beim Beitreten selbst prüft und sie deshalb braucht.

## What Changes

- Der Server schickt **nie mehr Geheimnisse anderer Personen** aus. Gemeint sind die Agenda-Antworten, Socket-Updates und alle weiteren Antworten, die Teilnehmerdaten enthalten.
- **Code-Prüfung auf dem Server:** Wer auf einem neuen Gerät einer registrierten Person beitreten will, schickt den eingegebenen Code an den Server. Nur bei richtigem Code bekommt dieses Gerät die Geheimnisse der Person.
- **Übernahme nicht registrierter Personen auf dem Server:** Wer eine noch nicht registrierte Person übernimmt (z. B. „Tom“, vom Ersteller angelegt), bekommt die vom Server erzeugten Geheimnisse dieser Person.
- **Codes entstehen auf dem Server.** Neue Personen, die jemand anderes anlegt, und alte Teilnehmer ohne Code bekommen Code und GUID vom Server, spätestens bei der Übernahme. Nur ein Gerät, das sich selbst einträgt, darf seine eigenen bestehenden Geheimnisse mitbringen. So behält eine Person über mehrere Agenden denselben Code. Bestehende Geheimnisse werden nie überschrieben.
- **Schutz vor Durchprobieren:** höchstens 5 Fehlversuche pro Person in 15 Minuten beim Beitreten, dazu ein Limit pro IP für den Login per Code.
- Eigene Ansichten funktionieren weiter aus dem lokalen Speicher des Geräts: der rotierende Code im Profil, die eigene Personenkarte, der QR-Transfer und der Login per Code.
- **BREAKING (API):** Agenda-Antworten enthalten keine `securityCode`/`secretGuid` mehr. `POST /:id/attendees` übernimmt mitgeschickte Geheimnisse nur noch, wenn sich ein Gerät selbst einträgt.

## Capabilities

### New Capabilities
- `attendee-identity`: Geheimnisse der Teilnehmer (Code, GUID) – wer sie sieht, wie sie entstehen, wie ein Gerät sich per Code als Person ausweist und wie Durchprobieren begrenzt wird.

### Modified Capabilities
<!-- keine: home-agenda-overview verlangt bereits, dass /user-agendas keine Geheimnisse liefert -->

## Impact

- **Backend:** [agenda.ts](../../../backend/src/routes/agenda.ts) bekommt eine zentrale Funktion zum Entfernen der Geheimnisse, angewendet auf alle Agenda-Antworten und Socket-Payloads. Neu sind `POST /:id/attendees/:attendeeId/verify` und `.../claim`. `POST /:id/attendees` erzeugt Geheimnisse jetzt selbst. Dazu kommen ein Limit für Code-Endpoints und eine Migration fehlender Codes.
- **Frontend:** [UserIdentificationModal.tsx](../../../frontend/src/components/UserIdentificationModal.tsx) prüft nicht mehr lokal, sondern ruft den Server. [AgendaAttendees.tsx](../../../frontend/src/components/AgendaAttendees.tsx) erzeugt keine Codes mehr und zeigt Code und QR nur aus dem eigenen lokalen Profil.
- **Tests:** Backend-Tests für Entfernen, Prüfen, Übernehmen und das Limit. Die E2E-Specs `attendees-totp`, `agenda-detail` (Beitreten auf neuem Gerät) und `user-profile` werden angepasst.
- **Nicht enthalten (eigener Change):** Die Schreib-Endpoints prüfen weiterhin nicht, wer anfragt. Sie glauben `userId`/`userName` aus der Anfrage.
