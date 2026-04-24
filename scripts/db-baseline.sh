#!/usr/bin/env bash
# ============================================================
# db-baseline.sh — Mavjud database uchun baseline belgilash
#
# QACHON ISHLATILADI:
#   - Database allaqachon "prisma db push" bilan yaratilgan
#   - Birinchi marta migrations'ga o'tish
#   - Ishga tushirish: bash scripts/db-baseline.sh
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# .env faylni yuklash
if [[ -f "$PROJECT_ROOT/apps/api/.env" ]]; then
  export $(grep -v '^#' "$PROJECT_ROOT/apps/api/.env" | xargs)
  info ".env yuklandi: apps/api/.env"
elif [[ -f "$PROJECT_ROOT/.env" ]]; then
  export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
  info ".env yuklandi: .env"
else
  error ".env fayli topilmadi! apps/api/.env yoki .env kerak."
fi

[[ -z "${DATABASE_URL:-}" ]] && error "DATABASE_URL .env faylida yo'q!"

info "DATABASE_URL: ${DATABASE_URL%%@*}@***"

# Prisma yo'li
PRISMA="$PROJECT_ROOT/node_modules/.bin/prisma"
[[ ! -f "$PRISMA" ]] && error "prisma binary topilmadi: $PRISMA"

SCHEMA="$PROJECT_ROOT/packages/database/prisma/schema.prisma"

echo ""
echo "======================================================="
echo "  BASELINE: Mavjud database migrations'ga ulanmoqda"
echo "======================================================="
echo ""

# 1. Migration status tekshirish
info "Migration holati tekshirilmoqda..."
MIGRATION_STATUS=$("$PRISMA" migrate status --schema="$SCHEMA" 2>&1 || true)

if echo "$MIGRATION_STATUS" | grep -q "Database schema is up to date"; then
  info "Database allaqachon migrations bilan sinxron."
  exit 0
fi

if echo "$MIGRATION_STATUS" | grep -q "20260424000000_init"; then
  info "Birinchi migration allaqachon qayd etilgan."
  exit 0
fi

# 2. Baseline belgilash
warn "Diqqat: '20260424000000_init' migration AMALDA BAJARMAYDI."
warn "Bu faqat migratsiya tarixini qayd etadi (db push allaqachon jadvallarni yaratgan)."
echo ""
read -p "Davom etasizmi? (y/N): " -n 1 -r
echo ""
[[ ! $REPLY =~ ^[Yy]$ ]] && { warn "Bekor qilindi."; exit 0; }

info "Baseline belgilanmoqda..."
"$PRISMA" migrate resolve \
  --applied "20260424000000_init" \
  --schema="$SCHEMA"

echo ""
info "Migration holati:"
"$PRISMA" migrate status --schema="$SCHEMA"

echo ""
echo -e "${GREEN}✅ Baseline muvaffaqiyatli o'rnatildi!${NC}"
echo ""
echo "Keyingi qadamlar:"
echo "  - Yangi migration:   bash scripts/db-migrate-new.sh 'migration_nomi'"
echo "  - Production deploy: bash scripts/db-migrate-deploy.sh"
echo ""
