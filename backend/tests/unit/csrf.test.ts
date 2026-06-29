import { describe, it, expect } from 'vitest';
import {
    safeStringEqual,
    verifyCsrf,
    readCsrfCookie,
    readCsrfHeader,
    setCsrfCookie,
} from '../../src/auth/cookie.js';

describe('safeStringEqual', () => {
    it('returns true for identical strings', () => {
        expect(safeStringEqual('abc123', 'abc123')).toBe(true);
    });
    it('returns false for different strings of same length', () => {
        expect(safeStringEqual('abc123', 'abd123')).toBe(false);
    });
    it('returns false for strings of different length', () => {
        expect(safeStringEqual('abc', 'abcd')).toBe(false);
    });
    it('returns false for empty vs non-empty', () => {
        expect(safeStringEqual('', 'x')).toBe(false);
    });
});

describe('readCsrfCookie / readCsrfHeader', () => {
    it('reads csrf cookie via @fastify/cookie parsed cookies', () => {
        const req = { cookies: { csrf_token: 'token123' } } as unknown as Parameters<typeof readCsrfCookie>[0];
        expect(readCsrfCookie(req)).toBe('token123');
    });
    it('returns undefined when csrf cookie absent', () => {
        const req = { cookies: {} } as unknown as Parameters<typeof readCsrfCookie>[0];
        expect(readCsrfCookie(req)).toBeUndefined();
    });
    it('reads x-csrf-token header (string)', () => {
        const req = { headers: { 'x-csrf-token': 'h' } } as unknown as Parameters<typeof readCsrfHeader>[0];
        expect(readCsrfHeader(req)).toBe('h');
    });
    it('reads x-csrf-token header (string[])', () => {
        const req = { headers: { 'x-csrf-token': ['first', 'second'] } } as unknown as Parameters<typeof readCsrfHeader>[0];
        expect(readCsrfHeader(req)).toBe('first');
    });
});

describe('verifyCsrf', () => {
    function fakeReq(opts: { cookie?: string; header?: string; method?: string }) {
        return {
            method: opts.method ?? 'POST',
            cookies: opts.cookie ? { csrf_token: opts.cookie } : {},
            headers: opts.header ? { 'x-csrf-token': opts.header } : {},
        } as unknown as Parameters<typeof verifyCsrf>[0];
    }
    function fakeReply() {
        return {} as Parameters<typeof verifyCsrf>[1];
    }

    it('returns true for GET (CSRF exempt)', () => {
        expect(verifyCsrf(fakeReq({ method: 'GET' }), fakeReply())).toBe(true);
    });
    it('returns true for HEAD (CSRF exempt)', () => {
        expect(verifyCsrf(fakeReq({ method: 'HEAD' }), fakeReply())).toBe(true);
    });
    it('returns true for OPTIONS (CSRF exempt)', () => {
        expect(verifyCsrf(fakeReq({ method: 'OPTIONS' }), fakeReply())).toBe(true);
    });
    it('returns true when cookie and header match', () => {
        expect(verifyCsrf(fakeReq({ cookie: 'tok', header: 'tok' }), fakeReply())).toBe(true);
    });
    it('returns false when cookie and header differ', () => {
        expect(verifyCsrf(fakeReq({ cookie: 'a', header: 'b' }), fakeReply())).toBe(false);
    });
    it('returns false when only cookie is present', () => {
        expect(verifyCsrf(fakeReq({ cookie: 'tok' }), fakeReply())).toBe(false);
    });
    it('returns false when only header is present', () => {
        expect(verifyCsrf(fakeReq({ header: 'tok' }), fakeReply())).toBe(false);
    });
    it('returns false when POST has neither cookie nor header', () => {
        expect(verifyCsrf(fakeReq({ method: 'POST' }), fakeReply())).toBe(false);
    });
});

