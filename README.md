# ImmiPulse

Vertical web application for curated, deduplicated global immigration news.

## Architecture

```
Cloudflare (frontend) ──► Cloudflare Tunnel ──► api-gateway (Node/Fastify)
                                                       │
                                                       ▼
                                          PostgreSQL + pgvector
                                                       ▲
                                                       │
            ingestion-service (Python) ──► mock scraping fixtures
                                                       ▲
                                                       │
            notification-broker (Node) ──► SMTP (MailHog in dev)
```

Five Docker services:
- `db` — PostgreSQL 16 + pgvector
- `api-gateway` — Node.js / Fastify / TypeScript
- `notification-broker` — Node.js polling + SMTP dispatcher
- `ingestion-service` — Python scraper/normalizer/embedder/dedup daemon
- `frontend` — React + Vite SPA
- `mailhog` — SMTP sink for development

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

Then open:
- Web app: <http://localhost:5173>
- API: <http://localhost:3000/api/v1>
- MailHog (email inspection): <http://localhost:8025>

## Tests

```bash
docker compose exec api-gateway npm run test:unit
docker compose exec api-gateway npm run test:integration
docker compose exec ingestion-service pytest
docker compose exec frontend npx playwright test
```

## Documentation

All product, API, schema, and test specifications are in `docs/`. The implementation follows those documents as the Single Source of Truth. See `artifacts/Documentation_Conflict_Report.md` for known conflicts and their resolutions.

## License

Proprietary — internal evaluation only.