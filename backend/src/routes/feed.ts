import type { FastifyInstance, FastifyRequest } from 'fastify';
import { query } from '../db.js';
import { getFeed } from '../services/feed_builder.js';
import { requireAdmin } from '../auth/middleware.js';
import { config } from '../config.js';
import { generateId } from '../utils/id.js';
import { MockEmbeddingClient } from '../utils/mock_embedding.js';

interface IngestBody {
    title: string;
    summary: string;
    source_url: string;
    origin_jurisdiction: string;
    raw_content?: string;
    publisher_authority?: number;
    tags?: string[];
    article_id?: string;
}

async function tryAuth(req: FastifyRequest): Promise<void> {
    try {
        await req.jwtVerify();
        const payload = req.user as { sub?: string; email?: string; role?: string } | undefined;
        if (payload?.sub && payload?.email && payload?.role) {
            req.auth = {
                sub: payload.sub,
                email: payload.email,
                role: payload.role as 'basic' | 'premium' | 'admin',
            };
        }
    } catch {
        req.auth = undefined;
    }
}

export default async function feedRoutes(app: FastifyInstance): Promise<void> {
    app.get<{ Querystring: { limit?: string; view?: string } }>(
        '/feed',
        { preHandler: tryAuth },
        async (req, reply) => {
            const limitParam = req.query?.limit;
            let limit = 10;
            if (limitParam) {
                const parsed = Number(limitParam);
                if (!Number.isFinite(parsed) || parsed < 1) {
                    return reply.code(400).send({ status: 'error', message: 'Invalid limit' });
                }
                limit = Math.min(Math.floor(parsed), 10);
            }

            const view = (req.query?.view ?? 'auto').toString().toLowerCase();
            const forceGlobal = view === 'global';

            let prefs: { preferred_jurisdictions: string[]; preferred_tags: string[] } | null = null;
            if (req.auth && !forceGlobal) {
                const result = await query<{ preferred_jurisdictions: string[]; preferred_tags: string[] }>(
                    `SELECT preferred_jurisdictions, preferred_tags FROM user_preferences WHERE user_id = $1`,
                    [req.auth.sub]
                );
                if (result.rowCount) {
                    prefs = result.rows[0];
                }
            }

            const articles = await getFeed(prefs, limit);
            return reply.code(200).send({
                status: 'success',
                data: { articles, view: forceGlobal ? 'global' : prefs ? 'personalized' : 'global' },
            });
        }
    );

    /**
     * POST /admin/ingest
     * Stage 3.6: Admin-only manual ingestion trigger. Used by tests and ops
     * to push a synthetic article into the database; downstream broker reacts
     * via LISTEN/NOTIFY and dispatches Premium keyword alerts.
     *
     * In production, articles are normally inserted by the ingestion-service
     * via the scraper pipeline. This endpoint is provided for:
     *   - Manual content push from an editor
     *   - E2E test setup
     *   - Replaying a missed scrape
     */
    app.post<{ Body: IngestBody }>(
        '/admin/ingest',
        { preHandler: requireAdmin },
        async (req, reply) => {
            const body = req.body ?? {};
            const { title, summary, source_url, origin_jurisdiction } = body;
            if (!title || !summary || !source_url || !origin_jurisdiction) {
                return reply.code(400).send({
                    status: 'error',
                    message: 'title, summary, source_url, origin_jurisdiction are required',
                });
            }
            if (!source_url.startsWith('http://') && !source_url.startsWith('https://')) {
                return reply.code(400).send({ status: 'error', message: 'source_url must be http(s)' });
            }
            // Stage 5.5.1: deterministic article id. If the caller supplies
            // an `article_id` we use it verbatim; otherwise we generate one.
            // This makes the admin-ingest path safe to call multiple times
            // with the same payload (e.g. an editor republishing a fix).
            const articleId = body.article_id ?? generateId('art');
            const embedding = new MockEmbeddingClient().embed(`${title}\n${summary}`);
            const tags = body.tags ?? [];
            const authority = body.publisher_authority ?? 3;
            const raw = body.raw_content ?? summary;

            await query(
                `INSERT INTO articles (
                    id, title, raw_content, summary, publication_date, source_url,
                    origin_jurisdiction, publisher_authority, embedding, tags
                ) VALUES (
                    $1, $2, $3, $4, NOW(), $5, $6, $7, $8::halfvec, $9
                )
                ON CONFLICT (id) DO NOTHING`,
                [
                    articleId,
                    title,
                    raw,
                    summary,
                    source_url,
                    origin_jurisdiction,
                    authority,
                    `[${embedding.map((x) => x.toFixed(8)).join(',')}]`,
                    tags,
                ]
            );
            // Fire NOTIFY (in the same transaction, or just after).
            await query("SELECT pg_notify('new_article', $1)", [articleId]);

            return reply.code(201).send({
                status: 'success',
                data: { article_id: articleId },
            });
        }
    );
}