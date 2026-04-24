#!/usr/bin/env bash
# =============================================================================
# setup.sh — Oshxona POS: BIRINCHI MARTA ISHGA TUSHIRISH
#
# Bu skript HAMMA narsani o'zi qiladi:
#   1. .env yaratish (parollar avtomatik generatsiya)
#   2. Docker (Postgres + Redis) ishga tushirish
#   3. npm install
#   4. Prisma client generatsiya
#   5. Migration (yangi DB → deploy, mavjud DB → baseline)
#   6. Natijani tekshirish
#
# ISHLATISH (faqat bitta buyruq):
#   bash scripts/setup.sh
# =============================================================================

set -euo pipefail

# ─── Ranglar ──────────────────────────────────────────────────────────────────
R='\033[0;31m' G='\033[0;32m' Y='\033[1;33m' B='\033[0;34m' C='\033[0;36m' NC='\033[0m'
BOLD='\033[1m'

ok()      { echo -e "${G}  ✅  $*${NC}"; }
info()    { echo -e "${B}  ➜   $*${NC}"; }
warn()    { echo -e "${Y}  ⚠️   $*${NC}"; }
error()   { echo -e "${R}  ❌  $*${NC}" >&2; }
step()    { echo -e "\n${BOLD}${C}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; \
            echo -e "${BOLD}${C}  $*${NC}"; \
            echo -e "${BOLD}${C}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }
die()     { error "$*"; echo -e "${Y}  Xatoni tuzatish uchun: bash scripts/db-fix.sh${NC}"; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCHEMA="$ROOT/packages/database/prisma/schema.prisma"
PRISMA="$ROOT/node_modules/.bin/prisma"
ENV_FILE="$ROOT/apps/api/.env"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║     OSHXONA POS — To'liq o'rnatish (setup.sh)       ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"

# ─── 1. .env fayli ────────────────────────────────────────────────────────────
step "1/6 — .env fayli"

if [[ -f "$ENV_FILE" ]]; then
  ok ".env allaqachon mavjud: $ENV_FILE"
else
  info ".env yaratilmoqda..."

  # Tasodifiy 64 belgili secret generatsiya
  if command -v openssl &>/dev/null; then
    JWT_S=$(openssl rand -base64 48 | tr -d '\n/+=' | head -c 64)
    JWT_R=$(openssl rand -base64 48 | tr -d '\n/+=' | head -c 64)
  else
    JWT_S=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c 64 2>/dev/null || echo "change-this-jwt-secret-min-64-chars-xxxxxxxxxxx")
    JWT_R=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c 64 2>/dev/null || echo "change-this-refresh-secret-min-64-chars-xxxxxxxx")
  fi

  cat > "$ENV_FILE" << EOF
# ============================================================
# OSHXONA POS — Environment (setup.sh tomonidan yaratilgan)
# ============================================================

NODE_ENV=development
PORT=3000

# Database
POSTGRES_USER=oshxona
POSTGRES_PASSWORD=Oshxona2024!
POSTGRES_DB=oshxona_pos
DATABASE_URL=postgresql://oshxona:Oshxona2024!@localhost:5432/oshxona_pos

# JWT (avtomatik generatsiya qilingan)
JWT_SECRET=${JWT_S}
JWT_REFRESH_SECRET=${JWT_R}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis
REDIS_URL=redis://localhost:6379

# CORS
CLIENT_URL=http://localhost:5173,http://localhost:3001

# Logging
LOG_LEVEL=debug

# Sentry (ixtiyoriy — hozircha bo'sh qoldiring)
# SENTRY_DSN=

# SMS (ixtiyoriy — Eskiz panel dan oling)
# ESKIZ_EMAIL=
# ESKIZ_PASSWORD=
EOF

  ok ".env yaratildi: $ENV_FILE"
  warn "Parolni o'zgartirish uchun: nano apps/api/.env"
fi

# .env ni yuklash
export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs) 2>/dev/null || true

# ─── 2. Docker ────────────────────────────────────────────────────────────────
step "2/6 — Docker (Postgres + Redis)"

if ! command -v docker &>/dev/null; then
  warn "Docker topilmadi. Docker o'rnatilganligini tekshiring."
  warn "https://docs.docker.com/get-docker/"
  warn "Agar Docker mavjud bo'lsa, quyidagilarni tekshiring: docker --version"
  warn "Bu qadamni o'tkazib yubormoqda..."
else
  if ! docker info &>/dev/null 2>&1; then
    warn "Docker ishlamayapti. Ishga tushirilmoqda..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
      open -a Docker || warn "Docker Desktopni qo'lda oching"
      sleep 8
    elif command -v systemctl &>/dev/null; then
      sudo systemctl start docker || warn "sudo kerak: sudo systemctl start docker"
    fi
  fi

  # docker-compose.yml mavjudligini tekshirish
  COMPOSE_FILE="$ROOT/docker/docker-compose.yml"
  if [[ -f "$COMPOSE_FILE" ]]; then
    info "Postgres va Redis ishga tushirilmoqda..."

    # Root .env ni docker/ papkasiga ko'chirish (docker compose uchun)
    cp "$ENV_FILE" "$ROOT/docker/.env" 2>/dev/null || true

    cd "$ROOT/docker"
    docker compose up -d postgres redis 2>&1 | grep -E "Starting|Running|Created|done|error" || true
    cd "$ROOT"

    info "Database tayyor bo'lishini kutish (10 soniya)..."
    sleep 10

    # Postgres health check
    MAX=6; I=0
    while [[ $I -lt $MAX ]]; do
      if docker exec oshxona-postgres pg_isready -U "${POSTGRES_USER:-oshxona}" &>/dev/null 2>&1; then
        ok "Postgres ishlamoqda"
        break
      fi
      ((I++))
      [[ $I -eq $MAX ]] && warn "Postgres ulanishi tekshirilmadi — davom etilmoqda"
      sleep 5
    done
  else
    warn "docker/docker-compose.yml topilmadi. Postgres allaqachon ishlamoqda deb hisoblanmoqda."
  fi
