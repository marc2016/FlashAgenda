# Design

## Context

- `Home.tsx` lädt `GET /api/agendas/user-agendas` und rendert eine schmale Liste (`max-w-28rem`, `max-h-18rem` mit internem Scroll). Genutzt werden nur `_id`, `title`, `attendees.length` und `items.length`.
- Die Route in `backend/src/routes/agenda.ts` liefert komplette Mongoose-Dokumente (bis zu 100 plus TOTP-Treffer), also mit `attendees[].securityCode/secretGuid`, `items[].comments`, `auditLogs`.
- `agenda.date` ist ein ISO-Zeitstempel inklusive Uhrzeit. `agenda.location = { name, lat, lng }`.
- Leaflet wird bereits in `AgendaHeader.tsx` genutzt (`react-leaflet`, OSM-Tiles, `leaflet.css` global in `index.css`). Dort steht auch der Fix für die Marker-Icons (`L.Icon.Default.mergeOptions`).
- Die Annahmeschluss-Logik (`isClosed`) steht in `AgendaTimeline.tsx` als `useMemo`: `isManuallyClosed`, sonst `now > date - closeBeforeHours` (Default 12).
- `PersonChip` und `getPersonGradient` stehen für Personen-Chips mit Farbe bereit.
- Viele E2E-Specs mocken `user-agendas` mit vollen Agenda-Objekten oder `[]`.

## Goals / Non-Goals

**Goals:**
- Statuslogik, Sortierung und Annahmeschluss als reine Funktionen, die sich ohne Browser testen lassen.
- Die Annahmeschluss-Regel gibt es nur einmal und sie wird von Agenda-Seite und Startseite geteilt.
- Flüssig auch bei vielen Agenden auf dem Handy.

**Non-Goals:**
- Pagination oder Suche.
- Live-Aktualisierung der Startseite per Socket.io. Neu geladen wird beim Öffnen der Seite.
- Gemerkter Tab. Entschieden ist: immer „Anstehend“ beim Start.
- Änderungen an der Suchlogik von `/user-agendas`.

## Decisions

### 1. Zusammenfassung im Backend per Mapping
Die Route behält die Suche, gibt aber jedes Dokument über eine Funktion `toAgendaSummary(agenda)` zurück:

```
{ _id, title, date, time, location, isArchived, isManuallyClosed, closeBeforeHours,
  liveMeetingActive, liveMeetingStatus, updatedAt,
  itemCount, completedCount,
  attendees: [{ id, name, cardColor, avatarUrl }] }
```

Dafür wird `.lean()` verwendet. Die TOTP-Suche braucht `secretGuid` weiterhin intern, das Mapping entfernt es erst vor der Antwort.
*Alternative:* Mongo-Projektion (`select`). Verworfen, weil die Zähler (`completedCount`) ohnehin berechnet werden müssen und die TOTP-Prüfung die Geheimnisse braucht. Eine Aggregation wäre für ≤ 100 Dokumente unnötig komplex.

### 2. Reine Hilfsfunktionen im Frontend
Neue Datei `frontend/src/utils/agendaOverview.ts`:
- `getAgendaStatus(a, now)`: liefert `'live' | 'completed' | 'upcoming'`. LIVE gilt bei `liveMeetingStatus === 'in_progress'` (oder `liveMeetingActive`). ABGESCHLOSSEN gilt bei `liveMeetingStatus === 'completed'`, wenn `date < now` oder bei `isArchived`.
- `sortAgendas(list, now)`: die Reihenfolge aus der Spec.
- `isAgendaClosedForItems(a, now)`: aus `AgendaTimeline.tsx` herausgezogen. `AgendaTimeline` ruft sie danach ebenfalls auf, damit es die Regel nur einmal gibt.

`now` wird als Parameter übergeben, damit Tests einen festen Zeitpunkt nutzen können.

### 3. Komponenten
- `AgendaOverviewCard.tsx`: eine Kachel, `<button>`- bzw. Link-Semantik, `data-testid="agenda-card"`, Status-Badge `data-testid="agenda-status"`.
- `AgendaMiniMap.tsx`: Leaflet-Karte mit `dragging`, `touchZoom`, `scrollWheelZoom`, `doubleClickZoom`, `boxZoom` und `keyboard` auf `false`, `zoomControl={false}`, Zoom 15. Der Wrapper bekommt `pointer-events: none`, damit Klicks an die Kachel gehen. Die Attribution bleibt sichtbar (klein, per CSS).
- `Home.tsx`: Tabs, Grid und leerer Zustand. Das Grid nutzt CSS Grid mit festen Breakpoints (`1fr` / `repeat(2, 1fr)` ab 640 px / `repeat(3, 1fr)` ab 1024 px), damit es genau „3 Spalten auf dem Desktop“ sind. `auto-fill` würde auf sehr breiten Bildschirmen 4 oder mehr Spalten erzeugen. Die maximale Breite liegt bei etwa 72rem.
- Tabs: eigene Comic-Buttons im Stil der bestehenden Button-Gruppen, nicht `TabView`, weil kein Panel-Wechsel nötig ist, nur ein Filter.

### 4. Marker-Icon-Fix zentralisieren
Der `L.Icon.Default`-Fix aus `AgendaHeader.tsx` wandert nach `frontend/src/utils/leafletSetup.ts` (Seiteneffekt-Import). Sowohl `AgendaHeader` als auch `AgendaMiniMap` importieren ihn.
*Alternative:* eigener gelber `divIcon`-Pin. Das ist optional und kann später kommen. Der Standard-Marker reicht für den Start.

### 5. Lazy-Mount der Karten
`AgendaMiniMap` rendert die `MapContainer` erst, wenn der Platzhalter per `IntersectionObserver` sichtbar wird (`rootMargin` von etwa 200 px). Danach bleibt sie gemountet. Ohne `IntersectionObserver` (alte Browser) wird sofort gerendert.
*Alternative:* alle Karten sofort rendern. Verworfen, weil 30 oder mehr Leaflet-Instanzen auf dem Handy spürbar ruckeln und viele Tiles laden.

### 6. Relativzeit
Die Relativzeit kommt von `formatDistanceToNow` aus `date-fns` mit Locale `de` und `addSuffix` („in 4 Tagen“, „vor 2 Wochen“). Das Datum wird als `EEE dd.MM. HH:mm` formatiert.

## Risks / Trade-offs

- [E2E-Mocks liefern volle Agenda-Objekte ohne `itemCount`/`completedCount`] → Die Kachel fällt auf `items.length` bzw. `items.filter(completed)` zurück, wenn die Zähler fehlen. Dann bleiben bestehende Mocks gültig und nur `home.spec.ts` braucht neue Fälle.
- [OSM-Tile-Policy bei vielen Kacheln] → Lazy-Mount, Zoom fest und keine Interaktion halten die Tile-Anzahl klein (meist 4–6 Tiles je Karte). Die Attribution bleibt sichtbar.
- [Leaflet in einem Container, der beim Mount 0 px breit ist] → Die Karte hat eine feste Höhe, und `invalidateSize()` läuft einmal nach dem Mount.
- [Unterschied zwischen `liveMeetingActive` und `liveMeetingStatus`] → LIVE gilt, wenn eins von beiden „läuft“ sagt. Ein beendeter Status hat Vorrang vor dem Datum.
- [API-Änderung bricht externe Nutzer] → Es gibt außer `Home.tsx` keine bekannten Nutzer. Das Admin-Panel nutzt eigene Routen.

## Migration Plan

Backend und Frontend werden gemeinsam deployt (gleiches Release). Für einen Rollback reicht der vorherige Release. Datenbankänderungen gibt es keine.
