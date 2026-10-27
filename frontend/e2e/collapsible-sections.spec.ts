import { test, expect } from '@playwright/test';

const STORAGE_KEY = 'flashagenda_collapsed_sections';

test.describe('FlashAgenda - Collapsible agenda sections', () => {
  const makeAgenda = (id: string, title: string) => ({
    _id: id,
    title,
    createdBy: 'user-1',
    date: new Date(Date.now() + 7 * 86400000).toISOString(),
    location: { name: 'Brauhaus am Markt, Köln', lat: 50.94, lng: 6.96 },
    isArchived: false,
    items: [
      { _id: 'item-1', title: 'Grillfest planen', author: 'Max Mustermann', createdBy: 'user-1', upvotes: [] },
      { _id: 'item-2', title: 'Kassenbericht', author: 'Anna Schmidt', createdBy: 'user-2', upvotes: [] }
    ],
    attendees: [
      { id: 'user-1', _id: 'user-1', name: 'Max Mustermann', cardColor: '#0a4b7c' },
      { id: 'user-2', _id: 'user-2', name: 'Anna Schmidt', cardColor: '#8b0000' }
    ]
  });

  const agendas: Record<string, any> = {
    'collapse-agenda-1': makeAgenda('collapse-agenda-1', 'Stammtisch Oktober'),
    'collapse-agenda-2': makeAgenda('collapse-agenda-2', 'Stammtisch November'),
    'collapse-agenda-3': { ...makeAgenda('collapse-agenda-3', 'Ohne Details'), date: undefined, location: undefined },
    'collapse-agenda-4': makeAgenda('collapse-agenda-4', 'Straßenfest')
  };

  const achievements = {
    dynamicLeaders: [],
    personalAchievements: [
      { id: 'first_item_created', title: 'Agenda-Impulsgeber', description: 'Ersten Punkt erstellt', unlocked: true, progress: 1, target: 1, icon: 'mdi-lightbulb' }
    ],
    milestonesUnlocked: 0,
    totalMilestones: 0
  };

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/**', async (route: any) => {
      const url = route.request().url();
      if (url.includes('/achievements')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(achievements) });
      } else if (url.includes('/audits') || url.includes('/user-agendas')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      } else if (url.includes('/user-stats')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ agendasCount: 2, totalItemsContributed: 1 }) });
      } else {
        const id = Object.keys(agendas).find((key) => url.includes(key)) || 'collapse-agenda-1';
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(agendas[id]) });
      }
    });

    await page.addInitScript(() => {
      const user = JSON.stringify({ id: 'user-1', _id: 'user-1', name: 'Max Mustermann' });
      localStorage.setItem('flashagenda_last_user', user);
      localStorage.setItem('flashagenda_collapse-agenda-1_user', user);
      localStorage.setItem('flashagenda_collapse-agenda-2_user', user);
      localStorage.setItem('flashagenda_collapse-agenda-3_user', user);
      localStorage.setItem('flashagenda_collapse-agenda-4_user', user);
    });
  });

  // Content that disappears when a section is collapsed
  const sectionContent = (page: any) => ({
    // Exact match: the collapsed summary also contains the location, but as part of a longer text
    details: page.getByText('Brauhaus am Markt, Köln', { exact: true }).first(),
    attendees: page.locator('h3:has-text("Personen")').locator('xpath=ancestor::div[contains(@class,"mb-4")][1]').getByText('Anna Schmidt').first(),
    // Scoped to the banner: the unlock toast shows the same title outside the section
    achievements: page.locator('h3:has-text("Agenda-Erfolge")').locator('xpath=ancestor::div[contains(@class,"relative")][1]').getByText('Agenda-Impulsgeber').first(),
    items: page.getByTestId('agenda-item-0')
  });

  const headings: Record<string, string> = {
    details: 'Details',
    attendees: 'Personen',
    achievements: 'Agenda-Erfolge & Wanderpokale',
    items: 'Agendapunkte'
  };

  test('1. all sections are expanded on the first visit', async ({ page }) => {
    await page.goto('/agenda/collapse-agenda-1');
    const content = sectionContent(page);
    for (const id of Object.keys(headings)) {
      await expect(page.getByTestId(`collapse-toggle-${id}`)).toHaveAttribute('aria-expanded', 'true');
      await expect(content[id as keyof typeof content]).toBeVisible();
    }
  });

  test('2. each section collapses and expands, heading stays visible', async ({ page }) => {
    await page.goto('/agenda/collapse-agenda-1');
    const content = sectionContent(page);

    for (const [id, heading] of Object.entries(headings)) {
      const toggle = page.getByTestId(`collapse-toggle-${id}`);
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(content[id as keyof typeof content]).toBeHidden();
      await expect(page.locator('h3', { hasText: heading })).toBeVisible();

      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(content[id as keyof typeof content]).toBeVisible();
    }
  });

  test('3. collapsing details keeps the title; collapsing items keeps the counter', async ({ page }) => {
    await page.goto('/agenda/collapse-agenda-1');

    await page.getByTestId('collapse-toggle-details').click();
    await expect(page.locator('h1', { hasText: 'Stammtisch Oktober' })).toBeVisible();
    await expect(page.locator('.leaflet-container')).toHaveCount(0);

    await page.getByTestId('collapse-toggle-items').click();
    await expect(page.getByText('0/2 besprochen')).toBeVisible();
    await expect(page.locator('button[title="Nach Bewertung sortieren"]')).toHaveCount(0);
  });

  test('4. sections are independent', async ({ page }) => {
    await page.goto('/agenda/collapse-agenda-1');
    const content = sectionContent(page);

    await page.getByTestId('collapse-toggle-achievements').click();
    await expect(content.achievements).toBeHidden();
    await expect(content.details).toBeVisible();
    await expect(content.attendees).toBeVisible();
    await expect(content.items).toBeVisible();
  });

  test('5. state survives a reload and applies to other agendas', async ({ page }) => {
    await page.goto('/agenda/collapse-agenda-1');
    await page.getByTestId('collapse-toggle-attendees').click();
    await page.getByTestId('collapse-toggle-details').click();

    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), STORAGE_KEY);
    expect(stored).toMatchObject({ attendees: true, details: true });

    await page.reload();
    await expect(page.getByTestId('collapse-toggle-attendees')).toHaveAttribute('aria-expanded', 'false');
    await expect(sectionContent(page).attendees).toBeHidden();

    await page.goto('/agenda/collapse-agenda-2');
    await expect(page.locator('h1', { hasText: 'Stammtisch November' })).toBeVisible();
    await expect(page.getByTestId('collapse-toggle-details')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('collapse-toggle-attendees')).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('collapse-toggle-items')).toHaveAttribute('aria-expanded', 'true');
  });

  test('7. each section heading has its icon, expanded and collapsed', async ({ page }) => {
    const icons: Record<string, string> = {
      details: 'mdi-card-text-outline',
      attendees: 'mdi-account-group',
      achievements: 'mdi-trophy',
      items: 'mdi-format-list-checks'
    };
    await page.goto('/agenda/collapse-agenda-1');

    for (const [id, icon] of Object.entries(icons)) {
      // Icon sits right before the heading, outside of the h3
      const heading = page.locator('h3', { hasText: headings[id] });
      const iconEl = heading.locator('xpath=preceding-sibling::i[1]');
      await expect(iconEl).toHaveClass(new RegExp(`\\b${icon}\\b`));
      await expect(iconEl).toHaveAttribute('aria-hidden', 'true');
      await expect(iconEl).toBeVisible();

      await page.getByTestId(`collapse-toggle-${id}`).click();
      await expect(iconEl).toBeVisible();
    }

    await expect(page.locator('h3', { hasText: 'Personen' })).toHaveText('Personen');
  });

  test('8. clicking a heading toggles exactly that section', async ({ page }) => {
    await page.goto('/agenda/collapse-agenda-1');
    const content = sectionContent(page);

    for (const id of Object.keys(headings)) {
      const heading = page.getByTestId(`section-heading-${id}`);
      const toggle = page.getByTestId(`collapse-toggle-${id}`);
      expect(await heading.evaluate((el: Element) => getComputedStyle(el).cursor)).toBe('pointer');

      await heading.locator('h3').click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(content[id as keyof typeof content]).toBeHidden();
      // Other sections stay expanded
      for (const other of Object.keys(headings).filter((o) => o !== id)) {
        await expect(page.getByTestId(`collapse-toggle-${other}`)).toHaveAttribute('aria-expanded', 'true');
      }

      // Clicking the icon works the same way
      await heading.locator('i.mdi').click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(content[id as keyof typeof content]).toBeVisible();
    }
  });

  test('9. other controls in the items heading row do not toggle', async ({ page }) => {
    await page.goto('/agenda/collapse-agenda-1');
    const toggle = page.getByTestId('collapse-toggle-items');

    await page.getByText('0/2 besprochen').click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await page.locator('button[title="Nach Bewertung sortieren"]').click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByTestId('agenda-item-0')).toBeVisible();
  });

  test('10. collapsed sections show a subtle summary, expanded ones do not', async ({ page }) => {
    await page.goto('/agenda/collapse-agenda-1');
    for (const id of ['details', 'attendees', 'achievements', 'items']) {
      await expect(page.getByTestId(`section-summary-${id}`)).toHaveCount(0);
    }

    for (const id of Object.keys(headings)) {
      await page.getByTestId(`collapse-toggle-${id}`).click();
    }

    await expect(page.getByTestId('section-summary-details')).toHaveText(/^\d{2}\.\d{2}\.\d{4} · \d{2}:\d{2} · Brauhaus am Markt, Köln$/);
    await expect(page.getByTestId('section-summary-attendees')).toHaveText('2 Personen');
    await expect(page.getByTestId('section-summary-achievements')).toHaveText('1 von 1 Erfolgen');
    // Agendapunkte keep only their progress counter
    await expect(page.getByTestId('section-summary-items')).toHaveCount(0);
    await expect(page.getByText('0/2 besprochen')).toBeVisible();

    // Subtle: no border and no background
    const style = await page.getByTestId('section-summary-attendees').evaluate((el: Element) => {
      const cs = getComputedStyle(el);
      return { border: cs.borderTopWidth, bg: cs.backgroundColor };
    });
    expect(style.border).toBe('0px');
    expect(style.bg).toBe('rgba(0, 0, 0, 0)');

    // Clicking the summary does not toggle
    await page.getByTestId('section-summary-attendees').click();
    await expect(page.getByTestId('collapse-toggle-attendees')).toHaveAttribute('aria-expanded', 'false');
  });

  test('11. details summary without date and location', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, JSON.stringify({ details: true })), STORAGE_KEY);
    await page.goto('/agenda/collapse-agenda-3');
    await expect(page.getByTestId('section-summary-details')).toHaveText('Noch keine Details');
  });

  test('12. summaries truncate on small screens without horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.addInitScript((key) => localStorage.setItem(key, JSON.stringify({ details: true, attendees: true, achievements: true, items: true })), STORAGE_KEY);
    await page.goto('/agenda/collapse-agenda-1');

    for (const id of ['details', 'attendees', 'achievements']) {
      await expect(page.getByTestId(`section-summary-${id}`)).toBeVisible();
      await expect(page.getByTestId(`collapse-toggle-${id}`)).toBeInViewport({ ratio: 1 });
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('13. title and section headings use the Bangers comic font, other texts do not', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, JSON.stringify({ details: true })), STORAGE_KEY);
    await page.goto('/agenda/collapse-agenda-1');
    const fontOf = (locator: any) => locator.evaluate((el: Element) => getComputedStyle(el).fontFamily);

    expect(await fontOf(page.locator('h1', { hasText: 'Stammtisch Oktober' }))).toContain('Bangers');
    for (const heading of Object.values(headings)) {
      expect(await fontOf(page.locator('h3', { hasText: heading }))).toContain('Bangers');
    }
    expect(await fontOf(page.getByTestId('section-summary-details'))).not.toContain('Bangers');
    expect(await fontOf(page.getByText('0/2 besprochen'))).not.toContain('Bangers');
  });

  test('14. ß in the title is shown as SS, the edit dialog keeps the original', async ({ page }) => {
    await page.goto('/agenda/collapse-agenda-4');
    await expect(page.locator('h1')).toHaveText('StraSSenfest');

    await page.getByRole('button', { name: 'Edit Title' }).click();
    await expect(page.locator('.p-dialog input').first()).toHaveValue('Straßenfest');
  });

  test('6. invalid stored data falls back to expanded sections', async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, '{kaputt'), STORAGE_KEY);
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/agenda/collapse-agenda-1');
    for (const id of Object.keys(headings)) {
      await expect(page.getByTestId(`collapse-toggle-${id}`)).toHaveAttribute('aria-expanded', 'true');
    }
    expect(errors).toEqual([]);
  });
});
