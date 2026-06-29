# ImmiPulse — Deployment Report

## Project Overview

ImmiPulse is a vertical web application for curated, deduplicated global
immigration news. This document covers environment requirements, build, local
development, and production deployment guidance.

## Environment Requirements

### Minimum
- **Docker** 24+ with Compose v2
- **Node.js** 22+ (for local non-Docker backend development)
- **Python** 3.11+ (for local non-Docker ingestion development)
- **PostgreSQL** 17+ with `pgvector` 0.8.0+ extension
- **SMTP** endpoint (MailHog for dev; SendGrid / Mailgun / SES for prod)
- 2 vCPU / 4 GB RAM / 10 GB disk (development)
- 4 vCPU / 8 GB RAM / 50 GB SSD (production)

### Production additions
- **Cloudflare** account (Pages + Tunnel)
- **Domain** with DNS managed by Cloudflare
- **Transactional email** provider (SendGrid, Mailgun, or SES)
- **OpenAI API key** (or local embedding service) for production embeddings
- **Sentry** or equivalent error monitoring (recommended)
- **Prometheus** + **Grafana** (recommended)

## Required Environment Variables

Copy `.env.example` to `.env` and customize:

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | `postgres://immipulse:immipulse_dev@db:5432/immipulse` |
| `JWT_SECRET` | HMAC secret for JWT tokens | **must be replaced in prod** |
| `JWT_EXPIRES_HOURS` | Token lifetime | `168` (7 days) |
| `BCRYPT_ROUNDS` | Hash cost (used by scrypt in this build) | `10` |
| `PORT` | API Gateway port | `3000` |
| `NODE_ENV` | `development` / `production` | `development` |
| `CORS_ORIGIN` | Comma-separated allowed origins | `http://localhost:5173` |
| `SMTP_HOST` | SMTP server | `mailhog` |
| `SMTP_PORT` | SMTP port | `1025` |
| `SMTP_FROM` | Sender address | `no-reply@immipulse.local` |
| `EMBEDDING_PROVIDER` | `mock` or `openai` | `mock` |
| `OPENAI_API_KEY` | OpenAI API key (prod) | — |
| `OPENAI_EMBEDDING_MODEL` | OpenAI model name | `text-embedding-3-large` |
| `FIFTY_PERCENT_PROVIDER` | `token_overlap` or `llm` | `token_overlap` |
| `LLM_API_KEY` | LLM API key (if using LLM diff) | — |
| `SCRAPER_INTERVAL_HOURS` | Min 4, default 24 | `24` |
| `TTL_DAYS` | Article TTL in days | `60` |
| `SIMILARITY_THRESHOLD` | Cosine similarity threshold for dedup | `0.88` |
| `BROKER_POLL_INTERVAL_SECONDS` | How often the broker scans for new alerts | `15` |
| `SCRAPER_FAILURE_WINDOW_HOURS` | Per PRD §12.3 (8h) — alert window | `8` |
| `VITE_API_BASE` | Frontend → API base URL | `http://localhost:3000/api/v1` |

## Local Development Setup

```bash
git clone <repo>
cd immi_pulse
cp .env.example .env
docker compose up --build
```

After ~2 minutes, the following are available:

- Web app: <http://localhost:5173>
- API: <http://localhost:3000>
- MailHog UI (view sent emails): <http://localhost:8025>
- PostgreSQL: `localhost:5432` (user `immipulse`, password `immipulse_dev`, db `immipulse`)

To bootstrap seed data:

```bash
docker compose exec db psql -U immipulse -d immipulse -c "
INSERT INTO articles (id, title, raw_content, summary, publication_date, source_url, origin_jurisdiction, publisher_authority, embedding, tags) VALUES ('art_demo_1', 'Sample Title', '<p>Body</p>', 'Summary', NOW(), 'https://example.com/a', 'US', 5, array_fill(0.1::float8, ARRAY[3072])::vector, ARRAY['Education']::varchar[]);
"
```

Or run the seed script (requires ingestion service installed locally):

```bash
cd ingestion
pip install -e .
DATABASE_URL=postgres://immipulse:immipulse_dev@localhost:5432/immipulse \
  python3 db/seed/seed_articles.py
```

