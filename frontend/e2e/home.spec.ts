import { test, expect } from '@playwright/test';

test.describe('FlashAgenda - Home Page & Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock backend POST /api/agendas
    await page.route('**/api/agendas', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ _id: 'mock-agenda-999', title: 'Neue FlashAgenda', items: [], attendees: [] })
        });
      } else {
        await route.continue();
      }
    });
  });

  test('should load Home Page and display core UI elements', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/FlashAgenda/);
    const startButton = page.locator('button:has-text("AGENDA STARTEN!")');
    await expect(startButton).toBeVisible();
  });

  test('should create a new agenda when clicking start button', async ({ page }) => {
    await page.goto('/');
    const startButton = page.locator('button:has-text("AGENDA STARTEN!")');
    await startButton.click();
    await expect(page).toHaveURL(/\/agenda\/mock-agenda-999/);
  });
});
