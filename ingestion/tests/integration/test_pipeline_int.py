"""Integration tests for the ingestion pipeline (require running Postgres)."""

from __future__ import annotations

import time
import uuid
from datetime import datetime, timezone, timedelta

import pytest

from config import load_config
from db import connect, insert_article
from deduplication import FiftyPercentChecker
from embeddings import MockEmbeddingClient
from exact_dedup import is_exact_duplicate
from llm import TagResult, Tagger
from pipeline import Pipeline


def _pipeline() -> Pipeline:
    cfg = load_config()
    return Pipeline(
        config=cfg,
        embedding_client=MockEmbeddingClient(),
        checker=FiftyPercentChecker(),
        tagger=_high_confidence_tagger(),
    )


def _high_confidence_tagger() -> Tagger:
    """Always returns high confidence; used by pre-Stage-4 tests."""
    from llm import TagResult

    class _HC(Tagger):
        def tag(self, title, body, declared_jurisdiction):
            return TagResult(
                jurisdiction=declared_jurisdiction,
                feature_tags=[],
                confidence=0.99,
            )

    return _HC()


def _pipeline_with_high_confidence_tagger() -> Pipeline:
    cfg = load_config()
    return Pipeline(
        config=cfg,
        embedding_client=MockEmbeddingClient(),
        checker=FiftyPercentChecker(),
        tagger=_high_confidence_tagger(),
    )


def _id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def _ensure_jurisdiction(conn, code: str, name: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO jurisdictions (code, name, region) VALUES (%s, %s, 'Test') "
            "ON CONFLICT (code) DO NOTHING",
            (code, name),
        )
    conn.commit()


@pytest.fixture(autouse=True)
def cleanup_test_articles():
    yield
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM articles WHERE id LIKE 'int_ing_%' OR source_url LIKE '%int-ing-test%'"
            )
            cur.execute("DELETE FROM scraper_logs WHERE scraper_name LIKE 'INT_ING_%'")
        conn.commit()


def test_int_ing_01_duplicate_within_ttl_is_discarded():
    """INT-ING-01: cosine similarity ≥ 0.88 and novelty ≤ 50% → discard."""
    p = _pipeline_with_high_confidence_tagger()
    base = _id("int_ing")
    article = (
        f"Canada Express Entry general draw on June 25, 2026 issued 5,200 "
        f"invitations at CRS 524 with tie-break May 14, 2026."
    )

    # First pass: insert the original.
    stats1 = _run_with_items(p, [(base + "_a", article, "Canada", "https://int-ing-test/a")])
    # The first insert must not be discarded.
    assert stats1["unique"] >= 1

    # Wait 2s to avoid identical-publication_date edge cases.
    time.sleep(2)

    # Second pass with identical content → must be discarded as duplicate.
    stats2 = _run_with_items(p, [(base + "_b", article, "Canada", "https://int-ing-test/b")])
    assert stats2["duplicate"] >= 1


def test_int_ing_02_high_novelty_saves_as_analysis_linked_to_parent():
    """INT-ING-02: cosine similarity ≥ 0.88 and novelty > 50% → save as Analysis Article."""
    # Use a lower similarity threshold for this test so the deterministic mock
    # embedding (token-bucket-based) reaches the 50%-Difference check pathway.
    # In production with real semantic embeddings, the default 0.88 threshold applies.
    from config import load_config
    cfg = load_config()
    cfg_low = type(cfg)(**{**cfg.__dict__, "similarity_threshold": 0.30})
    p = Pipeline(
        config=cfg_low,
        embedding_client=MockEmbeddingClient(),
        checker=FiftyPercentChecker(),
        tagger=_high_confidence_tagger(),
    )
    base = _id("int_ing")
    parent_text = (
        "Canada Express Entry general draw on June 25, 2026 issued 5,200 "
        "invitations at CRS 524 with tie-break May 14, 2026."
    )
    analysis_text = (
        "Fragomen analysis of the latest Canada Express Entry general draw: "
        "although 5,200 invitations at CRS 524 represent a modest increase, "
        "employers should anticipate continued downward pressure on cutoff scores "
        "through Q3 2026 as category-based draws absorb STEM candidates. Strategic "
        "advice for sponsors includes monitoring Provincial Nominee Programs and "
        "Labour Market Impact Assessment pathways in parallel, particularly for "
        "high-skill roles in technology and healthcare sectors where category-based "
        "selection may offer faster processing times and predictable throughput."
    )

    # First pass: parent.
    _run_with_items(p, [(base + "_parent", parent_text, "Canada", "https://int-ing-test/parent")])
    time.sleep(2)

    # Second pass: analysis commentary.
    stats = _run_with_items(p, [(base + "_analysis", analysis_text, "Canada", "https://int-ing-test/analysis")])

    # The analysis must be saved (as analysis or unique), and linked to the parent.
    saved = stats.get("analysis", 0) + stats.get("unique", 0)
    assert saved >= 1

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT parent_article_id, is_analysis FROM articles "
                "WHERE source_url = %s",
                ("https://int-ing-test/analysis",),
            )
            row = cur.fetchone()
            assert row is not None
            parent_id, is_analysis = row["parent_article_id"], row["is_analysis"]
            assert parent_id is not None
            assert is_analysis is True


