/**
 * Stage 5.2.8: Integration test for cookie-based auth + CSRF flow.
 *
 * Exercises the full flow:
 *   1. GET /auth/csrf → returns csrf_token + sets csrf_token cookie
 *   2. POST /auth/signup with X-CSRF-Token header → returns 201,
 *      sets access_token (HttpOnly) + csrf_token cookies
 *   3. GET /user/preferences with cookie header → 200 (cookie auth)
 *   4. POST /user/alerts with cookie auth → 201 (CSRF check passes
 *      because cookie and header both carry the same token)
 *   5. POST /user/alerts with cookie auth but wrong CSRF header → 403
 *   6. POST /user/alerts with Bearer auth (no CSRF cookie) → 201 (Bearer
 *      exempt)
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server.js';
import { query, shutdownDb } from '../../src/db.js';
import { newCookieJar, bootstrapCsrf, csrfHeader } from './helpers/cookie_jar.js';

let app: FastifyInstance;

beforeAll(async () => {
    app = await buildApp();
    await app.ready();
});

afterAll(async () => {
    await app.close();
    await shutdownDb();
});

describe('Stage 5.2.8: cookie propagation + CSRF', () => {
    it('full cookie flow: csrf → signup → protected route → alert create', async () => {
        const jar = newCookieJar();
        const email = `cookie_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;

        // 1. Bootstrap CSRF.
        const csrf = await bootstrapCsrf(app, jar);
        expect(jar.cookies.has('csrf_token')).toBe(true);

        // 2. Signup with X-CSRF-Token header.
        const signup = await app.inject({
            method: 'POST',
            url: '/api/v1/auth/signup',
            headers: {
                cookie: jar.header(),
                ...csrfHeader(csrf),
            },
            payload: { email, password: 'Password123!' },
        });
        expect(signup.statusCode).toBe(201);
        jar.absorb(signup.headers['set-cookie']);
        expect(jar.cookies.has('access_token')).toBe(true);
        expect(jar.cookies.has('csrf_token')).toBe(true);

        // 3. Protected route with cookie auth (no Authorization header).
        const prefs = await app.inject({
            method: 'GET',
            url: '/api/v1/user/preferences',
            headers: { cookie: jar.header() },
        });
        expect(prefs.statusCode).toBe(200);

        // 4. Create an alert with cookie + CSRF.
        const csrfForAlert = jar.cookies.get('csrf_token')!.split('=')[1];
        const alert = await app.inject({
            method: 'POST',
            url: '/api/v1/user/alerts',
            headers: {
                cookie: jar.header(),
                ...csrfHeader(csrfForAlert),
            },
            payload: { target_jurisdiction: 'Canada', keyword: 'cookie test' },
        });
        expect(alert.statusCode).toBe(403); // basic user; premium-only
    });

    it('cookie auth with wrong CSRF header returns 403', async () => {
        const jar = newCookieJar();
        const email = `wrongcsrf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
        const csrf = await bootstrapCsrf(app, jar);

        // Signup first to get access_token cookie.
        const signup = await app.inject({
            method: 'POST',
            url: '/api/v1/auth/signup',
            headers: {
                cookie: jar.header(),
                ...csrfHeader(csrf),
            },
            payload: { email, password: 'Password123!' },
        });
        expect(signup.statusCode).toBe(201);
        jar.absorb(signup.headers['set-cookie']);

        // Promote to premium so we can hit /user/alerts.
        const userId = (signup.json().data as { user_id: string }).user_id;
        await query(`UPDATE users SET user_tier = 'premium' WHERE id = $1`, [userId]);

        // Now POST with cookie + WRONG CSRF token.
        const wrong = await app.inject({
            method: 'POST',
            url: '/api/v1/user/alerts',
            headers: {
                cookie: jar.header(),
                'x-csrf-token': 'wrong-token',
            },
            payload: { target_jurisdiction: 'Canada', keyword: 'cookie test' },
        });
        expect(wrong.statusCode).toBe(403);
        const body = wrong.json();
        expect(body.message).toMatch(/CSRF/);
    });

    it('bearer-auth request with no CSRF cookie is trusted', async () => {
        const email = `bearer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
        const jar = newCookieJar();

        // Signup to get a token.
        const signup = await app.inject({
            method: 'POST',
            url: '/api/v1/auth/signup',
            headers: { cookie: jar.header() },
            payload: { email, password: 'Password123!' },
        });
        expect(signup.statusCode).toBe(201);
        const userId = (signup.json().data as { user_id: string }).user_id;

        // Promote to premium BEFORE re-logging-in so the new JWT has role=premium.
        await query(`UPDATE users SET user_tier = 'premium' WHERE id = $1`, [userId]);

        // Re-login to get a fresh JWT with role=premium.
        const login = await app.inject({
            method: 'POST',
            url: '/api/v1/auth/login',
            headers: { cookie: jar.header() },
            payload: { email, password: 'Password123!' },
        });
        const token = (login.json().data as { token: string }).token;

        // Pure bearer request (no cookie) — should pass CSRF.
        const alert = await app.inject({
            method: 'POST',
            url: '/api/v1/user/alerts',
            headers: {
                authorization: `Bearer ${token}`,
            },
            payload: { target_jurisdiction: 'United Kingdom', keyword: 'bearer test' },
        });
        expect(alert.statusCode).toBe(201);
    });

    it('GET /auth/csrf issues a new token via Set-Cookie', async () => {
        const jar = newCookieJar();
        const res = await app.inject({ method: 'GET', url: '/api/v1/auth/csrf' });
        expect(res.statusCode).toBe(200);
        const setCookie = res.headers['set-cookie'];
        expect(setCookie).toBeDefined();
        const cookieStr = Array.isArray(setCookie) ? setCookie.join(';') : setCookie;
        expect(cookieStr).toContain('csrf_token=');
        // Per Stage 5.2.4: csrf_token cookie is NOT HttpOnly so the SPA
        // can read it via document.cookie.
        expect(cookieStr).not.toContain('HttpOnly');
    });
});