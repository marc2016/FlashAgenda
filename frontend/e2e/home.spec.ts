import { test, expect } from '@playwright/test';

test.describe('FlashAgenda - Home Page & Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept window.fetch directly for 100% cross-browser reliability (Chromium & WebKit)
    await page.addInitScript(() => {
      const origFetch = window.fetch;
      window.fetch = async (input: any, init?: any) => {
        const url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
        const method = (init?.method || 'GET').toUpperCase();
        if (url.includes('/api/agendas')) {
          if (url.includes('user-stats')) {
            return new Response(JSON.stringify({ agendasCount: 0, totalItemsContributed: 0 }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          if (url.includes('user-agendas')) {
            return new Response(JSON.stringify([]), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          if (url.includes('mock-agenda-999')) {
            return new Response(JSON.stringify({
              _id: 'mock-agenda-999',
              title: 'Neue Agenda',
              items: [],
              attendees: []
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          if (url.includes('login-by-code')) {
            return new Response(JSON.stringify({
              success: true,
              user: { id: 'u123', name: 'Max Mustermann', isRegistered: true, securityCode: '1234' }
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          if (method === 'POST') {
            return new Response(JSON.stringify({ _id: 'mock-agenda-999', title: 'Neue Agenda' }), {
              status: 201,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return origFetch(input, init);
      };
    });
  });

  test('should load Home Page and display core UI elements', async ({ page }) => {
    await page.goto('/');

    // Verify Title (h1 specifically to avoid strict-mode conflict with PWA install banner)
    await expect(page.locator('h1.css-logo-text')).toBeVisible();

    // Check Start Agenda Button
    const startButton = page.locator('button:has-text("AGENDA STARTEN!")');
    await expect(startButton).toBeVisible();

    // Check Code Login Button
    const codeLoginBtn = page.locator('#code-login-btn');
    await expect(codeLoginBtn).toBeVisible();

    // Check favicon link element
    const faviconLink = page.locator('link[rel="icon"]');
    await expect(faviconLink).toHaveAttribute('href', '/favicon.svg');
  });

  test('should create a new agenda when clicking start button', async ({ page }) => {
    await page.goto('/');

    // Dismiss PWA install banner if visible (can overlap button on very small screens)
    const dismissBtn = page.locator('[title="Schließen"]');
    if (await dismissBtn.isVisible()) {
      await dismissBtn.click();
    }

    const startButton = page.locator('#start-agenda-btn');
    await startButton.scrollIntoViewIfNeeded();
    await startButton.click();
    await expect(page).toHaveURL(/\/agenda\//, { timeout: 10000 });
  });

  test('should open code login modal and log in successfully with 4-digit code', async ({ page }) => {
    await page.goto('/');

    // Dismiss PWA banner if visible on small viewports
    const dismissBtn = page.locator('[title="Schließen"]');
    if (await dismissBtn.isVisible()) {
      await dismissBtn.click().catch(() => {});
    }

    const codeLoginBtn = page.locator('#code-login-btn');
    await codeLoginBtn.scrollIntoViewIfNeeded();
    await codeLoginBtn.click({ force: true });

    // Modal should be visible
    await expect(page.locator('text=Mit Einmal-Code anmelden')).toBeVisible();

    // Fill 4-digit code
    await page.fill('#login-code-input', '1234');
    await page.click('#submit-code-login-btn');

    // Should close modal and display user agendas area
    await expect(page.locator('text=Mit Einmal-Code anmelden')).toBeHidden();
    await expect(page.locator('text=Deine Agenden')).toBeVisible();
    await expect(page.locator('text=Max Mustermann')).toBeVisible();
  });
});
