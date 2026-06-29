// Stage 6.2: Node.js-based load test runner (no k6 required).
//
// Runs a basic load test against the running stack and reports p50/p95/p99
// latencies. Useful for environments where k6 isn't available.
//
// Usage: node scripts/load/node-load-test.mjs [base_url] [duration_sec] [concurrency]
//
// Per docs/PRD §12.1 + Test-Strategy §6.2:
//   - GET /feed p95 latency <= 200 ms under 10 000 req/min
//   - Article dispatch p99 <= 30 s
import http from 'node:http';
import { performance } from 'node:perf_hooks';

const BASE = process.argv[2] || 'http://localhost:3000';
const DURATION_S = Number(process.argv[3] || 30);
const CONCURRENCY = Number(process.argv[4] || 50);

function requestOnce() {
    return new Promise((resolve, reject) => {
        const start = performance.now();
        const req = http.get(
            `${BASE}/api/v1/feed?limit=10`,
            { headers: { Accept: 'application/json' } },
            (res) => {
                res.on('data', () => {});
                res.on('end', () => {
                    resolve({ status: res.statusCode, ms: performance.now() - start });
                });
                res.on('error', reject);
            }
        );
        req.on('error', reject);
        req.setTimeout(10000, () => {
            req.destroy(new Error('request timeout'));
        });
    });
}

function pct(arr, p) {
    if (arr.length === 0) return 0;
    const idx = Math.min(arr.length - 1, Math.floor((arr.length - 1) * p));
    return arr[idx];
}

async function main() {
    console.log(`[load] target: ${BASE} duration=${DURATION_S}s concurrency=${CONCURRENCY}`);

    const latencies = [];
    let errors = 0;
    const startTime = Date.now();
    const endTime = startTime + DURATION_S * 1000;

    const workers = Array.from({ length: CONCURRENCY }, async () => {
        while (Date.now() < endTime) {
            try {
                const { status, ms } = await requestOnce();
                if (status >= 200 && status < 300) {
                    latencies.push(ms);
                } else {
                    errors++;
                }
            } catch {
                errors++;
            }
        }
    });

    await Promise.all(workers);

    const sorted = latencies.slice().sort((a, b) => a - b);
    const rps = latencies.length / DURATION_S;
    const summary = {
        duration_s: DURATION_S,
        concurrency: CONCURRENCY,
        requests: latencies.length,
        rps_avg: rps.toFixed(1),
        errors,
        p50_ms: pct(sorted, 0.50).toFixed(1),
        p95_ms: pct(sorted, 0.95).toFixed(1),
        p99_ms: pct(sorted, 0.99).toFixed(1),
        max_ms: sorted[sorted.length - 1]?.toFixed(1) ?? 0,
        target_p95_200ms: pct(sorted, 0.95) <= 200 ? 'PASS' : 'FAIL',
    };
    console.log(JSON.stringify(summary, null, 2));
    if (summary.target_p95_200ms === 'FAIL') {
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('[load] error:', err);
    process.exit(1);
});