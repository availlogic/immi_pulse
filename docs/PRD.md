# Product Requirements Document: Yutian Immigration AI Newsroom

## 1. Executive Summary

The **Yutian Immigration AI Newsroom** is an AI-powered personal editorial desk designed to optimize the daily curation and topic selection workflow for the YouTube channel *"雨田在海外"* (focusing on global immigration and overseas life for Chinese audiences). The system automates the ingestion, translation, de-duplication, and grading of global immigration news. By transforming raw news feeds into a structured, prioritized database, the system reduces the creator's daily curation time from 1–2 hours down to less than 10 minutes, ensuring a sustainable pipeline of high-value topics for weekly video creation.

---

## 2. Background

YouTube channel *"雨田在海外"* produces weekly video content analyzing immigration policy shifts, overseas living conditions, and visa pathways. Because a single creator cannot gather first-hand information globally, the channel relies on monitoring multiple online sources (government portals, law firm publications, mainstream media, and RSS feeds). 

In the 2025–2026 landscape, immigration policies across traditional Western destinations (US, Canada, UK, Australia) are tightening, prompting a shift in Mainland Chinese interest toward Asian destinations (Japan, Malaysia, Singapore) and selective European residency paths (Greece, Hungary). Keeping up with these global shifts requires monitoring dozens of sources across different languages daily, which presents a significant operational bottleneck.

---

## 3. Problem Statement

* **Topic Sustainability:** Maintaining a consistent, weekly schedule of high-quality video topics is difficult without dedicated news collection automation.
* **Information Overload:** The creator spends 1–2 hours daily manually checking various immigration portals, Google Alerts, and news feeds.
* **Low Signal-to-Noise Ratio:** Raw feeds contain high volumes of duplicate press releases, irrelevant localized news (e.g., domestic border enforcement), and announcements that do not interest Chinese audiences.

---

## 4. Product Vision Alignment

The Yutian Immigration AI Newsroom is not a general-purpose RSS reader or a public Content Management System (CMS). It is a private **AI Editorial Command Center** operating under the motto:
> *Don't build a news reader. Build an AI editorial desk that helps Chinese audiences understand global immigration.*

Every curated story and generated score is directly aligned with the interests of Chinese nationals seeking legal pathways for immigration, study, investment, or retirement.

---

## 5. Goals

* **Automated Curation Pipeline:** Continuously poll, translate, and enrich news stories from RSS feeds and official portals.
* **Time Efficiency:** Enable the creator to complete their daily news review and topic selection in under 10 minutes.
* **High-Precision De-duplication:** Automatically cluster duplicate or highly similar press releases and articles to ensure a clean feed (target: >90% de-duplication rate).
* **Multi-Dimensional Grading:** Leverage LLM intelligence to score articles on global importance, target audience relevance, video suitability, and long-term value (evergreen potential).
* **Editorial Board:** Provide an interactive dashboard that lists the top stories and allows the creator to save candidate topics to a weekly planning space.

---

## 6. Non-goals

* **Full-Text Archiving:** The system does not store full article bodies, original HTML pages, images, or media files to keep database storage lightweight and avoid copyright/fair-use concerns.
* **Direct Content Publishing:** The dashboard will not publish articles to WeChat, Xiaohongshu, YouTube, or other public platforms.
* **Real-time Push Notifications:** The system does not send real-time alerts for every ingested news item; all workflows are batched and scheduled.

---

## 7. Target Users

The primary user of the dashboard is the creator of the YouTube channel *"雨田在海外"*. 
The downstream audience consuming the resulting video content includes:
* Mainland Chinese residents looking for overseas residency options.
* Skilled professionals and international students seeking post-study work routes or permanent residency (PR).
* High-net-worth investors looking for asset protection and "Plan B" residency.
* Retirees planning relocation to low-cost-of-living destinations.
* Hong Kong talent scheme/identity holders moving assets or families.

---

## 8. Personas

### Persona 1: Yutian (The Creator)
* **Demographics:** 30s, YouTube content creator based overseas.
* **Goals:** Produce one high-impact immigration video weekly. Needs timely, accurate policy updates and engaging story angles.
* **Pain Points:** Spends hours reading raw news. Frustrated by reading the same syndicated AP/Reuters article multiple times. Struggles to judge whether a minor policy change is worth a dedicated video.
* **Usage Pattern:** Opens the dashboard every morning around 8:00 AM. Spends 5–10 minutes checking top-scored items. Saves 2–3 candidates for the week.

### Persona 2: Xiaoming (The Plan-B Seeker)
* **Demographics:** 32, software engineer in Beijing, married with one child.
* **Goals:** Relocate his family to a country with a good education system and clean environment. Highly interested in Japan's skilled worker visas and Canada's PR pathways.
* **Needs:** Practical, step-by-step policy guides and realistic cost analyses. Dislikes hype or rumors.
* **Relevance Context:** The AI scoring system must prioritize topics that address Xiaoming's questions (e.g., visa point requirements, child education, cost of living).

