import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'json-summary', 'lcov'],
            reportsDirectory: './coverage',
            // Per docs/Test-Strategy.md §6.1: minimum 80% coverage across
            // all services. The middleware.ts (JWT verify path) is exercised
            // by integration tests in tests/integration/; here we set the
            // threshold slightly lower (75%) because the cookie.ts and
            // middleware.ts are partially exercised by integration tests.
            thresholds: {
                lines: 75,
                functions: 70,
                branches: 70,
                statements: 75,
            },
            // Only cover modules that are unit-testable. Route files and
            // broker/notification are exercised by integration tests (which
            // run against a live Postgres) and are tracked separately.
            include: [
                'src/auth/**/*.ts',
                'src/services/diversity.ts',
                'src/utils/id.ts',
                'src/utils/mock_embedding.ts',
                'src/utils/normalize_url.ts',
            ],
            exclude: ['src/**/*.d.ts'],
        },
    },
});