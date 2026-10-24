# Spec Delta

## ADDED Requirements

### Requirement: Folge-Agenda aus dem Sitzungsabschluss erstellen
Der Abschluss-Screen der Präsentation MUSS einen Button „Neue Agenda vorbereiten“ anbieten. Er MUSS denselben Dialog „Neue Agenda erstellen“ öffnen, der auch über die Aktionsleiste der Agenda-Seite erreichbar ist, mit demselben Verhalten:
- Alle Personen der Agenda sind vorausgewählt.
- Alle angepinnten Agendapunkte sind vorausgewählt. Grundlage ist der aktuelle Stand aus der Präsentation, auch für Punkte, die während der Sitzung angepinnt wurden.
- Die Standardpunkte (Begrüßung, Neuer Termin, Location) werden nicht als Auswahl angeboten. Die Checkbox zum Übernehmen der Standardpunkte ist mit der Einstellung der aktuellen Agenda vorbelegt.
- Die neue Agenda übernimmt den Titel. Übernommene Punkte gehören dem System, sind nicht erledigt und haben keine Likes. Die neue Agenda öffnet sich in einem neuen Tab.

Die Präsentation MUSS dabei geöffnet bleiben, und die laufende Sitzung DARF NICHT abgeschlossen werden.

#### Scenario: Dialog aus dem Abschluss öffnen
- **WHEN** die Präsentation den Abschluss-Screen zeigt und der Benutzer auf „Neue Agenda vorbereiten“ klickt
- **THEN** öffnet sich der Dialog „Neue Agenda erstellen“ mit allen Personen ausgewählt und den angepinnten Punkten ausgewählt

#### Scenario: Während der Sitzung angepinnter Punkt
- **WHEN** ein Punkt während der Präsentation angepinnt wurde und danach der Dialog im Abschluss geöffnet wird
- **THEN** ist dieser Punkt im Dialog vorausgewählt

#### Scenario: Neue Agenda anlegen
- **WHEN** der Benutzer im Dialog „Neue Agenda erstellen“ bestätigt
- **THEN** wird eine neue Agenda mit dem Titel der aktuellen Agenda, den gewählten Personen und den gewählten Punkten (Autor „System“) angelegt und in einem neuen Tab geöffnet
- **AND** der Abschluss-Screen der Präsentation bleibt sichtbar und die Sitzung ist nicht abgeschlossen

#### Scenario: Abbrechen
- **WHEN** der Benutzer den Dialog abbricht
- **THEN** wird keine Agenda angelegt und der Abschluss-Screen bleibt unverändert

#### Scenario: Aktionsleiste unverändert
- **WHEN** der Benutzer auf der Agenda-Seite das Plus in der Aktionsleiste nutzt
- **THEN** verhält sich der Dialog „Neue Agenda erstellen“ wie bisher
