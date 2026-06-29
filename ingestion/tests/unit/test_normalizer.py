"""Unit tests for the normalizer."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from normalizer import normalize_utf8, parse_publication_date, to_iso8601_utc


def test_parse_iso8601_utc_passthrough():
    dt = parse_publication_date("2026-06-25T14:30:00Z")
    assert dt.tzinfo is not None
    assert dt.year == 2026 and dt.month == 6 and dt.day == 25
    assert dt.utcoffset().total_seconds() == 0


def test_parse_iso8601_with_offset_converts_to_utc():
    dt = parse_publication_date("2026-06-25T10:30:00-04:00")
    assert dt.utcoffset().total_seconds() == 0
    assert dt.hour == 14


def test_parse_naive_datetime_assumes_utc():
    dt = parse_publication_date("2026-06-25 14:30:00")
    assert dt.tzinfo is not None
    assert dt.utcoffset().total_seconds() == 0


def test_parse_chinese_publication_marker():
    dt = parse_publication_date("发布时间: 2026-06-25 14:30")
    assert dt.year == 2026 and dt.day == 25


def test_parse_korean_date_with_dot_separator():
    dt = parse_publication_date("게시일: 2026.06.25.")
    assert dt.year == 2026 and dt.month == 6 and dt.day == 25


def test_parse_japanese_well_formed():
    dt = parse_publication_date("2026年06月25日")
    assert dt.year == 2026 and dt.month == 6 and dt.day == 25


def test_parse_unparseable_raises():
    with pytest.raises(ValueError):
        parse_publication_date("not-a-date")


def test_parse_none_raises():
    with pytest.raises(ValueError):
        parse_publication_date(None)


def test_normalize_utf8_passthrough_for_str():
    assert normalize_utf8("héllo 世界") == "héllo 世界"


def test_normalize_utf8_decodes_bytes():
    assert normalize_utf8("héllo".encode("utf-8")) == "héllo"


def test_normalize_utf8_handles_chinese_gbk_fallback():
    # gb18030-superset of gbk; multi-byte Chinese characters encode to bytes.
    text = "中华人民共和国".encode("gb18030")
    assert "中华" in normalize_utf8(text)


def test_to_iso8601_utc_format():
    dt = datetime(2026, 6, 25, 14, 30, 0, tzinfo=timezone.utc)
    assert to_iso8601_utc(dt) == "2026-06-25T14:30:00Z"


def test_to_iso8601_utc_converts_other_tz():
    # 10:30 EDT → 14:30 UTC
    from datetime import timedelta

    eastern = timezone(timedelta(hours=-4))
    dt = datetime(2026, 6, 25, 10, 30, 0, tzinfo=eastern)
    assert to_iso8601_utc(dt) == "2026-06-25T14:30:00Z"