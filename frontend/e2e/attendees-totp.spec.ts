import { test, expect } from '@playwright/test';

test.describe('FlashAgenda - Attendees & TOTP / Identity Features', () => {
  let mockAgenda: any;

  test.beforeEach(async ({ page }) => {
    mockAgenda = {
      _id: 'mock-agenda-attendees-99',
      title: 'Developer Sync 2026',
      attendees: [
        {
          id: 'user-max-1',
          name: 'Max Mustermann',
          email: 'max@beispiel.de',
          cardColor: '#0a4b7c',
          securityCode: '1234',
          secretGuid: '550e8400-e29b-41d4-a716-446655440000',
          isRegistered: true,
          lastSeen: new Date().toISOString()
        },
        {
          id: 'user-erika-2',
          name: 'Erika Musterfrau',
          email: 'erika@beispiel.de',
          cardColor: '#8b0000',
          securityCode: '5678',
          lastSeen: new Date().toISOString()
        }
      ],
      items: []
    };

    // Route mocks
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes('/user-stats')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ agendasCount: 2, totalItemsContributed: 5 }) });
      } else if (url.includes('/user-agendas')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([mockAgenda]) });
      } else if (url.includes('/user-profile')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      } else if (url.includes('/achievements')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            teamMilestones: [],
            personalAchievements: [],
            dynamicLeaders: [],
            milestonesUnlocked: 0,
            totalMilestones: 0
          })
        });
      } else if (method === 'PUT' || method === 'POST') {
        const postData = route.request().postDataJSON();
        if (postData?.attendees) {
          mockAgenda.attendees = postData.attendees;
        }
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAgenda) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAgenda) });
      }
    });

    // Seed localStorage current user
    await page.addInitScript(() => {
      const user = {
        id: 'user-max-1',
        name: 'Max Mustermann',
        email: 'max@beispiel.de',
        cardColor: '#0a4b7c',
        securityCode: '1234',
        secretGuid: '550e8400-e29b-41d4-a716-446655440000'
      };
      localStorage.setItem('flashagenda_last_user', JSON.stringify(user));
      localStorage.setItem('flashagenda_mock-agenda-attendees-99_user', JSON.stringify(user));
    });
  });

  test('should display dynamic TOTP countdown badge on current user card', async ({ page }) => {
    await page.goto('/agenda/mock-agenda-attendees-99');

    // Current user card has "Das bist du" banderole
    const selfCard = page.locator('div:has-text("Das bist du")').first();
    await expect(selfCard).toBeVisible();

    // Verify TOTP container with dynamic code & remaining time
    const totpBadge = selfCard.locator('[title="Dynamischer Einmalcode (TOTP)"]');
    await expect(totpBadge).toBeVisible();
    await expect(totpBadge.locator('text=/Code: \\d{4}/')).toBeVisible();
    await expect(totpBadge.locator('text=/⏱️/')).toBeVisible();
  });

  test('should allow editing own attendee data and card color', async ({ page }) => {
    await page.goto('/agenda/mock-agenda-attendees-99');

    // Click edit button on self card
    const editBtn = page.locator('button[title="Eigene Daten bearbeiten"]');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Verify Person bearbeiten Dialog
    const editDialog = page.locator('.p-dialog:has-text("Person bearbeiten")');
    await expect(editDialog).toBeVisible();

    // Change Name
    const nameInput = editDialog.locator('input').first();
    await nameInput.fill('Max Power');

    // Pick a different color swatch
    const colorSwatches = editDialog.locator('div[title="Kartenfarbe wählen"]');
    await expect(colorSwatches.first()).toBeVisible();
    await colorSwatches.nth(3).click();

    // Click Speichern
    const saveBtn = editDialog.locator('button:has-text("Speichern")');
    await saveBtn.click();

    // Modal should close and name should be updated
    await expect(editDialog).toBeHidden();
    await expect(page.locator('text=Max Power')).toBeVisible();
  });

  test('should open QR Code transfer modal when clicking transfer button on user card', async ({ page }) => {
    await page.goto('/agenda/mock-agenda-attendees-99');

    // Click QR transfer button on own card
    const qrBtn = page.locator('button[title="Person-Identität per QR-Code übertragen"]');
    await expect(qrBtn).toBeVisible();
    await qrBtn.click();

    // Verify Transfer Dialog
    const qrDialog = page.locator('.p-dialog:has-text("Identität übertragen")');
    await expect(qrDialog).toBeVisible();
    await expect(qrDialog.locator('text=Scanne diesen QR-Code mit deinem Smartphone')).toBeVisible();

    // Close Dialog
    await qrDialog.locator('.p-dialog-header-close').click();
    await expect(qrDialog).toBeHidden();
  });
});
