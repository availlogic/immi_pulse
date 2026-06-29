"""Daily TTL cleanup job."""

from __future__ import annotations

import logging

from db import connect

logger = logging.getLogger(__name__)


def run_ttl_cleanup(ttl_days: int) -> int:
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM articles WHERE publication_date < NOW() - (%s || ' days')::interval",
                (ttl_days,),
            )
            deleted = cur.rowcount or 0
        conn.commit()
    logger.info("TTL cleanup removed %d article(s) older than %d days", deleted, ttl_days)
    return deleted


__all__ = ["run_ttl_cleanup"]