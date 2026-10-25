# Spec Delta

## MODIFIED Requirements

### Requirement: Einklappbare Hauptabschnitte
Die Agenda-Seite MUSS die Abschnitte „Details“, „Personen“, „Erfolge“ und „Agendapunkte“ einzeln ein- und ausklappbar machen. Jeder Abschnitt MUSS in seiner Überschriftszeile einen Klapp-Button haben, der den Zustand anzeigt (Chevron nach unten = ausgeklappt, nach rechts = eingeklappt) und per Tastatur bedienbar ist. Zusätzlich MUSS ein Klick auf die Überschrift des Abschnitts (Icon und Überschriftentext) genau diesen Abschnitt ein- bzw. ausklappen; die Überschrift MUSS dabei als klickbar erkennbar sein (Hand-Cursor). Andere Bedienelemente in der Überschriftszeile (z. B. Fortschritts-Zähler, „Sitzung starten“, Sortier-Buttons) DÜRFEN durch einen Klick auf sie NICHT klappen. Die Überschrift MUSS auch im eingeklappten Zustand sichtbar bleiben. Agenda-Titel und Live-Anzeige DÜRFEN NICHT einklappbar sein.

#### Scenario: Abschnitt einklappen
- **WHEN** der Benutzer beim Abschnitt „Personen“ auf den Klapp-Button klickt
- **THEN** werden die Personenkarten ausgeblendet
- **AND** die Überschrift „Personen“ und der Klapp-Button bleiben sichtbar

#### Scenario: Abschnitt wieder ausklappen
- **WHEN** der Benutzer bei einem eingeklappten Abschnitt auf den Klapp-Button klickt
- **THEN** wird der Inhalt des Abschnitts wieder angezeigt

#### Scenario: Klick auf die Überschrift
- **WHEN** der Benutzer auf die Überschrift „Personen“ klickt
- **THEN** werden die Personenkarten ausgeblendet und der Klapp-Button zeigt den eingeklappten Zustand
- **AND** ein weiterer Klick auf die Überschrift zeigt die Personenkarten wieder an

#### Scenario: Klick auf das Icon der Überschrift
- **WHEN** der Benutzer auf das Icon vor der Überschrift „Details“ klickt
- **THEN** wird der Abschnitt „Details“ ein- bzw. ausgeklappt

#### Scenario: Andere Bedienelemente in der Überschriftszeile
- **WHEN** der Benutzer bei den Agendapunkten auf einen Sortier-Button oder auf „Sitzung starten“ klickt
- **THEN** bleibt der Klapp-Zustand der Agendapunkte unverändert

#### Scenario: Details einklappen
- **WHEN** der Benutzer den Abschnitt „Details“ einklappt
- **THEN** werden die Kacheln (Datum, Ort, Speisekarte, Annahmeschluss, Standardpunkte) und die Karte ausgeblendet
- **AND** der Agenda-Titel bleibt sichtbar

#### Scenario: Agendapunkte einklappen
- **WHEN** der Benutzer den Abschnitt „Agendapunkte“ einklappt
- **THEN** werden die Sortier-Buttons und die Liste der Agendapunkte ausgeblendet
- **AND** Überschrift und Fortschritts-Zähler bleiben sichtbar

#### Scenario: Unabhängige Abschnitte
- **WHEN** der Benutzer nur „Erfolge“ einklappt
- **THEN** bleiben „Details“, „Personen“ und „Agendapunkte“ ausgeklappt
