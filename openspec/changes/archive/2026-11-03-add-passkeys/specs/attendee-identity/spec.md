# Spec Delta

## MODIFIED Requirements

### Requirement: Keine fremden Geheimnisse in Antworten
Antworten des Servers, die Teilnehmer enthalten, DÜRFEN KEINE `securityCode`- oder `secretGuid`-Werte enthalten. Das gilt für das Laden einer Agenda, für Antworten auf Änderungen, für Socket-Updates und für alle übrigen Endpoints. Ob eine Person registriert ist (`isRegistered`), MUSS weiterhin sichtbar sein. Ausgenommen sind nur die Antworten, mit denen ein Gerät die eigenen Geheimnisse erhält (Prüfen, Übernehmen, Login per Code, Login per Passkey).

#### Scenario: Agenda laden
- **GIVEN** eine Agenda mit drei registrierten Personen, jede mit Code und GUID
- **WHEN** jemand die Agenda über ihren Link lädt
- **THEN** enthält die Antwort für keine Person `securityCode` oder `secretGuid`
- **AND** jede Person hat weiterhin `isRegistered: true`

#### Scenario: Socket-Update nach einer Änderung
- **WHEN** ein Agendapunkt hinzugefügt wird und der Server ein Update an alle verbundenen Geräte sendet
- **THEN** enthält das Update keine `securityCode`- oder `secretGuid`-Werte

#### Scenario: Passkey-Login liefert nur die eigene Person
- **WHEN** ein Gerät sich per Passkey als Anna anmeldet
- **THEN** enthält die Antwort Annas Geheimnisse und keine anderer Personen

### Requirement: Begrenzung von Fehlversuchen
Der Server MUSS pro Person höchstens 5 fehlgeschlagene Code-Prüfungen in 15 Minuten zulassen und danach weitere Prüfungen für diese Person mit einem verständlichen Hinweis ablehnen, auch wenn der Code stimmt. Der Login per Code (ohne Personenwahl) MUSS pro IP-Adresse ebenso begrenzt sein. Hinter Reverse Proxys MUSS dafür die IP-Adresse des Clients zählen, nicht die des Proxys.

#### Scenario: Sperre nach fünf Fehlversuchen
- **GIVEN** für Anna wurden in den letzten 15 Minuten 5 falsche Codes gesendet
- **WHEN** ein Gerät für Anna den richtigen Code sendet
- **THEN** lehnt der Server mit dem Hinweis ab, es später erneut zu versuchen

#### Scenario: Login per Code gesperrt
- **GIVEN** von einer IP-Adresse kamen in 15 Minuten 5 fehlgeschlagene Logins per Code
- **WHEN** von derselben IP ein weiterer Login per Code kommt
- **THEN** lehnt der Server ab

#### Scenario: Zwei Clients hinter demselben Proxy
- **GIVEN** Client A hat hinter dem Reverse Proxy 5 fehlgeschlagene Logins per Code
- **WHEN** Client B mit anderer IP hinter demselben Proxy einen Login per Code versucht
- **THEN** wird Client B nicht gesperrt
