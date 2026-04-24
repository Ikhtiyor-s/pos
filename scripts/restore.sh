#!/usr/bin/env bash
# =============================================================================
# restore.sh — Oshxona POS: Backup dan tiklash
#
# ISHLATISH:
#   bash scripts/restore.sh                              # interaktiv tanlash
#   bash scripts/restore.sh backups/oshxona_...sql.gz   # aniq fayl
#   bash scripts/restore.sh --latest                     # eng oxirgi backup
#   bash scripts/restore.sh --list                       # backuplar ro'yxati
#
# OGOHLANTIRISH:
#   Bu buyruq mavjud database'ni O'CHIRADI va backup bilan almashtiradi.
#   Avval avtomatik pre-restore backup olinadi.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

R='\033[0;31m' G='\033[0;32m' Y='\033[1;33m' B='\033[0;34m' C='\033[0;36m' NC='\033[0m' BOLD='\033[1m'

log()   { echo -e "[$(date '+%H:%M:%S')] ${B}[INFO]${NC}  $*"; }
ok()    { echo -e "[$(date '+%H:%M:%S')] ${G}[OK]${NC}    $*"; }
warn()  { echo -e "[$(date '+%H:%M:%S')] ${Y}[WARN]${NC}  $*"; }
fail()  { echo -e "[$(date '+%H:%M:%S')] ${R}[FAIL]${NC}  $*" >&2; exit 1; }
sep()   { echo -e "${BOLD}${C}══════════════════════════════════════════════${NC}"; }
ask()   { echo -e "${Y}  ➜  $*${NC}"; }

# ── .env yuklash ──────────────────────────────────────────────────────────────
if [[ -z "${DATABASE_URL:-}" ]]; then
  for env_file in "$ROOT/apps/api/.env" "$ROOT/.env"; do
    if [[ -f "$env_file" ]]; then
      set -a; source "$env_file"; set +a
      break
    fi
  done
fi

[[ -z "${DATABASE_URL:-}" ]] && fail "DATABASE_URL topilmadi."

# ── DATABASE_URL parse ────────────────────────────────────────────────────────
_url="${DATABASE_URL#*://}"
DB_USER="${_url%%:*}"
_url="${_url#*:}"
DB_PASS="${_url%%@*}"
_url="${_url#*@}"
DB_HOST="${_url%%:*}"
_url="${_url#*:}"
DB_PORT="${_url%%/*}"
DB_NAME="${_url#*/}"
DB_NAME="${DB_NAME%%\?*}"
DB_PORT="${DB_PORT:-5432}"

BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"

# ── Argument tahlili ─────────────────────────────────────────────────────────
BACKUP_FILE=""
LIST_ONLY=false

case "${1:-}" in
  --list)
    LIST_ONLY=true
    ;;
  --latest)
    BACKUP_FILE=$(ls -t "$BACKUP_DIR"/oshxona_*.sql.gz 2>/dev/null | head -1)
    [[ -z "$BACKUP_FILE" ]] && fail "Backup topilmadi: $BACKUP_DIR"
    ;;
  "")
    # Interaktiv tanlash
    ;;
  *)
    BACKUP_FILE="$1"
    ;;
esac

# ── Backuplar ro'yxati ────────────────────────────────────────────────────────
sep
echo -e "${BOLD}  Oshxona POS — Backup Ro'yxati${NC}"
sep

if ! ls "$BACKUP_DIR"/oshxona_*.sql.gz &>/dev/null 2>&1; then
  fail "Backup papkasida fayl topilmadi: $BACKUP_DIR"
fi

mapfile -t BACKUP_FILES < <(ls -t "$BACKUP_DIR"/oshxona_*.sql.gz 2>/dev/null)

