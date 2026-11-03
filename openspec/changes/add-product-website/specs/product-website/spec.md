# Spec Delta

## Purpose

Defines the public FlashAgenda product website: an English landing page with short documentation, built from this repository and shipped as a standalone Docker container.

## ADDED Requirements

### Requirement: Landing page
The website MUST provide an English landing page with the FlashAgenda logo and name, a one-sentence tagline, call-to-action links to the getting-started guide, to the "What is FlashAgenda?" page and to the GitHub repository, at least three app screenshots, a feature overview and a footer stating the MIT license.

#### Scenario: Visitor opens the website
- **WHEN** a visitor opens the root URL of the website
- **THEN** the page shows the logo, the name "FlashAgenda", the tagline, the three call-to-action links, screenshots and the feature overview
- **AND** the footer states that FlashAgenda is released under the MIT License

### Requirement: Documentation
The website MUST provide documentation pages reachable from a sidebar: "What is FlashAgenda?", "Getting Started", "Configuration", "Using FlashAgenda" and "Development". The Getting Started page MUST describe running FlashAgenda with Docker Compose using the published container images. The Configuration page MUST list all backend environment variables and MUST warn that the admin password and JWT secret have to be set in production.

#### Scenario: Quickstart
- **WHEN** a visitor opens "Getting Started"
- **THEN** it contains a Docker Compose example using the published `flashagenda-frontend`, `flashagenda-backend` and MongoDB images and the URL to open afterwards

#### Scenario: Admin security warning
- **WHEN** a visitor opens "Configuration"
- **THEN** `ADMIN_PASSWORD` and `ADMIN_JWT_SECRET` are listed with a warning to change the defaults in production

### Requirement: Look and feel
The website MUST use the FlashAgenda brand: comic red and yellow brand colors and the Bangers font for headings. It MUST offer light and dark mode, a full-text search over the documentation and show the current FlashAgenda version in the navigation.

#### Scenario: Version in navigation
- **WHEN** the website is built
- **THEN** the navigation shows the app version from `frontend/package.json` (the version the release script reads)

### Requirement: Single source for images
Logo and screenshots used by the website and the README MUST be stored once in the repository; the README MUST reference the same files the website uses.

#### Scenario: README images
- **WHEN** the README is rendered on GitHub
- **THEN** its logo and screenshots load from the website's image folder

### Requirement: Build verification
The website build MUST fail on dead internal links, and CI MUST build the website for pull requests and pushes to `main` that touch the website. Changes limited to the website MUST NOT trigger the backend and E2E test pipeline.

#### Scenario: Broken link
- **WHEN** a page links to a documentation page that does not exist
- **THEN** the website build fails

### Requirement: Container deployment
The repository MUST provide a Docker image for the website that serves the built static site with nginx on port 80, including correct handling of clean URLs. The image MUST be published to the GitHub Container Registry as `flashagenda-website` with the tag `latest` on changes to the website on `main`, and with the release tag on release tags.

#### Scenario: Run the container
- **WHEN** the image is started with `docker run -p 8080:80 ghcr.io/<owner>/flashagenda-website`
- **THEN** `http://localhost:8080/` serves the landing page and `http://localhost:8080/guide/getting-started` serves the Getting Started page
