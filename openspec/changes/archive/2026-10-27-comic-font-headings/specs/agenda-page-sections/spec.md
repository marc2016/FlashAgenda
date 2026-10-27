# Spec Delta

## ADDED Requirements

### Requirement: Comic-Schrift für Titel und Abschnitts-Überschriften
Der Agenda-Titel und die Abschnitts-Überschriften „Details“, „Personen“, „Agenda-Erfolge & Wanderpokale“ und „Agendapunkte“ MÜSSEN in der Comic-Schrift Bangers dargestellt werden. Andere Texte der Agenda-Seite (Kacheln, Zusammenfassungen, Zähler, Live-Anzeige, Dialoge) DÜRFEN NICHT auf diese Schrift umgestellt werden. Im angezeigten Agenda-Titel MUSS jedes „ß“ als „SS“ dargestellt werden; der gespeicherte Titel und der Wert im Bearbeiten-Dialog MÜSSEN unverändert bleiben.

#### Scenario: Titel und Überschriften in Bangers
- **WHEN** die Agenda-Seite angezeigt wird
- **THEN** sind der Agenda-Titel und die vier Abschnitts-Überschriften in Bangers gesetzt

#### Scenario: Übrige Texte unverändert
- **WHEN** die Agenda-Seite angezeigt wird
- **THEN** sind Kacheln, Zusammenfassungen und der Fortschritts-Zähler weiterhin nicht in Bangers gesetzt

#### Scenario: ß im Titel
- **WHEN** eine Agenda den Titel „Straßenfest“ hat
- **THEN** zeigt die Titelzeile „StraSSenfest“, in Bangers also „STRASSENFEST“

#### Scenario: Bearbeiten behält das Original
- **WHEN** der Benutzer den Titel „Straßenfest“ zum Bearbeiten öffnet
- **THEN** enthält das Eingabefeld „Straßenfest“
