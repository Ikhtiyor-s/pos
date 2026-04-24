#!/usr/bin/env bash
# =============================================================================
# health-check.sh — Oshxona POS: To'liq tizim holati tekshiruvi
#
# ISHLATISH:
#   bash scripts/health-check.sh                      # to'liq tekshiruv
#   bash scripts/health-check.sh --quick              # faqat API
#   bash scripts/health-check.sh --watch              # har 30s yangilash
#   bash scripts/health-check.sh http://server:3000   # boshqa server
#
# CRON (har 5 daqiqada, log bilan):
#   */5 * * * * /opt/oshxona-pos/scripts/health-check.sh --quick >> /var/log/oshxona-health.log 2>&1
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

# ── Argumentlar ───────────────────────────────────────────────────────────────
API_URL="${HEALTH_CHECK_URL:-http://localhost:3000}"
QUICK=false
WATCH=false

for arg in "$@"; do
  [[ "$arg" == "--quick" ]] && QUICK=true
  [[ "$arg" == "--watch" ]] && WATCH=true
  [[ "$arg" =~ ^http ]]     && API_URL="$arg"
done

# ── Ranglar ───────────────────────────────────────────────────────────────────
R='\033[0;31m' G='\033[0;32m' Y='\033[1;33m' B='\033[0;34m' C='\033[0;36m' NC='\033[0m' BOLD='\033[1m'

TS()   { date '+%H:%M:%S'; }
pass() { echo -e "  ${G}✅  $*${NC}"; }
fail() { echo -e "  ${R}❌  $*${NC}"; FAIL_COUNT=$((FAIL_COUNT+1)); }
warn() { echo -e "  ${Y}⚠️   $*${NC}"; WARN_COUNT=$((WARN_COUNT+1)); }
info() { echo -e "  ${B}ℹ️   $*${NC}"; }
sep()  { echo -e "${BOLD}${C}  ──────────────────────────────────────────${NC}"; }
head() { echo -e "\n${BOLD}  $*${NC}"; sep; }

# ── .env yuklash ──────────────────────────────────────────────────────────────
for env_file in "$ROOT/apps/api/.env" "$ROOT/.env"; do
  if [[ -f "$env_file" ]]; then
    set -a; source "$env_file" 2>/dev/null || true; set +a
    break
  fi
done

