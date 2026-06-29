"""Unit tests for the 50% Difference Principle."""

from __future__ import annotations

from deduplication import (
    FiftyPercentChecker,
    ScoredCandidate,
    cosine_similarity,
    deduplicate,
    token_overlap_variance,
)


def test_cosine_similarity_identical_vectors_returns_1():
    v = [0.1, 0.2, 0.3, 0.4]
    assert abs(cosine_similarity(v, v) - 1.0) < 1e-9


def test_cosine_similarity_orthogonal_returns_0():
    a = [1.0, 0.0]
    b = [0.0, 1.0]
    assert abs(cosine_similarity(a, b)) < 1e-9


def test_cosine_similarity_dimension_mismatch_raises():
    import pytest as _pytest

    with _pytest.raises(ValueError):
        cosine_similarity([1.0, 0.0], [1.0, 0.0, 0.0])


def test_token_overlap_no_novelty_returns_0():
    parent = "Canada express entry draw was held today"
    candidate = "Canada express entry draw was held today"
    assert token_overlap_variance(parent, candidate) == 0.0


def test_token_overlap_full_novelty_returns_1():
    parent = "apple banana cherry"
    candidate = "delta echo foxtrot golf hotel india juliet"
    assert token_overlap_variance(parent, candidate) == 1.0


def test_token_overlap_partial_novelty_in_range():
    parent = "Canada express entry draw was held today"
    candidate = "express entry held today with focus on provincial nominee programs"
    novelty = token_overlap_variance(parent, candidate)
    assert 0 < novelty < 1


def test_dedupe_below_threshold_marks_unique():
    checker = FiftyPercentChecker()
    decision = deduplicate(
        candidate_text="brand new event",
        candidate_embedding=[0.1] * 3072,
        parent_candidates=[ScoredCandidate(article_id="art_1", similarity=0.5, raw_content="parent")],
        threshold=0.88,
        checker=checker,
    )
    assert decision.is_duplicate is False
    assert decision.is_analysis is False
    assert decision.parent_article_id is None


def test_dedupe_above_threshold_with_low_novelty_discards():
    checker = FiftyPercentChecker()
    parent_text = "Canada express entry draw was held today with cutoff 524"
    candidate_text = "Canada express entry draw was held today with cutoff 524"
    decision = deduplicate(
        candidate_text=candidate_text,
        candidate_embedding=[0.1] * 3072,
        parent_candidates=[ScoredCandidate(article_id="art_1", similarity=0.95, raw_content=parent_text)],
        threshold=0.88,
        checker=checker,
    )
    assert decision.is_duplicate is True
    assert decision.is_analysis is False


def test_dedupe_above_threshold_with_high_novelty_saves_as_analysis():
    checker = FiftyPercentChecker()
    parent_text = (
        "Canada Express Entry general draw on June 25, 2026 issued "
        "5,200 invitations at CRS 524 with tie-break May 14, 2026."
    )
    # Candidate repeats the facts (~25% of tokens) but adds significant commentary.
    candidate_text = (
        "Fragomen analysis of the latest Canada Express Entry general draw: "
        "although 5,200 invitations at CRS 524 represent a modest increase, "
        "employers should anticipate continued downward pressure on cutoff scores "
        "through Q3 2026 as category-based draws absorb STEM candidates; "
        "strategic advice for sponsors is to monitor Provincial Nominee Programs "
        "and Labour Market Impact Assessment pathways in parallel, particularly "
        "for high-skill roles in technology and healthcare sectors, where "
        "category-based selection may offer faster processing times."
    )
    decision = deduplicate(
        candidate_text=candidate_text,
        candidate_embedding=[0.1] * 3072,
        parent_candidates=[ScoredCandidate(article_id="art_1", similarity=0.91, raw_content=parent_text)],
        threshold=0.88,
        checker=checker,
    )
    assert decision.is_duplicate is False
    assert decision.is_analysis is True
    assert decision.parent_article_id == "art_1"
    assert decision.novelty_ratio > 0.5


def test_dedupe_boundary_similarity_0_87_still_unique():
    """AC-DED-01: similarity < 0.88 → save as new."""
    checker = FiftyPercentChecker()
    decision = deduplicate(
        candidate_text="unique event",
        candidate_embedding=[0.1] * 3072,
        parent_candidates=[ScoredCandidate(article_id="art_1", similarity=0.87, raw_content="parent")],
        threshold=0.88,
        checker=checker,
    )
    assert decision.is_duplicate is False


def test_dedupe_boundary_similarity_0_88_triggers_diff_check():
    """AC-DED-02: similarity >= 0.88 → run 50% Difference check."""
    checker = FiftyPercentChecker()
    parent_text = "duplicate headline"
    decision = deduplicate(
        candidate_text=parent_text,  # 0% novelty → discard
        candidate_embedding=[0.1] * 3072,
        parent_candidates=[ScoredCandidate(article_id="art_1", similarity=0.88, raw_content=parent_text)],
        threshold=0.88,
        checker=checker,
    )
    assert decision.is_duplicate is True


def test_dedupe_boundary_similarity_0_89_triggers_diff_check():
    checker = FiftyPercentChecker()
    parent_text = "duplicate headline"
    decision = deduplicate(
        candidate_text=parent_text,
        candidate_embedding=[0.1] * 3072,
        parent_candidates=[ScoredCandidate(article_id="art_1", similarity=0.89, raw_content=parent_text)],
        threshold=0.88,
        checker=checker,
    )
    assert decision.is_duplicate is True


def test_dedupe_selects_highest_similarity_parent():
    checker = FiftyPercentChecker()
    parent_text = "Canada express entry draw was held today"
    decision = deduplicate(
        candidate_text="completely different article about german opportunity card",
        candidate_embedding=[0.1] * 3072,
        parent_candidates=[
            ScoredCandidate(article_id="art_lo", similarity=0.89, raw_content=parent_text),
            ScoredCandidate(article_id="art_hi", similarity=0.95, raw_content="unrelated content"),
        ],
        threshold=0.88,
        checker=checker,
    )
    assert decision.parent_article_id == "art_hi"