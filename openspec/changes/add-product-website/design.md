# Design

## Context

- Reference: [beszel.dev](https://beszel.dev) uses VitePress with its default theme: hero with name, tagline and three buttons, screenshots, feature list, docs with left sidebar, search, appearance toggle, version badge and MIT footer.
- The app is German, but the website targets a broader audience in English (decision by the owner).
- Existing assets: `docs/images/logo.png` (logo + Bangers wordmark from the real home page) and four screenshots (`agenda.png`, `agenda-items.png`, `presentation.png`, `mobile.png`), produced from the seed data (`npm run reset`).
- App images are published by `.github/workflows/docker-publish.yml` on tags as `ghcr.io/<owner>/flashagenda-{backend,frontend}`. `.github/workflows/ci.yml` runs backend and Playwright tests on every push/PR to `main`.
- The frontend image pattern: `node` builder stage → `nginx:alpine` serving `dist`.

## Goals / Non-Goals

**Goals:**
- A small, low-maintenance site in the beszel.dev style, built from Markdown, deployable as one container.

**Non-Goals:**
- Translations (English only for now; VitePress i18n can be added later).
- Reverse proxy, TLS and domain setup (operator's infrastructure).
- A live demo instance of the app.

## Decisions

### 1. VitePress with the default theme
Same tool as the reference; Markdown pages, built-in hero/features layout, sidebar, local search (`search.provider: 'local'`), appearance toggle and `ignoreDeadLinks: false` by default (dead links fail the build). Pinned to the current stable `vitepress@1.6.x`.
*Alternative:* Astro Starlight. Comparable, but VitePress is Vue-light Markdown with less setup and matches the reference 1:1.
*Alternative:* a hand-written landing page. Rejected because the docs part would need its own navigation and search.

### 2. Folder layout
```
website/
  package.json            # vitepress, scripts dev/build/preview
  .vitepress/config.mts   # nav, sidebar, search, version, head (Bangers font)
  .vitepress/theme/       # extends default theme, brand CSS variables, Bangers headings
  index.md                # landing page (layout: home)
  guide/what-is-flashagenda.md
  guide/getting-started.md
  guide/configuration.md
  guide/usage.md
  guide/development.md
  public/images/          # logo + screenshots (moved from docs/images)
  Dockerfile
  nginx.conf
```

### 3. Images: move to `website/public/images`, README points there
`docs/images` is only used by the README today. Moving the files into the website's `public/` folder keeps one copy that both use; the README links become `website/public/images/...`. `docs/` keeps `OFFLINE_PWA_PLAN.md`.
*Alternative:* copy images into the site at build time. Rejected: needs a build step outside VitePress and a repo-root Docker context.

### 4. Branding
Theme CSS overrides `--vp-c-brand-1..3` (comic yellow `#eab308`/`#facc15` on dark, red `#b71c1c` accents), loads Bangers from Google Fonts (`head` link) and applies it to `.VPHero .name`, `h1`, `h2` in docs. Hero `image` is the logo; feature grid uses emoji-free MDI-like short titles. Screenshots shown below the hero in a simple responsive gallery (Markdown section on the home page, no slideshow component).

### 5. Version in navigation
`config.mts` reads `../../frontend/package.json` and adds a nav item `v<version>` linking to GitHub releases. The release script (`release.mjs`) reads the current version from `frontend/package.json`; the root `package.json` turned out to be outdated (3.8.1 vs. 3.11.1), so it is not a reliable source.

### 6. Container
`website/Dockerfile`: `node:22-alpine` builds (`npm ci && npm run build`), `nginx:alpine` serves `.vitepress/dist`. The build context is the repository root because the config reads `frontend/package.json`; `website/Dockerfile.dockerignore` keeps the context small with BuildKit, and the Dockerfile copies the site sources explicitly so a local `node_modules` never ends up in the image with the classic builder either. `lastUpdated` is disabled because the container build has no Git history. `nginx.conf` uses `try_files $uri $uri.html $uri/ =404` for clean URLs, a custom `404.html`, gzip and long cache headers for `/assets/`. Port 80, no API proxy.

### 7. Publishing workflow
New `.github/workflows/website.yml`:
- `pull_request` and `push` on `main` with `paths: website/**` → `npm ci && npm run build` (verification).
- `push` on `main` with `paths: website/**` → build and push `ghcr.io/<owner>/flashagenda-website:latest`.
- `push` tags `v*` → build and push with the release tag (and `latest`), so site and app versions align.
`ci.yml` gets `paths-ignore: ['website/**']` for `push` and `pull_request` on branches (tag pushes unaffected), so website-only changes do not run the Playwright suite.

### 8. Content
English, concise, derived from the README and the actual app:
- *What is FlashAgenda?*: problem, main features, how it works (share link/QR, no account, live meeting).
- *Getting Started*: Docker Compose file with the three images, ports as in the repo's `docker-compose.yml` (30301/30302/30303), first steps.
- *Configuration*: env table (PORT, MONGO_URI, ADMIN_PASSWORD, ADMIN_JWT_SECRET) with production warning; reverse proxy example. The frontend container only proxies `/api`, so the proxy must route `/socket.io/` to the backend with WebSocket upgrade (documented as-is; see Open Questions).
- *Using FlashAgenda*: creating an agenda, people & login codes, items/polls/comments, standard items, live meeting, follow-up agenda, admin area.
- *Development*: local setup (`start.sh`), example data (`npm run reset`, `npm run links`), tests, OpenSpec workflow.

## Risks / Trade-offs

- [Content drifts from the app] → Docs are short and feature-level; screenshots are regenerated from seed data; the website lives next to the code so changes can land in the same commit.
- [German app, English site] → Screenshots show German UI. Captions explain the UI language; translations can follow later.
- [Moving images breaks old README links in forks/caches] → Acceptable; GitHub renders the README from the same commit.
- [Google Fonts request from the website] → Same as the app; could be self-hosted later.

## Open Questions

- The frontend container's nginx does not proxy `/socket.io/`, so real-time updates need the reverse proxy route described in the docs. Proxying it in `frontend/nginx.conf` would be a separate app change.

- Final public URL/domain: needed only for `sitemap` and absolute links; the site works with relative paths until then (`base: '/'`).
