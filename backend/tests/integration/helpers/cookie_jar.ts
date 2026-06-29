/**
 * Shared test utilities for integration tests.
 *
 * Stage 5.2 introduces HttpOnly cookie auth + double-submit CSRF. To
 * keep tests ergonomic, this helper:
 *   - Performs a one-time `/auth/csrf` call to seed the `csrf_token` cookie
 *   - Stores the cookie string in a `cookieJar` map keyed by service
 *   - Exposes `injectWithJar` / `cookieHeader` helpers
 *
 * Existing tests that use `app.inject({ headers: { authorization: 'Bearer ...' }})`
 * still work because the CSRF guard short-circuits on pure-bearer requests
 * (no CSRF cookie, no CSRF header). This helper is for tests that want to
 * exercise the cookie path explicitly.
 */

import type { FastifyInstance } from 'fastify';

export interface CookieJar {
    /** Set-Cookie header strings keyed by cookie name. */
    cookies: Map<string, string>;
    /** Return the Cookie request header value (all cookies joined). */
    header(): string;
    /** Add a Set-Cookie header from a Fastify response. */
    absorb(setCookieHeader: string | string[] | undefined): void;
}

export function newCookieJar(): CookieJar {
    const cookies = new Map<string, string>();
    return {
        cookies,
        header(): string {
            return Array.from(cookies.values()).join('; ');
        },
        absorb(setCookieHeader: string | string[] | undefined): void {
            if (!setCookieHeader) return;
            const list = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
            for (const raw of list) {
                // Parse "name=value; Path=/; HttpOnly" → keep just name=value.
                const first = raw.split(';')[0]?.trim();
                if (!first) continue;
                const eq = first.indexOf('=');
                if (eq < 0) continue;
                const name = first.slice(0, eq).trim();
                const value = first.slice(eq + 1).trim();
                cookies.set(name, `${name}=${value}`);
            }
        },
    };
}

/**
 * Bootstraps the CSRF cookie by calling GET /auth/csrf once. Returns the
 * CSRF token in the body AND populates the cookie jar.
 */
export async function bootstrapCsrf(app: FastifyInstance, jar: CookieJar): Promise<string> {
    const res = await app.inject({ method: 'GET', url: '/api/v1/auth/csrf' });
    const setCookie = res.headers['set-cookie'];
    jar.absorb(setCookie);
    const body = res.json();
    return body.data.csrf_token as string;
}

export function csrfHeader(token: string): Record<string, string> {
    return { 'x-csrf-token': token };
}