"""Seed script: ensures canonical jurisdictions exist and loads a baseline of articles.

Idempotent — safe to run multiple times.
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timezone, timedelta

# Allow running from repo root or db/seed/.
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.normpath(os.path.join(HERE, "..", "..")))

from ingestion.src.config import JURISDICTIONS  # noqa: E402
from ingestion.src.db import connect, insert_article  # noqa: E402
from ingestion.src.embeddings import MockEmbeddingClient  # noqa: E402
from ingestion.src.tagging import tag_text  # noqa: E402


SEED_ARTICLES: list[dict] = [
    {
        "code": "US",
        "title": "USCIS Releases Updated Guidance on H-1B Specialty Occupation Determinations",
        "summary": "USCIS issued policy guidance clarifying how adjudicators should evaluate specialty occupation criteria for H-1B petitions, particularly for computer-related positions.",
        "source_url": "https://www.uscis.gov/newsroom/alerts/uscis-issues-policy-guidance-h-1b-specialty-occupation",
        "authority": 5,
        "tags": ["Corporate Sponsorship"],
        "hours_ago": 2,
    },
    {
        "code": "US",
        "title": "Fragomen Client Alert: Strategies for the FY2027 H-1B Cap",
        "summary": "This client alert outlines strategic approaches for employers preparing for the FY2027 H-1B cap, including timing considerations for masters cap petitions and premium processing.",
        "source_url": "https://www.fragomen.com/insights/fy2027-h-1b-cap-strategies.html",
        "authority": 3,
        "tags": ["Corporate Sponsorship"],
        "hours_ago": 6,
    },
    {
        "code": "US",
        "title": "DOS Publishes July 2026 Visa Bulletin with EB-2 Forward Movement",
        "summary": "The Department of State's July 2026 Visa Bulletin shows forward movement in EB-2 final action dates for most chargeability areas.",
        "source_url": "https://travel.state.gov/content/visas/en/law-and-policy/bulletin/2026/visa-bulletin-for-july-2026.html",
        "authority": 5,
        "tags": ["Corporate Sponsorship"],
        "hours_ago": 24,
    },
    {
        "code": "CA",
        "title": "Express Entry General Draw Issues 5,200 Invitations at CRS 524",
        "summary": "IRCC held a general Express Entry draw on June 25, 2026, issuing 5,200 invitations to apply for permanent residence with a minimum CRS score of 524.",
        "source_url": "https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/06/25/express-entry-general-draw.html",
        "authority": 5,
        "tags": ["Corporate Sponsorship"],
        "hours_ago": 3,
    },
    {
        "code": "CA",
        "title": "British Columbia PNP Issues 250 Nominations Across Skilled Worker Streams",
        "summary": "British Columbia issued approximately 250 provincial nominee invitations across its Skilled Worker and International Graduate streams.",
        "source_url": "https://www.welcomebc.ca/Immigrate-to-B-C/PNP-B-C-Skills-Immigration",
        "authority": 4,
        "tags": ["Corporate Sponsorship"],
        "hours_ago": 14,
    },
    {
        "code": "CA",
        "title": "Fragomen Briefing: Navigating Canada's 2026–2027 Study Permit Cap",
        "summary": "This briefing analyzes IRCC's ~360,000 study permit cap for 2026–2027 and recommends strategies for designated learning institutions and prospective students.",
        "source_url": "https://www.fragomen.com/insights/canada-study-permit-cap-2026.html",
        "authority": 3,
        "tags": ["Education"],
        "hours_ago": 30,
    },
    {
        "code": "CA",
        "title": "Category-Based Express Entry Draw Targets Healthcare Occupations",
        "summary": "IRCC held a category-based Express Entry draw inviting 4,500 candidates under healthcare occupations at a minimum CRS of 476.",
        "source_url": "https://www.canada.ca/en/immigration-refugees-citizenship/news/2026/06/25/express-entry-healthcare-draw.html",
        "authority": 5,
        "tags": ["Corporate Sponsorship"],
        "hours_ago": 7,
    },
    {
        "code": "GB",
        "title": "UK Raises Skilled Worker Salary Threshold to £41,700",
        "summary": "The Home Office raised the minimum salary threshold for Skilled Worker visas from £38,700 to £41,700, effective 4 April 2026.",
        "source_url": "https://www.gov.uk/government/news/skilled-worker-salary-threshold-2026",
        "authority": 5,
        "tags": ["Corporate Sponsorship"],
        "hours_ago": 5,
    },
    {
        "code": "GB",
        "title": "Statement of Changes in Immigration Rules: HC 1234",
        "summary": "HC 1234 introduces updated going rates and shortage occupation additions to Appendix Skilled Worker.",
        "source_url": "https://www.gov.uk/government/publications/statement-of-changes-hc-1234",
        "authority": 5,
        "tags": ["Corporate Sponsorship"],
        "hours_ago": 10,
    },
    {
        "code": "GB",
        "title": "Fragomen UK Briefing: Sponsor Licence Compliance Under New Threshold",
        "summary": "This briefing analyses how the new £41,700 Skilled Worker threshold affects sponsor licence holders and outlines transitional provisions for assigned certificates of sponsorship.",
        "source_url": "https://www.fragomen.com/insights/uk-skilled-worker-threshold-2026.html",
        "authority": 3,
        "tags": ["Corporate Sponsorship"],
        "hours_ago": 4,
    },
    {
        "code": "GB",
        "title": "Office for National Statistics: Net Migration Figures for Q1 2026",
        "summary": "ONS published Q1 2026 net migration statistics showing a continued decline in long-term international migration to the UK.",
        "source_url": "https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/internationalmigration",
        "authority": 5,
        "tags": ["Culture Inclusion"],
        "hours_ago": 48,
    },
    {
        "code": "US",
        "title": "Department of State Releases July 2026 Visa Bulletin",
        "summary": "The Department of State has released the July 2026 Visa Bulletin with modest forward movement in EB-2 and EB-3 categories.",
        "source_url": "https://travel.state.gov/content/visas/en/law-and-policy/bulletin/2026/visa-bulletin-for-july-2026.html",
        "authority": 5,
        "tags": ["Corporate Sponsorship"],
        "hours_ago": 12,
    },
]


def ensure_jurisdictions(conn) -> None:
    with conn.cursor() as cur:
        for code, name in JURISDICTIONS:
            cur.execute(
                "INSERT INTO jurisdictions (code, name, region, is_initial_seed) "
                "VALUES (%s, %s, %s, %s) "
                "ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name",
                (code, name, _region_for(code), True),
            )
    conn.commit()


def _region_for(code: str) -> str:
    return {
        "US": "North America",
        "CA": "North America",
        "MX": "Latin America",
        "BR": "Latin America",
        "GB": "Europe",
        "DE": "Europe",
        "FR": "Europe",
        "ES": "Europe",
        "PT": "Europe",
        "IE": "Europe",
        "TR": "Europe/Asia",
        "AU": "Oceania",
        "NZ": "Oceania",
        "SG": "Asia",
        "JP": "Asia",
        "KR": "Asia",
        "MY": "Asia",
        "TH": "Asia",
        "PH": "Asia",
        "HK": "Asia",
        "MO": "Asia",
        "TW": "Asia",
        "AE": "Middle East",
        "PC": "Pacific/Caribbean",
    }.get(code, "Other")


def article_idempotent(conn, source_url: str) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM articles WHERE source_url = %s", (source_url,))
        return cur.fetchone() is None


def seed_articles(conn) -> int:
    inserted = 0
    emb_client = MockEmbeddingClient()
    for item in SEED_ARTICLES:
        if not article_idempotent(conn, item["source_url"]):
            continue
        pub = datetime.now(timezone.utc) - timedelta(hours=item["hours_ago"])
        title = item["title"]
        summary = item["summary"]
        text_for_embedding = f"{title}\n{summary}"
        embedding = emb_client.embed(text_for_embedding)
        tags = item.get("tags") or tag_text(text_for_embedding)
        aid = "art_seed_" + str(inserted).rjust(4, "0")
        insert_article(
            conn,
            article_id=aid,
            title=title,
            raw_content=summary,
            summary=summary,
            publication_date=pub,
            source_url=item["source_url"],
            origin_jurisdiction=item["code"],
            publisher_authority=item["authority"],
            embedding=embedding,
            tags=tags,
        )
        inserted += 1
    return inserted


def main() -> None:
    with connect() as conn:
        ensure_jurisdictions(conn)
        inserted = seed_articles(conn)
    print(f"Seed complete: {inserted} article(s) inserted.")


if __name__ == "__main__":
    main()