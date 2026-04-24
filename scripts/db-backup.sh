#!/usr/bin/env bash
# ============================================================
# db-backup.sh — PostgreSQL backup olish
#
# ISHLATISH:
#   bash scripts/db-backup.sh                    # .env dan oladi
#   bash scripts/db-backup.sh --compress         # gzip bilan
#   BACKUP_DIR="/mnt/backups" bash scripts/db-backup.sh
#
# CRON (har kuni 2:00 da, 7 kun saqlash):
#   0 2 * * * /opt/oshxona-pos/scripts/db-backup.sh --compress >> /var/log/db-backup.log 2>&1
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

COMPRESS=false
[[ "${1:-}" == "--compress" ]] && COMPRESS=true

# .env yuklash
if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -f "$PROJECT_ROOT/apps/api/.env" ]]; then
    export $(grep -v '^#' "$PROJECT_ROOT/apps/api/.env" | xargs)
  elif [[ -f "$PROJECT_ROOT/.env" ]]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
  else
    error ".env fayli topilmadi!"
  fi
fi

[[ -z "${DATABASE_URL:-}" ]] && error "DATABASE_URL bo'sh!"

# URL dan maydonlarni ajratib olish
DB_USER=$(echo "$DATABASE_URL" | grep -oP '://\K[^:]+')
DB_PASS=$(echo "$DATABASE_URL" | grep -oP '://[^:]+:\K[^@]+')
DB_HOST=$(echo "$DATABASE_URL" | grep -oP '@\K[^:/]+')
DB_PORT=$(echo "$DATABASE_URL" | grep -oP '@[^:]+:\K[0-9]+' || echo "5432")
DB_NAME=$(echo "$DATABASE_URL" | grep -oP '/\K[^?]+$')

BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="oshxona_pos_${DB_NAME}_${TIMESTAMP}.sql"

info "Database: $DB_NAME @ $DB_HOST:$DB_PORT"
info "Backup papka: $BACKUP_DIR"

# pg_dump mavjudligini tekshirish
command -v pg_dump &>/dev/null || error "pg_dump topilmadi. postgresql-client o'rnatish kerak."

# Backup olish
info "Backup boshlanmoqda..."
export PGPASSWORD="$DB_PASS"

if $COMPRESS; then
  FILEPATH="$BACKUP_DIR/${FILENAME}.gz"
  pg_dump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --no-password \
    --format=plain \
    --verbose \
    2>/dev/null | gzip > "$FILEPATH"
else
  FILEPATH="$BACKUP_DIR/$FILENAME"
  pg_dump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --no-password \
    --format=plain \
    --verbose \
    > "$FILEPATH" 2>/dev/null
fi

unset PGPASSWORD

FILE_SIZE=$(du -sh "$FILEPATH" | cut -f1)
info "✅ Backup tayyor: $FILEPATH ($FILE_SIZE)"

# Eski backuplarni tozalash (7 kundan eski)
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
OLD_COUNT=$(find "$BACKUP_DIR" -name "oshxona_pos_*.sql*" -mtime +${RETENTION_DAYS} | wc -l)
if [[ "$OLD_COUNT" -gt 0 ]]; then
  find "$BACKUP_DIR" -name "oshxona_pos_*.sql*" -mtime +${RETENTION_DAYS} -delete
  warn "Eski backup'lar tozalandi: $OLD_COUNT ta fayl (${RETENTION_DAYS} kundan eski)"
fi

# Mavjud backuplar ro'yxati
echo ""
info "Joriy backuplar:"
ls -lh "$BACKUP_DIR"/oshxona_pos_*.sql* 2>/dev/null | tail -5 || echo "  (yo'q)"
echo ""
