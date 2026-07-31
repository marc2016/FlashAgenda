# Project Specific Agent Rules

## Git Commit & Tag Guardrail
- **Keine automatischen Commits/Tags:** Erstelle niemals unaufgefordert `git commit` oder `git tag` Befehle nach dem Bearbeiten von Dateien, dem Beheben von Fehlern oder dem Durchführen von Tests.
- **Explizite Freigabe erforderlich:** Führe Git-Commits und Tags nur dann aus, wenn der Benutzer dies in seiner Nachricht explizit anfordert (z.B. "Erstelle einen Commit", "Setze einen Tag", "Commit & Tag v3.1.0").
- **Dateien geändert lassen:** Lass alle geänderten Dateien nach erfolgreicher Bearbeitung und Testdurchführung im Working Tree bzw. Staging Area für den Benutzer zur Überprüfung bereitstehen.

## Mandatory Tests for New Features
- **Pflichtherstellung von Tests:** Wenn ein neues Feature, eine API-Route, eine Service-Funktion oder eine neue UI-Komponente entwickelt wird, müssen immer entsprechende automatisierte Tests erstellt werden.
- **Backend Features:** Backend-Änderungen und neue Endpunkte sind stets mit Vitest/Supertest Unit- & Integrationstests in `backend/tests/` abzusichern.
- **Frontend Features:** UI-Komponenten und Features sind stets mit Playwright E2E-Tests in `frontend/e2e/` (inkl. mobilen Viewports wie Pixel 7 und iPhone) abzusichern.
- **Vollständige Ausführung:** Neue Tests müssen vor dem Abschluss einer Aufgabe erfolgreich ausgeführt und verifiziert werden.
