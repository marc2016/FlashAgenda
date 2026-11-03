# Spec Delta

## ADDED Requirements

### Requirement: Archivieren aus der Übersicht
Jede Kachel einer Agenda, die die erkannte Person verwalten darf, MUSS einen Archiv-Knopf zeigen. Verwalten darf eine Agenda, wer sie erstellt hat oder die erste Person der Agenda ist; das ist dieselbe Regel wie beim Schließen einer Agenda. Bei allen anderen Agenden DARF der Knopf NICHT erscheinen. Der Knopf MUSS als Umschalter arbeiten: Eine aktive Agenda wird archiviert, eine archivierte wiederhergestellt. Beschriftung bzw. Tooltip MUSS die jeweilige Aktion nennen („Archivieren“ oder „Wiederherstellen“). Ein Tipp auf den Knopf DARF die Agenda NICHT öffnen.

Nach dem Umschalten MUSS die Übersicht ohne Neuladen der Seite den neuen Zustand zeigen: Status, Archiv-Icon, Tab-Zuordnung, Sortierung und Tab-Zähler. Schlägt das Umschalten fehl, MUSS die Kachel unverändert bleiben und eine Fehlermeldung erscheinen.

Der Server MUSS das Umschalten nur Personen erlauben, die die Agenda verwalten dürfen, und anderen mit 403 antworten. Er MUSS das Wiederherstellen auch bei archivierten (schreibgeschützten) Agenden zulassen. Jede Änderung MUSS mit dem Namen der Person ins Audit-Log der Agenda geschrieben werden. Eine archivierte Agenda bleibt schreibgeschützt wie bisher.

#### Scenario: Ersteller archiviert eine anstehende Agenda
- **GIVEN** die erkannte Person hat eine Agenda mit Datum in einer Woche erstellt
- **AND** der Tab „Anstehend“ ist aktiv
- **WHEN** sie auf der Kachel auf „Archivieren“ tippt
- **THEN** verschwindet die Kachel aus „Anstehend“
- **AND** der Zähler von „Anstehend“ sinkt um eins und der von „Abgeschlossen“ steigt um eins
- **AND** unter „Abgeschlossen“ steht die Kachel mit Badge „ABGESCHLOSSEN“ und Archiv-Icon
- **AND** die Agenda-Seite wurde nicht geöffnet

#### Scenario: Archivierte Agenda wiederherstellen
- **GIVEN** die erkannte Person hat eine archivierte Agenda mit Datum in einer Woche erstellt
- **WHEN** sie im Tab „Abgeschlossen“ auf der Kachel auf „Wiederherstellen“ tippt
- **THEN** steht die Kachel unter „Anstehend“ mit Badge „ANSTEHEND“ und ohne Archiv-Icon
- **AND** in der Agenda können wieder Änderungen gespeichert werden

#### Scenario: Wiederhergestellte vergangene Agenda bleibt abgeschlossen
- **GIVEN** eine archivierte Agenda, deren Datum gestern war
- **WHEN** der Ersteller sie wiederherstellt
- **THEN** zeigt die Kachel weiter „ABGESCHLOSSEN“, aber ohne Archiv-Icon

#### Scenario: Teilnehmer ohne Verwaltungsrecht
- **GIVEN** die erkannte Person ist Teilnehmer, aber weder Ersteller noch erste Person einer Agenda
- **WHEN** ihre Startseite angezeigt wird
- **THEN** zeigt die Kachel dieser Agenda keinen Archiv-Knopf

#### Scenario: Server lehnt fremde Anfrage ab
- **GIVEN** eine Agenda, deren Ersteller eine andere Person ist
- **WHEN** eine Person, die die Agenda nicht verwalten darf, das Archivieren direkt beim Server anfragt
- **THEN** antwortet der Server mit 403
- **AND** der Archiv-Status der Agenda bleibt unverändert

