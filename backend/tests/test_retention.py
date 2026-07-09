"""Tests for the data retention purge logic."""

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import NewsItem
from app.services.candidate_service import purge_old_items
from tests.conftest import create_candidate, create_news_item


class TestDataRetention:
    """IT-005-TC-001: Data Retention Query Rules."""

    async def test_purge_deletes_old_unstarred_items(self, session: AsyncSession):
        """Card A: published 95 days ago, NOT starred → deleted."""
        old_date = datetime.now(timezone.utc) - timedelta(days=95)
        item_a = await create_news_item(
            session, published_at=old_date, title_en="Card A"
        )
        await purge_old_items(session, retention_days=90)
        result = await session.execute(
            select(NewsItem).where(NewsItem.id == item_a.id)
        )
        assert result.scalar_one_or_none() is None

    async def test_purge_preserves_starred_items(self, session: AsyncSession):
        """Card B: published 95 days ago, starred → preserved."""
        old_date = datetime.now(timezone.utc) - timedelta(days=95)
        item_b = await create_news_item(
            session, published_at=old_date, title_en="Card B"
        )
        await create_candidate(session, item_b.id)
        await purge_old_items(session, retention_days=90)
        result = await session.execute(
            select(NewsItem).where(NewsItem.id == item_b.id)
        )
        assert result.scalar_one_or_none() is not None

    async def test_purge_preserves_parents_of_starred_children(
        self, session: AsyncSession
    ):
        """Card C: old parent of a starred child Card D → preserved."""
        old_date = datetime.now(timezone.utc) - timedelta(days=95)
        # Card C is the parent
        card_c = await create_news_item(
            session, published_at=old_date, title_en="Card C"
        )
        # Card D is a child of C, and is starred
        card_d = await create_news_item(
            session,
            published_at=old_date,
            parent_id=card_c.id,
            title_en="Card D",
        )
        await create_candidate(session, card_d.id)
        await purge_old_items(session, retention_days=90)
        result = await session.execute(
            select(NewsItem).where(NewsItem.id == card_c.id)
        )
        assert result.scalar_one_or_none() is not None

    async def test_purge_preserves_recent_items(self, session: AsyncSession):
        """Card E: published 20 days ago, NOT starred → preserved."""
        recent_date = datetime.now(timezone.utc) - timedelta(days=20)
        item_e = await create_news_item(
            session, published_at=recent_date, title_en="Card E"
        )
        await purge_old_items(session, retention_days=90)
        result = await session.execute(
            select(NewsItem).where(NewsItem.id == item_e.id)
        )
        assert result.scalar_one_or_none() is not None
