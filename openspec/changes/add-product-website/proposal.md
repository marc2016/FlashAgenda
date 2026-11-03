# Proposal

## Why

FlashAgenda has no public face beyond the GitHub README. A product website in the style of [beszel.dev](https://beszel.dev) (landing page plus short documentation) makes the project easier to discover, explains it to new users, and gives self-hosters a clear quickstart. The site lives in this repository so it shares the logo, screenshots and feature descriptions with the app, and it is deployed as its own Docker container under a separate URL.

## What Changes

- New folder `website/` with a static site built with **VitePress**, in **English**:
  - **Landing page**: logo, name, tagline, call-to-action buttons (Get started, What is FlashAgenda?, GitHub), screenshots, feature grid, footer with MIT license.
  - **Short documentation** with sidebar: What is FlashAgenda?, Getting Started (Docker Compose quickstart with the published images), Configuration (environment variables, admin security), Using FlashAgenda (agendas, live meeting), Development (local setup, example data, tests).
  - Comic look matching the app: red/yellow brand colors, Bangers font for headings, light/dark mode, local search, app version shown in the navigation.
- Screenshots and logo move from `docs/images/` to `website/public/images/` as the single source; the README references the new location.
- `website/Dockerfile` builds the site and serves it with nginx; the image `ghcr.io/<owner>/flashagenda-website` is published by a new GitHub Actions workflow on changes to `website/**` (tag `latest`) and on release tags.
- CI builds the website on pull requests and pushes (the build fails on dead links); the existing backend/E2E pipeline no longer runs for website-only changes.

## Capabilities

### New Capabilities
- `product-website`: Public product website (landing page and documentation), its build and its container deployment.

### Modified Capabilities
<!-- none -->

## Impact

- **New:** `website/` (VitePress project, Dockerfile, nginx config), `.github/workflows/website.yml`.
- **Changed:** `README.md` (image paths, link to the website and website section), `.github/workflows/ci.yml` (`paths-ignore: website/**`), root `package.json` (`website:dev`, `website:build` scripts).
- **Moved:** `docs/images/*` → `website/public/images/*`.
- **App, backend, API:** no changes.
- **Hosting:** the operator runs the website container on its own host/URL (reverse proxy and domain are outside this repository).