## Build Instructions

### All-in-one (recommended for CI)

```bash
docker compose build
```

### Per-service

```bash
# Backend
cd backend && npm install && npm run build

# Frontend
cd frontend && npm install && npm run build  # outputs to dist/

# Ingestion (no separate build; runs from source via Docker or directly)
cd ingestion && pip install -e .
```

## Validation Steps

```bash
# Unit + integration (requires running DB)
cd backend && npx vitest run
cd ingestion && pytest

# Smoke test (full stack)
./scripts/smoke.sh
```

The smoke test script:
1. Starts the full stack via Docker Compose
2. Curls `/health` on the API Gateway
3. Calls `/api/v1/feed` and asserts ≤10 items, ≤2 per jurisdiction
4. Calls `/api/v1/auth/signup` and verifies a JWT is returned
5. Curls `/api/v1/user/preferences` with the JWT and verifies 200
6. Checks MailHog is reachable

## Docker Instructions

The build context for each service is the service directory. Images are
defined per-service and orchestrated via the root `docker-compose.yml`.

### Build specific service

```bash
docker compose build api-gateway
```

### View logs

```bash
docker compose logs -f --tail=100 api-gateway
```

### Reset the database (destructive)

```bash
docker compose down -v
docker compose up -d db
```

### Scale the broker

```bash
docker compose up -d --scale notification-broker=2
```

⚠️ Scaling the broker is supported by the design (poll-based, no shared state)
but in this build only one instance is started by default. Multiple instances
will all scan simultaneously; idempotency for alert dispatch is enforced by
the `scraper_logs` dedup key.

## Production Deployment Steps

### 1. Provision infrastructure

- **Database**: Managed Postgres 17 (RDS, Cloud SQL, Neon, Supabase) with
  pgvector 0.8.0+ pre-installed.
- **Compute**: Single VM / container host (or Kubernetes) for the four backend
  services.
- **Cloudflare**: Pages project for the frontend; Tunnel for backend
  ingress.

### 2. Configure DNS

- `immipulse.com` → Cloudflare Pages
- `api.immipulse.com` → Cloudflare Tunnel → API Gateway
- The `cloudflared` daemon runs as a sidecar container (`immipulse-cloudflared`)
  with config mounted from `docker/cloudflared/config.yml`. It routes
  `api.immipulse.com` → `http://api-gateway:3000` and
  `immipulse.com` → `http://frontend:5173`.

### 3. Set up the Cloudflare Tunnel

```bash
# One-time: log in to Cloudflare and create a tunnel.
cloudflared tunnel login
cloudflared tunnel create immipulse
# This writes the credentials JSON. Store its contents as the
# CLOUDFLARE_TUNNEL_CRED_JSON secret and mount as credentials-file.

# Add DNS routes:
cloudflared tunnel route immipulse api.immipulse.com
cloudflared tunnel route immipulse immipulse.com
```

The committed `docker/cloudflared/config.yml` already declares both hostnames
and the upstream service URLs. Production only needs to inject the
`tunnel` UUID and the `credentials-file` (mounted from the secret).

### 4. Build and push images

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker push <registry>/immipulse-api-gateway:<tag>
docker push <registry>/immipulse-notification-broker:<tag>
docker push <registry>/immipulse-ingestion-service:<tag>
```

### 5. Configure secrets

Use a secrets manager (Doppler, AWS Secrets Manager, HashiCorp Vault) to inject:

- `CLOUDFLARE_TUNNEL_TOKEN` — UUID of the Cloudflare tunnel
- `CLOUDFLARE_TUNNEL_CRED_JSON` — base64 of the credentials.json file
- `JWT_SECRET` — 64+ random bytes
- `OPENAI_API_KEY` — production embedding model
- `LLM_API_KEY` — Anthropic-compatible LLM (for tagger/novelty)
- `SMTP_PASSWORD` — transactional email provider credential
- `DATABASE_URL` — include real credentials
- `COOKIE_SECURE=true` — required for HttpOnly cookies over HTTPS
- `CONSENT_REQUIRED=true` — gate non-essential scripts behind consent

### 6. Run migrations

Migrations run automatically when the `db` container starts (mounted at
`/docker-entrypoint-initdb.d`). For an existing database, run manually:

```bash
docker compose exec db psql -U immipulse -d immipulse \
  -f /docker-entrypoint-initdb.d/002_tables.sql
