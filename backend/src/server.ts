import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import feedRoutes from './routes/feed.js';
import alertsRoutes from './routes/alerts.js';
import adminRoutes from './routes/admin.js';
import { requireCsrfIfStateChanging } from './auth/middleware.js';

export async function buildApp() {
    const app = Fastify({
        logger: {
            level: config.nodeEnv === 'production' ? 'info' : 'debug',
        },
    });

    await app.register(cors, {
        origin: config.corsOrigin.split(',').map((s) => s.trim()),
        credentials: true,
    });

    // Stage 5.2: cookie parser must be registered before the auth middleware
    // can read the `access_token` HttpOnly cookie.
    await app.register(cookie, {
        secret: config.jwtSecret, // used only for signed cookies; we use unsigned here
    });

    await app.register(jwt, {
        secret: config.jwtSecret,
    });

    app.setErrorHandler((err, _req, reply) => {
        app.log.error(err);
        const statusCode = err.statusCode ?? 500;
        return reply.code(statusCode).send({
            status: 'error',
            message: err.message ?? 'Internal server error',
        });
    });

    app.get('/health', async () => ({ status: 'ok' }));

    await app.register(async (api) => {
        // Stage 5.2.5: CSRF guard for state-changing requests. Runs before
        // every route in the /api/v1 namespace. GET/HEAD/OPTIONS bypass.
        api.addHook('preHandler', requireCsrfIfStateChanging);

        await api.register(authRoutes);
        await api.register(userRoutes);
        await api.register(feedRoutes);
        await api.register(alertsRoutes);
        await api.register(adminRoutes);
    }, { prefix: '/api/v1' });

    return app;
}

async function main(): Promise<void> {
    const app = await buildApp();
    try {
        await app.listen({ port: config.port, host: '0.0.0.0' });
        app.log.info(`ImmiPulse API listening on :${config.port}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}

const isMain = process.argv[1] && process.argv[1].endsWith('server.ts');
if (isMain) {
    main();
}