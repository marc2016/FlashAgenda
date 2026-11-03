# Design

## Context

- `GET /:id` und alle Änderungs-Endpoints antworten mit dem Mongoose-Dokument (`res.json(agenda)`). `broadcastAgendaEvent` sendet `{ agenda: savedAgenda }` an alle Geräte im Raum. Beide serialisieren per `JSON.stringify`, rufen also `toJSON()` des Dokuments auf. Im Backend gibt es keine `.lean()`-Abfragen.
- `PUT /:id` übernimmt `req.body.attendees` als ganze Liste (`agenda.ts:729`, erlaubte Felder ab `:762`). Das Frontend schickt dort nach Umsortieren, Farbwechsel usw. die komplette Liste zurück (`AgendaDetail.tsx:103/528/553`).
- `POST /:id/attendees` übernimmt `securityCode`/`secretGuid` aus dem Body, für neue und für bestehende Personen ohne Code (`:842`, `:870`).
- `POST /login-by-code` prüft bereits auf dem Server und gibt `securityCode`/`secretGuid` der gefundenen Person zurück.
- Das Frontend prüft Codes beim Beitreten lokal (`UserIdentificationModal.tsx` `handleVerifyCode`). Es erzeugt Codes selbst (`handleSelectExisting`, `handleUseRememberedUser`, `AgendaAttendees.tsx:175` und `:197`). Für die eigene Karte, den QR-Transfer und das Profil liest es die Codes aus den Teilnehmerdaten des Servers.
- Das Rate-Limit in `server.ts` erlaubt 10.000 Nicht-GET-Anfragen pro 15 Minuten und IP.

## Goals / Non-Goals

**Goals:**
- Die Geheimnisse an einer einzigen Stelle entfernen, sodass auch künftige Endpoints und Socket-Events sie nicht verraten.
- Kein Datenverlust: Speichern ohne Geheimnisse darf keine Geheimnisse löschen.
- Bestehende Geräte bleiben angemeldet, denn sie haben ihre Geheimnisse schon lokal.

**Non-Goals:**
- Sitzungs-Tokens und eine Prüfung aller Schreib-Endpoints, wer anfragt (Stufe 3).
- Schutz davor, dass jemand eine noch nicht registrierte Person zuerst übernimmt. Das bleibt wie heute: Wer zuerst kommt, übernimmt.
- Ein gemeinsamer Fehlversuchs-Zähler über mehrere Server-Instanzen.

## Decisions

### 1. Entfernen per `toJSON`-Transform am Teilnehmer-Schema
Am `AttendeeSchema` in `models/Agenda.ts` bekommt `toJSON` einen Transform, der `securityCode` und `secretGuid` löscht. Damit greift das Entfernen automatisch bei jedem `res.json(dokument)` und jedem Socket-Payload. Endpoints, die einem Gerät seine eigenen Geheimnisse geben (verify, claim, login-by-code), bauen ihr Antwortobjekt ausdrücklich aus den Feldern und sind davon nicht betroffen. `toObject()` (z. B. in `toAgendaSummary`) bleibt unverändert.
*Alternative:* eine Hilfsfunktion `publicAgenda()` an jedem `res.json` und `broadcastAgendaEvent`. Verworfen, weil jeder neue Endpoint sie vergessen kann. Ein Test sichert die Transform-Variante ab: `JSON.stringify` einer Agenda enthält keine Geheimnisse.

### 2. Geheimnisse beim Schreiben schützen
Eine Hilfsfunktion `mergeAttendeeSecrets(oldAttendees, incoming)` wird in `PUT /:id` vor dem Übernehmen der Liste angewendet:
- Bei Personen, die es schon gibt (Abgleich über `id`, dann `_id`, dann Name), werden die gespeicherten Geheimnisse und `isRegistered` übernommen. Geheimnisse aus dem Body werden ignoriert.
- Neue Personen in der Liste werden ohne Geheimnisse und mit `isRegistered: false` gespeichert.

`POST /:id/attendees`:
- **Bestehende Person:** Mitgeschickte Geheimnisse werden ignoriert.
- **Neue Person mit `isRegistered: true`** (ein Gerät trägt sich selbst ein): Mitgeschickte Geheimnisse werden übernommen. Fehlt eins, erzeugt der Server es.
- **Neue Person ohne `isRegistered`** (jemand legt eine andere Person an): ohne Geheimnisse, nicht registriert.