---

## 9. User Journeys

### Daily News Review Journey
1. **Morning Intake:** Yutian opens the Dashboard on his tablet or desktop.
2. **Top Stories Review:** The dashboard displays the "Top Stories" filtered by a combined score. Yutian sees a summary of a major policy change in Japan.
3. **Detail Reading:** Yutian clicks the story card. A detail drawer slides open from the right side of the screen without a full page refresh.
4. **AI Summary Analysis:** He reads the Chinese summary and the "AI Analysis" block, which highlights the specific impact on Chinese skilled workers.
5. **Original Source Check:** He clicks the link to open the official government document in a new tab to verify details.
6. **Save Candidate:** He clicks the Star icon (⭐ Candidate) to save it for his weekly production pool. The entire process takes 8 minutes.

### Weekly Planning Journey
1. **Topic Selection:** On Thursday, Yutian navigates to the "Saved Candidates" page.
2. **Reviewing Starred Pool:** He reviews the 5–6 items he starred throughout the week, looking at their "Video Scores" and "Suggested Titles" generated by the AI.
3. **Outline Drafting:** He opens the detail drawer for the selected topic and reviews the AI-generated outline, adding his own notes directly in the dashboard.
4. **Transition to Scripting:** He copies the aggregated sources and notes into his scripting environment, ready to write the weekly YouTube video.

---

## 10. User Stories

* **US-1 (Automated Ingestion):** As Yutian, I want the system to automatically collect articles from RSS feeds and government sites, so that I don't have to visit multiple websites every day.
* **US-2 (Automatic Translation):** As Yutian, I want non-Chinese articles (e.g., from Japanese or Spanish sources) translated into Chinese, so that I can understand the policy adjustments instantly.
* **US-3 (Language Consistency):** As Yutian, I want the system to maintain original, English, and Chinese versions of titles and summaries, so that I can verify official terminology.
* **US-4 (Semantic De-duplication):** As Yutian, I want duplicate news reports about the same event grouped together, so that I only see a single consolidated story card on my feed.
* **US-5 (Multi-Dimensional Scoring):** As Yutian, I want every story scored on Importance, Chinese Relevance, Video Suitability, and Evergreen value, so that I can filter out low-value alerts.
* **US-6 (Fast Filtering):** As Yutian, I want to filter news cards instantly by Country, Topic, and Target Audience, so that I can research specific video topics.
* **US-7 (Detail Drawer):** As Yutian, I want to read the full summary, AI analysis, and tags in a slide-out drawer without reloading the page, so that I can maintain my list scroll position.
* **US-8 (Candidate Management):** As Yutian, I want to save candidate stories and write personal notes on them, so that I have a structured repository for video drafting.

---

## 11. Functional Requirements

### 11.1 Data Ingestion & Storage (Backend/DB)
* **FR-1.1 (Multi-Source Support):** Support RSS ingestion from Google Alerts RSS feeds, official government portals (USCIS, IRCC, UK Home Office, Australian DHA, INZ), news agencies (Reuters, AP, BBC), and prominent immigration law firm blogs. At this stage (Phase 1), RSS feeds are the primary and sufficient data sources, with modularity to easily support other custom data sources later (e.g. scrapers, public API connectors).
* **FR-1.2 (Scheduled Runs):** Automatic workflow executions scheduled every 3–4 hours via self-hosted n8n. The workflow must utilize an **asynchronous webhook pattern** when invoking parallel batch LLM requests to prevent execution timeouts.
* **FR-1.3 (Storage Model):** A PostgreSQL database storing only metadata fields (no full-text bodies or media blobs).
* **FR-1.4 (Automated Purge):** Expired metadata must be deleted automatically after 90 days (configurable via `NEWS_RETENTION_DAYS`).

### 11.2 Processing Pipeline (n8n & MiniMax M3)
* **FR-2.1 (Language Detection):** Detect the original language of incoming articles.
* **FR-2.2 (Translation Matrix):** Generate and store titles and summaries in three parallel fields: `Original`, `English`, and `Chinese`.
* **FR-2.3 (De-duplication Engine):**
  * **Level 1 (Exact Match):** Compare URLs, Canonical URLs, and exact title hashes.
  * **Level 2 (Semantic Match):** Utilize `pgvector` for cosine similarity comparison on titles and summaries (threshold range: 0.88–0.92). Vector embeddings must be generated using a **free local HuggingFace embedding container** (e.g., running `all-MiniLM-L6-v2`) hosted on the self-hosted Ubuntu Server, avoiding external API costs. Group similar items under a single `duplicate_group` reference.
