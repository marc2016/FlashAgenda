# home-agenda-overview Specification

## Purpose

Legt fest, wie die Startseite einer erkannten Person ihre Agenden als Kachel-Übersicht zeigt (Layout, Inhalt, Status, Sortierung, Tabs) und welche Daten der Server dafür liefert.

## Requirements

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

### Requirement: Inhalt einer Kachel
Jede Kachel MUSS zeigen: Titel (Fallback „Unbenannte Agenda“), Datum und Uhrzeit sofern gesetzt, eine Relativzeit zum Datum (z. B. „in 4 Tagen“, „vor 2 Wochen“), den Ortsnamen sofern gesetzt, den Fortschritt als Balken mit „abgehakt/gesamt“, die Personen als Chips (höchstens fünf, danach „+N“) und das Status-Badge.

#### Scenario: Vollständige Agenda
- **GIVEN** eine Agenda mit Datum, Uhrzeit, Ort „Zum Hirsch“, 8 Punkten, von denen 5 abgehakt sind, und 7 Personen
- **WHEN** ihre Kachel angezeigt wird
- **THEN** zeigt sie Datum, Uhrzeit, eine Relativzeit, „Zum Hirsch“, „5/8“ mit einem zu 5/8 gefüllten Balken, fünf Personen-Chips und „+2“

#### Scenario: Agenda ohne Datum und Ort
- **GIVEN** eine Agenda ohne Datum und ohne Ort
- **WHEN** ihre Kachel angezeigt wird
- **THEN** zeigt sie „ohne Datum“ statt Datum und Relativzeit
- **AND** zeigt keine Ortszeile

#### Scenario: Agenda ohne Punkte
- **GIVEN** eine Agenda ohne Punkte
- **WHEN** ihre Kachel angezeigt wird
- **THEN** zeigt sie „0/0“ mit leerem Balken

### Requirement: Mini-Karte
Hat eine Agenda einen Ort mit Koordinaten, MUSS die Kachel oben über die volle Breite einen Kartenausschnitt mit Markierung des Orts zeigen. Die Karte DARF NICHT auf Ziehen, Zoomen, Scrollen oder Tastatur reagieren und MUSS den OpenStreetMap-Hinweis tragen. Ohne Ort MUSS an derselben Stelle ein Platzhalter gleicher Höhe stehen, damit alle Kacheln gleich aufgebaut sind.

#### Scenario: Karte zeigt den Ort
- **GIVEN** eine Agenda mit Ort und Koordinaten
- **WHEN** ihre Kachel sichtbar wird
- **THEN** zeigt der Banner einen Kartenausschnitt mit einer Markierung an diesen Koordinaten

#### Scenario: Karte ist nicht interaktiv
- **WHEN** die Person auf der Mini-Karte wischt oder mit dem Mausrad scrollt
- **THEN** verschiebt oder zoomt sich der Kartenausschnitt nicht

#### Scenario: Platzhalter ohne Ort
- **GIVEN** eine Agenda ohne Ort
- **WHEN** ihre Kachel angezeigt wird
- **THEN** steht an der Stelle der Karte ein Platzhalter gleicher Höhe

### Requirement: Status einer Agenda
Jede Agenda MUSS genau einen Status haben, in dieser Reihenfolge geprüft: **LIVE**, wenn die Live-Sitzung läuft; **ABGESCHLOSSEN**, wenn die Live-Sitzung beendet ist, der Zeitpunkt des Treffens in der Vergangenheit liegt oder die Agenda archiviert ist; sonst **ANSTEHEND**. Der Status MUSS als Badge auf der Kachel stehen. Archivierte Agenden MÜSSEN zusätzlich ein Archiv-Icon zeigen.

#### Scenario: Laufende Sitzung
- **GIVEN** die Live-Sitzung einer Agenda läuft
- **WHEN** die Kachel angezeigt wird
- **THEN** zeigt sie das Badge „LIVE“, auch wenn das Datum vorbei ist

