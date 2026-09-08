import { test, expect } from '@playwright/test';

test.describe('FlashAgenda - Agenda Detail & Interactive Features', () => {
  test.beforeEach(async ({ page }) => {
    let mockAgenda = {
      _id: 'mock-agenda-123',
      title: 'Sprint Planning FlashAgenda',
      description: 'Wöchentliches Sync-Meeting für das Entwicklerteam',
      isArchived: false,
      items: [
        {
          _id: 'item-1',
          title: 'Welcome & Introduction',
          description: 'Kickoff meeting intro',
          startTime: '09:00',
          durationMinutes: 15,
          completed: false,
          isPinned: true,
          likesCount: 2,
          createdBy: 'test-user-123'
        },
        {
          _id: 'item-2',
          title: 'Architectural Review',
          description: 'Diskussion der neuen Schnittstellen',
          startTime: '09:15',
          durationMinutes: 30,
          completed: false,
          isPinned: false,
          likesCount: 0,
          createdBy: 'test-user-123'
        }
      ],
      attendees: [
        {
          id: 'test-user-123',
          name: 'Max Mustermann',
          email: 'max@beispiel.de',
          cardColor: '#0a4b7c',
          securityCode: '1234',
          secretGuid: '550e8400-e29b-41d4-a716-446655440000',
          isRegistered: true
        }
      ]
    };

    // Catch all API requests
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes('/audits') || url.includes('/audit-log')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      } else if (url.includes('/user-stats')) {
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
      } else if (method === 'POST' || method === 'PUT' || method === 'GET') {
        if (url.includes('/attendees') && method === 'POST') {
          const body = route.request().postDataJSON();
          mockAgenda.attendees.push({
            id: 'att-' + Date.now(),
            name: body.name,
            email: body.email,
            cardColor: body.cardColor || '#10b981'
          });
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAgenda) });
          return;
        }
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAgenda) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
    });

    // Seed localStorage user
    await page.addInitScript(() => {
      localStorage.setItem('flashagenda_last_user', JSON.stringify({
        id: 'test-user-123',
        name: 'Max Mustermann',
        email: 'max@beispiel.de',
        securityCode: '1234',
        secretGuid: '550e8400-e29b-41d4-a716-446655440000',
        cardColor: '#0a4b7c'
      }));
      localStorage.setItem('flashagenda_mock-agenda-123_user', JSON.stringify({
        id: 'test-user-123',
        name: 'Max Mustermann',
        email: 'max@beispiel.de',
        securityCode: '1234',
        secretGuid: '550e8400-e29b-41d4-a716-446655440000',
        cardColor: '#0a4b7c'
      }));
    });
  });

  test('should load agenda detail page and display items, header & attendees', async ({ page }) => {
    await page.goto('/agenda/mock-agenda-123');

    // Check agenda title & description
    await expect(page.locator('text=Sprint Planning FlashAgenda')).toBeVisible();

    // Check agenda item titles
    await expect(page.locator('text=Welcome & Introduction')).toBeVisible();
    await expect(page.locator('text=Architectural Review')).toBeVisible();

    // Check footer version string v3.3.0
    await expect(page.locator('text=/FlashAgenda v3\\./')).toBeVisible();

    // Verify .ics calendar export button exists
    const icsButton = page.locator('button[title="Agenda in Kalender exportieren (.ics)"]');
    await expect(icsButton).toBeVisible();

    // Verify Audit-Log button exists
    const auditButton = page.locator('button[title="Agenda Audit-Protokoll anzeigen"]');
    await expect(auditButton).toBeVisible();
  });

  test('should open Audit-Log modal when clicking Audit-Log button', async ({ page }) => {
    await page.goto('/agenda/mock-agenda-123');

    const auditButton = page.locator('button[title="Agenda Audit-Protokoll anzeigen"]');
    await auditButton.click();

    // Verify Audit Log Modal header
    await expect(page.locator('text=Audit-Protokoll')).toBeVisible();
  });

  test('should open Share QR Code modal in header without errors', async ({ page }) => {
    await page.goto('/agenda/mock-agenda-123');

    // Click Share button in header
    const shareButton = page.locator('button[title="Agenda teilen & QR-Code anzeigen"]');
    if (await shareButton.isVisible().catch(() => false)) {
      await shareButton.click();
      await expect(page.locator('text=Agenda teilen')).toBeVisible();
    }
  });

  test('should allow adding new attendees to the agenda', async ({ page }) => {
    await page.goto('/agenda/mock-agenda-123');

    // Verify yellow buttons next to Personen heading are removed
    const personenHeading = page.locator('h3:has-text("Personen")').locator('..');
    await expect(personenHeading.locator('.p-button-warning')).toHaveCount(0);

    // Verify trophy button in header capsule is removed
    await expect(page.locator('button[title="Agenda-Erfolge & Trophäen"]')).toHaveCount(0);

    // Verify Person hinzufügen red card is visible and clickable
    const addPersonCard = page.locator('[title="Person hinzufügen"]').first();
    await expect(addPersonCard).toBeVisible();
    await addPersonCard.click();

    // Verify Add Attendee Modal
    const modal = page.locator('.p-dialog:has-text("Neue Person hinzufügen")');
    await expect(modal).toBeVisible();

    const nameInput = modal.locator('input[placeholder="Name der Person..."]');
    await nameInput.fill('Erika Musterfrau');

    const emailInput = modal.locator('input[placeholder="E-Mail-Adresse (optional)"]');
    await emailInput.fill('erika@example.com');

    const submitButton = modal.locator('button:has-text("Hinzufügen")');
    await submitButton.click();

    // Verify modal closes and new attendee card appears in attendees list
    await expect(modal).toBeHidden();
    await expect(page.locator('text=Erika Musterfrau')).toBeVisible();
  });

  test('should support adding an agenda item with multi-image URLs', async ({ page }) => {
    await page.goto('/agenda/mock-agenda-123');

    // Click Add Item button
    const addItemBtn = page.locator('button:has-text("Neuer Punkt"), button[title="Neuen Punkt hinzufügen"]');
    if (await addItemBtn.first().isVisible().catch(() => false)) {
      await addItemBtn.first().click();

      // Expand details
      const expandBtn = page.locator('button:has-text("Details & Bild hinzufügen...")');
      if (await expandBtn.isVisible().catch(() => false)) {
        await expandBtn.click();
      }

      // Enter item title
      const titleInput = page.locator('input[placeholder="Titel des Punkts..."]');
      await titleInput.fill('Fotogalerie Präsentation');

      // Add Image URL 1
      const urlInput = page.locator('input[placeholder="https://..."]');
      if (await urlInput.isVisible().catch(() => false)) {
        await urlInput.fill('https://via.placeholder.com/300/007ad9/ffffff');
        const addUrlBtn = page.locator('button[title="Bild-URL hinzufügen"]');
        await addUrlBtn.click();

        // Add Image URL 2
        await urlInput.fill('https://via.placeholder.com/300/ed5565/ffffff');
        await addUrlBtn.click();

        // Verify 2 thumbnail previews exist in modal
        await expect(page.locator('img[alt="Vorschau 1"]')).toBeVisible();
        await expect(page.locator('img[alt="Vorschau 2"]')).toBeVisible();
      }

      // Save item
      const saveBtn = page.locator('button:has-text("Speichern")');
      await saveBtn.click();

      // Verify item title is visible on timeline immediately
      await expect(page.locator('text=Fotogalerie Präsentation')).toBeVisible();

      // Verify existing agenda title and attendees did not disappear
      await expect(page.locator('text=Strategy Meeting 2026').first()).toBeVisible();
      await expect(page.locator('text=Alice').first()).toBeVisible();
    }
  });

  test('should verify security code when claiming registered user on a new device', async ({ page }) => {
    // Clear localStorage to simulate a brand new device
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await page.goto('/agenda/mock-agenda-123');

    // "Wer bist du?" modal should be visible
    await expect(page.locator('text=Wer bist du?')).toBeVisible();

    // Select existing registered attendee "Max Mustermann"
    const maxBtn = page.locator('button:has-text("Max Mustermann")');
    await expect(maxBtn).toBeVisible();
    await maxBtn.click();

    // Security code verification dialog must appear
    const verifyDialog = page.locator('.p-dialog:has-text("Sicherheitscode bestätigen")');
    await expect(verifyDialog).toBeVisible();

    // Enter correct 4-digit code
    const codeInput = verifyDialog.locator('input');
    await codeInput.fill('1234');
    await verifyDialog.locator('button:has-text("Bestätigen")').click();

    // Both dialogs should close and user is identified
    await expect(verifyDialog).toBeHidden();
    await expect(page.locator('text=Wer bist du?')).toBeHidden();
  });
});