echo ""
printf "  %-4s  %-42s  %8s  %s\n" "No" "Fayl nomi" "Hajmi" "Sana"
echo "  ────  ──────────────────────────────────────────  ────────  ──────────"
for i in "${!BACKUP_FILES[@]}"; do
  f="${BACKUP_FILES[$i]}"
  fname="$(basename "$f")"
  fsize="$(du -sh "$f" 2>/dev/null | cut -f1)"
  fdate="$(date -r "$f" '+%Y-%m-%d %H:%M' 2>/dev/null || stat -c '%y' "$f" | cut -c1-16)"
  marker=""
  [[ $i -eq 0 ]] && marker=" ← oxirgi"
  printf "  %-4s  %-42s  %8s  %s%s\n" "[$((i+1))]" "$fname" "$fsize" "$fdate" "$marker"
done
echo ""

$LIST_ONLY && exit 0

# ── Tanlash ───────────────────────────────────────────────────────────────────
if [[ -z "$BACKUP_FILE" ]]; then
  ask "Qaysi backupni tiklash? Raqam kiriting [1-${#BACKUP_FILES[@]}] yoki Enter (oxirgi):"
  read -r CHOICE
  CHOICE="${CHOICE:-1}"

  if ! [[ "$CHOICE" =~ ^[0-9]+$ ]] || \
     [[ "$CHOICE" -lt 1 ]] || \
     [[ "$CHOICE" -gt "${#BACKUP_FILES[@]}" ]]; then
    fail "Noto'g'ri tanlov: $CHOICE"
  fi

  BACKUP_FILE="${BACKUP_FILES[$((CHOICE-1))]}"
fi

[[ ! -f "$BACKUP_FILE" ]] && fail "Fayl topilmadi: $BACKUP_FILE"

FNAME="$(basename "$BACKUP_FILE")"
FSIZE="$(du -sh "$BACKUP_FILE" | cut -f1)"

sep
warn "DIQQAT — XAVFLI AMAL"
sep
echo ""
echo -e "  Tiklanadigan fayl : ${BOLD}$FNAME${NC}"
echo -e "  Hajmi             : ${BOLD}$FSIZE${NC}"
echo -e "  Database          : ${BOLD}${DB_NAME}${NC} @ ${DB_HOST}:${DB_PORT}"
echo ""
warn "Bu amal mavjud database'ni to'liq O'CHIRADI!"
warn "Barcha joriy ma'lumotlar yo'qoladi."
echo ""

# ── Integrity tekshirish ──────────────────────────────────────────────────────
log "Backup fayli tekshirilmoqda..."
if ! gunzip -t "$BACKUP_FILE" 2>/dev/null; then
  fail "Backup fayli buzilgan: $BACKUP_FILE"
fi

CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [[ -f "$CHECKSUM_FILE" ]]; then
  if sha256sum -c "$CHECKSUM_FILE" &>/dev/null; then
    ok "Checksum: OK"
  else
    warn "Checksum mos kelmadi — backup o'zgartirilgan bo'lishi mumkin"
    ask "Baribir davom etasizmi? (yes/N):"
    read -r CONFIRM
    [[ "${CONFIRM,,}" != "yes" ]] && { log "Bekor qilindi."; exit 0; }
  fi
else
  warn "Checksum fayli yo'q — tekshirib bo'lmadi"
fi

# ── Tasdiqlash ────────────────────────────────────────────────────────────────
ask "Davom etish uchun 'RESTORE' so'zini kiriting:"
read -r CONFIRM
if [[ "$CONFIRM" != "RESTORE" ]]; then
  log "Bekor qilindi (to'g'ri so'z kiritilmadi)."
  exit 0
fi

# ── Pre-restore backup ────────────────────────────────────────────────────────
sep
log "Avval joriy database backup olinmoqda (xavfsizlik uchun)..."
PRE_RESTORE_FILE="$BACKUP_DIR/pre-restore_${DB_NAME}_$(date +%Y%m%d_%H%M%S).sql.gz"

export PGPASSWORD="$DB_PASS"

if command -v pg_dump &>/dev/null; then
  pg_dump \
    --host="$DB_HOST" --port="$DB_PORT" \
    --username="$DB_USER" --dbname="$DB_NAME" \
    --no-password --format=plain 2>/dev/null | gzip -9 > "$PRE_RESTORE_FILE"
