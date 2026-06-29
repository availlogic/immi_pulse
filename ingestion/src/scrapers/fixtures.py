"""Stage 6.5.1: FixtureScraper base class.

Provides a uniform `ScrapedItem` source for all 24 jurisdictions. Each
jurisdiction's `_make_*_fixtures()` factory returns 5–10 canned items
that reflect the jurisdiction's government-portal URL pattern, language
expectations, and tag distribution.
"""

from __future__ import annotations

import abc
from typing import Sequence

from scrapers import ScrapedItem, Scraper


class FixtureScraper(Scraper):
    """A `Scraper` that serves a fixed list of `ScrapedItem`s.

    Subclasses set the class attributes `ITEMS` and `META` to wire in the
    per-jurisdiction fixtures.
    """

    # Class-level fixtures. Subclasses override these.
    ITEMS: list[ScrapedItem] = []

    def fetch(self, client) -> list[ScrapedItem]:
        return list(self.ITEMS)


def make_fixture_scraper(code: str, name: str, label: str, items: list[ScrapedItem]) -> type[FixtureScraper]:
    """Build a `FixtureScraper` subclass for a given jurisdiction.

    The class attributes (jurisdiction_code, jurisdiction_name, source_label)
    are picked up by the scraper registry's `register()` helper.
    """

    cls = type(
        f"FixtureScraper_{code}",
        (FixtureScraper,),
        {
            "ITEMS": list(items),
            "jurisdiction_code": code,
            "jurisdiction_name": name,
            "source_label": label,
        },
    )
    return cls


def realistic_url(jurisdiction: str, slug: str) -> str:
    """Generate a plausible government-portal-style URL for a jurisdiction."""
    base_domains = {
        "US": "https://www.federalregister.gov",
        "CA": "https://www.canada.ca",
        "GB": "https://www.gov.uk",
        "AU": "https://www.homeaffairs.gov.au",
        "NZ": "https://www.immigration.govt.nz",
        "SG": "https://www.mom.gov.sg",
        "DE": "https://www.bamf.bund.de",
        "FR": "https://www.interieur.gouv.fr",
        "ES": "https://www.inclusion.gob.es",
        "PT": "https://www.aima.gov.pt",
        "IE": "https://www.irishimmigration.ie",
        "JP": "https://www.moj.go.jp",
        "KR": "https://www.hikorea.go.kr",
        "MY": "https://www.imi.gov.my",
        "TH": "https://www.immigration.go.th",
        "PH": "https://www.dfa.gov.ph",
        "MX": "https://www.gob.mx",
        "AE": "https://www.uic.gov.ae",
        "TR": "https://www.gocmenlik.gov.tr",
        "PC": "https://www.caricom.org",
        "HK": "https://www.immd.gov.hk",
        "MO": "https://www.fsm.gov.mo",
        "TW": "https://www.immigration.gov.tw",
        "BR": "https://www.gov.br",
    }
    base = base_domains.get(jurisdiction, f"https://www.{jurisdiction.lower()}.gov")
    return f"{base}/immigration/{slug}"


def realistic_title(jurisdiction: str, topic: str) -> str:
    """Generate a jurisdiction-realistic article title."""
    prefixes = {
        "US": "Federal Register",
        "CA": "IRCC Notice",
        "GB": "GOV.UK Statement",
        "AU": "Department of Home Affairs Bulletin",
        "NZ": "Immigration New Zealand Update",
        "SG": "MOM Press Release",
        "DE": "BAMF Mitteilung",
        "FR": "Ministère de l'Intérieur Note",
        "ES": "Ministerio de Inclusión Comunicado",
        "PT": "AIMA Comunicado",
        "IE": "Department of Justice Update",
        "JP": "出入国在留管理庁発表",
        "KR": "법무부 공지",
        "MY": "Immigration Department Notice",
        "TH": "สำนักงานตรวจคนเข้าเมืองประกาศ",
        "PH": "DFA Advisory",
        "MX": "Instituto Nacional de Migración Boletín",
        "AE": "Federal Authority for Identity and Citizenship Notice",
        "TR": "Göç İdaresi Genel Müdürlüğü Duyurusu",
        "PC": "CARICOM Secretariat Release",
        "HK": "入境事務處公布",
        "MO": "Serviços de Migração Comunicado",
        "TW": "移民署公告",
        "BR": "Ministério da Justiça e Segurança Pública Portaria",
    }
    prefix = prefixes.get(jurisdiction, f"Immigration Update {jurisdiction}")
    return f"{prefix}: {topic}"


__all__ = ["FixtureScraper", "make_fixture_scraper", "realistic_url", "realistic_title"]