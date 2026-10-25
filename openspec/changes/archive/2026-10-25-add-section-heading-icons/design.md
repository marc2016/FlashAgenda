# Design

## Context

Nach `collapsible-agenda-sections` hat jeder der vier Abschnitte eine Überschriftszeile: `h3` links, Klapp-Button rechts. Die Kacheln in den Details nutzen gelbe Icons (`text-yellow-500`, `text-xl sm:text-2xl`). Die Live-Anzeige nutzt bereits `mdi`-Klassen.

## Goals / Non-Goals

**Goals:**
- Einheitliche Icons vor allen vier Überschriften, ohne die `h3` und ihre Test-Anker zu verändern.

**Non-Goals:**
- Icons an anderen Überschriften (Dialoge, Präsentation).
- Ein gemeinsamer Überschriften-Baustein für alle Abschnitte. Das wäre ein eigener Umbau.

## Decisions

### 1. Icon neben, nicht in der `h3`
Das Icon steht als `<i className="mdi mdi-… text-yellow-500 text-xl sm:text-2xl" aria-hidden="true" />` vor der `h3`. Beide stecken in einem `flex align-items-center gap-2`-Container links in der Überschriftszeile.
*Alternative:* Icon innerhalb der `h3`. Verworfen, weil `h3:has-text(...)` und Barrierefreiheit unberührt bleiben sollen.

### 2. Icon-Auswahl
`card-text-outline` (Details: Infos/Steckbrief), `account-group` (Personen), `trophy` (Erfolge/Pokale), `format-list-checks` (Agendapunkte: abhakbare Liste). Alle sind in der installierten `@mdi/font`-Version vorhanden. Die Icons tragen `text-yellow-500` wie die Kachel-Icons; im Projekt wird diese Farbe überschrieben, sodass Icons, Kachel-Icons und Überschriften einheitlich weiß erscheinen. Das ist bewusst so belassen, damit die Seite einheitlich bleibt.

### 3. Schatten wie die Überschrift
Die Icons bekommen denselben harten Comic-Schatten wie die `h3` (`textShadow: '2px 2px 0px #000'`), damit Icon und Text als eine Einheit wirken.

### 4. Größe passend zur Überschrift
Details, Personen und Erfolge nutzen `text-xl sm:text-2xl` für die `h3`, Agendapunkte `text-2xl`. Das Icon übernimmt jeweils dieselbe Größe.

## Risks / Trade-offs

- [Konflikt mit nicht archiviertem Vorgänger-Change] → Erst `collapsible-agenda-sections` abschließen und archivieren, danach diesen Change umsetzen. Die Aufgaben setzen das voraus.
