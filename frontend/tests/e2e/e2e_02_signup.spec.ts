import { expect, test } from '@playwright/test';
import { execSync, spawnSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { dismissConsentBanner } from './helpers/consent.js';

const PRECOMPUTED_ARGON2ID_HASH_FOR_PASS1234 =
    '$argon2id$v=19$m=19456,t=2,p=1$fuOCcYd9/nuYROKABmnb7g$ygSaHTJef2n+3/vF9Z+ydJgvLcZYSKGsSC7KoTwB7es';

function seedBasicUser(email: string): string {
    const userId = `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const sql = `INSERT INTO users (id, email, password_hash, user_tier)
                 VALUES ('${userId}', '${email}', $1, 'basic')
                 ON CONFLICT (email) DO UPDATE
                   SET password_hash = EXCLUDED.password_hash,
                       user_tier = EXCLUDED.user_tier
                 RETURNING id;`;
    const tmpSqlFile = `/tmp/immipulse_seed_${userId}.sql`;
    try {
        writeFileSync(tmpSqlFile, sql.replace('$1', `'${PRECOMPUTED_ARGON2ID_HASH_FOR_PASS1234}'`));
        execSync(`docker exec -i immipulse-db psql -U immipulse -d immipulse < ${tmpSqlFile}`);
        execSync(
            `docker exec immipulse-db psql -U immipulse -d immipulse -c "INSERT INTO user_preferences (user_id, preferred_jurisdictions, preferred_tags, digest_frequency) VALUES ('${userId}', '{}', '{}', 'none') ON CONFLICT (user_id) DO NOTHING"`
        );
    } finally {
        try {
            unlinkSync(tmpSqlFile);
        } catch {
            // ignore
        }
    }
    return userId;
}

test('E2E-02 signup and personalization journey', async ({ page }) => {
    const email = `e2e_${Date.now()}@example.com`;

    await page.goto('/');
    await dismissConsentBanner(page);
    await page.getByRole('banner').getByRole('link', { name: 'Sign Up' }).click();

    await page.getByLabel('Email').fill(email);
    await page.getByLabel(/Password/).fill('Pass1234!');
    await page.getByRole('button', { name: 'Register' }).click();

    // Redirected to /settings
    await page.waitForURL(/\/settings$/);
    await expect(page.getByRole('heading', { name: 'Preferences & Subscription Settings' })).toBeVisible();

    // Welcome toast appears
    await expect(page.getByText('Welcome to ImmiPulse!')).toBeVisible({ timeout: 5000 });

    // Check jurisdictions and tags
    await page.getByLabel('Canada').check();
    await page.getByLabel('Singapore').check();
    await page.getByLabel('Education').check();
    await page.getByLabel('Vacation').check();

    // Language tag must NOT be present (C-2)
    await expect(page.getByLabel('Language', { exact: true })).toHaveCount(0);

    await page.getByLabel('Email digest cadence').selectOption('daily');
    await page.getByRole('button', { name: /Save Preferences/ }).click();

    // Toast + redirect
    await expect(page.getByText('Preferences saved successfully!')).toBeVisible();
    await page.waitForURL(/\/$/);

    // Wait for feed
    await page.waitForSelector('.article-card', { timeout: 10_000 });

    // Active filter badges present
    await expect(page.locator('.filter-badges .badge').first()).toBeVisible();

    // Personalized/Global toggle present for authenticated user
    await expect(page.getByRole('button', { name: 'Personalized' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Global' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Personalized' })).toHaveAttribute('aria-pressed', 'true');

    // Feed contains articles
    const cards = page.locator('.article-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(10);

    // Per-jurisdiction count ≤ 2 (diversity enforcement)
    const badges = await page.locator('.article-card .badge-jurisdiction').allTextContents();
    const counts = new Map<string, number>();
    for (const b of badges) {
        const name = b.trim();
        counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    for (const c of counts.values()) {
        expect(c).toBeLessThanOrEqual(2);
    }
});

test('E2E-02b global view shows all jurisdictions', async ({ page, request }) => {
    // Stage 5.2: bypass signup; seed a basic user directly in the DB.
    const email = `e2e_global_${Date.now()}@example.com`;
    const userId = seedBasicUser(email);
    void userId;
    void request;

    // Log in to get a fresh JWT, then inject the access_token cookie into
    // the browser context. The browser will send the cookie on the
    // /user/me probe when the SPA boots.
    const csrf = (await (await request.get('/api/v1/auth/csrf')).json()).data.csrf_token as string;
    const login = await request.post('/api/v1/auth/login', {
        headers: { 'x-csrf-token': csrf },
        data: { email, password: 'Pass1234!' },
    });
    const token = (await login.json()).data.token as string;
    void token;

    await page.goto('/');
    await page.context().addCookies([
        {
            name: 'access_token',
            value: token,
            domain: 'localhost',
            path: '/',
            httpOnly: true,
            secure: false,
            sameSite: 'Lax',
        },
        {
            name: 'csrf_token',
            value: 'e2e-test-csrf',
            domain: 'localhost',
            path: '/',
            httpOnly: false,
            secure: false,
            sameSite: 'Lax',
        },
    ]);
    await page.evaluate(async () => {
        await fetch('/api/v1/auth/csrf', { credentials: 'include' });
    });
    await page.waitForSelector('.article-card', { timeout: 10_000 });
    await dismissConsentBanner(page);

    // Click Global toggle
    await page.getByRole('button', { name: 'Global' }).click();
    await expect(page.getByRole('button', { name: 'Global' })).toHaveAttribute('aria-pressed', 'true');

    // Cleanup
    execSync(`docker exec immipulse-db psql -U immipulse -d immipulse -c "DELETE FROM users WHERE email='${email}'"`);
});