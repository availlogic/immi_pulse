/**
 * URL normalization utility — shared by backend and ingestion service.
 * Mirrors the Python implementation in ingestion/src/exact_dedup.py.
 */
import { URL } from 'node:url';

const TRACKING_QUERY_PARAMS = new Set([
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    'fbclid',
]);

export function normalizeUrl(url: string): string {
    try {
        const u = new URL(url);
        const host = u.hostname.toLowerCase().replace(/^www\./, '');
        const path = u.pathname.replace(/\/+$/, '') || '/';
        const params = new URLSearchParams(u.search);
        const kept: string[] = [];
        for (const [k, v] of params) {
            if (!TRACKING_QUERY_PARAMS.has(k.toLowerCase())) {
                kept.push(`${k}=${v}`);
            }
        }
        const queryString = kept.join('&');
        return `${u.protocol.toLowerCase()}//${host}${path}${queryString ? `?${queryString}` : ''}`;
    } catch {
        return url;
    }
}

export { TRACKING_QUERY_PARAMS };