### 3. Neue Endpoints
- `POST /:id/attendees/:attendeeId/verify` mit `{ code }`. Gibt `200 { user }` zurück, wobei `user` die Geheimnisse enthält. Bei falschem Code `401`, bei Sperre `429`, wenn die Person fehlt `404`. Die Prüfung nimmt den festen Code und `verifyTotpCode` mit 300 s und 60 s (wie bisher im Browser). Gültige Codes setzen `lastSeen`.
- `POST /:id/attendees/:attendeeId/claim`. Ist die Person registriert, gibt es `409`. Sonst setzt der Server `isRegistered = true`, erzeugt fehlende Geheimnisse (Code: 4 Ziffern, GUID: `crypto.randomUUID()`), speichert, sendet ein Socket-Update (ohne Geheimnisse) und gibt `200 { user }` zurück.

`:attendeeId` wird wie im bestehenden Ping-Endpoint aufgelöst (`id`, sonst `_id`).

### 4. Begrenzung von Fehlversuchen
- **verify:** Ein In-Memory-Zähler `Map<"agendaId:attendeeId", { count, firstAt }>` mit einem Fenster von 15 Minuten. Ab 5 Fehlversuchen kommt `429`, auch wenn der Code richtig ist. Ein Erfolg setzt den Zähler nicht zurück, damit sich die Sperre nicht durch einen geratenen Treffer umgehen lässt. Alte Einträge räumt der Zähler beim Zugriff weg.
- **login-by-code:** Ein eigener `express-rate-limit` am Endpoint mit `windowMs` 15 Minuten, `max: 5` und `skipSuccessfulRequests: true`, also pro IP.

Ein Zähler im Speicher geht bei einem Neustart verloren. Das ist für eine Instanz akzeptabel und braucht keine neue Abhängigkeit.

### 5. Ergänzen fehlender Geheimnisse
Lädt `GET /:id` eine Agenda, in der registrierte Personen keine Geheimnisse haben, ergänzt der Server sie und speichert einmal. Das ersetzt die bisherige Ergänzung im Browser (`AgendaAttendees.tsx:175`).

### 6. Frontend
- `UserIdentificationModal`: Ob ein Code nötig ist, entscheidet nur noch `isRegistered`. „Code prüfen“ ruft verify auf, „Person wählen“ (nicht registriert) ruft claim auf. Die Antwort `user` wird wie bisher in `flashagenda_<id>_user` und `flashagenda_last_user` gespeichert. Die lokale TOTP-Prüfung und das Erzeugen von Codes fallen weg. Bei `429` erscheint der Hinweis „Zu viele Versuche, bitte später erneut“.
- `handleUseRememberedUser` (eine Person tritt einer weiteren Agenda bei) schickt die eigenen Geheimnisse mit `isRegistered: true` an `POST /:id/attendees`.
- `AgendaAttendees`: Die Ergänzung fehlender Codes fällt weg. `RotatingTotpBadge` und der QR-Transfer lesen Code und GUID aus `currentUser`, nicht aus `att`. Neue Personen werden ohne Code angelegt.
- `AgendaDetail`, `UserProfileModal`, `AchievementModal`, `achievementService` lesen schon heute aus `currentUser`. Dort ändert sich nichts.
- Beim Mischen von Server-Daten in `currentUser` (z. B. nach `agenda_updated`) dürfen die lokalen Geheimnisse nicht durch die leeren Server-Werte verloren gehen. Wo `currentUser` aus Teilnehmerdaten neu gebaut wird, bleiben `securityCode`/`secretGuid` aus dem lokalen Speicher erhalten.

## Risks / Trade-offs

- [Eine Stelle im Frontend liest Codes noch aus Teilnehmerdaten] → Die betroffenen Stellen findet `grep securityCode|secretGuid`. Die E2E-Specs `attendees-totp` und `user-profile` prüfen den eigenen Code. Ein neuer E2E-Test prüft, dass auf fremden Karten kein Code steht.
- [`toJSON`-Transform greift nicht bei `toObject()` oder bei direktem Zugriff] → Socket.io serialisiert per JSON, `res.json` ebenfalls. Ein Backend-Test serialisiert eine Agenda und das Socket-Payload.
- [Ältere Geräte haben noch Code-Daten anderer Personen im Speicher] → Diese bleiben lokal und können nicht weitergegeben werden. Nach dem Update kommen keine neuen hinzu.
- [Erst-Übernahme unregistrierter Personen durch die falsche Person] → Das bleibt wie heute. Wird es gebraucht, gehört es zu Stufe 3.
- [4-stellige Codes bleiben kurz] → Die Begrenzung macht Durchprobieren unpraktisch: 5 Versuche pro 15 Minuten heißt rund 1 Jahr für 10.000 Möglichkeiten pro Person.

## Migration Plan

Backend und Frontend werden zusammen deployt. Bestehende Daten werden beim ersten Laden einer Agenda ergänzt (Entscheidung 5). Bereits angemeldete Geräte bleiben angemeldet, weil ihre Geheimnisse lokal liegen. Ein Rollback auf den vorherigen Release ist möglich, denn die Daten bleiben kompatibel.
