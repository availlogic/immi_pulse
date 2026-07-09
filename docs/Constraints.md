# Constraints: Yutian Immigration AI Newsroom

This document outlines the operational boundaries, technical requirements, and system constraints for the Yutian Immigration AI Newsroom.

## Technology Constraints

- **Workflow Engine**: Self-hosted n8n (for RSS collection, translation pipelines, database storage, and scheduling). Workflows must utilize an **asynchronous webhook design** when dispatching parallel batch LLM requests to prevent timeout errors.
- **LLM Integration**: MiniMax M3 (via an Anthropic-compatible API wrapper) for translation, semantic analysis, and scoring.
- **Embedding Generation**: Local HuggingFace embedding container (hosting `all-MiniLM-L6-v2`) on the self-hosted Ubuntu Server, providing free semantic vectors for de-duplication without external API dependencies.
- **Backend API**: FastAPI (Python) for servicing the dashboard, filtering, searching, and managing saved candidates.
- **Database**: PostgreSQL with the `pgvector` extension, storing strictly metadata (no full article bodies, HTML content, or media files).
- **Frontend Framework**: Next.js (hosted on Cloudflare, e.g., Cloudflare Pages, featuring fast interactive filtering).
- **Network Tunneling**: Cloudflare Tunnel (for secure API communication between the Cloudflare-hosted frontend and the self-hosted backend).

## Deployment & Platform Constraints

- **Hybrid Hosting**: 
  - **Frontend**: Hosted on Cloudflare (utilizing its global edge network).
  - **Backend & Workflows**: Deployed to a self-hosted Ubuntu Server.
- **Secure Communication**: API traffic between the Next.js frontend and FastAPI backend is routed securely through a Cloudflare Tunnel, eliminating the need to expose public backend ports.
- **Containerization**: Orchestrated on the Ubuntu Server using Docker Compose containing:
  - n8n
  - PostgreSQL (with `pgvector`)
  - FastAPI
  - **Local Embedding Service** (HuggingFace container for `all-MiniLM-L6-v2`)
  - Cloudflare Tunnel Client (`cloudflared`)
- **Local-First (Backend/Data)**: The database, backend engine, and workflows run locally on self-hosted hardware. No third-party cloud hosting is used for data storage or background processing.

## Data Retention & Storage Constraints

- **Metadata Only**: Storage is restricted to article metadata, summaries, tags, and scores. Original article bodies, images, and attachments are explicitly excluded.
- **Time-bound Retention**: Expired metadata is automatically purged after 90 days (configurable via `NEWS_RETENTION_DAYS`).

## Security & Configuration Constraints

- **Secrets Management**: Configuration parameters and API keys (e.g., `MINIMAX_API_KEY`, `DATABASE_URL`) must be injected securely via environment variables.

## Coding & Engineering Constraints

- **Python Execution**: All Python operations must utilize `uv` for package management and run context (`uv run <command>`). Do not use bare `python` or other package managers.
- **Test-Driven Development (TDD)**: Mandatory. All new features and modifications must lead with tests.
- **Modular Architecture**: Systems must be built with decoupled, independently testable modules possessing explicit inputs and outputs.
- **Comment Policy**: Code documentation must remain clear and concise, explaining intent over syntax, preserving historical comments unless explicitly told otherwise.

## Known Assumptions

- RSS feeds (Google Alerts RSS + government sites) serve as the primary and sufficient discovery sources at this stage, with the system designed modularly to support custom data sources (like Puppeteer scrapers) in the future.
- Metadata models contain specific fields for multi-dimensional grading (Importance, Chinese Relevance, Video, and Evergreen scores).

## Explicit Non-Goals

- Building a Content Management System (CMS) or publishing tools.
- Storing full web page crawls or caching original article resources.
- Real-time notification webhooks for every single incoming article (digests and triggers are scheduled/batched).
