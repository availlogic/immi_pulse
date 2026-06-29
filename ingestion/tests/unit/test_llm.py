"""Unit tests for the LLM tagger and novelty checker (Stage 4.8, 4.9).

These tests do NOT require LLM_API_KEY. They use a mocked httpx transport
that records requests and returns pre-canned JSON responses, exercising
the full prompt construction and response parsing code paths.
"""

from __future__ import annotations

import json
import sys
import types

import pytest

# Stub httpx before importing the llm module so that LLMTagger() can be
# instantiated without making real HTTP calls.


class _MockResponse:
    def __init__(self, json_data: dict) -> None:
        self._json = json_data
        self.status_code = 200

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return self._json


class _MockClient:
    def __init__(self, response_json: dict) -> None:
        self.response = response_json
        self.calls: list[dict] = []

    def post(self, path: str, json: dict) -> _MockResponse:
        self.calls.append({"path": path, "payload": json})
        return _MockResponse(self.response)


def _make_config():
    from config import Config

    return Config(
        database_url="postgres://x",
        embedding_provider="mock",
        openai_api_key=None,
        openai_model="text-embedding-3-large",
        fifty_percent_provider="token_overlap",
        llm_api_key="sk-test-1234",
        llm_base_url="https://api.example.com",
        llm_model="claude-3-5-haiku-latest",
        llm_review_threshold=0.85,
        scraper_interval_hours=24,
        ttl_days=60,
        similarity_threshold=0.88,
    )


def test_keyword_tagger_assigns_feature_tags():
    from llm import KeywordTagger, FEATURE_TAGS

    tagger = KeywordTagger()
    result = tagger.tag(
        title="H-1B salary threshold increased for employers",
        body="The USCIS raised the salary threshold for H-1B petitions effective immediately.",
        declared_jurisdiction="US",
    )
    assert result.jurisdiction == "US"
    assert "Corporate Sponsorship" in result.feature_tags
    assert result.confidence > 0.0


def test_keyword_tagger_returns_empty_for_unrelated_text():
    from llm import KeywordTagger

    tagger = KeywordTagger()
    result = tagger.tag(
        title="Generic news article about weather",
        body="It rained today in the city.",
        declared_jurisdiction="US",
    )
    assert result.feature_tags == []


def test_llm_tagger_parses_valid_response():
    from llm import LLMTagger, FEATURE_TAGS

    cfg = _make_config()
    tagger = LLMTagger(cfg)
    tagger._client = _MockClient(  # type: ignore[assignment]
        {
            "content": [
                {
                    "text": json.dumps(
                        {
                            "jurisdiction": "GB",
                            "feature_tags": ["Corporate Sponsorship"],
                            "confidence": 0.92,
                        }
                    )
                }
            ]
        }
    )
    result = tagger.tag(
        title="UK Skilled Worker visa threshold raised",
        body="The Home Office raised the salary threshold.",
        declared_jurisdiction="GB",
    )
    assert result.jurisdiction == "GB"
    assert result.feature_tags == ["Corporate Sponsorship"]
    assert result.confidence == 0.92
    assert len(tagger._client.calls) == 1  # type: ignore[attr-defined]
    call = tagger._client.calls[0]  # type: ignore[attr-defined]
    assert call["path"] == "/v1/messages"
    assert call["payload"]["model"] == "claude-3-5-haiku-latest"
    # The system prompt should mention FEATURE_TAGS.
    assert any(t in call["payload"]["system"] for t in FEATURE_TAGS)


def test_llm_tagger_clamps_confidence_to_0_1_range():
    from llm import LLMTagger

    cfg = _make_config()
    tagger = LLMTagger(cfg)
    tagger._client = _MockClient(  # type: ignore[assignment]
        {
            "content": [
                {
                    "text": json.dumps(
                        {
                            "jurisdiction": "US",
                            "feature_tags": [],
                            "confidence": 5.0,  # out of range
                        }
                    )
                }
            ]
        }
    )
    result = tagger.tag(title="Anything", body="", declared_jurisdiction="US")
    assert result.confidence == 1.0


def test_llm_tagger_falls_back_on_malformed_response():
    from llm import LLMTagger

    cfg = _make_config()
    tagger = LLMTagger(cfg)
    tagger._client = _MockClient(  # type: ignore[assignment]
        {"content": [{"text": "no json here"}]}
    )
    result = tagger.tag(title="Anything", body="", declared_jurisdiction="US")
    assert result.jurisdiction == "US"  # falls back to declared
    assert result.feature_tags == []
    assert result.confidence == 0.0


def test_build_tagger_uses_keyword_without_api_key():
    from config import Config
    from llm import KeywordTagger, build_tagger

    cfg = Config(
        database_url="postgres://x",
        embedding_provider="mock",
        openai_api_key=None,
        openai_model="x",
        fifty_percent_provider="token_overlap",
        llm_api_key=None,
        llm_base_url="https://x",
        llm_model="x",
        llm_review_threshold=0.85,
        scraper_interval_hours=24,
        ttl_days=60,
        similarity_threshold=0.88,
    )
    tagger = build_tagger(cfg)
    assert isinstance(tagger, KeywordTagger)


def test_build_tagger_uses_llm_with_api_key():
    from llm import LLMTagger, build_tagger

    cfg = _make_config()
    tagger = build_tagger(cfg)
    assert isinstance(tagger, LLMTagger)


def test_llm_novelty_checker_parses_response():
    from llm import LLMNoveltyChecker

    cfg = _make_config()
    checker = LLMNoveltyChecker(cfg)
    checker._client = _MockClient(  # type: ignore[assignment]
        {
            "content": [
                {"text": json.dumps({"novelty": 0.78})}
            ]
        }
    )
    val = checker.novelty("Parent article text", "Candidate article text")
    assert val == 0.78


def test_llm_novelty_checker_clamps_to_0_1_range():
    from llm import LLMNoveltyChecker

    cfg = _make_config()
    checker = LLMNoveltyChecker(cfg)
    checker._client = _MockClient(  # type: ignore[assignment]
        {
            "content": [
                {"text": json.dumps({"novelty": -0.5})}
            ]
        }
    )
    val = checker.novelty("Parent", "Candidate")
    assert val == 0.0


def test_token_overlap_novelty_baseline():
    from llm import TokenOverlapNovelty

    checker = TokenOverlapNovelty()
    # Identical text → 0 novelty.
    assert checker.novelty("Canada Express Entry draw", "Canada Express Entry draw") == 0.0
    # Fully different → 1.0 novelty.
    assert checker.novelty("apple banana cherry", "delta echo foxtrot") == 1.0