"""Unit tests for the embedding mock + pluggable factory."""

from __future__ import annotations

import math

import pytest

from embeddings import (
    EMBEDDING_DIM,
    MockEmbeddingClient,
    build_embedding_client,
)


def test_mock_embedding_is_3072_dim():
    v = MockEmbeddingClient().embed("hello world")
    assert len(v) == EMBEDDING_DIM


def test_mock_embedding_is_unit_vector():
    v = MockEmbeddingClient().embed("hello world")
    norm = math.sqrt(sum(x * x for x in v))
    assert abs(norm - 1.0) < 1e-9


def test_mock_embedding_is_deterministic():
    a = MockEmbeddingClient().embed("identical input")
    b = MockEmbeddingClient().embed("identical input")
    assert a == b


def test_mock_embedding_different_text_yields_different_vector():
    a = MockEmbeddingClient().embed("Canada Express Entry draw")
    b = MockEmbeddingClient().embed("Germany Opportunity Card launch")
    assert a != b


def test_build_embedding_client_mock():
    c = build_embedding_client("mock", openai_api_key=None, openai_model="x")
    assert isinstance(c, MockEmbeddingClient)


def test_build_embedding_client_openai_requires_key():
    with pytest.raises(ValueError):
        build_embedding_client("openai", openai_api_key=None, openai_model="x")


def test_build_embedding_client_openai_with_key_returns_stub():
    c = build_embedding_client("openai", openai_api_key="sk-test", openai_model="text-embedding-3-large")
    assert c.__class__.__name__ == "OpenAIEmbeddingClient"


def test_build_embedding_client_unknown_raises():
    with pytest.raises(ValueError):
        build_embedding_client("unknown", openai_api_key=None, openai_model="x")


def test_mock_embedding_handles_unicode():
    v = MockEmbeddingClient().embed("日本 韩国 中国")
    assert len(v) == EMBEDDING_DIM
    norm = math.sqrt(sum(x * x for x in v))
    assert abs(norm - 1.0) < 1e-9


def test_mock_embedding_handles_empty_string():
    v = MockEmbeddingClient().embed("")
    assert len(v) == EMBEDDING_DIM