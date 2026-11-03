# passkey-authentication Specification

## Purpose

Legt fest, wie eine Person Passkeys (WebAuthn) als Nachweis ihrer Identität einrichtet, nutzt und verwaltet, und wie der Server diese Endpoints schützt. Passkeys ergänzen den Code, sie ersetzen ihn nicht.

## Requirements

### Requirement: Passkey einrichten
Eine angemeldete Person MUSS auf ihrem Gerät einen Passkey anlegen können. Dafür MUSS das Gerät nachweisen, dass es diese Person ist (eigener fester Code oder TOTP). Der Server MUSS den öffentlichen Schlüssel der Person zuordnen (über ihre stabile ID) und speichern. Eine Person DARF mehrere Passkeys haben. Ohne gültigen Nachweis DARF KEIN Passkey angelegt werden.

#### Scenario: Passkey im Profil anlegen
- **GIVEN** ein Gerät ist als „Anna“ angemeldet und der Browser unterstützt Passkeys
- **WHEN** Anna im Profil „Passkey einrichten“ wählt und die Biometrie bestätigt
- **THEN** speichert der Server einen Passkey für Annas ID
- **AND** das Profil zeigt den neuen Passkey mit Datum in der Liste

#### Scenario: Zweites Gerät
- **GIVEN** Anna hat auf dem Handy bereits einen Passkey
- **WHEN** sie auf dem Laptop einen weiteren einrichtet
- **THEN** hat sie zwei Passkeys und beide funktionieren

#### Scenario: Anlegen ohne Nachweis
- **WHEN** eine Anfrage für Annas ID einen Passkey registrieren will, aber keinen gültigen Code mitschickt
- **THEN** lehnt der Server ab und speichert nichts

### Requirement: Mit Passkey anmelden
Ein Gerät MUSS sich mit einem Passkey als Person ausweisen können, ohne vorher einen Namen zu wählen. Bei gültiger Signatur MUSS der Server die Person samt eigenen Geheimnissen zurückgeben, in derselben Form wie beim Login per Code. Eine ungültige oder unbekannte Signatur MUSS abgelehnt werden, ohne Geheimnisse zu senden. Der Server MUSS den Signaturzähler prüfen und speichern.

#### Scenario: Anmelden im „Wer bist du?“-Dialog
- **GIVEN** ein neues Gerät öffnet eine Agenda, in der Anna registriert ist, und besitzt Annas Passkey
- **WHEN** die Person „Mit Passkey anmelden“ wählt und die Biometrie bestätigt
- **THEN** ist das Gerät als Anna angemeldet, ohne Code-Eingabe
- **AND** das Gerät hat Annas Geheimnisse im lokalen Speicher

#### Scenario: Anmelden auf der Startseite
- **WHEN** die Person im Login-Dialog der Startseite „Mit Passkey anmelden“ wählt und bestätigt
- **THEN** ist sie auf der Startseite angemeldet und sieht ihre Agenden

#### Scenario: Person fehlt in dieser Agenda
- **GIVEN** Anna ist in der geöffneten Agenda noch nicht eingetragen
- **WHEN** sie sich dort mit Passkey anmeldet
- **THEN** wird sie wie bei „Als Anna beitreten“ mit ihren eigenen Geheimnissen eingetragen

#### Scenario: Ungültige Signatur
- **WHEN** eine Anmeldung mit einer unbekannten oder manipulierten Signatur ankommt
- **THEN** lehnt der Server ab und sendet keine Geheimnisse

### Requirement: Passkeys verwalten
Das Profil MUSS die eigenen Passkeys mit Bezeichnung und Erstelldatum auflisten und einzelne löschen können. Löschen MUSS denselben Nachweis verlangen wie Anlegen. Fremde Passkeys DÜRFEN NICHT sichtbar oder löschbar sein.

#### Scenario: Passkey löschen
- **GIVEN** Anna hat zwei Passkeys
- **WHEN** sie einen davon im Profil löscht
- **THEN** funktioniert nur noch der andere

#### Scenario: Fremden Passkey löschen
- **WHEN** eine Anfrage einen Passkey löschen will, der zu einer anderen Person gehört
- **THEN** lehnt der Server ab

### Requirement: Fallback und Unterstützung
Code, TOTP und QR-Transfer MÜSSEN unverändert funktionieren. Der Knopf „Mit Passkey anmelden“ und „Passkey einrichten“ DÜRFEN nur erscheinen, wenn der Browser WebAuthn unterstützt. Bricht die Person die Biometrie ab oder schlägt sie fehl, MUSS die App einen verständlichen Hinweis zeigen und den Code-Weg weiter anbieten.

#### Scenario: Browser ohne WebAuthn
- **WHEN** ein Browser ohne `PublicKeyCredential` den „Wer bist du?“-Dialog öffnet
- **THEN** fehlt der Passkey-Knopf und der Dialog sieht aus wie bisher

#### Scenario: Abbruch
- **WHEN** die Person die Biometrie-Abfrage abbricht
- **THEN** zeigt der Dialog „Passkey-Anmeldung abgebrochen“ und bleibt offen

### Requirement: Einmaliger Hinweis
Nach der ersten Anmeldung auf einem Gerät MUSS die Agenda-Seite einmalig einen Hinweis zeigen, einen Passkey einzurichten, sofern der Browser Passkeys unterstützt. Der Hinweis MUSS sich dauerhaft wegklicken lassen und DARF nach einem Wegklicken oder nach dem Einrichten NICHT mehr erscheinen.

#### Scenario: Hinweis erscheint
- **GIVEN** ein Gerät hat sich gerade zum ersten Mal per Code als Anna angemeldet
- **WHEN** die Agenda-Seite geladen ist
- **THEN** erscheint ein Hinweis mit „Passkey einrichten“ und „Nicht mehr fragen“

#### Scenario: Hinweis weggeklickt
- **WHEN** die Person „Nicht mehr fragen“ wählt und die Seite neu lädt
- **THEN** erscheint der Hinweis nicht mehr

### Requirement: Schutz der Passkey-Endpoints
Challenges MÜSSEN einmalig sein und nach 5 Minuten verfallen. Der Passkey-Login MUSS pro IP-Adresse auf 10 Fehlversuche in 15 Minuten begrenzt sein. Die erlaubte Herkunft (Origin) und die Relying-Party-ID MÜSSEN konfigurierbar sein und Anfragen von anderer Herkunft MÜSSEN abgelehnt werden.

#### Scenario: Abgelaufene Challenge
- **GIVEN** eine Challenge wurde vor 6 Minuten ausgegeben
- **WHEN** eine Anmeldung damit ankommt
- **THEN** lehnt der Server ab

#### Scenario: Challenge zweimal verwenden
- **WHEN** eine gültige Anmeldung ein zweites Mal mit derselben Challenge gesendet wird
- **THEN** lehnt der Server die zweite ab

#### Scenario: Falsche Herkunft
- **WHEN** eine sonst gültige Anmeldung von einer nicht konfigurierten Origin kommt
- **THEN** lehnt der Server ab
