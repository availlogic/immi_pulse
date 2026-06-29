"""Exact-duplicate pre-check.

Per docs/Constraints.md §1: "exact duplicate filtering for articles covering
the same event within a 2-3 day window". We normalize the URL and title to
a stable hash and check against recent articles in the same jurisdiction.
"""

from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone, timedelta

_NORMALIZE_RE = re.compile(r"[^a-z0-9]+")
_TRACKING_QUERY_PARAMS = {
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "gclid",
    "fbclid",
}


def normalize_url(url: str) -> str:
    """Strip tracking params, lower-case host, keep path/query essentials."""
    from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

    parts = urlsplit(url.strip())
    host = (parts.netloc or "").lower()
    if host.startswith("www."):
        host = host[4:]
    q = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True) if k.lower() not in _TRACKING_QUERY_PARAMS]
    return urlunsplit((parts.scheme.lower(), host, parts.path.rstrip("/"), urlencode(q), ""))


def normalize_title(title: str) -> str:
    return _NORMALIZE_RE.sub(" ", title.lower()).strip()


def exact_duplicate_key(url: str, title: str) -> str:
    """Stable identity key for an article (URL + title)."""
    payload = f"{normalize_url(url)}|{normalize_title(title)}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def is_exact_duplicate(
    conn,
    jurisdiction_code: str,
    url: str,
    title: str,
    *,
    window_days: int = 3,
) -> bool:
    """Return True if an article with the same normalized URL or title exists
    in this jurisdiction within the last `window_days` days.

    The check is URL-based OR title-based: a different outlet reporting the
    same story with a similar headline is also caught.
    """
    url_key = normalize_url(url)
    title_key = normalize_title(title)
    threshold = datetime.now(timezone.utc) - timedelta(days=window_days)

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT 1 FROM articles
            WHERE origin_jurisdiction = %s
              AND publication_date >= %s
              AND (
                regexp_replace(lower(source_url), '^https?://(www\.)?', '') = %s
                OR regexp_replace(lower(title), '[^a-z0-9]+', ' ', 'g') = %s
              )
            LIMIT 1
            """,
            (jurisdiction_code, threshold, url_key, title_key),
        )
        return cur.fetchone() is not None


__all__ = [
    "normalize_url",
    "normalize_title",
    "exact_duplicate_key",
    "is_exact_duplicate",
]