import { expect, test, type APIRequestContext } from '@playwright/test';
import { execSync, spawnSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { dismissConsentBanner } from './helpers/consent.js';

const PRECOMPUTED_ARGON2ID_HASH_FOR_PASS1234 =
    '$argon2id$v=19$m=19456,t=2,p=1$fuOCcYd9/nuYROKABmnb7g$ygSaHTJef2n+3/vF9Z+ydJgvLcZYSKGsSC7KoTwB7es';

async function seedUserWithTier(
    request: APIRequestContext,
    email: string,
    tier: 'basic' | 'premium' | 'admin'
): Promise<{ token: string; userId: string }> {
    const signupRes = await request.post('/api/v1/auth/signup', {
        headers: { 'x-csrf-token': (await (await request.get('/api/v1/auth/csrf')).json()).data.csrf_token },
        data: { email, password: 'Pass1234!' },
    });
    let userId: string;
    if (signupRes.status() === 201) {
        userId = (await signupRes.json()).data.user_id;
    } else {
        const lookup = execSync(
            `docker exec immipulse-db psql -U immipulse -d immipulse -tAc "SELECT id FROM users WHERE email='${email}'"`
        )
            .toString()
            .trim();
        userId = lookup;
    }
    execSync(
        `docker exec immipulse-db psql -U immipulse -d immipulse -c "UPDATE users SET user_tier='${tier}' WHERE id='${userId}'"`
    );
    const login = await request.post('/api/v1/auth/login', {
        headers: { 'x-csrf-token': (await (await request.get('/api/v1/auth/csrf')).json()).data.csrf_token },
        data: { email, password: 'Pass1234!' },
    });
    const token = (await login.json()).data.token;
    return { token, userId };
}

test('E2E-05: admin dashboard shows scraper health, metrics, and review queue', async ({ page, request }) => {
    // Seed an admin and a basic user.
    const adminEmail = `e2e_admin_${Date.now()}@example.com`;
    const basicEmail = `e2e_basic_${Date.now()}@example.com`;
    const { token: adminToken } = await seedUserWithTier(request, adminEmail, 'admin');
    await seedUserWithTier(request, basicEmail, 'basic');

    // Seed a review queue item for the admin to interact with.
    const articleId = `art_e2e_admin_${Date.now()}`;
    const reviewId = `rev_e2e_admin_${Date.now()}`;
    execSync(
        `docker exec immipulse-db psql -U immipulse -d immipulse -c "INSERT INTO articles (id, title, raw_content, summary, publication_date, source_url, origin_jurisdiction, publisher_authority, embedding, tags, tagger_provider) VALUES ('${articleId}', 'Admin E2E test', 'body', 'summary', NOW(), 'https://e2e/${articleId}', 'US', 3, array_fill(0.0::float8, ARRAY[3072])::halfvec, ARRAY['Corporate Sponsorship']::varchar[], 'keyword') ON CONFLICT (id) DO NOTHING"`
    );
    execSync(
        `docker exec immipulse-db psql -U immipulse -d immipulse -c "INSERT INTO admin_review_queue (id, article_id, reason, proposed_tags, proposed_jurisdiction, confidence, status) VALUES ('${reviewId}', '${articleId}', 'low confidence', ARRAY['Corporate Sponsorship']::varchar[], 'US', 0.5, 'pending') ON CONFLICT (id) DO NOTHING"`
    );

    // Sign in via the SPA's actual login flow so AuthContext picks up
    // the cookies through the proper lifecycle.
    await page.goto('/');
    await dismissConsentBanner(page);
    await page.getByRole('banner').getByRole('link', { name: 'Login' }).click();
    await page.getByLabel('Email').fill(adminEmail);
    await page.getByLabel(/Password/).fill('Pass1234!');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/$/);
    void adminToken;

    // Navigate to /admin via the navigation.
    await page.getByRole('banner').getByRole('link', { name: 'Admin' }).click();
    await page.waitForURL(/\/admin$/);

    // Heading is visible.
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible();

    // Three tabs (panels).
    const tabs = ['Scraper Health', 'Metrics', 'Review Queue'];
    for (const t of tabs) {
        await expect(page.getByRole('tab', { name: new RegExp(t) })).toBeVisible();
    }

    // Click the Review Queue tab and verify the seeded item is visible.
    const reviewTab = page.getByRole('tab', { name: /Review Queue/ });
    await reviewTab.click();
    await page.waitForTimeout(1000);
    // eslint-disable-next-line no-console
    console.log('[e2e] review panel text:', (await page.locator('[role="tabpanel"][aria-label="Review Queue"]').innerText()).substring(0, 1000));
    await expect(page.getByText('Admin E2E test')).toBeVisible();
    await expect(page.getByText('low confidence')).toBeVisible();

    // Cleanup
    execSync(`docker exec immipulse-db psql -U immipulse -d immipulse -c "DELETE FROM admin_review_queue WHERE id = '${reviewId}'; DELETE FROM articles WHERE id = '${articleId}'"`);
});

test('E2E-05b: non-admin users cannot access /admin', async ({ page, request }) => {
    const basicEmail = `e2e_admin_basic_${Date.now()}@example.com`;
    const { token: basicToken } = await seedUserWithTier(request, basicEmail, 'basic');

    await page.goto('/');
    await page.context().clearCookies();
    await page.context().addCookies([
        {
            name: 'access_token',
            value: basicToken,
            domain: 'localhost',
            path: '/',
            httpOnly: true,
            secure: false,
            sameSite: 'Lax',
        },
        {
            name: 'csrf_token',
            value: 'e2e-basic-csrf',
            domain: 'localhost',
            path: '/',
            httpOnly: false,
            secure: false,
            sameSite: 'Lax',
        },
    ]);
    await page.goto('/admin');
    await dismissConsentBanner(page);

    // Should be redirected away from /admin (to /) for basic users.
    await page.waitForURL('**/');
    await expect(page).toHaveURL(/\/$/);
});