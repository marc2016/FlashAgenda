# Proposal

## Why

Am Ende einer Sitzung will man direkt das nächste Treffen vorbereiten: dieselben Personen, die gepinnten Punkte übernommen. Das geht heute nur über das Plus in der Aktionsleiste der Agenda-Seite. Dafür muss man die Präsentation erst verlassen. Der Abschluss-Screen der Präsentation ist der natürliche Ort für diesen Schritt.

## What Changes

- Der Abschluss-Screen der Präsentation bekommt einen Button „Neue Agenda vorbereiten“.
- Der Button öffnet denselben Dialog „Neue Agenda erstellen“ wie das Plus in der Aktionsleiste, mit derselben Vorauswahl: alle Personen, die gepinnten Punkte und die Einstellung für Standardpunkte der aktuellen Agenda. Das Anlegen funktioniert gleich: Titel übernehmen, Punkte gehören dem System, die neue Agenda öffnet sich in einem neuen Tab.
- Der Dialog nutzt den Stand aus der Präsentation. Ein Punkt, der während der Sitzung angepinnt wurde, ist deshalb schon vorausgewählt.
- Der bestehende Dialog wird aus `AgendaHeader` in eine eigene Komponente ausgelagert, damit beide Stellen denselben Code nutzen. Für die Aktionsleiste ändert sich dabei nichts.
- Die Präsentation bleibt beim Anlegen offen, und die Sitzung wird nicht automatisch abgeschlossen.

## Capabilities

### New Capabilities
<!-- keine -->

### Modified Capabilities
- `live-presentation-view`: neue Anforderung, dass aus dem Abschluss-Screen eine Folge-Agenda erstellt werden kann.

## Impact

- **Code:** neue Komponente `frontend/src/components/CreateFollowUpAgendaDialog.tsx`; [AgendaHeader.tsx](../../../frontend/src/components/AgendaHeader.tsx) nutzt sie statt des eingebauten Dialogs; [LiveMeetingModal.tsx](../../../frontend/src/components/LiveMeetingModal.tsx) bekommt den Button im Abschluss-Panel.
- **API:** keine Änderung (bestehendes `POST /api/agendas` mit `attendees`, `items`, `includeStandardItems`, `createdBy`).
- **Tests:** [agenda-interactions.spec.ts](../../../frontend/e2e/agenda-interactions.spec.ts) deckt den bestehenden Weg ab und muss weiter laufen; dazu kommt ein neuer E2E-Test für den Weg aus der Präsentation.
