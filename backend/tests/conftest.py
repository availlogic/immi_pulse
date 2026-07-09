"""Shared test fixtures for ImmiPulse backend tests."""

import uuid
from collections.abc import AsyncGenerator
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.auth import require_auth
from app.database import Base, get_db
from app.main import app
from app.models import Candidate, NewsItem

TEST_TOKEN = "test-secret-token"

# In-memory SQLite for tests
TEST_DATABASE_URL = "sqlite+aiosqlite://"


@pytest.fixture()
async def engine():
    """Create a test async engine with in-memory SQLite."""
    _engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield _engine
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await _engine.dispose()


@pytest.fixture()
async def session(engine) -> AsyncGenerator[AsyncSession, None]:
    """Provide a transactional test session."""
    _session_factory = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with _session_factory() as session:
        yield session


@pytest.fixture()
async def client(engine) -> AsyncGenerator[httpx.AsyncClient, None]:
    """HTTP test client with overridden DB and auth dependencies."""
    _session_factory = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with _session_factory() as session:
            yield session

    async def _override_auth() -> str:
        return TEST_TOKEN

    app.dependency_overrides[get_db] = _override_get_db
    app.dependency_overrides[require_auth] = _override_auth

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://testserver"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture()
async def unauth_client(engine) -> AsyncGenerator[httpx.AsyncClient, None]:
    """HTTP test client WITHOUT auth override (for testing 401s)."""
    _session_factory = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with _session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = _override_get_db
    # Do NOT override auth — let real auth run
    app.dependency_overrides.pop(require_auth, None)

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://testserver"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


async def create_news_item(session: AsyncSession, **overrides: Any) -> NewsItem:
    """Factory function to create a NewsItem with sensible defaults."""
    defaults = {
        "id": uuid.uuid4(),
        "title_original": "Original Title",
        "title_en": "English Title",
        "title_zh": "中文标题",
        "summary_original": "Original summary text.",
        "summary_en": "English summary text.",
        "summary_zh": "中文摘要。",
        "original_language": "en",
        "source_name": "Test Source",
        "source_url": f"https://example.com/article-{uuid.uuid4().hex[:8]}",
        "published_at": datetime.now(timezone.utc),
        "received_at": datetime.now(timezone.utc),
        "country_tags": ["USA"],
        "topic_tags": ["Work Visa"],
        "audience_tags": ["Skilled Workers"],
        "importance_score": 70,
        "video_score": 80,
        "chinese_relevance_score": 85,
        "evergreen_score": 75,
        "parent_id": None,
        "keywords": ["visa", "immigration"],
        "ai_analysis": "AI analysis text.",
        "official_source": False,
        "youtube_suggestions": {
            "titles": ["Title 1", "Title 2"],
            "thumbnail_prompt": "A prompt",
        },
        "workflow_version": "1.0.0",
    }
    defaults.update(overrides)
    item = NewsItem(**defaults)
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return item


async def create_candidate(
    session: AsyncSession, news_item_id: uuid.UUID, **overrides: Any
) -> Candidate:
    """Factory function to create a Candidate with sensible defaults."""
    defaults = {
        "id": uuid.uuid4(),
        "news_item_id": news_item_id,
        "starred_at": datetime.now(timezone.utc),
        "custom_title": None,
        "custom_outline": None,
        "notes": None,
    }
    defaults.update(overrides)
    candidate = Candidate(**defaults)
    session.add(candidate)
    await session.commit()
    await session.refresh(candidate)
    return candidate
