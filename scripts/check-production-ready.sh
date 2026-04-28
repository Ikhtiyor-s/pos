#!/usr/bin/env bash
# =============================================================================
# check-production-ready.sh — Oshxona POS production tayyorligi FULL tekshiruv
#
# ISHLATISH:
#   bash scripts/check-production-ready.sh
#   bash scripts/check-production-ready.sh --with-build   # npm build ham tekshirish
#   bash scripts/check-production-ready.sh --with-api     # API runtime tekshirish
#   bash scripts/check-production-ready.sh --full         # hammasi
#
# NATIJA:
#   ✅ READY   — production ga chiqsa bo'ladi
#   ❌ BLOCKER — bu xato tuzatilmasa deploy MUMKIN EMAS
#   ⚠️ WARNING — tavsiya etiladi, lekin blocker emas
#   ⏭ SKIPPED — bayroq yo'q, o'tkazildi
# =============================================================================

set +e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

# ── Ranglar ───────────────────────────────────────────────────────────────────
G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'
B='\033[0;34m'; C='\033[0;36m'; M='\033[0;35m'
BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

# ── Hisoblagichlar ─────────────────────────────────────────────────────────────
PASS=0; FAIL=0; WARN=0; SKIP=0
BLOCKERS=()
WARNINGS=()

# ── Bayroqlar ──────────────────────────────────────────────────────────────────
WITH_BUILD=false; WITH_API=false
for arg in "$@"; do
  case "$arg" in
    --with-build) WITH_BUILD=true ;;
    --with-api)   WITH_API=true   ;;
    --full)       WITH_BUILD=true; WITH_API=true ;;
  esac
done

# ── Output funksiyalar ─────────────────────────────────────────────────────────
ok()   { echo -e "  ${G}✅${NC}  $*"; PASS=$((PASS+1)); }
fail() { echo -e "  ${R}❌${NC}  ${BOLD}$*${NC}"; FAIL=$((FAIL+1)); BLOCKERS+=("$*"); }
warn() { echo -e "  ${Y}⚠️ ${NC}  $*"; WARN=$((WARN+1)); WARNINGS+=("$*"); }
skip() { echo -e "  ${DIM}⏭  $*${NC}"; SKIP=$((SKIP+1)); }
info() { echo -e "  ${B}ℹ️ ${NC}  $*"; }
sep()  {
  echo ""
  echo -e "${BOLD}${C}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${C}  $*${NC}"
  echo -e "${BOLD}${C}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

has()  { grep -qE "$2" "$1" 2>/dev/null; }
isfile() { [[ -f "$1" ]]; }
isdir()  { [[ -d "$1" ]]; }

# .env fayldan qiymat olish
env_val() {
  local file="$1" key="$2"
  grep "^${key}=" "$file" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'"
}

# .env da kalit bormi?
env_has() {
  local file="$1" key="$2"
  grep -qE "^${key}=.+" "$file" 2>/dev/null
}

# API porta
API_URL="${BASE_URL:-http://localhost:3000}"

# =============================================================================
echo ""
echo -e "${BOLD}${M}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${M}║   🚀  OSHXONA POS — PRODUCTION TAYYORLIGI TEKSHIRUVI          ║${NC}"
echo -e "${BOLD}${M}║   12 bo'lim • Deploy oldidan barcha narsani tekshiradi         ║${NC}"
echo -e "${BOLD}${M}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""
info "Loyiha: $ROOT"
info "Vaqt  : $(date '+%Y-%m-%d %H:%M:%S')"
[[ "$WITH_BUILD" == "true" ]] && info "Rejim  : --with-build aktiv" || info "Rejim  : statik (--full uchun to'liq tekshiruv)"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
sep "1️⃣  MUHIT O'ZGARUVCHILARI (Environment Variables)"
# ─────────────────────────────────────────────────────────────────────────────

ENV_FILE="$ROOT/apps/api/.env"
ENV_EXAMPLE="$ROOT/apps/api/.env.example"

if isfile "$ENV_FILE"; then
  ok ".env fayli mavjud: apps/api/.env"
else
  fail ".env fayli YO'Q → apps/api/.env yarating (.env.example dan nusxa oling)"
fi

# Majburiy o'zgaruvchilar
echo ""
info "Majburiy o'zgaruvchilar:"
for key in DATABASE_URL REDIS_URL JWT_SECRET JWT_REFRESH_SECRET PORT NODE_ENV CLIENT_URL; do
  if env_has "$ENV_FILE" "$key"; then
    val=$(env_val "$ENV_FILE" "$key")
    # Qiymat default/placeholder emasligini tekshirish
    case "$key" in
      JWT_SECRET|JWT_REFRESH_SECRET)
        if [[ ${#val} -lt 32 ]]; then
          fail "$key qisqa (${#val} belgi) — kamida 32 belgi kerak"
        elif echo "$val" | grep -qiE "secret|example|change|your|test|dev"; then
          warn "$key default qiymat ko'rinadi — o'zgartiring"
        else
          ok "$key ✓ (${#val} belgi)"
        fi ;;
      DATABASE_URL)
        if echo "$val" | grep -qE "localhost|127\.0\.0\.1"; then
          warn "$key localhost → production da real DB manzil bo'lishi kerak"
        else
          ok "$key ✓"
        fi ;;
      NODE_ENV)
        if [[ "$val" == "production" ]]; then
          ok "$key = production ✓"
        else
          warn "$key = '$val' → production bo'lishi kerak"
        fi ;;
      CLIENT_URL)
        if echo "$val" | grep -qE "localhost|127\.0\.0\.1"; then
          warn "$key localhost → production domain kerak"
        else
          ok "$key ✓ ($val)"
        fi ;;
      *)
        ok "$key ✓" ;;
    esac
  else
    fail "$key belgilanmagan — MAJBURIY!"
  fi
