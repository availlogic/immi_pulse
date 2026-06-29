import { config } from '../config.js';

export interface CandidateArticle {
    id: string;
    origin_jurisdiction: string;
    publication_date: string | Date;
}

export interface DiversityOptions {
    maxItems?: number;
    maxPerJurisdiction?: number;
}

/**
 * Enforces the Diversity Algorithm (PRD §11.5, AC-FED-04):
 * - Final feed is capped at `maxItems` (default 10, hard cap 10).
 * - No single jurisdiction contributes more than `maxPerJurisdiction` (default 2)
 *   items to the feed.
 * - Items are selected by publication_date descending.
 *
 * Deterministic: given the same input order, output is identical.
 */
export function applyDiversity<T extends CandidateArticle>(
    candidates: T[],
    options: DiversityOptions = {}
): T[] {
    const maxItems = Math.min(options.maxItems ?? config.feed.maxItems, config.feed.maxItems);
    const maxPerJurisdiction = options.maxPerJurisdiction ?? config.feed.maxPerJurisdiction;

    const sorted = [...candidates].sort((a, b) => {
        const ad = new Date(a.publication_date).getTime();
        const bd = new Date(b.publication_date).getTime();
        return bd - ad;
    });

    const jurisdictionCounts = new Map<string, number>();
    const result: T[] = [];

    for (const article of sorted) {
        if (result.length >= maxItems) break;
        const j = article.origin_jurisdiction;
        const count = jurisdictionCounts.get(j) ?? 0;
        if (count >= maxPerJurisdiction) continue;
        result.push(article);
        jurisdictionCounts.set(j, count + 1);
    }

    return result;
}