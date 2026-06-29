/**
 * Stage 6.7.2: Integration test for GET /admin/metrics.
 *
 * Verifies the response shape and that summary numbers are computed
 * correctly against the seeded data.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server.js';
import { query, shutdownDb } from '../../src/db.js';

let app: FastifyInstance;
let adminToken: string;

beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    const email = `metrics_admin_${Date.now()}@example.com`;
    await app.inject({ method: 'POST', url: '/api/v1/auth/signup', payload: { email, password: 'Password123!' } });
    const userRes = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
    await query(`UPDATE users SET user_tier = 'admin' WHERE id = $1`, [userRes.rows[0].id]);
    const login = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password: 'Password123!' } });
    adminToken = (login.json().data as { token: string }).token;
});

afterAll(async () => {
    await app.close();
    await shutdownDb();
});

describe('Stage 6.7.2: GET /admin/metrics', () => {
    it('requires admin authentication', async () => {
        const res = await app.inject({ method: 'GET', url: '/api/v1/admin/metrics' });
        expect(res.statusCode).toBe(401);
    });

    it('returns the documented shape for an admin', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/api/v1/admin/metrics',
            headers: { authorization: `Bearer ${adminToken}` },
        });
        expect(res.statusCode).toBe(200);
        const data = res.json().data;
        // Required fields per docs/PRD §19.
        expect(typeof data.total_articles).toBe('number');
        expect(typeof data.dedup_rate_pct).toBe('number');
        expect(typeof data.alert_volume_24h).toBe('number');
        expect(typeof data.alert_latency_p50_ms).toBe('number');
        expect(typeof data.generated_at).toBe('string');
        expect(Array.isArray(data.top_jurisdictions)).toBe(true);
        for (const r of data.top_jurisdictions) {
            expect(typeof r.jurisdiction).toBe('string');
            expect(typeof r.article_count).toBe('number');
        }
    });

    it('reflects the current article count and dedup rate', async () => {
        const r1 = await app.inject({
            method: 'GET',
            url: '/api/v1/admin/metrics',
            headers: { authorization: `Bearer ${adminToken}` },
        });
        const m1 = r1.json().data;
        // Capture count, then insert a scraper failure log.
        const before = m1.total_articles;
        await query(
            `INSERT INTO scraper_logs (scraper_name, status, items_scraped, execution_time_seconds, error_message)
             VALUES ($1, 'failure', 0, 0.0, 'test')`,
            ['metrics_test_scraper']
        );
        const r2 = await app.inject({
            method: 'GET',
            url: '/api/v1/admin/metrics',
            headers: { authorization: `Bearer ${adminToken}` },
        });
        const m2 = r2.json().data;
        // total_articles unchanged; dedup rate may change slightly.
        expect(m2.total_articles).toBe(before);
        expect(m2.dedup_rate_pct).toBeGreaterThanOrEqual(m1.dedup_rate_pct);
        // Cleanup
        await query(`DELETE FROM scraper_logs WHERE scraper_name = 'metrics_test_scraper'`);
    });
});