done

echo ""
info "Ixtiyoriy (tavsiya etiladi) o'zgaruvchilar:"
for key in SENTRY_DSN LOG_LEVEL MARKIROVKA_API_URL MARKIROVKA_SELLER_TIN; do
  if env_has "$ENV_FILE" "$key"; then
    ok "$key ✓"
  else
    warn "$key belgilanmagan (ixtiyoriy lekin muhim)"
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
sep "2️⃣  INFRATUZILMA (Database & Redis)"
# ─────────────────────────────────────────────────────────────────────────────

# Redis
REDIS_HOST="127.0.0.1"; REDIS_PORT="6379"
if isfile "$ENV_FILE"; then
  RURL=$(env_val "$ENV_FILE" "REDIS_URL")
  [[ -n "$RURL" ]] && {
    _h="${RURL#*://}"; _h="${_h%%:*}"; _p="${RURL##*:}"; _p="${_p%%/*}"
    [[ -n "$_h" ]] && REDIS_HOST="$_h"
    [[ "$_p" =~ ^[0-9]+$ ]] && REDIS_PORT="$_p"
  }
fi

REDIS_OK=false
if command -v redis-cli &>/dev/null; then
  if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>/dev/null | grep -q PONG; then
    ok "Redis: ULANISH OK ($REDIS_HOST:$REDIS_PORT)"
    REDIS_OK=true
  else
    fail "Redis: ulanib bo'lmadi ($REDIS_HOST:$REDIS_PORT) — Redis ishga tushirilganmi?"
  fi
elif command -v docker &>/dev/null; then
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "oshxona-redis"; then
    docker exec oshxona-redis redis-cli ping 2>/dev/null | grep -q PONG \
      && { ok "Redis: OK (Docker: oshxona-redis)"; REDIS_OK=true; } \
      || fail "Redis: Docker konteyner bor lekin PING xato"
  else
    fail "Redis: oshxona-redis Docker konteyneri ishlamayapti"
  fi
elif command -v nc &>/dev/null; then
  nc -z -w2 "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null \
    && { ok "Redis: port ochiq ($REDIS_HOST:$REDIS_PORT)"; REDIS_OK=true; } \
    || fail "Redis: $REDIS_HOST:$REDIS_PORT ga ulanib bo'lmadi"
else
  warn "Redis: tekshirib bo'lmadi (redis-cli/docker/nc yo'q)"
fi

# PostgreSQL
DB_HOST=""; DB_PORT="5432"
if isfile "$ENV_FILE"; then
  DBURL=$(env_val "$ENV_FILE" "DATABASE_URL")
  [[ -n "$DBURL" ]] && {
    _u="${DBURL#*@}"; DB_HOST="${_u%%:*}"; DB_HOST="${DB_HOST%%/*}"
    _p="${_u#*:}"; DB_PORT="${_p%%/*}"
    [[ ! "$DB_PORT" =~ ^[0-9]+$ ]] && DB_PORT="5432"
  }
