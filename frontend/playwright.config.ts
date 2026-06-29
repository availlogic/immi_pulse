import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 60_000,
    retries: 0,
    use: {
        baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
        trace: 'on-first-retry',
    },
    reporter: [['list']],
    expect: {
        toHaveScreenshot: {
            // Stage 6.4.2: 0.1% pixel diff threshold.
            maxDiffPixelRatio: 0.001,
        },
    },
});