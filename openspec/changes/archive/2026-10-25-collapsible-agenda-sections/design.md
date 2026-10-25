# Design

## Context

Die Abschnitte gehören zu vier Komponenten, die `AgendaDetail.tsx` nacheinander rendert (getrennt durch `border-top-1`-Linien):
- `AgendaHeader`: Titelzeile, danach der Block `{/* Layout: Boxen oben/links, Karte unten/rechts */}` mit Kacheln und Karte, keine Überschrift
- `AgendaAttendees`: `h3` „Personen“ in einer Flex-Zeile, darunter die Karten
- `AgendaAchievementBanner`: `h3` „Agenda-Erfolge & Wanderpokale“; rendert `null`, solange keine Daten da sind
- `AgendaTimeline`: Kopfzeile mit `h3` „Agendapunkte“, Fortschritts-Badge und Sortier-Buttons, darunter die Timeline

Für andere Vorlieben nutzt das Projekt `localStorage` mit dem Präfix `flashagenda_` (z. B. `flashagenda_pwa_banner_dismissed`). Mehrere E2E-Tests nutzen `h3:has-text("Personen")` und `h3:has-text("Agendapunkte")` als Anker.

## Goals / Non-Goals

**Goals:**
- Eine gemeinsame Logik und ein gemeinsamer Button für alle vier Abschnitte.
- Bestehende `h3`-Überschriften und Test-Anker bleiben unverändert.

**Non-Goals:**
- Klapp-Animationen.
- Zustand pro Agenda oder serverseitig gespeichert. Entschieden ist ein Zustand für alle Agenden im Browser.
- Einklappen in der Präsentationsansicht.

## Decisions

### 1. Hook `useCollapsedSection(sectionId)`
Neue Datei `frontend/src/hooks/useCollapsedSection.ts`. Sie gibt `[collapsed, toggle]` zurück. Alle Abschnitte teilen sich einen `localStorage`-Schlüssel `flashagenda_collapsed_sections` mit einem Objekt `{ details?: boolean, attendees?: boolean, achievements?: boolean, items?: boolean }`. Lesen und Schreiben stehen in `try/catch`. Bei Fehlern oder ungültigem JSON gilt `{}`, also alles ausgeklappt.
*Alternative:* ein Schlüssel pro Abschnitt. Verworfen, weil ein Objekt leichter zu überblicken und zu testen ist und sich später gut erweitern lässt.

### 2. Gemeinsamer Button `SectionCollapseToggle`
Kleine Komponente (z. B. in `frontend/src/components/SectionCollapseToggle.tsx`): PrimeReact `Button` mit `rounded text`, Icon `pi pi-chevron-down` bzw. `pi pi-chevron-right`, `aria-expanded`, `aria-label` („Personen einklappen“ / „Personen ausklappen“) und `data-testid="collapse-toggle-<sectionId>"`. Optisch passt er zum Stift-Button neben dem Titel (grau, gelb beim Hover). Der Button sitzt rechtsbündig am Ende der Überschriftszeile; die `h3` selbst bleibt unverändert.
*Alternative:* die ganze Überschrift klickbar machen. Verworfen, weil in den Kopfzeilen weitere Buttons stehen (z. B. Sortieren) und ein klickbarer Text schwerer zu erkennen ist.

### 3. Einbau je Abschnitt
- **Details:** In `AgendaHeader` kommt zwischen Titelzeile und Kachel-Block eine neue Zeile mit `h3` „Details“ (links) und Button (rechts) im Stil der anderen Überschriften. Der Kachel- und Karten-Block wird nur gerendert, wenn der Abschnitt ausgeklappt ist. Die Edit-Dialoge bleiben außerhalb und funktionieren weiter.
- **Personen:** Button rechts in der bestehenden Kopfzeile; die Karten-Liste wird bei `collapsed` nicht gerendert.
- **Erfolge:** Button rechts in der Kopfzeile; alles unterhalb der Kopfzeile wird bei `collapsed` nicht gerendert. Rendert der Banner `null`, gibt es auch keinen Button.
- **Agendapunkte:** Die bestehende Kopfzeile wird in eine Zeile mit dem Button ganz rechts gefasst (auch rechts neben den Sortier-Buttons); Fortschritts-Badge und „Sitzung starten“ bleiben; Sortier-Buttons, Hinweis „Agenda ist geschlossen“ und Timeline werden bei `collapsed` nicht gerendert. Dialoge (z. B. Punkt bearbeiten) bleiben gemountet.

Nicht rendern statt per CSS ausblenden: So spart die Seite eingeklappt auch die Arbeit (z. B. die Leaflet-Karte), und `toBeVisible`-Prüfungen in Tests sind eindeutig.

### 4. Kompakter eingeklappter Zustand
Eingeklappt setzen Abschnitt und Überschriftszeile ihren unteren Abstand auf 0. Die Trennlinien zwischen den Abschnitten in `AgendaDetail.tsx` sind von `my-6` (48 px) auf `my-3 sm:my-4` verkleinert; ausgeklappt bringen die Abschnitte ihren eigenen unteren Abstand mit. Eingeklappt ist ein Abschnitt so auf dem Desktop rund 85 px hoch.

### 5. Kein Abgleich zwischen Tabs
Jede Komponente liest den Zustand beim Mounten. Änderungen in einem anderen Tab wirken erst nach dem Neuladen. Das reicht für eine Ansichts-Vorliebe.

## Risks / Trade-offs

- [Die Karte wird beim Ausklappen neu gemountet und lädt die Kacheln erneut] → Akzeptiert, das passiert selten und geht schnell.
- [Bestehende E2E-Tests könnten auf einen eingeklappten Zustand treffen, wenn ein vorheriger Test ihn gespeichert hat] → Playwright startet jeden Test mit einem frischen Browser-Kontext und leerem `localStorage`, also gilt der Standard „ausgeklappt“.
- [Die neue Überschrift „Details“ verändert die Optik unter dem Titel] → Bewusst gewählt, damit der Klapp-Button einen Ort hat. Die Zeile ist klein und im Stil der anderen Überschriften gehalten.
