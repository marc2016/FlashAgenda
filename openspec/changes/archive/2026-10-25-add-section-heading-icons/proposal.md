# Proposal

## Why

Die Abschnitte der Agenda-Seite sind jetzt einklappbar. Eingeklappt sieht man nur noch die Überschriften. Ein Icon vor jeder Überschrift macht die Abschnitte beim Überfliegen schneller erkennbar und passt zu den Kacheln, die schon Icons haben.

## What Changes

- Vor jede Abschnitts-Überschrift der Agenda-Seite kommt ein Material-Design-Icon (`@mdi/font` ist bereits eingebunden):
  - **Details:** `mdi-card-text-outline`
  - **Personen:** `mdi-account-group`
  - **Agenda-Erfolge & Wanderpokale:** `mdi-trophy`
  - **Agendapunkte:** `mdi-format-list-checks`
- Die Icons sind gelb (`text-yellow-500`) wie die Icons in den Kacheln und so groß wie die Überschrift.
- Die Icons sind rein dekorativ (`aria-hidden`), der Überschriftentext bleibt unverändert.

**Abhängigkeit:** Baut auf dem Change `collapsible-agenda-sections` auf, der die Überschrift „Details“ und die Spec `agenda-page-sections` einführt. Dieser Change sollte erst nach jenem umgesetzt und archiviert werden.

## Capabilities

### New Capabilities
<!-- keine -->

### Modified Capabilities
- `agenda-page-sections`: neue Anforderung „Icons vor den Abschnitts-Überschriften“.

## Impact

- **Code:** [AgendaHeader.tsx](../../../frontend/src/components/AgendaHeader.tsx), [AgendaAttendees.tsx](../../../frontend/src/components/AgendaAttendees.tsx), [AgendaAchievementBanner.tsx](../../../frontend/src/components/AgendaAchievementBanner.tsx), [AgendaTimeline.tsx](../../../frontend/src/components/AgendaTimeline.tsx). Je eine Zeile in der Überschriftszeile.
- **Tests:** Bestehende Anker wie `h3:has-text("Personen")` bleiben gültig, weil das Icon außerhalb der `h3` sitzt. Die neue Prüfung kommt in `frontend/e2e/collapsible-sections.spec.ts`.
- **Backend / API:** keine Änderung.
