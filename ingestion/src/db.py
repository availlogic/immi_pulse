"""Database utilities for the ingestion service."""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Iterator

import psycopg
from psycopg.rows import dict_row

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgres://immipulse:immipulse_dev@localhost:5432/immipulse"
)


@contextmanager
def connect() -> Iterator[psycopg.Connection]:
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        yield conn


def fetch_recent_candidates(
    conn: psycopg.Connection, days: int = 60
) -> list[dict]:
    """Return recent articles within TTL window across all jurisdictions (embedding + content).

    Stage 5.4.3: the `embedding` column is now HALFVEC. We cast to text
    for safe parsing back into Python on the client.
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, raw_content, embedding::text AS embedding_text,
                   publication_date, origin_jurisdiction
            FROM articles
            WHERE publication_date >= NOW() - (%s || ' days')::interval
            ORDER BY publication_date DESC
            LIMIT 500
            """,
            (days,),
        )
        return cur.fetchall()


def fetch_embedding_text(embedding_text: str) -> list[float]:
    """Parse pgvector literal '[v1,v2,...]' into a Python list[float]."""
    inner = embedding_text.strip("[]")
    if not inner:
        return []
    return [float(x) for x in inner.split(",")]


def insert_article(
    conn: psycopg.Connection,
    *,
    article_id: str,
    title: str,
    raw_content: str,
    summary: str,
    publication_date,
    source_url: str,
    origin_jurisdiction: str,
    publisher_authority: int,
    embedding: list[float],
    tags: list[str],
    is_analysis: bool = False,
    parent_article_id: str | None = None,
    alternative_sources: list[str] | None = None,
    notify: bool = True,
    tagging_confidence: float | None = None,
    tagger_provider: str = "keyword",
) -> None:
    """Insert an article and (optionally) emit a `new_article` notification.

    Stage 3.1: per docs/Architecture.md §4, the broker is supposed to react
    to article INSERTs in real time. We use Postgres LISTEN/NOTIFY
    (`pg_notify`) so the broker can subscribe to a channel and dispatch
    Premium keyword alerts without polling.

    Stage 4.10: tagging_confidence and tagger_provider are recorded for
    auditability. Articles with low confidence are routed to the admin
    review queue instead of being inserted (see pipeline._enqueue_for_review).

    Stage 5.4.2: the `embedding` column is now HALFVEC(3072) (post-migration
    006). We pass the 3072-dim vector as a pgvector literal; pgvector
    auto-casts to halfvec.
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO articles (
                id, title, raw_content, summary, publication_date, source_url,
                origin_jurisdiction, publisher_authority, embedding, tags,
                is_analysis, parent_article_id, alternative_sources,
                tagging_confidence, tagger_provider
            ) VALUES (
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s::halfvec, %s,
                %s, %s, %s,
                %s, %s
            )
            ON CONFLICT (id) DO NOTHING
            """,
            (
                article_id,
                title,
                raw_content,
                summary,
                publication_date,
                source_url,
                origin_jurisdiction,
                publisher_authority,
                "[" + ",".join(f"{x:.8f}" for x in embedding) + "]",
                tags,
                is_analysis,
                parent_article_id,
                alternative_sources or [],
                tagging_confidence,
                tagger_provider,
            ),
        )
        if notify:
            # Payload is the article id; the broker re-queries the article
            # by id to keep the NOTIFY payload small.
            cur.execute("SELECT pg_notify('new_article', %s)", [article_id])
    conn.commit()


def log_scraper(
    conn: psycopg.Connection,
    *,
    scraper_name: str,
    status: str,
    items_scraped: int,
    execution_time_seconds: float,
    error_message: str | None = None,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO scraper_logs (
                scraper_name, status, items_scraped, execution_time_seconds, error_message
            ) VALUES (%s, %s, %s, %s, %s)
            """,
            (scraper_name, status, items_scraped, execution_time_seconds, error_message),
        )
    conn.commit()


__all__ = [
    "connect",
    "fetch_recent_candidates",
    "fetch_embedding_text",
    "insert_article",
    "log_scraper",
]