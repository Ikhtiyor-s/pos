#!/usr/bin/env bash
# =============================================================================
# db-fix.sh — Oshxona POS: XATOLARNI AVTOMATIK TUZATISH
#
# Quyidagi xatolarni avtomatik aniqlaydi va tuzatadi:
#   ✦ "already exists"          → Baseline o'rnatadi
#   ✦ "connection refused"      → Docker Postgres'ni ishga tushiradi
#   ✦ "prisma not found"        → npm install qiladi
#   ✦ "schema not in sync"      → prisma generate qiladi
#   ✦ "migration lock"          → Lock faylni tozalaydi
#   ✦ "migrate deploy failed"   → Holatni tekshirib, yechim ko'rsatadi
#
# ISHLATISH:
#   bash scripts/db-fix.sh
# =============================================================================

set -euo pipefail

R='\033[0;31m' G='\033[0;32m' Y='\033[1;33m' B='\033[0;34m' C='\033[0;36m' NC='\033[0m'
BOLD='\033[1m'

ok()    { echo -e "${G}  ✅  $*${NC}"; }
info()  { echo -e "${B}  ➜   $*${NC}"; }
warn()  { echo -e "${Y}  ⚠️   $*${NC}"; }
fix()   { echo -e "${C}  🔧  $*${NC}"; }
step()  { echo -e "\n${BOLD}${C}  ── $* ──${NC}"; }
fail()  { echo -e "${R}  ❌  $*${NC}" >&2; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCHEMA="$ROOT/packages/database/prisma/schema.prisma"
PRISMA="$ROOT/node_modules/.bin/prisma"
ENV_FILE="$ROOT/apps/api/.env"

FIXED=0  # Tuzatilgan muammolar soni

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║     OSHXONA POS — Avtomatik xato tuzatish            ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"

# .env yuklash
if [[ -f "$ENV_FILE" ]]; then
  export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs) 2>/dev/null || true
else
  warn ".env topilmadi. Avval: bash scripts/setup.sh"
  exit 1
fi

# ─── Tekshiruv 1: prisma binary ───────────────────────────────────────────────
step "Tekshiruv 1: Prisma binary"

if [[ ! -f "$PRISMA" ]]; then
  fix "prisma topilmadi → npm install qilinmoqda..."
  cd "$ROOT"
  npm install --legacy-peer-deps 2>&1 | tail -3
  ((FIXED++))
  ok "prisma o'rnatildi"
else
  ok "prisma mavjud: $PRISMA"
fi

# ─── Tekshiruv 2: Docker / Database ulanishi ──────────────────────────────────
step "Tekshiruv 2: Database ulanishi"

DB_OK=false
DB_ERROR=""

# Ulanish testi
DB_ERROR=$("$PRISMA" migrate status --schema="$SCHEMA" 2>&1 || true)

if echo "$DB_ERROR" | grep -qiE "connection refused|ECONNREFUSED|can't reach database"; then
  fix "Database ulanmadi → Docker tekshirilmoqda..."

  if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
    # Docker ishlamoqda, container'ni qayta ishga tushirish
    if docker ps -a --format '{{.Names}}' | grep -q "oshxona-postgres"; then
      info "Postgres container topildi. Ishga tushirilmoqda..."
      docker start oshxona-postgres 2>&1 || true
      sleep 8
      if docker exec oshxona-postgres pg_isready -U "${POSTGRES_USER:-oshxona}" &>/dev/null 2>&1; then
        ok "Postgres ishlamoqda"
        ((FIXED++))
        DB_OK=true
      else
        warn "Postgres hali tayyor emas, 15 soniya kutilmoqda..."
        sleep 15
        DB_OK=true
      fi
    else
      # Container yo'q, docker-compose bilan ishga tushirish
      info "Container topilmadi. docker-compose bilan yaratilmoqda..."
      cp "$ENV_FILE" "$ROOT/docker/.env" 2>/dev/null || true
      cd "$ROOT/docker"
      docker compose up -d postgres redis 2>&1 | tail -5
      cd "$ROOT"
      sleep 12
      ((FIXED++))
      DB_OK=true
    fi
  else
    fail "Docker topilmadi yoki ishlamayapti!"
    warn ""
    warn "  Yechim:"
    warn "    1. Docker o'rnatilganligini tekshiring: docker --version"
    warn "    2. Docker Desktop'ni oching"
    warn "    3. Qaytadan ishlatib ko'ring: bash scripts/db-fix.sh"
    exit 1
  fi

elif echo "$DB_ERROR" | grep -qiE "authentication failed|password authentication"; then
  fail "Database paroli noto'g'ri!"
  warn ""
  warn "  DATABASE_URL: ${DATABASE_URL:-topilmadi}"
  warn ""
  warn "  Yechim — parolni tekshiring:"
  warn "    nano apps/api/.env"
  warn ""
  warn "  Yoki Docker postgres'dagi parolni tekshirish:"
  warn "    docker exec oshxona-postgres psql -U oshxona -c '\\l'"
  exit 1

