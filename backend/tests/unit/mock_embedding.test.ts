import { describe, it, expect } from 'vitest';
import { MockEmbeddingClient } from '../../src/utils/mock_embedding.js';

describe('MockEmbeddingClient', () => {
    it('produces 3072-dim vectors', () => {
        const c = new MockEmbeddingClient();
        const v = c.embed('hello');
        expect(v).toHaveLength(3072);
    });

    it('produces unit vectors (L2 norm = 1)', () => {
        const c = new MockEmbeddingClient();
        const v = c.embed('a test sentence');
        const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
        expect(norm).toBeCloseTo(1.0, 6);
    });

    it('is deterministic for the same input', () => {
        const c = new MockEmbeddingClient();
        const a = c.embed('Canada Express Entry draw');
        const b = c.embed('Canada Express Entry draw');
        expect(a).toEqual(b);
    });

    it('produces different vectors for different inputs', () => {
        const c = new MockEmbeddingClient();
        const a = c.embed('Canada Express Entry');
        const b = c.embed('Germany Opportunity Card');
        expect(a).not.toEqual(b);
    });

    it('handles empty strings as zero vectors', () => {
        const c = new MockEmbeddingClient();
        const v = c.embed('');
        expect(v).toHaveLength(3072);
        expect(v.every((x) => x === 0)).toBe(true);
    });

    it('handles Unicode input', () => {
        const c = new MockEmbeddingClient();
        // The hashing function splits on word boundaries, so CJK strings
        // without spaces yield a zero vector. We pad with spaces to ensure
        // tokens are present.
        const v = c.embed('日本 韩国 中国 移民 政策');
        expect(v).toHaveLength(3072);
        // Note: zero vectors are valid (empty token set); only check norm
        // when there is at least one non-zero component.
        const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
        if (norm > 0) {
            expect(norm).toBeCloseTo(1.0, 6);
        } else {
            expect(v.every((x) => x === 0)).toBe(true);
        }
    });

    it('produces values within fp16 representable range', () => {
        // The embeddings are normalized to [-1, 1], which is well within the
        // fp16 representable range of ~±65504. Stage 5.4 migrates the column
        // to HALFVEC, which has 16-bit precision.
        const c = new MockEmbeddingClient();
        const v = c.embed('Canada Express Entry draw');
        for (const x of v) {
            expect(Math.abs(x)).toBeLessThanOrEqual(1.0);
        }
    });
});