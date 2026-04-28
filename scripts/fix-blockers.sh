#!/usr/bin/env bash
# =============================================================================
# fix-blockers.sh — Production blockerlarni avtomatik tuzatish
#
# ISHLATISH:
#   bash scripts/fix-blockers.sh              # interaktiv
#   bash scripts/fix-blockers.sh --yes        # barcha savollarga "ha"
#   bash scripts/fix-blockers.sh --dry-run    # faqat korsatish
# =============================================================================

set +e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'
B='\033[0;34m'; C='\033[0;36m'; M='\033[0;35m'
BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

AUTO_YES=false
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --yes|-y)   AUTO_YES=true ;;
    --dry-run)  DRY_RUN=true  ;;
  esac
done

FIXED=0; SKIPPED=0; FAILED=0

ok()   { echo -e "  ${G}OK${NC}  $*";   FIXED=$((FIXED+1));   }
skip() { echo -e "  ${Y}--${NC}  $*";   SKIPPED=$((SKIPPED+1)); }
fail() { echo -e "  ${R}XX${NC}  ${BOLD}$*${NC}"; FAILED=$((FAILED+1)); }
info() { echo -e "  ${B}..${NC}  $*"; }
step() { echo -e "\n${BOLD}${C}>>> $*${NC}"; }

confirm() {
  $AUTO_YES && return 0
  printf "  %s [Y/n] " "$1"
  read -r ans
  [[ -z "$ans" || "$ans" =~ ^[Yy] ]]
}

run() {
  $DRY_RUN && { echo -e "  ${DIM}[dry]${NC} $*"; return 0; }
  eval "$*"
}

# =============================================================================
echo ""
echo -e "${BOLD}${M}====================================================${NC}"
echo -e "${BOLD}${M}  OSHXONA POS — BLOCKER AVTOMATIK TUZATUVCHI${NC}"
echo -e "${BOLD}${M}====================================================${NC}"
echo ""
info "Loyiha : $ROOT"
info "Vaqt   : $(date +%Y-%m-%d\ %H:%M:%S)"
$DRY_RUN  && echo -e "  ${Y}${BOLD}DRY-RUN — hech narsa ozgartirilmaydi${NC}"
$AUTO_YES && echo -e "  ${G}AUTO-YES — barcha savollarga avtomatik ha${NC}"

# =============================================================================
step "1. apps/api/.env fayli"
# =============================================================================

ENV_FILE="$ROOT/apps/api/.env"

if [[ -f "$ENV_FILE" ]]; then
  skip ".env allaqachon mavjud"
else
  if confirm ".env fayli yoq. Yaratilsinmi?"; then

    if command -v openssl &>/dev/null; then
      JWT_S=$(openssl rand -base64 48 | tr -d '\n')
      JWT_R=$(openssl rand -base64 48 | tr -d '\n')
    else
      JWT_S=$(date +%s%N | sha256sum | base64 | head -c 64)
      JWT_R=$(date +%s%N%N | sha256sum | base64 | head -c 64)
    fi

    if ! $DRY_RUN; then
      {
        echo "# Oshxona POS — API muhit ozgaruvchilari"
        echo "# Yaratildi: $(date +%Y-%m-%d)"
        echo ""
        echo "NODE_ENV=production"
        echo "PORT=3000"
        echo ""
        echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/oshxona_pos"
        echo "REDIS_URL=redis://localhost:6379"
        echo ""
        echo "JWT_SECRET=${JWT_S}"
        echo "JWT_REFRESH_SECRET=${JWT_R}"
        echo "JWT_EXPIRES_IN=15m"
        echo "JWT_REFRESH_EXPIRES_IN=7d"
        echo ""
        echo "CLIENT_URL=http://localhost:5173,http://localhost:4000"
        echo "LOG_LEVEL=info"
        echo ""
        echo "# Sentry (ixtiyoriy)"
        echo "# SENTRY_DSN="
        echo ""
        echo "# Markirovka"
        echo "# MARKIROVKA_API_URL=https://api.markirovka.uz"
        echo "# MARKIROVKA_API_KEY="
        echo "# MARKIROVKA_SELLER_TIN="
        echo ""
        echo "# Payme"
        echo "# PAYME_MERCHANT_ID="
        echo "# PAYME_SECRET_KEY="
        echo "# PAYME_TEST_MODE=false"
        echo ""
        echo "# Click"
        echo "# CLICK_MERCHANT_ID="
        echo "# CLICK_SERVICE_ID="
        echo "# CLICK_SECRET_KEY="
        echo ""
        echo "# Eskiz SMS"
        echo "# ESKIZ_EMAIL="
        echo "# ESKIZ_PASSWORD="
        echo ""
        echo "# Telegram Bot"
        echo "# TELEGRAM_BOT_TOKEN="
      } > "$ENV_FILE"
    fi

    ok ".env yaratildi (apps/api/.env)"
    echo -e "  ${R}${BOLD}MUHIM:${NC} DATABASE_URL, CLIENT_URL va boshqalarni sozlang!"
  else
    skip ".env yaratish otkazildi"
  fi
