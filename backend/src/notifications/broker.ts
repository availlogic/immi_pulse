/**
 * Notification Broker — Stage 3 LISTEN/NOTIFY implementation.
 *
 * Per docs/Architecture.md §4, the broker should "Listen for database
 * insertions to match Premium users' keyword rules" and "Trigger immediate
 * transactional email dispatches for keyword alert matches".
 *
 * Previously this was implemented as a 15 s poll (Stage 1). Stage 3
 * replaces the poll with Postgres LISTEN/NOTIFY: the ingestion service
 * emits `pg_notify('new_article', article_id)` on every article INSERT,
 * and this broker holds an open `pg.Client` connection subscribed to the
 * `new_article` channel. When a notification arrives, the broker loads
 * the article and any matching Premium keyword alerts, then dispatches
 * emails immediately.
 *
 * Daily/weekly digests are still scheduled (Stage 2) via setTimeout at
 * 07:00 UTC; this file is the single entry point for the broker process.
 */
import { Client } from 'pg';
import { config } from '../config.js';
import { dispatchDigests } from './broker_core.js';
import { shutdownDb, query } from '../db.js';
import { fetchArticleById, openListenerClient } from './listener_helpers.js';

let lastDailyRun = '';
let lastWeeklyRun = '';

function periodKey(date: Date, frequency: 'daily' | 'weekly'): string {
    if (frequency === 'daily') {
        return date.toISOString().slice(0, 10);
    }
    const tmp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${tmp.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function nextDaily0700Utc(now: Date = new Date()): Date {
    const target = new Date(now);
    target.setUTCHours(7, 0, 0, 0);
    if (target.getTime() <= now.getTime()) {
        target.setUTCDate(target.getUTCDate() + 1);
    }
    return target;
}

function nextWeeklyMonday0700Utc(now: Date = new Date()): Date {
    const target = new Date(now);
    if (target.getUTCDay() === 1 && (target.getUTCHours() < 7 || (target.getUTCHours() === 7 && target.getUTCMinutes() === 0 && target.getUTCSeconds() === 0 && target.getUTCMilliseconds() === 0))) {
        target.setUTCHours(7, 0, 0, 0);
        return target;
    }
    const daysUntilMonday = (1 - target.getUTCDay() + 7) % 7 || 7;
    target.setUTCDate(target.getUTCDate() + daysUntilMonday);
    target.setUTCHours(7, 0, 0, 0);
    return target;
}

interface ScraperFailureRow {
    scraper_name: string;
    failures: number;
    last_failure: Date | null;
}

async function checkScraperFailures(): Promise<void> {
    const windowHours = config.broker.scraperFailureWindowHours;
    const result = await query<ScraperFailureRow>(
        `SELECT scraper_name,
                COUNT(*)::int AS failures,
                MAX(executed_at) AS last_failure
         FROM scraper_logs
         WHERE status = 'failure'
           AND executed_at >= NOW() - ($1 || ' hours')::interval
         GROUP BY scraper_name
         HAVING COUNT(*) >= 2`,
        [String(windowHours)]
    );
    for (const row of result.rows) {
        // eslint-disable-next-line no-console
        console.warn(
            `[broker] scraper failure alert: ${row.scraper_name} failed ${row.failures} times ` +
                `within ${windowHours}h (last: ${row.last_failure?.toISOString() ?? 'n/a'})`
        );
    }
}

/**
 * Process a single article insertion notification.
 * Called by the LISTEN handler in `startBroker`.
 */
async function handleNewArticle(articleId: string): Promise<void> {
    try {
        const article = await fetchArticleById(articleId);
        if (!article) return;

        // Dispatch keyword alerts for this single article (synchronous).
        const sent = await dispatchKeywordAlertsForArticle(article);
        if (sent > 0) {
            // eslint-disable-next-line no-console
            console.log(`[broker] article=${articleId} dispatched ${sent} keyword alert email(s) (LISTEN/NOTIFY)`);
        }
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[broker] handleNewArticle failed for ${articleId}:`, err);
    }
}

/**
 * Stage 3 LISTEN/NOTIFY handler.
 *
 * Subscribes to the `new_article` channel. On each notification, fetches
 * the article and dispatches matching Premium keyword alerts.
 */
async function startListener(): Promise<Client> {
    const client = await openListenerClient();
    client.on('error', (err) => {
        // eslint-disable-next-line no-console
        console.error('[broker] pg client error', err);
    });
    client.on('end', () => {
        // eslint-disable-next-line no-console
        console.warn('[broker] pg client disconnected; broker will exit');
        process.exit(1);
    });
    client.on('notification', (msg) => {
        if (msg.channel !== 'new_article') return;
        const articleId = msg.payload;
        if (!articleId) return;
        // Fire-and-forget; errors are logged inside the handler.
        void handleNewArticle(articleId);
    });
    await client.query('LISTEN new_article');
    // eslint-disable-next-line no-console
    console.log('[broker] listening on channel "new_article"');
    return client;
}

/**
 * Dispatch Premium keyword alerts for a single article.
 * Mirrors the bulk `dispatchKeywordAlerts` but targets a single article_id.
 */
async function dispatchKeywordAlertsForArticle(article: {
    id: string;
    origin_jurisdiction: string;
    title: string;
    summary: string;
    source_url: string;
    publication_date: Date;
}): Promise<number> {
    // Build haystack from title + summary + raw_content (joined on caller side).
    const haystack = `${article.title}\n${article.summary}`.toLowerCase();

    // Find all Premium alerts whose jurisdiction matches.
    const alerts = await query<{
        alert_id: string;
        user_id: string;
        email: string;
        target_jurisdiction: string;
        keyword: string;
    }>(
        `SELECT al.id AS alert_id,
                al.user_id,
                u.email,
                al.target_jurisdiction,
                al.keyword
         FROM user_alerts al
         JOIN users u ON u.id = al.user_id
         LEFT JOIN jurisdictions j ON j.name = al.target_jurisdiction
         WHERE u.user_tier IN ('premium', 'admin')
           AND (j.code = $1 OR al.target_jurisdiction = $2)`,
        [article.origin_jurisdiction, article.origin_jurisdiction]
    );

    if (!alerts.rowCount) return 0;

    let sent = 0;
    for (const alert of alerts.rows) {
        if (!haystack.includes(alert.keyword.toLowerCase())) continue;
        // Dedup: skip if we've already sent this (user, article) pair.
        const dedupKey = `alert-sent:${alert.user_id}:${article.id}`;
        const dup = await query<{ id: string }>(
            `SELECT id FROM scraper_logs WHERE scraper_name = $1 LIMIT 1`,
            [dedupKey]
        );
        if (dup.rowCount) continue;

        const { alertEmailTemplate } = await import('./templates.js');
        const tpl = alertEmailTemplate({
            title: article.title,
            summary: article.summary,
            source_url: article.source_url,
            jurisdiction: alert.target_jurisdiction,
        });
        const { sendEmail } = await import('./mailer.js');
        await sendEmail({ to: alert.email, ...tpl });
        await query(
            `INSERT INTO scraper_logs (scraper_name, status, items_scraped, execution_time_seconds)
             VALUES ($1, 'success', 1, 0)`,
            [dedupKey]
        );
        sent++;
    }
    return sent;
}

async function scheduleDigests(client: Client): Promise<void> {
    const now = new Date();
    const nextDaily = nextDaily0700Utc(now);
    const msUntilDaily = nextDaily.getTime() - now.getTime();
    // eslint-disable-next-line no-console
    console.log(`[broker] next daily digest at ${nextDaily.toISOString()} (in ${Math.round(msUntilDaily / 1000)}s)`);

    setTimeout(async () => {
        try {
            const sent = await dispatchDigests('daily');
            // eslint-disable-next-line no-console
            console.log(`[broker] dispatched ${sent} daily digest(s) (scheduled)`);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[broker] scheduled daily dispatch failed', err);
        }
        setInterval(
            async () => {
                try {
                    const sent = await dispatchDigests('daily');
                    // eslint-disable-next-line no-console
                    console.log(`[broker] dispatched ${sent} daily digest(s) (interval)`);
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error('[broker] interval daily dispatch failed', err);
                }
            },
            24 * 60 * 60 * 1000
        );
    }, msUntilDaily);

    const nextWeekly = nextWeeklyMonday0700Utc(now);
    const msUntilWeekly = nextWeekly.getTime() - now.getTime();
    // eslint-disable-next-line no-console
    console.log(`[broker] next weekly digest at ${nextWeekly.toISOString()} (in ${Math.round(msUntilWeekly / 1000)}s)`);

    setTimeout(async () => {
        try {
            const sent = await dispatchDigests('weekly');
            // eslint-disable-next-line no-console
            console.log(`[broker] dispatched ${sent} weekly digest(s) (scheduled)`);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[broker] scheduled weekly dispatch failed', err);
        }
        setInterval(
            async () => {
                try {
                    const sent = await dispatchDigests('weekly');
                    // eslint-disable-next-line no-console
                    console.log(`[broker] dispatched ${sent} weekly digest(s) (interval)`);
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error('[broker] interval weekly dispatch failed', err);
                }
            },
            7 * 24 * 60 * 60 * 1000
        );
    }, msUntilWeekly);

    // Polling loop retained ONLY for scraper failure detection (a 15 s tick is fine
    // for that — it doesn't need to be real-time; this is a health check, not an
    // alert dispatch pathway).
    setInterval(async () => {
        try {
            await checkScraperFailures();
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[broker] scraper health check failed', err);
        }
    }, config.broker.pollIntervalSeconds * 1000);
}

async function main(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(
        `[broker] starting; LISTEN/NOTIFY mode; poll=${config.broker.pollIntervalSeconds}s (scraper health only); ` +
            `scraper_failure_window=${config.broker.scraperFailureWindowHours}h`
    );

    // Backward-compat: a separate Client for LISTEN.
    const listener = await startListener();
    void scheduleDigests(listener);

    process.on('SIGINT', async () => {
        // eslint-disable-next-line no-console
        console.log('[broker] shutting down');
        try {
            await listener.end();
        } catch {
            // ignore
        }
        await shutdownDb();
        process.exit(0);
    });
}

const isBroker = process.argv[1] && process.argv[1].endsWith('broker.ts');
if (isBroker) {
    main().catch((err) => {
        // eslint-disable-next-line no-console
        console.error('[broker] fatal', err);
        process.exit(1);
    });
}

export { nextDaily0700Utc, nextWeeklyMonday0700Utc, periodKey, checkScraperFailures, handleNewArticle };

// Re-export core dispatch functions so consumers/tests can import from a single place.
export { dispatchDigests, dispatchKeywordAlerts } from './broker_core.js';
// (intentionally re-exported for backward compatibility with the unit tests.)