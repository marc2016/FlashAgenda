import { test, expect } from '@playwright/test';

test.describe('FlashAgenda - Admin & Governance', () => {
  test.beforeEach(async ({ page }) => {
    const mockAgendasList = [
      {
        _id: 'agenda-1',
        title: 'Team Sync Alpha',
        isArchived: false,
        items: [],
        attendees: [{ name: 'Max' }],
        updatedAt: '2026-07-31T12:00:00.000Z'
      },
      {
        _id: 'agenda-2',
        title: 'Projekt Review Beta',
        isArchived: true,
        items: [],
        attendees: [{ name: 'Erika' }],
        updatedAt: '2026-07-30T10:00:00.000Z'
      }
    ];

    await page.route('**/api/agendas/user-agendas**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/api/admin/agendas**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAgendasList)
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

  test('should open Admin modal and reject incorrect password', async ({ page }) => {
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

  test('should accept correct password and navigate to Admin Dashboard', async ({ page }) => {
    await page.goto('/');

    const adminButton = page.locator('button[title="Admin-Verwaltung"]');
    await adminButton.click();

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('flashagenda-admin');

    const loginSubmit = page.locator('button:has-text("Anmelden")');
    await loginSubmit.click();

    // Verify navigation to /admin
    await expect(page).toHaveURL('/admin');
  });

  test('should display list of agendas in Admin Dashboard when authenticated', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('flashagenda_admin_token', 'mock-admin-jwt-token');
    });

    await page.goto('/admin');

    // Verify Admin Dashboard title text
    await expect(page.locator('text=FlashAgenda Admin')).toBeVisible();

    // Verify mock agendas render in list
    await expect(page.locator('text=Team Sync Alpha')).toBeVisible();
    await expect(page.locator('text=Projekt Review Beta')).toBeVisible();
  });
});