fi

PG_OK=false
if command -v pg_isready &>/dev/null && [[ -n "$DB_HOST" ]]; then
  pg_isready -h "$DB_HOST" -p "$DB_PORT" -t 3 &>/dev/null \
    && { ok "PostgreSQL: OK ($DB_HOST:$DB_PORT)"; PG_OK=true; } \
    || fail "PostgreSQL: $DB_HOST:$DB_PORT — ulanib bo'lmadi"
elif command -v docker &>/dev/null; then
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "oshxona-postgres"; then
    docker exec oshxona-postgres pg_isready -U postgres -t 3 &>/dev/null \
      && { ok "PostgreSQL: OK (Docker: oshxona-postgres)"; PG_OK=true; } \
      || fail "PostgreSQL: Docker konteyner bor lekin pg_isready xato"
  else
    fail "PostgreSQL: oshxona-postgres Docker konteyneri ishlamayapti"
  fi
else
  warn "PostgreSQL: tekshirib bo'lmadi"
fi

# Prisma migrate holati
echo ""
if command -v npx &>/dev/null && isfile "$ROOT/packages/database/prisma/schema.prisma"; then
  if $PG_OK || command -v docker &>/dev/null; then
    MIGRATE_STATUS=$(cd "$ROOT" && DATABASE_URL="$(env_val "$ENV_FILE" "DATABASE_URL")" \
      npx prisma migrate status --schema=packages/database/prisma/schema.prisma 2>&1 || true)
    if echo "$MIGRATE_STATUS" | grep -q "Database schema is up to date"; then
      ok "Prisma migrate: barcha migratsiyalar qo'llanilgan"
    elif echo "$MIGRATE_STATUS" | grep -q "pending"; then
      fail "Prisma migrate: qo'llanilmagan migratsiyalar bor → npx prisma migrate deploy"
    else
      warn "Prisma migrate: holatini aniqlashning imkoni yo'q"
    fi
  else
    warn "Prisma migrate: DB ulanmagan, holatini tekshirib bo'lmadi"
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
sep "3️⃣  XAVFSIZLIK (Security)"
# ─────────────────────────────────────────────────────────────────────────────

IDX="$ROOT/apps/api/src/index.ts"