elif docker ps --format '{{.Names}}' 2>/dev/null | grep -q "oshxona-postgres"; then
  docker exec oshxona-postgres pg_dump \
    -U "$DB_USER" -d "$DB_NAME" \
    --format=plain 2>/dev/null | gzip -9 > "$PRE_RESTORE_FILE"
fi

if [[ -f "$PRE_RESTORE_FILE" && $(wc -c < "$PRE_RESTORE_FILE") -gt 1024 ]]; then
  PRE_SIZE="$(du -sh "$PRE_RESTORE_FILE" | cut -f1)"
  ok "Pre-restore backup: $(basename "$PRE_RESTORE_FILE") ($PRE_SIZE)"
else
  warn "Pre-restore backup olinmadi — davom etilmoqda"
fi

# ── Tiklash ───────────────────────────────────────────────────────────────────
sep
log "Tiklash boshlanmoqda: $FNAME"
START_TIME="$(date +%s)"

if command -v psql &>/dev/null; then
  # Barcha connection'larni yopish
  psql \
    --host="$DB_HOST" --port="$DB_PORT" \
    --username="$DB_USER" --dbname="postgres" \
    --no-password -q \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${DB_NAME}' AND pid <> pg_backend_pid();" \
    2>/dev/null || true

  # Database'ni tozalash va tiklash
  psql \
    --host="$DB_HOST" --port="$DB_PORT" \
    --username="$DB_USER" --dbname="postgres" \
    --no-password -q \
    -c "DROP DATABASE IF EXISTS ${DB_NAME};" \
    2>/dev/null

  psql \
    --host="$DB_HOST" --port="$DB_PORT" \
    --username="$DB_USER" --dbname="postgres" \
    --no-password -q \
    -c "CREATE DATABASE ${DB_NAME} ENCODING='UTF8';" \
    2>/dev/null

  gunzip -c "$BACKUP_FILE" | psql \
    --host="$DB_HOST" --port="$DB_PORT" \
    --username="$DB_USER" --dbname="$DB_NAME" \
    --no-password -q \
    2>/dev/null

elif docker ps --format '{{.Names}}' 2>/dev/null | grep -q "oshxona-postgres"; then
  log "Docker orqali tiklash..."

  docker exec oshxona-postgres psql \
    -U "$DB_USER" -d postgres -q \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${DB_NAME}' AND pid <> pg_backend_pid();" \
    2>/dev/null || true

  docker exec oshxona-postgres psql \
    -U "$DB_USER" -d postgres -q \
    -c "DROP DATABASE IF EXISTS ${DB_NAME};" \
    2>/dev/null

  docker exec oshxona-postgres psql \
    -U "$DB_USER" -d postgres -q \
    -c "CREATE DATABASE ${DB_NAME} ENCODING='UTF8';" \
    2>/dev/null

  gunzip -c "$BACKUP_FILE" | docker exec -i oshxona-postgres psql \
    -U "$DB_USER" -d "$DB_NAME" -q \
    2>/dev/null
else
  unset PGPASSWORD
  fail "psql topilmadi va Docker ham yo'q. Qo'lda tiklash kerak."
fi

unset PGPASSWORD

END_TIME="$(date +%s)"
DURATION="$((END_TIME - START_TIME))"

# ── Natija ────────────────────────────────────────────────────────────────────
sep
ok "TIKLASH MUVAFFAQIYATLI ($DURATION soniya)"
sep
echo ""
echo -e "  Tiklangan fayl : ${BOLD}$FNAME${NC}"
echo -e "  Database       : ${BOLD}$DB_NAME${NC}"
echo -e "  Vaqt           : ${BOLD}${DURATION}s${NC}"
echo ""
echo -e "  Pre-restore backup (agar kerak bo'lsa):"
echo -e "  ${Y}  bash scripts/restore.sh $PRE_RESTORE_FILE${NC}"
echo ""
warn "API serverni qayta ishga tushiring:"
echo -e "  ${B}  docker compose -f docker/docker-compose.prod.yml restart backend${NC}"
echo ""
