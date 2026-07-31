import { test, expect } from '@playwright/test';

test.describe('FlashAgenda - Agenda Detail & Item Operations', () => {
  test.beforeEach(async ({ page }) => {
    const mockAgenda = {
      _id: 'mock-agenda-123',
      title: 'Sprint Planning FlashAgenda',
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

      if (url.includes('/user-stats')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ agendasCount: 2, totalItemsContributed: 5 }) });
      } else if (url.includes('/user-agendas')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([mockAgenda]) });
      } else if (url.includes('/user-profile')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      } else if (method === 'POST' || method === 'PUT' || method === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAgenda) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
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

  test('should load agenda detail page and display items & attendees', async ({ page }) => {
    await page.goto('/agenda/mock-agenda-123');

    // Check agenda title
    await expect(page.locator('text=Sprint Planning FlashAgenda')).toBeVisible();

    // Check agenda item title
    await expect(page.locator('text=Welcome & Introduction')).toBeVisible();

    // Check footer version string v3.0.3
    await expect(page.locator('text=/FlashAgenda v3\\.0\\./')).toBeVisible();

    // Verify .ics calendar export button exists
    const icsButton = page.locator('button[title="Agenda in Kalender exportieren (.ics)"]');
    await expect(icsButton).toBeVisible();

    // Verify Audit-Log button exists
    const auditButton = page.locator('button[title="Agenda Audit-Protokoll anzeigen"]');
    await expect(auditButton).toBeVisible();
  });
});
