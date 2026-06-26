# ImmiPulse - QA Test Strategy

## 1. Introduction
This document defines the QA Test Strategy for the General Availability (GA) release of ImmiPulse. It maps the testing scope, levels, automation boundary, quality gates, and TDD alignment to ensure high reliability across ingestion, deduplication, and alerting systems.

---

## 2. Test Levels & Scope

| Test Level | Scope Definition | Target Execution Method |
| :--- | :--- | :--- |
| **Unit Testing** | Validation of isolated business logic (e.g., the feed diversity algorithm, standard normalizer mapping, email digest formatter, and vector math utility functions). | Fully automated via Python/Go unit tests running on pull requests. |
| **Integration Testing** | Validation of component boundaries: API Gateway ↔ Database, Ingestion Service ↔ Embedding APIs, and Ingestion ↔ Deduplication ↔ Notification dispatching. | Automated containerized tests running within a local Docker network during CI. |
| **System Testing** | Validation of end-to-end functionality of individual microservices, including cron schedules, garbage collection (TTL) deletion, and custom crawler behavior against simulated sites. | Automated test scripts executed in a staging Docker environment. |
| **End-to-End (E2E) Testing** | Validation of full user flows (Unregistered browse, Basic preference filter and daily digest receipt, Premium keyword alert triggering). | Automated browser tests (e.g., using Playwright) testing the frontend pages against a seeded staging database. |

---

## 3. Feature Coverage & Risk-Based Prioritization

The features are categorized by risk level to prioritize automated test coverage:

| Feature Area | Priority | Target Coverage | Business Impact |
| :--- | :--- | :--- | :--- |
| **Deduplication Engine (50% Diff)** | Critical | 100% Automated | Critical. System core differentiator. Failures lead to duplicate feeds or missing updates. |
| **Personalized Feed & Diversity Algorithm** | Critical | 100% Automated | High. Enforces the visual "Less is More" rule and the max 2 items per jurisdiction constraint. |
| **Auth & User Preferences** | High | Automated | High. Incorrect permissions leak filtered views or default global feeds. |
| **Premium Keyword Alerts** | High | Automated | High. Delivery delay or alerts failure directly impacts paid premium tier value. |
| **Scraper Ingestion Pipeline** | Medium | Automated + Manual Checks | Medium. HTML modifications on target sites can break pipelines; monitored via health logs. |
| **Visual Guidelines & light-mode Theme** | Low | Manual / Visual | Low. UI elements contrast and CSS transitions. |

### Business-Critical Paths
1. **The Ingestion-to-Publish Flow**: Scrape -> Embed -> Deduplicate -> Classify -> Persist. Must be completely free of data loss or incorrect duplicate classifications.
2. **Personalized Delivery Flow**: Request feed -> Apply User Tier Restrictions -> Run Diversity Filter -> Return Feed. Must execute under the 200ms latency ceiling.

---

## 4. Automation vs. Manual Strategy
- **Automate (100%)**:
  - Semantic similarity calculation and the 50% Difference threshold evaluations.
  - Diversity enforcement algorithms (must pass unit tests with varied mock data feeds).
  - API endpoint inputs, request headers, JWT authentication, and JSON schemas.
  - Database TTL deletions and table cascade constraints.
- **Manual (Visual / Exploratory)**:
  - Theme consistency checking (light-mode layout elements under different viewport width boundaries).
  - Validation of crawler responsiveness when target government layouts change structurally (monitored via email alerts).

---

## 5. TDD Alignment for Coding Agents
Downstream coding agents implementing ImmiPulse features must strictly follow the Test-Driven Development (TDD) cycle:
1. **Red Phase**: Write unit or integration tests mapping the exact functional specs (e.g., a test asserting that inputting 3 articles from Canada results in only 2 returned in the feed). Run tests to verify failure.
2. **Green Phase**: Implement the minimal backend or parser code to make the tests pass.
3. **Refactor Phase**: Clean up styling, code structures, and annotations, validating that the test suite remains green.

---

## 6. Quality Gates & Release Readiness

### 6.1 Entry Criteria for Verification
- Build and compilation pass with zero syntax or compilation errors.
- Unit test coverage reaches a minimum of $80\%$ across all services.
- Standardization of all API contracts between frontend and backend.

### 6.2 Exit / Release Criteria
- $100\%$ pass rate on all critical and high-priority functional and integration tests.
- Zero open Critical or High severity defects.
- Database query performance checks confirm latency $\le 200\text{ms}$ under simulated loads (10,000 requests/minute).
- Scraper health check dashboard returns green for all target jurisdictions.
