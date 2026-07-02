/**
 * Listener helpers for the notification broker.
 *
 * These are utilities for the LISTEN/NOTIFY pathway. They were extracted
 * from the broker itself so the broker file focuses on scheduling and
 * notification routing.
 */
import { Client } from 'pg';
import { config } from '../config.js';

/**
 * Open a dedicated Client (not pool) for LISTEN. The connection stays open
 * for the lifetime of the broker process. Callers are responsible for
 * `.end()` on shutdown.
 */
export async function openListenerClient(): Promise<Client> {
    const client = new Client({ connectionString: config.databaseUrl });
    await client.connect();
    return client;
}

export interface ArticleRow {
    id: string;
    title: string;
    summary: string;
    source_url: string;
    origin_jurisdiction: string;
    publication_date: Date;
    tagging_confidence: number | null;
}

/**
 * Fetch a single article by id. Returns null if not found.
 */
export async function fetchArticleById(articleId: string): Promise<ArticleRow | null> {
    const { query } = await import('../db.js');
    const result = await query<ArticleRow>(
        `SELECT id, title, summary, source_url, origin_jurisdiction, publication_date, tagging_confidence
         FROM articles WHERE id = $1`,
        [articleId]
    );
    return result.rowCount ? result.rows[0] : null;
}

/**
 * Insert an article from another process (e.g. admin/ingest endpoint).
 * Emits the `new_article` notification so the broker picks it up.
 */
export async function insertArticle(): Promise<void> {
    // Implementation lives in feed.ts's /admin/ingest; this stub is kept
    // here to avoid a circular import. The broker does not insert articles.
    throw new Error('insertArticle is not implemented in the broker');
}