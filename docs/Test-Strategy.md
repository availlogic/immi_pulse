# Test Strategy: Yutian Immigration AI Newsroom (ImmiPulse)

This document establishes the comprehensive QA strategy, testing scope, methodologies, automation guidelines, quality gates, and issue logs to guide development and testing for the **Yutian Immigration AI Newsroom**.

---

## 1. Test Levels & Scope

To ensure system reliability, the testing suite is structured across four distinct levels:

### 1.1 Unit Testing (Scope Only)
* **Target Area**: Independent logic components within the FastAPI backend (e.g., scoring formulas, custom tag extraction logic, text parsing, security headers, metadata formatting).
* **Scope**:
  * Validation rules for incoming news fields.
  * Correct parsing of request payloads.
  * Basic token authorization middleware logic.
  * Score calculators (mapping integers to bounds).
* **Constraints**: Strictly logical, zero external database calls or live HTTP fetches (mocked databases and services).

### 1.2 Integration Testing
* **Target Area**: Interaction boundaries between system components.
* **Scope**:
  * **FastAPI ↔ PostgreSQL + pgvector**: Verifying query parameter mappings (filtering by countries, topics, audiences), full-text search index usage, pagination bounds, score sorting, candidate stars persistence, and note saves.
  * **n8n Workflow ↔ Local TEI Container**: Verifying correct vectorization of titles via local `all-MiniLM-L6-v2` `/embed` API.
  * **n8n Workflow ↔ PostgreSQL**: Verifying Level 1 de-duplication (URL/title hash checks), Level 2 pgvector similarity querying (cosine distance checks), and insertion of fully enriched metadata.
  * **n8n Workflow ↔ MiniMax M3**: Verifying LLM parsing correctness, translations format, tags formatting, and retry logic on connection failures.
  * **Data Retention Purge Daily Cron**: Verifying that entries older than 90 days are deleted unless starred in the candidates table or parents of a starred duplicate.

### 1.3 System Testing
* **Target Area**: End-to-end backend API verification and Next.js frontend state rendering in isolation.
* **Scope**:
  * FastAPI server startup, route registrations, basic authentication middleware (`Authorization: Bearer <DASHBOARD_API_TOKEN>`), and correct HTTP error status codes (`401`, `404`, `422`).
  * Next.js state representation: verifying skeleton layouts during loading, empty states, system error toasts, and detail drawer loading.

### 1.4 End-to-End (E2E) Testing
* **Target Area**: User-driven flows through the entire system boundary (Frontend UI to Backend Database).
* **Scope**:
  * **Daily News Review Journey**: Card feed rendering, filter application, card click opening drawer, language tab switching, star toggling, and note editing.
  * **Weekly Planning Journey**: Saved candidates listing, selecting candidates, drafting outline notes, auto-saving indicators, copying text to clipboard, and removal/undo operations.

---

## 2. Coverage Model & Risk-Based Prioritization

Testing focus is prioritized based on business impact and frequency of use:

### 2.1 Risk-Based Prioritization Matrix

| Feature / Scenario | Critical Path | Risk Level | Target Coverage | Prioritization Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication & CF Tunnel** | Yes | High | 100% | Critical security gate. All endpoint tests must run with and without token verification. |
| **Level 1 & 2 De-duplication** | Yes | High | 100% | Prevents newsroom clutter (success metric: >90% de-duplication rate). Tested using synthetic duplicate sets. |
| **MiniMax M3 Translation/Grading** | Yes | Medium | 95% | Core analysis output. Verify output formats, score boundaries, and retry resilience. |
| **Candidates Annotations & Auto-save** | Yes | Medium | 100% | Human-in-the-loop editing must be loss-prevented. Verify blur auto-saves and validation bounds. |
| **Daily Data Retention Purge** | No | Medium | 90% | Keeps database lightweight. Verify daily database cleanup scripts. |
| **Feed Filtering & Text Search** | Yes | Low | 95% | Instant feed rendering (<200ms) and tags metadata correctness. |
| **Clipboard outline export** | No | Low | 100% | Core exit workflow. Verifies markdown structure correctness. |

### 2.2 Feature-to-PRD Traceability Mapping

