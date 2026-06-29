"""Stage 5.4.5: Integration test for HALFVEC + HNSW index.

Per docs/Database.md §3.2 (resolved via C-4 in the conflict report),
the `embedding` column is now HALFVEC(3072) and the HNSW index is created
on it. This test verifies:
  1. The column type is HALFVEC(3072).
  2. The HNSW index exists on the column.
  3. EXPLAIN of a cosine similarity search plan shows the HNSW index is
     selected (Bitmap Index Scan on articles_embedding_hnsw_idx).
"""

from __future__ import annotations

import datetime as _dt

import psycopg
import pytest

from embeddings import EMBEDDING_DIM
from db import insert_article


@pytest.fixture
def conn():
    """Yield a psycopg connection (NOT the context manager)."""
    from db import connect as _connect
    with _connect() as c:
        yield c


def test_embedding_column_is_halfvec(conn):
    """docs/Database.md §3.2 requires HALFVEC(3072) post-migration."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT format_type(atttypid, atttypmod) AS data_type
            FROM pg_attribute
            WHERE attrelid = 'articles'::regclass
              AND attname = 'embedding'
            """
        )
        row = cur.fetchone()
        assert row is not None, "embedding column missing"
        # format_type returns the full type with modifiers, e.g.
        # "halfvec(3072)" — check both the type name and the dimension.
        dt = row["data_type"].lower()
        assert "halfvec" in dt, f"expected halfvec type, got {row['data_type']}"
        assert "3072" in dt, f"expected 3072 dimensions, got {row['data_type']}"


def test_hnsw_index_exists(conn):
    """docs/Database.md §3.2 requires an HNSW index on the embedding column."""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'articles' AND indexname LIKE '%hnsw%'
            """
        )
        row = cur.fetchone()
        assert row is not None, "expected an HNSW index on articles.embedding"
        assert "halfvec_cosine_ops" in row["indexdef"], (
            f"HNSW index should use halfvec_cosine_ops: {row['indexdef']}"
        )


def test_explain_uses_hnsw_index(conn):
    """A cosine-distance query plan should reference the HNSW index."""
    # Seed an article so the table is non-empty.
    insert_article(
        conn,
        article_id="art_hnsw_test",
        title="HNSW test",
        raw_content="body",
        summary="summary",
        publication_date=_dt.datetime(2026, 1, 1, 0, 0, 0, tzinfo=_dt.timezone.utc),
        source_url="https://example.com/hnsw",
        origin_jurisdiction="US",
        publisher_authority=4,
        embedding=[0.1] * EMBEDDING_DIM,
        tags=[],
    )
    with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        # Force the planner to prefer the HNSW index even on small tables.
        # Without this, the planner's cost model picks a Seq Scan for ≤100
        # rows, which is faster in absolute terms but hides the index.
        cur.execute("SET LOCAL enable_seqscan = off")
        cur.execute(
            """
            EXPLAIN
            SELECT id FROM articles
            ORDER BY embedding <=> ('[' || repeat('0.1,', 3071) || '0.1]')::halfvec
            LIMIT 5
            """
        )
        plan_lines = [r["QUERY PLAN"] for r in cur.fetchall()]
        plan = " ".join(plan_lines)
    assert "articles_embedding_hnsw_idx" in plan, (
        f"expected HNSW index in plan, got: {plan}"
    )