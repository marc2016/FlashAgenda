import { test, expect } from '@playwright/test';

test.describe('FlashAgenda - Agenda Interactions & Controls', () => {
  let mockAgenda: any;

  test.beforeEach(async ({ page }) => {
    mockAgenda = {
      _id: 'mock-agenda-interact-101',
      title: 'Strategy Summit 2026',
      date: '2026-09-20T10:00:00.000Z',
      time: '10:00',
      location: { name: 'Berlin Tech Campus', lat: 52.52, lng: 13.405 },
      attendees: [
        {
          id: 'user-sam-1',
          name: 'Sam Fisher',
          email: 'sam@echelon.com',
          cardColor: '#1e293b',
          securityCode: '9999'
        }
      ],
      items: [
        {
          _id: 'item-alpha',
          title: 'Q4 Budget & Forecast',
          description: 'Finanzplanung und Budgetprüfung',
          author: 'Sam Fisher',
          createdBy: 'user-sam-1',
          completed: false,
          pinned: false,
          upvotes: []
        },
        {
          _id: 'item-beta',
          title: 'Infrastructure Upgrade',
          description: 'Server Migration auf v3.7',
          author: 'Sam Fisher',
          createdBy: 'user-sam-1',
          completed: true,
          pinned: true,
          upvotes: ['user-sam-1']
        }
      ]
    };

    // Route mocks
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes('/user-stats')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ agendasCount: 1, totalItemsContributed: 2 }) });
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
        const body = route.request().postDataJSON();
        mockAgenda = { ...mockAgenda, ...body };
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAgenda) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAgenda) });
      }
    });

    // Seed localStorage current user
    await page.addInitScript(() => {
      const user = {
        id: 'user-sam-1',
        name: 'Sam Fisher',
        email: 'sam@echelon.com',
        cardColor: '#1e293b',
        securityCode: '9999'
      };
      localStorage.setItem('flashagenda_last_user', JSON.stringify(user));
      localStorage.setItem('flashagenda_mock-agenda-interact-101_user', JSON.stringify(user));
    });
  });

  test('should toggle item completed status via marker click', async ({ page }) => {
    await page.goto('/agenda/mock-agenda-interact-101');

    // Verify initial item titles are visible
    await expect(page.getByText('Q4 Budget & Forecast')).toBeVisible();

    // Toggle completion on item-alpha
    const completeBtn = page.locator('button[title="Als besprochen markieren"], span[title="Als besprochen markieren"]').first();
    await expect(completeBtn).toBeVisible();
    await completeBtn.click();

    // After toggle, title changes to 'Als noch nicht besprochen markieren'
    const uncompleteBtn = page.locator('button[title="Als noch nicht besprochen markieren"], span[title="Als noch nicht besprochen markieren"]');
    await expect(uncompleteBtn.first()).toBeVisible();
  });

  test('should toggle pinning on an agenda item', async ({ page }) => {
    await page.goto('/agenda/mock-agenda-interact-101');

    // Find pin button for unpinned item
    const pinBtn = page.locator('button[title="Agendapunkt anpinnen"]').first();
    await expect(pinBtn).toBeVisible();
    await pinBtn.click();

    // Verify pin state changes to unpin
    await expect(page.locator('button[title="Anpinnung aufheben"]').first()).toBeVisible();
  });

  test('should upvote and remove upvote on an agenda item', async ({ page }) => {
    await page.goto('/agenda/mock-agenda-interact-101');

    // Find upvote button on item-alpha (not yet upvoted)
    const upvoteBtn = page.locator('button[title="Daumen hoch"]').first();
    await expect(upvoteBtn).toBeVisible();
    await upvoteBtn.click();

    // Now it should show "Daumen zurücknehmen"
    const removeVoteBtn = page.locator('button[title="Daumen zurücknehmen"]');
    await expect(removeVoteBtn.first()).toBeVisible();
  });

  test('should allow editing agenda title in-place', async ({ page }) => {
    await page.goto('/agenda/mock-agenda-interact-101');

    // Click edit pencil next to title
    const editTitleBtn = page.locator('button[aria-label="Edit Title"]');
    await expect(editTitleBtn).toBeVisible();
    await editTitleBtn.click();

    // Title input should appear in the modal dialog
    const titleInput = page.locator('.p-dialog input.comic-input');
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Global Strategy Summit 2027');

    // Click Speichern
    const saveBtn = page.locator('.p-dialog button:has-text("Speichern")');
    await saveBtn.click();

    // Verify updated title on the page
    await expect(page.locator('h1:has-text("Global Strategy Summit 2027")')).toBeVisible();
  });

  test('should open duplicate new agenda modal from top action bar', async ({ page }) => {
    await page.goto('/agenda/mock-agenda-interact-101');

    // Click plus button in header capsule (visible on either desktop or mobile)
    const newAgendaBtn = page.locator('button[title*="Neue Agenda"]:visible').first();
    await expect(newAgendaBtn).toBeVisible();
    await newAgendaBtn.click();

    // Verify Neue Agenda erstellen Dialog
    const createDialog = page.locator('.p-dialog:has-text("Neue Agenda erstellen")');
    await expect(createDialog).toBeVisible();
    await expect(createDialog.getByText('Sam Fisher')).toBeVisible();

    // Close Dialog
    await createDialog.locator('.p-dialog-header-close').click();
    await expect(createDialog).toBeHidden();
  });
});
