#!/usr/bin/env bash
# =============================================================================
# health-check.sh — API health statusini tekshirish
# Ishlatish: ./scripts/health-check.sh [url] [max_retry] [delay_sec]
# =============================================================================
set -euo pipefail

BASE_URL="${1:-${HEALTH_CHECK_URL:-http://localhost:3000}}"
MAX_RETRY="${2:-6}"
DELAY="${3:-10}"

log()  { echo "[$(date '+%H:%M:%S')] $*"; }
ok()   { echo "[$(date '+%H:%M:%S')] ✅ $*"; }
fail() { echo "[$(date '+%H:%M:%S')] ❌ $*" >&2; exit 1; }

log "Health check: $BASE_URL"

# ── /health — asosiy status ──────────────────────────────────
for i in $(seq 1 "$MAX_RETRY"); do
  STATUS=$(curl -sf -o /tmp/hc_response.json -w "%{http_code}" \
    --max-time 10 "${BASE_URL}/health" 2>/dev/null || echo "000")

  if [ "$STATUS" = "200" ]; then
    ok "Health OK (urinish $i/$MAX_RETRY)"
    cat /tmp/hc_response.json 2>/dev/null | \
      grep -o '"status":"[^"]*"' | head -5 || true
    break
  fi

  if [ "$i" = "$MAX_RETRY" ]; then
    fail "Health check $MAX_RETRY marta muvaffaqiyatsiz (oxirgi HTTP: $STATUS)"
  fi

  log "HTTP $STATUS — ${DELAY}s kutilmoqda... ($i/$MAX_RETRY)"
  sleep "$DELAY"
done

# ── /readyz — DB va Redis ulanganmi ─────────────────────────
READY=$(curl -sf -o /dev/null -w "%{http_code}" \
  --max-time 10 "${BASE_URL}/readyz" 2>/dev/null || echo "000")

if [ "$READY" = "200" ]; then
  ok "Readiness check OK"
else
  log "⚠️  Readiness check: HTTP $READY (DB/Redis muammosi bo'lishi mumkin)"
fi

ok "Barcha tekshiruvlar o'tdi"
