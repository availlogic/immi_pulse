export const config = {
    databaseUrl: process.env.DATABASE_URL ?? 'postgres://immipulse:immipulse_dev@localhost:5432/immipulse',
    jwtSecret: process.env.JWT_SECRET ?? 'dev_jwt_secret_change_in_prod_12345',
    jwtExpiresHours: Number(process.env.JWT_EXPIRES_HOURS ?? 168),
    bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10),
    port: Number(process.env.PORT ?? 3000),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    // Stage 5.2: HttpOnly cookie auth + CSRF configuration.
    cookie: {
        secure: (process.env.COOKIE_SECURE ?? 'false') === 'true',
        sameSite: (process.env.COOKIE_SAMESITE ?? 'lax') as 'lax' | 'strict' | 'none',
        domain: process.env.COOKIE_DOMAIN ?? '',
        accessTokenName: 'access_token',
        csrfCookieName: 'csrf_token',
        csrfHeaderName: 'x-csrf-token',
    },
    // Stage 5.3.5: when true, non-essential scripts (analytics, marketing)
    // are gated behind the cookie consent banner. Set to true in production.
    consentRequired: (process.env.CONSENT_REQUIRED ?? 'false') === 'true',
    smtp: {
        host: process.env.SMTP_HOST ?? 'localhost',
        port: Number(process.env.SMTP_PORT ?? 1025),
        from: process.env.SMTP_FROM ?? 'no-reply@immipulse.local',
    },
    broker: {
        pollIntervalSeconds: Number(process.env.BROKER_POLL_INTERVAL_SECONDS ?? 15),
        scraperFailureWindowHours: Number(process.env.SCRAPER_FAILURE_WINDOW_HOURS ?? 8),
    },
    feed: {
        maxItems: 10,
        maxPerJurisdiction: 2,
    },
};

export const FEATURE_TAGS = [
    'Raising a Family',
    'Education',
    'Retirement',
    'Vacation',
    'Culture Inclusion',
    'Corporate Sponsorship',
] as const;

export type FeatureTag = typeof FEATURE_TAGS[number];

export const DIGEST_FREQUENCIES = ['none', 'daily', 'weekly'] as const;
export type DigestFrequency = typeof DIGEST_FREQUENCIES[number];

export const USER_TIERS = ['basic', 'premium', 'admin'] as const;
export type UserTier = typeof USER_TIERS[number];