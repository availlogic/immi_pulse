#!/usr/bin/env bash
# ImmiPulse smoke test - runs against a fully up Docker Compose stack.
# Usage: ./scripts/smoke.sh
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:3000/api/v1}"
echo "=== ImmiPulse smoke test ==="
echo "API base: $API_BASE"

step() { echo; echo "--- $1 ---"; }

step "Health check"
curl -fsS http://localhost:3000/health | python3 -m json.tool

step "Guest feed (≤10 items, ≤2 per jurisdiction)"
FEED=$(curl -fsS "$API_BASE/feed?limit=10")
echo "$FEED" | python3 -c "
import json, sys
from collections import Counter
d = json.load(sys.stdin)
arts = d['data']['articles']
assert len(arts) <= 10, f'expected ≤10 articles, got {len(arts)}'
counts = Counter(a['origin_jurisdiction'] for a in arts)
for j, c in counts.items():
    assert c <= 2, f'jurisdiction {j} has {c} items, max 2'
print(f'OK: {len(arts)} articles, max per jurisdiction = {max(counts.values()) if counts else 0}')
"

step "Signup + login"
EMAIL="smoke_$(date +%s)@example.com"
SIGNUP=$(curl -fsS -X POST "$API_BASE/auth/signup" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Smoke1234!\"}")
echo "$SIGNUP" | python3 -m json.tool
USER_ID=$(echo "$SIGNUP" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['user_id'])")

LOGIN=$(curl -fsS -X POST "$API_BASE/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Smoke1234!\"}")
TOKEN=$(echo "$LOGIN" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['token'])")
echo "OK: user_id=$USER_ID, token=${TOKEN:0:30}..."

step "Protected route without token (expect 401)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/user/preferences")
[ "$HTTP_CODE" = "401" ] && echo "OK: 401 returned" || { echo "FAIL: expected 401, got $HTTP_CODE"; exit 1; }

step "Set preferences"
curl -fsS -X PUT "$API_BASE/user/preferences" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"preferred_jurisdictions":["US","CA"],"preferred_tags":["Education"],"digest_frequency":"none"}' | python3 -m json.tool

step "Personalized feed"
curl -fsS "$API_BASE/feed?limit=10" -H "Authorization: Bearer $TOKEN" | python3 -c "
import json, sys
from collections import Counter
d = json.load(sys.stdin)
arts = d['data']['articles']
counts = Counter(a['origin_jurisdiction'] for a in arts)
print(f'OK: personalized feed returned {len(arts)} articles')
for j, c in counts.items():
    print(f'  {j}: {c}')
for c in counts.values():
    assert c <= 2
print('Diversity constraint: OK')
"

step "MailHog reachable"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8025/)
[ "$HTTP_CODE" = "200" ] && echo "OK: MailHog responding" || { echo "WARN: MailHog not responding ($HTTP_CODE)"; }

step "Admin endpoint (expect 403 for basic user)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/admin/health" -H "Authorization: Bearer $TOKEN")
[ "$HTTP_CODE" = "403" ] && echo "OK: 403 returned for non-admin" || { echo "FAIL: expected 403, got $HTTP_CODE"; exit 1; }

echo
echo "=== Smoke test passed ==="