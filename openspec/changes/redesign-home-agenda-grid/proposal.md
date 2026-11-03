# Proposal

## Why

Die Startseite zeigt „Deine Agenden“ als schmale, scrollende Liste mit Titel, Personenzahl und Punktezahl. Man sieht nicht, wann und wo ein Treffen ist, ob es schon stattgefunden hat oder wie weit die Punkte abgearbeitet sind. Gerade auf großen Bildschirmen bleibt viel Platz ungenutzt. Außerdem liefert der Endpoint `/api/agendas/user-agendas` komplette Agenda-Dokumente aus, einschließlich der Sicherheitscodes (`securityCode`, `secretGuid`) aller Teilnehmer. Das ist zu viel Payload und ein Datenleck.

## What Changes

- „Deine Agenden“ wird zu einem Kachel-Grid: drei Spalten auf dem Desktop, zwei auf dem Tablet, eine auf dem Handy. Die Kacheln laufen zeilenweise von links nach rechts.
- Jede Kachel zeigt:
  - eine Mini-Karte des Orts als Banner oben, nicht interaktiv (bei Agenden ohne Ort einen Platzhalter in gleicher Höhe)
  - Titel, Datum und Uhrzeit sowie eine Relativzeit („in 4 Tagen“, „vor 2 Wochen“)
  - den Ortsnamen
  - einen Fortschrittsbalken für abgehakte Punkte („5/8“)
  - Personen-Chips
  - ein Status-Badge
  - ein Schloss-Icon, sobald keine neuen Punkte mehr eingetragen werden können
- Es gibt drei Status: **LIVE** (Live-Sitzung läuft), **ABGESCHLOSSEN** (Live-Sitzung beendet oder Datum vorbei) und **ANSTEHEND** (alles andere). Archivierte Agenden zählen als abgeschlossen und bekommen ein Archiv-Icon.
- Sortierung: LIVE zuerst, dann die anstehenden Agenden (nächster Termin zuerst, ohne Datum am Ende), dann die abgeschlossenen (neueste zuerst).
- Über dem Grid gibt es die Tabs **Alle / Anstehend / Abgeschlossen**. Beim Öffnen ist „Anstehend“ aktiv. Ist der Tab leer, erscheint ein Hinweis mit Link zu „Alle“.
- **BREAKING (API):** `/api/agendas/user-agendas` liefert nur noch eine schlanke Zusammenfassung je Agenda. Kommentare, Audit-Logs, Item-Inhalte und die Sicherheitscodes der Teilnehmer fallen weg.

## Capabilities

### New Capabilities
- `home-agenda-overview`: Die Übersicht der eigenen Agenden auf der Startseite: Kachel-Layout, Inhalt der Kacheln, Status, Sortierung, Tabs und die Zusammenfassung, die der Server dafür liefert.

### Modified Capabilities
<!-- keine -->

## Impact

- **Frontend:** [Home.tsx](../../../frontend/src/pages/Home.tsx) wird umgebaut. Neu kommen eine Kachel-Komponente und eine Mini-Karten-Komponente (Leaflet). Der Marker-Icon-Fix aus [AgendaHeader.tsx](../../../frontend/src/components/AgendaHeader.tsx) wandert in ein gemeinsames Modul.
- **Backend / API:** [agenda.ts](../../../backend/src/routes/agenda.ts) (`GET /user-agendas`) bekommt eine Projektion bzw. ein Mapping auf das Zusammenfassungsformat. Die Suchlogik (ID, Name, Code, TOTP) bleibt unverändert.
- **Tests:** Anpassen bzw. ergänzen: [agendaRoutes.test.ts](../../../backend/tests/agendaRoutes.test.ts) und [home.spec.ts](../../../frontend/e2e/home.spec.ts). Mehrere E2E-Specs mocken `user-agendas`. Ihre Mock-Daten müssen weiter funktionieren oder ans neue Format angepasst werden.
- **Abhängigkeiten:** keine neuen (Leaflet und `date-fns` sind bereits vorhanden).
