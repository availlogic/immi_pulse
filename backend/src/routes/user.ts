import type { FastifyInstance } from 'fastify';
import { query } from '../db.js';
import { requireAuth } from '../auth/middleware.js';
import { clearAccessTokenCookie, clearCsrfCookie } from '../auth/cookie.js';
import { FEATURE_TAGS, DIGEST_FREQUENCIES, type DigestFrequency } from '../config.js';

interface PreferencesBody {
    preferred_jurisdictions?: string[];
    preferred_tags?: string[];
    digest_frequency?: string;
}

export default async function userRoutes(app: FastifyInstance): Promise<void> {
    app.get('/user/preferences', { preHandler: requireAuth }, async (req, reply) => {
        const result = await query<{
            preferred_jurisdictions: string[];
            preferred_tags: string[];
            digest_frequency: string;
        }>(
            `SELECT preferred_jurisdictions, preferred_tags, digest_frequency
             FROM user_preferences WHERE user_id = $1`,
            [req.auth!.sub]
        );
        if (!result.rowCount) {
            return reply.code(404).send({ status: 'error', message: 'Preferences not found' });
        }
        const row = result.rows[0];
        return reply.code(200).send({
            status: 'success',
            data: {
                preferred_jurisdictions: row.preferred_jurisdictions ?? [],
                preferred_tags: row.preferred_tags ?? [],
                digest_frequency: row.digest_frequency ?? 'none',
            },
        });
    });

    /**
     * GET /user/me
     * Stage 5.2: returns the authenticated user's id, email, and tier. The
     * SPA uses this on boot to populate the AuthContext (tier + email)
     * without a separate /auth/me endpoint.
     */
    app.get('/user/me', { preHandler: requireAuth }, async (req, reply) => {
        const result = await query<{ id: string; email: string; user_tier: string }>(
            'SELECT id, email, user_tier FROM users WHERE id = $1',
            [req.auth!.sub]
        );
        if (!result.rowCount) {
            return reply.code(404).send({ status: 'error', message: 'User not found' });
        }
        const u = result.rows[0];
        return reply.code(200).send({
            status: 'success',
            data: {
                user_id: u.id,
                email: u.email,
                user_tier: u.user_tier as 'basic' | 'premium' | 'admin',
            },
        });
    });

    app.put<{ Body: PreferencesBody }>('/user/preferences', { preHandler: requireAuth }, async (req, reply) => {
        const body = req.body ?? {};
        const jurisdictions = Array.isArray(body.preferred_jurisdictions) ? body.preferred_jurisdictions : [];
        const tags = Array.isArray(body.preferred_tags) ? body.preferred_tags : [];
        const frequency = (body.digest_frequency ?? 'none') as DigestFrequency;

        if (!DIGEST_FREQUENCIES.includes(frequency)) {
            return reply.code(400).send({ status: 'error', message: 'Invalid digest_frequency' });
        }
        for (const t of tags) {
            if (!FEATURE_TAGS.includes(t as never)) {
                return reply.code(400).send({ status: 'error', message: `Invalid tag: ${t}` });
            }
        }
        if (jurisdictions.length > 0) {
            const valid = await query<{ code: string }>(
                'SELECT code FROM jurisdictions WHERE code = ANY($1::varchar[])',
                [jurisdictions]
            );
            const validCodes = new Set(valid.rows.map((r) => r.code));
            for (const j of jurisdictions) {
                if (!validCodes.has(j)) {
                    return reply.code(400).send({ status: 'error', message: `Unknown jurisdiction: ${j}` });
                }
            }
        }

        await query(
            `UPDATE user_preferences
             SET preferred_jurisdictions = $2::varchar[],
                 preferred_tags = $3::varchar[],
                 digest_frequency = $4,
                 updated_at = NOW()
             WHERE user_id = $1`,
            [req.auth!.sub, jurisdictions, tags, frequency]
        );

        return reply.code(200).send({
            status: 'success',
            message: 'Preferences updated successfully',
        });
    });

    /**
     * DELETE /user/account — Stage 5.3.1 (GDPR/CCPA right to erasure).
     *
     * Cascading delete: removes the user row, which via FK constraints
     * also drops user_preferences, user_alerts, and any scraper_logs
     * rows that reference the user (e.g. decided_by in admin_review_queue).
     * After the delete, the auth cookies are cleared and 204 is returned.
     */
    app.delete('/user/account', { preHandler: requireAuth }, async (req, reply) => {
        await query('DELETE FROM users WHERE id = $1', [req.auth!.sub]);
        clearAccessTokenCookie(reply);
        clearCsrfCookie(reply);
        return reply.code(204).send();
    });

    /**
     * GET /user/export — Stage 5.3.2 (GDPR/CCPA right to data portability).
     *
     * Returns a JSON dump of all user-related data: profile, preferences,
     * alerts, and any admin-review decisions the user made.
     */
    app.get('/user/export', { preHandler: requireAuth }, async (req, reply) => {
        const userId = req.auth!.sub;
        const [user, prefs, alerts, reviews] = await Promise.all([
            query<{ id: string; email: string; user_tier: string; created_at: Date }>(
                'SELECT id, email, user_tier, created_at FROM users WHERE id = $1',
                [userId]
            ),
            query<{ preferred_jurisdictions: string[]; preferred_tags: string[]; digest_frequency: string }>(
                'SELECT preferred_jurisdictions, preferred_tags, digest_frequency FROM user_preferences WHERE user_id = $1',
                [userId]
            ),
            query<{ id: string; target_jurisdiction: string; keyword: string; created_at: Date }>(
                'SELECT id, target_jurisdiction, keyword, created_at FROM user_alerts WHERE user_id = $1',
                [userId]
            ),
            query<{ id: string; article_id: string; decision_notes: string | null; decided_at: Date | null }>(
                'SELECT id, article_id, decision_notes, decided_at FROM admin_review_queue WHERE decided_by = $1',
                [userId]
            ),
        ]);

        const exportData = {
            exported_at: new Date().toISOString(),
            user: user.rows[0] ?? null,
            preferences: prefs.rows[0] ?? null,
            alerts: alerts.rows,
            admin_review_decisions: reviews.rows,
        };

        reply.header('Content-Disposition', 'attachment; filename="immipulse-user-export.json"');
        return reply.code(200).send({
            status: 'success',
            data: exportData,
        });
    });
}