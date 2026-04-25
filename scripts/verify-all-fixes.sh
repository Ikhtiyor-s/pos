#!/usr/bin/env bash
# =============================================================================
# verify-all-fixes.sh — Barcha 9 ta vazifa to'g'ri bajarilganini tekshirish
#
# ISHLATISH:
#   bash scripts/verify-all-fixes.sh
#
# NATIJA:
#   ✅ — to'g'ri
#   ❌ — xato yoki topilmadi
#   ⚠️  — ogohlantirish (ishlaydi, lekin e'tibor bering)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

G='\033[0;32m' R='\033[0;31m' Y='\033[1;33m' B='\033[0;34m' C='\033[0;36m' BOLD='\033[1m' NC='\033[0m'

PASS=0; FAIL=0; WARN=0

ok()   { echo -e "  ${G}✅${NC}  $*"; PASS=$((PASS + 1)); }
fail() { echo -e "  ${R}❌${NC}  $*"; FAIL=$((FAIL + 1)); }
warn() { echo -e "  ${Y}⚠️ ${NC}  $*"; WARN=$((WARN + 1)); }
sep()  { echo -e "\n${BOLD}${C}── $* ─────────────────────────────────────────────${NC}"; }

file_contains() {
  local file="$1" pattern="$2"
  grep -qE "$pattern" "$file" 2>/dev/null
}

file_exists() {
  [[ -f "$1" ]]
}

# ──────────────────────────────────────────────────────────────────────────────

sep "VAZIFA #1 — OTP → Redis (sms.service.ts)"

SMS="$ROOT/apps/api/src/modules/sms/sms.service.ts"
if file_exists "$SMS"; then
  file_contains "$SMS" "redis" \
    && ok  "redis import mavjud" \
    || fail "redis import topilmadi"

  file_contains "$SMS" "otp:code:" \
    && ok  "Redis OTP key formati (otp:code:) mavjud" \
    || fail "OTP Redis key topilmadi"

  file_contains "$SMS" "otp:rate:" \
    && ok  "OTP rate limit key (otp:rate:) mavjud" \
    || fail "OTP rate limit topilmadi"

  file_contains "$SMS" "otp:attempts:" \
    && ok  "OTP brute-force key (otp:attempts:) mavjud" \
    || fail "OTP attempts counter topilmadi"

  file_contains "$SMS" "redis\.del" \
    && ok  "OTP one-time use (redis.del) mavjud" \
    || fail "OTP o'chirish (redis.del) topilmadi"
else
  fail "sms.service.ts topilmadi: $SMS"
fi

# ──────────────────────────────────────────────────────────────────────────────

sep "VAZIFA #2 — Webhook tenantId izolyatsiyasi"

WHCTRL="$ROOT/apps/api/src/controllers/webhook.controller.ts"
if file_exists "$WHCTRL"; then
  file_contains "$WHCTRL" "tenantId" \
    && ok  "tenantId parametri mavjud" \
    || fail "tenantId topilmadi"

  file_contains "$WHCTRL" "query\.tenantId" \
    && ok  "tenantId query parametrdan o'qiladi" \
    || fail "query.tenantId topilmadi"

  file_contains "$WHCTRL" "tenant\.findUnique" \
    && ok  "Tenant DB validatsiyasi mavjud" \
    || fail "Tenant DB tekshiruvi topilmadi"

  file_contains "$WHCTRL" "nonborOrderId.*tenantId|tenantId.*nonborOrderId" \
    && ok  "Order WHERE: nonborOrderId + tenantId birgalikda" \
    || fail "Order qidirishda tenantId filter topilmadi"
else
  fail "webhook.controller.ts topilmadi: $WHCTRL"
fi

# ──────────────────────────────────────────────────────────────────────────────

sep "VAZIFA #3 — Trust Proxy + CORS Production"

IDX="$ROOT/apps/api/src/index.ts"
if file_exists "$IDX"; then
  file_contains "$IDX" "trust proxy" \
    && ok  "app.set('trust proxy') mavjud" \
    || fail "trust proxy topilmadi"

  file_contains "$IDX" "setupExpressErrorHandler|expressErrorHandler" \
    && ok  "Sentry error handler mavjud" \
    || fail "Sentry error handler topilmadi"
else
  fail "index.ts topilmadi: $IDX"
fi

ENV="$ROOT/apps/api/src/config/env.ts"
if file_exists "$ENV"; then
  file_contains "$ENV" "localhost.*CLIENT_URL|CLIENT_URL.*localhost" \
    && ok  "localhost rejection (production) mavjud" \
    || fail "Production CLIENT_URL validatsiyasi topilmadi"

  file_contains "$ENV" "http://" \
    && ok  "http:// rejection mavjud" \
    || fail "http:// tekshiruvi topilmadi"
