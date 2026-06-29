// Stage 6.2.1: k6 load test for /feed
// Run with: k6 run scripts/load/feed.js
//
// Target: 10 000 req/min (~167 RPS), p95 latency <= 200 ms.
// Per docs/PRD §12.1 and Test-Strategy §6.2: "Database query performance
// checks confirm latency <= 200ms under simulated loads (10,000 requests/minute)".

import http from 'k6/http';
import { check } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 50 }, // ramp-up
        { duration: '1m', target: 167 }, // steady at ~10k req/min
        { duration: '30s', target: 0 }, // ramp-down
    ],
    thresholds: {
        // docs/Test-Strategy §6.2: p95 latency must be <= 200ms
        http_req_duration: ['p(95)<200'],
        http_req_failed: ['rate<0.01'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
    const res = http.get(`${BASE_URL}/api/v1/feed?limit=10`);
    check(res, {
        'status is 200': (r) => r.status === 200,
        'body is JSON': (r) => r.headers['Content-Type']?.includes('json'),
        'has articles': (r) => {
            try {
                return r.json('data.articles') !== undefined;
            } catch {
                return false;
            }
        },
    });
}