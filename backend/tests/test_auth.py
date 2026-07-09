"""Tests for Bearer token authentication middleware."""

import os

import pytest

# Set the test token before importing app modules
os.environ["DASHBOARD_API_TOKEN"] = "test-secret-token"

from tests.conftest import TEST_TOKEN


class TestAuthentication:
    """IT-001-TC-001: Token-Based Authentication Middleware."""

    async def test_no_auth_header_returns_401(self, unauth_client):
        """Request with no Authorization header returns 401."""
        resp = await unauth_client.get("/api/news")
        assert resp.status_code == 401

    async def test_invalid_token_returns_401(self, unauth_client):
        """Request with wrong Bearer token returns 401."""
        resp = await unauth_client.get(
            "/api/news",
            headers={"Authorization": "Bearer wrong_token"},
        )
        assert resp.status_code == 401

    async def test_valid_token_returns_200(self, unauth_client):
        """Request with valid Bearer token returns 200."""
        from app.config import settings
        settings.DASHBOARD_API_TOKEN = TEST_TOKEN
        resp = await unauth_client.get(
            "/api/news",
            headers={"Authorization": f"Bearer {TEST_TOKEN}"},
        )
        assert resp.status_code == 200

