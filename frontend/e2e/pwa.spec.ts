import { test, expect } from '@playwright/test';

test.describe('FlashAgenda - Multi-Platform PWA & Mobile Install', () => {
  test('should include all iOS and Android PWA meta headers and manifest references', async ({ page }) => {
    await page.goto('/');

    // Check favicon and apple-touch-icon links
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/apple-touch-icon.png');

    // Check theme-color meta tag
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#DC2626');

    // Check iOS Web App Meta Tags
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
    await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute('content', 'black-translucent');
    await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'FlashAgenda');

    // Check Viewport with safe-area fit
    const viewportMeta = page.locator('meta[name="viewport"]');
    await expect(viewportMeta).toHaveAttribute('content', /viewport-fit=cover/);
  });

  test('should display iOS PWA installation guide banner on iOS Safari', async ({ page }) => {
    // Set User-Agent to iPhone Safari
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', {
        get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
      });
      // Clear localStorage banner dismiss flag
      localStorage.removeItem('flashagenda_pwa_banner_dismissed');
    });

    await page.goto('/');

    // Verify iOS Install Guide Banner appears
    const banner = page.locator('text=FlashAgenda als App nutzen');
    await expect(banner).toBeVisible();
    await expect(page.locator('text=Zum Home-Bildschirm')).toBeVisible();
  });

  test('should permanently hide banner after dismissal (localStorage persistence)', async ({ page }) => {
    let firstLoad = true;

    // Use addInitScript to spoof iOS UA for all loads, but only clear the flag on first load
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'userAgent', {
        get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
      });
      // Only clear if flag is NOT set yet (first load simulation)
      if (!sessionStorage.getItem('pwa_test_dismiss_done')) {
        localStorage.removeItem('flashagenda_pwa_banner_dismissed');
      }
    });

    await page.goto('/');

    // Banner should be visible initially
    const banner = page.locator('text=FlashAgenda als App nutzen');
    await expect(banner).toBeVisible();

    // Set sentinel in sessionStorage to prevent flag removal on reload
    await page.evaluate(() => sessionStorage.setItem('pwa_test_dismiss_done', '1'));

    // Dismiss the banner via X button
    await page.locator('[title="Schließen"]').click();
    await expect(banner).not.toBeVisible();

    // Verify localStorage flag was set
    const dismissedFlag = await page.evaluate(() =>
      localStorage.getItem('flashagenda_pwa_banner_dismissed')
    );
    expect(dismissedFlag).toBe('true');

    // Reload the page - banner must NOT reappear (flag persists in localStorage)
    await page.reload();
    await expect(page.locator('text=FlashAgenda als App nutzen')).not.toBeVisible();
  });
});
