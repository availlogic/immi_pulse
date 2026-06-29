"""Entry point. Runs ingestion once on startup, then schedules recurring runs."""

from __future__ import annotations

import logging
import signal
import sys

from config import load_config
from scheduler import build_pipeline, run_scheduler
from ttl_cleanup import run_ttl_cleanup

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)


def main() -> int:
    cfg = load_config()
    pipeline = build_pipeline(cfg)

    logger.info("initial run starting")
    stats = pipeline.run_once()
    logger.info("initial run stats: %s", stats)

    run_ttl_cleanup(cfg.ttl_days)

    if "--once" in sys.argv:
        return 0

    signal.signal(signal.SIGTERM, lambda *_: sys.exit(0))
    run_scheduler(cfg)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())