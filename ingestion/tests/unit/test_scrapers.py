"""Unit tests for the scraper registry."""

from __future__ import annotations

import httpx

from scrapers import get_scraper, make_client, registered_codes
from scrapers import us_federal_register, ca_gazette, uk_govuk, stubs  # noqa: F401


def test_registered_codes_includes_all_seeded():
    codes = set(registered_codes())
    assert {"US", "CA", "GB", "AU", "NZ", "SG", "DE", "FR", "ES", "PT", "IE", "JP", "KR"}.issubset(codes)


def test_registered_codes_covers_22_jurisdictions():
    assert len(registered_codes()) >= 22


def test_us_federal_register_returns_fixture_items():
    scraper = get_scraper("US")
    with make_client() as client:
        items = scraper.fetch(client)
    assert len(items) >= 1
    for it in items:
        assert it.origin_jurisdiction == "US"
        assert it.source_url.startswith("http")
        assert it.title


def test_canadian_gazette_returns_fixture_items():
    scraper = get_scraper("CA")
    with make_client() as client:
        items = scraper.fetch(client)
    assert len(items) >= 1
    assert any("Express Entry" in it.title for it in items)


def test_uk_govuk_returns_fixture_items():
    scraper = get_scraper("GB")
    with make_client() as client:
        items = scraper.fetch(client)
    assert len(items) >= 1
    assert any("salary threshold" in (it.title + it.summary).lower() for it in items)


def test_fixture_scraper_returns_non_empty_list():
    # Stage 6.5: AU is now backed by a deep fixture set (5–10 items).
    scraper = get_scraper("AU")
    with make_client() as client:
        items = scraper.fetch(client)
    assert len(items) >= 1
    # Each fixture has an origin_jurisdiction and tags.
    for it in items:
        assert it.origin_jurisdiction == "AU"
        assert len(it.tags) > 0


def test_polite_headers_include_user_agent():
    headers = httpx.Headers(make_client().headers)
    assert "User-Agent" in headers