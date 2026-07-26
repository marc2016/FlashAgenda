# ⚡️ FlashAgenda

FlashAgenda ist eine moderne Web-Anwendung zur einfachen Erstellung, Verwaltung und interaktiven Anzeige von Agenden, Zeitplänen und Event-Programmen.

---

## 🚀 Features

- **Interaktiver Zeitplan & Agenda-Ansicht**: Übersichtliche Darstellung aller Punkte/Sessions mit Zeitangaben, Beschreibungen und Referenten/Teilnehmern.
- **Standort & Kartenintegration**: Erfassung von Veranstaltungsorten inklusive interaktiver Karte (Leaflet / OpenStreetMap).
- **Rich-Text & MDX-Notizen**: Editor zur Erstellung formatierter Beschreibungen und Notizen.
- **Teilen per QR-Code & Link**: Schnelle Freigabe und Abruf von Agenden für Mobilgeräte und Besucher.
- **Modernes UI / Responsive Design**: Basierend auf PrimeReact & PrimeFlex.

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

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000](http://localhost:3000) (bzw. `http://localhost:3001` je nach Konfiguration)
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
| `PORT` | Port des Backend-Servers | `3001` (oder `3000`) |
| `MONGO_URI` | Verbindungs-URL zur MongoDB | `mongodb://localhost:27017/flashagenda` |

---

## 📜 Skripte & Befehle

### Backend
- `npm run dev`: Startet den Entwicklungsserver mit Hot-Reloading (`tsx watch`).
- `npm run build`: Kompiliert TypeScript nach JavaScript (`dist/`).
- `npm run start`: Startet den gebauten Produktionsserver.

### Frontend
- `npm run dev`: Startet den Vite Dev Server (`http://localhost:5173`).
- `npm run build`: Erstellt das Produktions-Bundle (`dist/`).
- `npm run lint`: Führt Linter-Überprüfungen durch (`oxlint`).

---

## 📄 Lizenz

ISC / Proprietary (sofern nicht anders angegeben).