fi

# =============================================================================
step "2. .env qiymatlarini tekshirish"
# =============================================================================

if [[ -f "$ENV_FILE" ]]; then

  # JWT_SECRET
  JWT_CUR=$(grep "^JWT_SECRET=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
  if [[ -z "$JWT_CUR" || "${#JWT_CUR}" -lt 32 ]]; then
    if confirm "JWT_SECRET bosh yoki qisqa. Yangilash?"; then
      if command -v openssl &>/dev/null; then
        NEW_J=$(openssl rand -base64 48 | tr -d '\n')
      else
        NEW_J=$(date +%s%N | sha256sum | base64 | head -c 64)
      fi
      if ! $DRY_RUN; then
        if grep -q "^JWT_SECRET=" "$ENV_FILE"; then
          sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${NEW_J}|" "$ENV_FILE"
        else
          echo "JWT_SECRET=${NEW_J}" >> "$ENV_FILE"
        fi
      fi
      ok "JWT_SECRET yangilandi"
    else
      skip "JWT_SECRET ozgartirilmadi"
    fi
  else
    ok "JWT_SECRET mavjud (${#JWT_CUR} belgi)"
  fi

  # JWT_REFRESH_SECRET
  JWT_R_CUR=$(grep "^JWT_REFRESH_SECRET=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
  if [[ -z "$JWT_R_CUR" || "${#JWT_R_CUR}" -lt 32 ]]; then
    if command -v openssl &>/dev/null; then
      NEW_JR=$(openssl rand -base64 48 | tr -d '\n')
    else
      NEW_JR=$(date +%s%N%N | sha256sum | base64 | head -c 64)
    fi
    if ! $DRY_RUN; then
      if grep -q "^JWT_REFRESH_SECRET=" "$ENV_FILE"; then
        sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${NEW_JR}|" "$ENV_FILE"
      else
        echo "JWT_REFRESH_SECRET=${NEW_JR}" >> "$ENV_FILE"
      fi
    fi
    ok "JWT_REFRESH_SECRET yangilandi"
  else
    ok "JWT_REFRESH_SECRET mavjud (${#JWT_R_CUR} belgi)"
  fi

  # NODE_ENV
  NODE_CURR=$(grep "^NODE_ENV=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
  if [[ "$NODE_CURR" != "production" ]]; then
    if confirm "NODE_ENV=${NODE_CURR:-bosh}. production ga ozgartirish?"; then
      if ! $DRY_RUN; then
        if grep -q "^NODE_ENV=" "$ENV_FILE"; then
          sed -i "s|^NODE_ENV=.*|NODE_ENV=production|" "$ENV_FILE"
        else
          echo "NODE_ENV=production" >> "$ENV_FILE"
        fi
      fi
      ok "NODE_ENV=production ornatildi"
    else
      skip "NODE_ENV ozgartirilmadi"
    fi
  else
    ok "NODE_ENV=production (to'g'ri)"
  fi

fi

# =============================================================================
step "3. Docker konteynerlar"
# =============================================================================

COMPOSE_FILE="$ROOT/docker/docker-compose.yml"

if ! command -v docker &>/dev/null; then
  fail "Docker ornatilmagan — https://docs.docker.com/get-docker/"
else

  # PostgreSQL
  if docker ps 2>/dev/null | grep -q "oshxona-postgres"; then
    ok "PostgreSQL oshxona-postgres ishlamoqda"
  else
    if confirm "oshxona-postgres ishlamayapti. Ishga tushirish?"; then
      if [[ -f "$COMPOSE_FILE" ]]; then
        run "docker-compose -f '$COMPOSE_FILE' up -d postgres"
      else
        run "docker run -d --name oshxona-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=oshxona_pos -p 5432:5432 postgres:16-alpine"
      fi
      info "PostgreSQL tayyor bulishini kutmoqda (max 30s)..."
      if ! $DRY_RUN; then
        for i in $(seq 1 30); do
          docker exec oshxona-postgres pg_isready -U postgres -q 2>/dev/null && break
          sleep 1
        done
        docker exec oshxona-postgres pg_isready -U postgres -q 2>/dev/null \
          && ok "PostgreSQL tayyor" \
          || fail "PostgreSQL 30s ichida tayyor bolmadi"
      fi
    else
      skip "PostgreSQL otkazildi"
    fi
  fi

  # Redis
  if docker ps 2>/dev/null | grep -q "oshxona-redis"; then
    ok "Redis oshxona-redis ishlamoqda"
  else
    if confirm "oshxona-redis ishlamayapti. Ishga tushirish?"; then
      if [[ -f "$COMPOSE_FILE" ]]; then
        run "docker-compose -f '$COMPOSE_FILE' up -d redis"
      else
        run "docker run -d --name oshxona-redis -p 6379:6379 redis:7-alpine"
      fi
      sleep 2
      if ! $DRY_RUN; then
        docker exec oshxona-redis redis-cli ping 2>/dev/null | grep -q PONG \
          && ok "Redis tayyor" \
          || fail "Redis ishga tushmadi"
      fi
    else
      skip "Redis otkazildi"
    fi
  fi
fi

# =============================================================================
step "4. npm dependencies"
# =============================================================================

if [[ ! -d "$ROOT/node_modules" ]]; then
  if confirm "node_modules topilmadi. npm install?"; then
    info "npm install (bir necha daqiqa)..."
    run "cd '$ROOT' && npm install --legacy-peer-deps 2>&1 | tail -3"
    ok "npm install yakunlandi"
  else
    skip "npm install otkazildi"
  fi
else
  ok "node_modules mavjud"
fi

# =============================================================================
step "5. Prisma generate va migrate"
# =============================================================================

SCHEMA="$ROOT/packages/database/prisma/schema.prisma"

if ! command -v npx &>/dev/null; then
  fail "npx topilmadi — Node.js ornatilganmi?"
elif [[ ! -f "$SCHEMA" ]]; then
  fail "schema.prisma topilmadi: $SCHEMA"
else

  # Prisma generate
  info "Prisma client generatsiya..."
  if ! $DRY_RUN; then
    DB_GEN="postgresql://x:x@localhost/x"
    [[ -f "$ENV_FILE" ]] && {
      TMP_DB=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' || true)
      [[ -n "$TMP_DB" ]] && DB_GEN="$TMP_DB"
    }
    GEN=$(cd "$ROOT" && DATABASE_URL="$DB_GEN" \
      npx prisma generate --schema=packages/database/prisma/schema.prisma 2>&1 || true)
    echo "$GEN" | grep -q "Generated Prisma Client" \
      && ok "Prisma client generatsiya qilindi" \
      || fail "Prisma generate xato: $(echo "$GEN" | tail -1)"
  else
    echo -e "  ${DIM}[dry] npx prisma generate${NC}"
  fi

  # Prisma migrate
  if [[ -f "$ENV_FILE" ]]; then
    DB_URL=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' || true)
    if [[ -n "$DB_URL" ]]; then
      if confirm "Prisma migrate deploy (DB schema yangilanadi)?"; then
        if ! $DRY_RUN; then
          MIG=$(cd "$ROOT" && DATABASE_URL="$DB_URL" \
            npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma 2>&1 || true)
          echo "$MIG" | grep -qiE "applied|no pending|already" \
            && ok "Prisma migrate qollanildi" \
            || { fail "Migrate xato:"; echo "$MIG" | tail -5; }
        else
          echo -e "  ${DIM}[dry] npx prisma migrate deploy${NC}"
        fi
      else
        skip "Prisma migrate otkazildi"
      fi
    else
      skip "DATABASE_URL bosh — migrate otkazildi"
    fi
  fi
fi

# =============================================================================
step "6. Frontend .env.production"
# =============================================================================

PORT_V="3000"
[[ -f "$ENV_FILE" ]] && {
  TMP_P=$(grep "^PORT=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' || true)
  [[ -n "$TMP_P" ]] && PORT_V="$TMP_P"
}
API_DEFAULT="http://localhost:${PORT_V}"

for app in pos web kitchen waiter; do
  APP_DIR="$ROOT/apps/${app}"
  ENV_P="$APP_DIR/.env.production"
  [[ -d "$APP_DIR/src" ]] || continue

  if [[ -f "$ENV_P" ]]; then
    ok "apps/${app}/.env.production mavjud"
  else
    if confirm "apps/${app}/.env.production yoq. Yaratish?"; then
      if ! $DRY_RUN; then
        {
          echo "VITE_API_URL=${API_DEFAULT}/api"
          echo "VITE_WS_URL=${API_DEFAULT}"
        } > "$ENV_P"
      fi
      ok "apps/${app}/.env.production yaratildi"
      info "  VITE_API_URL=${API_DEFAULT}/api — serverni ozgartiring"
    else
      skip "apps/${app}/.env.production otkazildi"
    fi
  fi
done

# =============================================================================
step "7. Script ruxsatlar (chmod +x)"
# =============================================================================

for sc in "$SCRIPT_DIR"/*.sh; do
  [[ -f "$sc" ]] || continue
  if [[ -x "$sc" ]]; then
    ok "$(basename "$sc") executable"
  else
    run "chmod +x '$sc'"
    ok "$(basename "$sc") chmod +x qollanildi"
  fi
done

# =============================================================================
step "8. PM2 ecosystem.config.cjs"
# =============================================================================

PM2_CFG="$ROOT/ecosystem.config.cjs"

if [[ -f "$PM2_CFG" ]]; then
  ok "ecosystem.config.cjs mavjud"
else
  if confirm "PM2 config yoq. Yaratish?"; then
    if ! $DRY_RUN; then
      node -e "
const fs = require('fs');
const cfg = \`module.exports = {
  apps: [{
    name:    'oshxona-api',
    script:  'apps/api/dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    max_memory_restart: '512M',
    error_file: 'logs/pm2-error.log',
    out_file:   'logs/pm2-out.log',
    autorestart: true,
    watch: false,
  }],
};
\`;
fs.writeFileSync('${PM2_CFG}', cfg);
console.log('OK');
" 2>/dev/null && ok "ecosystem.config.cjs yaratildi" || fail "PM2 config yaratib bolmadi"
    else
      echo -e "  ${DIM}[dry] ecosystem.config.cjs yoziladi${NC}"
    fi
    info "  Ishlatish: pm2 start ecosystem.config.cjs --env production"
  else
    skip "PM2 config otkazildi"
  fi
fi

# =============================================================================
step "9. logs/ papkasi"
# =============================================================================

LOGS="$ROOT/apps/api/logs"
if [[ -d "$LOGS" ]]; then
  ok "logs/ papkasi mavjud"
else
  run "mkdir -p '$LOGS'"
  ok "logs/ papkasi yaratildi"
fi

GITIGNORE="$ROOT/.gitignore"
if [[ -f "$GITIGNORE" ]] && ! grep -q "^logs/" "$GITIGNORE"; then
  if ! $DRY_RUN; then echo "logs/" >> "$GITIGNORE"; fi
  ok ".gitignore ga logs/ qoshildi"
fi

# =============================================================================
step "10. Production tekshiruvi"
# =============================================================================

CHECK="$SCRIPT_DIR/check-production-ready.sh"
if [[ -f "$CHECK" ]]; then
  if confirm "check-production-ready.sh qayta ishlatilsinmi?"; then
    echo ""
    if ! $DRY_RUN; then
      bash "$CHECK" 2>&1 || true
    else
      echo -e "  ${DIM}[dry] bash check-production-ready.sh${NC}"
    fi
  else
    skip "Qayta tekshiruv otkazildi"
  fi
fi

# =============================================================================
# NATIJA
# =============================================================================
echo ""
echo -e "${BOLD}${M}====================================================${NC}"
echo -e "${BOLD}${M}  NATIJA${NC}"
echo -e "${BOLD}${M}====================================================${NC}"
printf "  ${G}OK  Tuzatildi    : %-4s${NC}\n" "$FIXED"
printf "  ${Y}--  Otkazildi    : %-4s${NC}\n" "$SKIPPED"
printf "  ${R}XX  Xato         : %-4s${NC}\n" "$FAILED"
echo ""

if [[ $FAILED -eq 0 ]]; then
  echo -e "  ${G}${BOLD}Barcha blockerlar tuzatildi!${NC}"
  echo ""
  echo -e "  Keyingi qadamlar:"
  echo -e "  1. nano apps/api/.env  — DB va boshqa qiymatlarni sozlang"
  echo -e "  2. bash scripts/check-production-ready.sh  — qayta tekshiruv"
  echo -e "  3. npm run build  — production build"
  echo -e "  4. pm2 start ecosystem.config.cjs --env production"
else
  echo -e "  ${R}${BOLD}${FAILED} ta narsa tuzatilmadi — qolda tekshiring.${NC}"
fi

echo ""
echo -e "${DIM}  $(date +%Y-%m-%d\ %H:%M:%S) | $ROOT${NC}"
echo ""