else
  fail "env.ts topilmadi: $ENV"
fi

# ──────────────────────────────────────────────────────────────────────────────

sep "VAZIFA #4 — Backup Skriptlari"

for script in backup.sh restore.sh health-check.sh; do
  path="$ROOT/scripts/$script"
  if file_exists "$path"; then
    ok "$script mavjud"
    [[ -x "$path" ]] \
      && ok  "$script executable" \
      || warn "$script executable emas — chmod +x scripts/$script"
  else
    fail "$script topilmadi: $path"
  fi
done

# Backup retention tekshirish
BACKUP="$ROOT/scripts/backup.sh"
file_contains "$BACKUP" "sha256sum" \
  && ok  "Backup SHA256 checksum mavjud" \
  || fail "SHA256 checksum topilmadi"

file_contains "$BACKUP" "gunzip -t" \
  && ok  "Backup integrity tekshirish mavjud" \
  || fail "gunzip -t topilmadi"

file_contains "$BACKUP" "RETENTION|retention" \
  && ok  "Backup retention siyosati mavjud" \
  || fail "Retention topilmadi"

# ──────────────────────────────────────────────────────────────────────────────

sep "VAZIFA #5 — Nonbor Retry Queue → Redis"

NSYNC="$ROOT/apps/api/src/services/nonbor-sync.service.ts"
if file_exists "$NSYNC"; then
  file_contains "$NSYNC" "nonbor:retry:queue" \
    && ok  "Redis Sorted Set key (nonbor:retry:queue) mavjud" \
    || fail "Redis retry queue key topilmadi"

  file_contains "$NSYNC" "redis\.zadd" \
    && ok  "redis.zadd (Sorted Set) mavjud" \
    || fail "redis.zadd topilmadi"

  file_contains "$NSYNC" "redis\.zrangebyscore" \
    && ok  "redis.zrangebyscore (due items) mavjud" \
    || fail "redis.zrangebyscore topilmadi"

  file_contains "$NSYNC" "BACKOFF_DELAYS" \
    && ok  "Exponential backoff massivi mavjud" \
    || fail "BACKOFF_DELAYS topilmadi"

  file_contains "$NSYNC" "retryQueue.*\[\]" \
    && fail "Eski in-memory retryQueue[] hali bor!" \
    || ok  "In-memory retryQueue[] o'chirilgan"
else
  fail "nonbor-sync.service.ts topilmadi: $NSYNC"
fi

# ──────────────────────────────────────────────────────────────────────────────

sep "VAZIFA #6 — Rate Limiting + Parallel Sync"

if file_exists "$NSYNC"; then
  file_contains "$NSYNC" "RATE_LIMIT_MAX" \
    && ok  "RATE_LIMIT_MAX konstantasi mavjud" \
    || fail "RATE_LIMIT_MAX topilmadi"

  file_contains "$NSYNC" "checkRateLimit" \
    && ok  "checkRateLimit() metodi mavjud" \
    || fail "checkRateLimit topilmadi"

  file_contains "$NSYNC" "runConcurrent" \
    && ok  "runConcurrent() helper mavjud" \
    || fail "runConcurrent topilmadi"

  file_contains "$NSYNC" "SYNC_CONCURRENCY" \
    && ok  "SYNC_CONCURRENCY (3 parallel) mavjud" \
    || fail "SYNC_CONCURRENCY topilmadi"

  file_contains "$NSYNC" "nonbor:ratelimit:" \
    && ok  "Redis rate limit key (nonbor:ratelimit:) mavjud" \
    || fail "Redis rate limit key topilmadi"
fi

# ──────────────────────────────────────────────────────────────────────────────

sep "VAZIFA #7 — PWA (Manifest + Service Worker)"

MANIFEST="$ROOT/apps/pos/public/manifest.json"
if file_exists "$MANIFEST"; then
  ok "manifest.json mavjud"
  file_contains "$MANIFEST" "standalone" \
    && ok  "display: standalone mavjud" \
    || fail "display: standalone topilmadi"
  file_contains "$MANIFEST" "shortcuts" \
    && ok  "PWA shortcuts mavjud" \
    || fail "shortcuts topilmadi"
  file_contains "$MANIFEST" "icon-512" \
    && ok  "512x512 icon mavjud" \
    || fail "512x512 icon topilmadi"
else
  fail "manifest.json topilmadi: $MANIFEST"
fi

