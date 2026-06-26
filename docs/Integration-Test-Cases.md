# ImmiPulse - Integration Test Cases

## 1. Authentication Integration (INT-AUTH)

### INT-AUTH-01: Login Scheme and Token Integrity
- **Boundary**: Frontend Web ↔ API Gateway ↔ Database
- **Preconditions**: User credentials `test@example.com` / `Password123!` exist in PostgreSQL.
- **Trigger**: Client dispatches `POST /auth/login` request.
- **Validation Steps**:
  1. Verify the API Gateway issues a HTTP `200 OK` response.
  2. Parse the returned JSON; verify the JWT token is present in the `data.token` path.
  3. Decode the JWT header and verify the payload contains correct fields: `sub` (User ID matching the database record) and `role` (`basic`).
  4. Attempt to access a protected route (`GET /user/preferences`) without the token; verify HTTP `401 Unauthorized` is returned.
- **Priority**: Critical

---

## 2. Ingestion & Deduplication Pipeline (INT-ING)

### INT-ING-01: Global Deduplication & Discard Verification (TTL Boundary)
- **Boundary**: Ingestion Service ↔ PostgreSQL Database
- **Preconditions**:
  - Configurable TTL window is set to 30 days.
  - Database contains an article from Canada published on July 1st.
  - Target scraper fetches a duplicate Canada article on July 5th (within the 30-day window).
- **Trigger**: Ingestion service executes its cron job.
- **Validation Steps**:
  1. Verify the ingestion service calculates a cosine similarity of $\ge 0.88$ for the new item.
  2. Verify the 50% Difference check registers less than 50% commentary variation.
  3. Verify the duplicate article is discarded and **not stored** as a new row in PostgreSQL.
  4. Verify the `scraper_logs` table logs the operation with a status of `success` and increments the items processed count.
- **Priority**: Critical

### INT-ING-02: 50% Difference Principle Analysis Split
- **Boundary**: Ingestion Service ↔ Enrichment LLM ↔ PostgreSQL Database
- **Preconditions**:
  - Database contains an official press release regarding a points draw for Germany.
  - Scraper ingests a blog published by a law firm containing the same raw draw statistics, but adds over $50\%$ new text outlining legal relocation strategies.
- **Trigger**: Ingestion service executes its cron job.
- **Validation Steps**:
  1. Verify the cosine similarity is flagged as $\ge 0.88$ (related event).
  2. Verify the LLM or difference processor calculates the new text variance exceeds 50%.
  3. Verify the system saves the blog as a **new article** in the database with `is_analysis = True` and links it to the parent article using `parent_article_id`.
- **Priority**: High

### INT-ING-03: Strict Timestamping Enforcement
- **Boundary**: Ingestion Service ↔ Database
- **Preconditions**: Scraper parses a blog written on October 3rd detailing a policy change that was enacted on September 1st.
- **Trigger**: Ingestion service processes the parsed item.
- **Validation Steps**:
  1. Verify the normalizer parses the publication timestamp as October 3rd.
  2. Verify the item is written to PostgreSQL with `publication_date = '2026-10-03'`.
  3. Verify that index lookups and TTL cleanups evaluate the item based on the October 3rd date.
- **Priority**: High

---

## 3. Feed Generation & Constraints (INT-FEED)

### INT-FEED-01: Dynamic Preferences & Feed Diversity
- **Boundary**: Client ↔ API Gateway ↔ PostgreSQL
- **Preconditions**:
  - User has preferred jurisdictions: `US`, `CA`.
  - Database has 5 articles from the US, 5 from Canada, and 5 from Australia.
- **Trigger**: Client dispatches `GET /feed` with user's JWT token.
- **Validation Steps**:
  1. Verify the SQL query uses the preferred jurisdictions to filter the articles table.
  2. Verify the API Gateway runs the Diversity Algorithm on the returned query rows.
  3. Verify the final returned JSON contains a maximum of 10 items.
  4. Verify the JSON contains at most 2 items from the US and at most 2 from Canada, even though more matching items are present.
  5. Verify no articles from Australia are returned.
- **Priority**: Critical

---

## 4. Notifications & Alerts Broker (INT-NOTIF)

### INT-NOTIF-01: Real-time Premium Keyword Alert Dispatch
- **Boundary**: Database Insert Trigger ↔ Notification Broker ↔ Email Gateway
- **Preconditions**:
  - Premium User `user@example.com` has an active keyword alarm for Jurisdiction `United Kingdom` and Keyword `salary threshold`.
- **Trigger**: Ingestion service inserts a new, unique article with:
  - Title: "UK increases salary threshold for Skilled Worker Visas"
  - Origin Jurisdiction: "UK"
- **Validation Steps**:
  1. Verify the database insertion event triggers the notification broker alert sweep.
  2. Verify the broker identifies a match for user `user@example.com` on the keyword `salary threshold`.
  3. Verify the broker dispatches a request to the transactional Email Gateway API with the user's email, summary, and source link.
  4. Verify the email service returns HTTP `200 OK` (simulated in sandbox environment).
- **Priority**: High
