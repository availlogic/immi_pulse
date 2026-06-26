# ImmiPulse - Product Requirements Document (PRD)

## 1. Executive Summary
ImmiPulse is a vertical web application providing highly timely, multi-perspective, curated news updates in the global immigration and mobility sector. Instead of functioning as a database of static rules, ImmiPulse aggregates, tags, and semantic-deduplicates active policy updates, draws, and expert analyses across 22+ mainstream jurisdictions. Adhering to the core philosophy of "Less is More," ImmiPulse restricts the daily feed to a maximum of 10 high-quality, high-relevance items per user, ensuring each news item is accompanied by a direct link to the original official source. The platform features three user access tiers (Unregistered, Basic Free, and Premium Paid) and enforces a strict Diversity Principle to prevent any single jurisdiction from dominating the feed. This document specifies the functional, non-functional, and data-pipeline requirements for the General Availability (GA) release of ImmiPulse, built on a free open-source stack (Docker Compose, PostgreSQL, Cloudflare).

---

## 2. Background
Global immigration regulations and selection criteria change constantly. Prospective immigrants, digital nomads, and corporate mobility managers struggle to keep up with these shifts. A change in draw thresholds (e.g., Canada's Express Entry) or salary limits (e.g., UK Skilled Worker visa) can occur overnight. Currently, information is scattered across government portals, law firm publications, and unregulated online forums. The result is a highly fragmented and noisy ecosystem where users are repeatedly exposed to duplicate summaries or unverified rumors.

---

## 3. Problem Statement
Users seeking immigration updates face three key problems:
1. **Information Fragmentation**: Navigating dozens of government sites and corporate blogs to assemble a view of global options.
2. **Information Overload**: Constant repetition of the same factual announcements by different agencies and intermediaries.
3. **Trust Deficit**: Intermediaries publishing summaries without providing verifiable links to the original official sources or circulars.

---

## 4. Product Vision Alignment
The GA release of ImmiPulse delivers on the three core product vision principles:
- **Timeliness First**: Daily updates ensure policy modifications are captured and made searchable without delay.
- **Curated Delivery ("Less is More")**: Enforces a strict maximum of 10 core news items per user daily.
- **Transparency and Trust**: Every curated item must link back directly to its original source.

---

## 5. Goals
- Provide a unified, responsive dashboard for tracking policy changes across 22+ mainstream jurisdictions.
- Automate data ingestion across APIs, gazettes, and web-scraping targets.
- Implement a global semantic deduplication system with a configurable TTL to filter duplicates and discard them, preserving only unique content.
- Enable personalized user accounts with preference-based jurisdiction and category filtering across three user levels.
- Provide real-time high-priority alerts via email (Basic and Premium) and keyword-triggered notifications (Premium).
- Build the system using a cost-efficient, open-source stack leveraging Cloudflare and Docker-based microservices.

---

## 6. Non-goals
- Building a visa eligibility calculator or automated visa recommendation engine.
- Direct filing or application submission capabilities.
- Providing peer-to-peer social networking or public message boards.
- Providing direct legal or representation services.

---

## 7. Target Users
- **Skilled Professionals & Digital Nomads**: High-mobility individuals tracking points draws, income criteria, and visa pathways.
- **Corporate HR & Mobility Teams**: Corporate talent managers tracking compliance thresholds and visa processing times to plan global hiring.
- **Relocation Consultancies**: Professional agents using the platform to advise clients on global mobility routes.

---

## 8. Personas
### Persona A: Sarah, the Senior Software Engineer
- **Profile**: 32 years old, based in Brazil, seeking relocation to Canada or Germany.
- **Needs**: Timely updates on Canada Express Entry draws and the launch details of Germany's Opportunity Card.
- **Pain Point**: Spends hours reading repetitive Reddit posts and blog entries, trying to find actual draw cut-offs and official links.

### Persona B: David, Corporate Mobility Director
- **Profile**: Managing relocation for a mid-sized tech company with offices in the US, UK, and Singapore.
- **Needs**: Instant notification when salary thresholds change for sponsor licenses or employment passes.
- **Pain Point**: Must manually review law firm bulletins and check government portals to ensure the company remains compliant with hiring budgets.

---

## 9. User Journeys
### Journey 1: Registration and Preference Configuration
1. Sarah visits ImmiPulse and views the public feed (which defaults to a global selection of all news).
2. She clicks "Sign Up" and registers an account using email credentials.
3. Upon logging in, she is directed to the "Subscription Settings" page.
4. She selects `Canada` and `Germany` as her target jurisdictions, and tags `Education` and `Vacation` as her key features of interest.
5. She saves her settings. Her home dashboard now displays only news relevant to those choices, capped at 10 items per day.

### Journey 2: Keyword Alert Setup & Notification
1. David logs into his premium corporate account.
2. He navigates to the "Alarms" page and creates a new alert: Target Jurisdiction = `United Kingdom`, Keyword = `salary threshold`.
3. Two days later, the UK Home Office publishes a statement raising the Skilled Worker visa threshold.
4. The system ingests the policy, filters out duplicates, detects the keyword match, and immediately sends an email notification containing a brief summary and the official GOV.UK link to David.

---

## 10. User Stories
- **US-01**: As a registered Basic or Premium user, I want to select my target destination jurisdictions so that my dashboard and email alerts only show news relevant to my plans.
- **US-02**: As a user, I want every news summary to display a clickable link to the official source so that I can verify its accuracy.
- **US-03**: As a busy professional, I want my feed restricted to a maximum of 10 high-value items daily so that I do not experience information overload.
- **US-04**: As a premium subscriber, I want to set custom keyword alerts so that I receive an immediate email notification the instant a major policy matching my criteria is published.
- **US-05**: As a user, I want the system to enforce diversity in the feed so that no single jurisdiction dominates my daily updates.

---

## 11. Functional Requirements

### 11.1 Ingestion Service
- **Multi-Source Harvester**: Must query the U.S. Federal Register API, the New Zealand Gazette API, and run web-scraping/API ingestion tasks across 22+ mainstream jurisdictions: US, Canada, UK, Australia, New Zealand, Singapore, EU/EEA Countries (Germany, France, Spain, Portugal, Ireland, etc.), Japan, South Korea, Malaysia, Thailand, Philippines, Mexico, UAE, Turkey, Pacific and Caribbean Island Countries, Hong Kong, Macau, Taiwan, and Brazil.
- **Scheduler**: Automated cron-based execution, configurable and running once per day by default (supporting intervals as frequent as every 4 hours for high-frequency updates).
- **Raw Data Normalizer**: Convert diverse inputs into a standardized internal JSON schema enforcing UTF-8 encoding to support local language characters (e.g., Japanese, Korean) and standardizing localized date formats into ISO 8601 UTC format, containing:
  - Title
  - Raw HTML content
  - Publication timestamp (authoritative publication date/发布时间, not the date of target events or historical context)
  - Source URL
  - Origin Jurisdiction
  - Publisher Authority Rating (e.g., 5 for Government, 3 for Top Law Firm).

### 11.2 Semantic Deduplication Engine
- **Vector Embeddings Generation**: Convert incoming article text into 3072-dimensional vector representations using configurable embedding models (e.g., local/remote open-source embedding models or the OpenAI `text-embedding-3-large` model).
- **Global Deduplication Check**: Query the database to compare incoming news against all global entries stored within a configurable TTL window (typically 1 to 2 months).
- **50% Difference Principle Execution**:
  - If similarity is $< 0.88$, mark as a **New Event** and store in the database.
  - If similarity is $\ge 0.88$, compare the commentary/analysis depth:
    - If unique commentary is $> 50\%$ of the total text length, publish it as an **Analysis Article** linked to the parent event.
    - If unique commentary is $\le 50\%$, **discard the duplicate incoming item** entirely to keep the database and feeds clean.
- **TTL Expiration**: Automatically delete entries once they reach their configured TTL (1 to 2 months).

### 11.3 Classification & Tagging System
- **Automated Tagging**: Apply zero-shot LLM classification to assign:
  - **Jurisdiction Tags**: Multi-select matching the 22+ jurisdictions.
  - **Feature Tags**: `Raising a Family`, `Education`, `Retirement`, `Vacation`, `Culture Inclusion`, `Corporate Sponsorship`.
- **Admin Verification Queue**: Route borderline classifications (classifier confidence score $< 0.85$) to an internal admin queue for manual approval.

### 11.4 User Preference & Account Management
- **User Tiers**:
  1. **Unregistered User**: No sign-up required. Can only view the global dashboard feed (no jurisdiction or category filters allowed) containing the 10 latest articles.
  2. **Basic Registered User (Free)**: Authenticates via email/password. Can configure destination jurisdictions and feature tags, and opt-in to receive automated daily or weekly email digests matching their preferences.
  3. **Premium Registered User (Paid)**: Authenticates via email/password. Receives all Basic features, plus the ability to configure custom keyword notifications delivered via instant email alerts.
- **Preferences Settings**: Dashboard settings panel to toggle selections from the 22+ target jurisdictions and 6 feature tags (applicable only to Basic and Premium accounts).

### 11.5 Delivery & Notification Service
- **Personalized Feed Generation**: Dynamically construct the dashboard feed based on preferences, limiting the returned array to a maximum of 10 items.
- **Diversity Algorithm**: In any generated feed or push newsletter, **no single jurisdiction may have more than 2 items** in the final 10-item list, ensuring content diversity.
- **Email Digest Broker**: Cron-triggered service compiling the top 10 personalized, diversity-filtered news items into daily or weekly emails for Basic and Premium users.
- **Premium Keyword Alerts Broker**: Scan incoming non-duplicate articles for Premium users' keywords. Dispatch real-time email alerts immediately upon matching.

---

## 12. Non-functional Requirements

### 12.1 Performance & Latency
- **Deduplication Latency**: The ingestion-to-publish processing pipeline (scraping, embedding, similarity verification, tagging) must complete in $\le 60$ seconds per article.
- **Page Load Time**: The dashboard web UI must load and render in under 1.5 seconds on mobile 4G networks.
- **Query Latency**: Search and dashboard retrieval operations must execute in $\le 200$ milliseconds.

### 12.2 Scalability
- **Concurrently Active Users**: Support up to 100,000 daily active users (DAUs) without degradation.
- **Vector Storage**: Scalable to index up to 500,000 historical article vectors.

### 12.3 Reliability & Monitoring
- **Availability**: Maintain $99.9\%$ service uptime for the web dashboard and notification broker.
- **Scraper Health**: Implement automated Slack/email alerts if any scraper fails to retrieve updates for two consecutive runs (8 hours).

### 12.4 Security & Privacy
- **Compliance**: Adhere to GDPR and CCPA standards (encryption of user credentials and phone numbers, data deletion requests, cookie consent).
- **Network Security**: Enforce HTTPS for all web traffic and secure authentication protocols for API routes.

### 12.5 Usability
- **Design System**: A bright, vivid, and attractive light-mode theme using high-contrast typography (Inter/Outfit fonts) for legibility.
- **Responsive Adaptability**: Adaptive layout transitions matching viewport breakpoints for mobile (under 768px) and desktop (over 1200px).

---

## 13. Business Rules
- **Rule 1**: Any feed or newsletter delivered to a user must be restricted to a maximum of 10 news items.
- **Rule 2**: No article summary may be displayed without a validated, active HTTP link to the original official source document.
- **Rule 3**: Global Deduplication: If an incoming article is identified as a duplicate of an existing article within the database TTL window (1-2 months), it must be discarded immediately.
- **Rule 4**: Diversity Rule: A single jurisdiction may contribute at most 2 items to any 10-item feed or newsletter list.
- **Rule 5**: Account Levels and Access:
  - Unregistered: View global feed (unfilterable) on web only.
  - Basic (Free): View filtered feed, subscribe to daily/weekly email digests.
  - Premium (Paid): View filtered feed, subscribe to digests, and receive real-time email keyword alerts.

---

## 14. Assumptions
- Government portals and legal news sites will remain publicly accessible, supported by custom scraper logic, polite crawling patterns, or API access.
- Configured embedding APIs and service providers maintain high availability.
- Users have access to modern web browsers supporting CSS Grid/Flexbox and standard JavaScript.

---

## 15. Constraints
- **Resource Constraints**: Deduplication and LLM processing must run within a budget.
- **Data Constraints**: The app does not store or process visa application documentation or user passport details.
- **Architecture Constraints**: Use PostgreSQL as the primary database, running in Docker Compose with other backend services. Frontend is hosted on Cloudflare (with Cloudflare Tunnel).

---

## 16. Dependencies
- **Embedding and Classification API**: OpenAI API (for 3072-dimension document embeddings and zero-shot classification) or configurable local/remote open-source alternatives.
- **PostgreSQL Database**: Running inside Docker Compose.
- **Cloudflare & Cloudflare Tunnel**: For secure and cost-effective frontend hosting and routing.
- **Email Service Gateway**: SMTP or transactional email API (e.g., SendGrid, Mailgun) for dispatching digests and keyword alerts.

---

## 17. Risks
- **Scraper Fragility**: Changes in target site HTML structures can break ingestion pipelines.
  - *Mitigation*: Daily automated tests running against scraper endpoints and immediate developer fallback notifications.
- **Misclassification**: Filtering out a critical policy update due to high semantic similarity to an unrelated event.
  - *Mitigation*: Fallback matching checks against specific key variables (dates, scores) and manual verification for high-impact draw scores.

---

## 18. Acceptance Criteria
- **AC-01**: Ingesting a duplicate article within the 1-2 month TTL window results in the duplicate item being discarded.
- **AC-02**: Ingesting an official draw score update followed by a law firm analysis containing $>50\%$ new commentary results in two separate database items.
- **AC-03**: A Basic or Premium user changing preferences immediately updates their personal feed, while an Unregistered user has no filter options and sees the global feed.
- **AC-04**: Any feed or digest generated has a maximum of 10 items, and no single jurisdiction has more than 2 items in that list.
- **AC-05**: If an ingested news item matches a Premium user's custom keyword, an email alert is sent to them immediately.

---

## 19. Success Metrics
- **Feed CTR to Original Sources**: The ratio of users clicking the official source links (verifying our transparency metric).
- **Deduplication Rate**: Percentage of scraped duplicate feed items successfully discarded (target $>60\%$).
- **Alert Latency**: Average time between official policy publication and email alert dispatch (target $\le 30$ minutes).

---

## 20. Scope
- Fully automated ingestion pipelines for 22+ jurisdictions (US, CA, UK, AU, NZ, SG, DE, ES, IE, JP, KR, MY, TH, PH, MX, AE, TR, Pacific/Caribbean Islands, HK, MO, TW, BR).
- Configurable global semantic deduplication with 1-2 month TTL (duplicate discarding) and strict publication date timestamping.
- Web interface with a bright, vivid, and attractive light-mode design, hosted on Cloudflare (with Cloudflare Tunnel).
- Backend microservices running in Docker Compose with PostgreSQL.
- Three user access levels: Unregistered, Basic (Free with daily/weekly email digests), and Premium (Paid with digests and real-time email keyword alerts).
- Diversity enforcement algorithm (max 2 items per jurisdiction per feed).
- Admin dashboard for scraping health monitoring.

---

## 21. Future Scope
- Automated translation engines for non-English source gazettes (e.g., German, Spanish, Japanese, Korean) into English.
- Integrated AI assistant for answering specific user profile queries based on the accumulated policy database.
- B2B API access for relocation agency portals.

---

## 22. Open Questions
- How can we design our custom scraper architecture to ensure maximum resilience against target website changes and layout modifications?

---

## 23. Change Log

| Timestamp | Type | Summary | Sections |
| :--- | :--- | :--- | :--- |
| 2026-06-25T19:50:00Z | Add | Initial creation of the Product Requirements Document (PRD) for ImmiPulse GA release. | All |
| 2026-06-26T05:15:00Z | Replace | Updated country lists, user tiers, global deduplication rules, timestamps, diversity constraints, and tech stack based on updated product directions. | 1, 5, 9, 10, 11.1, 11.2, 11.4, 11.5, 13, 15, 16, 18, 19, 20 |
| 2026-06-26T06:00:00Z | Replace | Revised PRD based on user feedback: updated country to jurisdiction terminology, removed Language feature tag, changed theme to bright light-mode, removed proxy dependencies (self-built scrapers), set ingestion daily by default (configurable), and made embedding models configurable. | All |
| 2026-06-26T06:20:00Z | Replace | Implemented QA issue resolutions: added scheduler support down to 4-hour windows and specified UTF-8 / UTC normalizer support for non-English jurisdictions. | 11.1 |
