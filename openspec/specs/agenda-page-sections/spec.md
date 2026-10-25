# agenda-page-sections Specification

## Purpose

Legt fest, dass sich die großen Abschnitte der Agenda-Seite einklappen lassen und dass der Browser sich diesen Zustand für alle Agenden merkt.

## Requirements

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

### Requirement: Zustand im Browser merken
Der Klapp-Zustand jedes Abschnitts MUSS im Browser-Speicher (`localStorage`) gespeichert werden und MUSS für alle Agenden gleich gelten. Ohne gespeicherten Zustand MÜSSEN alle Abschnitte ausgeklappt sein. Ist der Speicher nicht verfügbar oder enthält er ungültige Daten, MUSS die Seite trotzdem funktionieren und alle Abschnitte ausgeklappt zeigen.

#### Scenario: Zustand bleibt nach Neuladen erhalten
- **WHEN** der Benutzer „Personen“ einklappt und die Seite neu lädt
- **THEN** ist „Personen“ weiterhin eingeklappt

#### Scenario: Zustand gilt für andere Agenden
- **WHEN** der Benutzer in einer Agenda „Details“ einklappt und danach eine andere Agenda öffnet
- **THEN** ist „Details“ auch dort eingeklappt

#### Scenario: Erster Besuch
- **WHEN** im Browser noch kein Klapp-Zustand gespeichert ist
- **THEN** sind alle vier Abschnitte ausgeklappt

#### Scenario: Ungültige gespeicherte Daten
- **WHEN** der gespeicherte Klapp-Zustand kein gültiges JSON ist
- **THEN** lädt die Seite ohne Fehler und alle Abschnitte sind ausgeklappt

### Requirement: Icons vor den Abschnitts-Überschriften
Jede einklappbare Abschnitts-Überschrift der Agenda-Seite MUSS links vom Überschriftentext ein Material-Design-Icon zeigen. Das Icon MUSS auch im eingeklappten Zustand sichtbar sein, MUSS rein dekorativ sein (für Screenreader ausgeblendet) und DARF den Text der Überschrift NICHT verändern. Zuordnung:
- „Details“: `mdi-card-text-outline`
- „Personen“: `mdi-account-group`
- „Agenda-Erfolge & Wanderpokale“: `mdi-trophy`
- „Agendapunkte“: `mdi-format-list-checks`

#### Scenario: Icons bei ausgeklappten Abschnitten
- **WHEN** die Agenda-Seite mit allen Abschnitten ausgeklappt angezeigt wird
- **THEN** steht vor jeder der vier Überschriften das zugeordnete Icon

#### Scenario: Icons bei eingeklappten Abschnitten
- **WHEN** alle Abschnitte eingeklappt sind
- **THEN** sind die vier Icons weiterhin vor den Überschriften sichtbar

#### Scenario: Überschriftentext unverändert
- **WHEN** ein Screenreader oder ein Test den Text der Überschrift „Personen“ liest
- **THEN** lautet er weiterhin genau „Personen“, ohne Icon-Text

### Requirement: Zusammenfassung im eingeklappten Zustand
Ist einer der Abschnitte „Details“, „Personen“ oder „Erfolge“ eingeklappt, MUSS in seiner Überschriftszeile neben der Überschrift eine kurze Zusammenfassung stehen. Sie MUSS dezent dargestellt sein (kleine, graue Schrift, ohne Rahmen und ohne Hintergrund) und MUSS bei Platzmangel gekürzt werden, ohne Überschrift oder Klapp-Button zu verdrängen. Im ausgeklappten Zustand DARF KEINE Zusammenfassung angezeigt werden. Der Abschnitt „Agendapunkte“ DARF KEINE zusätzliche Zusammenfassung bekommen; sein Fortschritts-Zähler bleibt unverändert.

Inhalt der Zusammenfassung:
- „Details“: Datum mit Uhrzeit und Ort, durch „·“ getrennt; fehlende Angaben werden weggelassen; ohne Datum und Ort lautet sie „Noch keine Details“.
- „Personen“: Anzahl der Personen, korrekt dekliniert („1 Person“, „3 Personen“).
- „Erfolge“: Anzahl der freigeschalteten eigenen Erfolge im Verhältnis zur Gesamtzahl („2 von 8 Erfolgen“).

#### Scenario: Details eingeklappt
- **WHEN** eine Agenda mit Datum 26.10.2026 19:00 und Ort „Brauhaus am Markt, Köln“ den Abschnitt „Details“ eingeklappt hat
- **THEN** steht neben „Details“ die Zusammenfassung „26.10.2026 · 19:00 · Brauhaus am Markt, Köln“

#### Scenario: Details ohne Angaben
- **WHEN** eine Agenda weder Datum noch Ort hat und „Details“ eingeklappt ist
- **THEN** steht neben „Details“ „Noch keine Details“

#### Scenario: Personen eingeklappt
- **WHEN** eine Agenda drei Personen hat und „Personen“ eingeklappt ist
- **THEN** steht neben „Personen“ „3 Personen“

#### Scenario: Erfolge eingeklappt
- **WHEN** der Benutzer 2 von 8 eigenen Erfolgen freigeschaltet hat und „Erfolge“ eingeklappt ist
- **THEN** steht neben der Überschrift „2 von 8 Erfolgen“

#### Scenario: Ausgeklappt keine Zusammenfassung
- **WHEN** ein Abschnitt ausgeklappt ist
- **THEN** wird für diesen Abschnitt keine Zusammenfassung angezeigt

#### Scenario: Agendapunkte unverändert
- **WHEN** „Agendapunkte“ eingeklappt ist
- **THEN** zeigt die Überschriftszeile weiterhin nur den Fortschritts-Zähler und keine zusätzliche Zusammenfassung

#### Scenario: Schmaler Bildschirm
- **WHEN** die Seite auf einem 320px breiten Bildschirm mit eingeklappten Abschnitten angezeigt wird
- **THEN** werden lange Zusammenfassungen mit „…“ gekürzt, Überschrift und Klapp-Button bleiben vollständig sichtbar und es gibt kein horizontales Scrollen