# JWT secrets kuchliligi
if isfile "$ENV_FILE"; then
  JWT=$(env_val "$ENV_FILE" "JWT_SECRET")
  JWT_R=$(env_val "$ENV_FILE" "JWT_REFRESH_SECRET")
  [[ ${#JWT} -ge 64 ]]   && ok   "JWT_SECRET kuchli (${#JWT} belgi)" \
                          || warn "JWT_SECRET qisqa — 64+ belgi tavsiya etiladi"
  [[ ${#JWT_R} -ge 64 ]] && ok   "JWT_REFRESH_SECRET kuchli (${#JWT_R} belgi)" \
                          || warn "JWT_REFRESH_SECRET qisqa — 64+ belgi tavsiya etiladi"
  [[ "$JWT" == "$JWT_R" ]] && fail "JWT_SECRET va JWT_REFRESH_SECRET bir xil! — Farqli qiymat ishlating"
fi

# Trust proxy
isfile "$IDX" && has "$IDX" "trust proxy" \
  && ok   "Trust proxy sozlangan (reverse proxy uchun)" \
  || warn "Trust proxy sozlanmagan — nginx/caddy orqasida ishlasa kerak"

# Helmet
isfile "$IDX" && has "$IDX" "helmet" \
  && ok   "Helmet middleware (security headers) ulangan" \
  || fail "Helmet ulangan emas — XSS, clickjacking himoyasi yo'q"

# CORS
isfile "$IDX" && has "$IDX" "cors" \
  && ok   "CORS middleware ulangan" \
  || fail "CORS ulangan emas"

# Rate limiting
RL="$ROOT/apps/api/src/middleware/rate-limiter.ts"
isfile "$RL" && ok   "Rate limiter fayli mavjud" \
              || warn "Rate limiter topilmadi"

has "$IDX" "globalLimiter\|authLimiter\|rateLimiter\|rate-limiter" \
  && ok   "Rate limiter API da ulangan" \
  || warn "Rate limiter index.ts da ulanmagan"

# Auth middleware
AUTH="$ROOT/apps/api/src/middleware/auth.ts"
isfile "$AUTH" \
  && ok   "Auth middleware mavjud" \
  || fail "Auth middleware topilmadi"

# Error handler
EH="$ROOT/apps/api/src/middleware/errorHandler.ts"
isfile "$EH" \
  && ok   "Error handler mavjud" \
  || fail "Error handler topilmadi"

# Stack trace production da yashirilganmi?
has "$EH" "isProd\|NODE_ENV.*production\|stack.*prod" \
  && ok   "Stack trace production da yashiriladi" \
  || warn "Stack trace production da ko'rinishi mumkin"

# Payme/Click secret kalitlari
echo ""
info "To'lov tizimi xavfsizligi:"
for key in PAYME_SECRET_KEY CLICK_SECRET_KEY; do
  if env_has "$ENV_FILE" "$key"; then
    val=$(env_val "$ENV_FILE" "$key")
    [[ ${#val} -gt 8 ]] && ok "$key ✓" || warn "$key bo'sh yoki juda qisqa"
  else
    warn "$key belgilanmagan (to'lov integratsiyasi uchun kerak)"
  fi
done

# ─────────────────────────────────────────────────────────────────────────────
sep "4️⃣  KOD SIFATI (TypeScript & Linting)"
# ─────────────────────────────────────────────────────────────────────────────

if command -v npx &>/dev/null; then
  info "TypeScript kompilyatsiya tekshirilmoqda (API)..."
  TS_OUT=$(cd "$ROOT" && npx tsc --noEmit --project apps/api/tsconfig.json 2>&1 || true)
  TS_ERR=$(echo "$TS_OUT" | grep -c "error TS" || true)
  if [[ "$TS_ERR" -eq 0 ]]; then
    ok "API TypeScript: 0 ta xato ✓"
  else
    fail "API TypeScript: $TS_ERR ta xato — deploy oldidan tuzating"
    echo "$TS_OUT" | grep "error TS" | head -5 | while read -r line; do
      info "    $line"
    done
  fi

  if isfile "$ROOT/apps/web/tsconfig.json"; then
    info "TypeScript tekshirilmoqda (Web admin)..."
    TS_WEB=$(cd "$ROOT" && npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 || true)
    TS_WEB_ERR=$(echo "$TS_WEB" | grep -c "error TS" || true)
    [[ "$TS_WEB_ERR" -eq 0 ]] \
      && ok  "Web TypeScript: 0 ta xato ✓" \
      || warn "Web TypeScript: $TS_WEB_ERR ta xato"
  fi

  if isfile "$ROOT/apps/pos/tsconfig.json"; then
    info "TypeScript tekshirilmoqda (POS app)..."
    TS_POS=$(cd "$ROOT" && npx tsc --noEmit --project apps/pos/tsconfig.json 2>&1 || true)
    TS_POS_ERR=$(echo "$TS_POS" | grep -c "error TS" || true)
    [[ "$TS_POS_ERR" -eq 0 ]] \
      && ok  "POS TypeScript: 0 ta xato ✓" \
      || warn "POS TypeScript: $TS_POS_ERR ta xato"
  fi
else
  warn "npx topilmadi — TypeScript tekshirib bo'lmadi"
fi

# ─────────────────────────────────────────────────────────────────────────────
sep "5️⃣  API ARXITEKTURASI (Routes & Modules)"
# ─────────────────────────────────────────────────────────────────────────────

RIDX="$ROOT/apps/api/src/routes/index.ts"

info "Route fayllari:"
for route in auth orders products categories tables customer settings \
             user billing dashboard inventory webhook payment nonbor \
             integration branch tenant markirovka qr-menu; do
  RF="$ROOT/apps/api/src/routes/${route}.routes.ts"
  isfile "$RF" \
    && ok  "  routes/${route}.routes.ts ✓" \
    || fail "  routes/${route}.routes.ts YO'Q"
done

echo ""
info "Modul fayllari:"
for mod in ai-analytics delivery finance loyalty notifications \
           online-orders reports reservation sms staff-scheduling \
           sync telegram-bot warehouse webhook-provider; do
  MODD="$ROOT/apps/api/src/modules/${mod}"
  isdir "$MODD" \
    && ok  "  modules/${mod}/ ✓" \
    || warn "  modules/${mod}/ topilmadi"
done

echo ""
info "Core fayllari:"
for f in \
  "apps/api/src/index.ts" \
  "apps/api/src/config/redis.ts" \
  "apps/api/src/config/env.ts" \
  "apps/api/src/middleware/auth.ts" \
  "apps/api/src/middleware/errorHandler.ts" \
  "apps/api/src/middleware/rate-limiter.ts" \
  "apps/api/src/utils/logger.ts" \
  "apps/api/src/utils/response.ts" \
  "packages/database/prisma/schema.prisma"; do
  isfile "$ROOT/$f" \
    && ok  "  $f ✓" \
    || fail "  $f YO'Q — kritik fayl!"
done

# ─────────────────────────────────────────────────────────────────────────────
sep "6️⃣  MA'LUMOTLAR BAZASI (Prisma Schema)"
# ─────────────────────────────────────────────────────────────────────────────

SCHEMA="$ROOT/packages/database/prisma/schema.prisma"

isfile "$SCHEMA" || { fail "schema.prisma topilmadi"; }

if isfile "$SCHEMA"; then
  # Asosiy modellar
  for model in Tenant User Product Category Order OrderItem Payment \
               Customer Supplier InventoryItem Settings Webhook \
               Subscription Plan LoyaltyProgram LoyaltyAccount \
               MarkirovkaProduct MarkirovkaBatch MarkirovkaLog; do
    has "$SCHEMA" "model $model " \
      && ok  "  model $model ✓" \
      || fail "  model $model YO'Q — schema to'liq emas"
  done

  echo ""
  # Prisma generate
  info "Prisma generate tekshirilmoqda..."
  GEN_OUT=$(cd "$ROOT" && DATABASE_URL="postgresql://x:x@localhost/x" \
    npx prisma generate --schema=packages/database/prisma/schema.prisma 2>&1 || true)
  echo "$GEN_OUT" | grep -q "Generated Prisma Client" \
    && ok  "Prisma generate muvaffaqiyatli" \
    || fail "Prisma generate xato: $(echo "$GEN_OUT" | tail -2)"
fi

# ─────────────────────────────────────────────────────────────────────────────
sep "7️⃣  FRONTEND ILOVALAR"
# ─────────────────────────────────────────────────────────────────────────────

info "Fayl tuzilmalari:"
for app in pos web kitchen waiter; do
  APPSRC="$ROOT/apps/${app}/src"
  APPPKG="$ROOT/apps/${app}/package.json"
  if isdir "$APPSRC" && isfile "$APPPKG"; then
    ok  "  apps/${app}/ ✓"
  else
    warn "  apps/${app}/ topilmadi (ixtiyoriy)"
  fi
done

echo ""
info "Frontend konfiguratsiyalari:"
for app in pos web; do
  VITE="$ROOT/apps/${app}/vite.config.ts"
  ENV_APP="$ROOT/apps/${app}/.env.production"
  isfile "$VITE" && ok "  apps/${app}/vite.config.ts ✓" || warn "  apps/${app}/vite.config.ts topilmadi"
  isfile "$ENV_APP" \
    && ok  "  apps/${app}/.env.production ✓" \
    || warn "  apps/${app}/.env.production topilmadi — VITE_API_URL sozlang"
done

# PWA
PWA_MANIFEST="$ROOT/apps/pos/public/manifest.json"
SW="$ROOT/apps/pos/src/sw.ts"
isfile "$PWA_MANIFEST" && ok  "POS PWA manifest.json ✓" || warn "POS PWA manifest.json topilmadi"
isfile "$SW"           && ok  "POS Service Worker (sw.ts) ✓" || warn "POS Service Worker topilmadi"

# ─────────────────────────────────────────────────────────────────────────────
sep "8️⃣  INTEGRATSIYALAR (3rd Party Services)"
# ─────────────────────────────────────────────────────────────────────────────

if isfile "$ENV_FILE"; then
  info "To'lov tizimlari:"
  # Payme
  env_has "$ENV_FILE" "PAYME_MERCHANT_ID" && env_has "$ENV_FILE" "PAYME_SECRET_KEY" \
    && ok  "Payme: merchant_id + secret_key ✓" \
    || warn "Payme: sozlanmagan (to'lov kerak bo'lsa o'rnating)"

  # Click
  env_has "$ENV_FILE" "CLICK_MERCHANT_ID" && env_has "$ENV_FILE" "CLICK_SECRET_KEY" \
    && ok  "Click: merchant_id + secret_key ✓" \
    || warn "Click: sozlanmagan"

  # Uzum
  env_has "$ENV_FILE" "UZUM_MERCHANT_ID" \
    && ok  "Uzum Bank: sozlangan ✓" \
    || warn "Uzum Bank: sozlanmagan"

  echo ""
  info "Xabar yuborish:"
  # Telegram
  env_has "$ENV_FILE" "TELEGRAM_BOT_TOKEN" \
    && ok  "Telegram Bot: token mavjud ✓" \
    || warn "Telegram Bot: token belgilanmagan"

  # SMS (Eskiz)
  env_has "$ENV_FILE" "ESKIZ_EMAIL" && env_has "$ENV_FILE" "ESKIZ_PASSWORD" \
    && ok  "Eskiz SMS: email + password ✓" \
    || warn "Eskiz SMS: sozlanmagan (OTP uchun kerak)"

  echo ""
  info "Markirovka:"
  env_has "$ENV_FILE" "MARKIROVKA_API_URL" \
    && ok  "Markirovka API URL ✓" \
    || warn "MARKIROVKA_API_URL belgilanmagan → https://api.markirovka.uz"
  env_has "$ENV_FILE" "MARKIROVKA_SELLER_TIN" \
    && ok  "MARKIROVKA_SELLER_TIN (STIR) ✓" \
    || warn "MARKIROVKA_SELLER_TIN belgilanmagan (kunlik hisobot uchun kerak)"

  echo ""
  info "Monitoring:"
  env_has "$ENV_FILE" "SENTRY_DSN" \
    && ok  "Sentry DSN ✓ (xatolar kuzatiladi)" \
    || warn "SENTRY_DSN belgilanmagan — production xatolar kuzatilmaydi"

  # Nonbor
  env_has "$ENV_FILE" "NONBOR_SELLER_ID" || env_has "$ENV_FILE" "NONBOR_API_URL" \
    && ok  "Nonbor integratsiya sozlangan ✓" \
    || warn "Nonbor integratsiya sozlanmagan (ixtiyoriy)"
fi

# ─────────────────────────────────────────────────────────────────────────────
sep "9️⃣  LOG VA MONITORING"
# ─────────────────────────────────────────────────────────────────────────────

LOGGER="$ROOT/apps/api/src/utils/logger.ts"
isfile "$LOGGER" \
  && ok  "Logger (Winston) fayli mavjud" \
  || fail "Logger fayli topilmadi"

has "$LOGGER" "DailyRotateFile\|daily-rotate-file" \
  && ok  "Log rotation (DailyRotateFile) sozlangan ✓" \
  || warn "Log rotation sozlanmagan — log fayllari o'smaydi"

has "$LOGGER" "Sentry\|sentry" \
  && ok  "Sentry integratsiya loggerda bor ✓" \
  || warn "Sentry loggerda yo'q"

has "$IDX" "requestIdMiddleware|X-Request-Id|requestId|request-logger|requestLogger" \
  && ok  "Request ID middleware ulangan ✓" \
  || warn "Request ID middleware topilmadi"

has "$IDX" "metricsMiddleware\|prometheus\|prom-client" \
  && ok  "Prometheus metrics ulangan ✓" \
  || warn "Prometheus metrics ulangan emas"

# Health endpoints
for endpoint in healthz health readyz; do
  has "$IDX" "$endpoint" \
    && ok  "/$endpoint endpoint mavjud ✓" \
    || warn "/$endpoint endpoint topilmadi"
done

# ─────────────────────────────────────────────────────────────────────────────
sep "🔟  DOCKER VA DEPLOY"
# ─────────────────────────────────────────────────────────────────────────────

# Dockerfile
for df in \
  "Dockerfile" \
  "docker/docker-compose.yml" \
  "docker/docker-compose.prod.yml"; do
  isfile "$ROOT/$df" \
    && ok  "$df ✓" \
    || warn "$df topilmadi"
done

# Deploy skriptlari
for sc in "scripts/prod-deploy.sh" "scripts/backup.sh" "scripts/health-check.sh"; do
  isfile "$ROOT/$sc" && [[ -x "$ROOT/$sc" ]] \
    && ok  "$sc (executable) ✓" \
    || { isfile "$ROOT/$sc" \
         && warn "$sc mavjud lekin executable emas — chmod +x scripts/*.sh" \
         || warn "$sc topilmadi"; }
done

# Graceful shutdown
has "$IDX" "gracefulShutdown\|SIGTERM\|SIGINT" \
  && ok  "Graceful shutdown sozlangan ✓" \
  || warn "Graceful shutdown sozlanmagan — process.on('SIGTERM') kerak"

# PM2 yoki process manager
isfile "$ROOT/ecosystem.config.js" || isfile "$ROOT/ecosystem.config.cjs" \
  && ok  "PM2 ecosystem config ✓" \
  || warn "PM2 config topilmadi — production da process manager kerak"

# ─────────────────────────────────────────────────────────────────────────────
sep "1️⃣1️⃣  BUILD TEKSHIRUVI (ixtiyoriy)"
# ─────────────────────────────────────────────────────────────────────────────

if [[ "$WITH_BUILD" == "true" ]]; then
  if command -v npm &>/dev/null; then
    info "API build tekshirilmoqda..."
    BUILD_OUT=$(cd "$ROOT" && npm run build --workspace=apps/api 2>&1 || true)
    echo "$BUILD_OUT" | grep -qiE "error|failed" \
      && fail "API build xato: $(echo "$BUILD_OUT" | grep -iE 'error' | head -3)" \
      || ok  "API build muvaffaqiyatli ✓"

    info "POS app build tekshirilmoqda..."
    BUILD_POS=$(cd "$ROOT" && npm run build --workspace=apps/pos 2>&1 || true)
    echo "$BUILD_POS" | grep -qiE "error|failed" \
      && warn "POS build xato (tekshiring)" \
      || ok  "POS app build muvaffaqiyatli ✓"

    info "Web admin build tekshirilmoqda..."
    BUILD_WEB=$(cd "$ROOT" && npm run build --workspace=apps/web 2>&1 || true)
    echo "$BUILD_WEB" | grep -qiE "error|failed" \
      && warn "Web admin build xato (tekshiring)" \
      || ok  "Web admin build muvaffaqiyatli ✓"
  else
    warn "npm topilmadi — build tekshirib bo'lmadi"
  fi
else
  skip "Build tekshiruvi: --with-build yoki --full bayrog'i yo'q"
fi

# ─────────────────────────────────────────────────────────────────────────────
sep "1️⃣2️⃣  API RUNTIME TEKSHIRUVI (ixtiyoriy)"
# ─────────────────────────────────────────────────────────────────────────────

if [[ "$WITH_API" == "true" ]]; then
  if ! command -v curl &>/dev/null; then
    warn "curl topilmadi — API runtime tekshirib bo'lmadi"
  else
    # Health
    HC=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 5 "${API_URL}/healthz" 2>/dev/null || echo "000")
    if [[ "$HC" == "200" ]]; then
      ok "API /healthz → HTTP 200 ✓"

      # Readiness
      READY=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 5 "${API_URL}/readyz" 2>/dev/null || echo "000")
      [[ "$READY" == "200" ]] \
        && ok  "API /readyz → HTTP 200 (DB+Redis ready) ✓" \
        || warn "API /readyz → HTTP $READY (DB yoki Redis muammo?)"

      # Response time
      RT=$(curl -sf -o /dev/null -w "%{time_total}" --max-time 5 "${API_URL}/healthz" 2>/dev/null || echo "9")
      RT_MS=$(echo "$RT * 1000" | bc 2>/dev/null | cut -d'.' -f1 || echo "9999")
      if [[ "${RT_MS:-9999}" -lt 200 ]]; then
        ok  "Health endpoint javob vaqti: ${RT_MS}ms ✓"
      elif [[ "${RT_MS:-9999}" -lt 1000 ]]; then
        warn "Health endpoint javob vaqti: ${RT_MS}ms (200ms dan kam bo'lishi kerak)"
      else
        warn "Health endpoint sekin: ${RT_MS}ms — server resurslarini tekshiring"
      fi

      # Auth endpoint mavjudligi
      AUTH_HTTP=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 5 \
        -X POST -H "Content-Type: application/json" \
        -d '{"email":"nonexistent@test.com","password":"wrong"}' \
        "${API_URL}/api/auth/login" 2>/dev/null || echo "000")
      [[ "$AUTH_HTTP" == "400" || "$AUTH_HTTP" == "401" || "$AUTH_HTTP" == "404" ]] \
        && ok  "Auth endpoint ishlaydi → HTTP $AUTH_HTTP ✓" \
        || warn "Auth endpoint → HTTP $AUTH_HTTP (kutilgan 400/401)"

      # Rate limit ishlayaptimi?
      info "Rate limit tekshirilmoqda (11 ta so'rov)..."
      RATE_HIT=false
      for i in $(seq 1 11); do
        RL_HTTP=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 3 \
          -X POST "${API_URL}/api/auth/login" 2>/dev/null || echo "000")
        [[ "$RL_HTTP" == "429" ]] && { RATE_HIT=true; break; }
      done
      $RATE_HIT \
        && ok  "Rate limiting ishlayapti (429 qaytdi) ✓" \
        || warn "Rate limiting ishlamayapti yoki limit juda yuqori"

    elif [[ "$HC" == "000" ]]; then
      fail "API ${API_URL} ishlamayapti — server ishga tushirilganmi?"
    else
      warn "API /healthz → HTTP $HC"
    fi
  fi
else
  skip "API runtime: --with-api yoki --full bayrog'i yo'q"
  info "  Ishlatish: bash scripts/check-production-ready.sh --with-api"
fi

# =============================================================================
# YAKUNIY HISOBOT
# =============================================================================

TOTAL=$((PASS + FAIL + WARN + SKIP))

echo ""
echo -e "${BOLD}${M}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${M}║                    PRODUCTION TAYYORLIK HISOBOTI              ║${NC}"
echo -e "${BOLD}${M}╠═══════════════════════════════════════════════════════════════╣${NC}"
printf "  ${G}✅  Tayyor (PASS)    : %-4s${NC}\n" "$PASS"
printf "  ${R}❌  Blocker (FAIL)   : %-4s${NC}\n" "$FAIL"
printf "  ${Y}⚠️   Ogohlantirish   : %-4s${NC}\n" "$WARN"
printf "  ${DIM}⏭   O'tkazildi     : %-4s${NC}\n" "$SKIP"
printf "  ${B}📊  Jami            : %-4s${NC}\n" "$TOTAL"
echo -e "${BOLD}${M}╚═══════════════════════════════════════════════════════════════╝${NC}"

# Blockerlar ro'yxati
if [[ ${#BLOCKERS[@]} -gt 0 ]]; then
  echo ""
  echo -e "  ${R}${BOLD}🚫 BLOCKER XATOLAR (deploy OLDIDAN tuzating):${NC}"
  for b in "${BLOCKERS[@]}"; do
    echo -e "    ${R}•${NC} $b"
  done
fi

# Muhim ogohlantirishlar
if [[ ${#WARNINGS[@]} -gt 0 ]]; then
  echo ""
  echo -e "  ${Y}${BOLD}⚠️  Ogohlantirishlar (tavsiya etiladi):${NC}"
  for w in "${WARNINGS[@]}"; do
    echo -e "    ${Y}•${NC} $w"
  done
fi

# Yakuniy xulosa
echo ""
if [[ $FAIL -eq 0 && $WARN -eq 0 ]]; then
  echo -e "  ${G}${BOLD}🎉  TIZIM PRODUCTION GA TAYYOR!${NC}"
  echo -e "  ${G}    Barcha tekshiruvlar o'tdi. Deploy qilsangiz bo'ladi.${NC}"
elif [[ $FAIL -eq 0 ]]; then
  echo -e "  ${Y}${BOLD}⚠️   ASOSAN TAYYOR — $WARN ogohlantirish bor.${NC}"
  echo -e "  ${Y}    Ogohlantirishlarni ko'rib chiqib deploy qiling.${NC}"
else
  echo -e "  ${R}${BOLD}🚫  PRODUCTION GA CHIQMANG!${NC}"
  echo -e "  ${R}    $FAIL ta BLOCKER xato bor — tuzatilmasa deploy qilmang.${NC}"
  echo ""
  echo -e "  ${BOLD}Tezkor yordam:${NC}"
  echo -e "  ${B}1.${NC} .env sozlash : ${C}cp apps/api/.env.example apps/api/.env${NC}"
  echo -e "  ${B}2.${NC} DB ishlatish : ${C}docker-compose -f docker/docker-compose.yml up -d${NC}"
  echo -e "  ${B}3.${NC} Migrate      : ${C}npm run db:migrate${NC}"
  echo -e "  ${B}4.${NC} Qayta tekshir: ${C}bash scripts/check-production-ready.sh${NC}"
fi

echo ""
echo -e "${DIM}  Vaqt: $(date '+%Y-%m-%d %H:%M:%S') | $ROOT${NC}"
echo ""

[[ $FAIL -gt 0 ]] && exit 1
exit 0
