"""Stage 4.10: Integration test for admin review queue routing.

Per docs/PRD §11.3:
  "Admin Verification Queue: Route borderline classifications
   (classifier confidence score < 0.85) to an internal admin queue for
   manual approval."
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest

from config import load_config
from db import connect, insert_article
from deduplication import FiftyPercentChecker
from embeddings import MockEmbeddingClient
from exact_dedup import is_exact_duplicate
from llm import FEATURE_TAGS, KeywordTagger, TagResult, Tagger
from pipeline import Pipeline


class _LowConfidenceTagger(Tagger):
    """Tagger that always returns low confidence — used to drive the review path."""

    def tag(self, title, body, declared_jurisdiction):
        return TagResult(
            jurisdiction=declared_jurisdiction,
            feature_tags=["Corporate Sponsorship"],
            confidence=0.4,  # below 0.85 threshold
        )


class _HighConfidenceTagger(Tagger):
    """Tagger that always returns high confidence — used to drive the public path."""

    def tag(self, title, body, declared_jurisdiction):
        return TagResult(
            jurisdiction=declared_jurisdiction,
            feature_tags=["Corporate Sponsorship"],
            confidence=0.99,
        )


def _id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


@pytest.fixture(autouse=True)
def cleanup():
    yield
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM articles WHERE id LIKE 'int_stage4_%' OR source_url LIKE '%int-stage4%'"
            )
            cur.execute("DELETE FROM admin_review_queue WHERE article_id LIKE 'int_stage4_%'")
        conn.commit()


def _pipeline_with_tagger(tagger: Tagger) -> Pipeline:
    cfg = load_config()
    return Pipeline(
        config=cfg,
        embedding_client=MockEmbeddingClient(),
        checker=FiftyPercentChecker(),
        tagger=tagger,
    )


def test_low_confidence_routes_to_review_queue():
    p = _pipeline_with_tagger(_LowConfidenceTagger())
    code = f"int_stage4_{uuid.uuid4().hex[:6]}"
    url = f"https://int-stage4/{code}/low"
    from scrapers import ScrapedItem, register

    def factory():
        class _S:
            jurisdiction_code = code
            jurisdiction_name = "Test"
            source_label = f"INT_STAGE4_{code}"

            def fetch(self, client):
                return [
                    ScrapedItem(
                        title=f"Stage 4 Low Confidence {code}",
                        raw_content="body",
                        summary="summary",
                        publication_date_raw=datetime.now(timezone.utc).isoformat(),
                        source_url=url,
                        origin_jurisdiction="AU",
                        publisher_authority=4,
                    )
                ]

        return _S()

    register(code, factory)
    try:
        stats = p.run_once(codes=[code])
        # Pipeline returns "review" for low-confidence items (not "unique").
        assert stats.get("review", 0) == 1
        assert stats.get("unique", 0) == 0

        # A row should be present in admin_review_queue.
        with connect() as conn:
            with conn.cursor() as cur:
                # The actual article_id is generated; query by jurisdiction+confidence.
                cur.execute(
                    "SELECT rq.status, rq.confidence, rq.proposed_jurisdiction, rq.proposed_tags "
                    "FROM admin_review_queue rq "
                    "WHERE rq.proposed_jurisdiction = 'AU' AND rq.confidence = 0.4"
                )
                row = cur.fetchone()
                assert row is not None
                assert row["status"] == "pending"
                assert row["confidence"] == 0.4
                assert "Corporate Sponsorship" in row["proposed_tags"]
    finally:
        from scrapers import _registry
        _registry.pop(code, None)


def test_high_confidence_persists_normally_without_review_queue():
    p = _pipeline_with_tagger(_HighConfidenceTagger())
    code = f"int_stage4_{uuid.uuid4().hex[:6]}"
    url = f"https://int-stage4/{code}/high"
    from scrapers import ScrapedItem, register

    def factory():
        class _S:
            jurisdiction_code = code
            jurisdiction_name = "Test"
            source_label = f"INT_STAGE4_{code}"

            def fetch(self, client):
                return [
                    ScrapedItem(
                        title=f"Stage 4 High Confidence {code}",
                        raw_content="body",
                        summary="summary",
                        publication_date_raw=datetime.now(timezone.utc).isoformat(),
                        source_url=url,
                        origin_jurisdiction="SG",
                        publisher_authority=4,
                    )
                ]

        return _S()

    register(code, factory)
    try:
        stats = p.run_once(codes=[code])
        assert stats.get("unique", 0) == 1
        assert stats.get("review", 0) == 0

        with connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT tagging_confidence, tagger_provider FROM articles WHERE origin_jurisdiction = 'SG' AND source_url = %s",
                    (url,),
                )
                row = cur.fetchone()
                assert row is not None
                assert row["tagging_confidence"] == 0.99
                assert row["tagger_provider"] == "keyword"  # mock; LLMTagger not used
    finally:
        from scrapers import _registry
        _registry.pop(code, None)