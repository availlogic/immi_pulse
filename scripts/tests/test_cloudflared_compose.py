"""Stage 5.1.5: Integration test for the `tunnel-disabled` Cloudflare mode.

When CLOUDFLARE_TUNNEL_TOKEN is empty, the cloudflared container should
exit cleanly without affecting the rest of the stack. The api-gateway
port remains the only backend ingress.

This test verifies the behavior at the service level by checking that
the cloudflared service definition in `docker-compose.yml` is configured
to use the `tunnel-disabled` fallback path.
"""

from __future__ import annotations

import os
import re
import subprocess
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parents[2]
COMPOSE_FILE = REPO_ROOT / "docker-compose.yml"
PROD_COMPOSE_FILE = REPO_ROOT / "docker-compose.prod.yml"
CLOUDFLARED_CONFIG = REPO_ROOT / "docker" / "cloudflared" / "config.yml"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_cloudflared_service_is_defined_in_compose():
    text = _read(COMPOSE_FILE)
    assert "cloudflared:" in text, "cloudflared service must be defined in docker-compose.yml"
    assert "cloudflare/cloudflared" in text, "must use the official cloudflared image"


def test_cloudflared_uses_no_autoupdate_in_compose():
    """Per Architecture.md §2: cloudflared runs as a sidecar with stable config."""
    text = _read(COMPOSE_FILE)
    # Find the cloudflared service block.
    match = re.search(r"cloudflared:.*?(?=\n  \w+:|\nvolumes:|\Z)", text, re.DOTALL)
    assert match, "cloudflared service block not found"
    block = match.group(0)
    assert "--no-autoupdate" in block, "cloudflared must pin no-autoupdate for reproducible runs"


def test_cloudflared_disabled_when_token_empty():
    """With TUNNEL_TOKEN empty, cloudflared falls back to no-op tunnel mode.

    The service is annotated `restart: no` so it does not loop forever.
    Operators set the token to enable the tunnel.
    """
    text = _read(COMPOSE_FILE)
    match = re.search(r"cloudflared:.*?(?=\n  \w+:|\nvolumes:|\Z)", text, re.DOTALL)
    assert match
    block = match.group(0)
    # Either the default uses an empty token + restart:no, or the prod overlay
    # has a profile. We assert that the *default* (docker-compose.yml) does
    # not pin a token value and does not restart on failure.
    assert 'TUNNEL_TOKEN: "${CLOUDFLARE_TUNNEL_TOKEN:-}"' in block
    assert 'restart: "no"' in block


def test_prod_overlay_removes_db_host_port():
    """Per Architecture.md §5: production exposes only the api-gateway port
    via cloudflared, never the database directly."""
    text = _read(PROD_COMPOSE_FILE)
    # The db service in the prod overlay must have an empty ports list.
    assert "db:" in text
    # Crude: ensure the prod overlay mentions `ports: []` for db.
    assert re.search(r"db:[\s\S]*?ports:\s*\[\s*\]", text), (
        "prod overlay must empty out db ports"
    )


def test_prod_overlay_enables_secure_cookies():
    text = _read(PROD_COMPOSE_FILE)
    assert "COOKIE_SECURE: \"true\"" in text
    assert "CONSENT_REQUIRED: \"true\"" in text
    assert "NODE_ENV: production" in text


def test_cloudflared_config_has_ingress_rules():
    """The committed config must declare both hostnames and an upstream service."""
    text = _read(CLOUDFLARED_CONFIG)
    assert "ingress:" in text
    assert "api.immipulse.com" in text
    assert "http://api-gateway:3000" in text
    assert "http_status:404" in text  # catch-all 404 for unmatched hostnames


def test_cloudflared_disabled_mode_does_not_block_dev_stack():
    """Smoke-check: the dev stack starts and stays up with the cloudflared
    service in tunnel-disabled mode (TUNNEL_TOKEN empty).
    """
    if os.environ.get("SKIP_DOCKER_TESTS"):
        pytest.skip("SKIP_DOCKER_TESTS set; skipping live docker check")

    # The container is expected to be in `exited` state (or absent); never
    # `restarting`. The other containers must be `running` or `healthy`.
    result = subprocess.run(
        ["docker", "compose", "-f", str(COMPOSE_FILE), "ps", "--format", "json"],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        timeout=30,
    )
    if result.returncode != 0:
        pytest.skip(f"docker compose ps failed: {result.stderr}")

    import json as jsonlib

    # `docker compose ps --format json` emits one JSON object per line.
    services = [jsonlib.loads(line) for line in result.stdout.splitlines() if line.strip()]
    states = {s.get("Service", s.get("Name")): s.get("State") for s in services}
    # The api-gateway and db must be healthy/running; cloudflared may be
    # `exited` (tunnel-disabled) but must NOT be `restarting`.
    assert states.get("api-gateway") in {"running", "healthy"}, (
        f"api-gateway is not running: {states.get('api-gateway')}"
    )
    assert states.get("db") in {"running", "healthy"}, f"db is not healthy: {states.get('db')}"
    cf_state = states.get("cloudflared")
    if cf_state is not None:
        assert cf_state != "restarting", (
            f"cloudflared is in a restart loop: {cf_state}"
        )