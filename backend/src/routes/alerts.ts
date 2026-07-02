import type { FastifyInstance } from 'fastify';
import { query } from '../db.js';
import { generateId } from '../utils/id.js';
import { requireAuth, requirePremium } from '../auth/middleware.js';

interface AlertBody {
    target_jurisdiction: string;
    keyword: string;
}

const KEYWORD_REGEX = /^[A-Za-z0-9 ]{1,50}$/;

export default async function alertsRoutes(app: FastifyInstance): Promise<void> {
    app.get('/user/alerts', { preHandler: requirePremium }, async (req, reply) => {
        const result = await query<{
            id: string;
            target_jurisdiction: string;
            keyword: string;
            created_at: Date;
        }>(
            `SELECT id, target_jurisdiction, keyword, created_at
             FROM user_alerts WHERE user_id = $1
             ORDER BY created_at DESC`,
            [req.auth!.sub]
        );
        return reply.code(200).send({
            status: 'success',
            data: {
                alerts: result.rows.map((r) => ({
                    alert_id: r.id,
                    target_jurisdiction: r.target_jurisdiction,
                    keyword: r.keyword,
                    created_at: r.created_at.toISOString(),
                })),
            },
        });
    });

    app.post<{ Body: AlertBody }>('/user/alerts', { preHandler: requirePremium }, async (req, reply) => {
        const body = req.body ?? {};
        const jurisdiction = (body.target_jurisdiction ?? '').toString().trim();
        const keyword = (body.keyword ?? '').toString().trim();

        if (!KEYWORD_REGEX.test(keyword)) {
            return reply.code(400).send({
                status: 'error',
                message: 'Keyword must be alphanumeric/spaces, max 50 characters',
            });
        }
        if (!jurisdiction) {
            return reply.code(400).send({ status: 'error', message: 'target_jurisdiction is required' });
        }

        // Validate and canonicalize target_jurisdiction input.
        const valid = await query<{ name: string }>(
            'SELECT name FROM jurisdictions WHERE code = $1 OR name = $2',
            [jurisdiction, jurisdiction]
        );
        if (!valid.rowCount) {
            return reply.code(400).send({
                status: 'error',
                message: `Unknown jurisdiction: ${jurisdiction}`,
            });
        }
        const canonicalJurisdiction = valid.rows[0].name;

        const existing = await query<{ id: string }>(
            `SELECT id FROM user_alerts
             WHERE user_id = $1 AND target_jurisdiction = $2 AND keyword = $3`,
            [req.auth!.sub, canonicalJurisdiction, keyword]
        );
        if (existing.rowCount && existing.rowCount > 0) {
            return reply.code(409).send({
                status: 'error',
                message: 'You already have an alarm configured for this keyword in this jurisdiction.',
            });
        }

        const id = generateId('alt');
        await query(
            `INSERT INTO user_alerts (id, user_id, target_jurisdiction, keyword)
             VALUES ($1, $2, $3, $4)`,
            [id, req.auth!.sub, canonicalJurisdiction, keyword]
        );

        return reply.code(201).send({
            status: 'success',
            message: 'Alert created successfully',
            data: { alert_id: id },
        });
    });

    app.delete<{ Params: { alert_id: string } }>(
        '/user/alerts/:alert_id',
        { preHandler: requirePremium },
        async (req, reply) => {
            const alertId = req.params.alert_id;
            const result = await query(
                'DELETE FROM user_alerts WHERE id = $1 AND user_id = $2',
                [alertId, req.auth!.sub]
            );
            if (!result.rowCount) {
                return reply.code(404).send({ status: 'error', message: 'Alert not found' });
            }
            return reply.code(200).send({
                status: 'success',
                message: 'Alert deleted successfully',
            });
        }
    );
}