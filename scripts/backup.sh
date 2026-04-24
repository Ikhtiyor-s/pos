#!/usr/bin/env bash
# =============================================================================
# backup.sh — Oshxona POS: PostgreSQL production backup
#
# ISHLATISH:
#   bash scripts/backup.sh                   # oddiy backup
#   bash scripts/backup.sh --dry-run         # faqat tekshirish, yozmaslik
#   bash scripts/backup.sh --no-verify       # integrity tekshirishsiz (tez)
#
# CRON (har kuni 02:00 da):
#   0 2 * * * /opt/oshxona-pos/scripts/backup.sh >> /var/log/oshxona-backup.log 2>&1
#
# SOZLAMALAR (.env yoki shell env orqali):
#   BACKUP_DIR           — backup papkasi (default: /opt/oshxona-pos/backups)
#   BACKUP_RETENTION     — necha kun saqlansin (default: 30)
#   DATABASE_URL         — PostgreSQL ulanish URL
# =============================================================================

set -euo pipefail

# ── Sozlamalar ────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
LOG_PREFIX="[$(date '+%Y-%m-%d %H:%M:%S')]"
DRY_RUN=false
NO_VERIFY=false

for arg in "$@"; do
  [[ "$arg" == "--dry-run"   ]] && DRY_RUN=true
  [[ "$arg" == "--no-verify" ]] && NO_VERIFY=true
done

# ── Rang va log funksiyalar ───────────────────────────────────────────────────
R='\033[0;31m' G='\033[0;32m' Y='\033[1;33m' B='\033[0;34m' NC='\033[0m' BOLD='\033[1m'

log()  { echo -e "$LOG_PREFIX ${B}[INFO]${NC}  $*"; }
ok()   { echo -e "$LOG_PREFIX ${G}[OK]${NC}    $*"; }
warn() { echo -e "$LOG_PREFIX ${Y}[WARN]${NC}  $*"; }
fail() { echo -e "$LOG_PREFIX ${R}[FAIL]${NC}  $*" >&2; exit 1; }
sep()  { echo -e "$LOG_PREFIX ${BOLD}──────────────────────────────────────────${NC}"; }

# ── .env yuklash ──────────────────────────────────────────────────────────────
if [[ -z "${DATABASE_URL:-}" ]]; then
  for env_file in "$ROOT/apps/api/.env" "$ROOT/.env"; do
    if [[ -f "$env_file" ]]; then
      set -a; source "$env_file"; set +a
      log ".env yuklandi: $env_file"
      break
    fi
  done
fi

[[ -z "${DATABASE_URL:-}" ]] && fail "DATABASE_URL topilmadi. .env faylini tekshiring."

# ── DATABASE_URL ni parse qilish ──────────────────────────────────────────────
# Format: postgresql://user:pass@host:port/dbname
_url="${DATABASE_URL#*://}"
DB_USER="${_url%%:*}"
_url="${_url#*:}"
DB_PASS="${_url%%@*}"
_url="${_url#*@}"
DB_HOST="${_url%%:*}"
_url="${_url#*:}"
DB_PORT="${_url%%/*}"
DB_NAME="${_url#*/}"
DB_NAME="${DB_NAME%%\?*}"   # query string ni olib tashlash
DB_PORT="${DB_PORT:-5432}"

[[ -z "$DB_USER" || -z "$DB_HOST" || -z "$DB_NAME" ]] && \
  fail "DATABASE_URL noto'g'ri format: postgresql://user:pass@host:port/dbname"

# ── Papkalar ──────────────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
LOG_DIR="${LOG_DIR:-$ROOT/logs/backup}"
RETENTION="${BACKUP_RETENTION:-30}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILENAME="oshxona_${DB_NAME}_${TIMESTAMP}.sql.gz"
FILEPATH="$BACKUP_DIR/$FILENAME"
CHECKSUM_FILE="${FILEPATH}.sha256"

mkdir -p "$BACKUP_DIR" "$LOG_DIR"

# ── Boshlanish ────────────────────────────────────────────────────────────────
sep
log "Oshxona POS — Database Backup"
log "Database : $DB_NAME @ $DB_HOST:$DB_PORT"
log "Foydalanuvchi: $DB_USER"
log "Backup fayl  : $FILEPATH"
log "Retention    : ${RETENTION} kun"
$DRY_RUN && warn "DRY-RUN rejimi — disk ga yozilmaydi"
sep

# ── pg_dump mavjudligini tekshirish ───────────────────────────────────────────
if ! command -v pg_dump &>/dev/null; then
  # Docker orqali urinib ko'rish
  if command -v docker &>/dev/null && \
     docker ps --format '{{.Names}}' 2>/dev/null | grep -q "postgres\|oshxona-postgres"; then
    PG_CMD="docker exec oshxona-postgres pg_dump"
    log "pg_dump topilmadi — Docker orqali ishlaydi"
  else
    fail "pg_dump topilmadi. O'rnatish: sudo apt install postgresql-client"
  fi
else
  PG_CMD="pg_dump"
fi

# ── Database'ga ulanish testi ─────────────────────────────────────────────────
log "Database ulanishi tekshirilmoqda..."
export PGPASSWORD="$DB_PASS"

if command -v pg_isready &>/dev/null; then
  pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t 10 &>/dev/null || \
    fail "Database'ga ulanib bo'lmadi: $DB_HOST:$DB_PORT"
