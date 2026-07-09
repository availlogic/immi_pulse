"""Tests for GET /api/filters endpoint."""

import pytest

from tests.conftest import create_news_item


class TestGetFilters:
    """Tests for GET /api/filters — tag aggregation."""

    async def test_get_filters_returns_tag_counts(self, client, session):
        """Returns aggregated counts for country, topic, and audience tags."""
        await create_news_item(
            session,
            country_tags=["USA", "Canada"],
            topic_tags=["Work Visa"],
            audience_tags=["Students"],
        )
        await create_news_item(
            session,
            country_tags=["USA"],
            topic_tags=["PR", "Work Visa"],
            audience_tags=["Investors"],
        )
        resp = await client.get("/api/filters")
        assert resp.status_code == 200
        body = resp.json()
        assert "countries" in body
        assert "topics" in body
        assert "audiences" in body

        # Check counts
        usa = next(c for c in body["countries"] if c["tag"] == "USA")
        assert usa["count"] == 2
        canada = next(c for c in body["countries"] if c["tag"] == "Canada")
        assert canada["count"] == 1

        work_visa = next(t for t in body["topics"] if t["tag"] == "Work Visa")
        assert work_visa["count"] == 2

    async def test_get_filters_empty_db(self, client):
        """Returns empty lists when no data exists."""
        resp = await client.get("/api/filters")
        assert resp.status_code == 200
        body = resp.json()
        assert body["countries"] == []
        assert body["topics"] == []
        assert body["audiences"] == []
