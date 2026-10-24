import { test, expect } from '@playwright/test';

test.describe('FlashAgenda - Follow-up agenda from presentation summary', () => {
  const baseAgenda = {
    _id: 'follow-up-agenda-505',
    title: 'Stammtisch Oktober',
    date: new Date().toISOString(),
    createdBy: 'user-1',
    isArchived: false,
    includeStandardItems: true,
    liveMeetingActive: true,
    liveMeetingStatus: 'in_progress',
    liveMeetingPhase: 'summary',
    liveMeetingCurrentItemIndex: 0,
    liveMeetingElapsedSeconds: 60,
    liveMeetingPaused: false,
    items: [
      { _id: 'sys-welcome', title: 'Begrüßung', systemKey: 'welcome', author: 'System', createdBy: 'system', pinned: true, upvotes: [] },
      { _id: 'item-1', title: 'Grillfest planen', author: 'Max Mustermann', createdBy: 'user-1', pinned: true, upvotes: ['user-2'], completed: true },
      { _id: 'item-2', title: 'Kassenbericht', author: 'Anna Schmidt', createdBy: 'user-2', pinned: false, upvotes: [] }
    ],
    attendees: [
      { id: 'user-1', _id: 'user-1', name: 'Max Mustermann', cardColor: '#0a4b7c', attendanceStatus: 'present' },
      { id: 'user-2', _id: 'user-2', name: 'Anna Schmidt', cardColor: '#8b0000', attendanceStatus: 'absent' }
    ]
  };

  const setupMock = async (page: any, overrides: Record<string, unknown> = {}) => {
    let agendaState = JSON.parse(JSON.stringify({ ...baseAgenda, ...overrides }));
    const createdPayloads: any[] = [];
    const updatePayloads: any[] = [];

    await page.route('**/api/**', async (route: any) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes('/audits') || url.includes('/audit-log')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      } else if (url.includes('/user-stats')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ agendasCount: 1, totalItemsContributed: 1 }) });
      } else if (url.includes('/user-agendas')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([agendaState]) });
      } else if (method === 'POST' && /\/api\/agendas\/?$/.test(new URL(url).pathname)) {
        createdPayloads.push(route.request().postDataJSON());
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ _id: 'new-agenda-777' }) });
      } else if (method === 'PATCH' || method === 'PUT') {
        const postData = route.request().postDataJSON() || {};
        updatePayloads.push(postData);
        agendaState = { ...agendaState, ...postData };
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(agendaState) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(agendaState) });
      }
    });

    await page.addInitScript(() => {
      const user = JSON.stringify({ id: 'user-1', _id: 'user-1', name: 'Max Mustermann' });
      localStorage.setItem('flashagenda_last_user', user);
      localStorage.setItem('flashagenda_follow-up-agenda-505_user', user);
      // Record new tabs instead of opening them
      (window as any).__openedUrls = [];
      window.open = ((url?: string | URL, target?: string) => {
        (window as any).__openedUrls.push({ url: String(url), target });
        return null;
      }) as typeof window.open;
    });

    return { createdPayloads, updatePayloads };
  };

  const checkboxFor = (dialog: any, label: string) =>
    dialog.locator('div.cursor-pointer', { hasText: label }).locator('input[type="checkbox"]');

  const openFromSummary = async (page: any) => {
    await page.goto('/agenda/follow-up-agenda-505');
    const live = page.locator('.live-meeting-dialog');
    await expect(live.getByText('Sitzung abgeschlossen!')).toBeVisible();
    await page.getByTestId('create-follow-up-agenda-btn').click();
    const dialog = page.locator('.p-dialog:has-text("Neue Agenda erstellen")');
    await expect(dialog).toBeVisible();
    return { live, dialog };
  };

  test('a) opens the create dialog with all people and pinned items preselected', async ({ page }) => {
    await setupMock(page);
    const { dialog } = await openFromSummary(page);

    await expect(checkboxFor(dialog, 'Max Mustermann')).toBeChecked();
    await expect(checkboxFor(dialog, 'Anna Schmidt')).toBeChecked();
    await expect(checkboxFor(dialog, 'Grillfest planen')).toBeChecked();
    await expect(checkboxFor(dialog, 'Kassenbericht')).not.toBeChecked();
    // System standard items are not offered for copying, the setting is preselected instead
    await expect(dialog.getByText('Begrüßung', { exact: true })).toHaveCount(0);
    await expect(dialog.locator('#new-include-standard-items')).toBeChecked();
  });

  test('b) an item pinned during the session is preselected', async ({ page }) => {
    await setupMock(page, { liveMeetingPhase: 'agenda_items', liveMeetingCurrentItemIndex: 2 });
    await page.goto('/agenda/follow-up-agenda-505');
    await expect(page.locator('h2', { hasText: 'Kassenbericht' })).toBeVisible();

    await page.getByTestId('toggle-pin-item-btn').click();
    // Last item: "Abhaken & Beenden" leads to the summary
    await page.getByTestId('next-top-btn').click();
    await expect(page.locator('.live-meeting-dialog').getByText('Sitzung abgeschlossen!')).toBeVisible();

    await page.getByTestId('create-follow-up-agenda-btn').click();
    const dialog = page.locator('.p-dialog:has-text("Neue Agenda erstellen")');
    await expect(checkboxFor(dialog, 'Kassenbericht')).toBeChecked();
  });

  test('c) confirming creates the agenda, opens a new tab and keeps the summary open', async ({ page }) => {
    const { createdPayloads, updatePayloads } = await setupMock(page);
    const { live, dialog } = await openFromSummary(page);

    await dialog.getByRole('button', { name: 'Neue Agenda erstellen' }).click();
    await expect(dialog).toBeHidden();

    expect(createdPayloads).toHaveLength(1);
    const payload = createdPayloads[0];
    expect(payload.title).toBe('Stammtisch Oktober');
    expect(payload.includeStandardItems).toBe(true);
    expect(payload.createdBy).toBe('user-1');
    expect(payload.attendees.map((a: any) => a.name)).toEqual(['Max Mustermann', 'Anna Schmidt']);
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]).toMatchObject({ title: 'Grillfest planen', author: 'System', createdBy: 'system', completed: false, upvotes: [] });

    const opened = await page.evaluate(() => (window as any).__openedUrls);
    expect(opened).toEqual([{ url: '/agenda/new-agenda-777', target: '_blank' }]);

    await expect(live.getByText('Sitzung abgeschlossen!')).toBeVisible();
    expect(updatePayloads.some((p) => p.liveMeetingStatus === 'completed')).toBe(false);
  });

  test('d) cancelling creates nothing', async ({ page }) => {
    const { createdPayloads } = await setupMock(page);
    const { live, dialog } = await openFromSummary(page);

    await dialog.getByRole('button', { name: 'Abbrechen' }).click();
    await expect(dialog).toBeHidden();
    expect(createdPayloads).toHaveLength(0);
    await expect(live.getByText('Sitzung abgeschlossen!')).toBeVisible();
  });

  test('e) the action bar on the agenda page sends the same payload', async ({ page }) => {
    const { createdPayloads } = await setupMock(page, { liveMeetingActive: false, liveMeetingStatus: 'not_started' });
    await page.goto('/agenda/follow-up-agenda-505');

    await page.locator('button[title*="Neue Agenda"]:visible').first().click();
    const dialog = page.locator('.p-dialog:has-text("Neue Agenda erstellen")');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Neue Agenda erstellen' }).click();
    await expect(dialog).toBeHidden();

    expect(createdPayloads).toHaveLength(1);
    const payload = createdPayloads[0];
    expect(payload.title).toBe('Stammtisch Oktober');
    expect(payload.includeStandardItems).toBe(true);
    expect(payload.attendees.map((a: any) => a.name)).toEqual(['Max Mustermann', 'Anna Schmidt']);
    expect(payload.items.map((i: any) => i.title)).toEqual(['Grillfest planen']);
    expect(payload.items[0].author).toBe('System');
  });
});
