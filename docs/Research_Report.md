# Research Report: Yutian Immigration AI Newsroom

## Executive Summary

The **Yutian Immigration AI Newsroom** is an AI-powered personal editorial desk designed to optimize the daily curation workflow for the YouTube channel *"雨田在海外"* (focusing on global immigration and overseas life for Chinese audiences). Instead of spending 1–2 hours daily manually scouting multiple portals, the system automates content discovery, translation, de-duplication, and grading.

This Research Report compiles market dynamics, customer insights, technical feasibility, and strategic risks to validate the product's direction.

### Key Research Findings
1. **Strategic Shift in Immigration:** Traditional Western paths (US, Canada, UK, Australia) are tightening their policies in 2025–2026. Mainland Chinese interest is shifting toward Asian destinations (Japan, Malaysia MM2H, Singapore, Thailand) and selective European residency (Greece, Hungary).
2. **Technical Feasibility of LLM:** The configured Anthropic-compatible LLM offers standard APIs. Testing shows it natively supports system prompts, reasoning blocks, and high-quality Chinese/English translation, making it highly suitable as the core cognitive engine for scoring and summarizing news.
3. **De-duplication Architecture:** Simple URL and title comparisons fail for syndicated press releases (AP/Reuters). A hybrid approach combining metadata hashing (Level 1) with semantic cosine similarity using database-level vector indexing (Level 2, e.g., PostgreSQL `pgvector`) is necessary to meet the 90%+ de-duplication target.
4. **Data Retention & Fair Use Compliance:** Since the platform stores only metadata (titles, summaries, tags, and scores) and purges records after 90 days, it is highly compliant with copyright laws and operates on a lightweight storage footprint.

---

## Research Objectives

The objectives of this research are:
1. **Validate Concept:** Confirm if an automated desk can successfully highlight stories relevant specifically to Chinese audiences.
2. **Evaluate Technologies:** Assess the suitability of n8n, the LLM integration, FastAPI, PostgreSQL (pgvector), and Cloudflare Tunnel for a hybrid self-hosted stack.
3. **Analyze Market Trends:** Identify target audience interests to refine country and topic tag structures.
4. **Identify Risks:** Highlight technical, regulatory, and business risks and propose mitigation strategies before development begins.

---

## Key Assumptions

The following assumptions underly the project's design:
* **LLM Translation Quality:** The configured LLM can translate original articles (often in English, Spanish, Portuguese, or Japanese) to Chinese with enough precision to retain critical policy terms.
* **Scoring Alignment:** The LLM can accurately distinguish between global importance and relevance to the Chinese diaspora (e.g., a small change in the Hong Kong Top Talent scheme is of low global importance but of extremely high Chinese relevance).
* **Metadata Sufficiency:** A video creator does not need a full-text database; article summaries, source URLs, and key takeaways are sufficient to decide whether to research a topic deeper.
* **Google Alerts RSS Reliability:** Google Alerts RSS serves as a robust base aggregator, which can be supplemented by direct feeds from government portals.

---

## Market Analysis

### Content Creator Curation Workflow
YouTube creators in the immigration niche typically spend up to 15 hours a week collecting information. They check:
* Official immigration portals (USCIS, IRCC, UK Home Office).
* Foreign policy newsletters and mainstream media.
* Social media platforms (Xiaohongshu, WeChat channels) to observe user anxiety and questions.

Existing general feed readers (Feedly, Inoreader) only group feeds chronologically and lack semantic understanding of policy impact. There is a market gap for an **Editorial Command Center** that aggregates, filters, and prioritizes news based on creator-defined scoring formulas.

---

## Customer Segments

The primary consumer of the content generated is the Chinese-speaking audience interested in global immigration. We segment this audience as follows:

| Segment | Primary Interest | Key Destinations |
| :--- | :--- | :--- |
| **Middle-Class Families** | High-quality education, healthcare, clean environment | Japan, Canada, Greece, Malaysia |
| **Skilled Professionals** | Career opportunities, permanent residency (PR) | US, Canada, Australia, Singapore, Hong Kong |
| **Chinese Students** | Post-study work visas, path to PR | US, UK, Canada, Australia |
| **High-Net-Worth Investors** | Asset protection, Plan B residency | Singapore, Greece, Malta, UAE |
| **Retirees** | Low cost of living, high-quality retirement visas | Malaysia (MM2H), Thailand (LTR), Portugal |
| **Hong Kong Talent** | Moving assets/families, securing secondary passports | UK, Canada, Australia, Taiwan |

