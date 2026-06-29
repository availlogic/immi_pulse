"""Unit tests for the exact-duplicate pre-check."""

from __future__ import annotations

from exact_dedup import (
    exact_duplicate_key,
    is_exact_duplicate,
    normalize_title,
    normalize_url,
)


def test_normalize_url_strips_www():
    assert normalize_url("https://www.example.com/path/") == "https://example.com/path"


def test_normalize_url_strips_tracking_params():
    a = normalize_url("https://example.com/a?utm_source=x&page=1")
    b = normalize_url("https://example.com/a?page=1&utm_medium=y")
    assert a == b == "https://example.com/a?page=1"


def test_normalize_url_lowercases_scheme_and_host():
    a = normalize_url("HTTPS://Example.COM/Path")
    b = normalize_url("https://example.com/Path")  # path is case-sensitive
    assert a == b


def test_normalize_url_drops_trailing_slash():
    assert normalize_url("https://example.com/path/") == "https://example.com/path"


def test_normalize_title_lowercases_and_collapses_punct():
    assert normalize_title("Hello, World!") == "hello world"
    assert normalize_title("IRCC  Update") == "ircc update"
    assert normalize_title("  spaced  out  ") == "spaced out"


def test_exact_duplicate_key_changes_with_url():
    a = exact_duplicate_key("https://example.com/a", "Title")
    b = exact_duplicate_key("https://example.com/b", "Title")
    assert a != b


def test_exact_duplicate_key_changes_with_title():
    a = exact_duplicate_key("https://example.com/a", "Title One")
    b = exact_duplicate_key("https://example.com/a", "Title Two")
    assert a != b


def test_exact_duplicate_key_stable_for_same_input():
    a = exact_duplicate_key("https://example.com/a", "Title")
    b = exact_duplicate_key("https://example.com/a", "Title")
    assert a == b


def test_exact_duplicate_key_strips_tracking():
    a = exact_duplicate_key("https://example.com/a?utm_source=x", "Title")
    b = exact_duplicate_key("https://example.com/a", "Title")
    assert a == b


def test_is_exact_duplicate_returns_false_when_empty():
    # Pure function test; DB tests live in the integration suite.
    from unittest.mock import MagicMock

    conn = MagicMock()
    conn.cursor.return_value.__enter__.return_value.fetchone.return_value = None
    assert is_exact_duplicate(conn, "US", "https://example.com/a", "Title") is False
