import { expect, test } from '@playwright/test';
import { dismissConsentBanner } from './helpers/consent.js';

test('E2E-01 anonymous guest browse journey', async ({ page }) => {
    await page.goto('/');
    await dismissConsentBanner(page);

    // Header shows Login and Sign Up (scope to header banner to avoid sidebar CTA)
    const banner = page.getByRole('banner');
    await expect(banner.getByRole('link', { name: 'Login' })).toBeVisible();
    await expect(banner.getByRole('link', { name: 'Sign Up' })).toBeVisible();

    // Hamburger button is present
    await expect(page.getByRole('button', { name: 'Open navigation menu' })).toBeVisible();

    // Wait for the feed to load
    await page.waitForSelector('.article-card', { timeout: 10_000 });

    // Feed displays up to 10 cards
    const cards = page.locator('.article-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(10);

    // Active filter badge section is empty (no jurisdiction/tag selected)
    const filterSection = page.locator('.filter-badges');
    await expect(filterSection.getByText('No active filters', { exact: false })).toBeVisible();

    // Locked sidebar overlay present
    await expect(page.locator('.sidebar-locked')).toBeVisible();
    await expect(page.getByText('Register to customize your feed.')).toBeVisible();

    // Open the first article modal
    await cards.first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Open Verified Source')).toBeVisible();

    // Modal shows required content
    await expect(dialog.locator('h2')).not.toBeEmpty();
    await expect(dialog.locator('.badge-jurisdiction').first()).toBeVisible();

    // Close by clicking backdrop
    await page.locator('.modal-backdrop').click({ position: { x: 5, y: 5 } });
    await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('E2E-01b hamburger menu navigation (mobile/desktop)', async ({ page }) => {
    await page.goto('/');
    await dismissConsentBanner(page);
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    const menu = page.getByRole('dialog', { name: 'Navigation menu' });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(menu).not.toBeVisible();
});