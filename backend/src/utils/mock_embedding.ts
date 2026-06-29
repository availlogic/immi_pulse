/**
 * Deterministic 3072-dim mock embedding utility.
 *
 * Mirrors the ingestion service's `MockEmbeddingClient` so the backend
 * can insert articles with embeddings via `/admin/ingest` without depending
 * on the Python package. This is used for the synthetic article endpoint;
 * production inserts go through the ingestion service which may use OpenAI
 * text-embedding-3-large.
 */
import { createHash } from 'node:crypto';

const EMBEDDING_DIM = 3072;
const _TOKEN_RE = /[\w']+/g;

function tokens(text: string): string[] {
    return (text.toLowerCase().match(_TOKEN_RE) ?? []);
}

function seededVector(text: string, dim = EMBEDDING_DIM): number[] {
    const vec = new Array<number>(dim).fill(0);
    for (const tok of new Set(tokens(text))) {
        const digest = createHash('sha256').update(tok).digest();
        const axis = digest.readUInt32BE(0) % dim;
        const slotCount = 8;
        for (let slot = 0; slot < slotCount; slot++) {
            const start = (slot * 4) % digest.length;
            const bytes = digest.subarray(start, start + 4);
            const a = digest.readUInt32BE(start) % dim;
            vec[a] += 1.0;
        }
    }
    const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0));
    if (norm === 0) return vec;
    return vec.map((x) => x / norm);
}

export class MockEmbeddingClient {
    embed(text: string): number[] {
        return seededVector(text || '');
    }
}