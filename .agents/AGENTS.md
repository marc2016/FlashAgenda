# Project Specific Agent Rules

## Git Commit & Tag Guardrail
- **Keine automatischen Commits/Tags:** Erstelle niemals unaufgefordert `git commit` oder `git tag` Befehle nach dem Bearbeiten von Dateien, dem Beheben von Fehlern oder dem Durchführen von Tests.
- **Explizite Freigabe erforderlich:** Führe Git-Commits und Tags nur dann aus, wenn der Benutzer dies in seiner Nachricht explizit anfordert (z.B. "Erstelle einen Commit", "Setze einen Tag", "Commit & Tag v3.1.0").
- **Dateien geändert lassen:** Lass alle geänderten Dateien nach erfolgreicher Bearbeitung und Testdurchführung im Working Tree bzw. Staging Area für den Benutzer zur Überprüfung bereitstehen.