SW="$ROOT/apps/pos/src/sw.ts"
if file_exists "$SW"; then
  ok "sw.ts mavjud"
  file_contains "$SW" "__WB_MANIFEST" \
    && ok  "VitePWA __WB_MANIFEST precache mavjud" \
    || fail "__WB_MANIFEST topilmadi"
  file_contains "$SW" "pos-sync" \
    && ok  "Background Sync 'pos-sync' tag mavjud" \
    || fail "Background Sync tag topilmadi"
  file_contains "$SW" "processSyncQueue" \
    && ok  "IDB queue processor mavjud" \
    || fail "processSyncQueue topilmadi"
else
  fail "sw.ts topilmadi: $SW"
fi

VITE="$ROOT/apps/pos/vite.config.ts"
if file_exists "$VITE"; then
  file_contains "$VITE" "VitePWA" \
    && ok  "VitePWA plugin mavjud" \
    || fail "VitePWA topilmadi"
  file_contains "$VITE" "injectManifest" \
    && ok  "injectManifest strategy mavjud" \
    || fail "injectManifest topilmadi"
else
  fail "vite.config.ts topilmadi: $VITE"
fi

PKG="$ROOT/apps/pos/package.json"
if file_exists "$PKG"; then
  file_contains "$PKG" "vite-plugin-pwa" \
    && ok  "vite-plugin-pwa dependency mavjud" \
    || fail "vite-plugin-pwa topilmadi (package.json)"
else
  fail "apps/pos/package.json topilmadi"
fi

# ──────────────────────────────────────────────────────────────────────────────

sep "VAZIFA #8 — MXIK Validatsiya"

VALIDATOR="$ROOT/apps/api/src/validators/product.validator.ts"
if file_exists "$VALIDATOR"; then
  file_contains "$VALIDATOR" "mxikCode" \
    && ok  "mxikCode field mavjud" \
    || fail "mxikCode topilmadi"

  file_contains "$VALIDATOR" "mxikVatRate" \
    && ok  "mxikVatRate field mavjud" \
    || fail "mxikVatRate topilmadi"

  file_contains "$VALIDATOR" "9\$.*14\$|14\$.*9\$|\\\\d\{9\}|\\\\d\{14\}" \
    && ok  "9 va 14 raqam regex mavjud" \
    || fail "MXIK regex topilmadi"

  file_contains "$VALIDATOR" "0.*12.*20|VAT_RATES" \
    && ok  "QQS stavkalari (0/12/20) mavjud" \
    || fail "QQS stavkalari topilmadi"
else
  fail "product.validator.ts topilmadi: $VALIDATOR"
fi

# ──────────────────────────────────────────────────────────────────────────────

sep "VAZIFA #9 — Universal Webhook Providers"

PROVIDERS="$ROOT/apps/api/src/config/webhook-providers.ts"
if file_exists "$PROVIDERS"; then
  ok "webhook-providers.ts mavjud"
  for platform in yandex-eats express24 delivery-club; do
    file_contains "$PROVIDERS" "$platform" \
      && ok  "$platform konfiguratsiyasi mavjud" \
      || fail "$platform topilmadi"
  done
  file_contains "$PROVIDERS" "signatureHeader" \
    && ok  "Signature verification config mavjud" \
    || fail "signatureHeader topilmadi"
else
  fail "webhook-providers.ts topilmadi: $PROVIDERS"
fi

WPSVC="$ROOT/apps/api/src/services/webhook-provider.service.ts"
if file_exists "$WPSVC"; then
  ok "webhook-provider.service.ts mavjud"
  file_contains "$WPSVC" "handleIncoming" \
    && ok  "handleIncoming() metodi mavjud" \
    || fail "handleIncoming topilmadi"
  file_contains "$WPSVC" "verifySignature" \
    && ok  "verifySignature() metodi mavjud" \
    || fail "verifySignature topilmadi"
  file_contains "$WPSVC" "timingSafeEqual" \
    && ok  "Timing-safe signature comparison mavjud" \
    || fail "timingSafeEqual topilmadi"
else
  fail "webhook-provider.service.ts topilmadi: $WPSVC"
fi

if file_exists "$WHCTRL"; then
  file_contains "$WHCTRL" "yandex-eats" \
    && ok  "yandex-eats case controller'da mavjud" \
    || fail "yandex-eats switch case topilmadi (webhook.controller.ts)"
  file_contains "$WHCTRL" "webhookProviderService" \
    && ok  "webhookProviderService import mavjud" \
    || fail "webhookProviderService topilmadi (webhook.controller.ts)"
fi

# ──────────────────────────────────────────────────────────────────────────────

sep "RUNTIME TEKSHIRUVLAR (ixtiyoriy)"

# Redis ulanishi — redis-cli → Docker → nc fallback
REDIS_HOST="127.0.0.1"
REDIS_PORT="6379"

