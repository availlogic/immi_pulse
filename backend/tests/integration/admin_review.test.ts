/**
 * Stage 4.6: Integration tests for the admin review queue endpoints.
 * Per docs/PRD §11.3: classifier confidence < 0.85 routes to admin queue.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server.js';
import { query, shutdownDb } from '../../src/db.js';
import { generateId } from '../../src/utils/id.js';

let app: FastifyInstance;
let adminToken: string;

async function createAdminAndLogin(): Promise<string> {
    const email = `int_stage4_admin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
    await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: { email, password: 'Password123!' },
    });
    const userId = JSON.parse(
        (await app.inject({ method: 'POST', url: '/api/v1/auth/signup', payload: { email, password: 'Password123!' } })).body
    ).data?.user_id as string | undefined;
    // The previous signup would 409; find the actual user_id.
    if (!userId) {
        const r = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
        await query(`UPDATE users SET user_tier = 'admin' WHERE id = $1`, [r.rows[0].id]);
        const login = await app.inject({
            method: 'POST',
            url: '/api/v1/auth/login',
            payload: { email, password: 'Password123!' },
        });
        return login.json().data.token as string;
    }
    await query(`UPDATE users SET user_tier = 'admin' WHERE id = $1`, [userId]);
    const login = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password: 'Password123!' },
    });
    return login.json().data.token as string;
}

async function seedReviewItem(articleId: string, confidence: number): Promise<string> {
    const reviewId = `rev_${articleId}`;
    // Insert a minimal article so the foreign key is satisfied.
    await query(
        `INSERT INTO articles (id, title, raw_content, summary, publication_date, source_url,
            origin_jurisdiction, publisher_authority, embedding, tags, tagger_provider)
         VALUES ($1, 'Stage 4 review test', 'body', 'summary', NOW(), $2, 'US', 3,
            array_fill(0.0::float8, ARRAY[3072])::vector, '{}'::varchar[], 'keyword')
         ON CONFLICT (id) DO NOTHING`,
        [articleId, `https://stage4/${articleId}`]
    );
    await query(
        `INSERT INTO admin_review_queue (id, article_id, reason, proposed_tags, proposed_jurisdiction, confidence, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')
         ON CONFLICT (id) DO NOTHING`,
        [reviewId, articleId, 'low confidence', ['Corporate Sponsorship'], 'US', confidence]
    );
    return reviewId;
}

beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    adminToken = await createAdminAndLogin();
});

afterAll(async () => {
    await app.close();
    await shutdownDb();
});

beforeEach(async () => {
    await query(`DELETE FROM admin_review_queue WHERE article_id LIKE 'art_stage4_%'`);
    await query(`DELETE FROM articles WHERE id LIKE 'art_stage4_%'`);
});

describe('Stage 4.6: Admin review queue endpoints', () => {
    it('GET /admin/review requires admin', async () => {
        const email = `int_stage4_basic_${Date.now()}@example.com`;
        await app.inject({ method: 'POST', url: '/api/v1/auth/signup', payload: { email, password: 'Password123!' } });
        const login = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password: 'Password123!' } });
        const basicToken = login.json().data.token as string;
        const res = await app.inject({
            method: 'GET',
            url: '/api/v1/admin/review',
            headers: { authorization: `Bearer ${basicToken}` },
        });
        expect(res.statusCode).toBe(403);
    });

    it('GET /admin/review lists pending items', async () => {
        const articleId = `art_stage4_${Date.now()}_1`;
        const reviewId = await seedReviewItem(articleId, 0.42);

        const res = await app.inject({
            method: 'GET',
            url: '/api/v1/admin/review',
            headers: { authorization: `Bearer ${adminToken}` },
        });
        expect(res.statusCode).toBe(200);
        const items = res.json().data.items as Array<{ id: string; article_id: string; confidence: number }>;
        const found = items.find((it) => it.id === reviewId);
        expect(found).toBeDefined();
        expect(found!.article_id).toBe(articleId);
        expect(found!.confidence).toBeCloseTo(0.42, 5);
    });

    it('POST /admin/review/:id/approve marks the item approved', async () => {
        const articleId = `art_stage4_${Date.now()}_2`;
        const reviewId = await seedReviewItem(articleId, 0.6);

        const res = await app.inject({
            method: 'POST',
            url: `/api/v1/admin/review/${reviewId}/approve`,
            headers: { authorization: `Bearer ${adminToken}` },
            payload: { notes: 'Looks correct' },
        });
        expect(res.statusCode).toBe(200);

        const list = await app.inject({
            method: 'GET',
            url: '/api/v1/admin/review?status=approved',
            headers: { authorization: `Bearer ${adminToken}` },
        });
        const items = list.json().data.items as Array<{ id: string; status: string }>;
        const found = items.find((it) => it.id === reviewId);
        expect(found).toBeDefined();
        expect(found!.status).toBe('approved');
    });

    it('POST /admin/review/:id/reject marks the item rejected', async () => {
        const articleId = `art_stage4_${Date.now()}_3`;
        const reviewId = await seedReviewItem(articleId, 0.55);

        const res = await app.inject({
            method: 'POST',
            url: `/api/v1/admin/review/${reviewId}/reject`,
            headers: { authorization: `Bearer ${adminToken}` },
            payload: { notes: 'Out of scope' },
        });
        expect(res.statusCode).toBe(200);

        const list = await app.inject({
            method: 'GET',
            url: '/api/v1/admin/review?status=rejected',
            headers: { authorization: `Bearer ${adminToken}` },
        });
        const items = list.json().data.items as Array<{ id: string; status: string }>;
        const found = items.find((it) => it.id === reviewId);
        expect(found).toBeDefined();
        expect(found!.status).toBe('rejected');
    });

    it('Approve twice returns 409', async () => {
        const articleId = `art_stage4_${Date.now()}_4`;
        const reviewId = await seedReviewItem(articleId, 0.7);

        const first = await app.inject({
            method: 'POST',
            url: `/api/v1/admin/review/${reviewId}/approve`,
            headers: { authorization: `Bearer ${adminToken}` },
        });
        expect(first.statusCode).toBe(200);

        const second = await app.inject({
            method: 'POST',
            url: `/api/v1/admin/review/${reviewId}/approve`,
            headers: { authorization: `Bearer ${adminToken}` },
        });
        expect(second.statusCode).toBe(409);
    });
});