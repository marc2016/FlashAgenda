import { test, expect } from '@playwright/test';

test.describe('FlashAgenda - Home Page & Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept window.fetch directly for 100% cross-browser reliability (Chromium & WebKit)
    await page.addInitScript(() => {
      const origFetch = window.fetch;
      window.fetch = async (input: any, init?: any) => {
        const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
        const method = (init?.method || 'GET').toUpperCase();
        if (url.includes('/api/agendas')) {
          if (url.includes('user-stats')) {
            return new Response(JSON.stringify({ agendasCount: 0, totalItemsContributed: 0 }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          if (url.includes('user-agendas')) {
            return new Response(JSON.stringify([]), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          if (url.includes('mock-agenda-999')) {
            return new Response(JSON.stringify({
              _id: 'mock-agenda-999',
              title: 'Neue Agenda',
              items: [],
              attendees: []
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          if (url.includes('login-by-code')) {
            return new Response(JSON.stringify({
              success: true,
              user: { id: 'u123', name: 'Max Mustermann', isRegistered: true, securityCode: '1234' }
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          if (method === 'POST') {
            return new Response(JSON.stringify({ _id: 'mock-agenda-999', title: 'Neue Agenda' }), {
              status: 201,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return origFetch(input, init);
      };
    });
  });

  test('should load Home Page and display core UI elements', async ({ page }) => {
    await page.goto('/');

    // Verify Title (h1 specifically to avoid strict-mode conflict with PWA install banner)
    await expect(page.locator('h1.css-logo-text')).toBeVisible();

    // Check Start Agenda Button
    const startButton = page.locator('button:has-text("AGENDA STARTEN!")');
    await expect(startButton).toBeVisible();

    // Check Code Login Header Button
    const codeLoginBtn = page.locator('#code-login-header-btn');
    await expect(codeLoginBtn).toBeVisible();

    // Check favicon link element
    const faviconLink = page.locator('link[rel="icon"]');
    await expect(faviconLink).toHaveAttribute('href', '/favicon.svg');
  });

  test('should create a new agenda when clicking start button', async ({ page }) => {
    await page.goto('/');

    // Dismiss PWA install banner if visible (can overlap button on very small screens)
    const dismissBtn = page.locator('[title="Schließen"]');
    if (await dismissBtn.isVisible()) {
      await dismissBtn.click();
    }

    const startButton = page.locator('#start-agenda-btn');
    await startButton.scrollIntoViewIfNeeded();
    await startButton.click();
    await expect(page).toHaveURL(/\/agenda\//, { timeout: 10000 });
  });

  test('should open code login modal and log in successfully with 4-digit code', async ({ page }) => {
    await page.goto('/');

    const codeLoginBtn = page.locator('#code-login-header-btn');
    await codeLoginBtn.scrollIntoViewIfNeeded();
    await codeLoginBtn.click({ force: true });

    // Modal should be visible
    await expect(page.locator('text=Mit Einmal-Code anmelden')).toBeVisible();

    // Fill 4-digit code
    await page.fill('#login-code-input', '1234');
    await page.click('#submit-code-login-btn');

    // Should close modal and display user agendas area
    await expect(page.locator('text=Mit Einmal-Code anmelden')).toBeHidden();
    await expect(page.locator('text=Deine Agenden')).toBeVisible();
    await expect(page.locator('text=Max Mustermann')).toBeVisible();
  });
});

test.describe('FlashAgenda - Home agenda overview grid', () => {
  const NOW = new Date('2026-11-03T12:00:00.000Z');
  const DAY = 864e5;
  const iso = (offsetMs: number) => new Date(NOW.getTime() + offsetMs).toISOString();
  const people = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `Person ${i + 1}`, cardColor: '#0a4b7c' }));

  const AGENDAS = [
    { _id: 'past', title: 'Letzte Woche', date: iso(-7 * DAY), itemCount: 2, completedCount: 1, attendees: people(1), liveMeetingStatus: 'not_started' },
    { _id: 'in10', title: 'In zehn Tagen', date: iso(10 * DAY), itemCount: 8, completedCount: 5, attendees: people(7), liveMeetingStatus: 'not_started',
      location: { name: 'Zum Hirsch', lat: 51.2277, lng: 6.7735 } },
    { _id: 'in2', title: 'In zwei Tagen', date: iso(2 * DAY), itemCount: 0, completedCount: 0, attendees: people(2), liveMeetingStatus: 'not_started', isManuallyClosed: true },
    { _id: 'nodate', title: 'Ohne Datum', itemCount: 3, completedCount: 0, attendees: people(1), liveMeetingStatus: 'not_started' },
    { _id: 'live', title: 'Laeuft gerade', date: iso(-2 * DAY), itemCount: 4, completedCount: 2, attendees: people(3), liveMeetingStatus: 'in_progress', liveMeetingActive: true },
    { _id: 'endedEarly', title: 'Frueh beendet', date: iso(7 * DAY), itemCount: 1, completedCount: 1, attendees: people(1), liveMeetingStatus: 'completed' },
    { _id: 'archived', title: 'Archiviert', date: iso(5 * DAY), itemCount: 1, completedCount: 0, attendees: people(1), liveMeetingStatus: 'not_started', isArchived: true }
  ];

  async function setup(page: any, agendas: any[]) {
    await page.clock.setFixedTime(NOW);
    await page.addInitScript((data: any[]) => {
      localStorage.setItem('flashagenda_last_user', JSON.stringify({ id: 'p0', name: 'Person 1', isRegistered: true }));
      const origFetch = window.fetch;
      window.fetch = async (input: any, init?: any) => {
        const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
        if (url.includes('/api/')) {
          const body = url.includes('user-agendas')
            ? data
            : url.includes('/api/agendas/') && !url.includes('?')
              ? { _id: 'in10', title: 'In zehn Tagen', items: [], attendees: [] }
              : [];
          return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return origFetch(input, init);
      };
    }, agendas);
    await page.goto('/');
    await expect(page.getByTestId('agenda-overview')).toBeVisible();
  }

  const cardTitles = (page: any) => page.locator('[data-testid="agenda-card"] .agenda-card-title').allTextContents();

  test('starts on "Anstehend" and filters by tab', async ({ page }) => {
    await setup(page, AGENDAS);
    await expect(page.getByTestId('agenda-tab-upcoming')).toHaveAttribute('aria-selected', 'true');
    expect(await cardTitles(page)).toEqual(['Laeuft gerade', 'In zwei Tagen', 'In zehn Tagen', 'Ohne Datum']);

    await page.getByTestId('agenda-tab-completed').click();
    expect(await cardTitles(page)).toEqual(['Frueh beendet', 'Archiviert', 'Letzte Woche']);
    await expect(page.getByTestId('agenda-tab-completed')).toContainText('3');
  });

  test('sorts all agendas: live, upcoming by date, undated, then completed', async ({ page }) => {
    await setup(page, AGENDAS);
    await page.getByTestId('agenda-tab-all').click();
    expect(await cardTitles(page)).toEqual([
      'Laeuft gerade', 'In zwei Tagen', 'In zehn Tagen', 'Ohne Datum', 'Frueh beendet', 'Archiviert', 'Letzte Woche'
    ]);
  });

  test('shows status badges, lock and archive icons', async ({ page }) => {
    await setup(page, AGENDAS);
    await page.getByTestId('agenda-tab-all').click();
    const card = (title: string) => page.getByTestId('agenda-card').filter({ hasText: title });

    await expect(card('Laeuft gerade').getByTestId('agenda-status')).toHaveText('LIVE');
    await expect(card('Letzte Woche').getByTestId('agenda-status')).toHaveText('ABGESCHLOSSEN');
    await expect(card('Frueh beendet').getByTestId('agenda-status')).toHaveText('ABGESCHLOSSEN');
    await expect(card('In zehn Tagen').getByTestId('agenda-status')).toHaveText('ANSTEHEND');
    await expect(card('Archiviert').getByTestId('agenda-status')).toHaveText('ABGESCHLOSSEN');
    await expect(card('Archiviert').getByTestId('agenda-card-archived')).toBeVisible();

    await expect(card('In zwei Tagen').getByTestId('agenda-card-lock')).toBeVisible();
    await expect(card('In zehn Tagen').getByTestId('agenda-card-lock')).toHaveCount(0);
  });

  test('card shows progress, people overflow, location, relative time and placeholder', async ({ page }) => {
    await setup(page, AGENDAS);
    const full = page.getByTestId('agenda-card').filter({ hasText: 'In zehn Tagen' });
    await expect(full.getByTestId('agenda-card-progress')).toHaveText('5/8');
    await expect(full.getByTestId('agenda-card-people').locator('> *')).toHaveCount(6);
    await expect(full.getByTestId('agenda-card-more')).toHaveText('+2');
    await expect(full.getByTestId('agenda-card-location')).toHaveText('Zum Hirsch');
    await expect(full.getByTestId('agenda-card-relative')).toHaveText('in 10 Tagen');
    await expect(full.getByTestId('agenda-card-map')).toBeVisible();

    const bare = page.getByTestId('agenda-card').filter({ hasText: 'Ohne Datum' });
    await expect(bare).toContainText('ohne Datum');
    await expect(bare.getByTestId('agenda-card-location')).toHaveCount(0);
    await expect(bare.getByTestId('agenda-card-map-placeholder')).toBeVisible();

    const empty = page.getByTestId('agenda-card').filter({ hasText: 'In zwei Tagen' });
    await expect(empty.getByTestId('agenda-card-progress')).toHaveText('0/0');
  });

  test('grid uses three columns on desktop and one on phones', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await setup(page, AGENDAS);
    await page.getByTestId('agenda-tab-all').click();
    const boxes = await page.getByTestId('agenda-card').evaluateAll((els: Element[]) =>
      els.map(e => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y) }; }));
    expect(boxes[0].y).toBe(boxes[1].y);
    expect(boxes[1].y).toBe(boxes[2].y);
    expect(boxes[3].y).toBeGreaterThan(boxes[0].y);
    expect(boxes[3].x).toBe(boxes[0].x);

    await page.setViewportSize({ width: 390, height: 844 });
    const narrow = await page.getByTestId('agenda-card').evaluateAll((els: Element[]) =>
      els.map(e => Math.round(e.getBoundingClientRect().x)));
    expect(new Set(narrow).size).toBe(1);
  });

  test('tapping the mini map opens the agenda and dragging does not move it', async ({ page }) => {
    await setup(page, AGENDAS);
    const map = page.getByTestId('agenda-card').filter({ hasText: 'In zehn Tagen' }).getByTestId('agenda-card-map');
    await map.scrollIntoViewIfNeeded();
    await expect(map.locator('.leaflet-container')).toBeVisible();
    const pane = map.locator('.leaflet-map-pane');
    const before = await pane.getAttribute('style');
    const box = (await map.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 80, box.y + box.height / 2 - 30, { steps: 5 });
    await page.mouse.up();
    await expect(page).toHaveURL(/\/agenda\/in10$/);
    expect(before).toContain('translate3d(0px, 0px, 0px)');
  });

  test('map stays put on wheel and the card opens on click', async ({ page }) => {
    await setup(page, AGENDAS);
    const map = page.getByTestId('agenda-card').filter({ hasText: 'In zehn Tagen' }).getByTestId('agenda-card-map');
    await map.scrollIntoViewIfNeeded();
    await expect(map.locator('.leaflet-container')).toBeVisible();
    const zoomBefore = await map.locator('.leaflet-tile-container').first().getAttribute('style');
    const box = (await map.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(300);
    expect(await map.locator('.leaflet-tile-container').first().getAttribute('style')).toBe(zoomBefore);
    await map.click();
    await expect(page).toHaveURL(/\/agenda\/in10$/);
  });

  test('empty tab offers a link to "Alle"', async ({ page }) => {
    await setup(page, AGENDAS.filter(a => a._id === 'past'));
    await expect(page.getByTestId('agenda-tab-empty')).toBeVisible();
    await page.getByTestId('agenda-tab-empty-show-all').click();
    await expect(page.getByTestId('agenda-tab-all')).toHaveAttribute('aria-selected', 'true');
    expect(await cardTitles(page)).toEqual(['Letzte Woche']);
  });

  test('no agendas shows the plain hint without tabs', async ({ page }) => {
    await setup(page, []);
    await expect(page.getByText('Noch keine Agenden vorhanden.')).toBeVisible();
    await expect(page.getByTestId('agenda-tab-all')).toHaveCount(0);
  });
});
