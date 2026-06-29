"""UK GOV.UK Statements of Changes scraper (fixture mode)."""

from __future__ import annotations

import os
from datetime import datetime, timezone, timedelta

import httpx

from . import Scraper, ScrapedItem, register

_FIXTURE_MODE = os.getenv("SCRAPER_FIXTURE_MODE", "1") == "1"


_FIXTURE: list[ScrapedItem] = [
    ScrapedItem(
        title="UK Increases Salary Threshold for Skilled Worker Visas",
        raw_content="<p>The Home Office has raised the minimum salary threshold for Skilled Worker visas from £38,700 to £41,700, effective 4 April 2026. Going rates for shortage occupations have been updated accordingly.</p>",
        summary="UK raises Skilled Worker salary threshold from £38,700 to £41,700, effective 4 April 2026.",
        publication_date_raw=(datetime.now(timezone.utc) - timedelta(hours=8)).isoformat(),
        source_url="https://www.gov.uk/government/news/skilled-worker-salary-threshold-2026",
        origin_jurisdiction="GB",
        publisher_authority=5,
        tags=["Corporate Sponsorship"],
    ),
    ScrapedItem(
        title="Statement of Changes in Immigration Rules: HC 1234",
        raw_content="<p>This statement introduces changes to Appendix Skilled Worker, including updated going rates and new shortage occupation list additions.</p>",
        summary="HC 1234 introduces updated going rates and shortage occupation additions to Appendix Skilled Worker.",
        publication_date_raw=(datetime.now(timezone.utc) - timedelta(hours=14)).isoformat(),
        source_url="https://www.gov.uk/government/publications/statement-of-changes-hc-1234",
        origin_jurisdiction="GB",
        publisher_authority=5,
        tags=["Corporate Sponsorship"],
    ),
    ScrapedItem(
        title="Fragomen Briefing: Navigating the UK Skilled Worker Threshold Increase",
        raw_content="<p>This briefing analyses how the new £41,700 salary threshold affects sponsor licence holders, including transitional provisions for assigned certificates of sponsorship issued before 4 April 2026.</p>",
        summary="Fragomen briefing on sponsor licence impacts of the new £41,700 Skilled Worker threshold.",
        publication_date_raw=(datetime.now(timezone.utc) - timedelta(hours=7)).isoformat(),
        source_url="https://www.fragomen.com/insights/uk-skilled-worker-threshold-2026.html",
        origin_jurisdiction="GB",
        publisher_authority=3,
        tags=["Corporate Sponsorship"],
    ),
]


class UKGovUkScraper(Scraper):
    jurisdiction_code = "GB"
    jurisdiction_name = "United Kingdom"
    source_label = "UK_GOVUK"

    def fetch(self, client: httpx.Client) -> list[ScrapedItem]:
        if _FIXTURE_MODE:
            return list(_FIXTURE)
        try:
            r = client.get("https://www.gov.uk/government/announcements")
            if r.status_code != 200:
                return []
            return []
        except httpx.HTTPError:
            return []


register("GB", UKGovUkScraper)