#### Scenario: Audit-Log
- **WHEN** der Ersteller eine Agenda archiviert und danach wiederherstellt
- **THEN** enthält das Audit-Log der Agenda je einen Eintrag fürs Archivieren und fürs Wiederherstellen mit seinem Namen

#### Scenario: Fehler beim Umschalten
- **GIVEN** der Server antwortet auf das Archivieren mit einem Fehler
- **WHEN** der Ersteller auf „Archivieren“ tippt
- **THEN** bleibt die Kachel in ihrem bisherigen Tab und Zustand
- **AND** eine Fehlermeldung erscheint

## MODIFIED Requirements

### Requirement: Kachel-Grid
Die Startseite MUSS die eigenen Agenden als Kacheln in einem Grid zeigen, das zeilenweise von links nach rechts gefüllt wird. Das Grid MUSS auf breiten Bildschirmen (ab 1024 px Viewport-Breite) drei Spalten, auf mittleren (ab 640 px) zwei und darunter eine Spalte haben. Das Grid DARF NICHT in einem eigenen Bereich mit fester Höhe scrollen; die Seite scrollt. Ein Klick oder Tipp auf eine Kachel MUSS die Agenda öffnen; davon ausgenommen ist der Archiv-Knopf.

#### Scenario: Drei Spalten auf dem Desktop
- **GIVEN** die Person hat 5 Agenden im aktiven Tab
- **WHEN** die Startseite bei 1280 px Breite angezeigt wird
- **THEN** stehen die ersten drei Kacheln nebeneinander in der ersten Zeile und die übrigen zwei in der zweiten Zeile

#### Scenario: Eine Spalte auf dem Handy
- **WHEN** die Startseite bei 390 px Breite angezeigt wird
- **THEN** stehen alle Kacheln untereinander, jeweils in voller Breite

#### Scenario: Kachel öffnet Agenda
- **WHEN** die Person auf eine beliebige Stelle einer Kachel außer dem Archiv-Knopf tippt, auch auf die Mini-Karte
- **THEN** öffnet sich die Seite dieser Agenda

### Requirement: Schlanke Agenda-Zusammenfassung vom Server
`GET /api/agendas/user-agendas` MUSS je Agenda nur die Felder liefern, die die Übersicht braucht: ID, Titel, Datum, Uhrzeit, Ort, Status-, Archiv- und Schließ-Felder, Ersteller, letzte Änderung, Anzahl der Punkte gesamt und abgehakt sowie Personen mit ID, Name, Kartenfarbe und Avatar. Die Antwort DARF KEINE Sicherheitscodes oder TOTP-Geheimnisse, Kommentare, Audit-Logs oder Inhalte der Punkte enthalten. Welche Agenden gefunden werden, MUSS unverändert bleiben.

#### Scenario: Keine Geheimnisse in der Antwort
- **GIVEN** eine Agenda, deren Teilnehmer einen Sicherheitscode und ein TOTP-Geheimnis haben
- **WHEN** ein Teilnehmer `/user-agendas` abruft
- **THEN** enthält die Antwort weder `securityCode` noch `secretGuid` irgendeines Teilnehmers

#### Scenario: Zähler statt Punkte
- **GIVEN** eine Agenda mit 8 Punkten, davon 5 abgehakt
- **WHEN** `/user-agendas` sie liefert
- **THEN** enthält der Eintrag 8 als Gesamtzahl und 5 als Zahl der abgehakten Punkte
- **AND** keine Liste der Punkte

#### Scenario: Ersteller in der Antwort
- **GIVEN** eine Agenda mit gesetztem Ersteller
- **WHEN** `/user-agendas` sie liefert
- **THEN** enthält der Eintrag den Ersteller

#### Scenario: Gleiche Treffer wie bisher
- **WHEN** `/user-agendas` mit ID, Name oder Code abgefragt wird
- **THEN** werden dieselben Agenden gefunden wie vor der Änderung
