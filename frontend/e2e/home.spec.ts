import { test, expect } from '@playwright/test';

test.describe('FlashAgenda - Home Page & Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock user agendas endpoint
    await page.route('**/api/agendas/user-agendas**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Mock new agenda creation POST endpoint
    await page.route('**/api/agendas', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ _id: 'mock-agenda-999', title: 'Neue Agenda' })
        });
      } else {
        await route.continue();
      }
    });
  });

  test('should load Home Page and display core UI elements', async ({ page }) => {
    await page.goto('/');

    // Check header logo text
    await expect(page.locator('text=FlashAgenda')).toBeVisible();

    // Check Start Agenda Button
    const startButton = page.locator('button:has-text("AGENDA STARTEN!")');
    await expect(startButton).toBeVisible();

    // Check favicon link element
    const faviconLink = page.locator('link[rel="icon"]');
    await expect(faviconLink).toHaveAttribute('href', '/favicon.svg');
  });

  test('should create a new agenda when clicking start button', async ({ page }) => {
    await page.goto('/');

    const startButton = page.locator('button:has-text("AGENDA STARTEN!")');
    await startButton.click({ force: true });
    await expect(page).toHaveURL(/\/agenda\/mock-agenda-999/);
  });
});
