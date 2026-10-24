# Tasks

## 1. Grundgerüst: Hintergrund, Bausteine, Helper

- [x] 1.1 In `index.css` die Overrides `.p-dialog.live-meeting-dialog`, `.p-dialog.live-meeting-dialog .p-dialog-content` und `.live-meeting-mask` anlegen; im `Dialog` `maskClassName="live-meeting-mask"` setzen und `backgroundColor` aus `contentStyle` entfernen. Prüfen: Screenshot jeder Phase zeigt nur Rot hinter dem Inhalt, der Dialog „Neue Agenda erstellen“ sieht unverändert aus
- [x] 1.2 Die dekorativen Blur-Kreise im `<main>` entfernen und den Inhalt in einen zentrierten Container setzen (max. ca. 1200px, 16px Rand mobil, 24px ab `md`). Prüfen: Bei 390px beginnen die Panels 16px vom Rand
- [x] 1.3 Lokale Komponente `Panel` (comic-panel-dark, optionale Titelzeile mit Icon) in `LiveMeetingModal.tsx` anlegen. Prüfen: `npx tsc --noEmit -p tsconfig.app.json` läuft fehlerfrei
- [x] 1.4 Helper `plural(count, singular, plural)` anlegen und für „Punkt/Punkte“ und „Stimme/Stimmen“ auf dem Bildschirm und im Protokoll-Export verwenden. Prüfen: E2E-Erwartung „1 Stimme“ bzw. „1 Punkt“

## 2. Kopfzeile

- [x] 2.1 `<header>` zur Pill im Stil der Agenda-Aktionsleiste umbauen; Timer mit sichtbaren Labels „TOP“ und „Gesamt“, Pausiert-Hinweis, Schließen-Button; Agenda-Titel auf dem Handy ausblenden. Testids `item-timer-display`, `session-timer-display`, `paused-indicator` und `close-live-meeting-btn` bleiben. Prüfen: E2E-Test, dass `item-timer-display` „TOP“ und `session-timer-display` „Gesamt“ enthält

## 3. Phasen auf Panels umbauen

- [x] 3.1 Startphase: Titel-Panel (Logo, Titel) plus Kachel-Panels für Datum, Ort, Teilnehmer und TOPs; Start-Buttons in einem Steuer-Panel. Prüfen: `start-rollcall-btn` und `start-items-direct-btn` funktionieren in `live-meeting.spec.ts`
- [x] 3.2 Lokale Komponente `PersonCardBody` anlegen (blendet leere E-Mail und unbekanntes „Zuletzt online“ aus, zeigt „Erstellte Punkte“ mit `plural`) und in Roll-Call und Anwesenheitsübersicht verwenden. Prüfen: E2E-Test, dass eine Person ohne E-Mail kein „Keine E-Mail“ zeigt
- [x] 3.3 Roll-Call-Phase: Personen-Panel, Anwesend/Abwesend-Buttons und Navigation als Steuer-Panel. Prüfen: `attendance-present-btn` und `attendance-absent-btn` funktionieren in den bestehenden Tests
- [x] 3.4 Anwesenheitsübersicht: Statistik-Panel (anwesend, abwesend, Quote) und Personenkarten im Raster; Aktionen als Steuer-Panel. Prüfen: `start-agenda-items-btn` funktioniert, kein horizontales Scrollen bei 320px
- [x] 3.5 Agendapunkt-Phase: Panels für Titel und Beschreibung, Abstimmung, Kommentare und Notiz; Desktop zweispaltig, mobil untereinander. Prüfen: `toggle-pin-item-btn`, `item-likes-container` und `open-all-tops-drawer-btn` funktionieren
- [x] 3.6 Abschlussphase: Kennzahl-Panels (Dauer, besprochen, anwesend), Tabellen-Panel und Aktionen als Steuer-Panel. Prüfen: `copy-protocol-btn`, `download-protocol-btn`, `return-from-meeting-btn` und `finish-live-meeting-btn` funktionieren

## 4. Inhalte der TOP-Ansicht

- [x] 4.1 `READONLY_PLUGINS` aus `AgendaTimeline.tsx` exportieren und die Beschreibung mit `MDXEditor readOnly` in `.agenda-details-container` rendern, mit `key` auf die Item-ID. Prüfen: E2E-Test, dass eine Beschreibung mit `**fett**` ein `strong`-Element und keine Sternchen enthält
- [x] 4.2 Likes in einer beschrifteten Zeile „Daumen hoch von:“ anzeigen, getrennt vom Autor-Chip. Prüfen: E2E-Test, dass `item-likes-container` den Text „Daumen hoch von“ enthält

## 5. Steuerung

- [x] 5.1 Steuerung der Agendapunkt-Phase als Panel: Desktop einzeilig; unter `md` `position: sticky; bottom: 16px`, „Abhaken & Weiter“ über die volle Breite, Zurück, Überspringen und Pause als Icon-Buttons mit `aria-label`. Testids `prev-top-btn`, `skip-top-btn`, `toggle-session-timer-btn` und `next-top-btn` bleiben. Prüfen: E2E-Test auf 390px, dass `next-top-btn` ohne Scrollen im Viewport liegt und vollständig sichtbar ist
- [x] 5.2 Mit Bildschirmtastatur prüfen (Notizfeld fokussiert): Die Steuerung verdeckt das Eingabefeld nicht. Prüfen: manuell bzw. im Playwright-Projekt `mobile-safari`

## 6. Tests und Abnahme

- [x] 6.1 Bestehende E2E-Specs (`live-meeting.spec.ts`, `presentation-enhancements.spec.ts`, `presentation-live-sync.spec.ts`, `mobile.spec.ts`) an geänderte Texte anpassen, ohne Prüfungen zu entfernen. Prüfen: Specs grün in allen 4 Playwright-Projekten
- [x] 6.2 Neue Spec `frontend/e2e/presentation-panels.spec.ts` mit den Szenarien aus `specs/live-presentation-view/spec.md`: kein Durchscheinen (Hintergrundfarbe der Maske), Timer-Labels, Markdown, Likes-Zeile, Deklination, leere Personenfelder, Steuerung im Viewport, kein horizontales Scrollen bei 320px. Prüfen: Spec grün in allen 4 Projekten
- [x] 6.3 Gesamte Abnahme: `npm run build` im Frontend, komplette Playwright-Suite grün, Screenshots aller 5 Phasen auf 1440px und 390px gesichtet
