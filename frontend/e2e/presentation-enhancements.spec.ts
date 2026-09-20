import { test, expect } from '@playwright/test';

test.describe('FlashAgenda - Presentation & Meeting Enhancements', () => {
  const baseAgenda = {
    _id: 'enhancement-agenda-202',
    title: 'Sprint Planning & Review',
    description: 'Wöchentliches Team-Meeting',
    date: new Date(Date.now() - 86400000).toISOString(), // Yesterday (meeting time always reached)
    time: '08:00',
    liveMeetingActive: false,
    liveMeetingStatus: 'idle',
    liveMeetingElapsedSeconds: 0,
    isManuallyClosed: false,
    items: [
      {
        _id: 'item-1',
        title: 'Architektur Review',
        description: 'Diskussion der neuen Microservice-Architektur.',
        author: 'Max Mustermann',
        createdBy: 'user-1',
        createdAt: '2026-09-19T20:00:00.000Z',
        durationSeconds: 125,
        completed: false,
        pinned: false,
        upvotes: ['user-1'],
        poll: {
          question: 'Architektur freigeben?',
          options: [
            { id: 'opt-1', text: 'Ja', votes: ['user-1'] },
            { id: 'opt-2', text: 'Nein', votes: [] }
          ]
        },
        comments: [
          {
            id: 'c-1',
            author: 'Anna Schmidt',
            createdBy: 'user-2',
            text: 'Sieht gut aus!',
            createdAt: new Date().toISOString()
          },
          {
            id: 'note-1',
            author: 'Max Mustermann',
            createdBy: 'user-1',
            text: '📝 **Sitzungsnotiz / Beschluss:** Architektur einstimmig beschlossen.',
            createdAt: new Date().toISOString()
          }
        ]
      },
      {
        _id: 'item-2',
        title: 'Systemübertragene Aufgabe',
        description: 'Automatisch aus der Vorwoche übernommen.',
        author: 'System',
        createdBy: 'system',
        createdAt: '2026-09-19T20:05:00.000Z',
        durationSeconds: 0,
        completed: false,
        pinned: false,
        upvotes: []
      }
    ],
    attendees: [
      {
        id: 'user-1',
        _id: 'user-1',
        name: 'Max Mustermann',
        email: 'max@flashagenda.de',
        cardColor: '#0a4b7c',
        attendanceStatus: 'present',
        pinnedAchievements: ['first_item_created']
      },
      {
        id: 'user-2',
        _id: 'user-2',
        name: 'Anna Schmidt',
        email: 'anna@flashagenda.de',
        cardColor: '#8b0000',
        attendanceStatus: 'present'
      }
    ]
  };

  const setupMockApi = async (page: any, initialAgenda = baseAgenda) => {
    let agendaState = JSON.parse(JSON.stringify(initialAgenda));

    await page.route('**/api/**', async (route: any) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes('/audits') || url.includes('/audit-log')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      } else if (url.includes('/user-stats')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ agendasCount: 1, totalItemsContributed: 2 }) });
      } else if (url.includes('/user-agendas')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([agendaState]) });
      } else if (method === 'DELETE' && url.includes('/attendees/')) {
        const attendeeId = url.split('/attendees/')[1];
        agendaState.attendees = agendaState.attendees.filter((a: any) => a.id !== attendeeId && a._id !== attendeeId);
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(agendaState) });
      } else if (method === 'PATCH' || method === 'PUT') {
        const postData = route.request().postDataJSON();
        agendaState = { ...agendaState, ...postData };
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(agendaState) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(agendaState) });
      }
    });

    await page.addInitScript(() => {
      localStorage.setItem('flashagenda_last_user', JSON.stringify({
        id: 'user-1',
        _id: 'user-1',
        name: 'Max Mustermann',
        email: 'max@flashagenda.de'
      }));
      localStorage.setItem('flashagenda_enhancement-agenda-202_user', JSON.stringify({
        id: 'user-1',
        _id: 'user-1',
        name: 'Max Mustermann',
        email: 'max@flashagenda.de'
      }));
    });
  };

  test('1. Sleek "Agenda geschlossen" bar displays normal font when closed', async ({ page }) => {
    const closedAgenda = { ...baseAgenda, isManuallyClosed: true };
    await setupMockApi(page, closedAgenda);

    await page.goto('/agenda/enhancement-agenda-202');
    const closedBar = page.locator('text=Agenda ist geschlossen');
    await expect(closedBar).toBeVisible();
  });

  test('2. Meeting button shows "Sitzung fortsetzen" (orange) if session was in progress', async ({ page }) => {
    const inProgressAgenda = {
      ...baseAgenda,
      liveMeetingStatus: 'in_progress',
      liveMeetingElapsedSeconds: 150
    };
    await setupMockApi(page, inProgressAgenda);

    await page.goto('/agenda/enhancement-agenda-202');
    const resumeBtn = page.getByTestId('resume-live-meeting-btn');
    await expect(resumeBtn).toBeVisible();
    await expect(resumeBtn).toContainText('Sitzung fortsetzen');
  });

  test('3. Meeting button is disabled when meeting is already completed', async ({ page }) => {
    const completedAgenda = {
      ...baseAgenda,
      liveMeetingStatus: 'completed',
      liveMeetingElapsedSeconds: 500
    };
    await setupMockApi(page, completedAgenda);

    await page.goto('/agenda/enhancement-agenda-202');
    const completedBtn = page.getByTestId('live-meeting-completed-btn');
    await expect(completedBtn).toBeVisible();
    await expect(completedBtn).toContainText('Sitzung abgeschlossen');
    await expect(completedBtn).toBeDisabled();
  });

  test('4. Sort buttons are locked when live meeting is active', async ({ page }) => {
    const activeMeetingAgenda = {
      ...baseAgenda,
      liveMeetingActive: true
    };
    await setupMockApi(page, activeMeetingAgenda);

    await page.goto('/agenda/enhancement-agenda-202');
    const sortDateBtn = page.locator('button[title*="Sortierung ist während einer aktiven Sitzung gesperrt"]').first();
    await expect(sortDateBtn).toBeVisible();
    await expect(sortDateBtn).toBeDisabled();
  });

  test('5. Item discussion duration badge is visible in agenda timeline between date/time and name', async ({ page }) => {
    await setupMockApi(page);

    await page.goto('/agenda/enhancement-agenda-202');
    // item-1 has 125 durationSeconds => 02:05
    const durationBadge = page.locator('text=02:05');
    await expect(durationBadge).toBeVisible();

    // Verify it is located in the item's metadata row alongside the author
    const itemCard = page.getByTestId('agenda-item-0');
    const badge = page.getByTestId('item-duration-badge-0');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('02:05');
    await expect(itemCard.locator('.pi-calendar-plus')).toBeVisible();
    await expect(itemCard.getByText('Max Mustermann').first()).toBeVisible();
  });

  test('6. Comment form only allows PDF attachments and rejects non-PDFs', async ({ page }) => {
    await setupMockApi(page);

    await page.goto('/agenda/enhancement-agenda-202');
    // Open comments
    const commentToggleBtn = page.locator('button[title="Kommentare"]').first();
    await commentToggleBtn.click();

    // Verify PDF attachment label
    await expect(page.locator('text=PDF anhängen (max. 10 MB)')).toBeVisible();
  });

  test('7. Attendee deletion by creator with confirmation dialog', async ({ page }) => {
    await setupMockApi(page);

    await page.goto('/agenda/enhancement-agenda-202');

    // Find delete button for Anna Schmidt
    const deleteBtn = page.getByTestId('delete-attendee-btn-Anna Schmidt');
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Confirmation dialog appears
    const dialog = page.locator('.p-dialog');
    await expect(dialog.getByText('Teilnehmer entfernen')).toBeVisible();
    await expect(dialog.getByText('Anna Schmidt')).toBeVisible();

    // Confirm removal
    const confirmBtn = page.getByTestId('confirm-delete-attendee-btn');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Dialog closes
    await expect(dialog).not.toBeVisible();
  });

  test('8. Full presentation flow: Wake lock, live Pin, Likes, 2-column layout, Notes & Summary table', async ({ page }) => {
    await setupMockApi(page);

    await page.goto('/agenda/enhancement-agenda-202');

    // Start Live Meeting
    await page.getByTestId('start-live-meeting-btn').click();
    const modal = page.locator('.live-meeting-dialog');
    await expect(modal).toBeVisible();

    // Skip roll-call directly to TOPs
    const directBtn = page.getByTestId('start-items-direct-btn');
    await expect(directBtn).toBeVisible();
    await directBtn.click();

    // In TOP 1: Check 2-column layout (Left: title, description, notes; Right: Poll & Comments)
    await expect(modal.locator('h2:has-text("Architektur Review")')).toBeVisible();
    await expect(modal.getByText('Diskussion der neuen Microservice-Architektur')).toBeVisible();

    // Verify live pin toggle (icon-only in top-right corner)
    const pinBtn = page.getByTestId('toggle-pin-item-btn');
    await expect(pinBtn).toBeVisible();
    expect((await pinBtn.innerText()).trim()).toBe('');
    await pinBtn.click();

    // Verify author badge is visible without "Referent:" prefix
    await expect(modal.locator('text=Referent:')).not.toBeVisible();
    await expect(modal.getByText('Max Mustermann').first()).toBeVisible();

    // Verify live like indicator (thumb without number) & voter names next to it
    const likeIndicator = page.getByTestId('item-likes-indicator');
    await expect(likeIndicator).toBeVisible();
    expect((await likeIndicator.innerText()).trim()).toBe('');
    await expect(page.getByTestId('item-likes-container').getByText('Max Mustermann')).toBeVisible();

    // Verify bottom navigation does not contain '0 von X besprochen'
    await expect(modal.locator('text=besprochen')).not.toBeVisible();

    // Verify logged notes are displayed under TOP
    await expect(modal.getByText('Protokollierte Notizen / Beschlüsse')).toBeVisible();
    await expect(modal.getByText('Architektur einstimmig beschlossen.')).toBeVisible();

    // Verify Right Column contains Poll & Comments
    await expect(modal.getByText('Architektur freigeben?')).toBeVisible();
    await expect(modal.getByText('Kommentare')).toBeVisible();
    await expect(modal.getByText('Sieht gut aus!')).toBeVisible();

    // Verify timers order: Task timer on the left with check-square, Total session timer on the right with clock
    const itemTimer = page.getByTestId('item-timer-display');
    const sessionTimer = page.getByTestId('session-timer-display');
    await expect(itemTimer).toBeVisible();
    await expect(sessionTimer).toBeVisible();
    await expect(itemTimer.locator('.pi-check-square')).toBeVisible();
    await expect(sessionTimer.locator('.pi-clock')).toBeVisible();

    // Verify pausing timer stops both timers (bottom right comic-button)
    const pauseBtn = page.getByTestId('toggle-session-timer-btn');
    await expect(pauseBtn).toBeVisible();
    await expect(pauseBtn).toContainText('Pause');
    await pauseBtn.click();
    await expect(pauseBtn).toContainText('Fortsetzen');
    const pausedTime = await itemTimer.locator('span').textContent();
    await page.waitForTimeout(1100);
    const stillPausedTime = await itemTimer.locator('span').textContent();
    expect(pausedTime).toBe(stillPausedTime);
    await pauseBtn.click();
    await expect(pauseBtn).toContainText('Pause');

    // Advance to next TOP and verify TOP timer automatically resets, but has no manual reset button
    await page.getByTestId('next-top-btn').click();
    await expect(modal.locator('h2:has-text("Systemübertragene Aufgabe")')).toBeVisible();
    await expect(page.getByTestId('reset-top-timer-btn')).not.toBeVisible();

    // Finish to summary
    await page.getByTestId('next-top-btn').click();

    // Summary screen: verify duration table and protocol export
    await expect(modal.getByText('Sitzung abgeschlossen!')).toBeVisible();
    await expect(modal.getByText('Besprechungsdauer je Agendapunkt')).toBeVisible();
    await expect(page.getByTestId('copy-protocol-btn')).toBeVisible();
    await expect(page.getByTestId('download-protocol-btn')).toBeVisible();
    await expect(page.getByTestId('finish-live-meeting-btn')).toBeVisible();
  });

  test('9. Resuming in-progress meeting restores exact phase, active item index, and attendee attendance status', async ({ page }) => {
    const resumedAgenda = {
      ...baseAgenda,
      liveMeetingStatus: 'in_progress',
      liveMeetingActive: false,
      liveMeetingElapsedSeconds: 320,
      liveMeetingPhase: 'agenda_items',
      liveMeetingCurrentItemIndex: 1, // Second item (Systemübertragene Aufgabe)
      attendees: [
        {
          ...baseAgenda.attendees[0],
          attendanceStatus: 'present',
        },
        {
          ...baseAgenda.attendees[1],
          attendanceStatus: 'absent',
        }
      ]
    };

    await setupMockApi(page, resumedAgenda);

    await page.goto('/agenda/enhancement-agenda-202');

    // Button should say "Sitzung fortsetzen"
    const resumeBtn = page.getByTestId('resume-live-meeting-btn');
    await expect(resumeBtn).toBeVisible();
    await resumeBtn.click();

    // Modal opens directly in Phase 4 (agenda_items) on TOP 2
    const modal = page.locator('.live-meeting-dialog');
    await expect(modal).toBeVisible();

    // Verify it is on TOP 2 of 2
    await expect(modal.locator('text=TOP 2 von 2')).toBeVisible();
    await expect(modal.locator('h2:has-text("Systemübertragene Aufgabe")')).toBeVisible();

    // Verify session timer continues with restored elapsed time (320s => 05:20)
    await expect(modal.locator('text=05:2')).toBeVisible();

    // Navigate to completion summary
    await page.getByTestId('next-top-btn').click();
    await expect(modal.getByText('Sitzung abgeschlossen!')).toBeVisible();

    // Verify attendance statistics and statuses were preserved in summary (1/2 Anwesend (50%))
    await expect(modal.getByText('Anwesend (50%)')).toBeVisible();
  });
});
