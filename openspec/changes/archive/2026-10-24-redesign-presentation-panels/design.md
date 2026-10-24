# Design

## Context

Die Präsentation ist ein maximierter PrimeReact-`Dialog` in `LiveMeetingModal.tsx` (rund 2000 Zeilen, alle fünf Phasen in einer Komponente). Er setzt per `contentStyle` einen deckenden Hintergrund (`#111827`). Den überschreiben aber globale Regeln in `index.css`:

- `.p-dialog, .p-dialog.glass-panel { background: rgba(31,41,55,0.95) !important; border: 3px solid #000 !important; box-shadow: ... }`
- `.p-dialog .p-dialog-content { background: transparent !important; padding: 1.25rem !important }`

Das Ergebnis ist ein zu 95 % deckender Kasten, durch den die Agenda-Seite durchscheint. Dieselben Regeln stylen alle anderen Dialoge der App, daher dürfen sie nicht global geändert werden.

Vorhandene Bausteine, die wiederverwendet werden:
- `.comic-panel-dark` (index.css): `#1f2937`, 3px schwarzer Rand, `6px 6px 0 #000`, Radius 12px. Das ist der Stil der Kacheln auf der Agenda-Seite.
- Die Aktionsleiste in `AgendaHeader.tsx` (`rgba(0,0,0,0.85)`, Radius 999px, Rand `1px solid rgba(234,179,8,0.3)`) ist die Vorlage für die Kopfzeile.
- Die Read-only-Markdown-Darstellung in `AgendaTimeline.tsx`: `<MDXEditor readOnly plugins={READONLY_PLUGINS}>` innerhalb von `.agenda-details-container`. index.css enthält dafür bereits Regeln für den dunklen Hintergrund (`.comic-panel-dark .mdxeditor ...`).

## Goals / Non-Goals

**Goals:**
- Optik je Phase umbauen, ohne Zustand, Sync oder Handler anzufassen.
- Alle bestehenden `data-testid`s erhalten, damit die E2E-Tests nur bei geänderten Texten angepasst werden müssen.

**Non-Goals:**
- `LiveMeetingModal.tsx` in mehrere Dateien aufteilen. Das wäre wünschenswert, vergrößert aber den Diff und das Risiko. Höchstens kleine, rein darstellende Hilfskomponenten in derselben Datei sind erlaubt (z. B. `Panel`, `PersonCardBody`).
- Den Dialog durch eine eigene Route (`/agenda/:id/live`) ersetzen.
- Layout-Änderungen über den Panel-Umbau hinaus (z. B. ein Bühnen-Modus für Beamer).

## Decisions

### 1. Dialog bleibt, wird aber per eigener Klasse „unsichtbar“
Der `Dialog` bleibt erhalten (Fokusfalle, Scroll-Sperre, `onHide`, Mount-Logik). Er bekommt eine eigene Klasse, und an die Maske (`maskClassName`) kommt `live-meeting-mask`. In `index.css` kommen gezielte Overrides mit höherer Spezifität:

```css
.p-dialog.live-meeting-dialog { background: #b71c1c !important; border: none !important; box-shadow: none !important; border-radius: 0 !important; }
.p-dialog.live-meeting-dialog .p-dialog-content { background: transparent !important; padding: 0 !important; }
.live-meeting-mask { background-color: #b71c1c !important; }
```

Der `backgroundColor` in `contentStyle` fällt weg, Rot kommt aus dem Dialog selbst.
*Alternative:* die globale `.p-dialog`-Regel ändern. Verworfen, weil sie alle anderen Dialoge betrifft.
*Alternative:* ein eigenes Fullscreen-Overlay statt `Dialog`. Verworfen, weil Fokus- und Scroll-Handling neu gebaut werden müssten.

### 2. Panel-Baustein
Eine kleine lokale Komponente `Panel` (`className="comic-panel-dark p-3 sm:p-4"` plus optionaler Titelzeile mit Icon) ersetzt die heutigen gemischten Container (`bg-gray-900`, `border-yellow-...`, Tabellen-Rahmen). Alle Phasen verwenden ausschließlich diesen Baustein und die vorhandenen Button-Klassen (`comic-button`, `comic-button-secondary`, `comic-button-success`, `comic-button-warning`).
Der Inhalt sitzt in einem zentrierten Container (`max-width` ca. 1200px, `padding: 16px` mobil und 24px ab `md`). Die beiden dekorativen Blur-Kreise im `<main>` entfallen, weil sie auf Rot nur matschig wirken.

