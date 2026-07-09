"""Tests for candidates API endpoints (star, unstar, notes, list)."""

import uuid

import pytest

from tests.conftest import create_candidate, create_news_item


class TestStarNewsItem:
    """Tests for POST /api/candidates/{id}/star."""

    async def test_star_news_item_creates_candidate(self, client, session):
        """Starring a news item creates a candidate record."""
        item = await create_news_item(session)
        resp = await client.post(f"/api/candidates/{item.id}/star")
        assert resp.status_code == 201
        body = resp.json()
        assert "candidate_id" in body
        assert "starred_at" in body

    async def test_star_nonexistent_returns_404(self, client):
        """Starring a non-existent news item returns 404."""
        fake_id = uuid.uuid4()
        resp = await client.post(f"/api/candidates/{fake_id}/star")
        assert resp.status_code == 404

    async def test_star_already_starred_is_idempotent_or_conflict(self, client, session):
        """Starring an already-starred item returns 409 Conflict."""
        item = await create_news_item(session)
        await client.post(f"/api/candidates/{item.id}/star")
        resp = await client.post(f"/api/candidates/{item.id}/star")
        assert resp.status_code == 409


class TestUnstarNewsItem:
    """Tests for DELETE /api/candidates/{id}/unstar."""

    async def test_unstar_removes_candidate(self, client, session):
        """Unstarring removes the candidate record."""
        item = await create_news_item(session)
        await client.post(f"/api/candidates/{item.id}/star")
        resp = await client.delete(f"/api/candidates/{item.id}/unstar")
        assert resp.status_code == 200
        body = resp.json()
        assert body["message"] == "News item successfully unstarred."

    async def test_unstar_nonexistent_returns_404(self, client):
        """Unstarring a non-existent candidate returns 404."""
        fake_id = uuid.uuid4()
        resp = await client.delete(f"/api/candidates/{fake_id}/unstar")
        assert resp.status_code == 404


class TestUpdateNotes:
    """Tests for PATCH /api/candidates/{id}/notes."""

    async def test_update_notes_success(self, client, session):
        """Updating notes on a starred candidate succeeds."""
        item = await create_news_item(session)
        await client.post(f"/api/candidates/{item.id}/star")
        resp = await client.patch(
            f"/api/candidates/{item.id}/notes",
            json={
                "custom_title": "Updated Title",
                "custom_outline": "Outline here",
                "notes": "Some notes",
            },
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["custom_title"] == "Updated Title"
        assert body["custom_outline"] == "Outline here"
        assert body["notes"] == "Some notes"

    async def test_update_notes_title_too_long_returns_422(self, client, session):
        """Title exceeding 200 chars returns 422."""
        item = await create_news_item(session)
        await client.post(f"/api/candidates/{item.id}/star")
        resp = await client.patch(
            f"/api/candidates/{item.id}/notes",
            json={"custom_title": "A" * 201},
        )
        assert resp.status_code == 422

    async def test_update_notes_nonexistent_returns_404(self, client):
        """Updating notes on non-existent candidate returns 404."""
        fake_id = uuid.uuid4()
        resp = await client.patch(
            f"/api/candidates/{fake_id}/notes",
            json={"notes": "Test"},
        )
        assert resp.status_code == 404


class TestGetCandidates:
    """Tests for GET /api/candidates."""

    async def test_get_candidates_list(self, client, session):
        """Returns list of all starred candidates."""
        item = await create_news_item(session, video_score=80)
        await create_candidate(session, item.id)
        resp = await client.get("/api/candidates")
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["data"]) == 1
        assert body["data"][0]["news_item_id"] == str(item.id)

    async def test_get_candidates_sorted_by_video_score(self, client, session):
        """Candidates are sorted by video_score descending by default."""
        item1 = await create_news_item(session, video_score=50, title_zh="Low")
        item2 = await create_news_item(session, video_score=95, title_zh="High")
        await create_candidate(session, item1.id)
        await create_candidate(session, item2.id)
        resp = await client.get("/api/candidates")
        body = resp.json()
        assert body["data"][0]["title_zh"] == "High"
        assert body["data"][1]["title_zh"] == "Low"
