# attendee-identity Specification

## Purpose

Legt fest, wer die Geheimnisse einer Person (fester Code und TOTP-GUID) sehen darf, wie sie entstehen und wie ein Gerät sich per Code als Person ausweist, ohne dass andere die Codes auslesen oder durchprobieren können.

## Requirements

### Requirement: Keine fremden Geheimnisse in Antworten
Antworten des Servers, die Teilnehmer enthalten, DÜRFEN KEINE `securityCode`- oder `secretGuid`-Werte enthalten. Das gilt für das Laden einer Agenda, für Antworten auf Änderungen, für Socket-Updates und für alle übrigen Endpoints. Ob eine Person registriert ist (`isRegistered`), MUSS weiterhin sichtbar sein. Ausgenommen sind nur die Antworten, mit denen ein Gerät die eigenen Geheimnisse erhält (Prüfen, Übernehmen, Login per Code).

#### Scenario: Agenda laden
- **GIVEN** eine Agenda mit drei registrierten Personen, jede mit Code und GUID
- **WHEN** jemand die Agenda über ihren Link lädt
- **THEN** enthält die Antwort für keine Person `securityCode` oder `secretGuid`
- **AND** jede Person hat weiterhin `isRegistered: true`

#### Scenario: Socket-Update nach einer Änderung
- **WHEN** ein Agendapunkt hinzugefügt wird und der Server ein Update an alle verbundenen Geräte sendet
- **THEN** enthält das Update keine `securityCode`- oder `secretGuid`-Werte

### Requirement: Beitreten mit Code wird auf dem Server geprüft
Will ein Gerät einer registrierten Person beitreten, MUSS es den eingegebenen Code an den Server senden. Der Server MUSS ihn gegen den festen Code und den aktuellen TOTP-Code der Person prüfen (Zeitfenster 300 s und 60 s). Nur bei Erfolg MUSS er die Person samt Geheimnissen zurückgeben. Bei falschem Code MUSS er ablehnen, ohne Geheimnisse zu senden.

#### Scenario: Richtiger fester Code
- **GIVEN** die registrierte Person „Anna“ mit festem Code 4711
- **WHEN** ein neues Gerät für Anna den Code 4711 sendet
- **THEN** antwortet der Server mit Erfolg und Annas Code und GUID
- **AND** das Gerät ist danach als Anna angemeldet

#### Scenario: Richtiger TOTP-Code
- **WHEN** ein Gerät für Anna den gerade gültigen rotierenden Code sendet
- **THEN** antwortet der Server mit Erfolg und Annas Geheimnissen

#### Scenario: Falscher Code
- **WHEN** ein Gerät für Anna einen falschen Code sendet
- **THEN** lehnt der Server ab und sendet keine Geheimnisse
- **AND** das Gerät zeigt „Falscher Code“ und bleibt unangemeldet

### Requirement: Übernahme nicht registrierter Personen
Eine Person, die noch nicht registriert ist (z. B. vom Ersteller angelegt), MUSS ohne Code übernommen werden können. Bei der Übernahme MUSS der Server die Person als registriert markieren und ihr Geheimnisse geben: die mitgebrachten eigenen Geheimnisse des Geräts, sonst neu erzeugte. Er MUSS sie diesem Gerät zurückgeben. Eine bereits registrierte Person DARF NICHT über diesen Weg übernommen werden.

#### Scenario: Tom übernehmen
- **GIVEN** die nicht registrierte Person „Tom“
- **WHEN** ein Gerät „Ich bin Tom“ wählt
- **THEN** ist Tom danach registriert
- **AND** das Gerät erhält Toms vom Server erzeugten Code und GUID

#### Scenario: Vorab angelegte Person mit eigenem Code übernehmen
- **GIVEN** ein Gerät ist als „Max“ mit Code 1111 angemeldet und eine neue Agenda enthält die nicht registrierte Person „Max“
- **WHEN** das Gerät „Als Max beitreten“ wählt
- **THEN** ist Max dort registriert und hat Code 1111

