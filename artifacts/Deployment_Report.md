# Deployment Report

## Pre-Deployment Checklist

Before deploying the ImmiPulse system to the remote production environment, ensure the following steps are complete:

1. **Environment Configuration:**
   - Create a `.env` file in the project root based on `.env.example`.
   - Set a strong `DB_PASSWORD`.
   - Configure `LLM_API_KEY`, `LLM_API_URL`, and `LLM_MODEL` for AI summaries.
   - Generate a secure `DASHBOARD_API_TOKEN` for frontend/backend communication.
   - Set the `TUNNEL_TOKEN` provided by Cloudflare Zero Trust.

2. **Server Requirements:**
   - Linux server with Docker and Docker Compose installed (v2+).
   - At least 4GB RAM (due to the TEI model loading for embedding vectors).
   - Port 80/443 mapped via Cloudflare; local ports 8000 (Backend), 5432 (Postgres), 5678 (n8n) can remain internal.

## Deployment Instructions

Execute the following commands on the remote server:

```bash
# 1. Clone the repository
git clone <repository_url> immipulse
cd immipulse

# 2. Add the .env file (transfer securely via scp/sftp)
# vim .env

# 3. Spin up the infrastructure
docker compose up -d

# 4. Verify running containers
docker compose ps
```

## Post-Deployment Verification

1. **Database Initialization:** Check the Postgres logs to verify that `001_initial_schema.sql` ran successfully and created the `vector` extension.
   ```bash
   docker compose logs postgres
   ```
2. **Backend Health:** Send an authenticated GET request to the backend.
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/news
   ```
3. **Frontend Vercel/Pages Deployment:** The Next.js frontend can be deployed independently to Vercel or Cloudflare Pages. Ensure `NEXT_PUBLIC_API_URL` is set to the public Cloudflare tunnel URL of the backend.
