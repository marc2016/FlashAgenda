<p align="center">
  <img src="docs/images/logo.png" alt="FlashAgenda" width="200">
</p>

<p align="center">
  FlashAgenda ist eine moderne Web-Anwendung zur einfachen Erstellung, Verwaltung und interaktiven Anzeige von Agenden, Zeitplänen und Event-Programmen.
</p>

---

## 🚀 Features

- **Interaktiver Zeitplan & Agenda-Ansicht**: Übersichtliche Darstellung aller Punkte/Sessions mit Zeitangaben, Beschreibungen und Referenten/Teilnehmern.
- **Standort & Kartenintegration**: Erfassung von Veranstaltungsorten inklusive interaktiver Karte (Leaflet / OpenStreetMap).
- **Rich-Text & MDX-Notizen**: Editor zur Erstellung formatierter Beschreibungen und Notizen.
- **Teilen per QR-Code & Link**: Schnelle Freigabe und Abruf von Agenden für Mobilgeräte und Besucher.
- **Modernes UI / Responsive Design**: Basierend auf PrimeReact & PrimeFlex.

---

## 📸 Screenshots

### Agenda mit Details, Karte und Personen

![Agenda-Ansicht mit Details, Karte und Personen](docs/images/agenda.png)

### Eingeklappte Abschnitte mit Zusammenfassung und Agendapunkte

![Eingeklappte Abschnitte und Liste der Agendapunkte](docs/images/agenda-items.png)

### Live-Sitzung (Präsentation)

![Präsentationsansicht einer laufenden Sitzung](docs/images/presentation.png)

### Auf dem Handy

<p>
  <img src="docs/images/mobile.png" alt="Agenda-Ansicht auf dem Handy" width="300">
</p>

Die Screenshots zeigen die Beispieldaten aus `npm run reset` (siehe „Beispieldaten für die Entwicklung“).

---

## 🛠 Tech Stack

### Frontend
- **Framework**: React 19, TypeScript, Vite
- **UI Components & Styling**: PrimeReact, PrimeIcons, PrimeFlex, Vanilla CSS
- **Maps**: Leaflet & React-Leaflet
- **Editor**: MDXEditor
- **Routing & Utilities**: React Router 7, QR Code React, date-fns, uuid

### Backend
- **Runtime & Framework**: Node.js, Express 5, TypeScript (`tsx`)
- **Datenbank & ODM**: MongoDB, Mongoose

### Containerisierung & Scripts
- Docker & Docker Compose
- `start.sh` Bash-Skript für die lokale Entwicklung

---

## 📦 Vorbereitung / Voraussetzungen

- **Node.js** (v18+)
- **npm** (v9+)
- **Docker & Docker Desktop** (für die lokale MongoDB-Instanz oder den Docker Compose Build)

---

## 🏁 Schnellstart (Lokale Entwicklung)

### Option 1: Per `start.sh` (Empfohlen für Dev)

Das Startskript startet automatisch die MongoDB in Docker sowie Frontend und Backend im Hintergrund:

```bash
chmod +x start.sh
./start.sh
```

- **Frontend**: [http://localhost:5188](http://localhost:5188)
- **Backend API**: [http://localhost:3188](http://localhost:3188)
- **MongoDB**: Ports `27017:27017`

*Beenden aller Dienste mit `Ctrl+C`.*

---

### Option 2: Manuell starten

#### 1. MongoDB starten
```bash
docker run -d -p 27017:27017 --name flashagenda-mongo mongo:latest
```

#### 2. Backend starten
```bash
cd backend
npm install
npm run dev
```

#### 3. Frontend starten (in einem zweiten Terminal)
```bash
cd frontend
npm install
npm run dev
```

---

### Option 3: Mit Docker Compose

Das gesamte Setup (MongoDB, Backend, Frontend) kann in isolierten Containern gestartet werden:

```bash
docker-compose up --build
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001](http://localhost:3001)
- **MongoDB**: Container `flashagenda-mongo`

---

### Beispieldaten für die Entwicklung

Sobald MongoDB läuft, aus dem Projektordner:

```bash
npm run reset   # löscht ALLE lokalen Agenden und legt vier Beispiel-Agenden neu an (fragt vorher nach)
npm run links   # zeigt alle lokalen Agenden mit Links, ändert nichts
```

Nach dem Reset stehen die Links zu den Agenden und die Login-Codes der Beispiel-Personen in der Ausgabe (z. B. Max Mustermann: `1111`). Mit `npm run reset -- --yes` entfällt die Rückfrage. Admin-Einstellungen bleiben beim Reset erhalten.

Nur die Beispiele ergänzen, ohne andere Agenden zu löschen: `cd backend && npm run seed`.

Alle drei Befehle laufen ausschließlich gegen eine lokale Datenbank (`localhost`); für andere Ziele ist `SEED_FORCE=1` nötig.

---

## 📁 Projektstruktur

```
FlashAgenda/
├── backend/
│   ├── src/
│   │   ├── models/        # Mongoose Data Models (z.B. Agenda.ts)
│   │   ├── routes/        # Express API Endpunkte
│   │   └── server.ts      # Server-Einstiegspunkt
│   ├── .env               # Umgebungsvariablen für Backend
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable React UI Components
│   │   ├── pages/         # Seiten-Komponenten (Home, AgendaDetail)
│   │   ├── index.css      # Globale Styles
│   │   └── App.tsx        # React Routing & App Root
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml     # Multi-Container Docker Setup
├── start.sh               # Lokales Dev-Startskript
└── README.md
```

---

## ⚙️ Umgebungsvariablen

### Backend (`backend/.env`)

| Variable | Beschreibung | Standardwert |
|---|---|---|
| `PORT` | Port des Backend-Servers | `3188` |
| `MONGO_URI` | Verbindungs-URL zur MongoDB | `mongodb://localhost:27017/flashagenda` |

---

## 📜 Skripte & Befehle

### Backend
- `npm run dev`: Startet den Entwicklungsserver mit Hot-Reloading (`tsx watch` auf Port `3188`).
- `npm run build`: Kompiliert TypeScript nach JavaScript (`dist/`).
- `npm run start`: Startet den gebauten Produktionsserver.
- `npm run seed`: Legt Beispiel-Agenden in der lokalen MongoDB an, ohne andere zu löschen.
- `npm run seed:reset`: Löscht alle lokalen Agenden und legt die Beispiele neu an (im Projektordner: `npm run reset`).
- `npm run seed:links`: Listet alle lokalen Agenden mit Links (im Projektordner: `npm run links`).

### Frontend
- `npm run dev`: Startet den Vite Dev Server (`http://localhost:5188`).
- `npm run build`: Erstellt das Produktions-Bundle (`dist/`).
- `npm run lint`: Führt Linter-Überprüfungen durch (`oxlint`).

---

## 📄 Lizenz

ISC / Proprietary (sofern nicht anders angegeben).