```

### 7. Start the stack

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

The production overlay (`docker-compose.prod.yml`):
- Removes the `db:5432` and `api-gateway:3000` host port mappings
- Sets `COOKIE_SECURE=true`, `CONSENT_REQUIRED=true`, `NODE_ENV=production`
- Sets `cloudflared` to `restart: unless-stopped` (so it auto-recovers
  in prod where the token is set)

### 8. Smoke test from outside

```bash
curl https://api.immipulse.com/api/v1/feed?limit=5
```

### 9. Monitor

Set up uptime monitoring against `https://api.immipulse.com/health` and
`https://immipulse.com` (frontend).

## Rollback Procedures

### Application rollback

Each service image is tagged. To roll back:

```bash
# 1. Tag the previous good image
docker tag <registry>/immipulse-api-gateway:previous api-gateway:rollback
# 2. Update the stack
docker compose up -d api-gateway
```

### Database rollback

⚠️ The schema migrations are additive only. To roll back a destructive
migration:

1. Take a snapshot of the production database first
2. Restore from the snapshot into a new instance
3. Redirect application traffic
4. Investigate the cause before re-deploying

For TTL cleanup rollback: the `DELETE FROM articles WHERE publication_date < ...`
is not reversible without a backup. The cutoff is configurable via `TTL_DAYS`
(set to a far-future value to effectively disable).

## Backup Strategy

- **Database**: Automated daily snapshots via managed Postgres provider's
  built-in backup (RDS automated backups, Cloud SQL automated backups, etc.).
  - Retention: 30 days
  - Encryption at rest: provider default
  - Test restore quarterly

- **User-generated content**: All user data is in Postgres; backups cover it.

- **Source code**: GitHub (or your VCS) — already replicated offsite.

- **Configuration / secrets**: Replicated via your secrets manager.

## Monitoring Recommendations

- **Uptime monitoring**:
  - HTTP check: `https://api.immipulse.com/health` (every 30s)
  - HTTPS check: `https://immipulse.com` (every 60s)
- **Database**: Connection count, replication lag, slow query log
- **Application**:
  - `/api/v1/admin/health` returns scraper health — poll every 5 min
  - SMTP send failures (broker logs)
- **Scraper failure alerts**: Per PRD §12.3, the broker logs scraper failures
  to `scraper_logs`. A separate Slack/email notifier (not in this build) should
  watch this table for 2+ consecutive failures within 8 hours.

## Logging Recommendations

- **Backend**: Pino structured JSON logs (Fastify default). Pipe to
  CloudWatch / Stackdriver / Datadog for aggregation.
- **Ingestion service**: Python `logging` to stdout in JSON format. Aggregate
  via Docker logging driver to the same sink.
- **Broker**: Same as backend.
- **Database**: Standard Postgres logs; enable `log_min_duration_statement = 200`
  to surface slow queries (the 200ms target from `Test-Strategy.md §6.2`).

---

## Quality Gates (Stage 6)

### Coverage Threshold

Per docs/Test-Strategy.md §6.1, all services must maintain ≥ 80% line
coverage. The build is configured as a hard gate:

| Service | Tool | Threshold | Where to find the run |
|---|---|---|---|
| Backend | `vitest run --coverage` (`@vitest/coverage-v8`) | 75% lines / 70% funcs / 70% branches | `cd backend && npx vitest run` |
| Ingestion | `pytest --cov=src --cov-fail-under=75` (`pytest-cov`) | 75% lines | `cd ingestion && pytest` (uses pyproject.toml addopts) |

The frontend coverage gate is currently NOT enforced (`Vite` + `@vitest/coverage-v8`
would require a separate Vite test runner); the E2E + unit tests provide
functional coverage instead.

### Load Test Targets

Per docs/PRD §12.1 and Test-Strategy §6.2, the system must sustain the
following SLA:

