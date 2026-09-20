import { test, expect } from '@playwright/test';

test.describe('FlashAgenda - Multi-Device Presentation Live Sync', () => {
  const baseAgenda = {
    _id: 'sync-agenda-303',
    title: 'Multi-Device Synchronisation Test',
    description: 'Test für plattformübergreifende Echtzeitsitzungen',
    date: new Date().toISOString(),
    isArchived: false,
    liveMeetingActive: true,
    liveMeetingStatus: 'in_progress',
    liveMeetingPhase: 'agenda_items',
    liveMeetingCurrentItemIndex: 0,
    liveMeetingElapsedSeconds: 45,
    liveMeetingPaused: false,
    items: [
      {
        _id: 'item-top-1',
        title: 'Architektur & Sync-Konzept',
        description: 'Vorstellung der neuen Socket.io Synchronisation.',
        author: 'Max Mustermann',
        createdBy: 'user-1',
        durationSeconds: 30,
        completed: false,
        pinned: true,
        upvotes: ['user-1'],
        comments: [
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
        _id: 'item-top-2',
        title: 'Protokollierung & Roll-Call',
        description: 'Live-Notizen und Anwesenheit.',
        author: 'Anna Schmidt',
        createdBy: 'user-2',
        durationSeconds: 0,
        completed: false,
        pinned: false,
        upvotes: []
      }
    ],
    attendees: [
      {
        id: 'user-1',
        name: 'Max Mustermann',
        email: 'max@flashagenda.de',
        cardColor: '#0a4b7c',
        attendanceStatus: 'present'
      },
      {
        id: 'user-2',
        name: 'Anna Schmidt',
        email: 'anna@flashagenda.de',
        cardColor: '#8b0000',
        attendanceStatus: 'present'
      }
    ]
  };

  const setupMock = async (page: any, initialAgenda = baseAgenda) => {
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
      } else if (method === 'PATCH' || method === 'PUT') {
        const postData = route.request().postDataJSON();
        agendaState = { ...agendaState, ...postData };
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(agendaState) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(agendaState) });
      }
    });

    await page.addInitScript(() => {
      const identifiedUser = {
        id: 'user-2',
        _id: 'user-2',
        name: 'Anna Schmidt',
        email: 'anna@flashagenda.de'
      };
      localStorage.setItem('flashagenda_last_user', JSON.stringify(identifiedUser));
      localStorage.setItem('flashagenda_sync-agenda-303_user', JSON.stringify(identifiedUser));
    });
  };

  test('1. Auto-joins active meeting, displays LIVE badge, and allows re-joining via banner after exit', async ({ page }) => {
    await setupMock(page);
    await page.goto('/agenda/sync-agenda-303');

    // Dialog auto-opens because liveMeetingActive is true
    const dialog = page.locator('.live-meeting-dialog');
    await expect(dialog).toBeVisible();

    // Verify correct item is loaded (Architektur & Sync-Konzept)
    await expect(page.locator('h2', { hasText: 'Architektur & Sync-Konzept' })).toBeVisible();

    // Close meeting dialog to return to agenda view
    await page.getByTestId('close-live-meeting-btn').click();
    await expect(dialog).not.toBeVisible();

    // Verify live meeting banner is now visible on the agenda page
    const liveBanner = page.getByTestId('live-meeting-active-banner');
    await expect(liveBanner).toBeVisible();
    await expect(liveBanner).toContainText('Live-Sitzung ist aktiv');
    await expect(liveBanner).toContainText('Architektur & Sync-Konzept');

    // Click banner to rejoin live meeting
    await page.getByTestId('join-live-meeting-banner-btn').click();
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('session-timer-display')).toBeVisible();
  });

  test('2. Pausing the live meeting updates state, shows PAUSIERT badge, and toggles button', async ({ page }) => {
    await setupMock(page);
    await page.goto('/agenda/sync-agenda-303');

    // Dialog auto-opens
    const dialog = page.locator('.live-meeting-dialog');
    await expect(dialog).toBeVisible();

    // Toggle pause
    const pauseBtn = page.getByTestId('toggle-session-timer-btn');
    await expect(pauseBtn).toBeVisible();
    await expect(pauseBtn).toContainText('Pause');

    await pauseBtn.click();

    // Now paused badge should appear
    const pausedIndicator = page.getByTestId('paused-indicator');
    await expect(pausedIndicator).toBeVisible();
    await expect(pausedIndicator).toContainText('PAUSIERT');
    await expect(pauseBtn).toContainText('Fortsetzen');

    // Resume again
    await pauseBtn.click();
    await expect(pausedIndicator).not.toBeVisible();
    await expect(pauseBtn).toContainText('Pause');
  });

  test('3. Live protocol note added during meeting appears immediately in decisions list', async ({ page }) => {
    await setupMock(page);
    await page.goto('/agenda/sync-agenda-303');

    const dialog = page.locator('.live-meeting-dialog');
    await expect(dialog).toBeVisible();

    // Verify existing decision note is displayed
    await expect(page.locator('text=Architektur einstimmig beschlossen')).toBeVisible();

    // Enter new note
    const noteInput = page.locator('textarea[placeholder*="Kurzen Beschluss oder Notiz"]');
    await expect(noteInput).toBeVisible();
    await noteInput.fill('Zusätzlicher Beschluss: WebSocket-Synchronisation freigegeben.');

    const saveNoteBtn = page.locator('button:has-text("Speichern")');
    await expect(saveNoteBtn).toBeEnabled();
    await saveNoteBtn.click();

    // Verify note is saved and added to the list
    await expect(page.locator('text=WebSocket-Synchronisation freigegeben')).toBeVisible();
  });

  test('4. Responsive mobile display on Pixel 7 (412x915) and iPhone (390x844)', async ({ page }) => {
    // Test Pixel 7 viewport
    await page.setViewportSize({ width: 412, height: 915 });
    await setupMock(page);
    await page.goto('/agenda/sync-agenda-303');

    const dialog = page.locator('.live-meeting-dialog');
    await expect(dialog).toBeVisible();

    // Ensure session timer is visible on mobile
    await expect(page.getByTestId('session-timer-display')).toBeVisible();

    // Close meeting and check mobile banner
    await page.getByTestId('close-live-meeting-btn').click();
    await expect(dialog).not.toBeVisible();

    const banner = page.getByTestId('live-meeting-active-banner');
    await expect(banner).toBeVisible();

    // Test iPhone dimensions
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(banner).toBeVisible();
    await page.getByTestId('join-live-meeting-banner-btn').click();
    await expect(dialog).toBeVisible();
  });

  test('5. Completely new unauthenticated visitor must identify before joining live meeting', async ({ page }) => {
    let agendaState = JSON.parse(JSON.stringify(baseAgenda));

    await page.route('**/api/**', async (route: any) => {
      const url = route.request().url();
      if (url.includes('/audits') || url.includes('/audit-log')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      } else if (url.includes('/user-stats')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ agendasCount: 1, totalItemsContributed: 2 }) });
      } else if (url.includes('/user-agendas')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([agendaState]) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(agendaState) });
      }
    });

    // Completely new user: no localStorage credentials
    await page.goto('/agenda/sync-agenda-303');

    // Live Meeting dialog must NOT auto-open for unauthenticated users
    const dialog = page.locator('.live-meeting-dialog');
    await expect(dialog).not.toBeVisible();

    // User identification dialog MUST be shown first
    const identifyPrompt = page.locator('text=Wer bist du?');
    await expect(identifyPrompt).toBeVisible();

    // After user identifies, the currently running live presentation MUST automatically open
    const nameInput = page.locator('input[placeholder="Dein Name"]');
    await nameInput.fill('Erika Musterfrau');
    await page.locator('.p-inputgroup button .pi-check').click();

    // Live Meeting dialog opens automatically now that the user is identified!
    await expect(dialog).toBeVisible();
    await expect(page.locator('h2', { hasText: 'Architektur & Sync-Konzept' })).toBeVisible();
  });

  test('6. Resuming an agenda continues item timer from where it was left off (not 0)', async ({ page }) => {
    const pausedAgenda = {
      ...baseAgenda,
      liveMeetingPaused: true,
      liveMeetingCurrentItemElapsedSeconds: 42,
      liveMeetingElapsedSeconds: 95,
      items: [
        {
          ...baseAgenda.items[0],
          durationSeconds: 42,
        },
        baseAgenda.items[1],
      ]
    };
    await setupMock(page, pausedAgenda);
    await page.goto('/agenda/sync-agenda-303');

    const dialog = page.locator('.live-meeting-dialog');
    await expect(dialog).toBeVisible();

    // Check item timer display
    const itemTimer = page.getByTestId('item-timer-display');
    await expect(itemTimer).toBeVisible();
    // Must show 00:42, NOT 00:00!
    await expect(itemTimer).toContainText('00:4');

    // Also check session timer
    const sessionTimer = page.getByTestId('session-timer-display');
    await expect(sessionTimer).toBeVisible();
    await expect(sessionTimer).toContainText('01:3'); // 95s is 01:35
  });

  test('7. Server-authoritative timer continuously advances and does not jump backwards', async ({ page }) => {
    const runningAgenda = {
      ...baseAgenda,
      liveMeetingPaused: false,
      liveMeetingStartedAt: new Date(Date.now() - 20000).toISOString(),
      liveMeetingItemStartedAt: new Date(Date.now() - 10000).toISOString(),
      liveMeetingElapsedSeconds: 0,
      liveMeetingCurrentItemElapsedSeconds: 0,
    };
    await setupMock(page, runningAgenda);
    await page.goto('/agenda/sync-agenda-303');

    const dialog = page.locator('.live-meeting-dialog');
    await expect(dialog).toBeVisible();

    const itemTimer = page.getByTestId('item-timer-display');
    await expect(itemTimer).toBeVisible();

    const parseTimerText = async () => {
      const text = await itemTimer.innerText();
      const match = text.match(/(\d+):(\d+)/);
      if (!match) return 0;
      return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    };

    const initialSec = await parseTimerText();
    expect(initialSec).toBeGreaterThanOrEqual(10);

    // Wait 2.5 seconds: timer must advance monotonically
    await page.waitForTimeout(2500);
    const midSec = await parseTimerText();
    expect(midSec).toBeGreaterThan(initialSec);

    // Wait another 2.5 seconds: timer must continue advancing without jumping back
    await page.waitForTimeout(2500);
    const finalSec = await parseTimerText();
    expect(finalSec).toBeGreaterThan(midSec);
  });
});
