# Acceptance Criteria: Yutian Immigration AI Newsroom (ImmiPulse)

This document establishes the user-facing and system-level Acceptance Criteria and the Definition of Done (DoD) for the **Yutian Immigration AI Newsroom**. All criteria are deterministic, testable, and non-ambiguous.

---

## 1. Feature Acceptance Criteria

### 1.1 Ingestion & Processing Pipeline
* **Feature Name**: Ingestion, Translation, and Grading (n8n & MiniMax M3)
* **Acceptance Conditions**:
  - The pipeline must automatically execute every 3–4 hours.
  - Successfully parses RSS XML feeds, extracting URL, publication date, title, and initial snippet.
  - Generates and stores translation data under three parallel database columns: `Original`, `English`, and `Chinese`.
  - Classifies news items with country, topic, and target audience tags.
  - Employs MiniMax M3 (via Anthropic API wrapper) to generate Chinese summaries (max 150 words), AI analysis paragraphs, recommended titles, and metric scores.
  - All calculated scores (Importance, Relevance, Video Suitability, Evergreen) must be integers between 0 and 100.
* **Definition of Done (DoD)**:
  - The pipeline runs to completion without timeout errors (via asynchronous batch processing).
  - Enriched data is successfully inserted into the PostgreSQL database.
  - Connection/API failures triggers automated retries (exponential backoff).

### 1.2 Multi-Level De-duplication
* **Feature Name**: Level 1 & Level 2 De-duplication
* **Acceptance Conditions**:
  - **Level 1**: Skips processing for incoming articles with exact matching URLs, Canonical URLs, or Title Hashes.
  - **Level 2**: Converts incoming headlines using a local HuggingFace embedding container (`sentence-transformers/all-MiniLM-L6-v2`) to a 384-dimensional vector.
  - Groups articles with a cosine distance threshold < 0.12 (similarity >= 88%) under a single duplicate group by assigning `parent_id` matching the primary news item.
  - Restricts de-duplication comparison to a rolling 7-day window.
  - De-duplicated child articles must not trigger external LLM enrichment calls.
* **Definition of Done (DoD)**:
  - Synthetic duplicate groups achieve 100% detection rate.
  - De-duplication groups contain correct `duplicate_count` matching child entries.

### 1.3 FastAPI Backend REST API
* **Feature Name**: FastAPI Backend API Service
* **Acceptance Conditions**:
  - Secures all routes using basic token validation (`Authorization: Bearer <DASHBOARD_API_TOKEN>`). Rejects missing/invalid tokens with `401 Unauthorized`.
  - Exposes `GET /api/news` supporting:
    - Pagination query filters (`page`, `limit`).
    - Sorting by scores or dates (`sort_by`, `sort_order`).
    - Text search matching Chinese/English fields (`search`).
    - Hiding low relevance items (`chinese_relevance_score < 60`) when `show_low_relevance` is false.
  - Exposes `GET /api/news/{id}` returning translations, summaries, scores, metadata, recommended titles, and duplicate source list.
  - Exposes candidates endpoints for starring, unstarring, and notes updates.
* **Definition of Done (DoD)**:
  - Backend API builds and runs successfully via Docker Compose.
  - Unit and integration contract tests achieve 100% pass rate.

### 1.4 Next.js Editorial Dashboard
* **Feature Name**: Next.js Curation Dashboard
* **Acceptance Conditions**:
  - Displays stories card grid showing country tag, recommended title, snippet summary, score badges (VS / CR), source, published time, and star icon.
  - Clicking a card opens the Detail Drawer sliding from the right on desktop, or sliding up as a bottom sheet on mobile.
  - The detail drawer permits switching language translation tabs (Chinese, English, Original) instantly.
  - Star toggle successfully updates candidate status in backend.
  - Inputting annotations in the drawer notes text area triggers auto-save on blur focus-out.
* **Definition of Done (DoD)**:
  - Frontend runs without Javascript errors.
  - Filter clicks adjust grid view in under 200ms.
  - Drawer transition runs under 100ms.

### 1.5 Saved Candidates Workspace
* **Feature Name**: Saved Candidates Page
* **Acceptance Conditions**:
  - Displays starred candidates list sorted by `video_score` (descending) by default.
  - On desktop, displays a split double-pane layout (left: list, right: outline editor).
  - Double pane outline editor shows recommended titles, AI demographic impact, and text box to write scripting notes.
  - Auto-saves outlines on blur with a visible checkmark validation pill.
  - Clicking "Copy Outline to Clipboard" copies structured markdown of the video topic, AI impact analysis, outline notes, and reference links.
  - Unstarring candidate displays undo banner toast. Clicking undo restores the candidate.
* **Definition of Done (DoD)**:
  - Outline text successfully copied to the OS clipboard container.
  - Empty states render correctly when candidates size is zero.

---

## 2. Non-Functional & Quality Acceptance Criteria

### 2.1 Performance & Scalability
- Client-side filtering queries and grid rendering must complete in under 200ms.
- Detail drawer open/close animations must complete in under 100ms.
- PostgreSQL database query latency must remain under 50ms for a dataset of 50,000 records.

### 2.2 Security & Isolation
- All background ports (8000, 5432, 5678) must be bound strictly to localhost (`127.0.0.1`) and not exposed directly on the host's public firewall.
- Edge communication is routed exclusively through an outbound Cloudflare Tunnel.
- API keys, credentials, and tokens must be loaded via secure environment variables.

### 2.3 Data Storage & Retention
- The system must store strictly metadata: no full-text HTML body parsing, scripts, or media files.
- Purge cron routine executes daily to delete records older than 90 days, excluding starred candidates or parents of starred candidates.

### 2.4 Visual Design & UX Compliance
- Light-mode-first Sunny Horizon theme: Sky Blue bases (`hsl(205, 85%, 45%)`), Sunrise Amber accents (`hsl(38, 95%, 52%)`), Warm Sand base background (`hsl(35, 20%, 98%)`), Pure White card surfaces, and Charcoal headings.
- Fonts: **Outfit** for headings, **Inter** for body text.
- Accessibility: Contrast ratio meets or exceeds WCAG AA compliance (> 4.5:1). Touch target size for filters, links, and buttons is at least 48px x 48px. Clear 2px solid primary blue outline on keyboard focus.

---

## 3. Global Definition of Done (DoD)

A development task, bug fix, or feature branch is declared **Done** only when:
1. **TDD Compliance**: Passing unit/integration tests are checked into the codebase.
2. **Schema Integrity**: Database migrations are generated, tested, and backward-compatible.
3. **Change Consistency**: Upstream documentation (if updated), README, and QA specifications are reviewed and aligned.
4. **Build Correctness**: Code compiles, builds, and runs cleanly within local Docker Compose boundaries.
5. **No Regression**: Verification suite executes successfully without regressions in performance or de-duplication rates.
