"""LLM-backed tagger (Stage 4.1) and novelty checker (Stage 4.3).

Per docs/PRD §11.2 / §11.3 and docs/Research_Report.md §2:
  - Tagger assigns multi-label jurisdiction + feature tags with a confidence
    score; classifier confidence < 0.85 routes the article to the admin
    review queue (PRD §11.3).
  - Novelty checker compares a candidate article to a parent article and
    returns a novelty ratio (0.0–1.0) for the 50% Difference Principle.

Stage 4 uses an Anthropic-compatible LLM client. Without `LLM_API_KEY`, the
heuristic providers (keyword tagger / token-overlap novelty) are used.
"""

from __future__ import annotations

import abc
import json
import logging
import re
from dataclasses import dataclass
from typing import Any

import httpx

from config import Config

logger = logging.getLogger(__name__)

FEATURE_TAGS = [
    "Raising a Family",
    "Education",
    "Retirement",
    "Vacation",
    "Culture Inclusion",
    "Corporate Sponsorship",
]


@dataclass
class TagResult:
    jurisdiction: str  # primary jurisdiction code (e.g. "US")
    feature_tags: list[str]
    confidence: float  # 0.0–1.0


class Tagger(abc.ABC):
    @abc.abstractmethod
    def tag(self, title: str, body: str, declared_jurisdiction: str) -> TagResult: ...


class KeywordTagger(Tagger):
    """Deterministic heuristic tagger (Stage 1 default)."""

    _TAG_KEYWORDS: dict[str, set[str]] = {
        "Raising a Family": {"family", "child", "spouse", "dependent", "parent"},
        "Education": {"education", "student", "study", "university", "school", "permit", "dl"},
        "Retirement": {"retirement", "retire", "pension"},
        "Vacation": {"vacation", "holiday", "tourist", "travel"},
        "Culture Inclusion": {"culture", "inclusion", "integration", "community"},
        "Corporate Sponsorship": {"employer", "sponsor", "salary", "threshold", "h-1b", "skilled worker", "express entry", "work visa", "petition"},
    }

    def tag(self, title: str, body: str, declared_jurisdiction: str) -> TagResult:
        text = f"{title}\n{body}".lower()
        tags = [t for t, kws in self._TAG_KEYWORDS.items() if any(k in text for k in kws)]
        # Heuristic confidence: high if we found tags, lower if we found few.
        confidence = min(1.0, 0.6 + 0.1 * len(tags))
        return TagResult(
            jurisdiction=declared_jurisdiction,
            feature_tags=tags,
            confidence=confidence,
        )


