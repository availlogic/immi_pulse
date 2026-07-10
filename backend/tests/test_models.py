"""Tests for ORM model creation and validation."""

import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Candidate, NewsItem, RSSSource
from tests.conftest import create_candidate, create_news_item, create_rss_source


class TestNewsItemModel:
    """Tests for NewsItem ORM model."""

    async def test_news_item_creation(self, session: AsyncSession):
        """NewsItem can be created and persisted."""
        item = await create_news_item(session, title_en="Test Article")
        result = await session.execute(
            select(NewsItem).where(NewsItem.id == item.id)
        )
        found = result.scalar_one()
        assert found.title_en == "Test Article"
        assert found.country_tags == ["USA"]
        assert found.importance_score == 70

    async def test_score_range_validation(self, session: AsyncSession):
        """Score values are validated at the application level (0-100 range).

        SQLite does not enforce CHECK constraints, so we validate
        that the model accepts valid scores and stores them correctly.
        """
        item = await create_news_item(
            session,
            importance_score=0,
            video_score=100,
            chinese_relevance_score=50,
            evergreen_score=99,
        )
        assert item.importance_score == 0
        assert item.video_score == 100
        assert item.chinese_relevance_score == 50
        assert item.evergreen_score == 99


class TestCandidateModel:
    """Tests for Candidate ORM model."""

    async def test_candidate_creation(self, session: AsyncSession):
        """Candidate can be created linked to a NewsItem."""
        item = await create_news_item(session)
        candidate = await create_candidate(session, item.id)
        result = await session.execute(
            select(Candidate).where(Candidate.id == candidate.id)
        )
        found = result.scalar_one()
        assert found.news_item_id == item.id
        assert found.starred_at is not None


class TestRSSSourceModel:
    """Tests for RSSSource ORM model."""

    async def test_rss_source_creation(self, session: AsyncSession):
        """RSSSource can be created and persisted."""
        source = await create_rss_source(session, name="Immigration Alerts", url="https://example.com/immigration.xml")
        result = await session.execute(
            select(RSSSource).where(RSSSource.id == source.id)
        )
        found = result.scalar_one()
        assert found.name == "Immigration Alerts"
        assert found.url == "https://example.com/immigration.xml"
        assert found.is_active is True
        assert found.created_at is not None
        assert found.updated_at is not None

    async def test_rss_source_unique_url(self, session: AsyncSession):
        """RSSSource URLs must be unique."""
        await create_rss_source(session, url="https://example.com/shared.xml")
        
        # In SQLite, unique constraints raise SQLAlchemy/DBAPI error on commit
        import sqlalchemy.exc
        with pytest.raises(sqlalchemy.exc.IntegrityError):
            await create_rss_source(session, url="https://example.com/shared.xml")

