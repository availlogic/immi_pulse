# ImmiPulse — Documentation Conflict Report

This report catalogues conflicts, ambiguities, and gaps in the `docs/`
directory discovered during implementation. Per the SSOT rule, the
implementation followed the **PRD** as the authoritative source for product
behaviour, the **Architecture** document for system structure, the
**Database** document for schema, and the **API_Spec** for HTTP contracts.
The **Research_Report** was treated as supplementary context only.

---

## C-1 — Scraper failure alerting window

| | |
|---|---|
| **Conflict** | PRD §12.3 says "two consecutive runs (8 hours)" while Architecture §6 says "48 hours" |
| **Resolution** | **Resolved — PRD §12.3 (8h / 2 runs)** — chosen per user approval during planning. Implemented in `backend/src/notifications/broker.ts::checkScraperFailures()` and `backend/src/routes/admin.ts`. The 8h window is enforced as the hard rule; the configurable `SCRAPER_FAILURE_WINDOW_HOURS` env var (default 8) is provided for operational tuning without relaxing the PRD-stated threshold. |
| **Affected areas** | `SCRAPER_FAILURE_WINDOW_HOURS` env var, broker alert logic, admin health endpoint. |
| **Recommended human review** | Update `docs/Architecture.md §6` to align with the PRD, or formalize the difference as a configurable parameter. |

---

## C-2 — Feature tags: 6 vs. 7

| | |
|---|---|
| **Conflict** | `PRD.md §11.3`, `Architecture.md §3.2`, `Screen-Specs.md §2.2`, and the PRD change log entry 2026-06-26T06:00:00Z ("removed Language feature tag") list **6 tags**: `Raising a Family`, `Education`, `Retirement`, `Vacation`, `Culture Inclusion`, `Corporate Sponsorship`. `Research_Report.md §1` lists **7 tags** including `Language`. |
| **Resolution** | **6 tags per PRD** (more recent change log explicitly removed `Language`). Implemented in `backend/src/config.ts::FEATURE_TAGS`, `frontend/src/api/jurisdictions.ts::FEATURE_TAGS`, and the Settings/Alerts UI. The frontend E2E test `e2e_02_signup.spec.ts` asserts `Language` is NOT present. |
| **Affected areas** | Tag validation in `PUT /user/preferences`, settings UI checkboxes, classification prompts, alert keyword syntax. |
| **Recommended human review** | Update `docs/Research_Report.md §1` to remove the obsolete `Language` reference, OR formally decide whether `Language` should be re-added. |

---

## C-3 — Jurisdiction field inconsistency (code vs. full name)

| | |
|---|---|
| **Conflict** | `Database.md §2.4` defines `articles.origin_jurisdiction` with example values like `'US'`, `'CA'`, `'DE'` (canonical codes). `Database.md §2.3` defines `user_alerts.target_jurisdiction` with example `"United Kingdom"` (full name). The `API_Spec.md` echoes both: §4.1 `origin_jurisdiction: "CA"` vs. §5.1 `target_jurisdiction: "United Kingdom"`. There is no canonical jurisdiction table in the docs to translate between them. |
| **Resolution** | Implemented a canonical `jurisdictions` lookup table (added in `db/migrations/002_tables.sql` and `004_seed_canonical.sql`) with `(code, name, region)` columns. The table is seeded with the 24 jurisdictions per PRD §20. Alerts store the full name (per docs) and resolve to the code via JOIN. Articles store the code. The `target_jurisdiction` field on alerts is the *name* as documented. |
| **Affected areas** | Alert creation (frontend + backend), alert dispatch matching, scraper jurisdiction resolution. |
| **Recommended human review** | Consider whether `user_alerts.target_jurisdiction` should also be a code. The current code/name split is preserved per the docs but is mildly inconvenient for cross-table joins. |

---

## C-4 — HNSW index for 3072-dim vector

| | |
|---|---|
| **Conflict** | `Database.md §3.2` requires `CREATE INDEX articles_embedding_hnsw_idx ON articles USING hnsw (embedding vector_cosine_ops)`. pgvector 0.8.0 caps HNSW at 2000 dimensions for the `vector` type. |
| **Resolution** | **Resolved in Stage 5.4.** Migration `006_stage4_halfvec_hnsw.sql` migrates the `articles.embedding` column from `vector(3072)` to `halfvec(3072)` (half-precision) and creates the HNSW index with `halfvec_cosine_ops`. HALFVEC supports HNSW up to 4000 dimensions, so the spec's 3072-dim requirement is satisfied. The insertion path (`backend/src/routes/feed.ts::/admin/ingest` and `ingestion/src/db.py::insert_article`) is updated to pass the 3072-dim vector; pgvector auto-casts to HALFVEC. |
| **Affected areas** | None — the index now exists and is used by the planner (verified via `EXPLAIN` in `tests/integration/test_halfvec_hnsw.py`). |
| **Recommended human review** | Update `docs/Database.md §3.2` to reflect the halfvec(3072) column type and the halfvec_cosine_ops operator. |

