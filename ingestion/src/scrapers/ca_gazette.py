"""Canada Gazette / IRCC Newsroom scraper (fixture mode)."""

from __future__ import annotations

import os
from datetime import datetime, timezone, timedelta

import httpx

from . import Scraper, ScrapedItem, register

_FIXTURE_MODE = os.getenv("SCRAPER_FIXTURE_MODE", "1") == "1"


_FIXTURE: list[ScrapedItem] = [
    ScrapedItem(
        title="Express Entry: Category-Based Draw Invites 4,500 Candidates Under Healthcare Occupations",
        raw_content="<p>IRCC held a category-based Express Entry draw inviting 4,500 candidates under healthcare occupations with a minimum CRS score of 476.</p>",
        summary="IRCC invited 4,500 healthcare-occupation candidates at CRS 476 in the latest category-based Express Entry draw.",
        publication_date_raw=(datetime.now(timezone.utc) - timedelta(hours=6)).isoformat(),
        source_url="https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/06/25/express-entry-healthcare-draw.html",
        origin_jurisdiction="CA",
        publisher_authority=5,
        tags=["Corporate Sponsorship"],
    ),
    ScrapedItem(
        title="Express Entry General Draw: 5,200 Invitations Issued at CRS 524",
        raw_content="<p>A general Express Entry draw was held on June 25, 2026. 5,200 invitations to apply for permanent residence were issued with a minimum CRS score of 524.</p>",
        summary="IRCC issued 5,200 ITAs at CRS 524 in a general Express Entry draw on June 25, 2026.",
        publication_date_raw=(datetime.now(timezone.utc) - timedelta(hours=10)).isoformat(),
        source_url="https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/06/25/express-entry-general-draw.html",
        origin_jurisdiction="CA",
        publisher_authority=5,
        tags=["Corporate Sponsorship"],
    ),
    ScrapedItem(
        title="IRCC Announces New Study Permit Cap for 2026–2027 Academic Year",
        raw_content="<p>IRCC will cap study permit applications at approximately 360,000 for the 2026–2027 academic year, prioritizing programs at recognized DLIs.</p>",
        summary="IRCC announced a ~360,000 study permit cap for 2026–2027 prioritizing DLIs.",
        publication_date_raw=(datetime.now(timezone.utc) - timedelta(hours=30)).isoformat(),
        source_url="https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/06/20/study-permit-cap.html",
        origin_jurisdiction="CA",
        publisher_authority=5,
        tags=["Education"],
    ),
    ScrapedItem(
        title="Province of British Columbia Issues 250 PNP Nominations Under Skilled Worker Stream",
        raw_content="<p>British Columbia issued approximately 250 provincial nominee invitations in its weekly Skilled Worker and International Graduate streams.</p>",
        summary="BC issued ~250 PNP nominations across Skilled Worker and International Graduate streams.",
        publication_date_raw=(datetime.now(timezone.utc) - timedelta(hours=40)).isoformat(),
        source_url="https://www.welcomebc.ca/Immigrate-to-B-C/PNP-B-C-Skills-Immigration",
        origin_jurisdiction="CA",
        publisher_authority=4,
        tags=["Corporate Sponsorship"],
    ),
]


class CanadaGazetteScraper(Scraper):
    jurisdiction_code = "CA"
    jurisdiction_name = "Canada"
    source_label = "Canada_Gazette_IRCC"

    def fetch(self, client: httpx.Client) -> list[ScrapedItem]:
        if _FIXTURE_MODE:
            return list(_FIXTURE)
        try:
            r = client.get(
                "https://www.canada.ca/en/immigration-refugees-citizenship/news.html",
            )
            if r.status_code != 200:
                return []
            # Lightweight HTML scrape — production would use BeautifulSoup here.
            return []
        except httpx.HTTPError:
            return []


register("CA", CanadaGazetteScraper)