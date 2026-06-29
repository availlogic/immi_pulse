"""APScheduler-based scheduler."""

from __future__ import annotations

import logging

from apscheduler.schedulers.blocking import BlockingScheduler

from config import Config
from pipeline import Pipeline
from ttl_cleanup import run_ttl_cleanup

logger = logging.getLogger(__name__)


def build_pipeline(c: Config) -> Pipeline:
    from embeddings import build_embedding_client

    # Import scraper modules for their side-effect of registering themselves.
    import scrapers.us_federal_register  # noqa: F401
    import scrapers.ca_gazette  # noqa: F401
    import scrapers.uk_govuk  # noqa: F401
    import scrapers.stubs  # noqa: F401

    emb = build_embedding_client(
        c.embedding_provider,
        openai_api_key=c.openai_api_key,
        openai_model=c.openai_model,
    )
    checker = FiftyPercentChecker(provider=c.fifty_percent_provider)
    return Pipeline(config=c, embedding_client=emb, checker=checker)


def run_scheduler(c: cfg.Config) -> None:
    pipeline = build_pipeline(c)
    scheduler = BlockingScheduler(timezone="UTC")
    scheduler.add_job(
        pipeline.run_once,
        "interval",
        hours=c.scraper_interval_hours,
        id="ingest",
        max_instances=1,
        coalesce=True,
    )
    # Stage 2.1: Daily TTL cleanup at 03:00 UTC per Architecture.md §6
    # ("A daily cron job deletes vectors and raw articles older than the TTL limit").
    scheduler.add_job(
        _scheduled_ttl_cleanup,
        "cron",
        hour=3,
        minute=0,
        id="ttl_cleanup",
        max_instances=1,
        coalesce=True,
    )
    logger.info("scheduler starting; ingest_interval=%dh; ttl_cleanup=daily@03:00", c.scraper_interval_hours)
    scheduler.start()


def _scheduled_ttl_cleanup() -> None:
    """Wrapper that re-reads the latest config for TTL_DAYS."""
    from config import load_config

    try:
        run_ttl_cleanup(load_config().ttl_days)
    except Exception as exc:  # noqa: BLE001
        logger.warning("scheduled TTL cleanup failed: %s", exc)


__all__ = ["run_scheduler", "build_pipeline", "_scheduled_ttl_cleanup"]


# Avoid top-level import cycle
from deduplication import FiftyPercentChecker  # noqa: E402