### 3. Kopfzeile als Pill
Die heutige `<header>`-Leiste mit Trennlinie wird zu einer Pill im Stil der Agenda-Aktionsleiste, mit Abstand oben (nicht randlos). Die Timer bekommen ein sichtbares Label (`TOP`, `Gesamt`) statt nur Icons. Auf dem Handy entfällt der Agenda-Titel, Label und Zeit bleiben. Der Schließen-Button nutzt dieselben runden Text-Buttons wie die Aktionsleiste. Testids bleiben: `item-timer-display`, `session-timer-display`, `paused-indicator`, `close-live-meeting-btn`.

### 4. Steuerung: Panel, mobil fest unten
Die Steuerung jeder Phase wird ein eigenes Panel. Ab `md` steht es am Ende des Inhalts. Unter `md` steht es `position: sticky; bottom: 16px` innerhalb des scrollenden `<main>`. *Sticky statt fixed*, weil es so im Scroll-Container bleibt und kein zusätzlicher Platzhalter nötig ist.
Mobile Anordnung in der TOP-Phase: Zeile 1 enthält „Abhaken & Weiter“ über die volle Breite. Zeile 2 enthält Icon-Buttons für Zurück, Überspringen und Pause, mit `title`/`aria-label`. Die Desktop-Anordnung bleibt in einer Zeile.

### 5. Markdown über den bestehenden Read-only-Editor
Die Beschreibung wird mit derselben Kombination wie in `AgendaTimeline` gerendert: `MDXEditor readOnly` mit den Read-only-Plugins, umschlossen von `.agenda-details-container`. Dafür wird `READONLY_PLUGINS` aus `AgendaTimeline.tsx` exportiert (oder in eine kleine gemeinsame Datei verschoben) statt dupliziert. Wichtig: `key={currentItem._id}` setzen, damit beim TOP-Wechsel neu gerendert wird (MDXEditor übernimmt `markdown`-Änderungen nicht automatisch).
*Alternative:* `react-markdown` als neue Abhängigkeit. Verworfen, weil MDXEditor schon im Bundle ist und die Darstellung dann identisch zur Agenda-Seite ist.

### 6. Deklination über einen Helper
Ein Helper `plural(count, singular, plural)` erzeugt „1 Punkt / n Punkte“ und „1 Stimme / n Stimmen“. Er wird in der Präsentation und im Markdown-Protokoll-Export der Präsentation verwendet, damit Bildschirm und Protokoll übereinstimmen.

### 7. Personenkarte ohne leere Felder
Roll-Call und Anwesenheitsübersicht rendern dieselbe Kartenstruktur heute doppelt. Beide nutzen künftig eine lokale `PersonCardBody`-Komponente. Sie lässt „E-Mail“ weg, wenn keine gesetzt ist, und „Zuletzt online“, wenn `lastSeen` fehlt oder ungültig ist. „Erstellte Punkte“ bleibt immer sichtbar.

## Risks / Trade-offs

- [Großer Diff in einer 2000-Zeilen-Datei, Konflikte mit parallelen Änderungen] → Phase für Phase umbauen und nach jeder Phase die betroffenen E2E-Tests laufen lassen.
- [E2E-Tests prüfen Texte, die sich ändern (z. B. „Stimmen“, Timer-Labels)] → Testids bleiben stabil. Textprüfungen werden gezielt angepasst, nicht entfernt.
- [MDXEditor ist pro Instanz schwer] → In der Präsentation gibt es immer nur eine Instanz (aktueller TOP). Das ist unkritisch.
- [Sticky-Footer kann auf iOS mit der Bildschirmtastatur kollidieren (Notizfeld)] → Beim Fokus im Notizfeld rückt die Steuerung mit dem Inhalt nach oben. Das wird im E2E-Test für `mobile-safari` geprüft. Falls es stört, wird die Steuerung bei offener Tastatur ausgeblendet.
- [Rot als Vollflächen-Hintergrund ist bei langen Sitzungen auf dem Beamer anstrengend] → Bewusst gewählt (Nutzerentscheidung). Der Inhalt liegt auf dunklen Panels, das Rot ist nur der Rahmen.
