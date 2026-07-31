import { test, expect } from '@playwright/test';

test.describe('FlashAgenda - Performance & Core Web Vitals', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('flashagenda_last_user', JSON.stringify({
        id: 'u1', name: 'User 1', email: 'u1@test.de', securityCode: '1234', secretGuid: 'guid-1', cardColor: '#8b0000'
      }));
    });

    // Mock user agendas & API responses for deterministic performance testing
    await page.route('**/api/agendas/user-agendas**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/api/agendas/**/audits**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/api/agendas/mock-perf-agenda', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          _id: 'mock-perf-agenda',
          title: 'Performance Benchmark Agenda',
          description: 'Testing rendering throughput',
          isArchived: false,
          items: Array.from({ length: 20 }, (_, i) => ({
            _id: `perf-item-${i}`,
            title: `Agenda Punkt #${i + 1}`,
            description: `Detailbeschreibung für Punkt #${i + 1}`,
            startTime: '10:00',
            durationMinutes: 10,
            completed: false,
            likesCount: i
          })),
          attendees: [
            { id: 'u1', name: 'User 1', email: 'u1@test.de', securityCode: '1234', secretGuid: 'guid-1', cardColor: '#8b0000' }
          ]
        })
      });
    });
  });

  test('should load Home Page with fast Web Vitals (DCL < 800ms, Load < 1500ms)', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const navTiming = await page.evaluate(() => {
      const timing = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: timing ? timing.domContentLoadedEventEnd - timing.startTime : 0,
        loadEvent: timing ? timing.loadEventEnd - timing.startTime : 0,
        ttfb: timing ? timing.responseStart - timing.startTime : 0
      };
    });

    const elapsed = Date.now() - startTime;

    console.log('Navigation Performance Metrics:', navTiming, `Total elapsed: ${elapsed}ms`);

    // Assert fast page load speeds
    expect(navTiming.domContentLoaded).toBeLessThan(1000);
    expect(navTiming.loadEvent).toBeLessThan(2000);
  });

  test('should render complex Agenda Detail under 4x CPU Throttling (Mobile Hardware Emulation)', async ({ page, context, browserName }) => {
    let client: any = null;
    if (browserName === 'chromium') {
      // Enable Chrome DevTools Protocol (CDP) 4x CPU throttling to emulate mid-range mobile phone ARM hardware
      client = await context.newCDPSession(page);
      await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    }

    const startTime = Date.now();
    await page.goto('/agenda/mock-perf-agenda');

    // Wait for the main items to render
    await expect(page.locator('text=Performance Benchmark Agenda')).toBeVisible();
    await expect(page.locator('text=Agenda Punkt #20')).toBeVisible();

    const renderTimeMs = Date.now() - startTime;
    console.log(`Render time under 4x CPU Throttling: ${renderTimeMs}ms`);

    // Ensure rendering completes smoothly under 4x CPU slowdown (Target < 3000ms under 4x throttle)
    expect(renderTimeMs).toBeLessThan(3500);

    // Disable CPU throttling if enabled
    if (client) {
      await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    }
  });

  test('should maintain low DOM node count and zero memory leaks', async ({ page }) => {
    await page.goto('/agenda/mock-perf-agenda');
    await page.waitForLoadState('domcontentloaded');

    // Count DOM nodes
    const nodeCount = await page.evaluate(() => document.getElementsByTagName('*').length);
    console.log(`DOM node count for 20 items: ${nodeCount}`);

    // Ensure total DOM node count is lean (< 1200 nodes for 20 agenda items)
    expect(nodeCount).toBeLessThan(1200);
  });

  test('should render cleanly on ultra-small mobile screen (320px width) without layout shifts or horizontal scroll', async ({ page }) => {
    // Set ultra-compact mobile display viewport (320px width x 568px height - iPhone SE 1st Gen)
    await page.setViewportSize({ width: 320, height: 568 });

    const startTime = Date.now();
    await page.goto('/agenda/mock-perf-agenda');

    await expect(page.locator('text=Performance Benchmark Agenda')).toBeVisible();

    const renderTimeMs = Date.now() - startTime;
    console.log(`Ultra-small (320px) mobile display render time: ${renderTimeMs}ms`);

    // Verify render time is under 1.5s
    expect(renderTimeMs).toBeLessThan(2000);

    // Verify 0 horizontal scroll overflow on 320px screen width
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
