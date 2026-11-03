# Tasks

## 1. Project setup

- [x] 1.1 Create `website/` with `package.json` (`vitepress@1.6.x`, scripts `dev`, `build`, `preview`), `.gitignore` for `.vitepress/dist` and `.vitepress/cache`; add root scripts `website:dev` and `website:build`. Verify: `cd website && npm install && npm run build` succeeds with a placeholder `index.md`
- [x] 1.2 Move `docs/images/*` to `website/public/images/` and update all README image paths. Verify: `grep -n "docs/images" README.md` returns nothing and the referenced files exist

## 2. Configuration and theme

- [x] 2.1 `.vitepress/config.mts`: title, description, nav (Guide, version from root `package.json` linking to releases, GitHub), sidebar with the five guide pages, local search, `head` with favicon and Bangers font, footer "Released under the MIT License". Verify: build succeeds, nav shows `v<root version>`
- [x] 2.2 `.vitepress/theme/` extending the default theme with brand colors and Bangers headings. Verify: screenshots of landing page in light and dark mode at 1440px and 390px

## 3. Content

- [x] 3.1 Landing page `index.md` (hero with logo, tagline, 3 actions; feature grid; screenshot gallery). Verify: screenshot review; all links resolve (build passes dead-link check)
- [x] 3.2 Guide pages: `what-is-flashagenda`, `getting-started` (Docker Compose with published images and ports 30301/30302/30303), `configuration` (all env vars + production warning), `usage`, `development`. Verify: build passes; Docker Compose snippet matches the repo's `docker-compose.yml` images and ports

## 4. Container and CI

- [x] 4.1 `website/Dockerfile` (node:22-alpine build → nginx:alpine) and `website/nginx.conf` (clean URLs, 404 page, gzip, asset caching). Verify: `docker build -t flashagenda-website website && docker run -p 8099:80 ...`; `/` and `/guide/getting-started` return 200, `/does-not-exist` returns 404
- [x] 4.2 `.github/workflows/website.yml` (build on PR/push for `website/**`; publish `latest` on main and release tag on `v*` tags to `ghcr.io/<owner>/flashagenda-website`). Verify: workflow YAML validates (`npx --yes @action-validator/cli` or careful review) and steps mirror `docker-publish.yml`
- [x] 4.3 `ci.yml`: add `paths-ignore: ['website/**']` to `push` (branches) and `pull_request`. Verify: tag trigger unchanged; YAML diff reviewed

## 5. Documentation and acceptance

- [x] 5.1 README: link to the website section/URL placeholder and a short "Website" section (`npm run website:dev`, container). Verify: README renders images from `website/public/images`
- [x] 5.2 Acceptance: `npm run website:build` passes; container check from 4.1 passes; screenshots of landing page and one guide page (desktop + mobile) reviewed
