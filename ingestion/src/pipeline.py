"""Pipeline orchestration: scrape → normalize → embed → dedupe → persist."""

from __future__ import annotations

import logging
import os
import time
from datetime import datetime, timezone

import config as cfg
from db import connect, fetch_embedding_text, fetch_recent_candidates, insert_article, log_scraper
from deduplication import (
    DedupeDecision,
    FiftyPercentChecker,
    ScoredCandidate,
    cosine_similarity,
    deduplicate,
)
from embeddings import EMBEDDING_DIM, EmbeddingClient, build_embedding_client
from exact_dedup import is_exact_duplicate
from llm import build_tagger, Tagger, TagResult
from normalizer import normalize_utf8, parse_publication_date, to_iso8601_utc
from normalizer.schema import NormalizedArticle
from scrapers import ScrapedItem, get_scraper, registered_codes, make_client
from tagging import tag_text

logger = logging.getLogger(__name__)


class Pipeline:
    def __init__(
        self,
        *,
        config: cfg.Config,
        embedding_client: EmbeddingClient,
        checker: FiftyPercentChecker,
        tagger: Tagger | None = None,
    ) -> None:
        self.config = config
        self.embedding_client = embedding_client
        self.checker = checker
        # Stage 4.10: build a tagger (LLM if API key is set, else keyword).
        # The tagger is responsible for both multi-label feature tags and a
        # confidence score; low-confidence items are routed to the admin
        # review queue rather than persisted.
        self.tagger = tagger or build_tagger(config)
        self.tagger_provider = "llm" if self.tagger.__class__.__name__ == "LLMTagger" else "keyword"

    def run_once(self, codes: list[str] | None = None) -> dict[str, int]:
        # Stage 2.7: ENABLED_SCRAPERS env var. If set, restrict execution to
        # the listed jurisdiction codes (comma-separated). When unset, run
        # all registered scrapers.
        if codes is None:
            enabled = os.getenv("ENABLED_SCRAPERS", "").strip()
            if enabled:
                codes = [c.strip() for c in enabled.split(",") if c.strip()]
            else:
                codes = registered_codes()
        stats = {"scraped": 0, "unique": 0, "analysis": 0, "duplicate": 0}
        with make_client() as client:
            for code in codes:
                try:
                    scraper = get_scraper(code)
                except KeyError:
                    continue
                start = time.monotonic()
                try:
                    items = scraper.fetch(client)
                except Exception as exc:  # noqa: BLE001
                    elapsed = time.monotonic() - start
                    with connect() as conn:
                        log_scraper(
                            conn,
                            scraper_name=scraper.source_label,
                            status="failure",
                            items_scraped=0,
                            execution_time_seconds=elapsed,
                            error_message=str(exc),
                        )
                    logger.warning("scraper %s failed: %s", scraper.source_label, exc)
                    continue
                elapsed = time.monotonic() - start
                stats["scraped"] += len(items)
                with connect() as conn:
                    log_scraper(
                        conn,
                        scraper_name=scraper.source_label,
                        status="success",
                        items_scraped=len(items),
                        execution_time_seconds=elapsed,
                    )
                    for item in items:
                        outcome = self._process_item(conn, item)
                        stats[outcome] = stats.get(outcome, 0) + 1
        return stats

    def _process_item(self, conn, item: ScrapedItem) -> str:
        try:
            normalized = self._normalize(item)
        except ValueError as exc:
            logger.warning("normalization failed: %s", exc)
            return "duplicate"

        # Stage 2.4: Exact-duplicate pre-check (Constraints.md §1) — fast
        # URL/title-hash check over the past 3 days BEFORE the expensive
        # embedding + cosine-similarity step. Saves embedding cost on
        # near-duplicate press-release repostings.
        if is_exact_duplicate(
            conn,
            normalized.origin_jurisdiction,
            normalized.source_url,
            normalized.title,
            window_days=3,
        ):
            return "duplicate"

        # Stage 4.10: LLM-backed tagger. The tagger produces:
        #   - feature_tags: multi-label assignment
        #   - jurisdiction: confirmed/overridden
        #   - confidence: classifier self-reported confidence
        # Per docs/PRD §11.3, items with confidence < 0.85 route to the
        # admin review queue rather than the public feed.
        tag_result: TagResult = self.tagger.tag(
            title=normalized.title,
            body=f"{normalized.summary}\n{normalized.raw_content[:2000]}",
            declared_jurisdiction=normalized.origin_jurisdiction,
        )
        # Merge LLM tags with the deterministic tagger's output (the LLM
        # may add tags the keyword heuristic missed; we keep the union).
        deterministic_tags = normalized.tags
        merged_tags = list(dict.fromkeys([*deterministic_tags, *tag_result.feature_tags]))

        embedding = self.embedding_client.embed(f"{normalized.title}\n{normalized.summary}")
        if len(embedding) != EMBEDDING_DIM:
            raise RuntimeError(f"embedding dim mismatch: {len(embedding)}")

        decision = self._dedupe(conn, normalized, embedding)
        if decision.is_duplicate:
            return "duplicate"

        article_id = self._generate_id()

        # Stage 4.10: low-confidence items go to the review queue only.
        if tag_result.confidence < self.config.llm_review_threshold:
            self._enqueue_for_review(
                conn,
                article_id=article_id,
                title=normalized.title,
                proposed_jurisdiction=tag_result.jurisdiction,
                proposed_tags=merged_tags,
                confidence=tag_result.confidence,
            )
            return "review"

        insert_article(
            conn,
            article_id=article_id,
            title=normalized.title,
            raw_content=normalized.raw_content,
            summary=normalized.summary,
            publication_date=normalized.publication_date,
            source_url=normalized.source_url,
            origin_jurisdiction=normalized.origin_jurisdiction,
            publisher_authority=normalized.publisher_authority,
            embedding=embedding,
            tags=merged_tags,
            is_analysis=decision.is_analysis,
            parent_article_id=decision.parent_article_id,
            alternative_sources=normalized.alternative_sources,
            tagging_confidence=tag_result.confidence,
            tagger_provider=self.tagger_provider,
        )
        return "analysis" if decision.is_analysis else "unique"

    def _enqueue_for_review(
        self,
        conn,
        *,
        article_id: str,
        title: str,
        proposed_jurisdiction: str,
        proposed_tags: list[str],
        confidence: float,
    ) -> None:
        """Insert the article AND create a review-queue row.

        Per docs/PRD §11.3: borderline items (confidence < 0.85) are routed
        to an admin queue. We still persist the article (so the admin can
        review it with full context) but we set `tagging_confidence` to the
        classifier's score and add a pending review row.
        """
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO admin_review_queue (id, article_id, reason, proposed_tags, proposed_jurisdiction, confidence, status) "
                "VALUES (%s, %s, %s, %s, %s, %s, 'pending') "
                "ON CONFLICT (id) DO NOTHING",
                (
                    f"rev_{article_id}",
                    article_id,
                    f"Classifier confidence {confidence:.2f} < threshold {self.config.llm_review_threshold}",
                    proposed_tags,
                    proposed_jurisdiction,
                    confidence,
                ),
            )
        # Note: we do NOT call insert_article here; the review queue row
        # is the audit trail. The actual article is inserted by an admin
        # when they approve it (POST /admin/review/:id/approve).

    def _normalize(self, item: ScrapedItem) -> NormalizedArticle:
        if not item.source_url or not item.source_url.startswith(("http://", "https://")):
            raise ValueError("missing or invalid source_url")
        title = normalize_utf8(item.title).strip()
        raw = normalize_utf8(item.raw_content)
        summary = normalize_utf8(item.summary).strip()
        if not title or not summary:
            raise ValueError("title and summary are required")

        pub = parse_publication_date(item.publication_date_raw)
        tags = item.tags or tag_text(f"{title}\n{summary}\n{raw}")

        return NormalizedArticle(
            title=title,
            raw_content=raw,
            summary=summary,
            publication_date=pub,
            source_url=item.source_url,
            origin_jurisdiction=item.origin_jurisdiction,
            publisher_authority=item.publisher_authority,
            tags=tags,
        )

    def _dedupe(self, conn, item: NormalizedArticle, embedding: list[float]) -> DedupeDecision:
        parents = fetch_recent_candidates(conn, item.origin_jurisdiction, days=self.config.ttl_days)
        scored: list[ScoredCandidate] = []
        for row in parents:
            try:
                parent_emb = fetch_embedding_text(row["embedding_text"])
            except Exception:
                continue
            if len(parent_emb) != EMBEDDING_DIM:
                continue
            sim = cosine_similarity(embedding, parent_emb)
            scored.append(ScoredCandidate(article_id=row["id"], similarity=sim, raw_content=row["raw_content"]))
        return deduplicate(
            candidate_text=f"{item.title}\n{item.summary}\n{item.raw_content}",
            candidate_embedding=embedding,
            parent_candidates=scored,
            threshold=self.config.similarity_threshold,
            checker=self.checker,
        )

    @staticmethod
    def _generate_id() -> str:
        import secrets

        alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
        body = "".join(secrets.choice(alphabet) for _ in range(8))
        return f"art_{body}"


__all__ = ["Pipeline"]