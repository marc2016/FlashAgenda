# Design

## Context

- `isArchived` gibt es schon im Modell. Archivierte Agenden sind serverseitig schreibgeschützt: `PUT /api/agendas/:id` und die Routen für Personen und Punkte antworten mit 403. Umschalten kann bisher nur `PUT /api/admin/agendas/:id/archive` (Admin-Token).
- Auf der Startseite wird ein Archiv-Status schon ausgewertet: `getAgendaStatus` macht archivierte Agenden zu `completed`, und die Kachel zeigt ein Archiv-Icon. Tabs, Sortierung und Zähler kommen in `AgendaOverview` aus `getAgendaStatus`. Damit ordnet sich eine umgeschaltete Agenda von selbst richtig ein, sobald `isArchived` im State stimmt.
- Wer verwalten darf, prüft `PUT /:id` heute inline: `userId`/`userName` aus dem Body werden mit `createdBy` oder der ersten Person verglichen. Andere Identitätsnachweise (Code, Token) prüft der Server dabei nicht.
- `AgendaOverviewCard` ist komplett ein `<button>`. Ein Button darin wäre ungültiges HTML.
- `toAgendaSummary` liefert kein `createdBy`.

## Goals / Non-Goals

**Goals:**
- Für die Berechtigung gilt im Frontend und im Backend dieselbe Regel wie beim Schließen einer Agenda.
- Die Übersicht aktualisiert sich nach dem Umschalten ohne erneuten Abruf.

**Non-Goals:**
- Die Identitätsprüfung im Backend wird nicht verschärft (kein Abgleich von Code oder Passkey). Das ist ein eigenes Thema und betrifft alle Schreibrouten.
- Kein Archiv-Knopf auf der Agenda-Seite, kein eigener Archiv-Tab.
- Keine Live-Benachrichtigung anderer Clients per Socket.
- Die Admin-Route bleibt, wie sie ist.

## Decisions

**1. Eigene Route `PUT /api/agendas/:id/archive` mit Body `{ archived: boolean, userId, userName }`.**
Der Server setzt den Wert explizit, statt ihn umzuschalten. So kippt ein doppelter Klick oder ein Retry den Status nicht wieder zurück. Gewählt statt eines Felds in `PUT /:id`, weil diese Route bei archivierten Agenden mit 403 abbricht, bevor irgendetwas geprüft wird; das Wiederherstellen würde dort nicht funktionieren. Antworten: 400 bei ungültiger ID oder wenn `archived` kein Boolean ist, 404, 403 ohne Verwaltungsrecht, 200 mit der Zusammenfassung (`toAgendaSummary`) der geänderten Agenda. Audit-Log über `logAudit` mit `AGENDA_ARCHIVED`/`AGENDA_UNARCHIVED` und dem Namen der Person. Ist der Status schon so gesetzt: 200 ohne Audit-Eintrag.

**2. Hilfsfunktion `canManageAgenda(agenda, userId, userName)`.**
Die Inline-Prüfung aus `PUT /:id` wird in eine exportierte Funktion verschoben und an beiden Stellen genutzt, damit sich die Regeln nicht auseinanderentwickeln. Wie bisher: Hat die Agenda kein `createdBy`, gilt nur die erste Person. *Abweichung:* `PUT /:id` lässt Änderungen heute ohne Prüfung zu, wenn `createdBy` fehlt. Für das Archivieren ist das zu offen. Dort verlangt die Funktion, dass die anfragende Person der ersten Person entspricht. Am Verhalten von `PUT /:id` ändert sich nichts.

**3. Gleiche Regel im Frontend.**
Eine Funktion `canManageAgenda(summary, user)` in `utils/agendaOverview.ts` vergleicht `user.id`/`user.name` mit `createdBy` und `attendees[0]` (ID oder Name ohne Rücksicht auf Groß-/Kleinschreibung). Dafür kommt `createdBy` in `toAgendaSummary` und `AgendaSummary`. Den Ersteller (eine ID oder einen Namen) mitzuliefern verrät nichts: Die Namen der Personen stehen ohnehin schon in der Antwort.
*Alternative:* Ein vom Server berechnetes `canManage`. Verworfen, weil `/user-agendas` die Identität nur aus Query-Parametern kennt. Das ergäbe nichts Verlässlicheres als die Prüfung im Client, und die eigentliche Absicherung macht ohnehin die Archiv-Route.

**4. Aufbau der Kachel.**
Der äußere Container wird ein `<div>` mit `role="link"` bzw. Klick-Handler, `tabIndex=0` und Enter/Leertaste zum Öffnen. Darauf liegt der Archiv-Knopf als echtes `<button>` mit `stopPropagation`. *Alternative:* Ein Overlay-Button über dem Kachel-Button als Geschwister-Element. Verworfen, weil Fokusreihenfolge und Positionierung fummeliger werden. Der Knopf ist ein kleiner Icon-Button oben rechts neben Archiv- und Schloss-Icon (`pi pi-inbox` zum Archivieren, `pi pi-replay` zum Wiederherstellen), mit `aria-label`/`title` „Archivieren“ bzw. „Wiederherstellen“ und `data-testid="agenda-card-archive-toggle"`. Weil ein Tipp genügt und man sich jederzeit umentscheiden kann, gibt es keinen Bestätigungsdialog.

**5. Zustand in der Übersicht.**
`AgendaOverview` bekommt `currentUser` und `onToggleArchive(id, archived)`. Home übernimmt die Antwort der Route und ersetzt damit den Eintrag in `myAgendas`. Status, Tab und Zähler leiten sich daraus neu ab. Solange die Anfrage läuft, ist der Knopf gesperrt (gegen Doppelklicks). Im Fehlerfall bleibt der State unverändert und die Fehlermeldung kommt per `alert` wie auf der Admin-Seite (die Startseite hat keinen Toast). Im aktiven Tab „Anstehend“ verschwindet die Kachel damit sofort.

## Risks / Trade-offs

- [Die Identität stammt nur aus dem Body (`userId`/`userName`); wer einen Namen fälscht, kann archivieren] → Das ist dieselbe Schwachstelle wie beim Schließen und als Non-Goal ausgeklammert. Das Archivieren lässt sich jederzeit rückgängig machen, und das Audit-Log hält es fest.
- [Eine Kachel verschwindet sofort aus „Anstehend“ und man verliert sie aus dem Blick] → Der Zähler von „Abgeschlossen“ steigt sichtbar, dort ist sie mit „Wiederherstellen“ erreichbar.
- [Umbau des Kachel-Buttons zu einem `div` kann bestehende E2E-Tests treffen (Klick auf Karte, Mini-Karte)] → `data-testid="agenda-card"` und das Öffnen per Klick bleiben erhalten. Die bestehenden Tests in `home.spec.ts` laufen mit.

## Migration Plan

Keine Datenmigration. Backend und Frontend werden zusammen ausgeliefert. Ein altes Frontend ignoriert `createdBy` einfach. Rollback durch Zurücksetzen des Releases. Bereits archivierte Agenden bleiben archiviert.
