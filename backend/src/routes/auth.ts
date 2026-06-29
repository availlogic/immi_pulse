import type { FastifyInstance } from 'fastify';
import { query } from '../db.js';
import { requireAuth } from '../auth/middleware.js';
import { generateId } from '../utils/id.js';
import { hashPassword, verifyPassword, passwordMeetsPolicy } from '../auth/password.js';
import {
    setAccessTokenCookie,
    clearAccessTokenCookie,
    clearCsrfCookie,
    issueCsrfToken,
} from '../auth/cookie.js';
import type { UserTier } from '../config.js';

interface SignupBody {
    email: string;
    password: string;
}

interface LoginBody {
    email: string;
    password: string;
}

export default async function authRoutes(app: FastifyInstance): Promise<void> {
    /**
     * GET /auth/csrf — issue a fresh CSRF token (and the non-HttpOnly cookie).
     * The SPA calls this on app boot, then reads the cookie and echoes it in
     * `X-CSRF-Token` on every state-changing request.
     */
    app.get('/auth/csrf', async (_req, reply) => {
        const token = issueCsrfToken(reply);
        return reply.code(200).send({ status: 'success', data: { csrf_token: token } });
    });

    app.post<{ Body: SignupBody }>('/auth/signup', async (req, reply) => {
        const { email, password } = req.body ?? {};
        if (!email || typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
            return reply.code(400).send({ status: 'error', message: 'Invalid email' });
        }
        if (!passwordMeetsPolicy(password)) {
            return reply.code(400).send({ status: 'error', message: 'Password must be at least 8 characters' });
        }

        const existing = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (existing.rowCount && existing.rowCount > 0) {
            return reply.code(409).send({ status: 'error', message: 'Email already registered' });
        }

        const userId = generateId('usr');
        const hash = await hashPassword(password);
        await query(
            `INSERT INTO users (id, email, password_hash, user_tier) VALUES ($1, $2, $3, 'basic')`,
            [userId, email.toLowerCase(), hash]
        );
        await query(
            `INSERT INTO user_preferences (user_id, preferred_jurisdictions, preferred_tags, digest_frequency)
             VALUES ($1, '{}', '{}', 'none')
             ON CONFLICT (user_id) DO NOTHING`,
            [userId]
        );

        const token = await reply.jwtSign(
            { sub: userId, email: email.toLowerCase(), role: 'basic' },
            { expiresIn: '168h' }
        );
        setAccessTokenCookie(reply, token);
        issueCsrfToken(reply);

        return reply.code(201).send({
            status: 'success',
            message: 'User registered successfully',
            // Stage 5.2: `token` is included for backward compat with
            // clients that prefer Authorization: Bearer over cookies. The
            // primary auth path is the HttpOnly access_token cookie.
            data: { token, user_id: userId, email: email.toLowerCase(), user_tier: 'basic' },
        });
    });

    app.post<{ Body: LoginBody }>('/auth/login', async (req, reply) => {
        const { email, password } = req.body ?? {};
        if (!email || !password) {
            return reply.code(400).send({ status: 'error', message: 'Missing credentials' });
        }
        const result = await query<{ id: string; email: string; password_hash: string; user_tier: UserTier }>(
            'SELECT id, email, password_hash, user_tier FROM users WHERE email = $1',
            [email.toLowerCase()]
        );
        if (!result.rowCount) {
            return reply.code(401).send({ status: 'error', message: 'Invalid credentials' });
        }
        const user = result.rows[0];
        const valid = await verifyPassword(password, user.password_hash);
        if (!valid) {
            return reply.code(401).send({ status: 'error', message: 'Invalid credentials' });
        }

        if (!user.password_hash.startsWith('$argon2id$')) {
            const rehashed = await hashPassword(password);
            await query('UPDATE users SET password_hash = $1 WHERE id = $2', [rehashed, user.id]);
        }

        const token = await reply.jwtSign(
            { sub: user.id, email: user.email, role: user.user_tier },
            { expiresIn: '168h' }
        );
        setAccessTokenCookie(reply, token);
        issueCsrfToken(reply);

        return reply.code(200).send({
            status: 'success',
            data: { token, user_tier: user.user_tier },
        });
    });

    /**
     * POST /auth/logout — clears the access_token and csrf_token cookies.
     */
    app.post('/auth/logout', { preHandler: requireAuth }, async (_req, reply) => {
        clearAccessTokenCookie(reply);
        clearCsrfCookie(reply);
        return reply.code(200).send({ status: 'success', message: 'Logged out successfully' });
    });
}