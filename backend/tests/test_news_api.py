"""Tests for GET /api/news and GET /api/news/{id} endpoints."""

import uuid
from datetime import datetime, timedelta, timezone

import pytest

from tests.conftest import create_candidate, create_news_item


class TestGetNewsList:
    """Tests for GET /api/news — paginated news feed."""

    async def test_get_news_returns_paginated_list(self, client, session):
        """Returns a paginated envelope with data and pagination keys."""
        await create_news_item(session)
        resp = await client.get("/api/news")
        assert resp.status_code == 200
        body = resp.json()
        assert "data" in body
        assert "pagination" in body
        assert body["pagination"]["total_records"] >= 1

    async def test_get_news_excludes_children(self, client, session):
        """Items with parent_id (duplicates) are excluded from the feed."""
        parent = await create_news_item(session, title_en="Parent")
        await create_news_item(
            session, title_en="Child", parent_id=parent.id
        )
        resp = await client.get("/api/news")
        body = resp.json()
        ids = [item["id"] for item in body["data"]]
        assert str(parent.id) in ids
        # Child should NOT appear
        assert len(body["data"]) == 1

    async def test_get_news_hides_low_relevance_by_default(self, client, session):
        """Items with chinese_relevance_score < 60 are hidden by default."""
        await create_news_item(session, chinese_relevance_score=59, title_en="Low")
        await create_news_item(session, chinese_relevance_score=60, title_en="Ok")
        resp = await client.get("/api/news")
        body = resp.json()
        assert body["pagination"]["total_records"] == 1
        assert body["data"][0]["title_en"] == "Ok"

    async def test_get_news_shows_low_relevance_when_toggled(self, client, session):
        """show_low_relevance=true includes all items regardless of score."""
        await create_news_item(session, chinese_relevance_score=30)
        await create_news_item(session, chinese_relevance_score=90)
        resp = await client.get("/api/news?show_low_relevance=true")
        body = resp.json()
        assert body["pagination"]["total_records"] == 2

    async def test_get_news_filter_by_country(self, client, session):
        """Filter by country_tags parameter."""
        await create_news_item(session, country_tags=["Japan"], title_en="JP")
        await create_news_item(session, country_tags=["Canada"], title_en="CA")
        resp = await client.get("/api/news?countries=Japan")
        body = resp.json()
        assert body["pagination"]["total_records"] == 1
        assert body["data"][0]["title_en"] == "JP"

    async def test_get_news_filter_by_topic(self, client, session):
        """Filter by topic_tags parameter."""
        await create_news_item(session, topic_tags=["PR"], title_en="PR News")
        await create_news_item(
            session, topic_tags=["Golden Visa"], title_en="GV News"
        )
        resp = await client.get("/api/news?topics=PR")
        body = resp.json()
        assert body["pagination"]["total_records"] == 1
        assert body["data"][0]["title_en"] == "PR News"

    async def test_get_news_search_by_title(self, client, session):
        """Search query matches against title fields."""
        await create_news_item(session, title_en="Japan visa update", title_zh="日本签证更新")
        await create_news_item(session, title_en="Canada PR news", title_zh="加拿大PR新闻")
        resp = await client.get("/api/news?search=Japan")
        body = resp.json()
        assert body["pagination"]["total_records"] == 1

    async def test_get_news_sort_by_video_score(self, client, session):
        """Sort by video_score descending."""
        await create_news_item(session, video_score=50, title_en="Low")
        await create_news_item(session, video_score=90, title_en="High")
        resp = await client.get("/api/news?sort_by=video_score&sort_order=desc")
        body = resp.json()
        assert body["data"][0]["title_en"] == "High"
        assert body["data"][1]["title_en"] == "Low"

    async def test_get_news_pagination(self, client, session):
        """Pagination limits and pages work correctly."""
        for i in range(5):
            await create_news_item(session, title_en=f"Item {i}")
        resp = await client.get("/api/news?page=1&limit=2")
        body = resp.json()
        assert len(body["data"]) == 2
        assert body["pagination"]["total_records"] == 5
        assert body["pagination"]["total_pages"] == 3

    async def test_get_news_includes_is_starred(self, client, session):
        """Items have is_starred field reflecting candidates join."""
        item = await create_news_item(session)
        await create_candidate(session, item.id)
        resp = await client.get("/api/news")
        body = resp.json()
        found = next(i for i in body["data"] if i["id"] == str(item.id))
        assert found["is_starred"] is True

    async def test_get_news_includes_duplicate_count(self, client, session):
        """Parent items show duplicate_count from child count."""
        parent = await create_news_item(session, title_en="Parent")
        await create_news_item(session, parent_id=parent.id, title_en="Dup1")
        await create_news_item(session, parent_id=parent.id, title_en="Dup2")
        resp = await client.get("/api/news")
        body = resp.json()
        found = next(i for i in body["data"] if i["id"] == str(parent.id))
        assert found["duplicate_count"] == 2


class TestGetNewsDetail:
    """Tests for GET /api/news/{id} — single item detail."""

    async def test_get_news_detail_success(self, client, session):
        """Returns full detail for a valid news item ID."""
        item = await create_news_item(session)
        resp = await client.get(f"/api/news/{item.id}")
        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == str(item.id)
        assert "languages" in body
        assert "titles" in body
        assert "summaries" in body
        assert "scores" in body
        assert "metadata" in body
        assert "tags" in body
        assert "keywords" in body
        assert "youtube_suggestions" in body
        assert "duplicates" in body

    async def test_get_news_detail_includes_duplicates(self, client, session):
        """Detail includes list of duplicate sources."""
        parent = await create_news_item(session, title_en="Main")
        child = await create_news_item(
            session,
            parent_id=parent.id,
            source_name="Duplicate Source",
            source_url="https://dup.example.com/article",
        )
        resp = await client.get(f"/api/news/{parent.id}")
        body = resp.json()
        assert len(body["duplicates"]) == 1
        assert body["duplicates"][0]["source_name"] == "Duplicate Source"

    async def test_get_news_detail_not_found(self, client):
        """Returns 404 for non-existent ID."""
        fake_id = uuid.uuid4()
        resp = await client.get(f"/api/news/{fake_id}")
        assert resp.status_code == 404
