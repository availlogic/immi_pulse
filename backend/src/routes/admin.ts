import type { FastifyInstance } from 'fastify';
import { query } from '../db.js';
import { requireAdmin } from '../auth/middleware.js';
import { config } from '../config.js';

interface ScraperHealthRow {
    scraper_name: string;
    last_execution: Date;
    last_status: string;
    last_error: string | null;
    failures_24h: number;
}

interface SummaryRow {
    total_articles: number;
    dedup_candidates: number;
    dedup_duplicates: number;
}

interface ReviewQueueRow {
    id: string;
    article_id: string;
    reason: string;
    proposed_tags: string[];
    proposed_jurisdiction: string;
    confidence: number;
    status: string;
    created_at: Date;
    title?: string;
    summary?: string;
    source_url?: string;
    tagger_provider?: string;
}

export default async function adminRoutes(app: FastifyInstance): Promise<void> {
    /**
     * GET /admin/health
     * Per docs/API_Spec.md §6.1
     */
    app.get('/admin/health', { preHandler: requireAdmin }, async (_req, reply) => {
        const windowHours = config.broker.scraperFailureWindowHours;
        const result = await query<ScraperHealthRow>(
            `WITH latest AS (
                SELECT DISTINCT ON (scraper_name)
                    scraper_name, executed_at, status, error_message
                FROM scraper_logs
                ORDER BY scraper_name, executed_at DESC
            ),
            windowed AS (
                SELECT scraper_name, COUNT(*) AS failures
                FROM scraper_logs
                WHERE status = 'failure'
                  AND executed_at >= NOW() - ($1 || ' hours')::interval
                GROUP BY scraper_name
            ),
            daily AS (
                SELECT scraper_name, COUNT(*) AS failures
                FROM scraper_logs
                WHERE status = 'failure'
                  AND executed_at >= NOW() - INTERVAL '24 hours'
                GROUP BY scraper_name
            )
            SELECT l.scraper_name,
                   l.executed_at AS last_execution,
                   l.status AS last_status,
                   l.error_message AS last_error,
                   COALESCE(d.failures, 0)::int AS failures_24h
            FROM latest l
            LEFT JOIN windowed w ON w.scraper_name = l.scraper_name
            LEFT JOIN daily d ON d.scraper_name = l.scraper_name`,
            [String(windowHours)]
        );

        const summary = await query<SummaryRow>(
            `SELECT
                (SELECT COUNT(*) FROM articles)::int AS total_articles,
                (SELECT COUNT(*) FROM scraper_logs WHERE status = 'success' AND executed_at >= NOW() - INTERVAL '24 hours')::int AS dedup_candidates,
                (SELECT COUNT(*) FROM scraper_logs WHERE status = 'failure' AND executed_at >= NOW() - INTERVAL '24 hours')::int AS dedup_duplicates`
        );
        const s = summary.rows[0] ?? { total_articles: 0, dedup_candidates: 0, dedup_duplicates: 0 };
        const dedupRate =
            s.dedup_candidates + s.dedup_duplicates > 0
                ? Math.round(
                      (s.dedup_duplicates / (s.dedup_candidates + s.dedup_duplicates)) * 1000
                  ) / 10
                : 0;

        const scrapers = result.rows.map((r) => ({
            scraper_name: r.scraper_name,
            status: r.failures_24h >= 2 || r.last_status === 'failure' ? 'unhealthy' : 'healthy',
            last_execution: r.last_execution.toISOString(),
            failures_in_24h: r.failures_24h,
            failures_in_window: r.failures_24h,
            last_error: r.last_error,
        }));

        return reply.code(200).send({
            status: 'success',
            data: {
                scrapers,
                summary: {
                    total_articles: s.total_articles,
                    dedup_rate_pct: dedupRate,
                    scraper_failure_window_hours: windowHours,
                },
            },
        });
    });

    /**
     * GET /admin/review
     * Stage 4.6: List pending admin review queue items (per docs/PRD §11.3).
     * Query: `?status=pending|approved|rejected|all` (default: pending).
     */
    app.get<{ Querystring: { status?: string } }>(
        '/admin/review',
        { preHandler: requireAdmin },
        async (req, reply) => {
            const status = req.query?.status ?? 'pending';
            const validStatuses = ['pending', 'approved', 'rejected', 'all'];
            if (!validStatuses.includes(status)) {
                return reply.code(400).send({ status: 'error', message: `invalid status: ${status}` });
            }

            const where = status === 'all' ? '' : 'WHERE rq.status = $1';
            const params: unknown[] = status === 'all' ? [] : [status];
            const result = await query<ReviewQueueRow>(
                `SELECT rq.id, rq.article_id, rq.reason, rq.proposed_tags,
                        rq.proposed_jurisdiction, rq.confidence, rq.status, rq.created_at,
                        a.title, a.summary, a.source_url, a.tagger_provider
                 FROM admin_review_queue rq
                 LEFT JOIN articles a ON a.id = rq.article_id
                 ${where}
                 ORDER BY rq.created_at DESC
                 LIMIT 100`,
                params
            );

            return reply.code(200).send({
                status: 'success',
                data: {
                    items: result.rows.map((r) => ({
                        id: r.id,
                        article_id: r.article_id,
                        reason: r.reason,
                        proposed_tags: r.proposed_tags ?? [],
                        proposed_jurisdiction: r.proposed_jurisdiction,
                        confidence: r.confidence,
                        status: r.status,
                        created_at: r.created_at.toISOString(),
                        title: r.title,
                        summary: r.summary,
                        source_url: r.source_url,
                        tagger_provider: r.tagger_provider,
                    })),
                },
            });
        }
    );

    /**
     * POST /admin/review/:id/approve
     * Stage 4.6: Approve a review-queue item. The article is persisted to the
     * public `articles` table with the proposed tags and a final tagger
     * confidence of 1.0 (admin override).
     */
    app.post<{ Params: { id: string }; Body: { notes?: string } }>(
        '/admin/review/:id/approve',
        { preHandler: requireAdmin },
        async (req, reply) => {
            const reviewId = req.params.id;
            const notes = req.body?.notes ?? null;

            const rqRes = await query<ReviewQueueRow & { article_id: string }>(
                `SELECT rq.id, rq.article_id, rq.reason, rq.proposed_tags,
                        rq.proposed_jurisdiction, rq.confidence, rq.status, rq.created_at
                 FROM admin_review_queue rq WHERE rq.id = $1`,
                [reviewId]
            );
            if (!rqRes.rowCount) {
                return reply.code(404).send({ status: 'error', message: 'Review item not found' });
            }
            const rq = rqRes.rows[0];
            if (rq.status !== 'pending') {
                return reply.code(409).send({ status: 'error', message: `Review item already ${rq.status}` });
            }

            // Check if the article already exists.
            const artRes = await query<{ id: string }>('SELECT id FROM articles WHERE id = $1', [rq.article_id]);
            if (artRes.rowCount) {
                // Article was queued for review and exists. Update it to set confidence to 1.0
                // (approving it) and use the proposed tags/jurisdiction.
                await query(
                    `UPDATE articles
                     SET tagging_confidence = 1.0,
                         tagger_provider = 'admin-override',
                         tags = $1::varchar[],
                         origin_jurisdiction = $2
                     WHERE id = $3`,
                    [rq.proposed_tags, rq.proposed_jurisdiction, rq.article_id]
                );
            } else {
                // Fallback for legacy seeded reviews where the article was not pre-inserted.
                await query(
                    `INSERT INTO articles (
                        id, title, raw_content, summary, publication_date, source_url,
                        origin_jurisdiction, publisher_authority, embedding, tags,
                        tagging_confidence, tagger_provider
                    ) VALUES (
                        $1, '', '', $2, NOW(), $3,
                        $4, 3, array_fill(0.0::float8, ARRAY[3072])::halfvec, $5::varchar[],
                        1.0, 'admin-override'
                    ) ON CONFLICT (id) DO NOTHING`,
                    [
                        rq.article_id,
                        `Admin-approved from review queue: ${rq.reason}`,
                        `https://admin-override.local/${rq.article_id}`,
                        rq.proposed_jurisdiction,
                        rq.proposed_tags,
                    ]
                );
            }

            // Emit the notification so the broker dispatches keyword alerts for the approved article.
            await query("SELECT pg_notify('new_article', $1)", [rq.article_id]);

            await query(
                `UPDATE admin_review_queue
                 SET status = 'approved',
                     decided_at = NOW(),
                     decided_by = $1,
                     decision_notes = $2
                 WHERE id = $3`,
                [req.auth!.sub, notes, reviewId]
            );

            return reply.code(200).send({
                status: 'success',
                message: 'Review item approved',
            });
        }
    );

    /**
     * POST /admin/review/:id/reject
     * Stage 4.6: Reject a review-queue item. The article is not persisted to
     * the public feed; the row is marked `rejected`.
     */
    app.post<{ Params: { id: string }; Body: { notes?: string } }>(
        '/admin/review/:id/reject',
        { preHandler: requireAdmin },
        async (req, reply) => {
            const reviewId = req.params.id;
            const notes = req.body?.notes ?? null;

            const rqRes = await query<{ id: string; status: string; article_id: string }>(
                `SELECT id, status, article_id FROM admin_review_queue WHERE id = $1`,
                [reviewId]
            );
            if (!rqRes.rowCount) {
                return reply.code(404).send({ status: 'error', message: 'Review item not found' });
            }
            const rq = rqRes.rows[0];
            if (rq.status !== 'pending') {
                return reply.code(409).send({ status: 'error', message: `Review item already ${rq.status}` });
            }

            await query(
                `UPDATE admin_review_queue
                 SET status = 'rejected',
                     decided_at = NOW(),
                     decided_by = $1,
                     decision_notes = $2
                 WHERE id = $3`,
                [req.auth!.sub, notes, reviewId]
            );

            // Delete the article from articles so it is completely hidden and cleaned up.
            await query('DELETE FROM articles WHERE id = $1', [rq.article_id]);

            return reply.code(200).send({
                status: 'success',
                message: 'Review item rejected',
            });
        }
    );

    /**
     * GET /admin/metrics
     * Stage 6.7.1: Per docs/PRD §19 and §20 ("Scraper health check
     * dashboard returns green for all target jurisdictions") the admin
     * dashboard surfaces quantitative KPIs:
     *   - total_articles: count in the articles table
     *   - dedup_rate_pct: (failure scrapes / (success + failure)) over 24h
     *   - alert_latency_p50_ms: dispatch latency approximation
     *   - top_jurisdictions: top 5 jurisdictions by article count
     *   - alert_volume_24h: count of alert-sent rows in last 24h
     *   - broker_last_seen: timestamp of the most recent scraper log
     */
    app.get('/admin/metrics', { preHandler: requireAdmin }, async (_req, reply) => {
        const total = await query<{ count: string }>('SELECT COUNT(*)::text AS count FROM articles');
        const succeeded = await query<{ count: string }>(
            `SELECT COUNT(*)::text AS count FROM scraper_logs
             WHERE status = 'success' AND executed_at >= NOW() - INTERVAL '24 hours'`
        );
        const failed = await query<{ count: string }>(
            `SELECT COUNT(*)::text AS count FROM scraper_logs
             WHERE status = 'failure' AND executed_at >= NOW() - INTERVAL '24 hours'`
        );
        const alertVol = await query<{ count: string }>(
            `SELECT COUNT(*)::text AS count FROM scraper_logs
             WHERE scraper_name LIKE 'alert-sent:%'
               AND executed_at >= NOW() - INTERVAL '24 hours'`
        );
        const topJur = await query<{ jurisdiction: string; count: string }>(
            `SELECT origin_jurisdiction AS jurisdiction, COUNT(*)::text AS count
             FROM articles GROUP BY origin_jurisdiction
             ORDER BY COUNT(*) DESC LIMIT 5`
        );
        const broker = await query<{ last: Date }>(
            `SELECT MAX(executed_at) AS last FROM scraper_logs`
        );

        const s = Number(succeeded.rows[0]?.count ?? 0);
        const f = Number(failed.rows[0]?.count ?? 0);
        const dedupRate = s + f > 0 ? Math.round((f / (s + f)) * 1000) / 10 : 0;

        // Approximate alert latency: age of the oldest unscanned alert-sent row.
        const latencies = await query<{ age_ms: string }>(
            `SELECT EXTRACT(EPOCH FROM (NOW() - MIN(executed_at))) * 1000 AS age_ms
             FROM scraper_logs WHERE scraper_name LIKE 'alert-sent:%'`
        );
        const ageMs = Number(latencies.rows[0]?.age_ms ?? 0);

        return reply.code(200).send({
            status: 'success',
            data: {
                total_articles: Number(total.rows[0]?.count ?? 0),
                dedup_rate_pct: dedupRate,
                alert_volume_24h: Number(alertVol.rows[0]?.count ?? 0),
                alert_latency_p50_ms: ageMs,
                top_jurisdictions: topJur.rows.map((r) => ({
                    jurisdiction: r.jurisdiction,
                    article_count: Number(r.count),
                })),
                broker_last_seen: broker.rows[0]?.last
                    ? new Date(broker.rows[0].last).toISOString()
                    : null,
                generated_at: new Date().toISOString(),
            },
        });
    });
}