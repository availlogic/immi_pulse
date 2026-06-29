import { query } from '../db.js';
import { applyDiversity } from './diversity.js';

export interface FeedPreferences {
    preferred_jurisdictions: string[];
    preferred_tags: string[];
}

export interface FeedArticle {
    article_id: string;
    title: string;
    summary: string;
    publication_date: string;
    source_url: string;
    origin_jurisdiction: string;
    tags: string[];
    is_analysis: boolean;
    alternative_sources: string[];
    publisher_authority: number;
}

const SELECT_COLUMNS = `
    id, title, summary, publication_date, source_url,
    origin_jurisdiction, tags, is_analysis, alternative_sources, publisher_authority
`;

export async function buildGlobalFeed(limit = 10): Promise<FeedArticle[]> {
    const result = await query<{
        id: string;
        title: string;
        summary: string;
        publication_date: Date;
        source_url: string;
        origin_jurisdiction: string;
        tags: string[];
        is_analysis: boolean;
        alternative_sources: string[];
        publisher_authority: number;
    }>(
        `SELECT ${SELECT_COLUMNS}
         FROM articles
         WHERE publication_date >= NOW() - INTERVAL '60 days'
         ORDER BY publication_date DESC
         LIMIT $1`,
        [Math.min(limit, 10) * 4] // fetch pool > 10 then apply diversity
    );

    return result.rows.map(toFeedArticle);
}

export async function buildPersonalizedFeed(
    prefs: FeedPreferences,
    limit = 10
): Promise<FeedArticle[]> {
    // Fetch pool from preferred jurisdictions, tagged if requested.
    const params: unknown[] = [];
    const conditions: string[] = [`publication_date >= NOW() - INTERVAL '60 days'`];

    if (prefs.preferred_jurisdictions.length > 0) {
        params.push(prefs.preferred_jurisdictions);
        conditions.push(`origin_jurisdiction = ANY($${params.length}::varchar[])`);
    }

    if (prefs.preferred_tags.length > 0) {
        params.push(prefs.preferred_tags);
        conditions.push(`tags && $${params.length}::varchar[]`);
    }

    params.push(Math.min(limit, 10) * 4);
    const sql = `
        SELECT ${SELECT_COLUMNS}
        FROM articles
        WHERE ${conditions.join(' AND ')}
        ORDER BY publication_date DESC
        LIMIT $${params.length}
    `;

    const result = await query<{
        id: string;
        title: string;
        summary: string;
        publication_date: Date;
        source_url: string;
        origin_jurisdiction: string;
        tags: string[];
        is_analysis: boolean;
        alternative_sources: string[];
        publisher_authority: number;
    }>(sql, params);

    return result.rows.map(toFeedArticle);
}

export async function getFeed(
    prefs: FeedPreferences | null,
    limit = 10
): Promise<FeedArticle[]> {
    const raw = prefs ? await buildPersonalizedFeed(prefs, limit) : await buildGlobalFeed(limit);
    // The diversity algorithm needs `id`; our rows use `article_id`. Provide
    // a thin adapter so the algorithm operates on a uniform shape.
    const candidates = (raw as unknown as Array<Record<string, unknown>>).map((r) => ({
        id: r.article_id as string,
        origin_jurisdiction: r.origin_jurisdiction as string,
        publication_date: r.publication_date as string,
    }));
    const diverse = applyDiversity(candidates, { maxItems: limit });
    // Map the surviving candidates back to the original rows.
    const idSet = new Set(diverse.map((d) => d.id));
    return (raw as unknown as FeedArticle[]).filter((a) => idSet.has(a.article_id));
}

function toFeedArticle(row: {
    id: string;
    title: string;
    summary: string;
    publication_date: Date;
    source_url: string;
    origin_jurisdiction: string;
    tags: string[];
    is_analysis: boolean;
    alternative_sources: string[];
    publisher_authority: number;
}): FeedArticle {
    return {
        article_id: row.id,
        title: row.title,
        summary: row.summary,
        publication_date: row.publication_date.toISOString(),
        source_url: row.source_url,
        origin_jurisdiction: row.origin_jurisdiction,
        tags: row.tags ?? [],
        is_analysis: row.is_analysis ?? false,
        alternative_sources: row.alternative_sources ?? [],
        publisher_authority: row.publisher_authority ?? 3,
    };
}