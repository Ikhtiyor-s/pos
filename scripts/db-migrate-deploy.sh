#!/usr/bin/env bash
# ============================================================
# db-migrate-deploy.sh — Production/staging'ga migration qo'llash
#
# ISHLATISH:
#   bash scripts/db-migrate-deploy.sh             # .env dan oladi
#   DATABASE_URL="..." bash scripts/db-migrate-deploy.sh
#
# MUHIM:
#   - Bu buyruq faqat yangi migration'larni qo'llaydi
#   - Agar migration allaqachon qo'llangan bo'lsa, skip qilinadi
#   - Xavfsiz: rollback bo'lmaydi, lekin xato chiqsa to'xtaydi
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}    $*"; }
error()   { echo -e "${RED}[ERROR]${NC}   $*"; exit 1; }
section() { echo -e "\n${BLUE}━━━ $* ━━━${NC}"; }

# .env yuklash (agar DATABASE_URL allaqachon set qilinmagan bo'lsa)
if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -f "$PROJECT_ROOT/apps/api/.env" ]]; then
    export $(grep -v '^#' "$PROJECT_ROOT/apps/api/.env" | xargs)
    info ".env yuklandi"
  elif [[ -f "$PROJECT_ROOT/.env" ]]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
  else
    error "DATABASE_URL yo'q va .env fayli topilmadi!"
  fi
fi

[[ -z "${DATABASE_URL:-}" ]] && error "DATABASE_URL bo'sh!"

PRISMA="$PROJECT_ROOT/node_modules/.bin/prisma"
SCHEMA="$PROJECT_ROOT/packages/database/prisma/schema.prisma"

[[ ! -f "$PRISMA" ]] && error "prisma topilmadi: npm install kerak"
[[ ! -f "$SCHEMA" ]] && error "schema.prisma topilmadi: $SCHEMA"

DB_HOST=$(echo "$DATABASE_URL" | grep -oP '@\K[^:/]+' || echo "unknown")

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║        PRISMA MIGRATE DEPLOY                 ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
info "Server:  $DB_HOST"
info "Schema:  $SCHEMA"
echo ""

section "Migration holati (OLDIN)"
"$PRISMA" migrate status --schema="$SCHEMA" 2>&1 || true

section "Migrationlar qo'llanmoqda"
"$PRISMA" migrate deploy --schema="$SCHEMA"
DEPLOY_EXIT=$?

if [[ $DEPLOY_EXIT -ne 0 ]]; then
  error "Migration muvaffaqiyatsiz tugadi (exit code: $DEPLOY_EXIT)"
fi

section "Migration holati (KEYIN)"
"$PRISMA" migrate status --schema="$SCHEMA" 2>&1

echo ""
echo -e "${GREEN}✅ Barcha migrationlar muvaffaqiyatli qo'llandi!${NC}"
echo ""
