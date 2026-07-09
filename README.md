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

## Production Deployment

Do not run docker-compose locally unless explicitly required. The system is designed for remote server deployment.

### 1. Cloudflare Zero Trust (Tunnel) Setup
We use a remotely-managed Cloudflare Tunnel (via Zero Trust Dashboard) to expose the backend API securely.

1. **Create the Tunnel**:
   - Go to [Cloudflare Zero Trust](https://one.dash.cloudflare.com/) -> **Networks** -> **Tunnels**.
   - Click **Add a tunnel** -> Select **Cloudflared**.
   - Name it (e.g., `immipulse-backend`).
   - Copy the `TUNNEL_TOKEN` provided in the Docker installation command.

2. **Configure the Public Hostname (Route Traffic)**:
   - In the Tunnel settings, go to the **Routes** (or Public Hostnames) tab.
   - Click **Add route** -> **Published application**.
   - **Subdomain**: e.g., `immipulse-api`
   - **Domain**: Select your domain (e.g., `maxithome.com`)
   - **Service Type**: `HTTP`
   - **Service URL**: `backend:8000` (Crucial: use the docker service name)
   - Save the route.

### 2. Environment Configuration
Create and configure your `.env` file in the project root:
```bash
cp .env.example .env
```
Ensure you configure:
- `TUNNEL_TOKEN`: The token you copied from Cloudflare Zero Trust.
- `CORS_ORIGINS`: The exact URL of your frontend (e.g., `https://immipulse-frontend.maxithome.com`). This ensures the browser allows cross-origin requests.
- `MINIMAX_API_KEY` and database credentials.

### 3. Start the Backend Infrastructure
Deploy the entire stack, including PostgreSQL, TEI, n8n, FastAPI backend, and Cloudflare Tunnel:
```bash
docker compose up -d
```
*(If you update your `.env` file later, you must run `docker compose up -d` again to apply the changes to the containers. `docker compose restart` is not sufficient!)*

### 4. Setup n8n AI News Ingestion Pipeline
The project delegates data fetching, semantic deduplication, and AI scoring to **n8n**.

1. **Access n8n**: Open `http://localhost:5678` (or your server's equivalent).
2. **Import Workflow**: 
   - Go to **Workflows** -> **Add Workflow** -> **Import from File**.
   - Select the `n8n_workflow.json` file provided in this repository root.
3. **Understand and Configure the Nodes**:
   Below is the detailed explanation and configuration guide for every node in the imported workflow.

   * **Schedule Trigger**: 
     - **Purpose**: Runs the workflow automatically every 4 hours.
     - **Action**: None required (unless you want to change the frequency).
   
   * **RSS Feed Read**:
     - **Purpose**: Fetches the latest news articles from an RSS source.
     - **Action (Required)**: Double-click the node and replace the default `URL` with your actual RSS feed URL (e.g., a Google Alerts RSS link).
   
   * **Level 1 Dup Check (Postgres)**:
     - **Purpose**: Queries the database to check if the exact URL has already been ingested.
     - **Action (Required)**: Double-click the node, go to *Credential to connect with*, create a new credential (`Host`: `postgres`, `Database`: `immipulse`, User/Pass from your `.env`).
   
   * **Is Duplicate (URL)? (If Node)**:
     - **Purpose**: Branches the workflow. If the URL exists, it stops processing to save AI costs. If it's new, it continues.
     - **Action**: None required.
   
   * **TEI Generate Embeddings (HTTP Request)**:
     - **Purpose**: Sends the article title to your local TEI container (`http://tei-embeddings:80/embed`) to generate a 384-dimensional vector.
     - **Action**: None required.
   
   * **Level 2 Semantic Check (Postgres)**:
     - **Purpose**: Performs a vector similarity search (`<->`) against existing articles to find semantic duplicates.
     - **Action (Required)**: Select the Postgres credential you created earlier.
   
   * **Is Semantic Duplicate? (If Node)**:
     - **Purpose**: Checks if the vector distance is `< 0.12`.
     - **Action**: None required.
   
   * **Insert as Child (Postgres)**:
     - **Purpose**: If it's a semantic duplicate, it's inserted with scores of `0` and linked to the original article via `parent_id`.
     - **Action (Required)**: Select the Postgres credential you created earlier.
   
   * **MiniMax LLM Enrichment (HTTP Request)**:
     - **Purpose**: Sends the content to MiniMax (`abab6.5-chat`) for translation, tagging, multi-dimensional scoring, and analysis. It automatically authenticates using `{{$env.MINIMAX_API_KEY}}`.
     - **Action (Optional)**: You can double-click and edit the `messages` array if you want to tweak the prompt instructions.
   
   * **Parse AI Output (Code)**:
     - **Purpose**: Cleans up any markdown formatting (e.g., ` ```json `) returned by the AI and converts it into a pure JSON object.
     - **Action**: None required.
   
   * **Insert Primary Item (Postgres)**:
     - **Purpose**: Inserts the newly enriched, fully scored, and vectorized article into the database for the frontend to consume.
     - **Action (Required)**: Select the Postgres credential you created earlier.

4. **Activate**:
   - Once all credentials are set, click **Execute Workflow** at the bottom to run a test.
   - Toggle the workflow button in the top right corner to **Active**.

### 5. Frontend Deployment (Cloudflare Pages)
The Next.js frontend is deployed to Cloudflare Pages using the `wrangler` CLI.

1. **Prepare Environment Variables**:
   Because the frontend package is configured to use `dotenv-cli`, you do **NOT** need a separate `.env` file in the frontend directory. The build process automatically reads from the globally unique `../.env` file in your root folder. Just ensure `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_DASHBOARD_API_TOKEN` are set correctly in your root `.env`.

2. **Build the Static Export**:
   Make sure `next.config.mjs` has `output: 'export'` configured.
   ```bash
   cd frontend
   npm install
   npm run build
   ```
   *This will generate an `out` directory containing the static HTML/JS/CSS.*

3. **Deploy using Wrangler**:
   Deploy the `out` directory to Cloudflare Pages.
   ```bash
   npx wrangler pages deploy out \
     --project-name=immipulse-frontend \
     --commit-dirty=true
   ```

4. **Bind Custom Domain (Optional)**:
   - In the Cloudflare Dashboard, go to **Workers & Pages** -> your project -> **Custom Domains**.
   - Set up your custom domain (e.g., `immipulse-frontend.maxithome.com`).

## Design & Usage Workflow
- **Development**: All code follows strict TDD (Test-Driven Development) methodologies.
- **Frontend**: The UI adheres to WCAG AA accessibility standards using the "Sunny Horizon" optimistic color palette.
- **Daily Operations**: Open the Next.js frontend to view the `Dashboard`. Filter by high video/importance scores, read AI analyses, and save ideas to the `Candidates` board for script outlining and production.
