# Development

FlashAgenda is a monorepo with three parts:

| Folder | Content |
|---|---|
| `frontend/` | React 19, TypeScript, Vite, PrimeReact |
| `backend/` | Node.js, Express 5, Mongoose, Socket.io |
| `website/` | This website, built with VitePress |

## Prerequisites

- Node.js 20.19+ or 22.12+
- Docker (Docker Desktop or Colima) for the local MongoDB

## Run locally

```bash
git clone https://github.com/marc2016/FlashAgenda.git
cd FlashAgenda
./start.sh
```

`start.sh` starts MongoDB in Docker and runs backend and frontend with hot reloading:

- Frontend: <http://localhost:5188>
- Backend API: <http://localhost:3188>

## Example data

With MongoDB running, from the project folder:

```bash
npm run reset   # deletes ALL local agendas and creates four example agendas
npm run links   # lists all local agendas with their links
```

The reset prints the links and the sign-in codes of the example people (for example Max Mustermann: `1111`). Both commands only run against a local database.

## Tests

```bash
npm test                         # backend and end-to-end tests
cd backend && npm test           # Vitest + Supertest
cd frontend && npm run test:e2e  # Playwright, desktop and mobile viewports
```

New features come with tests: backend changes with Vitest/Supertest in `backend/tests/`, UI changes with Playwright in `frontend/e2e/`.

## Planning changes

Changes are planned with [OpenSpec](https://github.com/Fission-AI/OpenSpec). Specs describing the current behaviour live in `openspec/specs/`, finished changes in `openspec/changes/archive/`.

## Website

```bash
npm run website:dev     # local preview of this website
npm run website:build   # static build into website/.vitepress/dist
```

The website is also published as a Docker image, `ghcr.io/marc2016/flashagenda-website`, that serves the static site with nginx on port 80:

```bash
docker run -d -p 8080:80 ghcr.io/marc2016/flashagenda-website:latest
```
