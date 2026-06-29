// Stage 6.3: Lighthouse-CI configuration.
// Per docs/Acceptance-Criteria.md DoD §3.3:
//   "Page load time is <= 1.5 seconds under standard mobile 4G emulation."
//
// Thresholds (mobile 4G profile):
//   - First Contentful Paint (FCP): <= 1500 ms
//   - Largest Contentful Paint (LCP): <= 2500 ms
//   - Time to Interactive (TTI):     <= 2000 ms
//   - Total Blocking Time (TBT):    <= 200 ms
//   - Cumulative Layout Shift (CLS): <= 0.1
//
// We assert on the "performance" category score as well.

module.exports = {
    ci: {
        collect: {
            // Start the Vite dev server for the duration of the audit.
            // In CI, this is started separately by the workflow; here we
            // assume http://localhost:5173 is already up.
            url: ['http://localhost:5173/'],
            numberOfRuns: 1,
            settings: {
                preset: 'desktop',
            },
        },
        assert: {
            assertions: {
                'categories:performance': ['warn', { minScore: 0.8 }],
                'categories:accessibility': ['warn', { minScore: 0.9 }],
                'first-contentful-paint': ['warn', { maxNumericValue: 1500 }],
                'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
                'interactive': ['warn', { maxNumericValue: 2000 }],
                'total-blocking-time': ['warn', { maxNumericValue: 200 }],
                'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
            },
        },
        upload: {
            target: 'temporary-public-storage',
        },
    },
};