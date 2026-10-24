# Tasks

## 1. Dialog auslagern

- [x] 1.1 `frontend/src/components/CreateFollowUpAgendaDialog.tsx` anlegen. Zustand, Vorauswahl (per `useEffect` beim Öffnen), Toggle-Helfer, `handleConfirmCreateNew` und JSX 1:1 aus `AgendaHeader.tsx` übernehmen; Props `visible`, `onHide`, `agenda`, `currentUser`. Prüfen: `npx tsc --noEmit -p tsconfig.app.json` läuft fehlerfrei
- [x] 1.2 `AgendaHeader.tsx` auf die neue Komponente umstellen und den alten Zustand, die Helfer und das JSX entfernen. Prüfen: `e2e/agenda-interactions.spec.ts` („should open duplicate new agenda modal from top action bar“) grün in allen 4 Projekten

## 2. Button in der Präsentation

- [x] 2.1 Im Aktions-Panel des Abschluss-Screens in `LiveMeetingModal.tsx` den Button „Neue Agenda vorbereiten“ (`data-testid="create-follow-up-agenda-btn"`) ergänzen und `CreateFollowUpAgendaDialog` mit `agenda={{ ...agenda, items: localItems, attendees: localAttendees }}` rendern. Prüfen: Screenshot des Abschluss-Screens bei 1440px und 390px, Button sichtbar, kein horizontales Scrollen

## 3. Tests

- [x] 3.1 Neue Spec `frontend/e2e/follow-up-agenda.spec.ts`: (a) Aus dem Abschluss öffnet sich der Dialog mit allen Personen und den gepinnten Punkten ausgewählt; (b) ein während der Sitzung angepinnter Punkt ist vorausgewählt; (c) Bestätigen sendet `POST /api/agendas` mit Titel, Personen, gewählten Punkten (`author: 'System'`) und `includeStandardItems`, öffnet einen neuen Tab, und der Abschluss-Screen bleibt sichtbar, ohne `liveMeetingStatus: 'completed'` zu senden; (d) Abbrechen sendet keinen POST; (e) über die Aktionsleiste wird derselbe Payload gesendet. Prüfen: Spec grün in allen 4 Playwright-Projekten
- [x] 3.2 Abnahme: `npm run build` im Frontend und komplette Playwright-Suite grün