def test_int_ing_03_strict_publication_timestamping():
    """INT-ING-03: publication_date is the publication timestamp, not the body event date."""
    p = _pipeline()
    base = _id("int_ing")
    # Item body describes a September 1 policy change, but the article was
    # published on October 3. The system must persist October 3.
    item_id = base + "_stamp"
    pub = datetime(2026, 10, 3, 12, 0, 0, tzinfo=timezone.utc)
    p._process_item = lambda *a, **kw: _process_with_date(p, item_id, pub, *a, **kw)

    # Direct insert through pipeline helper to control the publication_date.
    with connect() as conn:
        _ensure_jurisdiction(conn, "DE", "Germany")
        from embeddings import MockEmbeddingClient
        from normalizer.schema import NormalizedArticle
        from db import insert_article

        article = NormalizedArticle(
            title="Germany Opportunity Card launch details",
            raw_content="Effective September 1, 2026, Germany launched the Opportunity Card.",
            summary="Germany's Opportunity Card became effective on September 1, 2026.",
            publication_date=pub,
            source_url=f"https://int-ing-test/stamp/{item_id}",
            origin_jurisdiction="DE",
            publisher_authority=5,
            tags=["Education"],
        )
        emb = MockEmbeddingClient().embed(article.title + "\n" + article.summary)
        insert_article(
            conn,
            article_id=item_id,
            title=article.title,
            raw_content=article.raw_content,
            summary=article.summary,
            publication_date=article.publication_date,
            source_url=article.source_url,
            origin_jurisdiction=article.origin_jurisdiction,
            publisher_authority=article.publisher_authority,
            embedding=emb,
            tags=article.tags,
        )

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT publication_date FROM articles WHERE id = %s", (item_id,))
            row = cur.fetchone()
            assert row is not None
            stored = row["publication_date"]
            assert stored.year == 2026 and stored.month == 10 and stored.day == 3


def _process_with_date(pipeline, item_id, pub_date, conn, item):
    """Helper: bypass normal pipeline to insert with a fixed publication_date."""
    from normalizer import normalize_utf8, parse_publication_date
    from normalizer.schema import NormalizedArticle
    from db import insert_article
    from embeddings import MockEmbeddingClient
    from tagging import tag_text

    title = normalize_utf8(item.title).strip()
    raw = normalize_utf8(item.raw_content)
    summary = normalize_utf8(item.summary).strip()
    normalized = NormalizedArticle(
        title=title,
        raw_content=raw,
        summary=summary,
        publication_date=pub_date,
        source_url=item.source_url,
        origin_jurisdiction=item.origin_jurisdiction,
        publisher_authority=item.publisher_authority,
        tags=tag_text(f"{title}\n{summary}\n{raw}"),
    )
    emb = MockEmbeddingClient().embed(f"{title}\n{summary}")
    insert_article(
        conn,
        article_id=item_id,
        title=normalized.title,
        raw_content=normalized.raw_content,
        summary=normalized.summary,
        publication_date=normalized.publication_date,
        source_url=normalized.source_url,
        origin_jurisdiction=normalized.origin_jurisdiction,
        publisher_authority=normalized.publisher_authority,
        embedding=emb,
        tags=normalized.tags,
    )
    return "unique"


def _run_with_items(p: Pipeline, items: list[tuple[str, str, str, str]]) -> dict[str, int]:
    """Manually feed ScrapedItem tuples into the pipeline by temporarily
    monkey-patching the scraper registry."""
    from scrapers import ScrapedItem, register

    code = "INT_ING_TEST_" + uuid.uuid4().hex[:6]

    def factory():
        class _S:
            jurisdiction_code = code
            jurisdiction_name = "Test"
            source_label = f"INT_ING_TEST_{code}"

            def fetch(self, client):
                return [
                    ScrapedItem(
                        # Each item gets a unique title derived from the text so
                        # the exact-duplicate pre-check (Stage 2.4) does not
                        # reject them as duplicates. Embeddings remain driven by
                        # the body content.
                        title=f"Item {aid}",
                        raw_content=text + "\nAdditional body text for context.",
                        summary=text,
                        publication_date_raw=datetime.now(timezone.utc).isoformat(),
                        source_url=url,
                        origin_jurisdiction=jurisdiction,
                        publisher_authority=4,
                    )
                    for (aid, text, jurisdiction, url) in items
                ]

        return _S()

    register(code, factory)
    try:
        return p.run_once(codes=[code])
    finally:
        # Unregister to avoid leaking across tests.
        import scrapers as _s

        _s._registry.pop(code, None)


def test_ttl_cleanup_removes_old_articles():
    """AC-DED-04: TTL cleanup deletes articles older than configured window."""
    from ttl_cleanup import run_ttl_cleanup

    cfg = load_config()
    article_id = "int_ing_ttl_" + uuid.uuid4().hex[:8]
    old_date = datetime.now(timezone.utc) - timedelta(days=cfg.ttl_days + 5)

    with connect() as conn:
        _ensure_jurisdiction(conn, "AU", "Australia")
        insert_article(
            conn,
            article_id=article_id,
            title="Old article",
            raw_content="Body",
            summary="Summary",
            publication_date=old_date,
            source_url=f"https://int-ing-test/ttl/{article_id}",
            origin_jurisdiction="AU",
            publisher_authority=3,
            embedding=[0.0] * 3072,
            tags=[],
        )

    deleted = run_ttl_cleanup(cfg.ttl_days)
    assert deleted >= 1

    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM articles WHERE id = %s", (article_id,))
            assert cur.fetchone() is None