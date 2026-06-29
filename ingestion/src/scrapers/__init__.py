"""Scraper base + registry."""

from __future__ import annotations

import abc
import hashlib
import logging
import time
from dataclasses import dataclass
from typing import Callable

import httpx

logger = logging.getLogger(__name__)


@dataclass
class ScrapedItem:
    title: str
    raw_content: str
    summary: str
    publication_date_raw: str  # will be normalized downstream
    source_url: str
    origin_jurisdiction: str
    publisher_authority: int = 3
    tags: list[str] | None = None


class Scraper(abc.ABC):
    jurisdiction_code: str
    jurisdiction_name: str
    source_label: str

    @abc.abstractmethod
    def fetch(self, client: httpx.Client) -> list[ScrapedItem]:
        """Fetch raw items from the target source."""


def polite_headers() -> dict[str, str]:
    # Scraper safety (Architecture §5): random UA pool simplified here.
    uas = [
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
    ]
    idx = int(time.time()) % len(uas)
    return {
        "User-Agent": uas[idx],
        "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }


def make_client(timeout: float = 15.0) -> httpx.Client:
    return httpx.Client(timeout=timeout, headers=polite_headers(), follow_redirects=True)


def item_idempotency_key(item: ScrapedItem) -> str:
    """Stable identity derived from source_url for dedup pre-check."""
    return hashlib.sha256(item.source_url.encode("utf-8")).hexdigest()


# Registry maps jurisdiction code to scraper instance.
ScraperFactory = Callable[[], Scraper]
_registry: dict[str, ScraperFactory] = {}


def register(code: str, factory: ScraperFactory) -> None:
    _registry[code] = factory


def get_scraper(code: str) -> Scraper:
    if code not in _registry:
        raise KeyError(f"no scraper registered for {code}")
    return _registry[code]()


def registered_codes() -> list[str]:
    return list(_registry.keys())


__all__ = [
    "ScrapedItem",
    "Scraper",
    "make_client",
    "item_idempotency_key",
    "register",
    "get_scraper",
    "registered_codes",
    "polite_headers",
]