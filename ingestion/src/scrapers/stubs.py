"""Stub scrapers for non-seeded jurisdictions.

Stage 6.5: each stub now serves a deep fixture set (5–10 items per
jurisdiction) via `FIXTURE_FACTORIES` in `fixtures_data.py`. This gives
the pipeline realistic, jurisdiction-specific data to exercise.

Production scrapers replace these by calling `register()` with a custom
Scraper subclass that fetches from a live source.
"""

from __future__ import annotations

import httpx

from . import Scraper, ScrapedItem, register
from .fixtures import FixtureScraper, make_fixture_scraper
from .fixtures_data import FIXTURE_FACTORIES


class StubScraper(Scraper):
    def __init__(self, code: str, name: str, label: str) -> None:
        self.jurisdiction_code = code
        self.jurisdiction_name = name
        self.source_label = label

    def fetch(self, client: httpx.Client) -> list[ScrapedItem]:
        return []


# Stubs for the remaining 21 jurisdictions.
_STUBS: list[tuple[str, str, str]] = [
    ("AU", "Australia", "AU_Federal_Register"),
    ("NZ", "New Zealand", "NZ_Gazette"),
    ("SG", "Singapore", "SG_ICA"),
    ("DE", "Germany", "DE_BAMF"),
    ("FR", "France", "FR_Journal_Officiel"),
    ("ES", "Spain", "ES_BOE"),
    ("PT", "Portugal", "PT_AIMA"),
    ("IE", "Ireland", "IE_DJEI"),
    ("JP", "Japan", "JP_MOJ"),
    ("KR", "South Korea", "KR_MOJ"),
    ("MY", "Malaysia", "MY_MOHA"),
    ("TH", "Thailand", "TH_MFA"),
    ("PH", "Philippines", "PH_DFA"),
    ("MX", "Mexico", "MX_INM"),
    ("AE", "UAE", "AE_FEDERAL_AUTHORITY"),
    ("TR", "Turkey", "TR_DGMM"),
    ("PC", "Pacific/Caribbean Islands", "PC_Regional"),
    ("HK", "Hong Kong", "HK_IMMD"),
    ("MO", "Macau", "MO_SRF"),
    ("TW", "Taiwan", "TW_NIA"),
    ("BR", "Brazil", "BR_MJ"),
]


for code, name, label in _STUBS:
    factory = FIXTURE_FACTORIES.get(code)
    if factory is not None:
        items = factory()
        cls = make_fixture_scraper(code, name, label, items)
        register(code, cls)
    else:
        register(code, lambda c=code, n=name, l=label: StubScraper(c, n, l))


__all__ = ["StubScraper", "FixtureScraper"]