# Design

## Context

Der Dialog „Neue Agenda erstellen“ steckt heute komplett in `AgendaHeader.tsx`:
- Zustand: `showCreateModal`, `selectedAttendeeKeys`, `selectedItemKeys`, `isCreatingNew`, `newIncludeStandardItems`
- Logik: `getCopyableItems`, `openCreateModal`, die beiden Toggle-Helfer und `handleConfirmCreateNew`
- rund 150 Zeilen JSX

`openCreateModal` belegt die Auswahl vor: alle Personen, gepinnte Punkte (ohne `systemKey`-Punkte), `includeStandardItems` der Agenda. `handleConfirmCreateNew` sendet `POST /api/agendas`, setzt `localStorage flashagenda_created_<id>` und öffnet die neue Agenda mit `window.open(..., '_blank')`.

`LiveMeetingModal` arbeitet mit lokalen Kopien `localItems` und `localAttendees`, die Pin-Änderungen sofort enthalten. Das Abschluss-Panel enthält die Protokoll-Buttons und „Zurück zur Agenda“ / „Sitzung endgültig abschließen“.

## Goals / Non-Goals

**Goals:**
- Eine einzige Implementierung des Dialogs für beide Einstiegspunkte.

**Non-Goals:**
- Inhaltliche Änderungen am Dialog (Texte, Vorauswahl, Optik).
- Personen nach Anwesenheit vorauswählen. Bewusst nicht gemacht, weil die bestehende Funktion alle Personen übernimmt.
- Die Sitzung beim Anlegen automatisch abschließen.

## Decisions

### 1. Dialog als eigene Komponente `CreateFollowUpAgendaDialog`
Neue Datei `frontend/src/components/CreateFollowUpAgendaDialog.tsx` mit den Props `visible`, `onHide`, `agenda` (Titel, `attendees`, `items`, `includeStandardItems`) und `currentUser`. Zustand und Logik ziehen 1:1 aus `AgendaHeader` um. Die Vorauswahl aus `openCreateModal` läuft in einem `useEffect`, sobald `visible` auf `true` wechselt. So bekommt jeder Aufruf frische Daten.
`AgendaHeader` behält nur `const [showCreateModal, setShowCreateModal]` und rendert `<CreateFollowUpAgendaDialog visible={showCreateModal} ... agenda={agenda} />`.
*Alternative:* Den Dialog in `LiveMeetingModal` kopieren. Verworfen, weil zwei Kopien auseinanderlaufen würden.
*Alternative:* `AgendaHeader` öffnet den Dialog über einen Callback aus der Präsentation. Verworfen, weil die Präsentation dann von `AgendaDetail` verdrahtet werden müsste und der Dialog den lokalen Präsentationsstand nicht kennt.

### 2. Präsentation übergibt ihren lokalen Stand
`LiveMeetingModal` rendert den Dialog mit `agenda={{ ...agenda, items: localItems, attendees: localAttendees }}`. Damit sind Pins aus der Sitzung schon berücksichtigt (Szenario „Während der Sitzung angepinnter Punkt“), auch wenn der Server-Stand noch nicht zurück ist.

### 3. Button im Abschluss-Panel
Im Aktions-Panel des Abschluss-Screens kommt neben die Protokoll-Buttons ein `comic-button-secondary` „Neue Agenda vorbereiten“ mit `pi pi-plus-circle` und `data-testid="create-follow-up-agenda-btn"`. Die Haupt-Buttons darunter bleiben unverändert.

### 4. Gestapelte Dialoge
Der Dialog wird innerhalb des maximierten Präsentations-Dialogs geöffnet, wie schon der „Alle TOPs“-Dialog. PrimeReact stapelt die z-Indizes automatisch. Der neue Dialog behält `className="glass-panel"` und damit seine normale Optik, nicht das Präsentations-Rot. Das garantieren die gezielten `.live-meeting-dialog`-Selektoren aus dem letzten Change.

## Risks / Trade-offs

- [`window.open` nach einem `await fetch` kann von Popup-Blockern (vor allem Safari/iOS) blockiert werden] → Das Verhalten ist bewusst unverändert übernommen, das Risiko besteht schon heute in der Aktionsleiste. Bei Bedarf eigener Change, z. B. ein Link „Neue Agenda öffnen“ im Dialog nach dem Anlegen.
- [Beim Umzug könnte sich das Verhalten der Aktionsleiste unbemerkt ändern] → Der bestehende Test in `agenda-interactions.spec.ts` läuft weiter, und ein neuer Test prüft Vorauswahl und gesendeten Payload über die Aktionsleiste.
