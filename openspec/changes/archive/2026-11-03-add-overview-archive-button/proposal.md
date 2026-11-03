# Proposal

## Why

Erledigte Agenden bleiben auf der Startseite unter „Anstehend“ stehen, bis ihr Datum vorbei ist oder die Live-Sitzung beendet wurde. Archivieren kann heute nur der Administrator auf der Admin-Seite. Die Person, die eine Agenda angelegt hat, soll sie direkt in der Übersicht archivieren und wiederherstellen können, damit sie aus „Anstehend“ verschwindet und unter „Abgeschlossen“ steht.

## What Changes

- Jede Kachel der Startseiten-Übersicht bekommt einen Archiv-Knopf. Er archiviert eine aktive Agenda oder holt eine archivierte zurück (Umschalter).
- Den Knopf sieht nur, wer die Agenda verwalten darf: der Ersteller oder die erste Person der Agenda (dieselbe Regel wie beim Schließen einer Agenda). Alle anderen sehen ihn nicht.
- Archivierte Agenden landen wie bisher über die Status-Regel unter „Abgeschlossen“ (Status ABGESCHLOSSEN, Archiv-Icon), bleiben unter „Alle“ sichtbar und sind schreibgeschützt.
- Neuer Endpunkt `PUT /api/agendas/:id/archive` setzt den Archiv-Status explizit, prüft die Berechtigung und schreibt einen Eintrag ins Audit-Log. Er funktioniert auch bei bereits archivierten Agenden, damit man sie wiederherstellen kann.
- Die Zusammenfassung von `GET /api/agendas/user-agendas` liefert zusätzlich `createdBy`, damit die Übersicht entscheiden kann, ob sie den Knopf zeigt.
- Die Kachel ist heute ein einziges `<button>`. Für den Knopf wird sie so umgebaut, dass keine Buttons ineinander verschachtelt sind. Ein Klick auf die übrige Kachel öffnet die Agenda weiterhin.

## Capabilities

### New Capabilities

(keine)

### Modified Capabilities

- `home-agenda-overview`: neue Anforderung „Archivieren aus der Übersicht“; „Schlanke Agenda-Zusammenfassung vom Server“ liefert zusätzlich `createdBy`; „Kachel-Grid“ nimmt den Archiv-Knopf vom Öffnen per Klick aus.

## Impact

- Backend: [backend/src/routes/agenda.ts](../../../backend/src/routes/agenda.ts): neue Route, gemeinsame Hilfsfunktion für die Ersteller-Prüfung (wird bisher inline in `PUT /:id` geprüft), `toAgendaSummary` um `createdBy` erweitert.
- Frontend: [AgendaOverviewCard.tsx](../../../frontend/src/components/AgendaOverviewCard.tsx), [AgendaOverview.tsx](../../../frontend/src/components/AgendaOverview.tsx), [Home.tsx](../../../frontend/src/pages/Home.tsx), [agendaOverview.ts](../../../frontend/src/utils/agendaOverview.ts), Kachel-Styles in [index.css](../../../frontend/src/index.css).
- Tests: [backend/tests/agendaRoutes.test.ts](../../../backend/tests/agendaRoutes.test.ts), [frontend/e2e/home.spec.ts](../../../frontend/e2e/home.spec.ts).
- Der Admin-Endpunkt `PUT /api/admin/agendas/:id/archive` bleibt unverändert.
- Keine neuen Abhängigkeiten, keine Datenmigration (`isArchived` existiert bereits).
