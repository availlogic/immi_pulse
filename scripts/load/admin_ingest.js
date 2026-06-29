// Stage 6.2.2: k6 load test for /admin/ingest
// Run with: k6 run scripts/load/admin_ingest.js
//
// Target: 100 articles processed in <= 60 s each (per-article SLA).
// Per docs/PRD §12.1: "The ingestion-to-publish processing pipeline
// (scraping, embedding, similarity verification, tagging) must complete
// in <= 60 seconds per article."

import http from 'k6/http';
import { check } from 'k6';
import { SharedArray } from 'k6/data';

const articles = new SharedArray('articles', function () {
    const list = [];
    for (let i = 0; i < 200; i++) {
        list.push({
            title: `Load test article ${i}`,
            summary: `Load test summary ${i} for ingestion SLA measurement.`,
            source_url: `https://www.gov.uk/load-test/${i}/${Date.now()}`,
            origin_jurisdiction: 'US',
            publisher_authority: 4,
            tags: ['Corporate Sponsorship'],
        });
    }
    return list;
});

export const options = {
    scenarios: {
        ingest: {
            executor: 'constant-arrival-rate',
            rate: 5, // 5 req/s = 300 req/min
            timeUnit: '1s',
            duration: '2m',
            preAllocatedVUs: 10,
            maxVUs: 50,
        },
    },
    thresholds: {
        // Per-article SLA: 60s
        http_req_duration: ['p(95)<60000'],
        http_req_failed: ['rate<0.01'],
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || '';

export function setup() {
    if (!ADMIN_TOKEN) {
        // Bootstrap a fresh admin user + obtain a token.
        const ts = Date.now();
        const email = `load_admin_${ts}@example.com`;
        http.post(`${BASE_URL}/api/v1/auth/signup`, JSON.stringify({ email, password: 'Password123!' }), {
            headers: { 'Content-Type': 'application/json' },
        });
        // Promote to admin in the DB.
        // (This script assumes the operator has seeded an admin via /admin/ingest
        //  and the broker. For local testing, run the bootstrap separately.)
        const login = http.post(
            `${BASE_URL}/api/v1/auth/login`,
            JSON.stringify({ email, password: 'Password123!' }),
            { headers: { 'Content-Type': 'application/json' } }
        );
        return { token: login.json('data.token'), ts };
    }
    return { token: ADMIN_TOKEN, ts: Date.now() };
}

export default function (data) {
    const idx = __VU * __ITER + __ITER;
    const a = articles[idx % articles.length];
    const res = http.post(
        `${BASE_URL}/api/v1/admin/ingest`,
        JSON.stringify({ ...a, source_url: `${a.source_url}/${idx}` }),
        {
            headers: {
                'Content-Type': 'application/json',
                authorization: `Bearer ${data.token}`,
            },
        }
    );
    check(res, {
        'status is 201': (r) => r.status === 201,
    });
}