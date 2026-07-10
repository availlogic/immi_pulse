"""SQLAlchemy ORM models for ImmiPulse.

Uses a TypeDecorator to handle PostgreSQL ARRAY columns gracefully
when running on SQLite (stores as JSON strings).
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    TypeDecorator,
    Uuid,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ArrayType(TypeDecorator):
    """Platform-agnostic array column.

    Uses ARRAY(String) on PostgreSQL, stores as JSON-encoded TEXT on SQLite.
    """

    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect: Any) -> Any:
        if dialect.name == "postgresql":
            return dialect.type_descriptor(ARRAY(String(50)))
        return dialect.type_descriptor(Text())

    def process_bind_param(self, value: list[str] | None, dialect: Any) -> Any:
        if value is None:
            return [] if dialect.name == "postgresql" else "[]"
        if dialect.name == "postgresql":
            return value
        return json.dumps(value, ensure_ascii=False)

    def process_result_value(self, value: Any, dialect: Any) -> list[str] | None:
        if value is None:
            return []
        if dialect.name == "postgresql":
            return value
        if isinstance(value, str):
            return json.loads(value)
        return value


class JSONType(TypeDecorator):
    """Platform-agnostic JSON column.

    Uses JSONB on PostgreSQL, stores as JSON-encoded TEXT on SQLite.
    """

    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect: Any) -> Any:
        if dialect.name == "postgresql":
            return dialect.type_descriptor(JSONB())
        return dialect.type_descriptor(Text())

    def process_bind_param(self, value: Any, dialect: Any) -> Any:
        if value is None:
            return "{}" if dialect.name != "postgresql" else {}
        if dialect.name == "postgresql":
            return value
        return json.dumps(value, ensure_ascii=False)

    def process_result_value(self, value: Any, dialect: Any) -> Any:
        if value is None:
            return {}
        if dialect.name == "postgresql":
            return value
        if isinstance(value, str):
            return json.loads(value)
        return value


class NewsItem(Base):
    """Maps to the news_items table."""

    __tablename__ = "news_items"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )

    # Titles (Translations Matrix)
    title_original: Mapped[str] = mapped_column(Text, nullable=False)
    title_en: Mapped[str] = mapped_column(Text, nullable=False)
    title_zh: Mapped[str] = mapped_column(Text, nullable=False)

    # Summaries (Translations Matrix)
    summary_original: Mapped[str] = mapped_column(Text, nullable=False)
    summary_en: Mapped[str] = mapped_column(Text, nullable=False)
    summary_zh: Mapped[str] = mapped_column(Text, nullable=False)

    # Source and Metadata
    original_language: Mapped[str] = mapped_column(String(10), nullable=False)
    source_name: Mapped[str] = mapped_column(String(100), nullable=False)
    source_url: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    published_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Classification Tags (Arrays)
    country_tags: Mapped[list[str]] = mapped_column(
        ArrayType(), nullable=False, default=list
    )
    topic_tags: Mapped[list[str]] = mapped_column(
        ArrayType(), nullable=False, default=list
    )
    audience_tags: Mapped[list[str]] = mapped_column(
        ArrayType(), nullable=False, default=list
    )

    # Scores (0-100)
    importance_score: Mapped[int] = mapped_column(Integer, nullable=False)
    video_score: Mapped[int] = mapped_column(Integer, nullable=False)
    chinese_relevance_score: Mapped[int] = mapped_column(Integer, nullable=False)
    evergreen_score: Mapped[int] = mapped_column(Integer, nullable=False)

    # Duplicate Group (Self-Referencing FK)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("news_items.id", ondelete="SET NULL"), nullable=True
    )

    # AI Generated Insights
    keywords: Mapped[list[str]] = mapped_column(
        ArrayType(), nullable=False, default=list
    )
    ai_analysis: Mapped[str | None] = mapped_column(Text, nullable=True)
    official_source: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    youtube_suggestions: Mapped[dict] = mapped_column(
        JSONType(), nullable=False, default=dict
    )

    # Vector — skipped in SQLite tests (pgvector only)
    # title_vector is defined only at the PostgreSQL DDL level

    # Version Audit
    workflow_version: Mapped[str] = mapped_column(
        String(20), nullable=False, default="1.0.0"
    )

    # Relationships
    children: Mapped[list["NewsItem"]] = relationship(
        "NewsItem", back_populates="parent", cascade="all"
    )
    parent: Mapped["NewsItem | None"] = relationship(
        "NewsItem", back_populates="children", remote_side="NewsItem.id"
    )
    candidate: Mapped["Candidate | None"] = relationship(
        "Candidate", back_populates="news_item", uselist=False
    )

    __table_args__ = (
        CheckConstraint(
            "importance_score BETWEEN 0 AND 100", name="ck_importance_score"
        ),
        CheckConstraint(
            "video_score BETWEEN 0 AND 100", name="ck_video_score"
        ),
        CheckConstraint(
            "chinese_relevance_score BETWEEN 0 AND 100",
            name="ck_chinese_relevance_score",
        ),
        CheckConstraint(
            "evergreen_score BETWEEN 0 AND 100", name="ck_evergreen_score"
        ),
    )


class Candidate(Base):
    """Maps to the candidates table."""

    __tablename__ = "candidates"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    news_item_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("news_items.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    starred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    custom_title: Mapped[str | None] = mapped_column(
        String(200), nullable=True
    )
    custom_outline: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    news_item: Mapped["NewsItem"] = relationship(
        "NewsItem", back_populates="candidate"
    )


class RSSSource(Base):
    """Maps to the rss_sources table."""

    __tablename__ = "rss_sources"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

