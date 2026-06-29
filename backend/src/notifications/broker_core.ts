import { query } from '../db.js';
import { config } from '../config.js';
import { applyDiversity } from '../services/diversity.js';
import { sendEmail } from './mailer.js';
import { digestEmailTemplate, alertEmailTemplate } from './templates.js';

interface AlertRow {
    alert_id: string;
    user_id: string;
    email: string;
    target_jurisdiction: string;
    keyword: string;
    jurisdiction_code: string | null;
}

interface ArticleRow {
    id: string;
    title: string;
    summary: string;
    source_url: string;
    origin_jurisdiction: string;
    tags: string[];
    publisher_authority: number;
    publication_date: Date;
}

interface RecentInsert {
    article_id: string;
    origin_jurisdiction: string;
    jurisdiction_name: string | null;
    title: string;
    summary: string;
    source_url: string;
}

/**
 * Match new articles against Premium keyword alerts and dispatch immediate emails.
 * Source: list of articles inserted since `since` parameter.
 */
export async function dispatchKeywordAlerts(since: Date): Promise<number> {
    const recent = await query<RecentInsert>(
        `SELECT a.id AS article_id,
                a.origin_jurisdiction,
                j.name AS jurisdiction_name,
                a.title,
                a.summary,
                a.source_url
         FROM articles a
         LEFT JOIN jurisdictions j ON j.code = a.origin_jurisdiction
         WHERE a.created_at >= $1`,
        [since]
    );
    if (!recent.rowCount) return 0;

    const alerts = await query<AlertRow>(
        `SELECT al.id AS alert_id,
                al.user_id,
                u.email,
                al.target_jurisdiction,
                al.keyword,
                j.code AS jurisdiction_code
         FROM user_alerts al
         JOIN users u ON u.id = al.user_id
         LEFT JOIN jurisdictions j ON j.name = al.target_jurisdiction
         WHERE u.user_tier IN ('premium', 'admin')`
    );
    if (!alerts.rowCount) return 0;

    let sent = 0;
    for (const article of recent.rows) {
        const articleJurisdictionName = article.jurisdiction_name ?? article.origin_jurisdiction;
        const haystack = `${article.title}\n${article.summary}`.toLowerCase();
        for (const alert of alerts.rows) {
            if (alert.target_jurisdiction !== articleJurisdictionName) continue;
            if (!haystack.includes(alert.keyword.toLowerCase())) continue;

            // Avoid duplicate alerts for the same article/user pair.
            const sentKey = `${alert.user_id}:${article.article_id}`;
            const dedup = await query<{ id: string }>(
                `SELECT id FROM scraper_logs WHERE scraper_name = $1 AND executed_at >= $2 LIMIT 1`,
                [`alert-sent:${sentKey}`, since]
            );
            if (dedup.rowCount) continue;

            const tpl = alertEmailTemplate({
                title: article.title,
                summary: article.summary,
                source_url: article.source_url,
                jurisdiction: articleJurisdictionName,
            });
            await sendEmail({ to: alert.email, ...tpl });
            await query(
                `INSERT INTO scraper_logs (scraper_name, status, items_scraped, execution_time_seconds)
                 VALUES ($1, 'success', 1, 0)`,
                [`alert-sent:${sentKey}`]
            );
            sent++;
        }
    }
    return sent;
}

interface DigestRecipient {
    user_id: string;
    email: string;
    preferred_jurisdictions: string[];
    preferred_tags: string[];
    digest_frequency: string;
}

export async function dispatchDigests(frequency: 'daily' | 'weekly'): Promise<number> {
    const recipients = await query<DigestRecipient>(
        `SELECT u.id AS user_id,
                u.email,
                p.preferred_jurisdictions,
                p.preferred_tags,
                p.digest_frequency
         FROM users u
         JOIN user_preferences p ON p.user_id = u.id
         WHERE p.digest_frequency = $1
           AND u.user_tier IN ('basic', 'premium', 'admin')`,
        [frequency]
    );
    if (!recipients.rowCount) return 0;

    let sent = 0;
    for (const recipient of recipients.rows) {
        const params: unknown[] = [];
        const conditions: string[] = [`publication_date >= NOW() - INTERVAL '60 days'`];
        if (recipient.preferred_jurisdictions.length > 0) {
            params.push(recipient.preferred_jurisdictions);
            conditions.push(`origin_jurisdiction = ANY($${params.length}::varchar[])`);
        }
        if (recipient.preferred_tags.length > 0) {
            params.push(recipient.preferred_tags);
            conditions.push(`tags && $${params.length}::varchar[]`);
        }
        params.push(40);
        const rows = await query<ArticleRow>(
            `SELECT id, title, summary, source_url, origin_jurisdiction, tags, publisher_authority, publication_date
             FROM articles WHERE ${conditions.join(' AND ')}
             ORDER BY publication_date DESC LIMIT $${params.length}`,
            params
        );
        if (!rows.rowCount) continue;

        const articles = applyDiversity(rows.rows, { maxItems: config.feed.maxItems }).map((a) => ({
            title: a.title,
            summary: a.summary,
            source_url: a.source_url,
            origin_jurisdiction: a.origin_jurisdiction,
        }));
        if (articles.length === 0) continue;

        const tpl = digestEmailTemplate({
            displayName: recipient.email.split('@')[0],
            articles,
            periodLabel: frequency === 'daily' ? 'Daily' : 'Weekly',
        });
        await sendEmail({ to: recipient.email, ...tpl });
        sent++;
    }
    return sent;
}