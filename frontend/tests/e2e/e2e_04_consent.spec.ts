import { expect, test } from '@playwright/test';

test('E2E-04: IAB TCF v2 cookie consent banner', async ({ page }) => {
    await page.goto('/');

    // Banner is visible on first visit
    const banner = page.locator('.cookie-consent-backdrop');
    await expect(banner).toBeVisible({ timeout: 5000 });
    await expect(banner.getByText('Your privacy choices')).toBeVisible();
    await expect(banner.getByText('Essential', { exact: true })).toBeVisible();
    await expect(banner.getByText('Analytics', { exact: true })).toBeVisible();
    await expect(banner.getByText('Marketing', { exact: true })).toBeVisible();

    // Accept all → banner disappears, consent cookie set
    await banner.getByRole('button', { name: 'Accept all' }).click();
    await expect(banner).not.toBeVisible();

    const consentCookie = await page.context().cookies();
    const consent = consentCookie.find((c) => c.name === 'immipulse_consent');
    expect(consent).toBeDefined();
    const parsed = JSON.parse(decodeURIComponent(consent!.value));
    expect(parsed.essential).toBe(true);
    expect(parsed.analytics).toBe(true);
    expect(parsed.marketing).toBe(true);
});

test('E2E-04b: Reject all sets analytics/marketing to false', async ({ page, context }) => {
    // Clear cookies so the banner appears.
    await context.clearCookies();
    await page.goto('/');

    const banner = page.locator('.cookie-consent-backdrop');
    await expect(banner).toBeVisible({ timeout: 5000 });
    await banner.getByRole('button', { name: 'Reject all' }).click();
    await expect(banner).not.toBeVisible();

    const consent = (await context.cookies()).find((c) => c.name === 'immipulse_consent');
    const parsed = JSON.parse(decodeURIComponent(consent!.value));
    expect(parsed.essential).toBe(true);
    expect(parsed.analytics).toBe(false);
    expect(parsed.marketing).toBe(false);
});

test('E2E-04c: Save preferences with custom toggles', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');

    const banner = page.locator('.cookie-consent-backdrop');
    await expect(banner).toBeVisible({ timeout: 5000 });

    // Toggle analytics off (it's on by default), keep marketing on
    await banner.getByLabel('Analytics', { exact: false }).uncheck();
    await banner.getByLabel('Marketing', { exact: false }).check();
    await banner.getByRole('button', { name: 'Save preferences' }).click();
    await expect(banner).not.toBeVisible();

    const consent = (await context.cookies()).find((c) => c.name === 'immipulse_consent');
    const parsed = JSON.parse(decodeURIComponent(consent!.value));
    expect(parsed.essential).toBe(true);
    expect(parsed.analytics).toBe(false);
    expect(parsed.marketing).toBe(true);
});