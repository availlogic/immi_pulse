import { describe, it, expect } from 'vitest';
import { normalizeUrl, TRACKING_QUERY_PARAMS } from '../../src/utils/normalize_url.js';

describe('normalizeUrl', () => {
    it('strips tracking query params', () => {
        const a = normalizeUrl('https://example.com/a?utm_source=x&page=1');
        const b = normalizeUrl('https://example.com/a?page=1&utm_medium=y');
        expect(a).toBe(b);
        expect(a).toBe('https://example.com/a?page=1');
    });

    it('preserves non-tracking query params', () => {
        const url = normalizeUrl('https://example.com/a?id=42&token=abc');
        expect(url).toBe('https://example.com/a?id=42&token=abc');
    });

    it('lowercases the host', () => {
        expect(normalizeUrl('https://Example.COM/x')).toBe('https://example.com/x');
    });

    it('strips www. prefix', () => {
        expect(normalizeUrl('https://www.example.com/x')).toBe('https://example.com/x');
    });

    it('drops trailing slash from path (except root)', () => {
        expect(normalizeUrl('https://example.com/path/')).toBe('https://example.com/path');
        expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
    });

    it('handles URL with no path', () => {
        expect(normalizeUrl('https://example.com')).toBe('https://example.com/');
    });

    it('preserves query param order (insertion-ordered)', () => {
        const url = normalizeUrl('https://example.com/?a=1&b=2&c=3');
        expect(url).toBe('https://example.com/?a=1&b=2&c=3');
    });

    it('returns input unchanged on parse error', () => {
        // "not a url" is still a valid URL string for the URL constructor, but
        // an empty string passes through unchanged.
        expect(normalizeUrl('')).toBe('');
    });

    it('strips all common tracking params (utm_*, gclid, fbclid)', () => {
        for (const p of TRACKING_QUERY_PARAMS) {
            const url = normalizeUrl(`https://example.com/?${p}=x&keep=y`);
            expect(url).toBe('https://example.com/?keep=y');
        }
    });

    it('lowercases the scheme', () => {
        expect(normalizeUrl('HTTPS://example.com/x')).toBe('https://example.com/x');
        expect(normalizeUrl('HTTP://example.com/x')).toBe('http://example.com/x');
    });

    it('preserves the path case (paths are case-sensitive)', () => {
        expect(normalizeUrl('https://example.com/Path/To/Resource')).toBe(
            'https://example.com/Path/To/Resource'
        );
    });
});