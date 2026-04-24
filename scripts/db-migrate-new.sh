#!/usr/bin/env bash
# ============================================================
# db-migrate-new.sh — Yangi migration yaratish (development)
#
# ISHLATISH:
#   bash scripts/db-migrate-new.sh "migration_nomi"
#   bash scripts/db-migrate-new.sh "add_delivery_zone"
#   bash scripts/db-migrate-new.sh "add_product_barcode"
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# Migration nomi tekshirish
[[ $# -lt 1 ]] && error "Migration nomi kerak!\n  Misol: bash scripts/db-migrate-new.sh 'add_delivery_zone'"

MIGRATION_NAME="$1"
# Faqat kichik harf, raqam va _ qabul qilinadi
[[ ! "$MIGRATION_NAME" =~ ^[a-z0-9_]+$ ]] && \
  error "Migration nomi faqat kichik harf, raqam va _ bo'lishi kerak.\n  Noto'g'ri: '$MIGRATION_NAME'\n  To'g'ri:   '${MIGRATION_NAME,,}'"

# .env yuklash
if [[ -f "$PROJECT_ROOT/apps/api/.env" ]]; then
  export $(grep -v '^#' "$PROJECT_ROOT/apps/api/.env" | xargs)
elif [[ -f "$PROJECT_ROOT/.env" ]]; then
  export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
else
  error ".env fayli topilmadi!"
fi

[[ -z "${DATABASE_URL:-}" ]] && error "DATABASE_URL .env faylida yo'q!"

PRISMA="$PROJECT_ROOT/node_modules/.bin/prisma"
SCHEMA="$PROJECT_ROOT/packages/database/prisma/schema.prisma"

info "Yangi migration: '$MIGRATION_NAME'"
info "Faqat SQL fayl yaratiladi (--create-only), database o'zgartirilmaydi."
echo ""

"$PRISMA" migrate dev \
  --name "$MIGRATION_NAME" \
  --create-only \
  --schema="$SCHEMA"

echo ""
info "Migration SQL fayli yaratildi."
echo ""
echo "Keyingi qadamlar:"
echo "  1. SQL faylni ko'rib chiqing: packages/database/prisma/migrations/*_${MIGRATION_NAME}/migration.sql"
echo "  2. Mahalliy bazaga qo'llash: bash scripts/db-migrate-deploy.sh"
echo ""
