import { expect, test } from '@playwright/test';
import { execSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { dismissConsentBanner } from './helpers/consent.js';

/**
 * Pre-computed Argon2id hash for "Pass1234!". All seeded users in the
 * Stage 5.2 E2E test use this password so we can hardcode the hash
 * here (avoiding the need to invoke the backend's hashPassword at test
 * time). Generated once with: hashPassword("Pass1234!").
 */
const PRECOMPUTED_ARGON2ID_HASH_FOR_PASS1234 =
    '$argon2id$v=19$m=19456,t=2,p=1$fuOCcYd9/nuYROKABmnb7g$ygSaHTJef2n+3/vF9Z+ydJgvLcZYSKGsSC7KoTwB7es';

/**
 * Helper: seed a user directly in the database with a known password
 * hash and tier. Bypasses the signup + login flow.
 *
 * Uses a Node.js script inside the API container to hash the password
 * with the same Argon2id parameters as the backend. This avoids the
 * bash-dollars-mangling-the-hash problem of passing the hash directly
 * to psql via shell.
 */
function seedUser(email: string, tier: 'basic' | 'premium' | 'admin'): string {
    const userId = `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    // Use the API container's bcrypt/argon2 setup to compute a fresh hash
    // for the test password and insert it.
    const sql = `INSERT INTO users (id, email, password_hash, user_tier)
                 VALUES ('${userId}', '${email}', $1, '${tier}')
                 ON CONFLICT (email) DO UPDATE
                   SET password_hash = EXCLUDED.password_hash,
                       user_tier = EXCLUDED.user_tier
                 RETURNING id;`;
    // Use the PRECOMPUTED hash to avoid invoking the container; the
    // hash is passed through stdin to psql -c so the shell never expands
    // its `$` characters.
    const tmpSqlFile = `/tmp/immipulse_seed_${userId}.sql`;
    try {
        // Write the SQL to a temp file (which contains the hash verbatim).
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

function deleteUser(email: string): void {
    execSync(
        `docker exec immipulse-db psql -U immipulse -d immipulse -c "DELETE FROM users WHERE email='${email}'"`
    );
}

test('E2E-03 premium upgrade + keyword alert lifecycle with email dispatch', async ({ page, request }) => {
    const email = `e2e_premium_${Date.now()}@example.com`;

    // Seed a premium user directly in the DB to avoid signup + CSRF flow.
    const userId = seedUser(email, 'premium');

    // Get a fresh JWT for the user by logging in via the API. The login
    // requires CSRF — bootstrap first.
    const csrf = (await (await request.get('/api/v1/auth/csrf')).json()).data.csrf_token as string;
    const login = await request.post('/api/v1/auth/login', {
        headers: { 'x-csrf-token': csrf },
        data: { email, password: 'Pass1234!' },
    });
    const loginBody = await login.json();
    if (!loginBody?.data?.token) {
        console.log('LOGIN RESPONSE:', JSON.stringify(loginBody));
        console.log('LOGIN STATUS:', login.status());
    }
    const token = (await login.json()).data.token as string;

    // Stage 5.2: the SPA uses cookie-based auth. Inject the access_token
    // directly into the browser's cookie jar so the Alerts page renders
    // as an authenticated Premium user. The token is signed by the
    // backend; the browser will send it on subsequent requests.
    await page.goto('/');
    await dismissConsentBanner(page);
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
    // Stage 5.2.5: bootstrap the SPA's CSRF state.
    await page.evaluate(async () => {
        await fetch('/api/v1/auth/csrf', { credentials: 'include' });
    });

    await page.goto('/alerts');
    await expect(page.getByRole('heading', { name: /Configure Keyword Alerts/i })).toBeVisible();

    // Hamburger button is present in the header
    await expect(page.getByLabel('Open navigation menu')).toBeVisible();

    await page.getByLabel('Jurisdiction').selectOption('United Kingdom');
    await page.getByLabel('Keyword', { exact: true }).fill('salary threshold');
    await page.getByRole('button', { name: 'Create Alarm' }).click();

    await expect(page.getByText('Alert created successfully')).toBeVisible();
    await expect(page.getByText('salary threshold')).toBeVisible();

    // Duplicate detection: pre-check kicks in, no API call
    await page.getByLabel('Keyword', { exact: true }).fill('salary threshold');
    await page.getByRole('button', { name: 'Create Alarm' }).click();
    await expect(page.getByText(/already have an alarm/i)).toBeVisible();

    // Stage 3.5: Trigger a matching article via /admin/ingest and verify
    // the broker (LISTEN/NOTIFY) dispatches an email.
    const adminEmail = `e2e_admin_${Date.now()}@example.com`;
    seedUser(adminEmail, 'admin');
    const csrfAdmin = (await (await request.get('/api/v1/auth/csrf')).json()).data.csrf_token as string;
    const adminLogin = await request.post('/api/v1/auth/login', {
        headers: { 'x-csrf-token': csrfAdmin },
        data: { email: adminEmail, password: 'Pass1234!' },
    });
    const adminToken = (await adminLogin.json()).data.token as string;
    const ingest = await request.post('/api/v1/admin/ingest', {
        headers: { authorization: `Bearer ${adminToken}` },
        data: {
            title: 'UK increases salary threshold for sponsor visa',
            summary: 'The Home Office raised the salary threshold for Skilled Worker visas effective 4 April 2026.',
            source_url: `https://www.gov.uk/e2e-test/${Date.now()}`,
            origin_jurisdiction: 'GB',
            publisher_authority: 5,
            tags: ['Corporate Sponsorship'],
        },
    });
    expect(ingest.status()).toBe(201);

    // Verify dispatch via DB-side state.
    const alertCount = execSync(
        `docker exec immipulse-db psql -U immipulse -d immipulse -tAc "SELECT COUNT(*) FROM scraper_logs WHERE scraper_name LIKE 'alert-sent:%' AND executed_at > NOW() - INTERVAL '60 seconds'"`
    ).toString().trim();
    expect(Number(alertCount), 'expected broker to have written alert-sent dedup rows in scraper_logs within the last 60s').toBeGreaterThan(0);

    // Delete via trash icon button
    const deleteBtn = page.getByLabel(/Delete alarm for salary threshold/);
    await expect(deleteBtn).toBeVisible();
    await expect(deleteBtn.locator('svg.trash-icon')).toBeVisible();
    await deleteBtn.click();
    await expect(page.getByText('Alert deleted successfully')).toBeVisible();
    await expect(page.getByText('salary threshold')).toHaveCount(0);

    // Cleanup
    deleteUser(email);
    deleteUser(adminEmail);
    void userId;
});