# ── Asosiy tekshiruv funksiyasi ───────────────────────────────────────────────
run_checks() {
  FAIL_COUNT=0
  WARN_COUNT=0

  echo ""
  echo -e "${BOLD}╔══════════════════════════════════════════════════╗${NC}"
  echo -e "${BOLD}║   Oshxona POS — Tizim Holati   $(TS)       ║${NC}"
  echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"

  # ── 1. API Endpoints ─────────────────────────────────────────────────────────
  head "1. API Endpoints ($API_URL)"

  # /health
  HTTP=$(curl -sf -o /tmp/hc_health.json -w "%{http_code}" \
    --max-time 8 --connect-timeout 4 "${API_URL}/health" 2>/dev/null || echo "000")
  if [[ "$HTTP" == "200" ]]; then
    UPTIME=$(grep -o '"uptime":[0-9.]*' /tmp/hc_health.json 2>/dev/null | \
      grep -o '[0-9.]*' | awk '{printf "%.0fd %.0fh %.0fm", $1/86400, ($1%86400)/3600, ($1%3600)/60}' || echo "n/a")
    pass "/health → 200 OK  (uptime: $UPTIME)"
  else
    fail "/health → HTTP $HTTP (API ishlamayapti!)"
  fi

  # /healthz (liveness)
  HTTP=$(curl -sf -o /dev/null -w "%{http_code}" \
    --max-time 5 "${API_URL}/healthz" 2>/dev/null || echo "000")
  [[ "$HTTP" == "200" ]] && pass "/healthz → 200 OK" || fail "/healthz → HTTP $HTTP"

  # /readyz (readiness — DB + Redis)
  HTTP=$(curl -sf -o /tmp/hc_ready.json -w "%{http_code}" \
    --max-time 8 "${API_URL}/readyz" 2>/dev/null || echo "000")
  if [[ "$HTTP" == "200" ]]; then
    pass "/readyz → 200 OK  (DB + Redis tayyor)"
  elif [[ "$HTTP" == "503" ]]; then
    # 503 detail bor
    DETAIL=$(cat /tmp/hc_ready.json 2>/dev/null | grep -o '"message":"[^"]*"' | head -1 || echo "")
    fail "/readyz → 503  $DETAIL"
  else
    fail "/readyz → HTTP $HTTP"
  fi

  # Response time
  RESP_MS=$(curl -sf -o /dev/null -w "%{time_total}" \
    --max-time 8 "${API_URL}/health" 2>/dev/null || echo "0")
  RESP_MS_INT=$(echo "$RESP_MS * 1000" | bc 2>/dev/null | cut -d. -f1 || echo "0")
  if [[ "$RESP_MS_INT" -lt 200 ]]; then
    pass "Response time: ${RESP_MS_INT}ms"
  elif [[ "$RESP_MS_INT" -lt 1000 ]]; then
    warn "Response time: ${RESP_MS_INT}ms (sekin)"
  else
    fail "Response time: ${RESP_MS_INT}ms (juda sekin!)"
  fi

  $QUICK && { print_summary; return; }

  # ── 2. Database ───────────────────────────────────────────────────────────────
  head "2. PostgreSQL"

  if [[ -n "${DATABASE_URL:-}" ]]; then
    _url="${DATABASE_URL#*://}"
    _DB_USER="${_url%%:*}"; _url="${_url#*:}"
    _DB_PASS="${_url%%@*}"; _url="${_url#*@}"
    _DB_HOST="${_url%%:*}"; _url="${_url#*:}"
    _DB_PORT="${_url%%/*}"
    _DB_NAME="${_url#*/}"; _DB_NAME="${_DB_NAME%%\?*}"
    _DB_PORT="${_DB_PORT:-5432}"

    export PGPASSWORD="$_DB_PASS"

    # pg_isready
    if command -v pg_isready &>/dev/null; then
      if pg_isready -h "$_DB_HOST" -p "$_DB_PORT" -U "$_DB_USER" -t 5 &>/dev/null; then
        pass "Ulanish: OK ($_DB_HOST:$_DB_PORT)"

        # Jadvallar soni
        TABLE_CNT=$(psql -h "$_DB_HOST" -p "$_DB_PORT" -U "$_DB_USER" -d "$_DB_NAME" \
          --no-password -t -c \
          "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" \
          2>/dev/null | tr -d ' ' || echo "?")
        pass "Jadvallar: $TABLE_CNT ta"

        # DB hajmi
        DB_SIZE=$(psql -h "$_DB_HOST" -p "$_DB_PORT" -U "$_DB_USER" -d "$_DB_NAME" \
          --no-password -t -c \
          "SELECT pg_size_pretty(pg_database_size('${_DB_NAME}'));" \
          2>/dev/null | tr -d ' ' || echo "?")
        info "Database hajmi: $DB_SIZE"

        # Active connections
        CONN_CNT=$(psql -h "$_DB_HOST" -p "$_DB_PORT" -U "$_DB_USER" -d "$_DB_NAME" \
          --no-password -t -c \
          "SELECT count(*) FROM pg_stat_activity WHERE datname='${_DB_NAME}';" \
          2>/dev/null | tr -d ' ' || echo "?")
        if [[ "$CONN_CNT" =~ ^[0-9]+$ ]] && [[ "$CONN_CNT" -gt 80 ]]; then
          warn "Active connections: $CONN_CNT (ko'p!)"
        else
          pass "Active connections: $CONN_CNT"
        fi

        # Migration holati
        MIGRATION_CNT=$(psql -h "$_DB_HOST" -p "$_DB_PORT" -U "$_DB_USER" -d "$_DB_NAME" \
          --no-password -t -c \
          "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL;" \
          2>/dev/null | tr -d ' ' || echo "?")
        pass "Migrations: $MIGRATION_CNT ta qo'llangan"
      else
        fail "Ulanib bo'lmadi: $_DB_HOST:$_DB_PORT"
      fi
    elif docker ps --format '{{.Names}}' 2>/dev/null | grep -q "oshxona-postgres"; then
      if docker exec oshxona-postgres pg_isready -U "$_DB_USER" &>/dev/null; then
        pass "Docker Postgres: ishlamoqda"
      else
        fail "Docker Postgres: ishlamayapti"
      fi
    else
      warn "pg_isready topilmadi — tekshirib bo'lmadi"
    fi

    unset PGPASSWORD
  else
    warn "DATABASE_URL yo'q — DB tekshirilmadi"
  fi

  # ── 3. Redis ──────────────────────────────────────────────────────────────────
  head "3. Redis"

  REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
  _R_HOST=$(echo "$REDIS_URL" | sed 's|redis://||' | cut -d: -f1)
  _R_PORT=$(echo "$REDIS_URL" | sed 's|redis://||' | cut -d: -f2 | cut -d/ -f1)
  _R_PORT="${_R_PORT:-6379}"

  if command -v redis-cli &>/dev/null; then
    PONG=$(redis-cli -h "$_R_HOST" -p "$_R_PORT" ping 2>/dev/null || echo "FAIL")
    if [[ "$PONG" == "PONG" ]]; then
      REDIS_MEM=$(redis-cli -h "$_R_HOST" -p "$_R_PORT" \
        info memory 2>/dev/null | grep "used_memory_human" | cut -d: -f2 | tr -d '\r' || echo "?")
      REDIS_KEYS=$(redis-cli -h "$_R_HOST" -p "$_R_PORT" \
        dbsize 2>/dev/null || echo "?")
      pass "Ulanish: OK ($_R_HOST:$_R_PORT)"
      info "Xotira: $REDIS_MEM | Keys: $REDIS_KEYS"
    else
      fail "Redis ping muvaffaqiyatsiz: $_R_HOST:$_R_PORT"
    fi
  elif docker ps --format '{{.Names}}' 2>/dev/null | grep -q "oshxona-redis\|redis"; then
    PONG=$(docker exec oshxona-redis redis-cli ping 2>/dev/null || echo "FAIL")
    [[ "$PONG" == "PONG" ]] && pass "Docker Redis: ishlamoqda" || fail "Docker Redis: ishlamayapti"
  else
    warn "redis-cli topilmadi — tekshirib bo'lmadi"
  fi

  # ── 4. Docker containers ──────────────────────────────────────────────────────
  head "4. Docker Containers"

  if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
    declare -A EXPECTED_CONTAINERS=(
      ["oshxona-backend"]="API server"
      ["oshxona-postgres"]="PostgreSQL"
      ["oshxona-redis"]="Redis"
      ["oshxona-nginx"]="Nginx (ixtiyoriy)"
    )

    for container in "${!EXPECTED_CONTAINERS[@]}"; do
      label="${EXPECTED_CONTAINERS[$container]}"
      STATUS=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "not_found")
      HEALTH=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}no_healthcheck{{end}}' \
        "$container" 2>/dev/null || echo "?")

      if [[ "$STATUS" == "running" ]]; then
        UPTIME=$(docker inspect --format='{{.State.StartedAt}}' "$container" 2>/dev/null | \
          xargs -I{} date -d {} '+%Y-%m-%d %H:%M' 2>/dev/null || echo "?")
        if [[ "$HEALTH" == "healthy" || "$HEALTH" == "no_healthcheck" ]]; then
          pass "$container ($label): running"
        elif [[ "$HEALTH" == "starting" ]]; then
          warn "$container: running (health: starting...)"
        else
          warn "$container: running (health: $HEALTH)"
        fi
      elif [[ "$STATUS" == "not_found" ]]; then
        # nginx ixtiyoriy — fail emas
        [[ "$container" == "oshxona-nginx" ]] && \
          info "$container: topilmadi (ixtiyoriy)" || \
          fail "$container ($label): TOPILMADI"
      else
        fail "$container ($label): $STATUS"
      fi
    done
  else
    warn "Docker topilmadi yoki ishlamayapti"
  fi

  # ── 5. Disk va Memory ─────────────────────────────────────────────────────────
  head "5. Tizim Resurslari"

  # Disk
  while IFS= read -r line; do
    PCT=$(echo "$line" | awk '{gsub(/%/,""); print $5}')
    MOUNT=$(echo "$line" | awk '{print $6}')
    AVAIL=$(echo "$line" | awk '{print $4}')
    [[ -z "$PCT" ]] && continue
    if [[ "$PCT" -ge 90 ]]; then
      fail "Disk $MOUNT: ${PCT}% band ($AVAIL bo'sh) — KRITIK!"
    elif [[ "$PCT" -ge 75 ]]; then
      warn "Disk $MOUNT: ${PCT}% band ($AVAIL bo'sh)"
    else
      pass "Disk $MOUNT: ${PCT}% band ($AVAIL bo'sh)"
    fi
  done < <(df -h / /var 2>/dev/null | tail -n +2 | sort -u)

  # RAM
  if command -v free &>/dev/null; then
    MEM_TOTAL=$(free -m | awk 'NR==2{print $2}')
    MEM_USED=$(free -m  | awk 'NR==2{print $3}')
    MEM_PCT=$(( MEM_USED * 100 / MEM_TOTAL ))
    if [[ "$MEM_PCT" -ge 90 ]]; then
      fail "RAM: ${MEM_PCT}% band (${MEM_USED}/${MEM_TOTAL} MB)"
    elif [[ "$MEM_PCT" -ge 75 ]]; then
      warn "RAM: ${MEM_PCT}% band (${MEM_USED}/${MEM_TOTAL} MB)"
    else
      pass "RAM: ${MEM_PCT}% band (${MEM_USED}/${MEM_TOTAL} MB)"
    fi
  fi

  # Load average
  if [[ -f /proc/loadavg ]]; then
    LOAD=$(cat /proc/loadavg | awk '{print $1}')
    CPU_CORES=$(nproc 2>/dev/null || echo "1")
    LOAD_INT=$(echo "$LOAD * 100" | bc 2>/dev/null | cut -d. -f1 || echo "0")
    LOAD_MAX=$((CPU_CORES * 100))
    if (( $(echo "$LOAD > $CPU_CORES" | bc -l 2>/dev/null || echo 0) )); then
      warn "CPU load: $LOAD (yadrolar: $CPU_CORES)"
    else
      pass "CPU load: $LOAD (yadrolar: $CPU_CORES)"
    fi
  fi

  # ── 6. Backup holati ──────────────────────────────────────────────────────────
  head "6. Backup"

  BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
  if ls "$BACKUP_DIR"/oshxona_*.sql.gz &>/dev/null 2>&1; then
    LAST_BACKUP="$(ls -t "$BACKUP_DIR"/oshxona_*.sql.gz | head -1)"
    LAST_SIZE="$(du -sh "$LAST_BACKUP" | cut -f1)"
    LAST_DATE="$(date -r "$LAST_BACKUP" '+%Y-%m-%d %H:%M' 2>/dev/null || \
      stat -c '%y' "$LAST_BACKUP" | cut -c1-16)"
    BACKUP_AGE_HOURS=$(( ($(date +%s) - $(date -r "$LAST_BACKUP" +%s 2>/dev/null || \
      stat -c %Y "$LAST_BACKUP")) / 3600 ))
    BACKUP_COUNT=$(ls "$BACKUP_DIR"/oshxona_*.sql.gz 2>/dev/null | wc -l)

    if [[ "$BACKUP_AGE_HOURS" -gt 25 ]]; then
      fail "Oxirgi backup: $LAST_DATE (${BACKUP_AGE_HOURS}s oldin — juda eski!)"
    elif [[ "$BACKUP_AGE_HOURS" -gt 13 ]]; then
      warn "Oxirgi backup: $LAST_DATE (${BACKUP_AGE_HOURS}s oldin)"
    else
      pass "Oxirgi backup: $LAST_DATE ($LAST_SIZE, ${BACKUP_AGE_HOURS}s oldin)"
    fi
    info "Jami backuplar: $BACKUP_COUNT ta"
  else
    warn "Backup topilmadi: $BACKUP_DIR"
    info "Backup olish: bash scripts/backup.sh"
  fi

  # ── Yakuniy hisobot ───────────────────────────────────────────────────────────
  print_summary
}

print_summary() {
  echo ""
  sep
  if [[ "$FAIL_COUNT" -eq 0 && "$WARN_COUNT" -eq 0 ]]; then
    echo -e "${BOLD}${G}  ✅  TIZIM HOLATI: A'LO — barcha tekshiruvlar o'tdi${NC}"
  elif [[ "$FAIL_COUNT" -eq 0 ]]; then
    echo -e "${BOLD}${Y}  ⚠️   TIZIM HOLATI: YAXSHI — $WARN_COUNT ta ogohlantirish${NC}"
  else
    echo -e "${BOLD}${R}  ❌  TIZIM HOLATI: MUAMMO — $FAIL_COUNT xato, $WARN_COUNT ogohlantirish${NC}"
  fi
  sep
  echo ""

  if [[ "$FAIL_COUNT" -gt 0 ]]; then
    exit 1
  fi
}

# ── Watch rejim ───────────────────────────────────────────────────────────────
if $WATCH; then
  while true; do
    clear
    run_checks
    echo -e "  ${B}Yangilanish: har 30 soniya. To'xtatish: Ctrl+C${NC}"
    sleep 30
  done
else
  run_checks
fi
