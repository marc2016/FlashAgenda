import { test, expect } from '@playwright/test';

const STANDARD_ITEMS = [
  { systemKey: 'welcome', title: 'Begrüßung' },
  { systemKey: 'next_meeting', title: 'Neuer Termin' },
  { systemKey: 'location', title: 'Location' }
];

test.describe('FlashAgenda - Standardpunkte (Begrüßung, Neuer Termin, Location)', () => {
  const baseAgenda = {
    _id: 'standard-items-agenda-303',
    title: 'Stammtisch',
    date: new Date(Date.now() + 7 * 86400000).toISOString(),
    time: '19:00',
    createdBy: 'user-1',
    includeStandardItems: false,
    liveMeetingActive: false,
    liveMeetingStatus: 'not_started',
    isManuallyClosed: false,
    items: [
      {
        _id: 'item-1',
        title: 'Beliebter Punkt',
        author: 'Anna Schmidt',
        createdBy: 'user-2',
        createdAt: '2026-10-01T18:00:00.000Z',
        completed: false,
        pinned: false,
        upvotes: ['user-1', 'user-2']
      }
    ],
    attendees: [
      { id: 'user-1', _id: 'user-1', name: 'Max Mustermann', cardColor: '#0a4b7c' },
      { id: 'user-2', _id: 'user-2', name: 'Anna Schmidt', cardColor: '#8b0000' }
    ]
  };

  // Mirrors the server-side applyStandardItems behaviour
  const applyStandardItems = (agenda: any, enabled: boolean) => {
    const items = agenda.items || [];
    if (enabled) {
      const missing = STANDARD_ITEMS
        .filter((std) => !items.some((i: any) => i.systemKey === std.systemKey))
        .map((std) => ({
          _id: `sys-${std.systemKey}`,
          ...std,
          author: 'System',
          createdBy: 'system',
          pinned: true,
          completed: false,
          upvotes: [],
          createdAt: new Date().toISOString()
        }));
      agenda.items = [...missing, ...items];
    } else {
      agenda.items = items.filter((i: any) => !i.systemKey);
    }
  };

  const setupMockApi = async (page: any, user: { id: string; name: string }, initialAgenda: any = baseAgenda) => {
    let agendaState = JSON.parse(JSON.stringify(initialAgenda));

    await page.route('**/api/**', async (route: any) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes('/audits') || url.includes('/audit-log')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      } else if (url.includes('/user-stats')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ agendasCount: 1, totalItemsContributed: 1 }) });
      } else if (url.includes('/user-agendas')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([agendaState]) });
      } else if (method === 'PUT') {
        const postData = route.request().postDataJSON() || {};
        const toggled = postData.includeStandardItems !== undefined &&
          !!postData.includeStandardItems !== !!agendaState.includeStandardItems;
        agendaState = { ...agendaState, ...postData };
        if (toggled) applyStandardItems(agendaState, !!postData.includeStandardItems);
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(agendaState) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(agendaState) });
      }
    });

    await page.addInitScript((u: { id: string; name: string }) => {
      const stored = JSON.stringify({ id: u.id, _id: u.id, name: u.name });
      localStorage.setItem('flashagenda_last_user', stored);
      localStorage.setItem('flashagenda_standard-items-agenda-303_user', stored);
    }, user);
  };

  test('1. Creator enables standard items, they appear first and belong to System', async ({ page }) => {
    await setupMockApi(page, { id: 'user-1', name: 'Max Mustermann' });
    await page.goto('/agenda/standard-items-agenda-303');

    const setting = page.getByTestId('standard-items-setting');
    await expect(setting).toContainText('Standardpunkte: Aus');
    await setting.click();
    await expect(setting).toContainText('Standardpunkte: An');

    for (const [idx, std] of STANDARD_ITEMS.entries()) {
      const card = page.getByTestId(`agenda-item-${idx}`);
      await expect(card).toContainText(std.title);
      await expect(card.getByText('System').first()).toBeVisible();
    }
    await expect(page.getByTestId('agenda-item-3')).toContainText('Beliebter Punkt');
  });

  test('2. Standard items stay on top when sorting by rating', async ({ page }) => {
    const enabledAgenda = JSON.parse(JSON.stringify({ ...baseAgenda, includeStandardItems: true }));
    applyStandardItems(enabledAgenda, true);
    await setupMockApi(page, { id: 'user-1', name: 'Max Mustermann' }, enabledAgenda);
    await page.goto('/agenda/standard-items-agenda-303');

    await page.locator('button[title="Nach Bewertung sortieren"]').click();

    await expect(page.getByTestId('agenda-item-0')).toContainText('Begrüßung');
    await expect(page.getByTestId('agenda-item-1')).toContainText('Neuer Termin');
    await expect(page.getByTestId('agenda-item-2')).toContainText('Location');
    await expect(page.getByTestId('agenda-item-3')).toContainText('Beliebter Punkt');
  });

  test('3. Disabling removes the standard items again', async ({ page }) => {
    const enabledAgenda = JSON.parse(JSON.stringify({ ...baseAgenda, includeStandardItems: true }));
    applyStandardItems(enabledAgenda, true);
    await setupMockApi(page, { id: 'user-1', name: 'Max Mustermann' }, enabledAgenda);
    await page.goto('/agenda/standard-items-agenda-303');

    page.once('dialog', (dialog) => dialog.accept());
    const setting = page.getByTestId('standard-items-setting');
    await setting.click();

    await expect(setting).toContainText('Standardpunkte: Aus');
    await expect(page.getByTestId('agenda-item-0')).toContainText('Beliebter Punkt');
    await expect(page.getByTestId('agenda-item-1')).toHaveCount(0);
  });

  test('4. Non-creator cannot toggle the setting', async ({ page }) => {
    await setupMockApi(page, { id: 'user-2', name: 'Anna Schmidt' });
    await page.goto('/agenda/standard-items-agenda-303');

    const setting = page.getByTestId('standard-items-setting');
    await expect(setting).toContainText('Standardpunkte: Aus');
    await expect(setting.locator('button[title="Nur der Ersteller kann die Standardpunkte ändern"]')).toBeDisabled();
    await setting.click();
    await expect(setting).toContainText('Standardpunkte: Aus');
    await expect(page.getByTestId('agenda-item-1')).toHaveCount(0);
  });
});
