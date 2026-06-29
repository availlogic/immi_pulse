/**
 * Cookie helpers for the HttpOnly + CSRF auth flow (Stage 5.2).
 *
 * Tokens:
 *   - `access_token` (HttpOnly, SameSite=Lax, Secure in prod): the JWT.
 *   - `csrf_token` (NOT HttpOnly, double-submit): echoed in
 *     `X-CSRF-Token` header on state-changing requests.
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'node:crypto';
import { config } from '../config.js';

const ACCESS_TOKEN_MAX_AGE = config.jwtExpiresHours * 60 * 60; // seconds
export const CSRF_COOKIE_MAX_AGE = 60 * 60 * 24; // 24h

export function setAccessTokenCookie(reply: FastifyReply, token: string): void {
    reply.setCookie(config.cookie.accessTokenName, token, {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite,
        domain: config.cookie.domain || undefined,
        path: '/',
        maxAge: ACCESS_TOKEN_MAX_AGE,
    });
}

export function clearAccessTokenCookie(reply: FastifyReply): void {
    reply.clearCookie(config.cookie.accessTokenName, {
        path: '/',
        domain: config.cookie.domain || undefined,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite,
    });
}

export function setCsrfCookie(reply: FastifyReply, token?: string): string {
    const value = token ?? crypto.randomBytes(32).toString('hex');
    reply.setCookie(config.cookie.csrfCookieName, value, {
        httpOnly: false, // intentionally NOT HttpOnly so the SPA can read it
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite,
        domain: config.cookie.domain || undefined,
        path: '/',
        maxAge: CSRF_COOKIE_MAX_AGE,
    });
    return value;
}

export function clearCsrfCookie(reply: FastifyReply): void {
    reply.clearCookie(config.cookie.csrfCookieName, {
        path: '/',
        domain: config.cookie.domain || undefined,
        secure: config.cookie.secure,
        sameSite: config.cookie.sameSite,
    });
}

/**
 * Issue a fresh CSRF token to the response (in a non-HttpOnly cookie) and
 * return it. The SPA reads the cookie via `document.cookie` and echoes it in
 * `X-CSRF-Token` on every state-changing request.
 */
export function issueCsrfToken(reply: FastifyReply): string {
    return setCsrfCookie(reply);
}

export function readCsrfCookie(req: FastifyRequest): string | undefined {
    const raw = req.cookies[config.cookie.csrfCookieName];
    if (typeof raw === 'string' && raw.length > 0) return raw;
    return undefined;
}

export function readCsrfHeader(req: FastifyRequest): string | undefined {
    const raw = req.headers[config.cookie.csrfHeaderName];
    if (typeof raw === 'string' && raw.length > 0) return raw;
    if (Array.isArray(raw) && typeof raw[0] === 'string' && raw[0].length > 0) return raw[0];
    return undefined;
}

/**
 * Constant-time string comparison to mitigate timing oracles.
 */
export function safeStringEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    try {
        return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
    } catch {
        return false;
    }
}

/**
 * Verify a state-changing request: the CSRF cookie and the X-CSRF-Token
 * header must be present AND equal.
 *
 * Returns true if the request is safe (GET/HEAD/OPTIONS) — those are not
 * subject to CSRF.
 */
export function verifyCsrf(req: FastifyRequest, reply: FastifyReply): boolean {
    const method = req.method.toUpperCase();
    // Stage 5.2.5: GET, HEAD, OPTIONS are exempt.
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;

    const cookie = readCsrfCookie(req);
    const header = readCsrfHeader(req);
    if (!cookie || !header) {
        return false;
    }
    return safeStringEqual(cookie, header);
}

export const CSRF_HEADER = config.cookie.csrfHeaderName;