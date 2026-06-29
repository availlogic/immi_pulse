"""Normalization: UTF-8, ISO 8601 UTC, locale date handling."""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Optional

from dateutil import parser as date_parser


def parse_publication_date(raw: str | datetime | None) -> datetime:
    """Parse a publication date into a tz-aware UTC datetime.

    Per PRD §11.1 the authoritative timestamp is the publication date/发布时间,
    not the date of events described in the body.

    Accepts:
    - ISO 8601 strings (with or without TZ)
    - Localized formats (JP, KR, CN, DE, ES) via dateutil
    - datetime objects (returned normalized)
    """
    if raw is None:
        raise ValueError("publication date is required")
    if isinstance(raw, datetime):
        dt = raw
    else:
        text = str(raw).strip()
        # Chinese full-form published-at markers (发布时间, 发布于).
        text = re.sub(r"^\s*(发布时间|发布于|公開日|게시일)\s*[:：]?\s*", "", text)
        try:
            dt = date_parser.parse(text, fuzzy=True)
        except (ValueError, TypeError, OverflowError) as exc:
            raise ValueError(f"unparseable publication date: {raw!r}") from exc

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt


def normalize_utf8(text: str | bytes | None) -> str:
    """Ensure UTF-8 encoded string; non-ASCII-safe."""
    if text is None:
        return ""
    if isinstance(text, bytes):
        for enc in ("utf-8", "utf-8-sig", "gb18030", "shift_jis", "euc-kr", "latin-1"):
            try:
                return text.decode(enc)
            except UnicodeDecodeError:
                continue
        return text.decode("utf-8", errors="replace")
    return text


def to_iso8601_utc(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def truncate(text: str, max_chars: int) -> str:
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 1] + "…"


__all__ = [
    "parse_publication_date",
    "normalize_utf8",
    "to_iso8601_utc",
    "truncate",
]


def optional_str(value: object) -> Optional[str]:
    return str(value) if value is not None else None