---

## C-5 — OpenAI embedding model dependency

| | |
|---|---|
| **Conflict** | `Architecture.md §3.2` says "Embedding Generator: Call configurable embedding models (local model or OpenAI API)". `Research_Report.md §1` mandates OpenAI `text-embedding-3-large`. `Constraints.md` requires embedding-based semantic similarity. The docs do not specify a fallback when the OpenAI API is unavailable. |
| **Resolution** | The embedding client is pluggable (`ingestion/src/embeddings/__init__.py`). Default is a deterministic mock embedding for local dev / CI. The OpenAI client is a stub that requires `OPENAI_API_KEY` and the official `openai` package (not installed in this build). |
| **Affected areas** | Ingestion pipeline, integration tests. |
| **Recommended human review** | Document a clear production deployment requirement: the OpenAI key is mandatory, OR define a local embedding model that achieves equivalent recall. |

---

## C-6 — LLM call for 50% Difference commentary check

| | |
|---|---|
| **Conflict** | `PRD §11.2` describes the 50% Difference Principle using a "commentary/analysis depth" comparison, which implies semantic analysis. `Research_Report §2` mandates "lightweight LLM (e.g., Claude 3.5 Haiku or GPT-4o-mini)". `Constraints §1` says "perform exact duplicate filtering" within a 2-3 day window. The docs do not specify the algorithm for "commentary variance > 50%". |
| **Resolution** | A pluggable `FiftyPercentChecker` (`ingestion/src/deduplication/__init__.py`) is implemented. Default provider is `token_overlap` (deterministic, tested, no external API). An `llm` provider stub is registered but not implemented in this build. The token-overlap heuristic gives the same operational contract (decides analysis vs. duplicate) at zero API cost. |
| **Affected areas** | Ingestion dedup accuracy; integration test `test_int_ing_02`. |
| **Recommended human review** | Decide whether the GA release should ship with the LLM provider (better accuracy, higher cost) or stay on token-overlap (lower accuracy, zero cost). The current build supports either via env var. |

---

## Implicit Gaps (not conflicts, but undocumented behaviors)

### G-1 — Premium tier upgrade

The schema allows `user_tier IN ('basic', 'premium', 'admin')` but no documented
endpoint promotes a user between tiers. Per user approval, the implementation
exposes **no public upgrade endpoint**; tier promotion is a manual DB update.

**Recommended human review**: Add a `POST /admin/users/:id/tier` endpoint or
define the payment/subscription flow in a future doc revision.

### G-2 — Logout

No `POST /auth/logout` is documented. The implementation treats logout as a
client-side concern (clearing localStorage). JWTs remain valid until expiry.

**Recommended human review**: Add a `/auth/logout` endpoint that revokes the
JWT (requires a token revocation list or short-lived tokens + refresh tokens).

### G-3 — Password reset / forgot password

No documented flow. Out of scope for this build.

**Recommended human review**: Document the reset flow in a future doc revision
or confirm it remains out of scope.

### G-4 — Pagination on `/feed`

`API_Spec.md §4.1` only documents a `limit` query parameter. The implementation
caps at 10. There is no cursor or offset for "load more".

**Recommended human review**: Confirm 10-item cap is the hard limit or add
pagination semantics.

### G-5 — Admin endpoint authentication

`API_Spec.md §6.1` says "Authentication: JWT Required (Admin tier / Internal
service key)" but does not define the internal service key mechanism. The
implementation enforces admin-tier JWT only; service keys are not implemented.

**Recommended human review**: Document a service-key flow for cron / monitoring
tools.

### G-6 — Diversity ↔ Tag preference interaction

When both jurisdiction preferences and tag preferences are set, the system
filters by both (AND semantics). With the 2-per-jurisdiction cap and 10-item
total, this combination can yield a feed with fewer than 10 items. The docs
do not specify this behavior.

**Recommended human review**: Clarify the filter semantics; consider whether
the diversity constraint should soften (e.g., 3-per-jurisdiction) when the
preference set is narrow.

### G-7 — Self-reference: feature tag exclusivity

Nothing in the docs prevents a user from setting `preferred_tags: []` (empty
array). The current behavior is to skip the tag filter. The docs do not
specify this.

**Recommended human review**: Confirm the empty-tag-array behavior or specify
a default.