---

## User Pain Points

* **Policy Volatility:** Immigration rules change rapidly. Missing a policy shift (e.g., sudden closure of a visa program) degrades content timeliness.
* **High Curation Overhead:** Creators must read articles across different time zones, languages, and formats.
* **Information Clutter:** News agencies duplicate identical press releases, creating repetitive feeds.
* **Relevance Filtering:** Most global immigration news (e.g., domestic border enforcement or refugee policy) has zero relevance to middle-class Chinese migrants looking for legal visas.

---

## Competitor Analysis

| Solution | Strengths | Weaknesses | Relevance to "雨田在海外" |
| :--- | :--- | :--- | :--- |
| **Generic RSS Reader** (Feedly, Inoreader) | Stable, supports thousands of feeds, clean UI. | No automatic translation, no custom scoring, no duplicate grouping. | High manual sorting required. |
| **Immigration Agency Blogs** | Hand-curated, highly accurate. | Biased toward programs they sell; slow to report broad global news. | Secondary reference source only. |
| **Social Media Curators** (WeChat/Xiaohongshu) | Highly tuned to Chinese interests. | Fragmented, unstructured, prone to rumors/misinformation. | Good for identifying topics, bad for tracking policy changes. |

---

## Technology Landscape

### 1. Workflow Automation (n8n)
n8n is selected due to its node-based execution model and native integration with databases and HTTP clients. Self-hosting n8n via Docker avoids execution quotas common in cloud solutions (Zapier, Make).

### 2. Large Language Model (Anthropic-Compatible)
The selected LLM offers several unique advantages for this system:
* **API Compatibility:** Emulates the Anthropic Messages API, permitting direct integration using standard client libraries.
* **Bilingual Proficiency:** Exceptional performance in Chinese-English translation and semantic analysis.
* **Context Capacity:** 1M context window accommodates batch processing if required.
* **Cost Efficiency:** Significantly lower token cost compared to Claude 3.5 Sonnet or GPT-4o.

### 3. Database (PostgreSQL + pgvector)
PostgreSQL handles relational metadata. The addition of `pgvector` enables vector cosine similarity searches over embedded titles/summaries to detect semantic duplicates, supplementing simple URL and token overlap models.

### 4. Edge Frontend (Next.js + Cloudflare Tunnel)
Next.js provides a highly interactive user experience. Deploying to Cloudflare Pages places the frontend on a global CDN. Cloudflare Tunnel secures communications back to the self-hosted FastAPI server without opening firewall ports.

---

## Industry Trends

1. **The "Plan B" Sentiment:** Demand for secondary residencies remains strong among mainland Chinese.
2. **Rise of Cultural Proximity:** Due to rising costs in Europe and long backlogs in the US, Japan has become a primary target.
3. **Residency-First Programs:** High-net-worth individuals increasingly choose golden visas that do not require physical relocation, allowing them to remain in China.
4. **AI-Enabled Micro-Newsrooms:** Independent creators are adopting AI curation workflows to compete with traditional news media outlets.

---

## Regulatory Considerations

### 1. Copyright and Fair Use
* **Principle:** Storing full-text articles without permission risks copyright infringement.
* **Mitigation:** The system must only store metadata (URLs, headlines, AI-generated short summaries). It does not store original article bodies or media files. A link to the original article is always displayed.

### 2. Scraping and Web Crawling Policies
* **Principle:** Some portals actively block scrapers (e.g., Cloudflare protection, robots.txt directives).
* **Mitigation:** The primary feed sources are RSS aggregators (Google Alerts) and public API endpoints, which are designed for automated consumption.

### 3. Data Privacy
* **Principle:** Keeping personal identifying information (PII) incurs GDPR/CCPA overhead.
* **Mitigation:** The database holds public news articles only. No subscriber or user data is captured.

---

## Business Risks

| Risk | Description | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Low Relevance Accuracy** | LLM miscategorizes articles or grades low-value stories highly. | High | Establish detailed guidelines in the system prompt; incorporate clear criteria for Chinese relevance and video scoring. |
| **Topic Fragmentation** | Curation focuses too much on small details, missing large trends. | Medium | Generate weekly AI-summarized digests grouping small policy changes under global trends. |

