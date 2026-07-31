import { test, expect } from '@playwright/test';

test.describe('FlashAgenda - Admin & Governance', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/agendas/user-agendas**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/api/admin/login', async (route) => {
      const body = route.request().postDataJSON() || {};
      if (body?.password === 'flashagenda-admin') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ token: 'mock-admin-jwt-token' })
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Ungültiges Passwort' })
        });
      }
    });
  });

  test('should open Admin modal and handle password verification', async ({ page }) => {
    await page.goto('/');

    // Click Admin Button on Home Page
    const adminButton = page.locator('button[title="Admin-Verwaltung"]');
    await expect(adminButton).toBeVisible();
    await adminButton.click();

    // Verify Admin Login Dialog
    await expect(page.locator('text=Administrator Anmeldung')).toBeVisible();

    // Enter incorrect password
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('wrongpassword');

    const loginSubmit = page.locator('button:has-text("Anmelden")');
    await loginSubmit.click();

    // Verify error message
    await expect(page.locator('text=Ungültiges Passwort')).toBeVisible();
  });
});
