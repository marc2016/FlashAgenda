import { test, expect } from '@playwright/test';

test.describe('FlashAgenda - Live Meeting Mode (Sitzungsmodus mit Roll-Call & Timern)', () => {
  const mockAgenda = {
    _id: 'meeting-agenda-101',
    title: 'Quartals-Meeting Q3 FlashAgenda',
    description: 'Strategische Ausrichtung und Projekt-Reviews',
    date: new Date().toISOString(),
    isArchived: false,
    items: [
      {
        _id: 'item-top-1',
        title: 'Begrüßung & Rückblick',
        description: 'Kurzer Rückblick auf die Meilensteine des letzten Quartals.',
        author: 'Max Mustermann',
        createdBy: 'user-1',
        completed: false,
        pinned: true,
        upvotes: ['user-1', 'user-2']
      },
      {
        _id: 'item-top-2',
        title: 'Roadmap & Budget 2026',
        description: 'Vorstellung der neuen Features und Budgetfreigabe.',
        author: 'Anna Schmidt',
        createdBy: 'user-2',
        completed: false,
        pinned: false,
        upvotes: []
      }
    ],
    attendees: [
      {
        id: 'user-1',
        name: 'Max Mustermann',
        email: 'max@flashagenda.de',
        cardColor: '#0a4b7c',
        securityCode: '1111',
        secretGuid: '550e8400-e29b-41d4-a716-446655440001',
        attendanceStatus: 'unconfirmed'
      },
      {
        id: 'user-2',
        name: 'Anna Schmidt',
        email: 'anna@flashagenda.de',
        cardColor: '#8b0000',
        securityCode: '2222',
        secretGuid: '550e8400-e29b-41d4-a716-446655440002',
        attendanceStatus: 'unconfirmed'
      }
    ]
  };

  test.beforeEach(async ({ page }) => {
    let currentAgendaState = JSON.parse(JSON.stringify(mockAgenda));

    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes('/audits') || url.includes('/audit-log')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      } else if (url.includes('/user-stats')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ agendasCount: 1, totalItemsContributed: 2 }) });
      } else if (url.includes('/user-agendas')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([currentAgendaState]) });
      } else if (method === 'PUT') {
        const postData = route.request().postDataJSON();
        currentAgendaState = { ...currentAgendaState, ...postData };
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(currentAgendaState) });
      } else if (method === 'POST') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(currentAgendaState) });
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(currentAgendaState) });
      }
    });

    await page.addInitScript(() => {
      localStorage.setItem('flashagenda_last_user', JSON.stringify({
        id: 'user-1',
        name: 'Max Mustermann',
        email: 'max@flashagenda.de',
        securityCode: '1111',
        cardColor: '#0a4b7c'
      }));
      localStorage.setItem('flashagenda_meeting-agenda-101_user', JSON.stringify({
        id: 'user-1',
        name: 'Max Mustermann',
        email: 'max@flashagenda.de',
        securityCode: '1111',
        cardColor: '#0a4b7c'
      }));
    });
  });

  test('should display "Sitzung starten" button next to Agendapunkte heading', async ({ page }) => {
    await page.goto('/agenda/meeting-agenda-101');

    // Verify Agendapunkte heading
    const heading = page.locator('h3:has-text("Agendapunkte")');
    await expect(heading).toBeVisible();

    // Verify Start Button is next to Agendapunkte heading
    const startBtn = page.getByTestId('start-live-meeting-btn');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toContainText('Sitzung starten');
  });

  test('should complete entire live meeting flow: Intro -> Roll Call -> Summary -> TOPs with timers -> Completion', async ({ page }) => {
    await page.goto('/agenda/meeting-agenda-101');

    // 1. Start Live Meeting
    await page.getByTestId('start-live-meeting-btn').click();

    // Verify Intro Screen
    await expect(page.locator('.live-meeting-dialog')).toBeVisible();
    await expect(page.locator('text=FlashAgenda Live')).toBeVisible();
    await expect(page.locator('.live-meeting-dialog h1:has-text("Quartals-Meeting Q3 FlashAgenda")')).toBeVisible();
    await expect(page.locator('text=Sitzung').first()).toBeVisible();

    // 2. Start Roll Call
    const startRollCallBtn = page.getByTestId('start-rollcall-btn');
    await expect(startRollCallBtn).toBeVisible();
    await startRollCallBtn.click();

    // Person 1 (Max Mustermann) -> Confirm Present with Green button
    await expect(page.locator('text=Person 1 von 2')).toBeVisible();
    await expect(page.locator('.live-meeting-dialog').getByText('Max Mustermann').first()).toBeVisible();
    const presentBtn = page.getByTestId('attendance-present-btn');
    await expect(presentBtn).toBeVisible();
    await presentBtn.click();

    // Person 2 (Anna Schmidt) -> Mark Absent with Red button
    await expect(page.locator('text=Person 2 von 2')).toBeVisible();
    await expect(page.locator('.live-meeting-dialog').getByText('Anna Schmidt').first()).toBeVisible();
    const absentBtn = page.getByTestId('attendance-absent-btn');
    await expect(absentBtn).toBeVisible();
    await absentBtn.click();

    // 3. Roll Call Summary Screen
    await expect(page.locator('text=Anwesenheits-Übersicht')).toBeVisible();
    await expect(page.locator('text=1 Anwesend')).toBeVisible();
    await expect(page.locator('text=1 Abwesend')).toBeVisible();
    await expect(page.locator('text=Quote: 50%')).toBeVisible();

    // 4. Start Agenda Items
    const startItemsBtn = page.getByTestId('start-agenda-items-btn');
    await expect(startItemsBtn).toBeVisible();
    await startItemsBtn.click();

    // TOP 1 (Begrüßung & Rückblick)
    await expect(page.locator('text=TOP 1 von 2')).toBeVisible();
    await expect(page.locator('.live-meeting-dialog h2:has-text("Begrüßung & Rückblick")')).toBeVisible();
    await expect(page.locator('text=Kurzer Rückblick auf die Meilensteine')).toBeVisible();

    // Mark TOP 1 as completed
    const toggleCompleteBtn = page.getByTestId('toggle-item-complete-btn');
    await expect(toggleCompleteBtn).toBeVisible();
    await toggleCompleteBtn.click();
    await expect(toggleCompleteBtn).toContainText('Besprochen');

    // Go to next TOP
    const nextTopBtn = page.getByTestId('next-top-btn');
    await nextTopBtn.click();

    // TOP 2 (Roadmap & Budget 2026)
    await expect(page.locator('text=TOP 2 von 2')).toBeVisible();
    await expect(page.locator('.live-meeting-dialog h2:has-text("Roadmap & Budget 2026")')).toBeVisible();

    // Finish Meeting (Last Item)
    await page.getByTestId('next-top-btn').click();

    // 5. Completion Screen
    await expect(page.locator('text=Sitzung abgeschlossen!')).toBeVisible();
    await expect(page.locator('text=Sitzungsdauer')).toBeVisible();

    // Return to main agenda view
    const returnBtn = page.getByTestId('return-from-meeting-btn');
    await expect(returnBtn).toBeVisible();
    await returnBtn.click();

    // Verify modal is closed and back on agenda page
    await expect(page.locator('h3:has-text("Agendapunkte")')).toBeVisible();
  });

  test('should render properly on mobile viewport (iPhone dimensions 390x844)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/agenda/meeting-agenda-101');

    // Start Live Meeting on mobile
    const startBtn = page.getByTestId('start-live-meeting-btn');
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // Verify Title & Roll Call on mobile
    await expect(page.locator('text=FlashAgenda Live')).toBeVisible();
    await page.getByTestId('start-rollcall-btn').click();

    // Interact with green attendance button on mobile
    await expect(page.getByTestId('attendance-present-btn')).toBeVisible();
    await page.getByTestId('attendance-present-btn').click();

    // Close button works
    await page.getByTestId('close-live-meeting-btn').click();
    await expect(page.locator('h3:has-text("Agendapunkte")')).toBeVisible();
  });
});
