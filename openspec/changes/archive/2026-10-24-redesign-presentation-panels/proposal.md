# Proposal

## Why

Die Präsentationsansicht (Live-Sitzung) wirkt unfertig. Hinter dem Dialog scheint die Agenda-Seite durch, die fünf Phasen sind optisch uneinheitlich, und in der TOP-Ansicht fallen Details auf: Markdown wird nicht gerendert, Namen stehen doppelt da, die Timer haben keine Beschriftung. Auf dem Handy ragen die Steuer-Buttons aus dem Bildschirm. Die Ansicht soll sich so anfühlen wie der Rest der App: roter Comic-Hintergrund mit einzelnen dunklen Panels.

## What Changes

- Die Präsentation füllt den Bildschirm mit dem deckenden App-Rot (`#b71c1c`). Die Agenda-Seite scheint nicht mehr durch.
- Es gibt keinen großen Dialog-Kasten mehr. Jede Phase (Start, Roll-Call, Anwesenheit, TOPs, Abschluss) besteht aus einzelnen `comic-panel-dark`-Panels, wie die Kacheln auf der Agenda-Seite.
- Die Kopfzeile wird eine kompakte Pill im Stil der Aktionsleiste der Agenda-Seite: Titel, beschriftete Timer („TOP“ und „Gesamt“), Pause-Status und Schließen.
- TOP-Ansicht:
  - Die Beschreibung wird als Markdown gerendert.
  - Die Likes stehen in einer beschrifteten Zeile („Daumen hoch von:“), damit sie nicht wie ein doppelter Autor-Chip aussehen.
  - Beschreibung, Abstimmung, Kommentare und Notiz sind eigene Panels.
- Die Steuerung (Zurück, Überspringen, Pause, Abhaken & Weiter) ist ein eigenes Panel. Auf dem Handy steht sie fest unten: Hauptaktion über die volle Breite, Nebenaktionen als Icon-Buttons.
- Mengenangaben richtig deklinieren: „1 Punkt / 2 Punkte“, „1 Stimme / 2 Stimmen“.
- Leere Angaben auf der Personenkarte (keine E-Mail, „Zuletzt online: Unbekannt“) werden in der Präsentation ausgeblendet.
- Auf dem Handy liegt ein 16px-Rand um den Inhalt, wie auf der Agenda-Seite. Es gibt kein horizontales Scrollen.

Sync, Timer-Logik, Phasenwechsel und Datenmodell bleiben unverändert. Das ist eine reine UI-Änderung.

## Capabilities

### New Capabilities
- `live-presentation-view`: Darstellung der Live-Sitzung (Präsentationsmodus): Hintergrund, Panel-Layout je Phase, Kopfzeile, Steuerung, Lesbarkeit auf Desktop und Handy.

### Modified Capabilities
<!-- keine - es gibt noch keine bestehenden Specs -->

## Impact

- **Code:** [frontend/src/components/LiveMeetingModal.tsx](../../../frontend/src/components/LiveMeetingModal.tsx) (Hauptarbeit), eventuell [frontend/src/index.css](../../../frontend/src/index.css) für dialog-spezifische Overrides (die globale Regel `.p-dialog .p-dialog-content { background: transparent !important }` darf nicht für alle Dialoge geändert werden).
- **Tests:** [frontend/e2e/presentation-enhancements.spec.ts](../../../frontend/e2e/presentation-enhancements.spec.ts), [frontend/e2e/presentation-live-sync.spec.ts](../../../frontend/e2e/presentation-live-sync.spec.ts) und [frontend/e2e/live-meeting.spec.ts](../../../frontend/e2e/live-meeting.spec.ts) nutzen `data-testid`s der Ansicht. Diese bleiben erhalten, Texte können sich ändern.
- **Backend / API:** keine Änderung.