* **FR-2.4 (LLM Enrichment):** Use MiniMax M3 (via an Anthropic-compatible API wrapper) to generate:
  * Chinese and English summaries (max 150 words).
  * Country tags (e.g., `USA`, `Canada`, `Japan`, `Global`).
  * Topic tags (e.g., `Work Visa`, `PR`, `Citizenship`, `Golden Visa`).
  * Target audience tags (e.g., `Students`, `Skilled Workers`, `Investors`, `Retirees`).
  * Importance, Chinese Relevance, Video, and Evergreen scores (integers from 0 to 100).
  * Recommended YouTube video titles (Chinese) and thumbnail prompt suggestions.
  * AI analysis paragraph describing the impact on the target Chinese demographic.

### 11.3 Backend API (FastAPI)
* **FR-3.1 (REST API Endpoints):**
  * `GET /api/news`: List processed news items, supporting pagination, sorting (by published date, video score, relevance score), and text search.
  * `GET /api/news/{id}`: Retrieve detailed metadata for a single story.
  * `GET /api/filters`: Return active country, topic, and audience tags.
  * `GET /api/candidates`: Retrieve all starred video candidates.
  * `POST /api/candidates/{id}/star`: Add an item to the candidate pool.
  * `DELETE /api/candidates/{id}/unstar`: Remove an item from the candidate pool.
  * `PATCH /api/candidates/{id}/notes`: Update custom annotations/notes on a candidate.
* **FR-3.2 (Authentication):** Simple token-based or basic authorization to secure access to the dashboard APIs, since it is a single-user system.

### 11.4 Frontend Dashboard (Next.js)
* **FR-4.1 (Responsive Grid Layout):** A responsive page showcasing story cards. Each card displays the primary country, title (Chinese), video score badge, Chinese relevance badge, source name, and published date.
* **FR-4.2 (Quick Filters Sidebar/Header):** Interactive side filters allowing instant filtering by country, topic, and target audience.
* **FR-4.3 (Detail Drawer):** Slide-out drawer on card-click displaying:
  * Titles (Original, English, Chinese)
  * Summaries (Original, English, Chinese)
  * AI Analysis (Impact on Chinese migrants)
  * Multi-dimensional score bars
  * Suggested titles list
  * Link to the original source article
  * Section to read/write custom editor notes (saved to database).
* **FR-4.4 (Candidates Tab):** A dedicated board listing starred items sorted by `video_score` (descending), featuring edit fields for titles and production outline notes.

---

## 12. Non-functional Requirements

* **Performance:** Dashboard client-side filtering response must render under 200ms. Detail drawer transition must run smoothly under 100ms.
* **Scalability:** The database must comfortably handle up to 50,000 metadata records (average volume over 90 days) without query degradation.
* **Cost Efficiency:** Maintain low operating costs by using MiniMax M3. Target API expenditure under $10 per month.
* **Hosting Security:** Next.js frontend hosted on Cloudflare Pages. Communication back to self-hosted Ubuntu backend is routed exclusively through a Cloudflare Tunnel, eliminating exposed ports.
* **Availability:** Background workflows must run reliably, utilizing automated retries for LLM API and network flakiness.

---

## 13. Business & Processing Rules

* **Chinese Relevance Threshold:** News items with a `chinese_relevance_score` lower than 60 are shown in the main dashboard feed by default, but the user can explicitly uncheck the "Show Low Relevance" toggle to hide them.
* **Top Recommendation Criteria:** A story card is flagged as "High Recommendation" if its `video_score` is >= 70 and `chinese_relevance_score` is >= 70.
* **De-duplication Scope:** De-duplication must check articles within a rolling 7-day window. Items outside this window are considered distinct news cycles.
* **Data Retention Policy:** The PostgreSQL db runs an automated daily cron job to delete records where `published_at` is older than `NEWS_RETENTION_DAYS` (default: 90).

---

## 14. Assumptions

* **Feed Content Sufficiency:** The raw titles and descriptions provided in RSS feeds are sufficiently detailed for MiniMax M3 to perform precise language translation and metadata extraction.
* **MiniMax API Availability:** MiniMax M3 API will maintain an uptime of >99% and process inputs with latency under 5 seconds per request.
* **Ubuntu Server Stability:** The self-hosted server has a stable internet connection and sufficient resources (min 4GB RAM, 2 CPU cores) to host Docker Compose services.

---

## 15. Constraints

* **Platform Stack:** Deployment is limited to self-hosted n8n, PostgreSQL, FastAPI (Python), Next.js, and Cloudflare Tunnel.
* **Python Constraints:** Python services must be managed and executed using `uv` (`uv run <command>`).
* **Storage Constraints:** Metadata only. Absolutely no storage of original web bodies, HTML markups, page scripts, or media assets (images/videos).
* **Methodology:** All backend changes and FastAPI integrations must be developed following Test-Driven Development (TDD) principles.