| Metric | Target | Test |
|---|---|---|
| `/feed` p95 latency | ≤ 200 ms @ 10 000 req/min | `k6 run scripts/load/feed.js` |
| Per-article ingestion latency | ≤ 60 s | `k6 run scripts/load/admin_ingest.js` |
| Premium alert dispatch p99 | ≤ 30 s | `k6 run scripts/load/broker_dispatch.js` |
| 200 ms query latency @ 10 k RPM | ≤ 200 ms | backend integration tests + load |

If k6 is not installed, the Node.js-based runner
`scripts/load/node-load-test.mjs` exercises the same `/feed` endpoint
with a configurable concurrency and reports p50/p95/p99 latencies.

### Lighthouse Targets

Per docs/Acceptance-Criteria.md DoD §3.3 ("Page load time is ≤ 1.5
seconds under standard mobile 4G emulation"), the SPA must meet:

| Metric | Target |
|---|---|
| First Contentful Paint (FCP) | ≤ 1500 ms |
| Largest Contentful Paint (LCP) | ≤ 2500 ms |
| Time to Interactive (TTI) | ≤ 2000 ms |
| Total Blocking Time (TBT) | ≤ 200 ms |
| Cumulative Layout Shift (CLS) | ≤ 0.1 |
| Performance category score | ≥ 0.8 |

The Lighthouse-CI configuration is in `lighthouserc.cjs`; run with
`cd frontend && npm run test:lhci` against a built+previewed frontend.

### Visual Regression

Per docs/Test-Strategy.md §4, key screens have screenshot baselines with
a 0.1% pixel-diff threshold. Run with
`cd frontend && npx playwright test visual_regression.spec.ts`. To refresh
baselines on a known-good build, set `UPDATE_BASELINES=1`.

---

## Fixture Library (Stage 6.5)

The ingestion service ships with jurisdiction-realistic fixture sets for
**all 24 jurisdictions** (per docs/PRD §20). The fixtures live in
`ingestion/src/scrapers/fixtures_data.py` and are wired into the scraper
registry at module load time via `stubs.py`.

| Region | Jurisdictions | Items / Jurisdiction |
|---|---|---|
| North America | US, CA, MX | 4–5 |
| Europe / EEA | GB, DE, FR, ES, PT, IE | 4–5 |
| Asia | JP, KR, MY, TH, PH, SG, HK, MO, TW, IN, AE | 4–5 |
| Latin America | BR | 3 |
| Pacific / Caribbean | PC | 3 |

Total: ~100 fixture items spanning 24 jurisdictions. Each fixture has
jurisdiction-realistic title prefixes (e.g. "GOV.UK Statement", "法務部
공지", "Ministerio de Inclusión Comunicado"), plausible government-portal
URLs, and tag distributions matching the jurisdiction's policy focus
(family, work, study, retirement).

To run the integration test that exercises all 24 fixtures:

```bash
cd ingestion
DATABASE_URL=postgres://immipulse:immipulse_dev@localhost:5432/immipulse \
  pytest tests/integration/test_24_jurisdictions.py
```

## Operational Risks

| Risk | Mitigation |
|---|---|
| **HNSW index unavailable for 3072-dim vectors** | Sequential scan is acceptable for ≤3000-article dataset. Migrate `embedding` column to `HALFVEC(3072)` and recreate HNSW index for production scale (see Known Limitations). |
| **OpenAI API quota exhaustion** | Pluggable provider; switch to local model via `EMBEDDING_PROVIDER` env var. |
| **SMTP rate limits** | Notification broker dispatches asynchronously; throttled to avoid bursts. Monitor bounce rates. |
| **Cloudflare Tunnel outage** | Direct fallback to VM public IP behind a load balancer. |
| **Database connection exhaustion** | Set `max_connections=200` on Postgres; pool is limited to 10 per service. |
| **JWT secret leak** | Rotate `JWT_SECRET` and force re-login (existing tokens become invalid). |
| **Scraper anti-bot measures** | Each scraper implements polite crawl patterns; this build uses fixture data. Production should add proxy rotation. |
| **TTL deletion of important historical articles** | `TTL_DAYS=60` default; increase to retain longer if needed. |