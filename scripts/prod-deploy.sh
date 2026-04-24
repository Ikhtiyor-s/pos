#!/usr/bin/env bash
# =============================================================================
# prod-deploy.sh — Oshxona POS: PRODUCTION SERVERDA BIR BUYRUQLI DEPLOY
#
# ISHLATISH (serverda):
#   bash scripts/prod-deploy.sh
#   bash scripts/prod-deploy.sh v1.2.3        # muayyan versiya
#   bash scripts/prod-deploy.sh latest --skip-backup  # backup'siz
#
# Bu skript HAMMA narsani qiladi:
#   1. Oldingi versiyani saqlash (rollback uchun)
#   2. Ma'lumotlar bazasi backup
#   3. Yangi kod/image yuklash
#   4. Migration
#   5. Servislarni qayta ishga tushirish
#   6. Health check
#   7. Xato bo'lsa — avtomatik rollback
# =============================================================================

set -euo pipefail

# ─── Sozlamalar ───────────────────────────────────────────────────────────────
TAG="${1:-latest}"
SKIP_BACKUP="${2:-}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/oshxona-pos}"
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/health}"
HEALTH_RETRY=8
HEALTH_DELAY=10

ROLLBACK_FILE="/tmp/oshxona-rollback-tag"

# ─── Ranglar ──────────────────────────────────────────────────────────────────
R='\033[0;31m' G='\033[0;32m' Y='\033[1;33m' B='\033[0;34m' C='\033[0;36m' NC='\033[0m'
BOLD='\033[1m'

ok()    { echo -e "${G}[$(date '+%H:%M:%S')] ✅  $*${NC}"; }
info()  { echo -e "${B}[$(date '+%H:%M:%S')] ➜   $*${NC}"; }
warn()  { echo -e "${Y}[$(date '+%H:%M:%S')] ⚠️   $*${NC}"; }
step()  { echo -e "\n${BOLD}${C}━━━ $* ━━━${NC}"; }
die()   {
  echo -e "${R}[$(date '+%H:%M:%S')] ❌  XATO: $*${NC}" >&2
  echo ""
  echo -e "${Y}  Rollback boshlanmoqda...${NC}"
  do_rollback
  exit 1
}

# ─── Rollback funksiyasi ──────────────────────────────────────────────────────
do_rollback() {
  if [[ ! -f "$ROLLBACK_FILE" ]]; then
    warn "Rollback tag topilmadi — rollback mumkin emas"
    return
  fi

  PREV_TAG=$(cat "$ROLLBACK_FILE")
  warn "Oldingi versiyaga qaytilmoqda: $PREV_TAG"

  cd "$DEPLOY_PATH/docker"
  BACKEND_TAG="$PREV_TAG" FRONTEND_TAG="$PREV_TAG" \
    docker compose -f docker-compose.prod.yml up -d --no-deps backend pos 2>&1 | tail -3

  sleep 8

  if curl -sf "$HEALTH_URL" &>/dev/null; then
    ok "Rollback muvaffaqiyatli: $PREV_TAG"
  else
    warn "Rollback ham muvaffaqiyatsiz. Qo'lda tekshiring!"
  fi
}

# ─── Ishga tushirish ─────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║     OSHXONA POS — Production Deploy                  ║${NC}"
echo -e "${BOLD}║     Tag: $TAG$(printf '%*s' $((42 - ${#TAG})) '')║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"

[[ ! -d "$DEPLOY_PATH" ]] && die "Deploy papkasi topilmadi: $DEPLOY_PATH"
cd "$DEPLOY_PATH"

# .env tekshirish
[[ ! -f "apps/api/.env" ]] && die ".env fayli topilmadi: $DEPLOY_PATH/apps/api/.env"
export $(grep -v '^#' apps/api/.env | grep -v '^$' | xargs) 2>/dev/null || true

PRISMA="$DEPLOY_PATH/node_modules/.bin/prisma"
SCHEMA="$DEPLOY_PATH/packages/database/prisma/schema.prisma"

# ─── 1. Joriy versiyani saqlash ───────────────────────────────────────────────
step "1/7 — Joriy versiya saqlanmoqda"

CURRENT_TAG=$(docker inspect --format='{{index .Config.Image}}' oshxona-backend 2>/dev/null | \
  grep -oP ':[^:]+$' | tr -d ':' || echo "unknown")
echo "$CURRENT_TAG" > "$ROLLBACK_FILE"
ok "Rollback tag saqlandi: $CURRENT_TAG → /tmp"

# ─── 2. Database backup ───────────────────────────────────────────────────────
step "2/7 — Database backup"

if [[ "$SKIP_BACKUP" == "--skip-backup" ]]; then
  warn "Backup o'tkazib yuborildi (--skip-backup)"
