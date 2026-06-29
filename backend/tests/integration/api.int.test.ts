import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server.js';
import { query, shutdownDb } from '../../src/db.js';
import { generateId } from '../../src/utils/id.js';

let app: FastifyInstance;

async function adminToken(): Promise<string> {
    const email = `int_admin_${Date.now()}@example.com`;
    const signup = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: { email, password: 'Admin1234!' },
    });
    let userId: string;
    if (signup.statusCode === 201) {
        userId = signup.json().data.user_id as string;
    } else {
        const existing = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
        userId = existing.rows[0].id;
    }
    await query(`UPDATE users SET user_tier = 'admin' WHERE id = $1`, [userId]);
    const login = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password: 'Admin1234!' },
    });
    return login.json().data.token as string;
}

async function basicToken(email = 'int_basic@example.com'): Promise<{ token: string; userId: string }> {
    const signup = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: { email, password: 'Password123!' },
    });
    let userId: string;
    if (signup.statusCode === 201) {
        userId = signup.json().data.user_id as string;
    } else {
        const existing = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
        userId = existing.rows[0].id;
    }
    const login = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password: 'Password123!' },
    });
    return { token: login.json().data.token as string, userId };
}

async function premiumToken(email = 'int_premium@example.com'): Promise<{ token: string; userId: string }> {
    const { token, userId } = await basicToken(email);
    await query(`UPDATE users SET user_tier = 'premium' WHERE id = $1`, [userId]);
    const login = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password: 'Password123!' },
    });
    return { token: login.json().data.token as string, userId };
}

beforeAll(async () => {
    app = await buildApp();
    await app.ready();
});

afterAll(async () => {
    await app.close();
    await shutdownDb();
});