describe('setCsrfCookie', () => {
    it('returns the explicit token when provided', () => {
        const reply = { setCookie: () => undefined } as unknown as Parameters<typeof setCsrfCookie>[0];
        const token = setCsrfCookie(reply, 'explicit-token');
        expect(token).toBe('explicit-token');
    });

    it('calls reply.setCookie with the csrf_token name and HttpOnly=false (so SPA can read it)', () => {
        const calls: Array<{ name: string; value: string; opts: Record<string, unknown> }> = [];
        const reply = {
            setCookie: (name: string, value: string, opts: Record<string, unknown>) => {
                calls.push({ name, value, opts });
            },
        } as unknown as Parameters<typeof setCsrfCookie>[0];
        setCsrfCookie(reply, 'tok-1');
        expect(calls).toHaveLength(1);
        expect(calls[0].name).toBe('csrf_token');
        expect(calls[0].value).toBe('tok-1');
        expect(calls[0].opts.httpOnly).toBe(false);
        expect(calls[0].opts.path).toBe('/');
    });

    it('returns a random token when none is provided', () => {
        const calls: Array<{ value: string }> = [];
        const reply = {
            setCookie: (_name: string, value: string) => {
                calls.push({ value });
            },
        } as unknown as Parameters<typeof setCsrfCookie>[0];
        const token = setCsrfCookie(reply);
        expect(token).toMatch(/^[a-f0-9]{64}$/); // 32 random bytes as hex
        expect(calls[0].value).toBe(token);
    });
});

describe('clearCsrfCookie', () => {
    it('clears the csrf_token cookie with the right options', async () => {
        const { clearCsrfCookie } = await import('../../src/auth/cookie.js');
        const calls: Array<{ name: string; opts: Record<string, unknown> }> = [];
        const reply = {
            clearCookie: (name: string, opts: Record<string, unknown>) => {
                calls.push({ name, opts });
            },
        } as unknown as Parameters<typeof clearCsrfCookie>[0];
        clearCsrfCookie(reply);
        expect(calls).toHaveLength(1);
        expect(calls[0].name).toBe('csrf_token');
        expect(calls[0].opts.path).toBe('/');
    });
});

describe('safeStringEqual error path', () => {
    it('returns false for strings of different length', async () => {
        const { safeStringEqual } = await import('../../src/auth/cookie.js');
        expect(safeStringEqual('short', 'longer string')).toBe(false);
    });

    it('handles empty strings', async () => {
        const { safeStringEqual } = await import('../../src/auth/cookie.js');
        expect(safeStringEqual('', '')).toBe(true);
        expect(safeStringEqual('a', '')).toBe(false);
    });
});

describe('clearAccessTokenCookie', () => {
    it('clears the access_token cookie with the right options', async () => {
        const { clearAccessTokenCookie } = await import('../../src/auth/cookie.js');
        const calls: Array<{ name: string; opts: Record<string, unknown> }> = [];
        const reply = {
            clearCookie: (name: string, opts: Record<string, unknown>) => {
                calls.push({ name, opts });
            },
        } as unknown as Parameters<typeof clearAccessTokenCookie>[0];
        clearAccessTokenCookie(reply);
        expect(calls).toHaveLength(1);
        expect(calls[0].name).toBe('access_token');
        expect(calls[0].opts.path).toBe('/');
    });
});

describe('setAccessTokenCookie', () => {
    it('sets the access_token cookie with HttpOnly + SameSite=Lax', async () => {
        const { setAccessTokenCookie } = await import('../../src/auth/cookie.js');
        const calls: Array<{ name: string; value: string; opts: Record<string, unknown> }> = [];
        const reply = {
            setCookie: (name: string, value: string, opts: Record<string, unknown>) => {
                calls.push({ name, value, opts });
            },
        } as unknown as Parameters<typeof setAccessTokenCookie>[0];
        setAccessTokenCookie(reply, 'jwt-token-here');
        expect(calls).toHaveLength(1);
        expect(calls[0].name).toBe('access_token');
        expect(calls[0].value).toBe('jwt-token-here');
        expect(calls[0].opts.httpOnly).toBe(true);
        expect(calls[0].opts.path).toBe('/');
    });
});