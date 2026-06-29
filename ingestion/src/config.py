"""Runtime configuration for the ingestion service."""

from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    database_url: str
    embedding_provider: str
    openai_api_key: str | None
    openai_model: str
    fifty_percent_provider: str
    llm_api_key: str | None
    llm_base_url: str
    llm_model: str
    llm_review_threshold: float
    scraper_interval_hours: int
    ttl_days: int
    similarity_threshold: float


def load_config() -> Config:
    return Config(
        database_url=os.getenv(
            "DATABASE_URL",
            "postgres://immipulse:immipulse_dev@localhost:5432/immipulse",
        ),
        embedding_provider=os.getenv("EMBEDDING_PROVIDER", "mock"),
        openai_api_key=os.getenv("OPENAI_API_KEY") or None,
        openai_model=os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-large"),
        fifty_percent_provider=os.getenv("FIFTY_PERCENT_PROVIDER", "token_overlap"),
        llm_api_key=os.getenv("LLM_API_KEY") or None,
        # Stage 4.7: LLM_BASE_URL lets operators point the LLM client at any
        # Anthropic-compatible endpoint. Defaults to Anthropic's API.
        llm_base_url=os.getenv("LLM_BASE_URL", "https://api.anthropic.com"),
        llm_model=os.getenv("LLM_MODEL", "claude-3-5-haiku-latest"),
        # Per docs/PRD §11.3: classifier confidence < 0.85 routes to admin review.
        llm_review_threshold=float(os.getenv("LLM_REVIEW_THRESHOLD", "0.85")),
        scraper_interval_hours=max(4, int(os.getenv("SCRAPER_INTERVAL_HOURS", "24"))),
        ttl_days=int(os.getenv("TTL_DAYS", "60")),
        similarity_threshold=float(os.getenv("SIMILARITY_THRESHOLD", "0.88")),
    )


# Canonical 22+ jurisdictions per PRD §11.1 / §20.
JURISDICTIONS: list[tuple[str, str]] = [
    ("US", "United States"),
    ("CA", "Canada"),
    ("GB", "United Kingdom"),
    ("AU", "Australia"),
    ("NZ", "New Zealand"),
    ("SG", "Singapore"),
    ("DE", "Germany"),
    ("FR", "France"),
    ("ES", "Spain"),
    ("PT", "Portugal"),
    ("IE", "Ireland"),
    ("JP", "Japan"),
    ("KR", "South Korea"),
    ("MY", "Malaysia"),
    ("TH", "Thailand"),
    ("PH", "Philippines"),
    ("MX", "Mexico"),
    ("AE", "UAE"),
    ("TR", "Turkey"),
    ("PC", "Pacific/Caribbean Islands"),
    ("HK", "Hong Kong"),
    ("MO", "Macau"),
    ("TW", "Taiwan"),
    ("BR", "Brazil"),
]

# The 6 feature tags per PRD §11.3 (Language was removed in 2026-06-26T06:00 change).
FEATURE_TAGS: list[str] = [
    "Raising a Family",
    "Education",
    "Retirement",
    "Vacation",
    "Culture Inclusion",
    "Corporate Sponsorship",
]

# Jurisdictions seeded with fixture scrapers in this build.
SEEDED_JURISDICTIONS: list[str] = ["US", "CA", "GB"]