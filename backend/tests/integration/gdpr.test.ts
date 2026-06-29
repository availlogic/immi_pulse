/**
 * Stage 5.3.3 + 5.3.4: Integration tests for GDPR/CCPA endpoints.
 *
 * - DELETE /user/account: cascade-deletes user + preferences + alerts
 * - GET /user/export: returns JSON dump of user-related data
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server.js';
import { query, shutdownDb } from '../../src/db.js';

let app: FastifyInstance;

beforeAll(async () => {
    app = await buildApp();
    await app.ready();
});

afterAll(async () => {
    await app.close();
    await shutdownDb();
});

beforeEach(async () => {
    // Clean up any residual GDPR test data.
    await query(`DELETE FROM users WHERE email LIKE 'gdpr_%'`);
});

async function signupAndGetToken(email: string, password: string): Promise<{ userId: string; token: string }> {
    const signup = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/signup',
        payload: { email, password },
    });
    if (signup.statusCode !== 201) {
        throw new Error(`signup failed: ${signup.body}`);
    }
    const userId = (signup.json().data as { user_id: string }).user_id;
    const login = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email, password },
    });
    const token = (login.json().data as { token: string }).token;
    return { userId, token };
}

describe('Stage 5.3.3: DELETE /user/account', () => {
    it('cascade-deletes user, preferences, and alerts', async () => {
        const email = `gdpr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@example.com`;
        const { userId } = await signupAndGetToken(email, 'Password123!');

        // Promote to premium so we can create alerts. The original token
        // has role: 'basic'; we re-login to obtain a premium-scoped JWT.
        await query(`UPDATE users SET user_tier = 'premium' WHERE id = $1`, [userId]);
        const reLogin = await app.inject({
            method: 'POST',
            url: '/api/v1/auth/login',
            payload: { email, password: 'Password123!' },
        });
        const token = (reLogin.json().data as { token: string }).token;

        // Create an alert.
        const alertRes = await app.inject({
            method: 'POST',
            url: '/api/v1/user/alerts',
            headers: { authorization: `Bearer ${token}` },
            payload: { target_jurisdiction: 'United Kingdom', keyword: 'gdpr test' },
        });
        expect(alertRes.statusCode).toBe(201);

        // Verify pre-state.
        const prefsBefore = await query<{ count: string }>(
            'SELECT COUNT(*) FROM user_preferences WHERE user_id = $1',
            [userId]
        );
        const alertsBefore = await query<{ count: string }>(
            'SELECT COUNT(*) FROM user_alerts WHERE user_id = $1',
            [userId]
        );
        expect(Number(prefsBefore.rows[0].count)).toBe(1);
        expect(Number(alertsBefore.rows[0].count)).toBe(1);

        // Delete the account.
        const res = await app.inject({
            method: 'DELETE',
            url: '/api/v1/user/account',
            headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(204);

        // Verify cascade: user, preferences, alerts all gone.
        const userAfter = await query<{ count: string }>(
            'SELECT COUNT(*) FROM users WHERE id = $1',
            [userId]
        );
        const prefsAfter = await query<{ count: string }>(
            'SELECT COUNT(*) FROM user_preferences WHERE user_id = $1',
            [userId]
        );
        const alertsAfter = await query<{ count: string }>(
            'SELECT COUNT(*) FROM user_alerts WHERE user_id = $1',
            [userId]
        );
        expect(Number(userAfter.rows[0].count)).toBe(0);
        expect(Number(prefsAfter.rows[0].count)).toBe(0);
        expect(Number(alertsAfter.rows[0].count)).toBe(0);
    });

    it('requires authentication', async () => {
        const res = await app.inject({ method: 'DELETE', url: '/api/v1/user/account' });
        expect(res.statusCode).toBe(401);
    });
});

describe('Stage 5.3.4: GET /user/export', () => {
    it('returns a JSON dump of all user-related data', async () => {
        const email = `gdpr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@example.com`;
        const { token } = await signupAndGetToken(email, 'Password123!');

        // Set known preferences via PUT.
        const putRes = await app.inject({
            method: 'PUT',
            url: '/api/v1/user/preferences',
            headers: { authorization: `Bearer ${token}` },
            payload: {
                preferred_jurisdictions: ['US'],
                preferred_tags: ['Education'],
                digest_frequency: 'weekly',
            },
        });
        expect(putRes.statusCode).toBe(200);

        const res = await app.inject({
            method: 'GET',
            url: '/api/v1/user/export',
            headers: { authorization: `Bearer ${token}` },
        });
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-disposition']).toContain('attachment');
        const data = res.json().data;
        expect(data.user.email).toBe(email);
        expect(data.user.user_tier).toBe('basic');
        expect(data.preferences.preferred_jurisdictions).toEqual(['US']);
        expect(data.preferences.preferred_tags).toEqual(['Education']);
        expect(data.preferences.digest_frequency).toBe('weekly');
        expect(data.alerts).toBeInstanceOf(Array);
        expect(data.alerts).toHaveLength(0);
        expect(data.admin_review_decisions).toBeInstanceOf(Array);
        expect(typeof data.exported_at).toBe('string');
    });

    it('requires authentication', async () => {
        const res = await app.inject({ method: 'GET', url: '/api/v1/user/export' });
        expect(res.statusCode).toBe(401);
    });
});