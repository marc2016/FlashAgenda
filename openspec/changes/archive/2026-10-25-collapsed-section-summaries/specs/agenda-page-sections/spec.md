# Spec Delta

## ADDED Requirements

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