#### Scenario: Registrierte Person übernehmen
- **GIVEN** die registrierte Person „Anna“
- **WHEN** ein Gerät versucht, Anna ohne Code zu übernehmen
- **THEN** lehnt der Server ab und verlangt die Code-Prüfung

### Requirement: Herkunft der Geheimnisse
Code und GUID einer Person MÜSSEN vom Server erzeugt werden. Ausnahme: Ein Gerät, das sich selbst als neue Person einträgt oder eine nicht registrierte Person übernimmt, DARF seine eigenen bestehenden Geheimnisse mitbringen, damit eine Person über mehrere Agenden denselben Code behält. Bestehende Geheimnisse einer Person DÜRFEN NICHT durch Anfragen überschrieben werden. Fehlen einer registrierten Person Geheimnisse, MUSS der Server sie ergänzen.

#### Scenario: Person für jemand anderen anlegen
- **WHEN** der Ersteller die Person „Lena“ anlegt und dabei einen Code mitschickt
- **THEN** speichert der Server den mitgeschickten Code nicht
- **AND** Lena ist nicht registriert, bis sie übernommen wird

#### Scenario: Gleiche Person in neuer Agenda
- **GIVEN** ein Gerät ist als „Max“ mit Code 1111 angemeldet
- **WHEN** Max sich selbst in eine neue Agenda einträgt
- **THEN** hat Max dort ebenfalls Code 1111

#### Scenario: Überschreiben verhindern
- **GIVEN** die registrierte Person „Anna“ mit Code 4711
- **WHEN** eine Anfrage für Anna einen anderen Code mitschickt
- **THEN** bleibt Annas Code 4711

#### Scenario: Speichern der Teilnehmerliste ohne Geheimnisse
- **GIVEN** registrierte Personen mit gespeicherten Codes
- **WHEN** ein Gerät die Teilnehmerliste speichert (z. B. nach Umsortieren oder Farbwechsel), ohne Geheimnisse mitzuschicken
- **THEN** behalten alle Personen ihre gespeicherten Codes und GUIDs

### Requirement: Begrenzung von Fehlversuchen
Der Server MUSS pro Person höchstens 5 fehlgeschlagene Code-Prüfungen in 15 Minuten zulassen und danach weitere Prüfungen für diese Person mit einem verständlichen Hinweis ablehnen, auch wenn der Code stimmt. Der Login per Code (ohne Personenwahl) MUSS pro IP-Adresse ebenso begrenzt sein.

#### Scenario: Sperre nach fünf Fehlversuchen
- **GIVEN** für Anna wurden in den letzten 15 Minuten 5 falsche Codes gesendet
- **WHEN** ein Gerät für Anna den richtigen Code sendet
- **THEN** lehnt der Server mit dem Hinweis ab, es später erneut zu versuchen

#### Scenario: Login per Code gesperrt
- **GIVEN** von einer IP-Adresse kamen in 15 Minuten 5 fehlgeschlagene Logins per Code
- **WHEN** von derselben IP ein weiterer Login per Code kommt
- **THEN** lehnt der Server ab

### Requirement: Eigener Code bleibt auf dem eigenen Gerät nutzbar
Ein angemeldetes Gerät MUSS den eigenen Code (fest und rotierend) im Profil und auf der eigenen Personenkarte anzeigen und den QR-Transfer auf ein anderes Gerät anbieten können. Diese Anzeigen MÜSSEN aus dem lokalen Speicher des Geräts kommen. Für andere Personen DARF KEIN Code angezeigt werden.

#### Scenario: Eigener Code im Profil
- **GIVEN** ein Gerät ist als „Max“ angemeldet
- **WHEN** Max sein Profil öffnet
- **THEN** sieht er seinen aktuellen Code

#### Scenario: Fremde Personenkarte
- **WHEN** Max die Personenkarte von Anna ansieht
- **THEN** wird dort kein Code angezeigt
