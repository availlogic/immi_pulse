"""US Federal Register (fixture mode).

In a production environment this would query
https://www.federalregister.gov/api/v1/documents.json with appropriate
filters (agencies[]=USCIS, DOS, DOL). For this build we serve a fixed fixture
list when SCRAPER_FIXTURE_MODE=1 (default in dev/test) and otherwise make a
best-effort live request and gracefully fall back on errors.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone, timedelta

import httpx

from . import Scraper, ScrapedItem, register

_FIXTURE_MODE = os.getenv("SCRAPER_FIXTURE_MODE", "1") == "1"


_FIXTURE: list[ScrapedItem] = [
    ScrapedItem(
        title="USCIS Announces H-1B Cap Registration Period for FY2027",
        raw_content="<p>USCIS has announced the FY2027 H-1B cap initial registration period will run from March 4 through March 19, 2026. The registration fee remains $215 per beneficiary.</p>",
        summary="USCIS announced the FY2027 H-1B cap initial registration period (March 4–19, 2026) with a $215 fee per beneficiary.",
        publication_date_raw=(datetime.now(timezone.utc) - timedelta(hours=4)).isoformat(),
        source_url="https://www.federalregister.gov/documents/2026/06/25/2026-12345/h-1b-cap-registration",
        origin_jurisdiction="US",
        publisher_authority=5,
        tags=["Corporate Sponsorship"],
    ),
    ScrapedItem(
        title="Department of State Releases July 2026 Visa Bulletin",
        raw_content="<p>The Department of State has released the July 2026 Visa Bulletin. Final Action Dates and Dates for Filing show modest forward movement in EB-2 and EB-3 categories.</p>",
        summary="DOS released the July 2026 Visa Bulletin with forward movement in EB-2/EB-3 final action dates.",
        publication_date_raw=(datetime.now(timezone.utc) - timedelta(hours=12)).isoformat(),
        source_url="https://travel.state.gov/content/visas/en/law-and-policy/bulletin/2026/visa-bulletin-for-july-2026.html",
        origin_jurisdiction="US",
        publisher_authority=5,
        tags=["Corporate Sponsorship"],
    ),
    ScrapedItem(
        title="USCIS Adjusts Filing Fees for Form I-129 and Form I-140",
        raw_content="<p>Effective August 1, 2026, USCIS will adjust filing fees for I-129 (Petition for a Nonimmigrant Worker) to $1,015 and I-140 (Immigrant Petition for Alien Worker) to $815.</p>",
        summary="USCIS will adjust I-129 to $1,015 and I-140 to $815 effective August 1, 2026.",
        publication_date_raw=(datetime.now(timezone.utc) - timedelta(hours=20)).isoformat(),
        source_url="https://www.federalregister.gov/documents/2026/06/22/2026-11000/uscis-fee-rule",
        origin_jurisdiction="US",
        publisher_authority=5,
        tags=["Corporate Sponsorship"],
    ),
    ScrapedItem(
        title="Fragomen Analysis: Implications of the New USCIS Fee Schedule for Corporate Sponsors",
        raw_content="<p>The August 2026 USCIS fee adjustment will increase per-petition costs for employers filing H-1B, L-1, and O-1 petitions. This analysis outlines practical strategies for corporate mobility teams managing large sponsorship pipelines.</p>",
        summary="Fragomen analyzes how the August USCIS fee adjustment affects corporate sponsorship pipelines and recommends strategic batching for high-volume employers.",
        publication_date_raw=(datetime.now(timezone.utc) - timedelta(hours=18)).isoformat(),
        source_url="https://www.fragomen.com/insights/uscis-fee-august-2026.html",
        origin_jurisdiction="US",
        publisher_authority=3,
        tags=["Corporate Sponsorship"],
    ),
]


class USFederalRegisterScraper(Scraper):
    jurisdiction_code = "US"
    jurisdiction_name = "United States"
    source_label = "US_Federal_Register"

    def fetch(self, client: httpx.Client) -> list[ScrapedItem]:
        if _FIXTURE_MODE:
            return list(_FIXTURE)
        # Live best-effort path; deliberately tolerant of failure.
        try:
            r = client.get(
                "https://www.federalregister.gov/api/v1/documents.json",
                params={
                    "conditions[agencies][]": ["uscis", "dos", "dol"],
                    "conditions[publication_date][gte]": (
                        datetime.now(timezone.utc) - timedelta(days=2)
                    ).strftime("%Y-%m-%d"),
                    "per_page": 10,
                },
            )
            if r.status_code != 200:
                return []
            data = r.json()
            results: list[ScrapedItem] = []
            for d in data.get("results", [])[:10]:
                results.append(
                    ScrapedItem(
                        title=d.get("title", ""),
                        raw_content=d.get("abstract", "") or d.get("title", ""),
                        summary=(d.get("abstract") or d.get("title") or "")[:500],
                        publication_date_raw=d.get("publication_date", ""),
                        source_url=d.get("html_url", ""),
                        origin_jurisdiction="US",
                        publisher_authority=5,
                        tags=[],
                    )
                )
            return results
        except httpx.HTTPError:
            return []


register("US", USFederalRegisterScraper)