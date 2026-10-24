import { test, expect } from '@playwright/test';

const COMIC_RED = 'rgb(183, 28, 28)';

test.describe('FlashAgenda - Presentation Panels Layout', () => {
  const longText = Array.from({ length: 30 }, (_, i) => `Absatz ${i + 1} mit etwas Text zur Diskussion.`).join('\n\n');

  const baseAgenda = {
    _id: 'panels-agenda-404',
    title: 'Stammtisch Panels',
    date: new Date().toISOString(),
    location: { name: 'Brauhaus am Markt, Köln', lat: 50.94, lng: 6.96 },
    isArchived: false,
    liveMeetingActive: true,
    liveMeetingStatus: 'in_progress',
    liveMeetingPhase: 'agenda_items',
    liveMeetingCurrentItemIndex: 0,
    liveMeetingCurrentAttendeeIndex: 0,
    liveMeetingElapsedSeconds: 30,
    liveMeetingPaused: false,
    items: [
      {
        _id: 'item-1',
        title: 'Architektur & Sync-Konzept',
        description: 'Diskussion der neuen **Microservice**-Architektur.',
        author: 'Max Mustermann',
        createdBy: 'user-1',
        durationSeconds: 0,
        completed: false,
        pinned: false,
        upvotes: ['user-1', 'user-2'],
        poll: {
          question: 'Architektur freigeben?',
          options: [
            { id: 'opt-1', text: 'Ja', votes: ['user-1'] },
            { id: 'opt-2', text: 'Nein', votes: [] }
          ]
        },
        comments: [
          { id: 'c-1', author: 'Anna Schmidt', createdBy: 'user-2', text: 'Sieht gut aus!', createdAt: new Date().toISOString() }
        ]
      },
      {
        _id: 'item-2',
        title: 'Sehr langer Punkt',
        description: longText,
        author: 'Anna Schmidt',
        createdBy: 'user-2',
        durationSeconds: 0,
        completed: false,
        pinned: false,
        upvotes: []
      }
    ],
    attendees: [
      { id: 'user-1', _id: 'user-1', name: 'Max Mustermann', email: 'max@flashagenda.de', cardColor: '#0a4b7c', attendanceStatus: 'present', lastSeen: new Date().toISOString() },
      { id: 'user-2', _id: 'user-2', name: 'Anna Schmidt', cardColor: '#8b0000', attendanceStatus: 'present' }
    ]
  };

  const setupMock = async (page: any, overrides: Record<string, unknown> = {}) => {
    let agendaState = JSON.parse(JSON.stringify({ ...baseAgenda, ...overrides }));

    await page.route('**/api/**', async (route: any) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes('/audits') || url.includes('/audit-log')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      } else if (url.includes('/user-stats')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ agendasCount: 1, totalItemsContributed: 1 }) });
      } else if (url.includes('/user-agendas')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([agendaState]) });
      } else if (method === 'PATCH' || method === 'PUT') {
        const postData = route.request().postDataJSON() || {};
        agendaState = { ...agendaState, ...postData };
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(agendaState) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(agendaState) });
      }
    });

    await page.addInitScript(() => {
      const user = JSON.stringify({ id: 'user-1', _id: 'user-1', name: 'Max Mustermann' });
      localStorage.setItem('flashagenda_last_user', user);
      localStorage.setItem('flashagenda_panels-agenda-404_user', user);
    });
  };

  const openPresentation = async (page: any) => {
    await page.goto('/agenda/panels-agenda-404');
    const dialog = page.locator('.live-meeting-dialog');
    await expect(dialog).toBeVisible();
    return dialog;
  };

  const expectNoHorizontalScroll = async (page: any) => {
    const overflow = await page.evaluate(() => {
      const main = document.querySelector('.live-meeting-dialog main') as HTMLElement | null;
      const doc = document.documentElement;
      return {
        main: main ? main.scrollWidth - main.clientWidth : 0,
        doc: doc.scrollWidth - doc.clientWidth
      };
    });
    expect(overflow.main).toBeLessThanOrEqual(0);
    expect(overflow.doc).toBeLessThanOrEqual(0);
  };

  test('1. Presentation stage is opaque comic red, other dialogs keep their look', async ({ page }) => {
    await setupMock(page);
    const dialog = await openPresentation(page);

    const maskColor = await page.locator('.live-meeting-mask').evaluate((el: Element) => getComputedStyle(el).backgroundColor);
    const dialogColor = await dialog.evaluate((el: Element) => getComputedStyle(el).backgroundColor);
    expect(maskColor).toBe(COMIC_RED);
    expect(dialogColor).toBe(COMIC_RED);

    // The quick-jump drawer is a regular dialog and must not inherit the red stage
    await page.getByTestId('open-all-tops-drawer-btn').click();
    const drawer = page.locator('.p-dialog.glass-panel').filter({ hasText: 'Alle Agendapunkte' });
    await expect(drawer).toBeVisible();
    const drawerColor = await drawer.evaluate((el: Element) => getComputedStyle(el).backgroundColor);
    expect(drawerColor).not.toBe(COMIC_RED);
  });

  test('2. Top bar shows labelled TOP and Gesamt timers', async ({ page }) => {
    await setupMock(page);
    await openPresentation(page);

    await expect(page.getByTestId('item-timer-display')).toContainText('TOP');
    await expect(page.getByTestId('session-timer-display')).toContainText('Gesamt');
  });

  test('3. Description renders markdown, likes are labelled, votes are declined', async ({ page }) => {
    await setupMock(page);
    const dialog = await openPresentation(page);

    await expect(dialog.locator('strong', { hasText: 'Microservice' })).toBeVisible();
    await expect(dialog.getByText('**Microservice**')).toHaveCount(0);

    await expect(page.getByTestId('item-likes-container')).toContainText('Daumen hoch von:');

    await expect(dialog.getByText('1 Stimme (100%)')).toBeVisible();
    await expect(dialog.getByText('0 Stimmen (0%)')).toBeVisible();
  });

  test('4. Person cards hide empty fields and decline item counts', async ({ page }) => {
    await setupMock(page, { liveMeetingPhase: 'roll_call_summary' });
    const dialog = await openPresentation(page);

    await expect(dialog.getByText('Anwesenheits-Übersicht')).toBeVisible();
    await expect(dialog.getByText('Keine E-Mail')).toHaveCount(0);
    await expect(dialog.getByText('Unbekannt')).toHaveCount(0);
    // Max has email and lastSeen, Anna has neither
    await expect(dialog.getByText('max@flashagenda.de')).toBeVisible();
    await expect(dialog.getByText('Zuletzt online')).toHaveCount(1);
    await expect(dialog.getByText('1 Punkt', { exact: true })).toHaveCount(2);
    await expectNoHorizontalScroll(page);
  });

  test('5. Mobile: controls stay in view on a long topic and nothing overflows', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setupMock(page, { liveMeetingCurrentItemIndex: 1 });
    await openPresentation(page);
    await expect(page.locator('h2', { hasText: 'Sehr langer Punkt' })).toBeVisible();

    const nextBtn = page.getByTestId('next-top-btn');
    await expect(nextBtn).toBeInViewport({ ratio: 1 });
    const box = await nextBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    await expectNoHorizontalScroll(page);

    // Panels keep the 16px gutter like the agenda page
    const panelBox = await page.locator('.live-meeting-dialog .comic-panel-dark').first().boundingBox();
    expect(Math.round(panelBox!.x)).toBe(16);
  });

  test('6. Mobile: focused note field is not covered by the sticky controls', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setupMock(page, { liveMeetingCurrentItemIndex: 1 });
    await openPresentation(page);

    const note = page.locator('textarea[placeholder*="Kurzen Beschluss oder Notiz"]');
    await note.scrollIntoViewIfNeeded();
    await note.focus();

    const noteBox = await note.boundingBox();
    const controlsBox = await page.getByTestId('live-item-controls').boundingBox();
    expect(noteBox).not.toBeNull();
    expect(controlsBox).not.toBeNull();
    const overlaps = noteBox!.y + noteBox!.height > controlsBox!.y && noteBox!.y < controlsBox!.y + controlsBox!.height;
    expect(overlaps).toBe(false);
  });

  test('7. Smallest phones: no horizontal scroll in any phase', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    for (const phase of ['intro', 'roll_call_step', 'roll_call_summary', 'agenda_items', 'summary']) {
      await page.unrouteAll();
      await setupMock(page, { liveMeetingPhase: phase });
      await openPresentation(page);
      await expectNoHorizontalScroll(page);
    }
  });
});
