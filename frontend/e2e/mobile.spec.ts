import { test, expect } from '@playwright/test';

test.describe('FlashAgenda - Mobile Viewport & Responsiveness', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone / Mobile viewport dimensions

  test.beforeEach(async ({ page }) => {
    const mockAgenda = {
      _id: 'mobile-agenda-123',
      title: 'Mobile Sync Agenda',
      description: 'Mobile optimierte Tagesordnung',
      isArchived: false,
      items: [
        {
          _id: 'item-m1',
          title: 'Standup Mobile Task',
          description: 'Mobiles Feedback',
          startTime: '09:00',
          durationMinutes: 15,
          completed: false,
          isPinned: true,
          likesCount: 5,
          createdBy: 'mobile-user-1'
        }
      ],
      attendees: [
        {
          id: 'mobile-user-1',
          name: 'Mobile User',
          email: 'mobile@beispiel.de',
          cardColor: '#8b0000',
          securityCode: '9999',
          secretGuid: '550e8400-e29b-41d4-a716-446655449999',
          isRegistered: true
        }
      ]
    };

    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/user-stats')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ agendasCount: 1, totalItemsContributed: 3 }) });
      } else if (url.includes('/user-agendas')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([mockAgenda]) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAgenda) });
      }
    });

    await page.addInitScript(() => {
      localStorage.setItem('flashagenda_last_user', JSON.stringify({
        id: 'mobile-user-1',
        name: 'Mobile User',
        email: 'mobile@beispiel.de',
        securityCode: '9999',
        secretGuid: '550e8400-e29b-41d4-a716-446655449999',
        cardColor: '#8b0000'
      }));
    });
  });

  test('should render Home Page cleanly on mobile viewport without horizontal scroll overflow', async ({ page }) => {
    await page.goto('/');

    // Verify Title (h1 specifically to avoid strict-mode conflict with PWA install banner)
    await expect(page.locator('h1.css-logo-text')).toBeVisible();

    const startButton = page.locator('button:has-text("AGENDA STARTEN!")');
    await expect(startButton).toBeVisible();

    // Verify mobile viewport body width does not overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('should render Agenda Detail & Person Cards responsively on mobile screen', async ({ page }) => {
    await page.goto('/agenda/mobile-agenda-123');

    // Verify Mobile agenda title
    await expect(page.locator('text=Mobile Sync Agenda')).toBeVisible();
    await expect(page.locator('text=Standup Mobile Task')).toBeVisible();

    // Open User Profile Modal on mobile
    const profileButton = page.locator('button[title="Mein Benutzerprofil & Pass"]');
    if (await profileButton.isVisible().catch(() => false)) {
      await profileButton.click();
      await expect(page.locator('.p-dialog')).toBeVisible();
    }
  });
});
