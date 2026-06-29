#!/usr/bin/env bash
# ImmiPulse test runner
# Supports: backend, ingestion, e2e, load, all
set -euo pipefail
cd "$(dirname "$0")/.."

cmd="${1:-all}"

run_backend() {
    echo "=== Backend unit tests (with coverage) ==="
    (cd backend && npx vitest run tests/unit)
    echo "=== Backend integration tests ==="
    (cd backend && npm run test:integration)
}

run_ingestion() {
    echo "=== Ingestion unit + integration tests (with coverage) ==="
    (cd ingestion && DATABASE_URL=postgres://immipulse:immipulse_dev@localhost:5432/immipulse \
        EMBEDDING_PROVIDER=mock FIFTY_PERCENT_PROVIDER=token_overlap \
        pytest --cov=src --cov-report=term --cov-report=html:coverage \
        --cov-report=json:coverage/coverage.json --cov-fail-under=75)
}

run_e2e() {
    echo "=== Frontend E2E tests ==="
    (cd frontend && npx playwright install --with-deps >/dev/null 2>&1 || true)
    (cd frontend && npx playwright test)
}

run_load() {
    echo "=== k6 load tests ==="
    if ! command -v k6 >/dev/null 2>&1; then
        echo "k6 not installed; install via: brew install k6 OR download from https://k6.io"
        return 1
    fi
    # Ensure the full stack is running.
    docker compose up -d db api-gateway mailhog >/dev/null
    sleep 5
    k6 run scripts/load/feed.js
    k6 run scripts/load/admin_ingest.js
    k6 run scripts/load/broker_dispatch.js
}

case "$cmd" in
    backend) run_backend ;;
    ingestion) run_ingestion ;;
    e2e) run_e2e ;;
    load) run_load ;;
    coverage) run_backend; run_ingestion ;;
    all)
        run_backend
        run_ingestion
        run_e2e
        ;;
    *) echo "Usage: $0 {backend|ingestion|e2e|load|coverage|all}"; exit 1 ;;
esac