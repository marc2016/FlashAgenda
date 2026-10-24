# live-presentation-view Specification

## Purpose

Legt fest, wie die Live-Sitzung (Präsentationsmodus) einer Agenda dargestellt wird: deckender App-Hintergrund, einheitliches Panel-Layout in allen Phasen, gut lesbare Kopfzeile und Steuerung auf Desktop und Handy.

## Requirements

### Requirement: Deckender roter Hintergrund
Solange die Präsentation offen ist, MUSS der gesamte Bildschirm deckend mit der App-Hintergrundfarbe (`#b71c1c`) gefüllt sein. Inhalte der darunterliegenden Agenda-Seite DÜRFEN NICHT sichtbar sein.

#### Scenario: Agenda scheint nicht durch
- **WHEN** ein Benutzer die Präsentation einer Agenda öffnet
- **THEN** ist hinter den Präsentations-Panels nur der rote Hintergrund zu sehen
- **AND** weder Agenda-Titel noch Kacheln noch Personenkarten der Agenda-Seite sind erkennbar

#### Scenario: Andere Dialoge bleiben unverändert
- **WHEN** ein anderer Dialog der App geöffnet wird (z. B. „Neue Agenda erstellen“)
- **THEN** behält dieser Dialog sein bisheriges Aussehen

### Requirement: Einzelne Panels statt eines Dialog-Kastens
Jede Phase der Präsentation (Start, Roll-Call, Anwesenheitsübersicht, Agendapunkte, Abschluss) MUSS ihren Inhalt in einzelnen dunklen Comic-Panels darstellen (dunkelgrau, schwarzer Rand, harter schwarzer Schatten, abgerundete Ecken), die direkt auf dem roten Hintergrund liegen. Ein umschließender Dialog-Rahmen DARF NICHT sichtbar sein.

#### Scenario: Startphase
- **WHEN** die Präsentation in der Startphase ist
- **THEN** werden Titel, Datum, Ort, Teilnehmerzahl und Anzahl der Agendapunkte als einzelne Panels angezeigt

#### Scenario: Agendapunkt-Phase
- **WHEN** die Präsentation einen Agendapunkt zeigt
- **THEN** sind Titel mit Beschreibung, Abstimmung (falls vorhanden), Kommentare (falls vorhanden), Notiz-Eingabe und Steuerung jeweils eigene Panels

#### Scenario: Abschlussphase
- **WHEN** die Präsentation in der Abschlussphase ist
- **THEN** werden Sitzungsdauer, besprochene Punkte und Anwesenheit als Kennzahl-Panels und die Dauer je Agendapunkt als Tabellen-Panel angezeigt

### Requirement: Kompakte Kopfzeile mit beschrifteten Timern
Die Kopfzeile MUSS als kompakte Leiste im Stil der Aktionsleiste der Agenda-Seite erscheinen. Jeder angezeigte Timer MUSS sichtbar beschriftet sein: „TOP“ für die Dauer des aktuellen Agendapunkts, „Gesamt“ für die Sitzungsdauer. Ein pausierter Zustand MUSS erkennbar sein, und die Präsentation MUSS sich aus der Kopfzeile schließen lassen.

#### Scenario: Timer in der Agendapunkt-Phase
- **WHEN** die Präsentation einen Agendapunkt zeigt
- **THEN** zeigt die Kopfzeile einen mit „TOP“ beschrifteten und einen mit „Gesamt“ beschrifteten Timer

#### Scenario: Timer in anderen Phasen
- **WHEN** die Präsentation nicht in der Agendapunkt-Phase ist
- **THEN** zeigt die Kopfzeile nur den mit „Gesamt“ beschrifteten Timer

#### Scenario: Pausierte Sitzung
- **WHEN** die Sitzung pausiert ist
- **THEN** zeigt die Kopfzeile einen Pausiert-Hinweis

