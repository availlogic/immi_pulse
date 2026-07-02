import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server.js';
import { query, shutdownDb } from '../../src/db.js';

let app: FastifyInstance;
let adminToken: string;

async function createAdminAndLogin(): Promise<string> {
    const email = `unapproved_admin_${Date.now()}@example.com`;
    await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: { email, password: 'Password123!' },
    });
    const r = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
    await query(`UPDATE users SET user_tier = 'admin' WHERE id = $1`, [r.rows[0].id]);
    const login = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password: 'Password123!' },
    });
    return login.json().data.token as string;
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
    await query(`DELETE FROM admin_review_queue WHERE article_id LIKE 'art_unapp_%'`);
    await query(`DELETE FROM articles WHERE id LIKE 'art_unapp_%'`);
});

describe('Unapproved articles filtering & admin lifecycle integration', () => {
    it('unapproved low-confidence articles are hidden from feed, shown on approval, deleted on rejection', async () => {
        const articleId = `art_unapp_${Date.now()}`;
        const reviewId = `rev_${articleId}`;

        // 1. Insert low-confidence article and pending review row
        await query(
            `INSERT INTO articles (id, title, raw_content, summary, publication_date, source_url,
                origin_jurisdiction, publisher_authority, embedding, tags, tagging_confidence, tagger_provider)
             VALUES ($1, 'Unapproved News Article', 'body', 'summary', NOW(), $2, 'US', 3,
                array_fill(0.0::float8, ARRAY[3072])::halfvec, '{}'::varchar[], 0.50, 'keyword')`,
            [articleId, `https://unapproved/${articleId}`]
        );
        await query(
            `INSERT INTO admin_review_queue (id, article_id, reason, proposed_tags, proposed_jurisdiction, confidence, status)
             VALUES ($1, $2, 'low confidence', '{}'::varchar[], 'US', 0.50, 'pending')`,
            [reviewId, articleId]
        );

        // 2. Fetch feed - verify the unapproved article is NOT present
        const feedRes = await app.inject({
            method: 'GET',
            url: '/api/v1/feed',
        });
        expect(feedRes.statusCode).toBe(200);
        const feedArticles = feedRes.json().data.articles as Array<{ article_id: string }>;
        const foundInFeed = feedArticles.some((a) => a.article_id === articleId);
        expect(foundInFeed).toBe(false);

        // 3. Approve the review item via admin endpoint
        const approveRes = await app.inject({
            method: 'POST',
            url: `/api/v1/admin/review/${reviewId}/approve`,
            headers: { authorization: `Bearer ${adminToken}` },
        });
        expect(approveRes.statusCode).toBe(200);

        // 4. Fetch feed again - verify the approved article IS now present
        const feedRes2 = await app.inject({
            method: 'GET',
            url: '/api/v1/feed',
        });
        expect(feedRes2.statusCode).toBe(200);
        const feedArticles2 = feedRes2.json().data.articles as Array<{ article_id: string }>;
        const foundInFeed2 = feedArticles2.some((a) => a.article_id === articleId);
        expect(foundInFeed2).toBe(true);

        // 5. Ingest another article, reject it, verify deletion
        const articleId2 = `art_unapp_${Date.now()}_2`;
        const reviewId2 = `rev_${articleId2}`;
        await query(
            `INSERT INTO articles (id, title, raw_content, summary, publication_date, source_url,
                origin_jurisdiction, publisher_authority, embedding, tags, tagging_confidence, tagger_provider)
             VALUES ($1, 'Rejected News Article', 'body', 'summary', NOW(), $2, 'US', 3,
                array_fill(0.0::float8, ARRAY[3072])::halfvec, '{}'::varchar[], 0.50, 'keyword')`,
            [articleId2, `https://rejected/${articleId2}`]
        );
        await query(
            `INSERT INTO admin_review_queue (id, article_id, reason, proposed_tags, proposed_jurisdiction, confidence, status)
             VALUES ($1, $2, 'low confidence', '{}'::varchar[], 'US', 0.50, 'pending')`,
            [reviewId2, articleId2]
        );

        const rejectRes = await app.inject({
            method: 'POST',
            url: `/api/v1/admin/review/${reviewId2}/reject`,
            headers: { authorization: `Bearer ${adminToken}` },
        });
        expect(rejectRes.statusCode).toBe(200);

        const checkDeleted = await query<{ id: string }>('SELECT id FROM articles WHERE id = $1', [articleId2]);
        expect(checkDeleted.rowCount).toBe(0);
    });
});
