# Proposal

## Why

Die Agenda-Seite ist lang. Wer meist nur die Agendapunkte braucht, muss jedes Mal an Details, Karte, Personen und Erfolgen vorbeiscrollen, vor allem auf dem Handy. Die großen Abschnitte sollen sich einklappen lassen. Der Browser soll sich merken, was eingeklappt ist, damit die Seite beim nächsten Besuch gleich aussieht.

## What Changes

- Die vier großen Abschnitte der Agenda-Seite lassen sich ein- und ausklappen: **Details** (Datum, Ort, Speisekarte, Annahmeschluss, Standardpunkte, Karte), **Personen**, **Erfolge** (Agenda-Erfolge & Wanderpokale) und **Agendapunkte**.
- Jeder Abschnitt hat in seiner Überschriftszeile einen Klapp-Button mit Chevron-Icon. Die Überschrift bleibt auch eingeklappt sichtbar.
- Die Details bekommen dafür eine eigene Überschriftszeile „Details“ unter dem Agenda-Titel. Titel und Live-Anzeige bleiben immer sichtbar.
- Bei den Agendapunkten bleiben auch eingeklappt die Überschrift und der Fortschritts-Zähler sichtbar. Sortier-Buttons und Liste werden ausgeblendet.
- Der Zustand wird im `localStorage` des Browsers gespeichert und gilt für alle Agenden gleich. Ohne gespeicherten Zustand, oder wenn der Speicher nicht verfügbar ist, sind alle Abschnitte ausgeklappt.

## Capabilities

### New Capabilities
- `agenda-page-sections`: Einklappbare Hauptabschnitte der Agenda-Seite und das Merken ihres Zustands im Browser.

### Modified Capabilities
<!-- keine -->

## Impact

- **Code:** neuer Hook (z. B. `frontend/src/hooks/useCollapsedSection.ts`) und kleiner Button-Baustein; Einbau in [AgendaHeader.tsx](../../../frontend/src/components/AgendaHeader.tsx), [AgendaAttendees.tsx](../../../frontend/src/components/AgendaAttendees.tsx), [AgendaAchievementBanner.tsx](../../../frontend/src/components/AgendaAchievementBanner.tsx), [AgendaTimeline.tsx](../../../frontend/src/components/AgendaTimeline.tsx).
- **Backend / API:** keine Änderung.
- **Tests:** Bestehende E2E-Tests verwenden die `h3`-Überschriften „Personen“ und „Agendapunkte“ als Anker. Diese bleiben erhalten. Dazu kommt eine neue E2E-Spec.