### Requirement: Beschreibung als formatierter Text
Die Beschreibung eines Agendapunkts MUSS in der Präsentation formatiert angezeigt werden (Markdown: fett, kursiv, Listen, Links). Markdown-Steuerzeichen DÜRFEN NICHT roh sichtbar sein.

#### Scenario: Fettgedruckter Text
- **WHEN** die Beschreibung `**Microservice**` enthält
- **THEN** wird „Microservice“ fett angezeigt, ohne Sternchen

### Requirement: Likes klar vom Autor getrennt
Die Personen, die einem Agendapunkt „Daumen hoch“ gegeben haben, MÜSSEN in einer eigens beschrifteten Zeile („Daumen hoch von:“) stehen, getrennt vom Autor des Punkts.

#### Scenario: Autor hat den eigenen Punkt geliked
- **WHEN** der Autor eines Agendapunkts diesen Punkt auch geliked hat
- **THEN** erscheint der Name einmal als Autor und einmal in der Zeile „Daumen hoch von:“, sodass beide Rollen erkennbar sind

### Requirement: Steuerung erreichbar ohne Scrollen auf dem Handy
In der Agendapunkt-Phase MUSS die Steuerung (Vorheriger TOP, Überspringen, Pause/Fortsetzen, Abhaken & Weiter) in einem eigenen Panel liegen. Auf schmalen Bildschirmen (unter 768px) MUSS dieses Panel unten fest stehen, die Hauptaktion „Abhaken & Weiter“ MUSS die volle Breite einnehmen, und kein Bedienelement DARF über den Bildschirmrand hinausragen.

#### Scenario: Handy-Ansicht eines langen Agendapunkts
- **WHEN** auf einem 390px breiten Bildschirm ein Agendapunkt mit langer Beschreibung angezeigt wird
- **THEN** ist der Button „Abhaken & Weiter“ ohne Scrollen sichtbar und vollständig innerhalb des Bildschirms

#### Scenario: Kleinstes Handy
- **WHEN** die Präsentation auf einem 320px breiten Bildschirm angezeigt wird
- **THEN** gibt es in keiner Phase horizontales Scrollen

### Requirement: Seitenrand auf dem Handy
Auf schmalen Bildschirmen MÜSSEN die Panels einen seitlichen Abstand von 16px zum Bildschirmrand haben, wie auf der Agenda-Seite.

#### Scenario: Abstand zum Rand
- **WHEN** die Präsentation auf einem 390px breiten Bildschirm angezeigt wird
- **THEN** beginnen die Panels 16px vom linken und rechten Bildschirmrand entfernt

### Requirement: Korrekte Mengenangaben
Mengenangaben in der Präsentation MÜSSEN korrekt dekliniert sein: Singular bei genau 1, Plural sonst („1 Punkt“, „2 Punkte“, „0 Punkte“, „1 Stimme“, „2 Stimmen“).

#### Scenario: Eine Stimme
- **WHEN** eine Abstimmungsoption genau eine Stimme hat
- **THEN** steht dort „1 Stimme“

#### Scenario: Ein erstellter Punkt
- **WHEN** eine Person genau einen Agendapunkt erstellt hat
- **THEN** zeigt ihre Personenkarte „1 Punkt“

### Requirement: Keine leeren Angaben auf Personenkarten
Auf Personenkarten in der Präsentation (Roll-Call und Anwesenheitsübersicht) DÜRFEN Felder ohne Wert NICHT angezeigt werden. Das betrifft eine fehlende E-Mail-Adresse und einen unbekannten Zeitpunkt „Zuletzt online“.

#### Scenario: Person ohne E-Mail
- **WHEN** eine Person keine E-Mail-Adresse hinterlegt hat
- **THEN** zeigt ihre Personenkarte weder das Feld „E-Mail“ noch den Text „Keine E-Mail“

#### Scenario: Unbekannter Online-Status
- **WHEN** für eine Person kein Zeitpunkt „Zuletzt online“ bekannt ist
- **THEN** zeigt ihre Personenkarte das Feld „Zuletzt online“ nicht an

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
