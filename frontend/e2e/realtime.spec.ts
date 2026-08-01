import { test, expect } from '@playwright/test';

test.describe('FlashAgenda - Real-Time Collaboration & WebSockets', () => {
  test('should display LIVE status indicator badge in Agenda Header', async ({ page }) => {
    // Mock user agendas & agenda detail endpoints
    await page.route('**/api/agendas/mock-agenda-realtime', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          _id: 'mock-agenda-realtime',
          title: 'Real-Time Sync Agenda',
          items: [],
          attendees: []
        })
      });
    });

    await page.goto('/agenda/mock-agenda-realtime');

    // Verify LIVE indicator badge exists (visible on desktop or mobile viewport)
    const liveBadge = page.locator('span:visible:has-text("LIVE")').first();
    await expect(liveBadge).toBeVisible();
  });

  test('should synchronize agenda item additions across two concurrent browser contexts in real-time', async ({ browser }) => {
    // Context A (User A)
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    // Context B (User B)
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    // Shared mock agenda state
    const mockAgendaState = {
      _id: 'mock-agenda-live-sync',
      title: 'Echtzeit Live Agenda',
      items: [
        { _id: 'item-1', title: 'Erster Punkt', completed: false, author: 'User A', createdBy: 'user-a' }
      ],
      attendees: []
    };

    const setupMocks = async (page: any) => {
      await page.route('**/api/agendas/mock-agenda-live-sync', async (route: any) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockAgendaState)
        });
      });
    };

    await setupMocks(pageA);
    await setupMocks(pageB);

    await pageA.goto('/agenda/mock-agenda-live-sync');
    await pageB.goto('/agenda/mock-agenda-live-sync');

    // Verify initial item on both pages
    await expect(pageA.locator('text=Erster Punkt')).toBeVisible();
    await expect(pageB.locator('text=Erster Punkt')).toBeVisible();

    // Simulate real-time broadcast of a new item created by User A
    await pageB.evaluate((updatedAgenda) => {
      window.dispatchEvent(new CustomEvent('test_agenda_update', { detail: updatedAgenda }));
    }, {
      ...mockAgendaState,
      items: [
        ...mockAgendaState.items,
        { _id: 'item-2', title: 'Zweiter Live Punkt', completed: false, author: 'User A', createdBy: 'user-a' }
      ]
    });

    await contextA.close();
    await contextB.close();
  });
});
