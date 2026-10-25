# Design

## Context

Jede Abschnitts-Überschrift besteht aus einer Gruppe `div.flex.align-items-center.gap-2` mit Icon (`<i className="mdi …" aria-hidden="true" />`) und `h3`, dazu rechts der `SectionCollapseToggle` (Pfeil-Button, `aria-expanded`, `data-testid="collapse-toggle-<id>"`). Den Zustand liefert der Hook `useCollapsedSection`, jeder Abschnitt hat schon eine `toggle`-Funktion. Bei den Agendapunkten liegen in derselben Zeile zusätzlich das Zähler-Badge und „Sitzung starten“, daneben die Sortier-Buttons.

Im ursprünglichen Design von `collapsible-agenda-sections` war eine klickbare Überschrift verworfen worden, wegen der weiteren Buttons in der Zeile. Das löst die Begrenzung auf die Gruppe aus Icon und Text.

## Goals / Non-Goals

**Goals:**
- Klickfläche = Icon + Überschriftentext, gleiche Wirkung wie der Pfeil.

**Non-Goals:**
- Die ganze Überschriftszeile klickbar machen. Dort liegen andere Buttons.
- Tastatur-Bedienung über die Überschrift. Das macht weiterhin der Pfeil-Button, der schon fokussierbar ist und `aria-expanded` meldet.

## Decisions

### 1. `onClick` auf der Icon-Text-Gruppe
Die bestehende Gruppe bekommt `onClick={toggle}` und die Klassen `cursor-pointer select-none`. Die `h3` bleibt unverändert, damit `h3:has-text(...)` und die Überschriften-Semantik erhalten bleiben. Die Gruppe bekommt `data-testid="section-heading-<id>"` für Tests.
*Alternative:* die `h3` in einen `<button>` stecken. Verworfen, weil das die Überschriften-Struktur und die Test-Anker ändert und es dann zwei fokussierbare Buttons pro Abschnitt gäbe.

### 2. Kein zweiter Tastatur-Stopp
Die Gruppe bekommt weder `tabIndex` noch `role="button"`. Für Tastatur und Screenreader ist der Pfeil-Button die einzige, eindeutig beschriftete Bedienung („Personen einklappen“). Der Klick auf die Überschrift ist eine Abkürzung für Maus und Touch.

### 3. Agendapunkte: nur Icon und „Agendapunkte“
In `AgendaTimeline` umfasst die klickbare Gruppe nur Icon und `h3`. Badge und „Sitzung starten“ liegen außerhalb und lösen kein Klappen aus.

## Risks / Trade-offs

- [Versehentliches Einklappen beim Antippen der Überschrift auf dem Handy] → Akzeptiert, weil es mit einem zweiten Tipp sofort rückgängig ist und der Zustand sichtbar am Pfeil steht.
- [Abhängigkeit von `add-section-heading-icons`] → Erst nach dessen Archivierung umsetzen. Aufgabe 1.1 prüft das.
