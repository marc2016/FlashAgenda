import { test, expect } from '@playwright/test';

test.describe('FlashAgenda - User Profile & Person Card', () => {
  test.beforeEach(async ({ page }) => {
    // Mock user stats and profile endpoints
    await page.route('**/api/agendas/user-stats**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ agendasCount: 3, totalItemsContributed: 12 })
      });
    });

    await page.route('**/api/agendas/user-agendas**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/api/agendas/user-profile', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // Seed user into localStorage
    await page.addInitScript(() => {
      localStorage.setItem('flashagenda_last_user', JSON.stringify({
        id: 'test-user-123',
        name: 'Max Mustermann',
        email: 'max@beispiel.de',
        securityCode: '1234',
        secretGuid: '550e8400-e29b-41d4-a716-446655440000',
        cardColor: '#0a4b7c'
      }));
    });
  });

  test('should display User Profile button and open Person Card Modal', async ({ page }) => {
    await page.goto('/');

    const profileButton = page.locator('button[title="Mein Benutzerprofil & Pass"]');
    await expect(profileButton).toBeVisible();
    await profileButton.click();

    // Verify Person Card Modal is visible
    const modalHeader = page.locator('text=Das bist du');
    await expect(modalHeader).toBeVisible();

    // Verify user name & email inside modal dialog
    await expect(page.locator('.p-dialog').getByText('Max Mustermann')).toBeAttached();
    await expect(page.locator('.p-dialog').getByText('max@beispiel.de')).toBeAttached();

    // Verify dynamic TOTP code badge exists
    const codeBadge = page.locator('text=/Code: \\d{4}/');
    await expect(codeBadge).toBeVisible();
  });

  test('should toggle QR Code transfer view on card without errors', async ({ page }) => {
    await page.goto('/');

    const profileButton = page.locator('button[title="Mein Benutzerprofil & Pass"]');
    await profileButton.click();

    // Click QR Code button on card
    const qrButton = page.locator('button[title="Person-Identität per QR-Code übertragen"]');
    await qrButton.click();

    // Verify QR Code mode active header
    await expect(page.locator('text=Geräteübertragung')).toBeVisible();

    // Verify SafeQRCode SVG element renders cleanly
    const qrSvg = page.locator('svg').first();
    await expect(qrSvg).toBeVisible();

    // Click return button
    const returnButton = page.locator('button:has-text("Zurück zur Karte")');
    await returnButton.click();
    await expect(page.locator('text=Das bist du')).toBeVisible();
  });

  test('should allow changing card color via color swatches', async ({ page }) => {
    await page.goto('/');

    const profileButton = page.locator('button[title="Mein Benutzerprofil & Pass"]');
    await profileButton.click();

    // Open Edit Modal
    const editButton = page.locator('button[title="Eigene Daten & Kartenfarbe bearbeiten"]');
    await editButton.click();

    await expect(page.locator('text=Profildaten & Kartenfarbe bearbeiten')).toBeVisible();

    // Click a color swatch
    const swatches = page.locator('div[title="Kartenfarbe wählen"]');
    await expect(swatches.first()).toBeVisible();
    await swatches.nth(1).click();

    // Click save
    const saveButton = page.locator('button:has-text("Speichern")');
    await saveButton.click();
  });
});