---

## 16. Dependencies

* **Docker & Docker Compose:** Installed on the Ubuntu Server to manage n8n, FastAPI, PostgreSQL, and `cloudflared`.
* **MiniMax Developer Account:** Active API key loaded into the environment variables.
* **Cloudflare Account:** Active domain name configured for Pages and Cloudflare Tunnels.

---

## 17. Risks and Mitigations

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **MiniMax API Outages** | Medium | n8n workflows will place failed executions in a queue and attempt retries. A local mock mode will be available in FastAPI for local testing. |
| **De-duplication Over-grouping** | High | Calibrate the `pgvector` threshold. Require that grouped articles must match on both `country_tags` and `topic_tags` to prevent conflating unrelated news from different regions. |
| **Tunnel Disconnections** | Medium | Configure Docker container auto-restart policy for `cloudflared` to automatically re-establish connection after network drops. |
| **Google Alerts Rate Limits** | Low | Stagger RSS scraping intervals (e.g., every 4 hours) instead of hourly to minimize risk of IP blocks or rate limit limits. |

---

## 18. Acceptance Criteria

* **Automation Verification:** A new RSS item published online is successfully fetched, processed (translated, de-duplicated, and graded), and populated into the PostgreSQL DB within 4 hours.
* **De-duplication Check:** Syndicated news articles (identical content on different domains) are grouped under one story card with multiple source links.
* **Dashboard Filtering:** Toggling countries (e.g., `Japan`) instantly changes the visible cards grid.
* **Drawer Interaction:** Clicking any card opens the slide-out detail pane containing all fields (original, English, Chinese) and the LLM analysis without reloading the list.
* **Candidate Starring:** Starring a card successfully relocates/shows it on the Saved Candidates page and permits editing custom notes.

---

## 19. Success Metrics

* **Curation Time:** The daily morning editorial workflow takes less than 10 minutes to locate stories and structure the weekly video theme.
* **De-duplication Rate:** At least 90% of duplicate articles are correctly filtered and grouped.
* **Pipeline Output:** Sustains a healthy pool of at least 3 high-quality, high-scored video candidate stories by Thursday of every week.
* **Curation Overhead:** Manual collection overhead is reduced by at least 80%.

---

## 20. Scope

### Phase 1: Core Automation (MVP)
* Docker Compose setup (n8n, PostgreSQL, FastAPI, Cloudflare Tunnel).
* RSS parser workflow in n8n (Google Alerts + public agency feeds).
* MiniMax M3 translation, summarization, and grading engine integration.
* FastAPI backend exposing news query, search, and detail APIs.
* Basic Next.js feed viewer dashboard with country and topic filters.

### Phase 2: Refined Curation & Editing
* `pgvector` semantic de-duplication implementation.
* Starred Candidates management system (Saved page, personal annotations, editing).
* Advanced filters (Audience type, combined score threshold adjustments).

---

## 21. Future Scope

* **Automatic Script Outlines:** Auto-generating a structured video script layout (3-hook format) based on the AI analysis.
* **Dynamic News Digests:** Automated daily/weekly summary emails, WeChat notifications, or Telegram messages containing top-ranked topics.
* **Interactive Chat / RAG:** Adding a chat interface inside the dashboard allowing the creator to query the 90-day news database using natural language (e.g., *"What changed about Japan's skilled visa last month?"*).

---

## 22. Decisions & Resolved Questions

1. **MiniMax M3 Latency & Timeout Mitigation:** n8n workflows will utilize an asynchronous webhook pattern to handle batch parallel requests to the MiniMax M3 API, preventing execution timeouts.
2. **Feed Sufficiency & Google Alerts:** At this stage (Phase 1), RSS feeds (Google Alerts RSS and direct government feeds) are sufficient. Other data sources (such as custom Puppeteer scrapers) can be added modularly in future iterations. Feed checks will be scheduled every 3-4 hours to prevent rate limits.
3. **Local Embedding Service:** We will run a local, free HuggingFace embedding container (hosting `all-MiniLM-L6-v2`) on the Ubuntu server for de-duplication, avoiding API-based embedding costs.

---

## 23. Change Log

| Timestamp | Type | Summary | Sections |
| :--- | :--- | :--- | :--- |
| 2026-07-09T06:30:00Z | Add | Created initial Product Requirements Document (PRD) from Vision, Constraints, Research Report, and Idea. | All |
| 2026-07-09T06:46:00Z | Replace | Resolved open questions regarding MiniMax latency, feed sufficiency, and local embedding container choice. | Functional Requirements, Decisions, Constraints |
