/**
 * Stage 5.5.2: Integration tests for admin-inserted article ID stability.
 *
 * The /admin/ingest endpoint now supports a caller-supplied `article_id`.
 * This is useful when:
 *   - A queued (low-confidence) article is approved and we want to use a
 *     stable ID across the queue and the published article.
 *   - An editor republishes a corrected version of the same article.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server.js';
import { query, shutdownDb } from '../../src/db.js';

let app: FastifyInstance;
let adminToken: string;

beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create + promote a fresh admin user.
    const email = `id_safety_admin_${Date.now()}@example.com`;
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

beforeEach(async () => {
    await query(`DELETE FROM articles WHERE id LIKE 'art_id_safety_%'`);
    await query(`DELETE FROM admin_review_queue WHERE article_id LIKE 'art_id_safety_%'`);
});

describe('Stage 5.5.2: admin/ingest article_id stability', () => {
    it('uses caller-supplied article_id when provided', async () => {
        const articleId = `art_id_safety_${Date.now()}_a`;
        const res = await app.inject({
            method: 'POST',
            url: '/api/v1/admin/ingest',
            headers: { authorization: `Bearer ${adminToken}` },
            payload: {
                article_id: articleId,
                title: 'Stable ID test A',
                summary: 'summary',
                source_url: 'https://example.com/stable-a',
                origin_jurisdiction: 'US',
                publisher_authority: 4,
            },
        });
        expect(res.statusCode).toBe(201);
        expect((res.json().data as { article_id: string }).article_id).toBe(articleId);

        const stored = await query<{ id: string }>(
            'SELECT id FROM articles WHERE id = $1',
            [articleId]
        );
        expect(stored.rowCount).toBe(1);
    });

    it('generates a fresh id when not provided', async () => {
        const res = await app.inject({
            method: 'POST',
            url: '/api/v1/admin/ingest',
            headers: { authorization: `Bearer ${adminToken}` },
            payload: {
                title: 'Auto ID test',
                summary: 'summary',
                source_url: 'https://example.com/auto',
                origin_jurisdiction: 'US',
                publisher_authority: 4,
            },
        });
        expect(res.statusCode).toBe(201);
        const id = (res.json().data as { article_id: string }).article_id;
        expect(id).toMatch(/^art_[a-z0-9]{8}$/);
    });

    it('idempotent re-ingest of the same article_id (ON CONFLICT DO NOTHING)', async () => {
        const articleId = `art_id_safety_${Date.now()}_idem`;
        const payload = {
            article_id: articleId,
            title: 'Idempotent test',
            summary: 'first version',
            source_url: 'https://example.com/idem',
            origin_jurisdiction: 'US',
            publisher_authority: 4,
        };
        const r1 = await app.inject({
            method: 'POST',
            url: '/api/v1/admin/ingest',
            headers: { authorization: `Bearer ${adminToken}` },
            payload,
        });
        expect(r1.statusCode).toBe(201);
        // Re-ingest the same article_id with a different summary. The
        // original row should remain (ON CONFLICT DO NOTHING).
        const r2 = await app.inject({
            method: 'POST',
            url: '/api/v1/admin/ingest',
            headers: { authorization: `Bearer ${adminToken}` },
            payload: { ...payload, summary: 'updated version' },
        });
        expect(r2.statusCode).toBe(201);

        const stored = await query<{ summary: string }>(
            'SELECT summary FROM articles WHERE id = $1',
            [articleId]
        );
        expect(stored.rowCount).toBe(1);
        // The original summary remains; the new one is ignored.
        expect(stored.rows[0].summary).toBe('first version');
    });
});