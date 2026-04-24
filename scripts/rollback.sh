#!/usr/bin/env bash
# =============================================================================
# rollback.sh — Oldingi versiyaga qaytish
# Ishlatish: ./scripts/rollback.sh [image_tag]
# Agar tag berilmasa, /tmp dan oxirgi saqlanganini oladi
# =============================================================================
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/opt/oshxona-pos}"
HEALTH_URL="${HEALTH_CHECK_URL:-http://localhost:3000}/health"

log()  { echo "[$(date '+%H:%M:%S')] $*"; }
ok()   { echo "[$(date '+%H:%M:%S')] ✅ $*"; }
fail() { echo "[$(date '+%H:%M:%S')] ❌ $*" >&2; exit 1; }

cd "$DEPLOY_PATH"

# Rollback qaysi versiyaga?
if [ -n "${1:-}" ]; then
  BACKEND_TAG="$1"
  FRONTEND_TAG="$1"
  BACKEND_IMAGE="${BACKEND_IMAGE:-ghcr.io/OWNER/oshxona-pos/backend}"
  FRONTEND_IMAGE="${FRONTEND_IMAGE:-ghcr.io/OWNER/oshxona-pos/frontend}"
  PREV_BACKEND="${BACKEND_IMAGE}:${BACKEND_TAG}"
  PREV_FRONTEND="${FRONTEND_IMAGE}:${FRONTEND_TAG}"
else
  # Oxirgi saqlanganidan olish
  PREV_BACKEND=$(cat /tmp/oshxona_prev_backend 2>/dev/null || echo "none")
  PREV_FRONTEND=$(cat /tmp/oshxona_prev_frontend 2>/dev/null || echo "none")
fi

if [ "$PREV_BACKEND" = "none" ] || [ -z "$PREV_BACKEND" ]; then
  fail "Rollback qilish uchun oldingi image topilmadi"
fi

log "Rollback: $PREV_BACKEND / $PREV_FRONTEND"

# Pull (agar lokal cache yo'q bo'lsa)
docker pull "$PREV_BACKEND"  2>/dev/null || log "Pull bajarilmadi, lokal image ishlatiladi"
docker pull "$PREV_FRONTEND" 2>/dev/null || log "Pull bajarilmadi, lokal image ishlatiladi"

# Tag extraction
B_TAG="${PREV_BACKEND##*:}"
F_TAG="${PREV_FRONTEND##*:}"

BACKEND_TAG="$B_TAG" FRONTEND_TAG="$F_TAG" \
  docker compose -f docker-compose.prod.yml up -d \
    --no-deps backend pos

# Health check after rollback
sleep 15
STATUS=$(curl -sf -o /dev/null -w "%{http_code}" \
  --max-time 10 "$HEALTH_URL" 2>/dev/null || echo "000")

if [ "$STATUS" = "200" ]; then
  ok "Rollback muvaffaqiyatli: $PREV_BACKEND"
else
  fail "Rollback bajarildi lekin health check o'tmadi (HTTP $STATUS)"
fi
