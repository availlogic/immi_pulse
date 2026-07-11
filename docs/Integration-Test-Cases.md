# Integration Test Cases: Yutian Immigration AI Newsroom (ImmiPulse)

This document specifies the integration-level test cases to verify systems boundaries, database integrity, API contract conformity, processing pipelines, and data retention cron jobs for **ImmiPulse**.

---

## 1. FastAPI Backend API & Auth Verification (IT-001)

### IT-001-TC-001: Token-Based Authentication Middleware
* **Objective**: Ensure the backend rejects unauthorized and invalid requests while accepting valid bearer tokens.
* **Setup**: Deploy FastAPI container with environment `DASHBOARD_API_TOKEN=secret_key`.
* **Execution**:
  1. Send `GET /api/news` with no `Authorization` header.
  2. Send `GET /api/news` with header `Authorization: Bearer wrong_token`.
  3. Send `GET /api/news` with header `Authorization: Bearer secret_key`.
* **Expected Result**:
  1. Request 1 returns `401 Unauthorized` with status payload.
  2. Request 2 returns `401 Unauthorized`.
  3. Request 3 returns `200 OK` with paginated payload envelope.
* **Traceability**: [API-Spec: Section 1](file:///Users/victorxu/projects/immi_pulse/docs/API_Spec.md#L7)

### IT-001-TC-002: Route Validation & 422 Errors
* **Objective**: Verify standard error payloads for missing or invalid parameters.
* **Setup**: FastAPI server is online.
* **Execution**:
  1. Send `GET /api/news?page=abc` (invalid page type).
  2. Send `PATCH /api/candidates/e5b8d963-c793-4b67-a84f-dc9407339d67/notes` with body `{"custom_title": "A".repeat(205)}` (exceeds 200 chars).
* **Expected Result**:
  1. Request 1 returns `422 Unprocessable Entity` listing validation failure details.
  2. Request 2 returns `422 Unprocessable Entity` with details: `"String length must not exceed 200 characters."`.
* **Traceability**: [API-Spec: Section 3.7](file:///Users/victorxu/projects/immi_pulse/docs/API_Spec.md#L302)

---

## 2. API ↔ Database Consistency & Aggregations (IT-002)

### IT-002-TC-001: Calculated Stars joining candidates table
* **Objective**: Verify that the API output returns correct `is_starred` values by performing joining logic on the database.
* **Setup**: 
  * News item A (`id: e5b8d963-c793-4b67-a84f-dc9407339d67`) exists in `news_items` database.
  * Candidates table is empty.
* **Execution**:
  1. Call `GET /api/news`. Check `is_starred` for News item A.
  2. Call `POST /api/candidates/e5b8d963-c793-4b67-a84f-dc9407339d67/star`.
  3. Call `GET /api/news` again. Check `is_starred` for News item A.
* **Expected Result**:
  * Step 1 returns `is_starred: false`.
  * Step 2 succeeds returning `201 Created` and inserts a candidate row linking to the news item.
  * Step 3 returns `is_starred: true` (verifies backend joining logic).
* **Traceability**: [Test-Strategy: Issue 5.3](file:///Users/victorxu/projects/immi_pulse/docs/Test-Strategy.md#L129), [API-Spec: Section 3.1](file:///Users/victorxu/projects/immi_pulse/docs/API_Spec.md#L87)

### IT-002-TC-002: Calculated duplicate_count aggregation on parent_id
* **Objective**: Verify that the backend aggregates similar duplicate feeds to calculate the duplicate count.
* **Setup**:
  * Insert primary news item A (`id: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`, `parent_id = NULL`).
  * Insert duplicate news item B (`parent_id = primary_id`).
  * Insert duplicate news item C (`parent_id = primary_id`).
* **Execution**:
  1. Call `GET /api/news`.
* **Expected Result**:
  * Response contains exactly 1 story card (primary news item A).
  * The `duplicate_count` field in the payload equals `2` (B and C).
* **Traceability**: [Test-Strategy: Issue 5.3](file:///Users/victorxu/projects/immi_pulse/docs/Test-Strategy.md#L129), [API-Spec: Section 3.1](file:///Users/victorxu/projects/immi_pulse/docs/API_Spec.md#L88)

---

## 3. Database Integrity & Index Validation (IT-003)

### IT-003-TC-001: SQL Constraints & Schema Setup
* **Objective**: Prevent database corruption by validating SQL check constraints.
* **Setup**: Database is initialized.
* **Execution**:
  1. Attempt to insert news item with `video_score` = 105.
  2. Attempt to insert news item with `chinese_relevance_score` = -10.
  3. Attempt to insert news item with duplicate `source_url`.
* **Expected Result**:
  * Insertion 1 fails with DB Check Constraint Error (`CHECK (video_score BETWEEN 0 AND 100)`).
  * Insertion 2 fails with DB Check Constraint Error (`CHECK (chinese_relevance_score BETWEEN 0 AND 100)`).
  * Insertion 3 fails with DB Unique Constraint Violation on `source_url`.
* **Traceability**: [Database: Section 3.1](file:///Users/victorxu/projects/immi_pulse/docs/Database.md#L98)

### IT-003-TC-002: Index Performance Checks
* **Objective**: Confirm database indexes exist and optimize querying.
* **Execution**:
  1. Run `EXPLAIN ANALYZE` on querying news feed:
     ```sql
     SELECT * FROM news_items WHERE parent_id IS NULL AND published_at > NOW() - INTERVAL '7 days';
     ```
  2. Run `EXPLAIN ANALYZE` on vector comparison search:
     ```sql
     SELECT id, title_zh FROM news_items ORDER BY title_vector <=> :input_vector LIMIT 1;
     ```
* **Expected Result**:
  * Query 1 utilizes the index `idx_news_items_parent_id`.
  * Query 2 utilizes the HNSW index `idx_news_items_title_vector` avoiding sequential tablescan.
* **Traceability**: [Database: Section 4](file:///Users/victorxu/projects/immi_pulse/docs/Database.md#L136)

---

## 4. Ingestion Pipeline & Container Services (IT-004)

### IT-004-TC-001: n8n ↔ Local TEI Embeddings Container
* **Objective**: Verify that the n8n pipeline can communicate with the local HuggingFace embedding container to generate semantic vectors.
* **Setup**: Local TEI container hosting sentence-transformers `all-MiniLM-L6-v2` is online.
* **Execution**:
  1. Trigger n8n logic: POST to TEI `/embed` with input `"日本高度人才新规则"`.
* **Expected Result**:
  * TEI returns status `200 OK`.
  * Response returns a JSON array containing a 384-dimensional vector embedding.
* **Traceability**: [Architecture: Section 2.5](file:///Users/victorxu/projects/immi_pulse/docs/Architecture.md#L79), [Constraints: Technology Constraints](file:///Users/victorxu/projects/immi_pulse/docs/Constraints.md#L9)

### IT-004-TC-002: Level 2 pgvector Semantic De-duplication Routing
* **Objective**: Verify that duplicate articles within 7 days are correctly linked and grouped.
* **Setup**:
  * News item A exists, published 2 days ago, title: *"Canada changes Express Entry points requirements"*. Vector embedding is generated and stored.
  * Ingest a new feed item B, title: *"Canada Adjusts Express Entry Point Benchmarks"* (highly similar semantic meaning).
* **Execution**:
  1. Trigger the de-duplication stage in the n8n pipeline.
  2. Query database for Item B.
* **Expected Result**:
  * Semantic vector comparison detects cosine distance < 0.12 (similarity > 88%).
  * Item B is inserted into `news_items` with its `parent_id` set to Item A's `id`.
  * Item B does not dispatch requests to the LLM API (skips enrichment costs).
* **Traceability**: [Architecture: Section 3.1 Sequence](file:///Users/victorxu/projects/immi_pulse/docs/Architecture.md#L92), [PRD: Section 13](file:///Users/victorxu/projects/immi_pulse/docs/PRD.md#L173)

### IT-004-TC-003: LLM Ingestion & API Wrapper
* **Objective**: Verify correct payload generation and translation matrix mapping.
* **Setup**: Configured LLM wrapper is active. n8n is processing a unique story in English.
* **Execution**:
  1. Dispatch the processing payload to the LLM API wrapper.
* **Expected Result**:
  * The response successfully populates the translation matrix: `title_zh` (Chinese translation), `summary_zh` (Chinese summary), and `ai_analysis` (impact evaluation).
  * Classification tags are generated correctly in structured arrays.
* **Traceability**: [PRD: FR-2.4](file:///Users/victorxu/projects/immi_pulse/docs/PRD.md#L119), [Architecture: Section 2.4](file:///Users/victorxu/projects/immi_pulse/docs/Architecture.md#L69)

---

## 5. Automated Data Purge Cron Job (IT-005)

### IT-005-TC-001: Data Retention Query Rules
* **Objective**: Verify that expired, unstarred metadata is deleted while preserving candidate references.
* **Setup**:
  * Ingest:
    * Card A: published 95 days ago, NOT starred.
    * Card B: published 95 days ago, starred as candidate (row in `candidates`).
    * Card C: published 95 days ago, NOT starred, but is the parent of Card D (which is starred).
    * Card E: published 20 days ago, NOT starred.
* **Execution**:
  1. Trigger the daily database retention query script.
  2. Query for remaining records.
* **Expected Result**:
  * Card A is successfully deleted.
  * Card B is preserved (because it is linked in the `candidates` table).
  * Card C is preserved (because its child duplicate Card D is in `candidates`).
  * Card E is preserved (because it is within the 90-day retention window).
* **Traceability**: [Database: Section 5](file:///Users/victorxu/projects/immi_pulse/docs/Database.md#L160), [PRD: Section 13 Retention](file:///Users/victorxu/projects/immi_pulse/docs/PRD.md#L174)
