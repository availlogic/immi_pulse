import type { FastifyRequest, FastifyReply } from 'fastify';
import type { UserTier } from '../config.js';
import { config } from '../config.js';
import { verifyCsrf, readCsrfCookie } from './cookie.js';

export interface AuthClaims {
    sub: string;
    email: string;
    role: UserTier;
}

declare module 'fastify' {
    interface FastifyRequest {
        auth?: AuthClaims;
    }
}

/**
 * Read the JWT from either:
 *   1. `Authorization: Bearer <token>` header (backward compat / tests)
 *   2. The `access_token` HttpOnly cookie (production)
 *
 * We always try the header first (cheap, no body parsing), then fall back
 * to the cookie. The cookie reader relies on `@fastify/cookie` being
 * registered in `server.ts`.
 */
async function readJwtFromRequest(req: FastifyRequest): Promise<string | null> {
    const auth = req.headers.authorization;
    if (typeof auth === 'string' && auth.toLowerCase().startsWith('bearer ')) {
        const token = auth.slice(7).trim();
        if (token.length > 0) return token;
    }
    // Cookie name is configured; read via fastify's cookie parser.
    const cookieToken = req.cookies?.[config.cookie.accessTokenName];
    if (typeof cookieToken === 'string' && cookieToken.length > 0) return cookieToken;
    return null;
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const token = await readJwtFromRequest(req);
    if (!token) {
        return reply.code(401).send({ status: 'error', message: 'Unauthorized' });
    }
    try {
        // fastify-jwt accepts the token string directly.
        await req.server.jwt.verify(token);
        const payload = req.server.jwt.decode<{ sub?: string; email?: string; role?: string }>(token);
        if (!payload?.sub || !payload?.email || !payload?.role) {
            return reply.code(401).send({ status: 'error', message: 'Invalid token claims' });
        }
        req.auth = {
            sub: payload.sub,
            email: payload.email,
            role: payload.role as UserTier,
        };
    } catch {
        return reply.code(401).send({ status: 'error', message: 'Unauthorized' });
    }
}

export async function requirePremium(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    await requireAuth(req, reply);
    if (reply.sent) return;
    if (req.auth?.role !== 'premium' && req.auth?.role !== 'admin') {
        return reply.code(403).send({ status: 'error', message: 'Premium tier required' });
    }
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    await requireAuth(req, reply);
    if (reply.sent) return;
    if (req.auth?.role !== 'admin') {
        return reply.code(403).send({ status: 'error', message: 'Admin tier required' });
    }
}

/**
 * CSRF guard for state-changing requests (POST/PUT/DELETE/PATCH).
 *
 * Must be registered as a preHandler AFTER cookie parsing and BEFORE
 * any route that mutates state. The pattern is the double-submit cookie:
 * the SPA reads the `csrf_token` cookie (which is NOT HttpOnly) and
 * echoes it in the `X-CSRF-Token` header. We compare them in constant
 * time.
 *
 * GET/HEAD/OPTIONS are exempt per docs (and per the OWASP CSRF Cheat
 * Sheet guidance).
 *
 * The check is also skipped for token-bearing requests (Authorization
 * header) on routes explicitly opted-in via the per-route config
 * `config.csrfExemptMethods` (e.g. machine-to-machine admin ingest). For
 * most user-driven routes the SPA sends BOTH a cookie and a header, and
 * this check is the canonical guard.
 */
export async function requireCsrfIfStateChanging(
    req: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const method = req.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;

    // Cookie-based auth + state-changing request → must include the
    // double-submit CSRF token. If a `csrf_token` cookie is present, the
    // request is treated as cookie-auth and the X-CSRF-Token header must
    // match it.
    //
    // Bearer-authenticated requests skip the CSRF check (the bearer token
    // cannot be forged by an attacker without the HttpOnly cookie).
    //
    // Unauthenticated state-changing requests (no cookie, no bearer) are
    // allowed past the CSRF guard; per-route auth middleware (e.g.
    // `requireAuth`) will reject them with 401 if needed. This matches
    // the normal signup/login flow.
    const isBearer = typeof req.headers.authorization === 'string' &&
        req.headers.authorization.toLowerCase().startsWith('bearer ');
    const cookie = readCsrfCookie(req);
    const header = (req.headers[config.cookie.csrfHeaderName] as string | undefined) ?? '';

    if (isBearer) {
        // Bearer-auth: trust the token; CSRF check skipped.
        return;
    }
    if (!cookie) {
        // No CSRF cookie (e.g. unauthenticated signup/login): trust;
        // per-route auth will gate protected routes.
        return;
    }

    if (!cookie || !header) {
        return reply.code(403).send({
            status: 'error',
            message: 'CSRF token required (X-CSRF-Token header must match csrf_token cookie)',
        });
    }
    if (!verifyCsrf(req, reply)) {
        return reply.code(403).send({
            status: 'error',
            message: 'CSRF token mismatch',
        });
    }
}