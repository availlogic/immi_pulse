import { describe, it, expect } from 'vitest';
import { applyDiversity } from '../../src/services/diversity.js';

describe('applyDiversity', () => {
    const make = (id: string, j: string, hoursAgo: number) => ({
        id,
        origin_jurisdiction: j,
        publication_date: new Date(Date.now() - hoursAgo * 3_600_000).toISOString(),
    });

    it('caps feed at 10 items by default (across diverse jurisdictions)', () => {
        // 25 items spread across 10 jurisdictions so the 10-cap is the binding constraint.
        const codes = ['US', 'CA', 'GB', 'DE', 'AU', 'SG', 'JP', 'FR', 'IE', 'NZ'];
        const input = Array.from({ length: 25 }, (_, i) => make(`a${i}`, codes[i % codes.length], i));
        const out = applyDiversity(input);
        expect(out).toHaveLength(10);
    });

    it('does not allow more than 2 items from the same jurisdiction', () => {
        const input = Array.from({ length: 8 }, (_, i) => make(`a${i}`, 'CA', i))
            .concat(Array.from({ length: 3 }, (_, i) => make(`b${i}`, 'GB', i + 8)));
        const out = applyDiversity(input);
        const ca = out.filter((a) => a.origin_jurisdiction === 'CA');
        const gb = out.filter((a) => a.origin_jurisdiction === 'GB');
        expect(ca.length).toBeLessThanOrEqual(2);
        expect(gb.length).toBeLessThanOrEqual(2);
        expect(out.length).toBeLessThanOrEqual(10);
    });

    it('sorts by publication_date descending', () => {
        const input = [
            make('old', 'CA', 24),
            make('new', 'US', 0),
            make('mid', 'GB', 6),
        ];
        const out = applyDiversity(input);
        expect(out.map((a) => a.id)).toEqual(['new', 'mid', 'old']);
    });

    it('returns empty array when input is empty', () => {
        expect(applyDiversity([])).toEqual([]);
    });

    it('preserves order when no diversity violations exist', () => {
        const input = [
            make('1', 'CA', 0),
            make('2', 'GB', 1),
            make('3', 'DE', 2),
            make('4', 'AU', 3),
        ];
        const out = applyDiversity(input);
        expect(out.map((a) => a.id)).toEqual(['1', '2', '3', '4']);
    });

    it('handles boundary: 2 from one jurisdiction, 8 from another → cap at 2+2 from second, leaves 6 slots empty', () => {
        const input = [
            ...Array.from({ length: 2 }, (_, i) => make(`ca${i}`, 'CA', i)),
            ...Array.from({ length: 8 }, (_, i) => make(`gb${i}`, 'GB', i + 2)),
        ];
        const out = applyDiversity(input);
        expect(out).toHaveLength(4);
        expect(out.filter((a) => a.origin_jurisdiction === 'CA')).toHaveLength(2);
        expect(out.filter((a) => a.origin_jurisdiction === 'GB')).toHaveLength(2);
    });

    it('custom maxItems and maxPerJurisdiction are respected', () => {
        // Mix of jurisdictions so the per-jurisdiction cap is the binding constraint.
        const input = [
            ...Array.from({ length: 6 }, (_, i) => make(`ca${i}`, 'CA', i)),
            ...Array.from({ length: 6 }, (_, i) => make(`gb${i}`, 'GB', i + 6)),
            ...Array.from({ length: 6 }, (_, i) => make(`de${i}`, 'DE', i + 12)),
            ...Array.from({ length: 6 }, (_, i) => make(`au${i}`, 'AU', i + 18)),
        ];
        const out = applyDiversity(input, { maxItems: 5, maxPerJurisdiction: 1 });
        // With maxItems=5 and maxPerJurisdiction=1 across 4 jurisdictions, max possible = 4.
        expect(out).toHaveLength(4);
        const counts = new Map<string, number>();
        for (const a of out) counts.set(a.origin_jurisdiction, (counts.get(a.origin_jurisdiction) ?? 0) + 1);
        for (const c of counts.values()) expect(c).toBeLessThanOrEqual(1);
    });

    it('hard-caps maxItems at 10 even if requested higher', () => {
        // Diverse jurisdictions so 10 items are available within per-jurisdiction cap.
        const input: { id: string; origin_jurisdiction: string; publication_date: string }[] = [];
        const codes = ['US', 'CA', 'GB', 'DE', 'AU', 'SG', 'JP', 'FR', 'IE', 'NZ'];
        for (let i = 0; i < 100; i++) {
            input.push(make(`a${i}`, codes[i % codes.length], i));
        }
        const out = applyDiversity(input, { maxItems: 100 });
        expect(out).toHaveLength(10);
    });

    it('Distribution test (AC-FED-04): 8 US + 1 UK + 1 CA → 2 US + 1 UK + 1 CA', () => {
        const input = [
            ...Array.from({ length: 8 }, (_, i) => make(`us${i}`, 'US', i)),
            make('uk1', 'GB', 8),
            make('ca1', 'CA', 9),
        ];
        const out = applyDiversity(input);
        expect(out).toHaveLength(4);
        expect(out.filter((a) => a.origin_jurisdiction === 'US')).toHaveLength(2);
        expect(out.filter((a) => a.origin_jurisdiction === 'GB')).toHaveLength(1);
        expect(out.filter((a) => a.origin_jurisdiction === 'CA')).toHaveLength(1);
    });

    it('INT-FEED-01 scenario: 5 US + 5 CA + 5 AU with US+CA prefs → cap 10, ≤2 US, ≤2 CA, 0 AU', () => {
        const input = [
            ...Array.from({ length: 5 }, (_, i) => make(`us${i}`, 'US', i)),
            ...Array.from({ length: 5 }, (_, i) => make(`ca${i}`, 'CA', i + 5)),
            ...Array.from({ length: 5 }, (_, i) => make(`au${i}`, 'AU', i + 10)),
        ];
        // Simulate filter having already removed AU articles upstream;
        // apply diversity to the pre-filtered list.
        const filtered = input.filter((a) => ['US', 'CA'].includes(a.origin_jurisdiction));
        const out = applyDiversity(filtered);
        expect(out).toHaveLength(4); // 2 US + 2 CA
    });
});