describe('INT-AUTH-01: auth integration', () => {
    it('login returns 200 + JWT for valid credentials', async () => {
        const { token } = await basicToken(`int_auth_${Date.now()}@example.com`);
        expect(token).toBeTruthy();
        const parts = token.split('.');
        expect(parts).toHaveLength(3);
    });

    it('protected route returns 401 without token', async () => {
        const res = await app.inject({ method: 'GET', url: '/api/v1/user/preferences' });
        expect(res.statusCode).toBe(401);
    });

    it('protected route returns 200 with valid token', async () => {
        const { token } = await basicToken(`int_auth2_${Date.now()}@example.com`);
        const res = await app.inject({
            method: 'GET',
            url: '/api/v1/user/preferences',
            headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(200);
    });

    it('admin endpoint returns 403 for basic user', async () => {
        const { token } = await basicToken(`int_auth3_${Date.now()}@example.com`);
        const res = await app.inject({
            method: 'GET',
            url: '/api/v1/admin/health',
            headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(403);
    });
});

describe('User preferences round-trip', () => {
    it('PUT then GET returns the same values', async () => {
        const { token } = await basicToken(`int_pref_${Date.now()}@example.com`);
        const put = await app.inject({
            method: 'PUT',
            url: '/api/v1/user/preferences',
            headers: { authorization: `Bearer ${token}` },
            payload: {
                preferred_jurisdictions: ['US', 'CA'],
                preferred_tags: ['Education'],
                digest_frequency: 'weekly',
            },
        });
        expect(put.statusCode).toBe(200);

        const get = await app.inject({
            method: 'GET',
            url: '/api/v1/user/preferences',
            headers: { authorization: `Bearer ${token}` },
        });
        expect(get.json().data.preferred_jurisdictions.sort()).toEqual(['CA', 'US']);
        expect(get.json().data.preferred_tags).toEqual(['Education']);
        expect(get.json().data.digest_frequency).toBe('weekly');
    });

    it('rejects invalid tag', async () => {
        const { token } = await basicToken(`int_pref2_${Date.now()}@example.com`);
        const res = await app.inject({
            method: 'PUT',
            url: '/api/v1/user/preferences',
            headers: { authorization: `Bearer ${token}` },
            payload: { preferred_jurisdictions: [], preferred_tags: ['InvalidTag'], digest_frequency: 'none' },
        });
        expect(res.statusCode).toBe(400);
    });
});

describe('INT-FEED-01: personalized feed + diversity', () => {
    it('returns ≤10 items with ≤2 per jurisdiction matching preferences', async () => {
        // Seed 5 US, 5 CA, 5 AU articles tagged with Education.
        // We delete by source_url pattern to ensure a clean slate regardless of other test runs.
        const id = `intfeed_${Date.now()}`;
        for (let i = 0; i < 5; i++) {
            await query(
                `INSERT INTO articles (id, title, raw_content, summary, publication_date,
                    source_url, origin_jurisdiction, publisher_authority, embedding, tags)
                 VALUES ($1, $2, '', $3, NOW() - ($4 || ' hours')::interval,
                    $5, $6, 4, array_fill(0::float8, ARRAY[3072])::vector, ARRAY['Education']::varchar[])`,
                [`${id}_us_${i}`, `US ${id} ${i}`, `US summary ${i}`, String(i), `https://example.com/us/${id}/${i}`, 'US']
            );
        }
        for (let i = 0; i < 5; i++) {
            await query(
                `INSERT INTO articles (id, title, raw_content, summary, publication_date,
                    source_url, origin_jurisdiction, publisher_authority, embedding, tags)
                 VALUES ($1, $2, '', $3, NOW() - ($4 || ' hours')::interval,
                    $5, $6, 4, array_fill(0::float8, ARRAY[3072])::vector, ARRAY['Education']::varchar[])`,
                [`${id}_ca_${i}`, `CA ${id} ${i}`, `CA summary ${i}`, String(i + 5), `https://example.com/ca/${id}/${i}`, 'CA']
            );
        }
        for (let i = 0; i < 5; i++) {
            await query(
                `INSERT INTO articles (id, title, raw_content, summary, publication_date,
                    source_url, origin_jurisdiction, publisher_authority, embedding, tags)
                 VALUES ($1, $2, '', $3, NOW() - ($4 || ' hours')::interval,
                    $5, $6, 4, array_fill(0::float8, ARRAY[3072])::vector, ARRAY['Education']::varchar[])`,
                [`${id}_au_${i}`, `AU ${id} ${i}`, `AU summary ${i}`, String(i + 10), `https://example.com/au/${id}/${i}`, 'AU']
            );
        }

        const { token } = await basicToken(`int_feed_${Date.now()}@example.com`);
        const put = await app.inject({
            method: 'PUT',
            url: '/api/v1/user/preferences',
            headers: { authorization: `Bearer ${token}` },
            payload: {
                preferred_jurisdictions: ['US', 'CA'],
                preferred_tags: ['Education'],
                digest_frequency: 'none',
            },
        });
        expect(put.statusCode).toBe(200);

        const res = await app.inject({
            method: 'GET',
            url: '/api/v1/feed',
            headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(200);
        const articles = res.json().data.articles as Array<{ origin_jurisdiction: string; title: string }>;
        // The test articles use a known title prefix; assert only those are present.
        const testArticles = articles.filter((a) => a.title.startsWith(`US ${id}`) || a.title.startsWith(`CA ${id}`) || a.title.startsWith(`AU ${id}`));
        // Test seeded 5 US + 5 CA articles matching the user's prefs.
        // The global feed also contains other (seeded) Education articles from prior runs,
        // so we count only our test rows: at most 2 US + 2 CA = 4, 0 AU.
        expect(testArticles.length).toBeGreaterThanOrEqual(3);
        expect(testArticles.length).toBeLessThanOrEqual(4);
        const us = testArticles.filter((a) => a.origin_jurisdiction === 'US').length;
        const ca = testArticles.filter((a) => a.origin_jurisdiction === 'CA').length;
        const au = testArticles.filter((a) => a.origin_jurisdiction === 'AU').length;
        expect(us).toBeLessThanOrEqual(2);
        expect(ca).toBeLessThanOrEqual(2);
        expect(au).toBe(0);

        // Cleanup
        await query(`DELETE FROM articles WHERE source_url LIKE $1`, [`https://example.com/%/${id}/%`]);
    });

    it('guest feed returns ≤10 unfiltered items', async () => {
        const res = await app.inject({ method: 'GET', url: '/api/v1/feed' });
        expect(res.statusCode).toBe(200);
        const articles = res.json().data.articles;
        expect(articles.length).toBeLessThanOrEqual(10);
    });
});

describe('Alerts (Premium)', () => {
    it('basic user cannot access /user/alerts', async () => {
        const { token } = await basicToken(`int_alerts_basic_${Date.now()}@example.com`);
        const res = await app.inject({
            method: 'GET',
            url: '/api/v1/user/alerts',
            headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(403);
    });

    it('premium user can create, list, and delete an alert', async () => {
        const { token } = await premiumToken(`int_alerts_pre_${Date.now()}@example.com`);
        const create = await app.inject({
            method: 'POST',
            url: '/api/v1/user/alerts',
            headers: { authorization: `Bearer ${token}` },
            payload: { target_jurisdiction: 'Canada', keyword: 'express entry' },
        });
        expect(create.statusCode).toBe(201);
        const alertId = create.json().data.alert_id;

        const dup = await app.inject({
            method: 'POST',
            url: '/api/v1/user/alerts',
            headers: { authorization: `Bearer ${token}` },
            payload: { target_jurisdiction: 'Canada', keyword: 'express entry' },
        });
        expect(dup.statusCode).toBe(409);

        const list = await app.inject({
            method: 'GET',
            url: '/api/v1/user/alerts',
            headers: { authorization: `Bearer ${token}` },
        });
        expect(list.statusCode).toBe(200);
        expect(list.json().data.alerts).toHaveLength(1);

        const del = await app.inject({
            method: 'DELETE',
            url: `/api/v1/user/alerts/${alertId}`,
            headers: { authorization: `Bearer ${token}` },
        });
        expect(del.statusCode).toBe(200);
    });

    it('rejects keyword exceeding 50 chars or with special chars', async () => {
        const { token } = await premiumToken(`int_alerts_kw_${Date.now()}@example.com`);
        const long = 'a'.repeat(51);
        const res = await app.inject({
            method: 'POST',
            url: '/api/v1/user/alerts',
            headers: { authorization: `Bearer ${token}` },
            payload: { target_jurisdiction: 'Canada', keyword: long },
        });
        expect(res.statusCode).toBe(400);

        const bad = await app.inject({
            method: 'POST',
            url: '/api/v1/user/alerts',
            headers: { authorization: `Bearer ${token}` },
            payload: { target_jurisdiction: 'Canada', keyword: '!!!' },
        });
        expect(bad.statusCode).toBe(400);
    });
});

describe('Admin endpoint', () => {
    it('returns scraper health', async () => {
        const token = await adminToken();
        const res = await app.inject({
            method: 'GET',
            url: '/api/v1/admin/health',
            headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(200);
        expect(res.json().data.scrapers).toBeDefined();
    });

    it('returns scraper health with failures_in_24h field and dedup summary', async () => {
        const token = await adminToken();
        const res = await app.inject({
            method: 'GET',
            url: '/api/v1/admin/health',
            headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(200);
        const body = res.json();
        expect(body.data).toHaveProperty('summary');
        expect(body.data.summary).toHaveProperty('total_articles');
        expect(body.data.summary).toHaveProperty('dedup_rate_pct');
        expect(body.data.summary).toHaveProperty('scraper_failure_window_hours');
        // Each scraper must include the spec'd `failures_in_24h` field.
        for (const s of body.data.scrapers) {
            expect(s).toHaveProperty('failures_in_24h');
            expect(typeof s.failures_in_24h).toBe('number');
        }
    });
});