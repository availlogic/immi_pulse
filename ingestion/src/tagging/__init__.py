"""Zero-shot tagging.

In production this would call an LLM for multi-label classification against
the 6 documented feature tags and the 22+ jurisdiction tags. For this build we
use a deterministic keyword-based heuristic that is fully testable and
satisfies the functional contract: each article is tagged with at least its
origin jurisdiction and any feature tags whose keywords appear in the text.
"""

from __future__ import annotations

import re

# Feature tag → keyword set (lowercase). Used by the deterministic tagger.
_TAG_KEYWORDS: dict[str, set[str]] = {
    "Raising a Family": {"family", "child", "spouse", "dependent", "parent"},
    "Education": {"education", "student", "study", "university", "school", "permit", "dl"},
    "Retirement": {"retirement", "retire", "pension"},
    "Vacation": {"vacation", "holiday", "tourist", "travel"},
    "Culture Inclusion": {"culture", "inclusion", "integration", "community", "language"},
    "Corporate Sponsorship": {"employer", "sponsor", "salary", "threshold", "h-1b", "skilled worker", "express entry", "work visa", "petition"},
}

# Jurisdiction → keyword hints (helps when article body lacks explicit country).
_JURISDICTION_KEYWORDS: dict[str, set[str]] = {
    "US": {"uscis", "h-1b", "eb-2", "eb-3", "federal register", "dos "},
    "CA": {"ircc", "express entry", "crs", "pnp"},
    "GB": {"home office", "skilled worker", "gov.uk", "sponsor licence"},
    "AU": {"subclass 189", "subclass 190", "home affairs"},
    "NZ": {"aewv", "green list", "immigration nz"},
    "SG": {"compass", "employment pass", "mom", "ica"},
    "DE": {"bamf", "chancenkarte", "opportunity card"},
    "FR": {"talent", "passeport talent"},
    "ES": {"digital nomad", "boe"},
    "PT": {"aima", "d8"},
    "IE": {"critical skills", "stamp 4"},
    "JP": {"specified skilled worker", "j-find", "j-skip"},
    "KR": {"f-2", "f-5", "h-2"},
}


def tag_text(text: str) -> list[str]:
    """Return feature tags whose keywords appear in `text` (case-insensitive)."""
    if not text:
        return []
    lower = text.lower()
    matches: list[str] = []
    for tag, keywords in _TAG_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            matches.append(tag)
    return matches


def jurisdiction_hint(origin_jurisdiction: str, text: str) -> str:
    """Return the origin jurisdiction unless the body explicitly references another."""
    if not text:
        return origin_jurisdiction
    lower = text.lower()
    for code, kws in _JURISDICTION_KEYWORDS.items():
        if any(kw in lower for kw in kws):
            return code
    return origin_jurisdiction


__all__ = ["tag_text", "jurisdiction_hint"]