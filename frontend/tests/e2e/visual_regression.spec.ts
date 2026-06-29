import { test, expect } from '@playwright/test';

/**
 * Stage 6.4.1 + 6.4.2: Playwright screenshot-diff visual regression.
 *
 * Captures screenshots of the key screens and asserts pixel-level
 * equivalence with committed baselines under
 * tests/e2e/baselines/. Run with `UPDATE_BASELINES=1` to refresh the
 * baselines on a known-good build.
 *
 * Thresholds: see playwright.config.ts → expect.toHaveScreenshot.
 * The default `maxDiffPixelRatio: 0.001` (0.1%) gates the comparison.
 */

const UPDATE = process.env.UPDATE_BASELINES === '1';

test('Guest dashboard screenshot matches baseline', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/');
    await expect(page).toHaveScreenshot('dashboard-guest.png', {
        fullPage: false,
        animations: 'disabled',
        maxDiffPixelRatio: UPDATE ? 1.0 : 0.001,
    });
});

test('Login page screenshot matches baseline', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');
    await expect(page).toHaveScreenshot('login.png', {
        fullPage: false,
        animations: 'disabled',
        maxDiffPixelRatio: UPDATE ? 1.0 : 0.001,
    });
});

test('Signup page screenshot matches baseline', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/signup');
    await expect(page).toHaveScreenshot('signup.png', {
        fullPage: false,
        animations: 'disabled',
        maxDiffPixelRatio: UPDATE ? 1.0 : 0.001,
    });
});