---

## Technical Risks

| Risk | Description | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **LLM API Outages** | The translation or analysis workflow fails due to API downtime. | Medium | Store raw articles in a queue; retry execution; fall back to a mock or secondary LLM provider if offline. |
| **False Grouping in De-duplication** | Vector similarity groups two distinct articles (e.g., US visa limits and UK visa limits) together. | High | Calibrate the similarity threshold (e.g., set to 0.88–0.92); require that duplicate groups share the same country and topic tags. |
| **Self-Hosted Network Flakiness** | Ubuntu server loses connection, breaking the Cloudflare Tunnel. | Medium | Configure heartbeat monitoring; implement automatic system restarts for Docker services. |

---

## Market Risks

* **Algorithm Shifts:** Sudden changes in YouTube's recommendation system might prioritize short-form video (Shorts) over deep-dive weekly policy reviews, requiring the scoring system to adjust which topics get higher scores.
* **Platform Censorship:** High-sensitivity political topics regarding immigration can face restriction on mainland Chinese platforms (if crossposted), meaning the curation scoring system must flag high-sensitivity stories.

---

## Opportunity Assessment

By deploying Yutian Immigration AI Newsroom, the creator transitions from a reactive manual search process to a proactive editorial desk:
* **Workflow Savings:** Estimated reduction in review time from 90 minutes to under 10 minutes daily.
* **Competitive Edge:** The ability to instantly identify changes in niche destinations (like Malta, Greece, or Malaysia) that mainstream creators overlook.
* **Consistency:** Automatic tracking prevents missing critical draw deadlines or visa announcements.

---

## Recommended Opportunities

1. **Granular Multi-Dimensional Scoring:**
   * **Importance Score (0–100):** Global policy impact.
   * **Chinese Relevance (0–100):** Interest levels for Chinese nationals.
   * **Video Score (0–100):** Suitability for storytelling.
   * **Evergreen Score (0–100):** Value of content over 6+ months.
2. **Interactive Search and Filtering:** Implement a side drawer for deep reading without navigating away, allowing rapid scanning.
3. **Weekly Planning Board:** Include a "Save Candidate" feature that transitions a story from "News Feed" to a "YouTube Script Planning Board".

---

## Recommended Scope

### Phase 1: Core Automation (MVP)
* Set up self-hosted n8n and PostgreSQL.
* Implement RSS collection (Google Alerts + selected government feeds).
* Create the LLM translation, analysis, and scoring pipeline.
* Develop the FastAPI backend exposing filterable news endpoints.
* Build the basic Next.js dashboard displaying top stories with country/topic filters.

### Phase 2: Refined Curation & De-duplication
* Introduce pgvector-based semantic de-duplication.
* Implement a detailed planning board page for saved candidates.
* Add manual editing of tags and custom annotations.

---

## Decisions & Resolved Questions

1. **LLM Latency & Timeout Mitigation:** n8n workflows will utilize an asynchronous webhook pattern to handle batch parallel requests to the LLM API, preventing execution timeouts.
2. **Feeds Rate Limits & Google Alerts:** At this stage (Phase 1), RSS feeds (Google Alerts RSS and direct government feeds) are sufficient. Other data sources (such as custom Puppeteer scrapers) can be added modularly in future iterations. Feed checks will be scheduled every 3-4 hours to prevent rate limits.
3. **Local Embedding Service:** We will run a local, free HuggingFace embedding container (hosting `all-MiniLM-L6-v2`) on the Ubuntu server for de-duplication, avoiding API-based embedding costs.

---

## Research References

* **USCIS Newsroom:** [uscis.gov/newsroom](https://www.uscis.gov/newsroom)
* **IRCC News:** [canada.ca/en/immigration-refugees-citizenship/news](https://www.canada.ca/en/immigration-refugees-citizenship/news)
* **UK Home Office Media Blog:** [homeofficemedia.blog.gov.uk](https://homeofficemedia.blog.gov.uk)
* **LLM API Documentation:** Reference documentation for the selected LLM provider.
* **pgvector Repository:** [github.com/pgvector/pgvector](https://github.com/pgvector/pgvector)
