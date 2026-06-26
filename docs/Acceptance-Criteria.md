# ImmiPulse - Acceptance Criteria Specification

## 1. Feature: Multi-Source Harvester Ingestion

### 1.1 Description
Automated scraping and API harvesting of immigration announcements across 22+ jurisdictions, normalising the data into a standard internal structure.

### 1.2 Acceptance Conditions
- **AC-ING-01**: Ingestion runs daily by default, and the interval schedule must be configurable via settings.
- **AC-ING-02**: All articles normalization must map the publication date (发布时间) as the core index timestamp. Future execution dates or historical dates mentioned in the body are ignored for indexing.
- **AC-ING-03**: The parser must successfully extract the original HTTP URL of the announcement. Blank or broken URLs are discarded.
- **AC-ING-04**: Errors, timeouts, or structural shifts on scraped web pages must log an entry in the `scraper_logs` table and send an admin alert if failures persist for two consecutive runs.

### 1.3 Definition of Done (DoD)
- Code passes unit tests validating normalizer outputs for all 22+ jurisdictions.
- Scraper logs are correctly populated in PostgreSQL.
- Scrapers operate reliably in containerized environments.

---

## 2. Feature: Global Deduplication & 50% Difference Principle

### 2.1 Description
Deduplication of incoming news against a database TTL window, discarding redundant summaries and saving only unique commentary.

### 2.2 Acceptance Conditions
- **AC-DED-01**: Incoming articles with a cosine similarity score of $< 0.88$ (distance $> 0.12$) compared to global database items are saved immediately.
- **AC-DED-02**: If similarity is $\ge 0.88$, a 50% Difference check compares commentary variance.
  - If the new commentary represents $> 50\%$ unique content, save it as a new analysis article linked to the parent.
  - If unique commentary is $\le 50\%$, discard the candidate immediately.
- **AC-DED-03**: The deduplication logic operates on a global scope, checking against database records up to a configurable TTL window (typically 1 to 2 months).
- **AC-DED-04**: A scheduled daily process must automatically delete database entries older than the configured TTL (e.g., 60 days).

### 2.3 Definition of Done (DoD)
- Unit tests cover similarity edge cases ($0.87$, $0.88$, $0.89$ distance values).
- Database triggers or cron scripts clean up old vector records automatically.

---

## 3. Feature: Personalized Feed & Diversity Algorithm

### 3.1 Description
Constructing a user's dashboard feed limited to 10 items, filtered by preferences, and diversity-controlled.

### 3.2 Acceptance Conditions
- **AC-FED-01**: Unregistered users retrieve the global feed, and cannot customize or save preference profiles.
- **AC-FED-02**: Registered users (Basic and Premium) receive feeds filtered by their selected jurisdictions and tags.
- **AC-FED-03**: The returned feed is capped at 10 items.
- **AC-FED-04**: The Diversity Algorithm limits any single jurisdiction to at most 2 items in the returned 10-item feed.
- **AC-FED-05**: The UI theme is rendered as a bright, vivid, light-mode design.

### 3.3 Definition of Done (DoD)
- Unit tests verify the Diversity Algorithm outputs with datasets containing unbalanced counts (e.g. 8 items from US, 1 from UK, 1 from CA).
- Page load time is $\le 1.5$ seconds under standard mobile 4G emulation.

---

## 4. Feature: Notifications & Premium Alarms

### 4.1 Description
Dispatched daily/weekly email digests and instant keyword email alerts.

### 4.2 Acceptance Conditions
- **AC-ALR-01**: Unregistered users receive no email updates.
- **AC-ALR-02**: Basic users receive automated personalized email digests on a daily or weekly schedule.
- **AC-ALR-03**: Premium users receive daily/weekly digests, plus immediate email alerts when a newly ingested non-duplicate article matches their custom keyword rules.
- **AC-ALR-04**: Creating duplicate alerts (matching keyword and jurisdiction) is blocked with an inline form error.
- **AC-ALR-05**: Email alerts must contain a brief summary and the validated clickable source link.

### 4.3 Definition of Done (DoD)
- Integration tests verify matching broker logic under load.
- Alert dispatch latency is verified as $\le 30$ minutes.
