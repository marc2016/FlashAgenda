import { test, expect } from '@playwright/test';

test.describe('FlashAgenda - Gamification & Achievements System', () => {
  const mockUserId = 'test-user-achieve-123';
  const mockUserName = 'Super Mario';

  const mockGlobalAchievements = {
    achievements: [
      {
        id: 'creator_first',
        title: 'Pionier',
        description: 'Erste eigene Agenda ins Leben gerufen',
        category: 'creation',
        icon: '⚡️',
        target: 1,
        xp: 50,
        current: 1,
        unlocked: true,
        progressPercent: 100
      },
      {
        id: 'items_10',
        title: 'Ideenfeuerwerk',
        description: '10 Agendapunkte insgesamt beigesteuert',
        category: 'contributions',
        icon: '🚀',
        target: 10,
        xp: 100,
        current: 12,
        unlocked: true,
        progressPercent: 100
      },
      {
        id: 'items_25',
        title: 'Task-Titan',
        description: '25 Agendapunkte insgesamt beigesteuert',
        category: 'contributions',
        icon: '📋',
        target: 25,
        xp: 250,
        current: 12,
        unlocked: false,
        progressPercent: 48
      },
      {
        id: 'security_totp',
        title: 'Fort Knox',
        description: 'Mit Sicherheits-PIN oder dynamischem TOTP-Code geschützt',
        category: 'identity',
        icon: '🔐',
        target: 1,
        xp: 100,
        current: 1,
        unlocked: true,
        progressPercent: 100
      }
    ],
    unlockedCount: 3,
    totalCount: 4,
    totalXp: 250,
    rank: 'Planer',
    level: 2,
    nextRankAt: 6,
    pinnedAchievements: ['creator_first']
  };

  const mockAgendaAchievements = {
    agendaId: 'mock-agenda-ach-99',
    teamMilestones: [
      {
        id: 'all_completed',
        title: 'Mission Accomplished',
        description: '100% aller Punkte dieser Agenda wurden als erledigt markiert!',
        category: 'team_milestone',
        icon: '🏁',
        target: 1,
        xp: 100,
        current: 1,
        unlocked: true,
        progressPercent: 100
      },
      {
        id: 'full_house',
        title: 'Volles Haus',
        description: 'Mindestens 3 Teilnehmer sind in dieser Agenda anwesend',
        category: 'team_milestone',
        icon: '👥',
        target: 3,
        xp: 50,
        current: 2,
        unlocked: false,
        progressPercent: 67
      }
    ],
    personalAchievements: [
      {
        id: 'session_item_creator',
        title: 'Agenda-Impulsgeber',
        description: 'Mindestens einen Punkt zu dieser Agenda beigesteuert',
        category: 'session_personal',
        icon: 'mdi-pencil',
        target: 1,
        xp: 30,
        current: 2,
        unlocked: true,
        progressPercent: 100,
        leaderboard: [
          { userId: mockUserId, userName: mockUserName, count: 2, rank: 1, isCurrentUser: true, unlocked: true },
          { userId: 'other-user', userName: 'Luigi', count: 0, rank: 2, isCurrentUser: false, unlocked: false }
        ]
      },
      {
        id: 'session_image_uploader',
        title: 'Bild-Pionier',
        description: 'Mindestens ein Bild in dieser Agenda hochgeladen',
        category: 'session_personal',
        icon: 'mdi-image',
        target: 1,
        xp: 25,
        current: 1,
        unlocked: true,
        progressPercent: 100,
        leaderboard: [
          { userId: mockUserId, userName: mockUserName, count: 1, rank: 1, isCurrentUser: true, unlocked: true },
          { userId: 'other-user', userName: 'Luigi', count: 0, rank: 2, isCurrentUser: false, unlocked: false }
        ]
      },
      {
        id: 'session_description_added',
        title: 'Detail-Liebhaber',
        description: 'Mindestens eine Beschreibung zu einem Agendapunkt hinzugefügt',
        category: 'session_personal',
        icon: 'mdi-text-box-outline',
        target: 1,
        xp: 25,
        current: 1,
        unlocked: true,
        progressPercent: 100,
        leaderboard: [
          { userId: mockUserId, userName: mockUserName, count: 1, rank: 1, isCurrentUser: true, unlocked: true },
          { userId: 'other-user', userName: 'Luigi', count: 0, rank: 2, isCurrentUser: false, unlocked: false }
        ]
      }
    ],
    dynamicLeaders: [
      {
        id: 'leader_points',
        title: 'Punkte-König',
        description: 'Hält aktuell die meisten eingereichten Agendapunkte in dieser Agenda',
        category: 'dynamic_leader',
        icon: 'mdi-crown',
        target: 3,
        xp: 50,
        current: 3,
        unlocked: true,
        isDynamic: true,
        isCurrentUserLeader: true,
        leader: { userId: mockUserId, userName: mockUserName, count: 3 },
        gapToLeader: 0,
        leaderboard: [
          { userId: mockUserId, userName: mockUserName, count: 3, rank: 1, isCurrentUser: true, unlocked: true },
          { userId: 'other-user', userName: 'Luigi', count: 1, rank: 2, isCurrentUser: false, unlocked: true }
        ]
      },
      {
        id: 'leader_comments',
        title: 'Debatten-Champion',
        description: 'Hat aktuell die meisten Kommentare in dieser Agenda verfasst',
        category: 'dynamic_leader',
        icon: 'pi pi-comment',
        target: 5,
        xp: 50,
        current: 2,
        unlocked: false,
        isDynamic: true,
        isCurrentUserLeader: false,
        leader: { userId: 'other-user', userName: 'Luigi', count: 5 },
        gapToLeader: 3,
        leaderboard: [
          { userId: 'other-user', userName: 'Luigi', count: 5, rank: 1, isCurrentUser: false, unlocked: true },
          { userId: mockUserId, userName: mockUserName, count: 2, rank: 2, isCurrentUser: true, unlocked: true }
        ]
      },
      {
        id: 'leader_words',
        title: 'Wort-Meister',
        description: 'Hat aktuell die meisten Wörter in Agendapunkt-Beschreibungen verfasst',
        category: 'dynamic_leader',
        icon: 'mdi-book-open-variant',
        target: 1,
        xp: 50,
        current: 30,
        unlocked: true,
        isDynamic: true,
        isCurrentUserLeader: true,
        leader: { userId: mockUserId, userName: mockUserName, count: 30 },
        gapToLeader: 0,
        leaderboard: [
          { userId: mockUserId, userName: mockUserName, count: 30, rank: 1, isCurrentUser: true, unlocked: true },
          { userId: 'other-user', userName: 'Luigi', count: 12, rank: 2, isCurrentUser: false, unlocked: true }
        ]
      }
    ],
    milestonesUnlocked: 1,
    totalMilestones: 2
  };

  const mockAgendaData = {
    _id: 'mock-agenda-ach-99',
    title: 'Comic Hero Meeting',
    date: '2026-09-15T14:00:00.000Z',
    time: '14:00',
    location: { name: 'Mushroom Kingdom HQ', lat: 52.52, lng: 13.405 },
    attendees: [
      {
        id: mockUserId,
        name: mockUserName,
        email: 'mario@nintendo.com',
        cardColor: '#8b0000',
        attendanceStatus: 'present',
        pinnedAchievements: ['creator_first']
      },
      {
        id: 'other-user',
        name: 'Luigi',
        attendanceStatus: 'present',
        cardColor: '#006400'
      }
    ],
    items: [
      {
        _id: 'item-1',
        title: 'Save Peach',
        author: mockUserName,
        createdBy: mockUserId,
        completed: true
      }
    ]
  };

  test.beforeEach(async ({ context, page }) => {
    // Intercept socket.io polling to avoid connection refused logs
    await context.route(/\/socket\.io/, async (route) => {
      await route.abort();
    });

    // Intercept heartbeat pings & audits to prevent ECONNREFUSED terminal warnings
    await context.route(/\/api\/agendas\/.*\/ping/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await context.route(/\/api\/agendas\/.*\/audits/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Mock user profile & agendas APIs
    await context.route(/\/api\/agendas\/user-stats/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ agendasCount: 2, totalItemsContributed: 12 })
      });
    });

    await context.route(/\/api\/agendas\/user-agendas/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockAgendaData])
      });
    });

    await context.route(/\/api\/agendas\/user-achievements/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockGlobalAchievements)
      });
    });

    await context.route(/\/api\/agendas\/[^\/]+\/achievements/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAgendaAchievements)
      });
    });

    await context.route(/\/api\/agendas\/mock-agenda-ach-99(\?.*)?$/, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockAgendaData)
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ...mockAgendaData, ...route.request().postDataJSON() })
        });
      }
    });

    await context.route(/\/api\/agendas\/user-profile/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // Seed user in localStorage
    await page.addInitScript(({ uid, name }) => {
      const userObj = {
        id: uid,
        name: name,
        email: 'mario@nintendo.com',
        cardColor: '#8b0000',
        securityCode: '4321',
        pinnedAchievements: ['creator_first']
      };
      localStorage.setItem('flashagenda_last_user', JSON.stringify(userObj));
      localStorage.setItem('flashagenda_mock-agenda-ach-99_user', JSON.stringify(userObj));
    }, { uid: mockUserId, name: mockUserName });
  });

  test('Home page should have Trophy button and open Global Achievements Modal', async ({ page }) => {
    await page.goto('/');

    // Check trophy button in top header
    const trophyBtn = page.locator('#trophy-header-btn');
    await expect(trophyBtn).toBeVisible();
    await trophyBtn.click();

    // Verify modal opened
    const modalTitle = page.locator('text=TROPHÄENSAMMLUNG & ERFOLGE');
    await expect(modalTitle).toBeVisible();

    // Verify Rank and Level
    await expect(page.getByText('Level 2 • Planer')).toBeVisible();

    // Verify achievements are rendered
    await expect(page.getByText('Pionier').first()).toBeVisible();
    await expect(page.getByText('Ideenfeuerwerk').first()).toBeVisible();
    await expect(page.getByText('Task-Titan').first()).toBeVisible();

    // Verify filter tabs work
    const allFilter = page.locator('button:has-text("Alle")');
    await allFilter.click();
    await expect(page.getByText('Pionier').first()).toBeVisible();

    const creationFilter = page.locator('button:has-text("Erstellung")');
    await creationFilter.click();
    await expect(page.getByText('Pionier').first()).toBeVisible();

    const contributionsFilter = page.locator('button:has-text("Beiträge")');
    await contributionsFilter.click();
    await expect(page.getByText('Ideenfeuerwerk').first()).toBeVisible();

    const identityFilter = page.locator('button:has-text("Identität")');
    await identityFilter.click();
    await expect(page.getByText('Fort Knox').first()).toBeVisible();
  });

  test('Agenda Detail page should render AgendaAchievementBanner between attendees and timeline', async ({ page }) => {
    await page.goto('/agenda/mock-agenda-ach-99');

    // Verify AgendaAchievementBanner is visible
    const bannerTitle = page.locator('text=/Agenda-Erfolge & Wanderpokale/i');
    await expect(bannerTitle).toBeVisible();

    // Verify dynamic shifting leader trophies are rendered
    const punkteKoenigCard = page.locator('.border-round-xl:has-text("Punkte-König")').first();
    await expect(punkteKoenigCard).toBeVisible();
    // Dynamic leader cards must not display static "Erreicht" label
    await expect(punkteKoenigCard).not.toContainText('Erreicht');
    await expect(page.locator('text=/Hält aktuell die meisten eingereichten Agendapunkte/i').first()).toBeVisible();
    await expect(page.getByText('Debatten-Champion').first()).toBeVisible();
    await expect(page.getByText('Wort-Meister').first()).toBeVisible();
    await expect(page.getByText('Luigi').first()).toBeVisible();

    // Verify Teamerfolge (team milestones) are hidden from UI
    await expect(page.locator('text=/Gemeinsame Teamerfolge dieser Agenda/i')).toHaveCount(0);

    // Verify yellow buttons next to Personen heading are removed
    const personenHeading = page.locator('h3:has-text("Personen")').locator('..');
    await expect(personenHeading.locator('.p-button-warning')).toHaveCount(0);

    // Verify personal session achievements in banner
    await expect(page.getByText('Agenda-Impulsgeber').first()).toBeVisible();
    await expect(page.getByText('Bild-Pionier').first()).toBeVisible();
    await expect(page.getByText('Detail-Liebhaber').first()).toBeVisible();

    // Click Wanderpokal card in banner -> Opens Leaderboard Modal for this achievement!
    await page.getByText('Punkte-König').first().click();

    // Verify Leaderboard modal is open with title and participant ranking
    const leaderboardModal = page.locator('.p-dialog:has-text("Punkte-König")');
    await expect(leaderboardModal).toBeVisible();
    await expect(leaderboardModal.getByText('Rangliste')).toBeVisible();
    await expect(leaderboardModal.getByText('Super Mario', { exact: true })).toBeVisible();

    // Close leaderboard modal via header close button
    await leaderboardModal.locator('.p-dialog-header-close').click();
    await expect(leaderboardModal).toHaveCount(0);

    // Also verify clicking a personal achievement card opens the Leaderboard modal
    await page.getByText('Agenda-Impulsgeber').first().click();
    const personalModal = page.locator('.p-dialog:has-text("Agenda-Impulsgeber")');
    await expect(personalModal).toBeVisible();
    await expect(personalModal.getByText('Rangliste')).toBeVisible();
    await personalModal.locator('.p-dialog-header-close').click();
    await expect(personalModal).toHaveCount(0);

    // Verify trophy button was removed from header menu
    await expect(page.locator('button[title="Agenda-Erfolge & Trophäen"]')).toHaveCount(0);
  });

  test('Person Card should render pinned achievements and allow pinning up to 3 badges', async ({ page }) => {
    await page.goto('/agenda/mock-agenda-ach-99');

    // Verify pinned circular badge on small attendee card in attendees section
    const attendeeCard = page.locator('div:has-text("Super Mario")').first();
    await expect(attendeeCard).toBeVisible();
    const pinnedBadge = attendeeCard.locator('[data-testid="pinned-badge-creator_first"]');
    await expect(pinnedBadge).toBeVisible();

    // Clicking the circular badge opens the tooltip with title and description
    await pinnedBadge.click();
    await expect(page.getByText('Pionier').first()).toBeVisible();
    await expect(page.getByText('Erste eigene Agenda ins Leben gerufen').first()).toBeVisible();

    // Open UserProfileModal via attendee card trophy button
    const cardTrophyBtn = page.locator('button[title="Große Personenkarte & Erfolge ansehen"]');
    await cardTrophyBtn.click();

    // Verify large card view with global achievements showcase
    await expect(page.locator('text=GLOBALE TROPHÄEN')).toBeVisible();
    await expect(page.locator('text=/\\d \\/ 3 Angepinnt/')).toBeVisible();

    // Pin another achievement (Ideenfeuerwerk)
    const pinBtn = page.locator('button[title="An Personenkarte anpinnen (max. 3)"]').first();
    await expect(pinBtn).toBeVisible();
    await pinBtn.click();

    // Verify button toggles to unpin title (creator_first + items_10 now pinned)
    await expect(page.locator('button[title="Von Personenkarte entfernen"]')).toHaveCount(2);

    // Close user profile modal via bottom close button
    const closeBtn = page.locator('button:has-text("Schließen")').last();
    await closeBtn.click();
  });

  test('Responsive check on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/agenda/mock-agenda-ach-99');

    // Verify banner is rendered properly on mobile
    const bannerTitle = page.locator('text=/Agenda-Erfolge & Wanderpokale/i');
    await expect(bannerTitle).toBeVisible();

    // Click trophy card in banner -> Opens Leaderboard Modal on mobile
    await page.getByText('Punkte-König').first().click();

    // Verify modal content is visible
    const mobileLeaderboard = page.locator('.p-dialog:has-text("Punkte-König")');
    await expect(mobileLeaderboard).toBeVisible();
    await expect(mobileLeaderboard.getByText('Rangliste')).toBeVisible();
  });

  test('should display retrospective toast notifications when reloading page with newly unlocked achievements with solid dialog style and pagination', async ({ page }) => {
    // Clear seen achievements storage before initial page load (guarded by sessionStorage so subsequent reloads don't re-clear)
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('__SEEN_CLEARED__')) {
        sessionStorage.setItem('__SEEN_CLEARED__', '1');
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith('flashagenda_seen_')) {
            localStorage.removeItem(key);
          }
        }
      }
    });

    await page.goto('/agenda/mock-agenda-ach-99');

    // Verify achievement toast notification pops up retrospectively
    const toast = page.locator('.achievement-toast-enter');
    await expect(toast).toBeVisible();
    await expect(toast.locator('text=/ERFOLG FREIGESCHALTET|WANDERPOKAL ERHALTEN/i')).toBeVisible();

    // Verify toast styling: solid dialog look, no transparency
    const toastBg = await toast.evaluate(el => window.getComputedStyle(el).backgroundColor);
    expect(toastBg).toBe('rgb(31, 41, 55)'); // #1f2937 solid dark background

    const toastBorderWidth = await toast.evaluate(el => window.getComputedStyle(el).borderTopWidth);
    expect(toastBorderWidth).toBe('3px');

    // Verify close button has dialog styling and pi-times icon
    const closeBtn = toast.locator('button.dialog-header-close-btn');
    await expect(closeBtn).toBeVisible();
    await expect(closeBtn.locator('.pi.pi-times')).toBeVisible();

    // Verify close button has dialog comic styling (2px border, shadow)
    const closeBorderWidth = await closeBtn.evaluate(el => window.getComputedStyle(el).borderTopWidth);
    expect(closeBorderWidth).toBe('2px');

    // Verify pagination counter is displayed (e.g. 1/5)
    const counter = toast.locator('text=/1\\/\\d+/');
    await expect(counter).toBeVisible();

    // Click "Nächste" arrow button to advance to next achievement
    const nextBtn = toast.locator('button[title="Nächste"]');
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();

    // Verify counter updated to 2/N
    await expect(toast.locator('text=/2\\/\\d+/')).toBeVisible();

    // Click "Vorherige" arrow button to return to previous achievement
    const prevBtn = toast.locator('button[title="Vorherige"]');
    await expect(prevBtn).toBeVisible();
    await prevBtn.click();
    await expect(toast.locator('text=/1\\/\\d+/')).toBeVisible();

    // Dismiss toast via close button
    await closeBtn.click();
    await expect(toast).toHaveCount(0);

    // Subsequent reload should not display toast for already seen achievements
    await page.reload();
    await expect(page.locator('.achievement-toast-enter')).toHaveCount(0);
  });

  test('Leaderboard modal should deduplicate person when attendee joined from multiple devices', async ({ page }) => {
    // Intercept agenda achievements to return duplicated entries (simulating multi-device join)
    await page.route('**/api/agendas/mock-agenda-ach-99/achievements*', async route => {
      const cloned = JSON.parse(JSON.stringify(mockAgendaAchievements));
      // Inject duplicate entries with same person name but different IDs
      cloned.dynamicLeaders[0].leaderboard = [
        { userId: 'dev-1', userName: 'Luigi', count: 3, rank: 1, isCurrentUser: false, unlocked: true },
        { userId: 'dev-2', userName: 'Luigi', count: 2, rank: 2, isCurrentUser: false, unlocked: true },
        { userId: mockUserId, userName: mockUserName, count: 1, rank: 3, isCurrentUser: true, unlocked: true }
      ];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(cloned)
      });
    });

    await page.goto('/agenda/mock-agenda-ach-99');

    // Click on Punkte-König to open leaderboard modal
    await page.getByText('Punkte-König').first().click();

    const dialog = page.locator('.p-dialog:has-text("Punkte-König")');
    await expect(dialog).toBeVisible();

    // Luigi must appear EXACTLY ONCE in the dialog despite having 2 entries in raw data!
    await expect(dialog.getByText('Luigi', { exact: true })).toHaveCount(1);
    // Super Mario must appear EXACTLY ONCE in the list
    await expect(dialog.getByText('Super Mario', { exact: true })).toHaveCount(1);
  });
});
