"""Semantic deduplication engine and 50% Difference Principle.

Implements PRD §11.2 and AC-DED-01..04:
- cosine similarity < 0.88 → new unique article, persisted
- cosine similarity >= 0.88 → run 50% Difference check
    - new commentary > 50% → save as Analysis Article linked to parent
    - new commentary <= 50% → discard
- configurable TTL window (default 60 days)
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Iterable

from embeddings import EMBEDDING_DIM, MockEmbeddingClient


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if len(a) != len(b):
        raise ValueError("dimension mismatch")
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


_TOKEN_RE = re.compile(r"[\w']+", re.UNICODE)


def tokenize(text: str) -> list[str]:
    return [t.lower() for t in _TOKEN_RE.findall(text or "")]


def unique_tokens(tokens: Iterable[str]) -> set[str]:
    return set(tokens)


def token_overlap_variance(parent_text: str, candidate_text: str) -> float:
    """Return fraction of candidate tokens that are NOT in parent.

    Range [0, 1]. Used as the default 50% Difference signal.
    """
    parent = unique_tokens(tokenize(parent_text))
    cand = tokenize(candidate_text)
    if not cand:
        return 0.0
    novel = sum(1 for t in cand if t not in parent)
    return novel / len(cand)


@dataclass
class DedupeDecision:
    is_duplicate: bool
    is_analysis: bool
    parent_article_id: str | None
    novelty_ratio: float
    similarity: float


class FiftyPercentChecker:
    """Pluggable 50% Difference check.

    Default: token_overlap heuristic.
    Swappable for an LLM call when FIFTY_PERCENT_PROVIDER=llm (requires
    LLM_API_KEY; the LLMNoveltyChecker is implemented in llm.py).
    """

    def __init__(
        self,
        provider: str = "token_overlap",
        threshold: float = 0.5,
        llm_checker: object | None = None,
    ) -> None:
        if provider not in {"token_overlap", "llm"}:
            raise ValueError(f"Unsupported FIFTY_PERCENT_PROVIDER: {provider}")
        self.provider = provider
        self.threshold = threshold
        if provider == "llm":
            # Lazy import: the llm module pulls in httpx and the LLM client.
            if llm_checker is None:
                from llm import LLMNoveltyChecker
                from config import load_config
                self._impl: object = LLMNoveltyChecker(load_config())
            else:
                self._impl = llm_checker
        else:
            self._impl = None

    def novelty(self, parent_text: str, candidate_text: str) -> float:
        if self.provider == "llm" and self._impl is not None:
            return float(self._impl.novelty(parent_text, candidate_text))  # type: ignore[attr-defined]
        return token_overlap_variance(parent_text, candidate_text)

    def is_significant(self, novelty: float) -> bool:
        return novelty > self.threshold


@dataclass
class ScoredCandidate:
    article_id: str
    similarity: float
    raw_content: str


def deduplicate(
    candidate_text: str,
    candidate_embedding: list[float],
    parent_candidates: list[ScoredCandidate],
    threshold: float,
    checker: FiftyPercentChecker,
) -> DedupeDecision:
    """Decide what to do with `candidate_text` given existing scored parents.

    Returns a `DedupeDecision` with:
    - is_duplicate=True if it should be discarded
    - is_analysis=True if it is a >50%-novel commentary linked to a parent
    - parent_article_id for either Analysis or (rare) duplicate-with-source-merge
    """
    best: ScoredCandidate | None = None
    for cand in parent_candidates:
        if cand.similarity >= threshold:
            if best is None or cand.similarity > best.similarity:
                best = cand

    if best is None:
        return DedupeDecision(
            is_duplicate=False,
            is_analysis=False,
            parent_article_id=None,
            novelty_ratio=1.0,
            similarity=0.0,
        )

    novelty = checker.novelty(best.raw_content, candidate_text)
    if checker.is_significant(novelty):
        return DedupeDecision(
            is_duplicate=False,
            is_analysis=True,
            parent_article_id=best.article_id,
            novelty_ratio=novelty,
            similarity=best.similarity,
        )

    return DedupeDecision(
        is_duplicate=True,
        is_analysis=False,
        parent_article_id=best.article_id,
        novelty_ratio=novelty,
        similarity=best.similarity,
    )


# Convenience used in tests
def deterministic_embedding(text: str) -> list[float]:
    return MockEmbeddingClient().embed(text)


__all__ = [
    "cosine_similarity",
    "token_overlap_variance",
    "FiftyPercentChecker",
    "DedupeDecision",
    "ScoredCandidate",
    "deduplicate",
    "EMBEDDING_DIM",
]