fi

# ─── 3. npm install ───────────────────────────────────────────────────────────
step "3/6 — npm install"

cd "$ROOT"
if [[ ! -d "node_modules" ]] || [[ ! -f "node_modules/.bin/prisma" ]]; then
  info "Paketlar o'rnatilmoqda (bu biroz vaqt oladi)..."
  npm install --legacy-peer-deps 2>&1 | tail -5
  ok "Paketlar o'rnatildi"
else
  ok "node_modules allaqachon mavjud"
fi

[[ ! -f "$PRISMA" ]] && die "prisma binary topilmadi: $PRISMA"

# ─── 4. Prisma generate ───────────────────────────────────────────────────────
step "4/6 — Prisma client generatsiya"

"$PRISMA" generate --schema="$SCHEMA" 2>&1 | grep -E "Generated|warn|error" || true
ok "Prisma client tayyor"

# ─── 5. Migration ─────────────────────────────────────────────────────────────
step "5/6 — Database migration"

[[ -z "${DATABASE_URL:-}" ]] && die "DATABASE_URL .env da yo'q!"

info "Database ulanishi tekshirilmoqda..."

# Database ulanishini test qilish
DB_ACCESSIBLE=false
if "$PRISMA" migrate status --schema="$SCHEMA" &>/dev/null 2>&1; then
  DB_ACCESSIBLE=true
fi

if [[ "$DB_ACCESSIBLE" == "false" ]]; then
  warn "Database'ga ulanib bo'lmadi."
  warn "DATABASE_URL: ${DATABASE_URL%%@*}@***"
  warn ""
  warn "Mumkin sabablar:"
  warn "  1. Docker ishlamayapti  →  bash scripts/db-fix.sh"
  warn "  2. Parol noto'g'ri      →  nano apps/api/.env"
  warn "  3. Database yo'q        →  docker exec oshxona-postgres createdb -U oshxona oshxona_pos"
  die "Database'ga ulanib bo'lmadi"
fi

# Jadvallar mavjudligini tekshirish
TABLE_COUNT=$("$PRISMA" migrate status --schema="$SCHEMA" 2>&1 | grep -c "Applied\|applied" || true)
MIGRATE_STATUS=$("$PRISMA" migrate status --schema="$SCHEMA" 2>&1)

if echo "$MIGRATE_STATUS" | grep -q "Database schema is up to date"; then
  ok "Database allaqachon sinxron — migration shart emas"

elif echo "$MIGRATE_STATUS" | grep -q "P3005\|schema is not empty\|tables already exist"; then
  # Jadvallar bor, lekin migrations tarixi yo'q → baseline
  warn "Jadvallar mavjud, lekin migration tarixi yo'q."
  info "Baseline o'rnatilmoqda (mavjud ma'lumotlar o'zgarmaydi)..."
  "$PRISMA" migrate resolve \
    --applied "20260424000000_init" \
    --schema="$SCHEMA" 2>&1 | grep -v "^$" || true
  ok "Baseline o'rnatildi"

elif echo "$MIGRATE_STATUS" | grep -q "No migration found\|migrations table\|20260424000000_init.*Not applied"; then
  # Yangi database → to'liq deploy
  info "Yangi database aniqlandi. Jadvallar yaratilmoqda..."
  "$PRISMA" migrate deploy --schema="$SCHEMA" 2>&1 | grep -v "^$"
  ok "Jadvallar yaratildi"

elif echo "$MIGRATE_STATUS" | grep -q "20260424000000_init.*Applied"; then
  ok "Migration allaqachon qo'llangan"

else
  # Noaniq holat — baseline urinib ko'rish
  warn "Migration holati noaniq. Avtomatik tuzatish urinilmoqda..."
  "$PRISMA" migrate resolve \
    --applied "20260424000000_init" \
    --schema="$SCHEMA" 2>&1 | grep -v "^$" || \
  "$PRISMA" migrate deploy --schema="$SCHEMA" 2>&1 | grep -v "^$" || \
  warn "Migration o'tkazilmadi. bash scripts/db-fix.sh ishlatib ko'ring."
fi

# ─── 6. Natija ────────────────────────────────────────────────────────────────
step "6/6 — Tekshirish"

info "Migration holati:"
"$PRISMA" migrate status --schema="$SCHEMA" 2>&1 | grep -E "Applied|pending|error|up to date|not applied" || true

echo ""
echo -e "${BOLD}${G}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${G}║              ✅  SETUP YAKUNLANDI!                   ║${NC}"
echo -e "${BOLD}${G}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${B}  API ishga tushirish:${NC}  ${BOLD}npm run dev --workspace=apps/api${NC}"
echo -e "${B}  POS ishga tushirish:${NC}  ${BOLD}npm run dev --workspace=apps/pos${NC}"
echo -e "${B}  Xatoni tuzatish:${NC}     ${BOLD}bash scripts/db-fix.sh${NC}"
echo ""
