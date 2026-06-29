"""Embedding client interface and pluggable providers.

The OpenAI provider is a stub: it requires the official `openai` package at
runtime and is only used when EMBEDDING_PROVIDER=openai AND OPENAI_API_KEY is set.
In development and CI we default to the deterministic mock provider so tests
do not require external network access or API keys.

The mock provider produces vectors that are semantically meaningful at the
token-overlap level: two texts sharing many tokens will have a high cosine
similarity. This is what allows the dedup tests to exercise the
"≥0.88 similarity → run 50% Difference check" pathway without an external API.
"""

from __future__ import annotations

import abc
import hashlib
import math
import re

import numpy as np

EMBEDDING_DIM = 3072

_TOKEN_RE = re.compile(r"[\w']+", re.UNICODE)


class EmbeddingClient(abc.ABC):
    @abc.abstractmethod
    def embed(self, text: str) -> list[float]:
        """Return a 3072-dim embedding vector."""

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return [self.embed(t) for t in texts]


def _tokenize(text: str) -> list[str]:
    return [t.lower() for t in _TOKEN_RE.findall(text or "")]


def _semantic_unit_vector(text: str, dim: int = EMBEDDING_DIM) -> list[float]:
    """Deterministic 3072-dim unit vector with semantic-like similarity.

    Each unique token in `text` is hashed to a small *bucket* of axes
    (not just one axis), so two texts that share many tokens accumulate
    weight on overlapping axes — yielding high cosine similarity even when
    the texts have very different lengths. This mimics the behavior of
    sparse / TF-IDF-style embeddings without depending on an external API.

    Two unrelated texts have near-orthogonal vectors; two texts sharing
    the same distinctive tokens (proper nouns, numbers, technical terms)
    have cosine similarity well above 0.88.
    """
    vec = np.zeros(dim, dtype=np.float64)
    if not text:
        return [0.0] * dim

    tokens = _tokenize(text)
    if not tokens:
        return [0.0] * dim

    # Weight by token rarity so distinctive terms dominate.
    from collections import Counter
    counts = Counter(tokens)
    n = len(tokens)

    for tok, c in counts.items():
        digest = hashlib.sha256(tok.encode("utf-8")).digest()
        # Each token gets 8 axes (a "bucket"), each with its own weight slot.
        # This is the key trick that gives meaningful cosine similarity:
        # overlapping distinctive tokens hit overlapping axes with strong weights.
        for slot in range(8):
            axis = int.from_bytes(digest[slot * 4 : slot * 4 + 4], "big") % dim
            # tf-idf-like weight: tokens that appear once get high weight;
            # common stopwords repeated many times contribute little.
            idf_like = 1.0 / (1.0 + c / max(1, n / 4))
            vec[axis] += 1.0 * idf_like

    norm = math.sqrt(float(np.dot(vec, vec)))
    if norm == 0:
        return [0.0] * dim
    return (vec / norm).tolist()


class MockEmbeddingClient(EmbeddingClient):
    """Deterministic, semantically-structured embedding provider."""

    def embed(self, text: str) -> list[float]:
        return _semantic_unit_vector(text or "")


class OpenAIEmbeddingClient(EmbeddingClient):
    """Real OpenAI client stub.

    Construction is lazy; the actual `openai` package is only imported if used.
    In test/dev we never instantiate this because EMBEDDING_PROVIDER defaults to mock.
    """

    def __init__(self, api_key: str, model: str = "text-embedding-3-large") -> None:
        self.api_key = api_key
        self.model = model

    def embed(self, text: str) -> list[float]:
        try:
            from openai import OpenAI  # type: ignore[import-not-found]
        except ImportError as exc:
            raise RuntimeError(
                "openai package not installed; install it or use EMBEDDING_PROVIDER=mock"
            ) from exc
        client = OpenAI(api_key=self.api_key)
        resp = client.embeddings.create(model=self.model, input=text)
        return list(resp.data[0].embedding)


def build_embedding_client(provider: str, *, openai_api_key: str | None, openai_model: str) -> EmbeddingClient:
    if provider == "openai":
        if not openai_api_key:
            raise ValueError("OPENAI_API_KEY required when EMBEDDING_PROVIDER=openai")
        return OpenAIEmbeddingClient(api_key=openai_api_key, model=openai_model)
    if provider == "mock":
        return MockEmbeddingClient()
    raise ValueError(f"Unknown EMBEDDING_PROVIDER: {provider}")