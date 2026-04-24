#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Serverdagi deploy script
# Ishlatish: ./scripts/deploy.sh <image_tag>
# =============================================================================
set -euo pipefail

IMAGE_TAG="${1:-latest}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/oshxona-pos}"
BACKEND_IMAGE="${BACKEND_IMAGE:-ghcr.io/OWNER/oshxona-pos/backend}"
FRONTEND_IMAGE="${FRONTEND_IMAGE:-ghcr.io/OWNER/oshxona-pos/frontend}"
HEALTH_URL="${HEALTH_CHECK_URL:-http://localhost:3000}/health"
HEALTH_MAX_RETRY=6
HEALTH_DELAY=10

# ──────────────────────────────────────────────────────────────────────────────
log()  { echo "[$(date '+%H:%M:%S')] $*"; }
ok()   { echo "[$(date '+%H:%M:%S')] ✅ $*"; }
warn() { echo "[$(date '+%H:%M:%S')] ⚠️  $*" >&2; }
fail() { echo "[$(date '+%H:%M:%S')] ❌ $*" >&2; exit 1; }

# ──────────────────────────────────────────────────────────────────────────────
cd "$DEPLOY_PATH"

log "Deploy boshlandi: tag=${IMAGE_TAG}"

# 1. Joriy imageni saqlash
PREV_BACKEND=$(docker inspect oshxona-backend \
  --format='{{.Config.Image}}' 2>/dev/null || echo "none")
PREV_FRONTEND=$(docker inspect oshxona-pos \
  --format='{{.Config.Image}}' 2>/dev/null || echo "none")
echo "$PREV_BACKEND"  > /tmp/oshxona_prev_backend
echo "$PREV_FRONTEND" > /tmp/oshxona_prev_frontend
log "Oldingi: backend=$PREV_BACKEND, frontend=$PREV_FRONTEND"

# 2. Pull
log "Imaglar pull qilinmoqda..."
docker pull "${BACKEND_IMAGE}:${IMAGE_TAG}"
docker pull "${FRONTEND_IMAGE}:${IMAGE_TAG}"

# 3. Up
log "Containerlar yangilanmoqda..."
BACKEND_TAG="$IMAGE_TAG" FRONTEND_TAG="$IMAGE_TAG" \
  docker compose -f docker-compose.prod.yml up -d \
    --no-deps --remove-orphans backend pos

# 4. Migrate
log "Prisma migrate deploy..."
docker exec oshxona-backend sh -c \
  "npx prisma migrate deploy \
   --schema=../../packages/database/prisma/schema.prisma 2>&1 || \
   npx prisma db push --schema=../../packages/database/prisma/schema.prisma 2>&1"

# 5. Health check
log "Health check: $HEALTH_URL"
SUCCESS=0
for i in $(seq 1 "$HEALTH_MAX_RETRY"); do
  STATUS=$(curl -sf -o /dev/null -w "%{http_code}" \
    --max-time 10 "$HEALTH_URL" 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then
    ok "Health OK (urinish $i)"
    SUCCESS=1
    break
  fi
  warn "HTTP $STATUS — ${HEALTH_DELAY}s kutilmoqda... ($i/$HEALTH_MAX_RETRY)"
  sleep "$HEALTH_DELAY"
done

# 6. Rollback agar kerak bo'lsa
if [ "$SUCCESS" = "0" ]; then
  warn "Health check muvaffaqiyatsiz — rollback..."
  ./scripts/rollback.sh
  fail "Deploy muvaffaqiyatsiz, rollback bajarildi"
fi

# 7. Eski imaglarni tozalash
log "Eski Docker imaglarini tozalash..."
docker image prune -f --filter "until=24h" 2>/dev/null || true

ok "Deploy yakunlandi: ${IMAGE_TAG}"