| PRD Section | Target Feature | Primary Verification Artifact |
| :--- | :--- | :--- |
| **FR-1.1, FR-1.2** | Automated ingestion & scheduled n8n workflow | [Integration-Test-Cases.md](file:///Users/victorxu/projects/immi_pulse/docs/Integration-Test-Cases.md#IT-004) |
| **FR-2.1, FR-2.2** | Language detection & translation matrix | [Integration-Test-Cases.md](file:///Users/victorxu/projects/immi_pulse/docs/Integration-Test-Cases.md#IT-005) |
| **FR-2.3** | Level 1 & Level 2 Semantic De-duplication | [Integration-Test-Cases.md](file:///Users/victorxu/projects/immi_pulse/docs/Integration-Test-Cases.md#IT-006) |
| **FR-2.4** | LLM enrichment & scoring via MiniMax M3 | [Integration-Test-Cases.md](file:///Users/victorxu/projects/immi_pulse/docs/Integration-Test-Cases.md#IT-007) |
| **FR-3.1, FR-3.2** | FastAPI REST Endpoints & Authentication | [Integration-Test-Cases.md](file:///Users/victorxu/projects/immi_pulse/docs/Integration-Test-Cases.md#IT-001) |
| **FR-4.1 - FR-4.3** | Next.js grid, sidebar filters, detail drawer | [Functional-Test-Cases.md](file:///Users/victorxu/projects/immi_pulse/docs/Functional-Test-Cases.md#FT-001) |
| **FR-4.4** | Saved Candidates Planning board & outlines | [Functional-Test-Cases.md](file:///Users/victorxu/projects/immi_pulse/docs/Functional-Test-Cases.md#FT-004) |
| **US-7, US-8** | Drawer notes edit & Candidates Outline editing | [E2E-Test-Scenarios.md](file:///Users/victorxu/projects/immi_pulse/docs/E2E-Test-Scenarios.md#E2E-001) |

---

## 3. Automation Strategy

```
┌────────────────────────────────────────────────────────┐
│                   Manual Testing                       │
│    - Visual UI verification (Layout, Colors, Font)     │
│    - Clipboard write permission approvals              │
│    - System setup checks (Docker launch, CF Tunnel)     │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│                 Automated Testing                      │
│    - Unit tests for Backend Logic                      │
│    - Integration contract verification                 │
│    - API security and parameter validation tests       │
│    - Database state mutations & retention checks       │
└────────────────────────────────────────────────────────┘
```

### 3.1 Automated Testing Scope
- **Backend API Routes**: Implemented using `pytest` and `httpx` testing clients. Runs automatically during development and CI.
- **Database Schemas & Indices**: Validated using test migration scripts and indexing verification queries.
- **n8n Workflow Execution**: Triggered using sandbox mocks of external RSS feeds, asserting correct mock vector matches and API payloads.

### 3.2 Manual Testing Scope
- **Visual styling compliance**: Sunny Horizon palette contrast, font selections (Outfit, Inter), line-height rendering, responsive viewport collapses.
- **Device interactions**: Mobile bottom navigation bar height (56px), drawer touch targets (48x48px), and keyboard layouts on tablets.
- **Clipboard copying validation**: Operating system permission prompts when clicking "Copy Outline to Clipboard".

### 3.3 TDD Alignment Guidance for Coding Agents
Downstream coding agents must adhere to the following Test-Driven Development flow:
1. Identify the target backend endpoint or logic being implemented.
2. Write a failing test in the test suite (e.g. under `backend/tests/`).
3. Run the failing test using `uv run pytest`.
4. Implement the minimum logic required to pass the test.
5. Verify tests are passing and refactor code safely.
6. Commit changes with a clean message mapping to the feature requirements.

---

## 4. Quality Gates & Release Readiness

To transition between phases and approve deployment, the system must satisfy these quality gates:

### 4.1 Development Quality Gates
- **Entry Criteria**: Upstream design docs (PRD, Architecture, Database, APIs) are approved and frozen.
- **Exit Criteria**:
  - 100% of unit and integration tests pass successfully on the backend.
  - All linting checks pass without errors.
  - No secrets (API keys, database passwords) are detected in codebase commits.

### 4.2 Release Readiness Gate (Definition of Done)
1. **Functional Correctness**: All functional test cases passed; de-duplication groupings function under a rolling 7-day window.
2. **Performance SLA**: client-side filtering response runs under 200ms; drawer transition runs under 100ms.
3. **Traceability Validation**: Every functional requirement corresponds to a passing verification script.
4. **Offline Resilience**: Backend restarts do not destroy cached UI states, and Cloudflare Tunnel re-establishes connectivity automatically.
5. **No Data Loss**: Custom candidate notes survive database pruning routines.

---

## 5. Upstream Issue Log (Resolved)

The following discrepancies found in upstream documents were flagged and resolved during the planning phase:

### Issue 5.1: Detected Language vs Database Schema
* **Severity**: LOW
* **Description**: `API_Spec.md` returns `languages.detected`, but `Database.md` only stores `original_language`.
* **Resolution**: Test cases assume the API dynamically maps `original_language` to `languages.detected` in responses, requiring no new database columns.

### Issue 5.2: Notes Character Limit Mismatch
* **Severity**: MEDIUM
* **Description**: `Screen-Specs.md` defines notes area limit as 4000 characters, whereas `User-Flows.md` specifies 2000 characters.
* **Resolution**: Standardized on a limit of **4000 characters** in test cases and database constraints to provide maximum outlining flexibility.

### Issue 5.3: Implicit Calculated Fields
* **Severity**: MEDIUM
* **Description**: `API_Spec.md` requires `is_starred` and `duplicate_count` fields in `GET /api/news` responses, but they are not stored in the `news_items` database table.
* **Resolution**: Backend test scripts will verify that the FastAPI server computes `is_starred` via a `LEFT JOIN candidates` query and `duplicate_count` via count grouping on `parent_id`.

### Issue 5.4: Asynchronous Webhook Timeout Pattern
* **Severity**: MEDIUM
* **Description**: `PRD.md` calls for an async webhook pattern in n8n for LLM batches, but no FastAPI webhook is defined in `API_Spec.md`.
* **Resolution**: The workflow will utilize standard n8n webhooks for callback, and write final enriched results directly to the self-hosted PostgreSQL database. We will verify the database state directly.
