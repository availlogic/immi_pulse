# ImmiPulse - Project Constraints

## Technology Constraints
- **Semantic Deduplication**:
  - Must implement an embedding-based semantic similarity check to prevent duplicate articles from flooding the user's feed.
  - Must perform exact duplicate filtering for articles covering the same event within a 2-3 day window.
  - Must implement the **50% Difference Principle**: filter out articles that only repeat facts/data; retain articles that provide unique professional analysis or strategies exceeding 50% content variation.

## Platform & User Interface Constraints
- **Multi-Device Adaptability (Responsive Design)**:
  - Native support for two primary form factors:
    1. **Mobile Devices**: Optimized for micro-reading and quick subscription/preference settings.
    2. **Desktops/Laptops**: Optimized for an efficient information dashboard and dense reading experience.
- **Accounts**:
  - Secure registration and login mechanism to store personalized destination subscriptions.
  - Fallback mechanism: Default to global subscriptions if the user has not selected any specific jurisdictions.

## Performance & Operational Constraints
- **Maximum Daily Pushes**: Strictly limited to a maximum of 10 core news items per user per day to enforce the "Less is More" principle.
- **Temporal Efficiency**: Raw feeds must be processed and updated daily to ensure information is timely and current.

## Known Assumptions
- High-quality website sources and API endpoints are accessible for the target jurisdictions (initially United Kingdom, United States, Canada, Australia, New Zealand, Singapore).
- Embedding models and LLM/semantic evaluation methods can consistently distinguish factual duplication from derivative analytical value.
- Unicode (UTF-8) character sets and localized date-time formats from target jurisdictions (e.g. Japan, South Korea) can be programmatically normalized.

## Explicit Non-Goals
- Real-time instant translation of all articles into multiple languages (focus is on multi-perspective curation).
- Building an automated visa recommendation engine (information is presented for user discretion with original source links).