#### Scenario: Datum vorbei ohne Sitzung
- **GIVEN** eine Agenda, deren Datum gestern war und deren Live-Sitzung nie gestartet wurde
- **WHEN** die Kachel angezeigt wird
- **THEN** zeigt sie „ABGESCHLOSSEN“

#### Scenario: Sitzung beendet vor dem Datum
- **GIVEN** eine Agenda mit Datum in einer Woche, deren Live-Sitzung bereits beendet wurde
- **WHEN** die Kachel angezeigt wird
- **THEN** zeigt sie „ABGESCHLOSSEN“

#### Scenario: Heute in ein paar Stunden
- **GIVEN** eine Agenda, die heute in drei Stunden beginnt
- **WHEN** die Kachel angezeigt wird
- **THEN** zeigt sie „ANSTEHEND“

#### Scenario: Archiviert
- **GIVEN** eine archivierte Agenda mit Datum in der Zukunft
- **WHEN** die Kachel angezeigt wird
- **THEN** zeigt sie „ABGESCHLOSSEN“ und ein Archiv-Icon

### Requirement: Hinweis auf Annahmeschluss
Kann in einer Agenda kein neuer Punkt mehr eingetragen werden (manuell geschlossen oder Annahmeschluss vor dem Datum erreicht), MUSS die Kachel ein Schloss-Icon zeigen. Die Regel MUSS dieselbe sein wie auf der Agenda-Seite.

#### Scenario: Manuell geschlossen
- **GIVEN** eine anstehende Agenda, die manuell geschlossen wurde
- **WHEN** die Kachel angezeigt wird
- **THEN** zeigt sie ein Schloss-Icon

#### Scenario: Offen
- **GIVEN** eine Agenda mit Datum in zwei Wochen, 12 Stunden Annahmeschluss und nicht manuell geschlossen
- **WHEN** die Kachel angezeigt wird
- **THEN** zeigt sie kein Schloss-Icon

### Requirement: Sortierung
Die Kacheln MÜSSEN so sortiert sein: zuerst LIVE, dann ANSTEHEND nach Datum aufsteigend (Agenden ohne Datum am Ende dieser Gruppe), dann ABGESCHLOSSEN nach Datum absteigend (ohne Datum nach letzter Änderung).

#### Scenario: Gemischte Agenden
- **GIVEN** eine abgeschlossene Agenda von letzter Woche, eine anstehende in 10 Tagen, eine anstehende in 2 Tagen, eine anstehende ohne Datum und eine laufende Sitzung
- **WHEN** der Tab „Alle“ aktiv ist
- **THEN** ist die Reihenfolge: laufende Sitzung, in 2 Tagen, in 10 Tagen, ohne Datum, letzte Woche

### Requirement: Tabs
Über dem Grid MÜSSEN die Tabs „Alle“, „Anstehend“ und „Abgeschlossen“ stehen, jeweils mit der Anzahl der Agenden. „Anstehend“ MUSS LIVE- und ANSTEHEND-Agenden zeigen, „Abgeschlossen“ die abgeschlossenen. Beim Öffnen der Startseite MUSS „Anstehend“ aktiv sein. Ist der aktive Tab leer, MUSS ein Hinweis mit einem Link zu „Alle“ erscheinen.

#### Scenario: Start-Tab
- **WHEN** die Person die Startseite öffnet
- **THEN** ist „Anstehend“ aktiv und zeigt nur laufende und anstehende Agenden

#### Scenario: Tab wechseln
- **WHEN** die Person auf „Abgeschlossen“ tippt
- **THEN** zeigt das Grid nur abgeschlossene Agenden

#### Scenario: Leerer Tab
- **GIVEN** die Person hat nur abgeschlossene Agenden
- **WHEN** die Startseite geöffnet wird
- **THEN** zeigt „Anstehend“ einen Hinweis mit Link zu „Alle“
- **AND** ein Tipp auf den Link aktiviert „Alle“

#### Scenario: Gar keine Agenden
- **GIVEN** die Person hat keine Agenden
- **WHEN** die Startseite geöffnet wird
- **THEN** erscheint statt Tabs und Grid der Hinweis „Noch keine Agenden vorhanden.“

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