# .env dan REDIS_URL parse
if [[ -f "$ROOT/apps/api/.env" ]]; then
  _rurl=$(grep "^REDIS_URL" "$ROOT/apps/api/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" || true)
  if [[ -n "$_rurl" ]]; then
    _rhost="${_rurl#*://}"; _rhost="${_rhost%%:*}"
    _rport="${_rurl##*:}"; _rport="${_rport%%/*}"
    [[ -n "$_rhost" ]] && REDIS_HOST="$_rhost"
    [[ "$_rport" =~ ^[0-9]+$ ]] && REDIS_PORT="$_rport"
  fi
fi

REDIS_CHECKED=false

# 1) redis-cli (lokal o'rnatilgan bo'lsa)
if command -v redis-cli &>/dev/null; then
  if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>/dev/null | grep -q "PONG"; then
    ok "Redis: ULANISH OK ($REDIS_HOST:$REDIS_PORT)"
  else
    warn "Redis: redis-cli bor, lekin ulanib bo'lmadi ($REDIS_HOST:$REDIS_PORT)"
  fi
  REDIS_CHECKED=true
fi

# 2) Docker (oshxona-redis konteyner)
if [[ "$REDIS_CHECKED" == "false" ]] && command -v docker &>/dev/null; then
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "oshxona-redis"; then
    if docker exec oshxona-redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
      ok "Redis: ULANISH OK (Docker: oshxona-redis)"
    else
      warn "Redis: Docker konteyner bor, lekin PING javob bermadi"
    fi
    REDIS_CHECKED=true
  fi
fi

# 3) nc — port ochiqmi?
if [[ "$REDIS_CHECKED" == "false" ]]; then
  if command -v nc &>/dev/null; then
    if nc -z -w2 "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; then
      ok "Redis: port ochiq ($REDIS_HOST:$REDIS_PORT) — to'liq tekshirib bo'lmadi"
    else
      warn "Redis: $REDIS_HOST:$REDIS_PORT ga ulanib bo'lmadi"
    fi
    REDIS_CHECKED=true
  fi
fi

if [[ "$REDIS_CHECKED" == "false" ]]; then
  warn "Redis: redis-cli, Docker va nc topilmadi — tekshirib bo'lmadi"
fi

# PostgreSQL ulanishi
if [[ -f "$ROOT/apps/api/.env" ]]; then
  DB_URL=$(grep DATABASE_URL "$ROOT/apps/api/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" || true)
  if [[ -n "$DB_URL" ]]; then
    if command -v pg_isready &>/dev/null; then
      _url="${DB_URL#*://}"
      DB_HOST="${_url%%:*}"
      _url="${_url#*@}"; DB_PORT="${_url%%/*}"; DB_PORT="${DB_PORT#*:}"
      if pg_isready -h "$DB_HOST" -p "${DB_PORT:-5432}" -t 3 &>/dev/null; then
        ok "PostgreSQL: ULANISH OK"
      else
        warn "PostgreSQL: ulanib bo'lmadi"
      fi
    else
      warn "pg_isready topilmadi — PostgreSQL tekshirib bo'lmadi"
    fi
  fi
fi

# TypeScript tekshirish
if command -v npx &>/dev/null && [[ -f "$ROOT/apps/api/tsconfig.json" ]]; then
  TS_OUT=$(cd "$ROOT" && npx tsc --noEmit --project apps/api/tsconfig.json 2>&1 || true)
  TS_ERRORS=$(echo "$TS_OUT" | grep -c "error TS" || true)
  if [[ "$TS_ERRORS" == "0" ]]; then
    ok "TypeScript: 0 xato"
  else
    fail "TypeScript: $TS_ERRORS ta xato mavjud"
  fi
else
  warn "TypeScript tekshirib bo'lmadi (npx yoki tsconfig.json topilmadi)"
fi

# ──────────────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}${C}══════════════════════════════════════════════${NC}"
echo -e "  NATIJA:"
echo -e "  ${G}✅  O'tdi  : $PASS${NC}"
if [[ $FAIL -gt 0 ]]; then echo -e "  ${R}❌  Xato   : $FAIL${NC}"; else echo -e "  ${R}❌  Xato   : 0${NC}"; fi
if [[ $WARN -gt 0 ]]; then echo -e "  ${Y}⚠️   Ogohlantirish: $WARN${NC}"; fi
echo -e "${BOLD}${C}══════════════════════════════════════════════${NC}"
echo ""

if [[ $FAIL -eq 0 ]]; then
  echo -e "  ${G}${BOLD}✅ BARCHA 9 VAZIFA MUVAFFAQIYATLI TEKSHIRILDI!${NC}"
else
  echo -e "  ${R}${BOLD}❌ $FAIL ta xato topildi — yuqoridagi natijalarni tekshiring.${NC}"
  exit 1
fi
echo ""
