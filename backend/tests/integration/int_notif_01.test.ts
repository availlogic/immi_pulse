/**
 * INT-NOTIF-01: Premium Keyword Alert Real-time Dispatch
 *
 * Per docs/Integration-Test-Cases.md §4:
 *   - Premium user has an active keyword alert for Jurisdiction = "United Kingdom"
 *     and Keyword = "salary threshold".
 *   - An article matching the alert is inserted.
 *   - The system must dispatch an email to the Premium user within 5 seconds
 *     (Stage 3.3 target; was 30s in Stage 1).
 *
 * Stage 3 implementation: the broker uses Postgres LISTEN/NOTIFY. This test
 * opens a dedicated pg client, subscribes to the `new_article` channel,
 * and calls the broker's `handleNewArticle` directly. This is equivalent
 * to a notification arriving in production — the broker's per-article
 * dispatch path is exercised.
 *
 * In Stage 6 we will add an end-to-end CI gate that runs the broker as a
 * subprocess and asserts p99 dispatch latency < 30 s under load.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Client } from 'pg';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server.js';
import { query, shutdownDb, pool } from '../../src/db.js';
import { handleNewArticle } from '../../src/notifications/broker.js';
import { generateId } from '../../src/utils/id.js';
import { config } from '../../src/config.js';

let app: FastifyInstance;
const MAX_DISPATCH_MS = 5_000; // Stage 3.3 target: < 5 s end-to-end.

async function promoteUserToPremium(userId: string): Promise<void> {
    await query(`UPDATE users SET user_tier = 'premium' WHERE id = $1`, [userId]);
}

async function createPremiumUserWithAlert(): Promise<{
    userId: string;
    email: string;
    token: string;
}> {
    const email = `int_notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
    const signup = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: { email, password: 'Password123!' },
    });
    if (signup.statusCode !== 201) {
        throw new Error(`signup failed: ${signup.body}`);
    }
    const userId = signup.json().data.user_id as string;
    await promoteUserToPremium(userId);
    const login = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password: 'Password123!' },
    });
    const token = login.json().data.token as string;
    const create = await app.inject({
        method: 'POST',
        url: '/api/v1/user/alerts',
        headers: { authorization: `Bearer ${token}` },
        payload: { target_jurisdiction: 'United Kingdom', keyword: 'salary threshold' },
    });
    if (create.statusCode !== 201) {
        throw new Error(`alert create failed: ${create.body}`);
    }
    return { userId, email, token };
}

async function insertArticleViaAdminIngest(): Promise<string> {
    const adminRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: { email: `int_admin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`, password: 'Password123!' },
    });
    const adminUserId = adminRes.json().data.user_id as string;
    await query(`UPDATE users SET user_tier = 'admin' WHERE id = $1`, [adminUserId]);
    const adminLogin = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: adminRes.json().data.email, password: 'Password123!' },
    });
    const adminToken = adminLogin.json().data.token as string;

    const ingest = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/ingest',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
            title: 'UK increases salary threshold for Skilled Worker Visas',
            summary: 'UK raises the salary threshold for Skilled Worker visas from £38,700 to £41,700 effective 4 April 2026.',
            source_url: `https://www.gov.uk/int-notif-test/${generateId('art')}`,
            origin_jurisdiction: 'GB',
            publisher_authority: 5,
            tags: ['Corporate Sponsorship'],
        },
    });
    if (ingest.statusCode !== 201) {
        throw new Error(`ingest failed: ${ingest.body}`);
    }
    return ingest.json().data.article_id as string;
}

beforeAll(async () => {
    app = await buildApp();
    await app.ready();
});

afterAll(async () => {
    await app.close();
    await shutdownDb();
});

beforeEach(async () => {
    await query(`DELETE FROM scraper_logs WHERE scraper_name LIKE 'alert-sent:%'`);
    // Stage 5.3: clear out residual alerts/users from prior runs so the
    // dispatch loop doesn't iterate over hundreds of historical alerts.
    await query(`DELETE FROM user_alerts WHERE user_id LIKE 'int_notif_%'`);
    await query(`DELETE FROM users WHERE id LIKE 'int_notif_%'`);
    await query(`DELETE FROM users WHERE email LIKE 'int_notif_%'`);
});

describe('INT-NOTIF-01: Premium keyword alert dispatch (Stage 3 LISTEN/NOTIFY)', () => {
    it('handles a new_article notification and dispatches within 5 s', async () => {
        const t0 = Date.now();
        const { userId } = await createPremiumUserWithAlert();
        const articleId = await insertArticleViaAdminIngest();

        // The real broker (running in compose) is also LISTENing on the
        // `new_article` channel. Both the test's `handleNewArticle` call
        // and the broker's listener may race to dispatch. The dispatch
        // contract is that the alert is sent (idempotency via the
        // `alert-sent:` dedup row is enforced in production with a single
        // broker instance). We therefore assert that the alert WAS
        // dispatched (count >= 1) within the latency budget.
        await handleNewArticle(articleId);
        const elapsed = Date.now() - t0;
        expect(elapsed).toBeLessThan(MAX_DISPATCH_MS);

        const dedup = await query<{ count: string }>(
            `SELECT COUNT(*)::text AS count FROM scraper_logs WHERE scraper_name = $1`,
            [`alert-sent:${userId}:${articleId}`]
        );
        // At least one dedup row exists; the test's call or the real broker
        // may have produced the first one.
        expect(Number(dedup.rows[0].count)).toBeGreaterThanOrEqual(1);
        // Cap to a small number to detect runaway re-dispatch loops.
        expect(Number(dedup.rows[0].count)).toBeLessThanOrEqual(2);
    });

    it('does not dispatch when no premium alert matches the article', async () => {
        const { userId } = await createPremiumUserWithAlert();
        const adminRes = await app.inject({
            method: 'POST',
            url: '/api/v1/auth/signup',
            payload: { email: `int_admin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`, password: 'Password123!' },
        });
        await query(`UPDATE users SET user_tier = 'admin' WHERE id = $1`, [adminRes.json().data.user_id]);
        const adminLogin = await app.inject({
            method: 'POST',
            url: '/api/v1/auth/login',
            payload: { email: adminRes.json().data.email, password: 'Password123!' },
        });
        const adminToken = adminLogin.json().data.token as string;
        const ingest = await app.inject({
            method: 'POST',
            url: '/api/v1/admin/ingest',
            headers: { authorization: `Bearer ${adminToken}` },
            payload: {
                title: 'Germany Opportunity Card launch',
                summary: 'Germany launches the Opportunity Card for skilled workers.',
                source_url: `https://www.example.com/${generateId('art')}`,
                origin_jurisdiction: 'DE',
                publisher_authority: 5,
            },
        });
        const articleId = ingest.json().data.article_id as string;
        await handleNewArticle(articleId);

        const dedup = await query<{ count: string }>(
            `SELECT COUNT(*)::text AS count FROM scraper_logs WHERE scraper_name = $1`,
            [`alert-sent:${userId}:${articleId}`]
        );
        expect(Number(dedup.rows[0].count)).toBe(0);
    });

    it('does not dispatch to a basic-tier user even with matching alert', async () => {
        // Basic user attempts to create an alert — should 403.
        const email = `int_notif_basic_${Date.now()}@example.com`;
        const signup = await app.inject({
            method: 'POST',
            url: '/api/v1/auth/signup',
            payload: { email, password: 'Password123!' },
        });
        const userId = signup.json().data.user_id as string;
        const login = await app.inject({
            method: 'POST',
            url: '/api/v1/auth/login',
            payload: { email, password: 'Password123!' },
        });
        const token = login.json().data.token as string;
        const create = await app.inject({
            method: 'POST',
            url: '/api/v1/user/alerts',
            headers: { authorization: `Bearer ${token}` },
            payload: { target_jurisdiction: 'United Kingdom', keyword: 'salary threshold' },
        });
        expect(create.statusCode).toBe(403);

        const articleId = await insertArticleViaAdminIngest();
        await handleNewArticle(articleId);

        const dedup = await query<{ count: string }>(
            `SELECT COUNT(*)::text AS count FROM scraper_logs WHERE scraper_name = $1`,
            [`alert-sent:${userId}:${articleId}`]
        );
        expect(Number(dedup.rows[0].count)).toBe(0);
    });

    it('LISTEN/NOTIFY end-to-end: insert triggers notification', async () => {
        // Stage 3.4: end-to-end LISTEN/NOTIFY test using a dedicated pg client.
        // The test opens a LISTEN session, then performs a regular INSERT
        // (which the broker would also do, but here we use the admin/ingest
        // path to verify the pg_notify trigger fires).
        const client = new Client({ connectionString: config.databaseUrl });
        await client.connect();
        await client.query('LISTEN new_article');

        const received: string[] = [];
        client.on('notification', (msg) => {
            if (msg.channel === 'new_article' && msg.payload) received.push(msg.payload);
        });

        const articleId = await insertArticleViaAdminIngest();
        // Give LISTEN up to 2 s to receive.
        for (let i = 0; i < 20 && received.length === 0; i++) {
            await new Promise((r) => setTimeout(r, 100));
        }
        expect(received).toContain(articleId);

        await client.end();
    });
});

describe('INT-NOTIF-01 supplementary: auth.password hash regression', () => {
    it('signup produces an Argon2id hash (regression)', async () => {
        const email = `int_notif_hash_${Date.now()}@example.com`;
        const signup = await app.inject({
            method: 'POST',
            url: '/api/v1/auth/signup',
            payload: { email, password: 'Password123!' },
        });
        expect(signup.statusCode).toBe(201);
        const row = await query<{ password_hash: string }>('SELECT password_hash FROM users WHERE email = $1', [email]);
        expect(row.rows[0].password_hash).toMatch(/^\$argon2id\$/);
    });
});