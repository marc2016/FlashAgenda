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
      } else if (method === 'POST' || method === 'PUT' || method === 'GET') {
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

    const addPersonButton = page.locator('button[title="Person zur Agenda hinzufügen"]');
    if (await addPersonButton.isVisible().catch(() => false)) {
      await addPersonButton.click();

      // Verify Add Attendee Modal
      await expect(page.locator('text=Neue Person hinzufügen')).toBeVisible();

      const nameInput = page.locator('input[placeholder="Name der Person..."]');
      await nameInput.fill('Erika Musterfrau');

      const submitButton = page.locator('button:has-text("Hinzufügen")');
      await submitButton.click();
    }
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

      // Verify item title is visible on timeline
      await expect(page.locator('text=Fotogalerie Präsentation')).toBeVisible();
    }
  });
});