class LLMTagger(Tagger):
    """LLM-based tagger using an Anthropic-compatible Messages API.

    The prompt asks the model to return JSON:
        {"jurisdiction": "<code>", "feature_tags": [...], "confidence": 0.0–1.0}
    The model is told to set confidence low if uncertain.
    """

    _SYSTEM = (
        "You are an immigration-policy classifier. Given a news article, "
        "respond with a single JSON object (no prose, no markdown) with three "
        f"keys: 'jurisdiction' (one of the canonical 2-letter codes or 3-letter "
        f"PC for Pacific/Caribbean), 'feature_tags' (subset of {FEATURE_TAGS}), "
        "and 'confidence' (a number between 0 and 1 reflecting how confident "
        "you are). If unsure, set 'confidence' below 0.85 and prefer the "
        "empty list for feature_tags. Do not include explanations."
    )

    def __init__(self, config: Config) -> None:
        if not config.llm_api_key:
            raise ValueError("LLM_API_KEY required for LLMTagger")
        self.config = config
        self._client = httpx.Client(
            base_url=config.llm_base_url,
            headers={
                "x-api-key": config.llm_api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )

    def tag(self, title: str, body: str, declared_jurisdiction: str) -> TagResult:
        prompt = (
            f"Title: {title}\n\n"
            f"Body:\n{body[:4000]}\n\n"
            f"Declared jurisdiction (from source): {declared_jurisdiction}"
        )
        try:
            resp = self._client.post(
                "/v1/messages",
                json={
                    "model": self.config.llm_model,
                    "max_tokens": 256,
                    "system": self._SYSTEM,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            resp.raise_for_status()
            data = resp.json()
            text = data.get("content", [{}])[0].get("text", "")
            return self._parse(text, declared_jurisdiction)
        except Exception as exc:  # noqa: BLE001
            logger.warning("LLM tagger failed: %s", exc)
            return TagResult(jurisdiction=declared_jurisdiction, feature_tags=[], confidence=0.0)

    def _parse(self, text: str, declared_jurisdiction: str) -> TagResult:
        # Extract first JSON object from the response.
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            return TagResult(jurisdiction=declared_jurisdiction, feature_tags=[], confidence=0.0)
        try:
            obj: Any = json.loads(match.group(0))
        except json.JSONDecodeError:
            return TagResult(jurisdiction=declared_jurisdiction, feature_tags=[], confidence=0.0)
        jurisdiction = str(obj.get("jurisdiction") or declared_jurisdiction).strip()
        feature_tags = [t for t in (obj.get("feature_tags") or []) if t in FEATURE_TAGS]
        try:
            confidence = float(obj.get("confidence", 0.5))
        except (TypeError, ValueError):
            confidence = 0.5
        confidence = max(0.0, min(1.0, confidence))
        return TagResult(jurisdiction=jurisdiction, feature_tags=feature_tags, confidence=confidence)


def build_tagger(config: Config) -> Tagger:
    """Select the tagger implementation based on the `tagger_provider` config.

    The pipeline can override the provider per call, but the default is
    'llm' when an LLM key is available and 'keyword' otherwise.
    """
    if config.llm_api_key:
        return LLMTagger(config)
    return KeywordTagger()


# ---------------------------------------------------------------------------
# Novelty checker (Stage 4.3)
# ---------------------------------------------------------------------------


class NoveltyChecker(abc.ABC):
    @abc.abstractmethod
    def novelty(self, parent_text: str, candidate_text: str) -> float: ...


class TokenOverlapNovelty(NoveltyChecker):
    """Stage 1 default — same algorithm as deduplication.TokenOverlapVariance."""

    def novelty(self, parent_text: str, candidate_text: str) -> float:
        from deduplication import token_overlap_variance
        return token_overlap_variance(parent_text, candidate_text)


class LLMNoveltyChecker(NoveltyChecker):
    """LLM-based novelty scorer using an Anthropic-compatible API.

    The model is asked to return a JSON object with a single 'novelty' field
    in [0, 1] representing how much of the candidate is genuinely new
    analysis vs. repetition of the parent.
    """

    _SYSTEM = (
        "You are an immigration-policy analyst. Compare a candidate article "
        "to a parent article. Return a single JSON object with a 'novelty' "
        "field (a number 0.0–1.0) representing the fraction of the "
        "candidate's text that adds genuinely new analysis vs. merely "
        "repeating facts from the parent. 0 = pure duplicate, 1 = fully new."
    )

    def __init__(self, config: Config) -> None:
        if not config.llm_api_key:
            raise ValueError("LLM_API_KEY required for LLMNoveltyChecker")
        self.config = config
        self._client = httpx.Client(
            base_url=config.llm_base_url,
            headers={
                "x-api-key": config.llm_api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )

    def novelty(self, parent_text: str, candidate_text: str) -> float:
        prompt = (
            "Parent article:\n"
            f"{parent_text[:2000]}\n\n"
            "Candidate article:\n"
            f"{candidate_text[:2000]}"
        )
        try:
            resp = self._client.post(
                "/v1/messages",
                json={
                    "model": self.config.llm_model,
                    "max_tokens": 64,
                    "system": self._SYSTEM,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            resp.raise_for_status()
            data = resp.json()
            text = data.get("content", [{}])[0].get("text", "")
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if not match:
                return 0.0
            obj = json.loads(match.group(0))
            val = float(obj.get("novelty", 0.0))
            return max(0.0, min(1.0, val))
        except Exception as exc:  # noqa: BLE001
            logger.warning("LLM novelty check failed: %s", exc)
            return 0.0


def build_novelty_checker(config: Config) -> NoveltyChecker:
    if config.fifty_percent_provider == "llm" and config.llm_api_key:
        return LLMNoveltyChecker(config)
    return TokenOverlapNovelty()


__all__ = [
    "Tagger",
    "KeywordTagger",
    "LLMTagger",
    "TagResult",
    "NoveltyChecker",
    "TokenOverlapNovelty",
    "LLMNoveltyChecker",
    "build_tagger",
    "build_novelty_checker",
    "FEATURE_TAGS",
]