else
  mkdir -p "$DEPLOY_PATH/backups"
  BFILE="$DEPLOY_PATH/backups/pre-deploy-$(date +%Y%m%d_%H%M%S).sql.gz"
  info "Backup olinmoqda: $BFILE"

  DB_USER=$(echo "$DATABASE_URL" | grep -oP '://\K[^:]+')
  DB_PASS=$(echo "$DATABASE_URL" | grep -oP '://[^:]+:\K[^@]+')
  DB_HOST=$(echo "$DATABASE_URL" | grep -oP '@\K[^:/]+')
  DB_PORT=$(echo "$DATABASE_URL" | grep -oP '@[^:]+:\K[0-9]+' || echo "5432")
  DB_NAME=$(echo "$DATABASE_URL" | grep -oP '/\K[^?]+$')

  PGPASSWORD="$DB_PASS" pg_dump \
    --host="$DB_HOST" --port="$DB_PORT" \
    --username="$DB_USER" --dbname="$DB_NAME" \
    --no-password --format=plain 2>/dev/null | gzip > "$BFILE"

  BSIZE=$(du -sh "$BFILE" | cut -f1)
  ok "Backup tayyor: $(basename $BFILE) ($BSIZE)"

  # 7 kundan eski backuplarni o'chirish
  find "$DEPLOY_PATH/backups" -name "pre-deploy-*.sql.gz" -mtime +7 -delete 2>/dev/null || true
fi

# ─── 3. Yangi image yuklash ───────────────────────────────────────────────────
step "3/7 — Yangi Docker image"

REGISTRY="${DOCKER_REGISTRY:-ghcr.io}"
OWNER="${GITHUB_REPO_OWNER:-$(whoami)}"
BACKEND_IMAGE="${BACKEND_IMAGE:-${REGISTRY}/${OWNER}/oshxona-pos/backend}"
FRONTEND_IMAGE="${FRONTEND_IMAGE:-${REGISTRY}/${OWNER}/oshxona-pos/frontend}"

info "Backend image: ${BACKEND_IMAGE}:${TAG}"
docker pull "${BACKEND_IMAGE}:${TAG}" 2>&1 | grep -E "Pull|Status|Already" || true

info "Frontend image: ${FRONTEND_IMAGE}:${TAG}"
docker pull "${FRONTEND_IMAGE}:${TAG}" 2>&1 | grep -E "Pull|Status|Already" || true
ok "Image'lar yuklab olindi"

# ─── 4. Prisma generate ───────────────────────────────────────────────────────
step "4/7 — Prisma generate"

if [[ -f "$PRISMA" ]]; then
  "$PRISMA" generate --schema="$SCHEMA" 2>&1 | grep -E "Generated|warn" || true
  ok "Prisma client yangilandi"
else
  warn "prisma topilmadi — docker exec orqali ishlaydi"
fi

# ─── 5. Migration ─────────────────────────────────────────────────────────────
step "5/7 — Database migration"

info "Migrationlar qo'llanmoqda..."

# Docker container ichida migration ishlatish (container prisma'ga ega)
if docker ps --format '{{.Names}}' | grep -q "oshxona-backend"; then
  MIGRATE_OUTPUT=$(docker exec oshxona-backend sh -c \
    "npx prisma migrate deploy --schema=../../packages/database/prisma/schema.prisma" \
    2>&1 || true)
elif [[ -f "$PRISMA" ]]; then
  MIGRATE_OUTPUT=$("$PRISMA" migrate deploy --schema="$SCHEMA" 2>&1 || true)
else
  MIGRATE_OUTPUT="prisma topilmadi, migration o'tkazilmadi"
fi

if echo "$MIGRATE_OUTPUT" | grep -qiE "error|fail"; then
  # Migration xatosi → rollback
  warn "Migration xatosi:"
  echo "$MIGRATE_OUTPUT" | grep -iE "error|fail" | head -5
  die "Migration muvaffaqiyatsiz"
fi

ok "Migration muvaffaqiyatli"

# ─── 6. Container'larni yangilash ─────────────────────────────────────────────
step "6/7 — Servislar qayta ishga tushirilmoqda"

cp "apps/api/.env" "docker/.env" 2>/dev/null || true
cd docker

BACKEND_TAG="$TAG" FRONTEND_TAG="$TAG" \
  docker compose -f docker-compose.prod.yml up -d \
  --no-deps --remove-orphans backend pos 2>&1 | \
  grep -E "Starting|Recreating|Running|Created" || true

cd "$DEPLOY_PATH"

info "Servislar tayyor bo'lishini kutish..."
sleep 15

# ─── 7. Health check ─────────────────────────────────────────────────────────
step "7/7 — Health check"

SUCCESS=false
for i in $(seq 1 $HEALTH_RETRY); do
  info "Urinish $i/$HEALTH_RETRY — $HEALTH_URL"
  HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")

  if [[ "$HTTP_CODE" == "200" ]]; then
    SUCCESS=true
    break
  fi

  [[ $i -lt $HEALTH_RETRY ]] && sleep $HEALTH_DELAY
done

if [[ "$SUCCESS" == "true" ]]; then
  echo ""
  echo -e "${BOLD}${G}╔══════════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${G}║   ✅  DEPLOY MUVAFFAQIYATLI — v${TAG}$(printf '%*s' $((35 - ${#TAG})) '')║${NC}"
  echo -e "${BOLD}${G}╚══════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${B}  API:${NC}     $HEALTH_URL"
  echo -e "${B}  Rollback:${NC} bash scripts/prod-deploy.sh $CURRENT_TAG"
  echo ""
  rm -f "$ROLLBACK_FILE"
else
  die "Health check muvaffaqiyatsiz ($HEALTH_RETRY urinishdan keyin)"
fi
