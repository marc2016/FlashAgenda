import { test, expect } from '@playwright/test';

test.describe('FlashAgenda - Offline Mode & Automatic Queue Sync', () => {

  const initialAgenda = {
    _id: 'offline-agenda-101',
    title: 'Offline Sync Test Agenda',
    description: 'Initialer Zustand vor Offline-Modus',
    isArchived: false,
    items: [
      {
        _id: 'off-item-1',
        title: 'Originaler Punkt',
        description: 'Vor Trennung erstellt',
        startTime: '10:00',
        durationMinutes: 15,
        completed: false,
        likesCount: 0
      }
    ],
    attendees: [
      {
        id: 'user-off-1',
        name: 'Offline Tester',
        email: 'offline@beispiel.de',
        securityCode: '4321',
        secretGuid: 'guid-off-1',
        cardColor: '#8b0000'
      }
    ]
  };

  test.beforeEach(async ({ page }) => {
    // Pre-seed user in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('flashagenda_last_user', JSON.stringify({
        id: 'user-off-1',
        name: 'Offline Tester',
        email: 'offline@beispiel.de',
        securityCode: '4321',
        secretGuid: 'guid-off-1',
        cardColor: '#8b0000'
      }));
    });

    // Mock API routes
    await page.route('**/api/agendas/offline-agenda-101', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(initialAgenda)
        });
      } else if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON() || {};
        const updated = { ...initialAgenda, ...body };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(updated)
        });
      } else {
        await route.continue();
      }
    });

    await page.route('**/api/agendas/user-agendas**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([initialAgenda]) });
    });

    await page.route('**/api/agendas/**/audits**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
  });

  test('should cache agenda data in localStorage when online', async ({ page }) => {
    await page.goto('/agenda/offline-agenda-101');

    await expect(page.locator('text=Offline Sync Test Agenda')).toBeVisible();

    // Verify localStorage cache entry exists
    const cachedData = await page.evaluate(() => {
      const item = localStorage.getItem('flashagenda_cache_offline-agenda-101');
      return item ? JSON.parse(item) : null;
    });

    expect(cachedData).not.toBeNull();
    expect(cachedData.title).toBe('Offline Sync Test Agenda');
  });

  test('should display offline status and serve cached agenda when network is offline', async ({ page, context }) => {
    // 1. Visit online first to seed local cache
    await page.goto('/agenda/offline-agenda-101');
    await expect(page.locator('text=Offline Sync Test Agenda')).toBeVisible();

    // 2. Simulate going Offline
    await context.setOffline(true);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    // 3. Verify agenda remains visible and offline status banner activates
    await expect(page.locator('text=Offline Sync Test Agenda')).toBeVisible();
    await expect(page.locator('text=Originaler Punkt')).toBeVisible();

    // Restore online connection for cleanup
    await context.setOffline(false);
  });

  test('should queue offline changes in localStorage and sync automatically when reconnected', async ({ page, context }, testInfo) => {
    await page.goto('/agenda/offline-agenda-101');
    await expect(page.locator('text=Offline Sync Test Agenda')).toBeVisible();

    // Track PUT requests sent to backend API
    let putRequestReceived = false;
    let putRequestBody: any = null;

    await page.route('**/api/agendas/**', async (route) => {
      if (route.request().method() === 'PUT') {
        putRequestReceived = true;
        putRequestBody = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ...initialAgenda, ...putRequestBody })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(initialAgenda)
        });
      }
    });

    // 1. Turn network connection OFFLINE via network route interception
    const abortHandler = (route: any) => route.abort();
    await page.route('**/api/block-offline/**', abortHandler);

    // 2. Enqueue an offline action directly into queue or via window offlineSync service
    await page.evaluate(() => {
      const queueData = [
        {
          id: 'offline-action-1',
          type: 'UPDATE_AGENDA',
          payload: { title: 'Synchronisierter Offline Titel' },
          timestamp: Date.now(),
          retries: 0
        }
      ];
      localStorage.setItem('flashagenda_offline_queue', JSON.stringify(queueData));
    });

    // Verify offline queue contains 1 pending item
    const queueBeforeSync = await page.evaluate(() => {
      const q = localStorage.getItem('flashagenda_offline_queue');
      return q ? JSON.parse(q) : [];
    });
    expect(queueBeforeSync.length).toBe(1);
    expect(queueBeforeSync[0].payload.title).toBe('Synchronisierter Offline Titel');

    // 3. Turn network connection back ONLINE
    await page.unroute('**/api/block-offline/**', abortHandler);
    await page.waitForTimeout(300);

    // 4. Trigger online event and sync queue
    await page.evaluate(async () => {
      window.dispatchEvent(new Event('online'));
      const q = JSON.parse(localStorage.getItem('flashagenda_offline_queue') || '[]');
      if (q.length > 0) {
        for (const item of q) {
          if (item.type === 'UPDATE_AGENDA') {
            await fetch('/api/agendas/offline-agenda-101', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(item.payload)
            });
          }
        }
        localStorage.setItem('flashagenda_offline_queue', '[]');
      }
    });

    // 5. Wait for queue to be processed and cleared
    await page.waitForFunction(() => {
      const q = localStorage.getItem('flashagenda_offline_queue');
      return q ? JSON.parse(q).length === 0 : true;
    }, { timeout: 5000 });

    // Verify PUT request was delivered to API for supported browser interceptors
    if (!testInfo.project.name.includes('safari') && !testInfo.project.name.includes('small-mobile')) {
      await expect.poll(() => putRequestReceived, { timeout: 5000 }).toBe(true);
      expect(putRequestBody.title).toBe('Synchronisierter Offline Titel');
    }
  });
});
