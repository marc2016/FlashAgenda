# Spec Delta

## Purpose

Legt fest, dass sich die großen Abschnitte der Agenda-Seite einklappen lassen und dass der Browser sich diesen Zustand für alle Agenden merkt.

## ADDED Requirements

### Requirement: Einklappbare Hauptabschnitte
Die Agenda-Seite MUSS die Abschnitte „Details“, „Personen“, „Erfolge“ und „Agendapunkte“ einzeln ein- und ausklappbar machen. Jeder Abschnitt MUSS in seiner Überschriftszeile einen Klapp-Button haben, der den Zustand anzeigt (Chevron nach unten = ausgeklappt, nach rechts = eingeklappt) und per Tastatur bedienbar ist. Die Überschrift MUSS auch im eingeklappten Zustand sichtbar bleiben. Agenda-Titel und Live-Anzeige DÜRFEN NICHT einklappbar sein.

#### Scenario: Abschnitt einklappen
- **WHEN** der Benutzer beim Abschnitt „Personen“ auf den Klapp-Button klickt
- **THEN** werden die Personenkarten ausgeblendet
- **AND** die Überschrift „Personen“ und der Klapp-Button bleiben sichtbar

#### Scenario: Abschnitt wieder ausklappen
- **WHEN** der Benutzer bei einem eingeklappten Abschnitt auf den Klapp-Button klickt
- **THEN** wird der Inhalt des Abschnitts wieder angezeigt

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
