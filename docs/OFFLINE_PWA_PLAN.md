# Implementierungsplan: Offline-Funktionalität (PWA & Offline-Sync-Queue)

Dieses Dokument beschreibt die geplante Offline-Erweiterung für FlashAgenda als Progressive Web App (PWA) mit automatischer Hintergrund-Synchronisation.

---

## 1. Übersicht & Zielsetzung

Nutzer sollen FlashAgenda auf mobilen Geräten (iOS/Android) und Desktop als eigenständige App installieren können.
Die App soll auch ohne Internetverbindung voll funktionsfähig sein:
- **Lesen**: Bereits geladene Agenden, Teilnehmer und Agendapunkte sind offline sofort sichtbar.
- **Schreiben**: Neue Punkte erstellen, abhaken oder bearbeiten ist offline möglich.
- **Sync**: Bei Wiederherstellung der Netzwerkverbindung erfolgt eine automatische Synchronisation aller Änderungen im Hintergrund.

---

## 2. Technische Architektur

### A) Vite PWA & Service Worker (`vite-plugin-pwa`)
- Automatische Service-Worker-Generierung via Workbox.
- **Static Asset Caching (`CacheFirst`)**: HTML, JS, CSS, Webfonts (Luckiest Guy, Inter) und Icons werden lokal auf dem Gerät vorgehalten.
- **Web App Manifest (`manifest.webmanifest`)**:
  - Name: `FlashAgenda`
  - Theme Color: `#b71c1c` (Comic-Rot)
  - Display Mode: `standalone` (Vollbild ohne Browser-Leiste)
  - Icons: 192x192, 512x512, Maskable Icons.

### B) Offline Data Persistence (`localStorage`)
- Jedes Mal, wenn eine Agenda geladen oder aktualisiert wird, speichert das Frontend die Daten unter `flashagenda_cache_<agendaId>`.
- Wenn `navigator.onLine === false` oder Netzwerkanfragen fehlschlagen, liest die App nahtlos aus diesem Speicher.

### C) Offline Mutation Queue & Background Auto-Sync
- **Optimistic UI**: Beim Erstellen/Bearbeiten offline wird der UI-Zustand sofort aktualisiert.
- **Aktions-Warteschlange (`flashagenda_offline_queue`)**:
  - Aktionen wie `ADD_ITEM`, `TOGGLE_COMPLETED`, `UPVOTE` werden lokal als Queue-Einträge abgelegt.
  - Jedes Item besitzt eine eindeutige UUID (`uuidv4()`), wodurch ID-Kollisionen ausgeschlossen sind.
- **Automatische Synchronisation**:
  - Event-Listener `window.addEventListener('online', ...)` verarbeitet ausstehende Aktionen nacheinander, sobald wieder Empfang besteht.
  - UI-Statusanzeige: *"Offline-Modus: X Änderung(en) ausstehend"* bzw. *"Synchronisiert"*.

---

## 3. Geplante Schritte bei der Umsetzung

1. **Dependencies & Vite-Plugin**: `vite-plugin-pwa` in `frontend/package.json` und `vite.config.ts` integrieren.
2. **PWA Assets**: App-Icons und Manifest in `frontend/public/` anlegen.
3. **Sync Service (`src/services/offlineSync.ts`)**: Hilfsmodul für Queue-Management & Online-Event-Handling schreiben.
4. **Integration in `AgendaDetail.tsx`**: LocalStorage-Caching, Queue-Anbindung und Offline-Banner hinzufügen.
5. **Verifikation**: Testen des Offline-Verhaltens via Chrome DevTools (Network Offline Mode).
