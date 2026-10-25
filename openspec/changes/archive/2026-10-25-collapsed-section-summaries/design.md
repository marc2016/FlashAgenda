# Design

## Context

Jede Überschriftszeile ist ein Flex-Container `justify-content-between`: links die klickbare Gruppe aus Icon und `h3` (`data-testid="section-heading-<id>"`), rechts der `SectionCollapseToggle`. Der Klapp-Zustand kommt aus `useCollapsedSection`. Datenquellen:
- `AgendaHeader`: `agenda.date` (ISO), `agenda.location?.name`. `date-fns` ist eingebunden (`parseISO`).
- `AgendaAttendees`: `attendees.length`.
- `AgendaAchievementBanner`: `data.personalAchievements` mit `unlocked`. Rendert `null`, solange keine Daten da sind.

## Goals / Non-Goals

**Goals:**
- Eine einheitlich dezente Zusammenfassung für drei Abschnitte, nur im eingeklappten Zustand.

**Non-Goals:**
- Änderungen an den Agendapunkten.
- Zusammenfassung im ausgeklappten Zustand oder als Tooltip.

## Decisions

### 1. Gemeinsamer Baustein `SectionSummary`
Kleine Komponente `frontend/src/components/SectionSummary.tsx`: `<span className="text-xs sm:text-sm text-gray-400 font-normal white-space-nowrap overflow-hidden text-overflow-ellipsis flex-1" style={{ minWidth: '5.5rem' }} data-testid="section-summary-<id>" title={text}>{text}</span>`. Ohne Rahmen, ohne Hintergrund, ohne Schatten. Der `title` zeigt den vollen Text, wenn er gekürzt ist.
Die Mindestbreite von 5.5rem verhindert, dass die Zusammenfassung auf schmalen Bildschirmen auf 0 schrumpft (bei „Agenda-Erfolge & Wanderpokale“ nimmt sonst der umbrechende Titel den ganzen Platz ein). Die PrimeFlex-Klasse `min-w-0` wird bewusst nicht verwendet, weil sie `min-width: 0 !important` setzt und die Mindestbreite überschreiben würde.

### 2. Platzierung
Die Zusammenfassung sitzt in der Überschriftszeile direkt rechts neben der klickbaren Gruppe und erst bei `collapsed`. Die Zeile wird dafür zu `[Gruppe (flex-shrink-0)] [Summary (flex-1 min-w-0)] [Toggle (flex-shrink-0)]`. So kürzt bei Platzmangel nur die Zusammenfassung. Sie liegt außerhalb der klickbaren Gruppe, damit `h3:has-text(...)` und das Klick-Ziel unverändert bleiben. Ein Klick auf die Zusammenfassung klappt nichts.
Bei „Agenda-Erfolge & Wanderpokale“ darf auf schmalen Bildschirmen weiterhin der Titel umbrechen (`min-w-0` an der Gruppe). Die Zusammenfassung bekommt dort den verbleibenden Platz und wird gekürzt.

### 3. Texte
- **Details:** `format(parseISO(agenda.date), 'dd.MM.yyyy · HH:mm')` und `agenda.location?.name`, verbunden mit „ · “. Ohne beides: „Noch keine Details“.
- **Personen:** `${n} ${n === 1 ? 'Person' : 'Personen'}`.
- **Erfolge:** `${unlocked} von ${total} Erfolgen` aus `data.personalAchievements`.

## Risks / Trade-offs

- [Auf sehr schmalen Bildschirmen bleibt vom Ort wenig übrig] → Gekürzt mit „…“, der volle Text steht im `title`. Ein Antippen klappt den Abschnitt ohnehin auf.
- [Abhängigkeit von `clickable-section-headings`] → Erst nach dessen Archivierung umsetzen. Aufgabe 1.1 prüft das.
