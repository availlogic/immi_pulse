"""Standardized internal article schema (PRD §11.1)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class NormalizedArticle:
    title: str
    raw_content: str
    summary: str
    publication_date: datetime
    source_url: str
    origin_jurisdiction: str  # canonical code (e.g. 'CA')
    publisher_authority: int = 3  # 1 (low) – 5 (government)
    tags: list[str] = field(default_factory=list)
    is_analysis: bool = False
    parent_article_id: str | None = None
    alternative_sources: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if not self.title or not self.source_url:
            raise ValueError("title and source_url are required")
        if not (1 <= self.publisher_authority <= 5):
            raise ValueError("publisher_authority must be between 1 and 5")
        if not self.origin_jurisdiction:
            raise ValueError("origin_jurisdiction is required")