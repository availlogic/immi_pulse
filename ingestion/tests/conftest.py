"""Pytest configuration / fixtures."""

from __future__ import annotations

import os

import pytest


@pytest.fixture(scope="session", autouse=True)
def env_setup() -> None:
    os.environ.setdefault(
        "DATABASE_URL",
        "postgres://immipulse:immipulse_dev@localhost:5432/immipulse",
    )
    os.environ.setdefault("EMBEDDING_PROVIDER", "mock")
    os.environ.setdefault("FIFTY_PERCENT_PROVIDER", "token_overlap")