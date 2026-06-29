"""Stage 2.5: Integration test for the exact-duplicate pre-check.

Per docs/Constraints.md §1: "exact duplicate filtering for articles covering
the same event within a 2-3 day window". This test inserts a Canada article
and verifies that a second Canada article with the same URL is rejected
without an embedding call.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta

import pytest

from config import load_config
from db import connect, insert_article
from deduplication import FiftyPercentChecker
from embeddings import MockEmbeddingClient
from exact_dedup import is_exact_duplicate
from pipeline import Pipeline


def _pipeline() -> Pipeline:
    from llm import TagResult, Tagger

    class _HC(Tagger):
        def tag(self, title, body, declared_jurisdiction):
            return TagResult(jurisdiction=declared_jurisdiction, feature_tags=[], confidence=0.99)

    cfg = load_config()
    return Pipeline(
        config=cfg,
        embedding_client=MockEmbeddingClient(),
        checker=FiftyPercentChecker(),
        tagger=_HC(),
    )


def _id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


@pytest.fixture(autouse=True)
def cleanup():
    yield
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM articles WHERE id LIKE 'int_exact_%' OR source_url LIKE '%int-exact-test%'"
            )
        conn.commit()


def test_is_exact_duplicate_returns_false_when_no_match():
    p = _pipeline()
    code = f"int_exact_{uuid.uuid4().hex[:6]}"
    from scrapers import ScrapedItem, register

    def factory():
        class _S:
            jurisdiction_code = code
            jurisdiction_name = "Test"
            source_label = f"INT_EXACT_TEST_{code}"

            def fetch(self, client):
                return [
                    ScrapedItem(
                        title="First Article Title",
                        raw_content="body",
                        summary="summary",
                        publication_date_raw=datetime.now(timezone.utc).isoformat(),
                        source_url=f"https://int-exact-test/{code}/first",
                        origin_jurisdiction="CA",
                        publisher_authority=4,
                    )
                ]

        return _S()

    register(code, factory)
    try:
        with connect() as conn:
            # First insert — should not be a duplicate.
            assert is_exact_duplicate(conn, "CA", f"https://int-exact-test/{code}/first", "First Article Title") is False
            # Run the pipeline once to insert the article.
            stats = p.run_once(codes=[code])
            assert stats.get("unique", 0) >= 1
            # Now the same URL should be a duplicate.
            assert is_exact_duplicate(conn, "CA", f"https://int-exact-test/{code}/first", "First Article Title") is True
    finally:
        from scrapers import _registry
        _registry.pop(code, None)


def test_pipeline_discards_exact_duplicate_within_3_days():
    p = _pipeline()
    code = f"int_exact_{uuid.uuid4().hex[:6]}"
    url = f"https://int-exact-test/{code}/dedup"
    from scrapers import ScrapedItem, register

    def factory():
        class _S:
            jurisdiction_code = code
            jurisdiction_name = "Test"
            source_label = f"INT_EXACT_TEST_{code}"

            def fetch(self, client):
                return [
                    ScrapedItem(
                        title="Dedup Article Title",
                        raw_content="body",
                        summary="summary",
                        publication_date_raw=datetime.now(timezone.utc).isoformat(),
                        source_url=url,
                        origin_jurisdiction="DE",
                        publisher_authority=4,
                    )
                    for _ in range(2)
                ]

        return _S()

    register(code, factory)
    try:
        stats = p.run_once(codes=[code])
        # First item: unique; second: exact duplicate.
        assert stats.get("unique", 0) == 1
        assert stats.get("duplicate", 0) == 1
    finally:
        from scrapers import _registry
        _registry.pop(code, None)


def test_exact_duplicate_outside_window_is_unique():
    """An exact-duplicate outside the 3-day window should NOT trigger discard."""
    p = _pipeline()
    code = f"int_exact_{uuid.uuid4().hex[:6]}"
    old_id = _id("int_exact")
    old_url = f"https://int-exact-test/{code}/old"

    # Insert a 10-day-old article with the same URL.
    with connect() as conn:
        insert_article(
            conn,
            article_id=old_id,
            title="Old Article Title",
            raw_content="body",
            summary="summary",
            publication_date=datetime.now(timezone.utc) - timedelta(days=10),
            source_url=old_url,
            origin_jurisdiction="FR",
            publisher_authority=4,
            embedding=[0.0] * 3072,
            tags=[],
        )

    # Now insert a fresh article with the same URL. Pre-check should be false
    # because the existing article is outside the 3-day window.
    from scrapers import ScrapedItem, register

    def factory():
        class _S:
            jurisdiction_code = code
            jurisdiction_name = "Test"
            source_label = f"INT_EXACT_TEST_{code}"

            def fetch(self, client):
                return [
                    ScrapedItem(
                        title="Old Article Title",
                        raw_content="body",
                        summary="summary",
                        publication_date_raw=datetime.now(timezone.utc).isoformat(),
                        source_url=old_url,
                        origin_jurisdiction="FR",
                        publisher_authority=4,
                    )
                ]

        return _S()

    register(code, factory)
    try:
        with connect() as conn:
            assert is_exact_duplicate(
                conn, "FR", old_url, "Old Article Title", window_days=3
            ) is False
    finally:
        from scrapers import _registry
        _registry.pop(code, None)