elif docker ps --format '{{.Names}}' 2>/dev/null | grep -q "oshxona-postgres"; then
  docker exec oshxona-postgres pg_isready -U "$DB_USER" &>/dev/null || \
    fail "Docker Postgres ulanmadi"
fi
ok "Database ulanishi: OK"

# ── Backup olish ──────────────────────────────────────────────────────────────
if $DRY_RUN; then
  ok "DRY-RUN: Backup buyrug'i tayyorlangan, ishga tushirilmadi"
  echo "  Buyruq: $PG_CMD -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME | gzip > $FILEPATH"
  unset PGPASSWORD
  exit 0
fi

log "Backup boshlanmoqda..."
START_TIME="$(date +%s)"

if [[ "$PG_CMD" == "docker exec"* ]]; then
  docker exec oshxona-postgres pg_dump \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-password \
    --format=plain \
    --blobs \
    --encoding=UTF8 \
    2>/dev/null | gzip -9 > "$FILEPATH"
else
  pg_dump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --no-password \
    --format=plain \
    --blobs \
    --encoding=UTF8 \
    2>/dev/null | gzip -9 > "$FILEPATH"
fi

unset PGPASSWORD

END_TIME="$(date +%s)"
DURATION="$((END_TIME - START_TIME))"

# ── Fayl tekshirish ───────────────────────────────────────────────────────────
[[ ! -f "$FILEPATH" ]] && fail "Backup fayli yaratilmadi: $FILEPATH"
FILE_SIZE_BYTES="$(wc -c < "$FILEPATH")"
FILE_SIZE_HUMAN="$(du -sh "$FILEPATH" | cut -f1)"

if [[ "$FILE_SIZE_BYTES" -lt 1024 ]]; then
  fail "Backup fayli juda kichik (${FILE_SIZE_BYTES} byte) — backup muvaffaqiyatsiz"
fi

ok "Backup yaratildi: $FILE_SIZE_HUMAN ($DURATION soniya)"

# ── Integrity tekshirish (gunzip -t) ─────────────────────────────────────────
if ! $NO_VERIFY; then
  log "Integrity tekshirilmoqda..."
  if gunzip -t "$FILEPATH" 2>/dev/null; then
    ok "Integrity: OK (fayl buzilmagan)"
  else
    fail "Integrity tekshiruvi muvaffaqiyatsiz — fayl buzilgan!"
  fi
fi

# ── SHA256 checksum ───────────────────────────────────────────────────────────
sha256sum "$FILEPATH" > "$CHECKSUM_FILE"
ok "Checksum: $(cat "$CHECKSUM_FILE" | awk '{print $1}' | head -c 16)..."

# ── Tablo sanash ─────────────────────────────────────────────────────────────
TABLE_COUNT=$(gunzip -c "$FILEPATH" 2>/dev/null | \
  grep -c "^CREATE TABLE" 2>/dev/null || echo "0")
log "Jadvallar soni backupda: $TABLE_COUNT"

# ── Backup ro'yxatini logga yozish ───────────────────────────────────────────
LOG_ENTRY="$LOG_PREFIX OK | $FILENAME | $FILE_SIZE_HUMAN | ${DURATION}s | tables=$TABLE_COUNT"
echo "$LOG_ENTRY" >> "$LOG_DIR/backup-history.log"

# ── Eski backuplarni tozalash (retention) ─────────────────────────────────────
log "Eski backuplar tozalanmoqda (>${RETENTION} kun)..."
OLD_COUNT=0
while IFS= read -r -d '' old_file; do
  rm -f "$old_file" "${old_file}.sha256"
  OLD_COUNT=$((OLD_COUNT + 1))
  warn "O'chirildi: $(basename "$old_file")"
done < <(find "$BACKUP_DIR" -name "oshxona_*.sql.gz" -mtime "+${RETENTION}" -print0 2>/dev/null)

if [[ "$OLD_COUNT" -gt 0 ]]; then
  warn "$OLD_COUNT ta eski backup o'chirildi"
else
  log "Eski backup yo'q"
fi

# ── Disk holati ───────────────────────────────────────────────────────────────
DISK_USED=$(df -h "$BACKUP_DIR" | tail -1 | awk '{print $5}')
DISK_AVAIL=$(df -h "$BACKUP_DIR" | tail -1 | awk '{print $4}')
log "Disk holati: $DISK_USED band, $DISK_AVAIL bo'sh"

DISK_PCT=$(df "$BACKUP_DIR" | tail -1 | awk '{gsub(/%/,""); print $5}')
if [[ "$DISK_PCT" -gt 90 ]]; then
  warn "DISK 90% dan oshdi! Bo'sh joy: $DISK_AVAIL"
fi

# ── Joriy backuplar ro'yxati ──────────────────────────────────────────────────
sep
log "Saqlangan backuplar ($BACKUP_DIR):"
if ls "$BACKUP_DIR"/oshxona_*.sql.gz &>/dev/null 2>&1; then
  ls -lht "$BACKUP_DIR"/oshxona_*.sql.gz | \
    awk '{printf "  %-40s %6s  %s %s\n", $NF, $5, $6, $7}'
else
  log "  (backup yo'q)"
fi
sep
ok "BACKUP MUVAFFAQIYATLI: $FILENAME"
sep
