"""Unit tests for tagging."""

from __future__ import annotations

from tagging import jurisdiction_hint, tag_text


def test_tag_text_returns_empty_for_blank():
    assert tag_text("") == []
    assert tag_text(None) == []  # type: ignore[arg-type]


def test_tag_text_recognizes_education():
    assert "Education" in tag_text("International students apply for study permits at universities")


def test_tag_text_recognizes_corporate_sponsorship():
    assert "Corporate Sponsorship" in tag_text("H-1B salary threshold raised by USCIS for employer sponsor petitions")


def test_tag_text_recognizes_family():
    assert "Raising a Family" in tag_text("Parents and spouses included in dependent child visa programme")


def test_tag_text_recognizes_retirement():
    assert "Retirement" in tag_text("Pension adjustments for retirees moving abroad")


def test_tag_text_recognizes_vacation():
    assert "Vacation" in tag_text("Tourist holiday travel visa extended")


def test_tag_text_recognizes_culture_inclusion():
    assert "Culture Inclusion" in tag_text("New community integration language program announced")


def test_tag_text_returns_multiple_tags():
    tags = tag_text("International student visa program for higher education with employer sponsorship options")
    assert "Education" in tags
    assert "Corporate Sponsorship" in tags


def test_jurisdiction_hint_uses_origin_when_no_explicit_reference():
    assert jurisdiction_hint("CA", "general news") == "CA"


def test_jurisdiction_hint_overrides_when_body_references_other_country():
    # Body mentions UK Home Office; Canada was the default.
    assert jurisdiction_hint("CA", "Home Office raises Skilled Worker threshold") == "GB"


def test_jurisdiction_hint_keeps_origin_when_body_mentions_origin():
    assert jurisdiction_hint("US", "USCIS raises H-1B cap") == "US"