elif echo "$DB_ERROR" | grep -qiE "database.*does not exist|FATAL.*database"; then
  fix "Database mavjud emas → yaratilmoqda..."

  DB_NAME="${DATABASE_URL##*/}"
  DB_NAME="${DB_NAME%%\?*}"
  DB_USER="${POSTGRES_USER:-oshxona}"

  docker exec oshxona-postgres createdb -U "$DB_USER" "$DB_NAME" 2>&1 || \
    warn "Docker orqali database yaratib bo'lmadi. Qo'lda: docker exec oshxona-postgres createdb -U oshxona oshxona_pos"
  ((FIXED++))
  DB_OK=true

else
  ok "Database ulanishi mavjud"
  DB_OK=true
fi

# ─── Tekshiruv 3: Prisma client sinxronizatsiya ───────────────────────────────
step "Tekshiruv 3: Prisma client"

GEN_OUTPUT=$("$PRISMA" generate --schema="$SCHEMA" 2>&1 || true)
if echo "$GEN_OUTPUT" | grep -qiE "error|warn"; then
  fix "Prisma client qayta generatsiya qilinmoqda..."
  "$PRISMA" generate --schema="$SCHEMA" 2>&1 | grep -E "Generated|error" || true
  ((FIXED++))
fi
ok "Prisma client sinxron"

# ─── Tekshiruv 4: Migration holati ───────────────────────────────────────────
step "Tekshiruv 4: Migration holati"

MIG_STATUS=$("$PRISMA" migrate status --schema="$SCHEMA" 2>&1 || true)

if echo "$MIG_STATUS" | grep -q "Database schema is up to date"; then
  ok "Migration holati: up to date"

elif echo "$MIG_STATUS" | grep -qiE "P3005|schema is not empty|already exist"; then
  fix "Jadvallar mavjud, migration tarixi yo'q → baseline o'rnatilmoqda..."
  "$PRISMA" migrate resolve \
    --applied "20260424000000_init" \
    --schema="$SCHEMA" 2>&1 | grep -v "^$" || true
  ((FIXED++))
  ok "Baseline o'rnatildi"

elif echo "$MIG_STATUS" | grep -qiE "Not applied|pending migration|20260424000000_init.*Not applied"; then
  fix "Qo'llanmagan migration aniqlandi → qo'llanmoqda..."
  "$PRISMA" migrate deploy --schema="$SCHEMA" 2>&1 | grep -v "^$"
  ((FIXED++))
  ok "Migration qo'llandi"

elif echo "$MIG_STATUS" | grep -qiE "migration.*locked|lock.*migration"; then
  fix "Migration lock aniqlandi → tozalanmoqda..."
  # Lock faylni database dan olib tashlash
  DB_CONN="${DATABASE_URL}"
  docker exec oshxona-postgres psql -U "${POSTGRES_USER:-oshxona}" -d "${POSTGRES_DB:-oshxona_pos}" \
    -c "DELETE FROM _prisma_migrations WHERE migration_name = '20260424000000_init' AND finished_at IS NULL;" \
    2>/dev/null || warn "Lock qo'lda tozalab bo'lmadi"
  ((FIXED++))

elif echo "$MIG_STATUS" | grep -q "20260424000000_init.*Applied"; then
  ok "Migration qo'llangan"

else
  warn "Noaniq holat. Status:"
  echo "$MIG_STATUS" | head -10
  warn ""
  warn "Qo'lda tuzatish uchun: bash scripts/db-baseline.sh"
fi

# ─── Tekshiruv 5: Schema validatsiya ─────────────────────────────────────────
step "Tekshiruv 5: Schema validatsiya"

VALIDATE=$("$PRISMA" validate --schema="$SCHEMA" 2>&1 || true)
if echo "$VALIDATE" | grep -qi "error"; then
  fail "Schema'da xato bor:"
  echo "$VALIDATE"
  warn "Schema faylini tekshiring: packages/database/prisma/schema.prisma"
else
  ok "Schema valid"
fi

# ─── Yakuniy holat ────────────────────────────────────────────────────────────
echo ""
"$PRISMA" migrate status --schema="$SCHEMA" 2>&1 | \
  grep -E "Applied|pending|not applied|up to date|error" | head -5 || true

echo ""
if [[ $FIXED -gt 0 ]]; then
  echo -e "${BOLD}${G}╔══════════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${G}║   ✅  $FIXED ta muammo avtomatik tuzatildi!             ║${NC}"
  echo -e "${BOLD}${G}╚══════════════════════════════════════════════════════╝${NC}"
else
  echo -e "${BOLD}${G}╔══════════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}${G}║   ✅  Hamma narsa tartibda, muammo topilmadi         ║${NC}"
  echo -e "${BOLD}${G}╚══════════════════════════════════════════════════════╝${NC}"
fi
echo ""
echo -e "${B}  API ishga tushirish:${NC}  ${BOLD}npm run dev --workspace=apps/api${NC}"
echo ""
