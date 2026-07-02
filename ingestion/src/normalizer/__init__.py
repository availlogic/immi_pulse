"""Normalization: UTF-8, ISO 8601 UTC, locale date handling."""

from __future__ import annotations

import re
from datetime import datetime, timezone, timedelta
from typing import Optional

from dateutil import parser as date_parser

TZINFOS = {
    "BST": timezone(timedelta(hours=1)),
    "AEST": timezone(timedelta(hours=10)),
    "NZST": timezone(timedelta(hours=12)),
    "SGT": timezone(timedelta(hours=8)),
    "IST": timezone(timedelta(hours=1)),
    "MYT": timezone(timedelta(hours=8)),
    "PHT": timezone(timedelta(hours=8)),
    "GST": timezone(timedelta(hours=4)),
    "AST": timezone(timedelta(hours=-4)),
    "HKT": timezone(timedelta(hours=8)),
    "MEZ": timezone(timedelta(hours=1)),
    "MESZ": timezone(timedelta(hours=2)),
    "CEST": timezone(timedelta(hours=2)),
    "WEST": timezone(timedelta(hours=1)),
    "TRT": timezone(timedelta(hours=3)),
    "BRT": timezone(timedelta(hours=-3)),
}

MONTHS_MAP = {
    # German
    "januar": "january", "februar": "february", "märz": "march", "april": "april",
    "mai": "may", "juni": "june", "juli": "july", "august": "august",
    "september": "september", "oktober": "october", "november": "november", "dezember": "december",
    # French
    "janvier": "january", "février": "february", "mars": "march", "avril": "april",
    "mai": "may", "juin": "june", "juillet": "july", "août": "august",
    "septembre": "september", "octobre": "october", "novembre": "november", "décembre": "december",
    # Spanish / Portuguese
    "enero": "january", "janeiro": "january", "febrero": "february", "fevereiro": "february",
    "marzo": "march", "março": "march", "abril": "april", "mayo": "may", "maio": "may",
    "junio": "june", "junho": "june", "julio": "july", "julho": "july",
    "agosto": "august", "septiembre": "september", "setembro": "september",
    "octubre": "october", "outubro": "october", "noviembre": "november", "novembro": "november",
    "diciembre": "december", "dezembro": "december",
    # Turkish
    "ocak": "january", "şubat": "february", "mart": "march", "nisan": "april",
    "mayıs": "may", "haziran": "june", "temmuz": "july", "ağustos": "august",
    "eylül": "september", "ekim": "october", "kasım": "november", "aralık": "december",
    # Thai
    "มกราคม": "january", "กุมภาพันธ์": "february", "มีนาคม": "march", "เมษายน": "april",
    "พฤษภาคม": "may", "มิถุนายน": "june", "กรกฎาคม": "july", "สิงหาคม": "august",
    "กันยายน": "september", "ตุลาคม": "october", "พฤศจิกายน": "november", "ธันวาคม": "december",
}


def preprocess_date_string(text: str) -> str:
    text_lower = text.lower()
    # Sort by length descending to avoid substring replacement collisions (e.g. 'juni' replacing inside 'junio')
    sorted_months = sorted(MONTHS_MAP.items(), key=lambda x: len(x[0]), reverse=True)
    for local_month, en_month in sorted_months:
        if local_month in text_lower:
            text_lower = text_lower.replace(local_month, en_month)
    text_lower = text_lower.replace(" de ", " ")
    text_lower = text_lower.replace(" à ", " ")
    text_lower = re.sub(r"(\d+)\s*h\s*(\d+)", r"\1:\2", text_lower)
    text_lower = re.sub(r"(\d+)h(\d+)", r"\1:\2", text_lower)
    text_lower = text_lower.replace("年", "-").replace("月", "-").replace("日", " ")
    text_lower = text_lower.replace("時", ":").replace("分", "")

    # Convert Thai Buddhist Era (BE) to Gregorian (AD) (e.g. 2569 -> 2026)
    def _convert_thai_year(match):
        val = int(match.group(1))
        return str(val - 543)
    text_lower = re.sub(r"\b(25\d{2}|26\d{2})\b", _convert_thai_year, text_lower)

    return text_lower


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
        processed_text = preprocess_date_string(text)
        try:
            dt = date_parser.parse(processed_text, fuzzy=True, tzinfos=TZINFOS)
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