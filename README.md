# ImmiPulse: Yutian Immigration AI Newsroom

ImmiPulse is a full-stack, AI-powered immigration newsroom designed for the Yutian brand. It aggregates global immigration news, scores them using AI (MiniMax), filters duplicates, and presents high-value video topic candidates for YouTube content creators.

## Architecture

The project consists of three main components:
1. **Backend (Python/FastAPI)**
   - Powered by FastAPI, SQLAlchemy (async), and SQLite (for testing) / PostgreSQL + pgvector (for production).
   - Manages news aggregation, filtering, AI scoring, and candidate curation.
   - Built with Python 3.12 and managed with `uv`.

2. **Frontend (Next.js 15.x)**
   - Built with Next.js 15 App Router using native React hooks and `swr` for data fetching.
   - Features a clean, optimistic UI with the "Sunny Horizon" design system.
   - Designed for desktop editors and mobile viewing.

3. **Infrastructure (Docker)**
   - Uses `docker-compose` to orchestrate PostgreSQL (with pgvector), Text Embeddings Inference (TEI), n8n for workflow automation, Cloudflare tunnels, and the backend API.

## Setup Instructions

### Prerequisites
- [uv](https://github.com/astral-sh/uv) (for Python management)
- [Node.js 20+](https://nodejs.org) (for Frontend)
- [Docker & Docker Compose](https://www.docker.com/) (for Infrastructure)

### Local Development: Backend
```bash
cd backend
# Sync dependencies
uv sync
# Copy environment variables and set values
cp ../.env.example ../.env
# Run the test suite
uv run pytest -v
# Start the development server
uv run uvicorn app.main:app --reload
```

### Local Development: Frontend
```bash
cd frontend
npm install
npm run dev
```

## Production Deployment (Docker Compose)

Do not run docker-compose locally unless explicitly required. The system is designed for remote server deployment.

### 1. Cloudflare Tunnel Setup (CLI)
Before starting the infrastructure, create a Cloudflare Tunnel using the `cloudflared` CLI to expose the backend API securely without opening inbound firewall ports.

1. **Authenticate**:
   ```bash
   cloudflared tunnel login
   ```
2. **Create the Tunnel**:
   ```bash
   cloudflared tunnel create immipulse-backend
   ```
3. **Route DNS**:
   ```bash
   cloudflared tunnel route dns immipulse-backend api.yourdomain.com
   ```
4. **Get the Token**:
   ```bash
   cloudflared tunnel token immipulse-backend
   ```
   *Copy this token to use in the next step.*

### 2. Environment Configuration
Create and configure your `.env` file in the project root:
```bash
cp .env.example .env
```
Ensure you configure:
- Strong database passwords (`DB_USER`, `DB_PASSWORD`)
- Cloudflare Tunnel token (`TUNNEL_TOKEN`) using the token extracted above.
- MiniMax API Key (`MINIMAX_API_KEY`) for AI processing.
- API Token (`DASHBOARD_API_TOKEN`) for securing backend endpoints.

### 3. Start the Infrastructure
Deploy the entire stack, including PostgreSQL (pgvector), local TEI embeddings container, n8n, FastAPI backend, and Cloudflare Tunnel:
```bash
docker compose up -d
```
*Note: The backend API will be securely exposed via Cloudflare Tunnel. The n8n automation UI will be accessible locally/internally on port `5678`.*

### 4. Setup n8n AI News Ingestion Pipeline
The project delegates data fetching, semantic deduplication, and AI scoring to **n8n**. To initialize this pipeline:

1. **Access n8n**: Open `http://localhost:5678` (or your server's equivalent) in your browser.
2. **Import Workflow**: 
   - Go to **Workflows** -> **Add Workflow**.
   - Click the **...** menu in the top right -> **Import from File**.
   - Select the `n8n_workflow.json` file provided in this repository root.
3. **Configure Database Credentials**:
   - Double-click any `Postgres` node in the imported workflow.
   - Under *Credential to connect with*, create a new credential:
     - **Host**: `postgres` (internal Docker hostname)
     - **Database**: `immipulse`
     - **User/Password**: Use values from your `.env` file.
4. **Set Data Source**:
   - Double-click the **RSS Feed Read** node.
   - Replace the URL with your desired RSS feed (e.g., Google Alerts RSS).
5. **Activate**:
   - Click **Execute Workflow** to test the pipeline.
   - Toggle the workflow to **Active** (runs automatically every 4 hours).

### 5. Frontend Deployment (Cloudflare Pages CLI)
The Next.js frontend is designed to be deployed at the edge via Cloudflare Pages using the `wrangler` CLI.

1. **Authenticate Wrangler**:
   ```bash
   npx wrangler login
   ```
2. **Install Dependencies and Build**:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
3. **Deploy using Wrangler**:
   Deploy the static export output directory (`out` or `.next`) directly to Cloudflare Pages. Note: We use `--commit-dirty=true` to deploy local changes.
   ```bash
   npx wrangler pages deploy .next \
     --project-name=immipulse-frontend \
     --commit-dirty=true
   ```
   *(Note: For setting environment variables `NEXT_PUBLIC_API_URL` and `DASHBOARD_API_TOKEN` for the Pages project, use `npx wrangler pages secret put <NAME>` or configure them directly via `wrangler.toml`.)*

## Design & Usage Workflow
- **Development**: All code follows strict TDD (Test-Driven Development) methodologies.
- **Frontend**: The UI adheres to WCAG AA accessibility standards using the "Sunny Horizon" optimistic color palette.
- **Daily Operations**: Open the Next.js frontend to view the `Dashboard`. Filter by high video/importance scores, read AI analyses, and save ideas to the `Candidates` board for script outlining and production.
