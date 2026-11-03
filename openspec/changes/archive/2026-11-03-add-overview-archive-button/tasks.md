# Tasks

## 1. Backend

- [x] 1.1 Move the creator check from `PUT /api/agendas/:id` into an exported `canManageAgenda(agenda, userId, userName)` in `backend/src/routes/agenda.ts` (without `createdBy`: only the first attendee matches; `PUT /:id` keeps its current behaviour of skipping the check when `createdBy` is missing) and verify the existing tests in `agendaRoutes.test.ts` still pass via `npm run test:backend`
- [x] 1.2 Add `createdBy` to `toAgendaSummary` and extend the `toAgendaSummary` tests (field present, still no `securityCode`/`secretGuid`); verify with `npm run test:backend`
- [x] 1.3 Add `PUT /api/agendas/:id/archive` with body `{ archived, userId, userName }`: 400 for invalid ID or non-boolean `archived`, 404, 403 without permission, works on archived agendas, writes `AGENDA_ARCHIVED`/`AGENDA_UNARCHIVED` audit entry with the user's name only when the value changes, returns the summary; verify with new tests in `agendaArchive.test.ts` (creator archives, first attendee archives, other attendee gets 403 and status unchanged, unarchive of archived agenda, audit entries, idempotent repeat)
- [x] 1.4 Verify `PUT /api/agendas/:id` still returns 403 for an archived agenda and works again after unarchiving via the new route (test in `agendaArchive.test.ts`)

## 2. Frontend logic

- [x] 2.1 Add `createdBy` to `AgendaSummary` and a `canManageAgenda(summary, user)` helper in `frontend/src/utils/agendaOverview.ts` (match by ID or case-insensitive name against `createdBy` or `attendees[0]`); verify with `npm run build` in `frontend`
- [x] 2.2 In `Home.tsx`, add a toggle handler that calls the new route with `currentUser` ID and name, replaces the entry in `myAgendas` with the response, and shows an `alert` on failure without changing state; pass `currentUser` and the handler to `AgendaOverview`; verify with `npm run build`

## 3. Overview card

- [x] 3.1 Rebuild `AgendaOverviewCard` from `<button>` to a focusable container (`role="link"`, `tabIndex=0`, Enter/Space open the agenda, keep `data-testid="agenda-card"` and `aria-label`) and adjust `.agenda-card` styles in `index.css` (focus ring, hover unchanged); verify existing card tests in `frontend/e2e/home.spec.ts` pass
- [x] 3.2 Add the archive toggle icon button (only when `canManageAgenda`; `pi pi-inbox` / `pi pi-replay`, `aria-label`/`title` "Archivieren"/"Wiederherstellen", `data-testid="agenda-card-archive-toggle"`, `stopPropagation`, disabled while the request runs) and pass `onToggleArchive` through `AgendaOverview`; verify visually in the dev app at 390 px and 1280 px

## 4. E2E tests and verification

- [x] 4.1 Add tests to `frontend/e2e/home.spec.ts`: creator archives an upcoming agenda (card leaves "Anstehend", counts update, shows ABGESCHLOSSEN + archive icon under "Abgeschlossen", agenda not opened), restore brings it back to "Anstehend", non-manager sees no toggle, server error keeps card unchanged; verify with `npm run test:e2e -- home.spec.ts`
- [x] 4.2 Run the full suite `npm test` and `npm run lint` in `frontend` and verify everything passes
