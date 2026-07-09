"""Pydantic schemas for API request/response validation."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


# --- Shared / Nested ---


class ScoresResponse(BaseModel):
    """Multi-dimensional grading scores."""

    importance: int
    chinese_relevance: int
    video: int
    evergreen: int


class PaginationInfo(BaseModel):
    """Pagination metadata wrapper."""

    page: int
    limit: int
    total_records: int
    total_pages: int


# --- News List ---


class NewsListItem(BaseModel):
    """Single item in the paginated news feed."""

    id: uuid.UUID
    title_zh: str
    title_en: str
    source_name: str
    published_at: datetime
    country_tags: list[str]
    topic_tags: list[str]
    audience_tags: list[str]
    scores: ScoresResponse
    is_starred: bool
    duplicate_count: int


class PaginatedNewsResponse(BaseModel):
    """Paginated news feed response envelope."""

    data: list[NewsListItem]
    pagination: PaginationInfo


# --- News Detail ---


class LanguagesResponse(BaseModel):
    """Language detection info."""

    original: str
    detected: str


class TitlesResponse(BaseModel):
    """Trilingual title block."""

    original: str
    en: str
    zh: str


class SummariesResponse(BaseModel):
    """Trilingual summary block."""

    original: str
    en: str
    zh: str


class MetadataResponse(BaseModel):
    """Source metadata."""

    source_name: str
    source_url: str
    published_at: datetime
    received_at: datetime
    official_source: bool


class TagsResponse(BaseModel):
    """Tag classifications."""

    countries: list[str]
    topics: list[str]
    audiences: list[str]


class YoutubeSuggestionsResponse(BaseModel):
    """AI-generated YouTube video suggestions."""

    titles: list[str] = Field(default_factory=list)
    thumbnail_prompt: str = ""


class DuplicateSource(BaseModel):
    """A duplicate source reference."""

    source_name: str
    source_url: str


class NewsDetailResponse(BaseModel):
    """Full detail view of a single news item."""

    id: uuid.UUID
    languages: LanguagesResponse
    titles: TitlesResponse
    summaries: SummariesResponse
    ai_analysis: str | None
    scores: ScoresResponse
    metadata: MetadataResponse
    tags: TagsResponse
    keywords: list[str]
    youtube_suggestions: YoutubeSuggestionsResponse
    duplicates: list[DuplicateSource]


# --- Filters ---


class FilterItem(BaseModel):
    """Single tag with its count."""

    tag: str
    count: int


class FiltersResponse(BaseModel):
    """Aggregated filter tag counts."""

    countries: list[FilterItem]
    topics: list[FilterItem]
    audiences: list[FilterItem]


# --- Candidates ---


class CandidateListItem(BaseModel):
    """Single item in the candidates list."""

    candidate_id: uuid.UUID
    news_item_id: uuid.UUID
    title_zh: str
    source_name: str
    video_score: int
    starred_at: datetime
    custom_title: str | None
    custom_outline: str | None
    notes: str | None


class CandidatesResponse(BaseModel):
    """Response for GET /api/candidates."""

    data: list[CandidateListItem]


class CandidateNotesUpdate(BaseModel):
    """Request body for PATCH /api/candidates/{id}/notes."""

    custom_title: str | None = Field(None, max_length=200)
    custom_outline: str | None = None
    notes: str | None = Field(None, max_length=4000)


class StarResponse(BaseModel):
    """Response for POST /api/candidates/{id}/star."""

    message: str = "News item successfully starred."
    candidate_id: uuid.UUID
    starred_at: datetime
