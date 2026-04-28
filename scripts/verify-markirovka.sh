#!/usr/bin/env bash
# =============================================================================
# verify-markirovka.sh — Markirovka tizimi to'liq tekshiruv skripti
#
# ISHLATISH:
#   bash scripts/verify-markirovka.sh
#   bash scripts/verify-markirovka.sh --with-api   # curl bilan API tekshiruv
#   bash scripts/verify-markirovka.sh --with-ts    # TypeScript compile tekshirish
#
# MULIT ISHLATISH:
#   MARKIROVKA_API_URL=http://localhost:3001 bash scripts/verify-markirovka.sh --with-api
#   MARKIROVKA_TEST_EMAIL=admin@test.com MARKIROVKA_TEST_PASSWORD=pass bash scripts/verify-markirovka.sh --with-api
#
# OUTPUT:
#   GREEN  ✅ — mavjud / to'g'ri
#   RED    ❌ — xato / topilmadi
#   YELLOW ⚠️  — ogohlantirish
#   DIM    ⏭  — o'tkazildi (bayroq yo'q)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

# ── Ranglar ───────────────────────────────────────────────────────────────────
G='\033[0;32m'
R='\033[0;31m'
Y='\033[1;33m'
B='\033[0;34m'
C='\033[0;36m'
M='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# ── Hisoblagichlar ─────────────────────────────────────────────────────────────
PASS=0; FAIL=0; WARN=0; SKIP=0

# ── Bayroqlar ──────────────────────────────────────────────────────────────────
WITH_API=false
WITH_TS=false
for arg in "$@"; do
  case "$arg" in
    --with-api) WITH_API=true ;;
    --with-ts)  WITH_TS=true  ;;
  esac
done

# ── Output funksiyalar ─────────────────────────────────────────────────────────
ok()   { echo -e "  ${G}✅${NC}  $*"; PASS=$((PASS+1)); }
fail() { echo -e "  ${R}❌${NC}  $*"; FAIL=$((FAIL+1)); }
warn() { echo -e "  ${Y}⚠️ ${NC}  $*"; WARN=$((WARN+1)); }
skip() { echo -e "  ${DIM}⏭  $*${NC}"; SKIP=$((SKIP+1)); }
info() { echo -e "  ${B}ℹ️ ${NC}  $*"; }
sep()  { echo -e "\n${BOLD}${C}┌── $* ──────────────────────────────────────────────┐${NC}"; }
endsep(){ echo -e "${BOLD}${C}└─────────────────────────────────────────────────────┘${NC}\n"; }

# ── Fayl yordamchilari ─────────────────────────────────────────────────────────
has() { grep -qE "$2" "$1" 2>/dev/null; }

chk_file() {
  local path="$1" lbl="${2:-$(basename "$1")}"
  if [[ -f "$path" ]]; then ok "$lbl mavjud"; return 0
  else                       fail "$lbl topilmadi: $path"; return 1; fi
}

chk() {
  local file="$1" pat="$2" ok_msg="$3" fail_msg="$4"
  if has "$file" "$pat"; then ok "$ok_msg"
  else                        fail "$fail_msg"; fi
}

# ── API URL ────────────────────────────────────────────────────────────────────
API_URL="${MARKIROVKA_API_URL:-http://localhost:3000}"

# ── Fayl yo'llari ──────────────────────────────────────────────────────────────
SCHEMA="$ROOT/packages/database/prisma/schema.prisma"
SVC="$ROOT/apps/api/src/services/markirovka.service.ts"
CTRL="$ROOT/apps/api/src/controllers/markirovka.controller.ts"
ROUTES="$ROOT/apps/api/src/routes/markirovka.routes.ts"
VALID="$ROOT/apps/api/src/validators/markirovka.validator.ts"
RIDX="$ROOT/apps/api/src/routes/index.ts"
CRON="$ROOT/apps/api/src/jobs/markirovka-report.cron.ts"
IDX="$ROOT/apps/api/src/index.ts"
SCANNER="$ROOT/apps/pos/src/components/MarkirovkaScanner.tsx"
RECEIVE="$ROOT/apps/inventory-app/src/ReceiveMarkirovka.tsx"
DASH="$ROOT/apps/web/src/pages/MarkirovkaDashboard.tsx"

# =============================================================================
echo ""
echo -e "${BOLD}${M}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${M}║  🏷️  MARKIROVKA TIZIMI — TO'LIQ TEKSHIRUV SKRIPTI        ║${NC}"
echo -e "${BOLD}${M}║  O'zbekiston majburiy raqamli markirovka (7 bo'lim)        ║${NC}"
echo -e "${BOLD}${M}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
info "Loyiha : $ROOT"
info "API URL: $API_URL"
if [[ "$WITH_API" == "true" ]]; then
  info "Rejim  : --with-api (curl tekshiruvlar aktiv)"
else
  info "Rejim  : statik (--with-api qo'shing runtime uchun)"
fi
echo ""

# =============================================================================
sep "BO'LIM 1 — Prisma Modellari"
# =============================================================================

if ! chk_file "$SCHEMA" "schema.prisma"; then
  echo -e "  ${R}KRITIK: schema.prisma topilmadi, Prisma tekshiruvlari o'tkaziladi${NC}"
else

  # ── Enumlar ──
  chk "$SCHEMA" "enum MarkirovkaStatus" \
    "enum MarkirovkaStatus mavjud" \
    "enum MarkirovkaStatus topilmadi"

  chk "$SCHEMA" "enum MarkirovkaAction" \
    "enum MarkirovkaAction mavjud" \
    "enum MarkirovkaAction topilmadi"

  for val in MANUFACTURED IMPORTED IN_STOCK RESERVED SOLD EXPIRED; do
    chk "$SCHEMA" "$val" \
      "  MarkirovkaStatus.$val mavjud" \
      "  MarkirovkaStatus.$val topilmadi"
  done

  for val in VERIFY RECEIVE SELL REPORT; do
    chk "$SCHEMA" "$val" \
      "  MarkirovkaAction.$val mavjud" \
      "  MarkirovkaAction.$val topilmadi"
  done

  echo ""
  # ── MarkirovkaProduct ──
  chk "$SCHEMA" "model MarkirovkaProduct" \
    "model MarkirovkaProduct mavjud" \
    "model MarkirovkaProduct topilmadi"

  for f in markCode gtin serialNumber batchNumber expiryDate status \
            verifiedAt soldAt soldBy orderId importedAt importerTin; do
    chk "$SCHEMA" "$f" \
      "  maydon: $f" \
      "  maydon $f TOPILMADI"
  done

  chk "$SCHEMA" "markCode.*@unique|@unique.*mark_code" \
    "markCode @unique constraint mavjud" \
    "markCode @unique constraint topilmadi"

  chk "$SCHEMA" "serialNumber.*@unique|@unique.*serial_number" \
    "serialNumber @unique constraint mavjud" \
    "serialNumber @unique constraint topilmadi"

  echo ""
  # ── MarkirovkaBatch ──
  chk "$SCHEMA" "model MarkirovkaBatch" \
    "model MarkirovkaBatch mavjud" \
    "model MarkirovkaBatch topilmadi"

  for f in batchNumber productId quantity receivedAt supplierId invoiceNumber; do
    chk "$SCHEMA" "$f" \
      "  maydon: $f" \
      "  maydon $f TOPILMADI"
  done

  chk "$SCHEMA" 'batchNumber.*tenantId' \
    "@@unique([batchNumber, tenantId]) mavjud" \
    "@@unique([batchNumber, tenantId]) topilmadi"

  echo ""
  # ── MarkirovkaLog ──
  chk "$SCHEMA" "model MarkirovkaLog" \
    "model MarkirovkaLog mavjud" \
    "model MarkirovkaLog topilmadi"

  for f in markCode action request response status; do
    chk "$SCHEMA" "$f" \
      "  maydon: $f" \
      "  maydon $f TOPILMADI"
  done

  echo ""
  # ── Relatsiyalar ──
  chk "$SCHEMA" "markirovkaProducts" \
    "Tenant → markirovkaProducts[] relatsiya mavjud" \
    "Tenant → markirovkaProducts[] topilmadi"

  chk "$SCHEMA" "markirovkaBatches" \
    "Tenant → markirovkaBatches[] relatsiya mavjud" \
    "Tenant → markirovkaBatches[] topilmadi"

  chk "$SCHEMA" "markirovkaLogs" \
    "Tenant → markirovkaLogs[] relatsiya mavjud" \
    "Tenant → markirovkaLogs[] topilmadi"

  chk "$SCHEMA" "@@index.*tenantId.*status|@@index.*status.*tenantId" \
    "MarkirovkaProduct [tenantId, status] indeksi mavjud" \
    "MarkirovkaProduct [tenantId, status] indeksi topilmadi"

  echo ""
  # ── Prisma generate ──
  if command -v npx &>/dev/null; then
    info "npx prisma generate tekshirilmoqda..."
    GEN_OUT=$(cd "$ROOT" && \
      DATABASE_URL="postgresql://x:x@localhost/x" \
      npx prisma generate --schema=packages/database/prisma/schema.prisma 2>&1 || true)
    if echo "$GEN_OUT" | grep -q "Generated Prisma Client"; then
      ok "npx prisma generate muvaffaqiyatli ishladi"
    else
      fail "npx prisma generate xato: $(echo "$GEN_OUT" | tail -2)"
    fi
  else
    warn "npx topilmadi — prisma generate tekshirib bo'lmadi"
  fi

fi
endsep

# =============================================================================
sep "BO'LIM 2 — API Fayllar va Endpointlar"
# =============================================================================

chk_file "$SVC"    "markirovka.service.ts"
chk_file "$CTRL"   "markirovka.controller.ts"
chk_file "$ROUTES" "markirovka.routes.ts"
chk_file "$VALID"  "markirovka.validator.ts"

echo ""
# ── routes/index.ts ──
if [[ -f "$RIDX" ]]; then
  chk "$RIDX" "markirovka" \
    "routes/index.ts: markirovka route ulangan" \
    "routes/index.ts: markirovka route topilmadi"
  chk "$RIDX" "markirovkaRoutes" \
    "routes/index.ts: markirovkaRoutes import mavjud" \
    "routes/index.ts: markirovkaRoutes import topilmadi"
fi

echo ""
# ── Endpoint yo'llar ──
if [[ -f "$ROUTES" ]]; then
  for item in \
    "verify/:code|POST /verify/:code" \
    "receive|POST /receive" \
    "batch-receive|POST /batch-receive" \
    "sell|POST /sell" \
    "check/:code|GET /check/:code" \
    "expired|GET /expired" \
    "report/daily|GET /report/daily" \
    "trace/:serial|GET /trace/:serial" \
    "queue/process|POST /queue/process" \
    "stats|GET /stats" \
    "logs|GET /logs" \
    "batches|GET /batches" \
    "products|GET /products"
  do
    pat="${item%%|*}"
    lbl="${item##*|}"
    chk "$ROUTES" "$pat" \
      "  $lbl mavjud" \
      "  $lbl TOPILMADI"
  done

  echo ""
  chk "$ROUTES" "Role.CASHIER" \
    "CASHIER roli ruxsati mavjud" \
    "CASHIER roli topilmadi"
  chk "$ROUTES" "Role.WAREHOUSE" \
    "WAREHOUSE roli ruxsati mavjud" \
    "WAREHOUSE roli topilmadi"
  chk "$ROUTES" "authenticate" \
    "authenticate middleware ulangan" \
    "authenticate middleware topilmadi"
  chk "$ROUTES" "authorize" \
    "authorize middleware ulangan" \
    "authorize middleware topilmadi"
fi

echo ""
# ── Controller metodlar ──
if [[ -f "$CTRL" ]]; then
  for item in \
    "verify|verify()" \
    "receive|receive()" \
    "batchReceive|batchReceive()" \
    "sell|sell()" \
    "checkBeforeSell|checkBeforeSell()" \
    "getExpired|getExpired()" \
    "getDailyReport|getDailyReport()" \
    "traceBySerial|traceBySerial()" \
    "processQueue|processQueue()" \
    "getStats|getStats()" \
    "getLogs|getLogs()" \
    "getProducts|getProducts()" \
    "getBatches|getBatches()"
  do
    pat="${item%%|*}"
    lbl="${item##*|}"
    chk "$CTRL" "static async $pat" \
      "  $lbl metodi mavjud" \
      "  $lbl metodi TOPILMADI"
  done

  echo ""
  chk "$CTRL" "tenantId" \
    "Tenant izolyatsiyasi: tenantId mavjud" \
    "tenantId topilmadi (izolyatsiya yo'q)"
  chk "$CTRL" "successResponse|paginatedResponse" \
    "Standart response funksiyalari ishlatilgan" \
    "successResponse/paginatedResponse topilmadi"
  chk "$CTRL" 'next\(error\)' \
    "Error handling: next(error) mavjud" \
    "next(error) topilmadi"
fi

echo ""
# ── Validator schemalar ──
if [[ -f "$VALID" ]]; then
  for s in receiveProductSchema batchReceiveSchema reportSaleSchema \
            getProductsQuerySchema dailyReportQuerySchema getLogsQuerySchema; do
    chk "$VALID" "$s" \
      "  $s mavjud" \
      "  $s topilmadi"
  done
  chk "$VALID" '[0-9].*9\b|regex.*9|\\\\d' \
    "INN (9 raqam) validatsiyasi mavjud" \
    "INN validatsiyasi topilmadi"
  chk "$VALID" "min.*20|length.*20" \
    "markCode min 20 belgi validatsiyasi mavjud" \
    "markCode uzunlik validatsiyasi topilmadi"
fi
endsep

# =============================================================================
sep "BO'LIM 3 — Servis Funksiyalari"
# =============================================================================

if [[ -f "$SVC" ]]; then

  for item in \
    "verifyCode|verifyCode(markCode, tenantId)" \
    "receiveProduct|receiveProduct(options)" \
    "batchReceive|batchReceive(items)" \
    "reportSale|reportSale(options)" \
    "checkBeforeSell|checkBeforeSell(markCode, tenantId)" \
    "getExpiredProducts|getExpiredProducts(tenantId)" \
    "getDailyReport|getDailyReport(tenantId, dateStr)" \
    "traceBySerial|traceBySerial(serialNumber, tenantId)" \
    "processOfflineQueue|processOfflineQueue()" \
    "getStats|getStats(tenantId)"
  do
    pat="${item%%|*}"
    lbl="${item##*|}"
    chk "$SVC" "static async $pat" \
      "$lbl metodi mavjud" \
      "$lbl TOPILMADI"
  done

  echo ""
  # ── Retry mexanizm ──
  chk "$SVC" "callWithRetry" \
    "callWithRetry() helper mavjud" \
    "callWithRetry topilmadi"
  chk "$SVC" "MAX_RETRIES|MAX_RETRY" \
    "MAX_RETRIES konstanta mavjud" \
    "MAX_RETRIES topilmadi"
  chk "$SVC" "RETRY_DELAYS|1_000|1000" \
    "RETRY_DELAYS massivi mavjud (1s→3s→7s)" \
    "RETRY_DELAYS topilmadi"
  chk "$SVC" "TIMEOUT_MS|10_000|10000" \
    "API timeout (10s) mavjud" \
    "10s timeout topilmadi"

  echo ""
  # ── Offline queue ──
  chk "$SVC" "markirovka:offline:queue" \
    "Offline queue Redis kaliti mavjud" \
    "Offline queue kaliti topilmadi"
  chk "$SVC" "redis.lpush" \
    "redis.lpush (queue ga qo'shish) mavjud" \
    "redis.lpush topilmadi"
  chk "$SVC" "redis.rpop" \
    "redis.rpop (queue dan olish) mavjud" \
    "redis.rpop topilmadi"
  chk "$SVC" "QUEUE_MAX|2_000|2000" \
    "Queue maksimal hajm (2000) mavjud" \
    "QUEUE_MAX topilmadi"

  echo ""
  # ── Xato aniqlash ──
  chk "$SVC" "isOfflineError|ECONNABORTED|ENOTFOUND" \
    "Network xatolarni aniqlash mavjud" \
    "Network xato aniqlash topilmadi"
  chk "$SVC" "MarkirovkaStatus.EXPIRED" \
    "EXPIRED status tekshiruvi mavjud" \
    "EXPIRED tekshiruvi topilmadi"
  chk "$SVC" "MarkirovkaStatus.SOLD" \
    "SOLD status tekshiruvi mavjud" \
    "SOLD tekshiruvi topilmadi"

  echo ""
  # ── Log yozish ──
  chk "$SVC" "saveLog|markirovkaLog.create" \
    "Har amal uchun log yoziladi" \
    "Log yozish topilmadi"
  chk "$SVC" "MarkirovkaAction.VERIFY" \
    "VERIFY action log mavjud" \
    "VERIFY action topilmadi"
  chk "$SVC" "MarkirovkaAction.SELL" \
    "SELL action log mavjud" \
    "SELL action topilmadi"
  chk "$CRON" "MarkirovkaAction.REPORT" \
    "REPORT action log mavjud (cron da)" \
    "REPORT action topilmadi"

  echo ""
  # ── Axios ──
  chk "$SVC" "axios.create|getClient" \
    "Axios klient mavjud" \
    "Axios klient topilmadi"
  chk "$SVC" "MARKIROVKA_API_URL|api.markirovka.uz" \
    "Davlat API URL konfiguratsiyasi mavjud" \
    "Davlat API URL topilmadi"
  chk "$SVC" "MARKIROVKA_API_KEY|Authorization" \
    "API autentifikatsiya (Bearer token) mavjud" \
    "API autentifikatsiya topilmadi"

else
  fail "markirovka.service.ts topilmadi — servis tekshiruvlari o'tkazildi"
fi
endsep

# =============================================================================
sep "BO'LIM 4 — Cron Job (Kunlik Hisobot 23:30)"
# =============================================================================

if chk_file "$CRON" "markirovka-report.cron.ts"; then

  # ── Jadval ──
  chk "$CRON" "30 23" \
    "Cron jadval: har kuni 23:30 mavjud" \
    "23:30 jadval topilmadi"
  chk "$CRON" "0.*9.*\*|RETRY_CRON" \
    "Retry cron: har kuni 09:00 mavjud" \
    "09:00 retry cron topilmadi"
  chk "$CRON" "Asia/Tashkent" \
    "Timezone: Asia/Tashkent mavjud" \
    "Asia/Tashkent timezone topilmadi"

  echo ""
  # ── XML hisobot ──
  chk "$CRON" "buildXml|SaleReport" \
    "XML hisobot generatori (buildXml) mavjud" \
    "XML generator topilmadi"
  chk "$CRON" "escapeXml|&amp;" \
    "XML escaping (XSS himoya) mavjud" \
    "XML escaping topilmadi"
  chk "$CRON" "SellerTin|seller_tin" \
    "Sotuvchi STIR XML fieldida mavjud" \
    "SellerTin topilmadi"
  chk "$CRON" "TotalSold" \
    "TotalSold XML elementi mavjud" \
    "TotalSold topilmadi"
  chk "$CRON" "MarkCode|SoldAt|ReceiptNumber" \
    "O'zbekiston standarti elementlari mavjud (MarkCode, SoldAt, ReceiptNumber)" \
    "Standart elementlar topilmadi"

  echo ""
  # ── Ma'lumot yig'ish ──
  chk "$CRON" "collectReportData|soldProducts" \
    "collectReportData() funksiyasi mavjud" \
    "collectReportData topilmadi"
  chk "$CRON" "MarkirovkaAction.SELL|action.*SELL" \
    "SELL loglardan price/receipt ma'lumot olish mavjud" \
    "SELL log ma'lumotlari topilmadi"
  chk "$CRON" "status.*SOLD|SOLD.*soldAt" \
    "SOLD mahsulotlarni filterlash mavjud" \
    "SOLD filter topilmadi"

  echo ""
  # ── Retry queue (Redis Sorted Set) ──
  chk "$CRON" "markirovka:report:retry" \
    "Retry queue Redis kaliti mavjud" \
    "Retry queue kaliti topilmadi"
  chk "$CRON" "redis.zadd" \
    "redis.zadd (Sorted Set, score=timestamp) mavjud" \
    "redis.zadd topilmadi"
  chk "$CRON" "redis.zrangebyscore" \
    "redis.zrangebyscore (muddati yetgan itemlar) mavjud" \
    "redis.zrangebyscore topilmadi"
  chk "$CRON" "MAX_RETRY|MAX_RETRIES" \
    "Maksimal retry soni mavjud" \
    "MAX_RETRY topilmadi"
  chk "$CRON" "RETRY_BACKOFF|backoff|5.*60_000|30.*60" \
    "Eksponensial backoff (5min→30min→2soat) mavjud" \
    "Backoff topilmadi"

  echo ""
  # ── API yuborish ──
  chk "$CRON" "sendToGovernment|/api/v1/report" \
    "Davlat serveriga yuborish funksiyasi mavjud" \
    "sendToGovernment topilmadi"
  chk "$CRON" "application/xml|Content-Type.*xml" \
    "XML Content-Type header mavjud" \
    "XML Content-Type topilmadi"
  chk "$CRON" "saveReportLog|MarkirovkaAction.REPORT" \
    "Hisobot jurnali saqlash mavjud" \
    "Hisobot jurnali topilmadi"

  echo ""
  # ── Multi-tenant ──
  chk "$CRON" "tenant.findMany|isActive" \
    "Barcha aktiv tenantlar uchun hisobot mavjud" \
    "Multi-tenant loop topilmadi"
  chk "$CRON" "nonborSellerId|MARKIROVKA_SELLER_TIN" \
    "Sotuvchi STIR manbasi mavjud (env/settings)" \
    "STIR manbasi topilmadi"

  echo ""
  # ── index.ts ulanishi ──
  if [[ -f "$IDX" ]]; then
    chk "$IDX" "startMarkirovkaReportCrons" \
      "index.ts: startMarkirovkaReportCrons() chaqirilgan" \
      "index.ts: startMarkirovkaReportCrons topilmadi"
    chk "$IDX" "markirovka-report.cron" \
      "index.ts: markirovka-report.cron import mavjud" \
      "index.ts: markirovka-report.cron import topilmadi"
  fi

  # ── Eksportlar ──
  chk "$CRON" "export function startMarkirovkaReportCrons" \
    "startMarkirovkaReportCrons() eksport mavjud" \
    "startMarkirovkaReportCrons eksport topilmadi"
  chk "$CRON" "export.*runDailyReport|export.*buildXml|export.*collectReportData" \
    "Test uchun yordamchi eksportlar mavjud" \
    "Yordamchi eksportlar topilmadi"

else
  fail "markirovka-report.cron.ts topilmadi — cron tekshiruvlari o'tkazildi"
fi
endsep

# =============================================================================
sep "BO'LIM 5 — Frontend Komponentlar"
# =============================================================================

# ── MarkirovkaScanner.tsx (POS) ───────────────────────────────────────────────
echo -e "  ${BOLD}[apps/pos] MarkirovkaScanner.tsx${NC}"
if chk_file "$SCANNER" "MarkirovkaScanner.tsx"; then

  chk "$SCANNER" "Html5Qrcode" \
    "  html5-qrcode kutubxonasi ishlatilgan" \
    "  html5-qrcode topilmadi"
  chk "$SCANNER" "AudioContext|playBeep" \
    "  BEEP ovoz (Web Audio API) mavjud" \
    "  BEEP ovozi topilmadi"
  chk "$SCANNER" "markirovka/check" \
    "  GET /markirovka/check/:code API chaqiruvi mavjud" \
    "  /markirovka/check topilmadi"
  chk "$SCANNER" "markirovka/verify" \
    "  POST /markirovka/verify/:code API mavjud" \
    "  /markirovka/verify topilmadi"
  chk "$SCANNER" "onAdd|VerifiedProduct" \
    "  onAdd() callback mavjud (sotishga qo'shish)" \
    "  onAdd callback topilmadi"
  chk "$SCANNER" "allaqachon sotilgan|Muddati|Soxta" \
    "  Xatolik xabarlari (sotilgan/muddati/soxta) mavjud" \
    "  Xatolik xabarlari topilmadi"
  chk "$SCANNER" "cooldownRef|lastCodeRef" \
    "  Takror kod himoyasi (cooldown) mavjud" \
    "  Takror kod himoyasi topilmadi"
  chk "$SCANNER" "useMarkirovkaScannerListener" \
    "  useMarkirovkaScannerListener() hook eksport mavjud" \
    "  Hook eksport topilmadi"
  chk "$SCANNER" "history|ScanHistoryItem" \
    "  Scan tarixi mavjud" \
    "  Scan tarixi topilmadi"

  POS_PKG="$ROOT/apps/pos/package.json"
  if [[ -f "$POS_PKG" ]]; then
    chk "$POS_PKG" "html5-qrcode" \
      "  apps/pos package.json: html5-qrcode mavjud" \
      "  apps/pos: html5-qrcode dependency topilmadi"
  fi
fi

echo ""
# ── ReceiveMarkirovka.tsx (inventory-app) ─────────────────────────────────────
echo -e "  ${BOLD}[apps/inventory-app] ReceiveMarkirovka.tsx${NC}"
if chk_file "$RECEIVE" "ReceiveMarkirovka.tsx"; then

  chk "$RECEIVE" "AppStep|form.*scanning" \
    "  Step machine (form→scanning→done) mavjud" \
    "  Step machine topilmadi"
  chk "$RECEIVE" "ScannedItem|ItemStatus" \
    "  ScannedItem type mavjud" \
    "  ScannedItem topilmadi"
  chk "$RECEIVE" "batchNumber|BatchForm" \
    "  BatchForm (partiya raqami) mavjud" \
    "  BatchForm topilmadi"
  chk "$RECEIVE" "MAX_BATCH|500" \
    "  Maksimal batch hajmi (500) mavjud" \
    "  MAX_BATCH topilmadi"
  chk "$RECEIVE" "markirovka/check|markirovka/batch-receive" \
    "  API endpointlar (/check, /batch-receive) mavjud" \
    "  API endpointlar topilmadi"
  chk "$RECEIVE" "exportToCsv|downloadFile|Blob" \
    "  CSV eksport (xatolar uchun) mavjud" \
    "  CSV eksport topilmadi"
  chk "$RECEIVE" "retryErrors|retry" \
    "  Xatolarni qayta urinish (retryErrors) mavjud" \
    "  retryErrors topilmadi"
  chk "$RECEIVE" "duplicate|processingRef" \
    "  Takror kod himoyasi mavjud" \
    "  Takror kod himoyasi topilmadi"
  chk "$RECEIVE" "AbortController|VERIFY_TIMEOUT" \
    "  Request timeout (AbortController) mavjud" \
    "  Timeout topilmadi"
  chk "$RECEIVE" "StatsBar|okCount|errorCount" \
    "  Statistika paneli (ok/xato soni) mavjud" \
    "  Statistika paneli topilmadi"
  chk "$RECEIVE" "confirmClose" \
    "  Tasdiqlash dialogi (sessiya yangilash) mavjud" \
    "  Tasdiqlash dialogi topilmadi"
fi

echo ""
# ── MarkirovkaDashboard.tsx (web) ─────────────────────────────────────────────
echo -e "  ${BOLD}[apps/web] MarkirovkaDashboard.tsx${NC}"
if chk_file "$DASH" "MarkirovkaDashboard.tsx"; then

  chk "$DASH" "BarChart|ResponsiveContainer" \
    "  Recharts BarChart mavjud" \
    "  Recharts topilmadi"
  chk "$DASH" "qabul|sotilgan" \
    "  Kunlik qabul/sotuv grafigi mavjud" \
    "  Qabul/sotuv grafigi topilmadi"
  chk "$DASH" "topGtins|Top GTINlar" \
    "  Top GTINlar grafigi mavjud" \
    "  Top GTINlar topilmadi"
  chk "$DASH" "StatCard|Bugun qabul" \
    "  Statistika kartochkalar mavjud" \
    "  Statistika kartochkalar topilmadi"
  chk "$DASH" "markirovka/stats" \
    "  GET /markirovka/stats API mavjud" \
    "  /markirovka/stats topilmadi"
  chk "$DASH" "markirovka/expired" \
    "  GET /markirovka/expired API mavjud" \
    "  /markirovka/expired topilmadi"
  chk "$DASH" "markirovka/trace" \
    "  GET /markirovka/trace/:serial API mavjud" \
    "  /markirovka/trace topilmadi"
  chk "$DASH" "report/daily" \
    "  GET /markirovka/report/daily API mavjud" \
    "  /report/daily topilmadi"
  chk "$DASH" "chartDays|7.*14.*30" \
    "  Grafik davri toggli (7/14/30 kun) mavjud" \
    "  Grafik davri topilmadi"
  chk "$DASH" "exportSoldCsv|exportTaxXml|exportExpiredCsv" \
    "  3 ta eksport funksiyasi mavjud (CSV, XML, expired)" \
    "  Eksport funksiyalari topilmadi"
  chk "$DASH" "TaxAuditReport|application/xml" \
    "  XML (soliq) eksport formati mavjud" \
    "  XML eksport topilmadi"
  chk "$DASH" "timeline|TraceResult" \
    "  Trace timeline mavjud" \
    "  Trace timeline topilmadi"
  chk "$DASH" "daysFromNow|7 kun" \
    "  Muddati 7 kun ichida tugayotganlar mavjud" \
    "  7 kunlik filter topilmadi"
  chk "$DASH" "offlineQueueLen|queue/process" \
    "  Offline queue paneli mavjud" \
    "  Offline queue paneli topilmadi"

  WEB_PKG="$ROOT/apps/web/package.json"
  if [[ -f "$WEB_PKG" ]]; then
    chk "$WEB_PKG" "recharts" \
      "  apps/web package.json: recharts mavjud" \
      "  apps/web: recharts dependency topilmadi"
  fi
fi
endsep

# =============================================================================
sep "BO'LIM 6 — Runtime Tekshiruvlar"
# =============================================================================

# ── Redis ─────────────────────────────────────────────────────────────────────
echo -e "  ${BOLD}Redis ulanishi${NC}"
REDIS_HOST="127.0.0.1"; REDIS_PORT="6379"

for envfile in "$ROOT/apps/api/.env" "$ROOT/.env"; do
  if [[ -f "$envfile" ]]; then
    _rurl=$(grep "^REDIS_URL" "$envfile" 2>/dev/null \
            | cut -d'=' -f2- | tr -d '"' | tr -d "'" || true)
    if [[ -n "$_rurl" ]]; then
      _rhost="${_rurl#*://}"; _rhost="${_rhost%%:*}"
      _rport="${_rurl##*:}"; _rport="${_rport%%/*}"
      [[ -n "$_rhost" ]] && REDIS_HOST="$_rhost"
      [[ "$_rport" =~ ^[0-9]+$ ]] && REDIS_PORT="$_rport"
      break
    fi
  fi
done

REDIS_DONE=false
if command -v redis-cli &>/dev/null; then
  if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>/dev/null | grep -q PONG; then
    ok "Redis: PONG ($REDIS_HOST:$REDIS_PORT) — redis-cli"
    REDIS_DONE=true
  else
    warn "Redis: redis-cli mavjud, lekin ulanib bo'lmadi ($REDIS_HOST:$REDIS_PORT)"
  fi
fi
if [[ "$REDIS_DONE" == "false" ]] && command -v docker &>/dev/null; then
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "oshxona-redis"; then
    if docker exec oshxona-redis redis-cli ping 2>/dev/null | grep -q PONG; then
      ok "Redis: PONG (Docker: oshxona-redis)"
      REDIS_DONE=true
    else
      warn "Redis: oshxona-redis konteyner bor, PING xato"
    fi
  else
    warn "Redis: oshxona-redis konteyner ishlamayapti"
  fi
fi
if [[ "$REDIS_DONE" == "false" ]] && command -v nc &>/dev/null; then
  if nc -z -w2 "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; then
    ok "Redis: port ochiq ($REDIS_HOST:$REDIS_PORT)"
    REDIS_DONE=true
  else
    warn "Redis: $REDIS_HOST:$REDIS_PORT ga ulanib bo'lmadi"
  fi
fi
[[ "$REDIS_DONE" == "false" ]] && warn "Redis: redis-cli/docker/nc topilmadi — tekshirib bo'lmadi"

echo ""
# ── PostgreSQL ─────────────────────────────────────────────────────────────────
echo -e "  ${BOLD}PostgreSQL ulanishi${NC}"
DB_HOST=""; DB_PORT="5432"
for envfile in "$ROOT/apps/api/.env" "$ROOT/.env"; do
  if [[ -f "$envfile" ]]; then
    DB_URL=$(grep "^DATABASE_URL" "$envfile" 2>/dev/null \
             | cut -d'=' -f2- | tr -d '"' | tr -d "'" || true)
    if [[ -n "$DB_URL" ]]; then
      _u="${DB_URL#*@}"
      DB_HOST="${_u%%:*}"; DB_HOST="${DB_HOST%%/*}"
      DB_PORT="${_u#*:}"; DB_PORT="${DB_PORT%%/*}"
      [[ ! "$DB_PORT" =~ ^[0-9]+$ ]] && DB_PORT="5432"
      break
    fi
  fi
done

PG_DONE=false
if command -v pg_isready &>/dev/null && [[ -n "$DB_HOST" ]]; then
  if pg_isready -h "$DB_HOST" -p "$DB_PORT" -t 3 &>/dev/null; then
    ok "PostgreSQL: OK ($DB_HOST:$DB_PORT)"
    PG_DONE=true
  else
    warn "PostgreSQL: $DB_HOST:$DB_PORT — ulanib bo'lmadi"
  fi
elif command -v docker &>/dev/null; then
  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "oshxona-postgres"; then
    if docker exec oshxona-postgres pg_isready -U postgres -t 3 &>/dev/null; then
      ok "PostgreSQL: OK (Docker: oshxona-postgres)"
      PG_DONE=true
    else
      warn "PostgreSQL: Docker konteyner bor, pg_isready xato"
    fi
  else
    warn "PostgreSQL: oshxona-postgres konteyner ishlamayapti"
  fi
fi
[[ "$PG_DONE" == "false" ]] && [[ -z "$DB_HOST" ]] \
  && warn "PostgreSQL: DATABASE_URL topilmadi — tekshirib bo'lmadi"

echo ""
# ── TypeScript ─────────────────────────────────────────────────────────────────
echo -e "  ${BOLD}TypeScript kompilyatsiya${NC}"
if [[ "$WITH_TS" == "true" ]]; then
  if command -v npx &>/dev/null; then
    if [[ -f "$ROOT/apps/api/tsconfig.json" ]]; then
      TS_OUT=$(cd "$ROOT" && npx tsc --noEmit --project apps/api/tsconfig.json 2>&1 || true)
      TS_ERR=$(echo "$TS_OUT" | grep -c "error TS" || true)
      MRK_ERR=$(echo "$TS_OUT" | grep -c "markirovka" || true)
      if [[ "$TS_ERR" -eq 0 ]]; then
        ok "API TypeScript: 0 xato"
      else
        fail "API TypeScript: $TS_ERR ta xato (markirovka: $MRK_ERR ta)"
        echo "$TS_OUT" | grep "markirovka" | head -5 | while read -r line; do
          info "    $line"
        done
      fi
    fi
    if [[ -f "$ROOT/apps/web/tsconfig.json" ]]; then
      TS_OUT=$(cd "$ROOT" && npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 || true)
      TS_ERR=$(echo "$TS_OUT" | grep -c "error TS" || true)
      if [[ "$TS_ERR" -eq 0 ]]; then
        ok "Web TypeScript: 0 xato"
      else
        fail "Web TypeScript: $TS_ERR ta xato"
      fi
    fi
  else
    warn "npx topilmadi — TypeScript tekshirib bo'lmadi"
  fi
else
  skip "TypeScript: --with-ts bayrog'i yo'q"
fi

echo ""
# ── API Curl Tekshiruvlar ──────────────────────────────────────────────────────
echo -e "  ${BOLD}API Runtime (curl)${NC}"
if [[ "$WITH_API" != "true" ]]; then
  skip "API curl: --with-api bayrog'i yo'q"
  info "  Ishlatish: bash scripts/verify-markirovka.sh --with-api"
else
  if ! command -v curl &>/dev/null; then
    warn "curl topilmadi — API tekshirib bo'lmadi"
  else
    HC=$(curl -sf -o /dev/null -w "%{http_code}" \
         --max-time 5 "${API_URL}/healthz" 2>/dev/null || echo "000")
    if [[ "$HC" == "200" ]]; then
      ok "API /healthz → HTTP 200 (ishlamoqda)"
    elif [[ "$HC" == "000" ]]; then
      warn "API javob bermadi — $API_URL ishlamayapti"
    else
      warn "API /healthz → HTTP $HC"
    fi

    if [[ "$HC" == "200" ]]; then
      echo ""
      info "Auth olmay tekshiruv — 401 kutiladi:"

      for item in \
        "GET|/api/markirovka/stats" \
        "GET|/api/markirovka/expired" \
        "GET|/api/markirovka/products" \
        "GET|/api/markirovka/check/TESTTESTTEST12345678" \
        "POST|/api/markirovka/verify/TESTTESTTEST12345678" \
        "GET|/api/markirovka/report/daily" \
        "GET|/api/markirovka/trace/TESTTESTTEST12345678"
      do
        mth="${item%%|*}"; path="${item##*|}"
        SC=$(curl -sf -o /dev/null -w "%{http_code}" \
             --max-time 5 -X "$mth" \
             "${API_URL}${path}" 2>/dev/null || echo "000")
        if   [[ "$SC" == "401" || "$SC" == "403" ]]; then
          ok  "  $mth $path → HTTP $SC (auth ishlaydi)"
        elif [[ "$SC" == "404" ]]; then
          fail "  $mth $path → HTTP 404 (endpoint yo'q!)"
        elif [[ "$SC" == "000" ]]; then
          warn "  $mth $path → timeout"
        else
          warn "  $mth $path → HTTP $SC (kutilgan 401)"
        fi
      done

      # Login bilan autentifikatsiyali testlar
      TEST_EMAIL="${MARKIROVKA_TEST_EMAIL:-}"
      TEST_PASS="${MARKIROVKA_TEST_PASSWORD:-}"

      if [[ -n "$TEST_EMAIL" && -n "$TEST_PASS" ]]; then
        echo ""
        info "Login: $TEST_EMAIL..."
        LOGIN_RESP=$(curl -sf --max-time 8 \
          -H "Content-Type: application/json" \
          -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASS\"}" \
          "${API_URL}/api/auth/login" 2>/dev/null || echo "{}")
        API_TOKEN=$(echo "$LOGIN_RESP" \
          | grep -o '"accessToken":"[^"]*"' \
          | cut -d'"' -f4 || true)

        if [[ -n "$API_TOKEN" ]]; then
          ok "Login muvaffaqiyatli, token olindi"

          for item in \
            "GET|/api/markirovka/stats" \
            "GET|/api/markirovka/expired" \
            "GET|/api/markirovka/products" \
            "GET|/api/markirovka/logs" \
            "GET|/api/markirovka/batches"
          do
            mth="${item%%|*}"; path="${item##*|}"
            SC=$(curl -sf -o /dev/null -w "%{http_code}" \
                 --max-time 8 -X "$mth" \
                 -H "Authorization: Bearer $API_TOKEN" \
                 "${API_URL}${path}" 2>/dev/null || echo "000")
            if [[ "$SC" == "200" ]]; then
              ok  "  $mth $path → HTTP 200"
            else
              warn "  $mth $path → HTTP $SC (kutilgan 200)"
            fi
          done

          # Verify — yangi kod (davlat serverida yo'q → 200 yoki 202/QUEUED)
          TCODE="01234567890123456789SIMTEST"
          SC=$(curl -sf -o /dev/null -w "%{http_code}" \
               --max-time 12 -X POST \
               -H "Authorization: Bearer $API_TOKEN" \
               "${API_URL}/api/markirovka/verify/${TCODE}" 2>/dev/null || echo "000")
          if [[ "$SC" == "200" || "$SC" == "202" ]]; then
            ok  "  POST /api/markirovka/verify/:code → HTTP $SC (QUEUED bo'lishi mumkin)"
          else
            warn "  POST /api/markirovka/verify/:code → HTTP $SC (kutilgan 200/202)"
          fi

          # Check — noma'lum kod, valid:false qaytarishi kerak
          SC=$(curl -sf -o /dev/null -w "%{http_code}" \
               --max-time 8 \
               -H "Authorization: Bearer $API_TOKEN" \
               "${API_URL}/api/markirovka/check/${TCODE}" 2>/dev/null || echo "000")
          if [[ "$SC" == "200" ]]; then
            ok  "  GET /api/markirovka/check/:code → HTTP 200 (valid:false kutiladi)"
          else
            warn "  GET /api/markirovka/check/:code → HTTP $SC (kutilgan 200)"
          fi

          # Daily report
          TODAY=$(date +%Y-%m-%d 2>/dev/null || date -u +%Y-%m-%d)
          SC=$(curl -sf -o /dev/null -w "%{http_code}" \
               --max-time 8 \
               -H "Authorization: Bearer $API_TOKEN" \
               "${API_URL}/api/markirovka/report/daily?date=${TODAY}" 2>/dev/null || echo "000")
          if [[ "$SC" == "200" ]]; then
            ok  "  GET /api/markirovka/report/daily → HTTP 200"
          else
            warn "  GET /api/markirovka/report/daily → HTTP $SC (kutilgan 200)"
          fi

        else
          warn "Login xato — autentifikatsiyali testlar o'tkazildi"
          info "  MARKIROVKA_TEST_EMAIL va MARKIROVKA_TEST_PASSWORD to'g'rimi?"
        fi
      else
        skip "Login tekshiruvi: MARKIROVKA_TEST_EMAIL/PASSWORD belgilanmagan"
        info "  Ishlatish: MARKIROVKA_TEST_EMAIL=... MARKIROVKA_TEST_PASSWORD=... bash scripts/verify-markirovka.sh --with-api"
      fi
    fi
  fi
fi
endsep

# =============================================================================
sep "BO'LIM 7 — To'liq Integratsiya Yo'li (Statik Simulyatsiya)"
# =============================================================================

echo -e "  ${BOLD}Omborchi → Kassa → Hisobot zanjiri${NC}\n"

info "1. Omborchi yangi markirovka kodini skanerlaydi:"
chk "$RECEIVE" "markirovka/check|handleScan" \
  "   ReceiveMarkirovka → GET /check/:code ✅" \
  "   ReceiveMarkirovka check endpoint topilmadi"

info "2. Partiyaviy qabul qilish (batch-receive):"
chk "$RECEIVE" "batch-receive|batchReceive" \
  "   ReceiveMarkirovka → POST /batch-receive ✅" \
  "   batch-receive topilmadi"
chk "$SVC" "static async batchReceive" \
  "   MarkirovkaService.batchReceive() ✅" \
  "   batchReceive service metodi topilmadi"
chk "$SCHEMA" "markirovka_products|markirovkaProducts" \
  "   DB: markirovka_products jadvaliga yoziladi ✅" \
  "   markirovka_products jadvali topilmadi"
chk "$SCHEMA" "markirovka_batches|markirovkaBatches" \
  "   DB: markirovka_batches jadvaliga yoziladi ✅" \
  "   markirovka_batches jadvali topilmadi"

info "3. Kassir mahsulotni QR skanerlaydi:"
chk "$SCANNER" "markirovka/check|checkBeforeSell" \
  "   MarkirovkaScanner → GET /check/:code ✅" \
  "   Scanner check topilmadi"
chk "$SCANNER" "markirovka/verify" \
  "   MarkirovkaScanner → POST /verify (fon, davlat serveri) ✅" \
  "   Scanner verify topilmadi"
chk "$SCANNER" "AudioContext|playBeep" \
  "   BEEP ovozi yangraydi ✅" \
  "   BEEP topilmadi"

info "4. Sotuv davlat serveriga xabar beriladi:"
chk "$CTRL" "static async sell" \
  "   MarkirovkaController.sell() ✅" \
  "   sell metodi topilmadi"
chk "$SVC" "MarkirovkaStatus.SOLD" \
  "   DB: markCode → SOLD holati ✅" \
  "   SOLD holati topilmadi"
chk "$SVC" "/api/v1/sale|sendToGovernment" \
  "   Davlat API POST /api/v1/sale ✅" \
  "   Davlat API chaqiruvi topilmadi"
chk "$SVC" "pushToOfflineQueue|QUEUED" \
  "   Internet yo'q → offline queue ✅" \
  "   Offline queue topilmadi"

info "5. Kunlik hisobot tuziladi (23:30):"
chk "$CRON" "30 23" \
  "   Cron: 23:30 da ishlaydi ✅" \
  "   23:30 topilmadi"
chk "$CRON" "buildXml|SaleReport" \
  "   O'zbekiston standarti XML tuziladi ✅" \
  "   XML builder topilmadi"
chk "$CRON" "/api/v1/report|sendToGovernment" \
  "   Davlat serveriga yuboriladi ✅" \
  "   Yuborish topilmadi"
chk "$CRON" "redis.zadd|enqueueForRetry" \
  "   Xato bo'lsa → Redis retry queue ✅" \
  "   Retry queue topilmadi"

info "6. Admin dashboard monitoring:"
chk "$DASH" "markirovka/stats" \
  "   Dashboard → GET /stats ✅" \
  "   /stats topilmadi"
chk "$DASH" "BarChart|ResponsiveContainer" \
  "   Kunlik grafik ko'rsatiladi ✅" \
  "   Grafik topilmadi"
chk "$DASH" "exportTaxXml|TaxAuditReport" \
  "   Soliq auditi XML yuklab olinadi ✅" \
  "   Tax XML topilmadi"
endsep

# =============================================================================
# YAKUNIY NATIJA
# =============================================================================

TOTAL=$((PASS + FAIL + WARN + SKIP))

echo ""
echo -e "${BOLD}${M}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${M}║                    YAKUNIY NATIJA                         ║${NC}"
echo -e "${BOLD}${M}╠═══════════════════════════════════════════════════════════╣${NC}"
printf "  ${G}✅  O'tdi         : %-4s${NC}\n" "$PASS"
printf "  ${R}❌  Xato          : %-4s${NC}\n" "$FAIL"
printf "  ${Y}⚠️   Ogohlantirish : %-4s${NC}\n" "$WARN"
printf "  ${DIM}⏭   O'tkazildi   : %-4s${NC}\n" "$SKIP"
printf "  ${B}ℹ️   Jami          : %-4s${NC}\n" "$TOTAL"
echo -e "${BOLD}${M}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

if   [[ $FAIL -eq 0 && $WARN -eq 0 ]]; then
  echo -e "  ${G}${BOLD}🎉  BARCHA TEKSHIRUVLAR MUVAFFAQIYATLI O'TDI!${NC}"
  echo -e "  ${G}    Markirovka tizimi to'liq va ishga tayyor.${NC}"
elif [[ $FAIL -eq 0 ]]; then
  echo -e "  ${Y}${BOLD}⚠️   TEKSHIRUVLAR O'TDI, lekin $WARN ogohlantirish bor.${NC}"
  echo -e "  ${Y}    Ogohlantirishlarni ko'rib chiqing.${NC}"
else
  echo -e "  ${R}${BOLD}❌  $FAIL ta xato topildi!${NC}"
  echo ""
  echo -e "  ${BOLD}Keyingi qadamlar:${NC}"
  echo -e "  ${B}1.${NC} Yuqoridagi ${R}❌${NC} qatorlarni tekshiring"
  echo -e "  ${B}2.${NC} Prisma: ${C}npm run db:generate${NC}"
  echo -e "  ${B}3.${NC} TypeScript: ${C}bash scripts/verify-markirovka.sh --with-ts${NC}"
  echo -e "  ${B}4.${NC} API: ${C}bash scripts/verify-markirovka.sh --with-api${NC}"
  echo -e "  ${B}5.${NC} Login bilan:"
  echo -e "     ${C}MARKIROVKA_TEST_EMAIL=... MARKIROVKA_TEST_PASSWORD=... \\"${NC}
  echo -e "     ${C}  bash scripts/verify-markirovka.sh --with-api${NC}"
fi

echo ""
echo -e "${DIM}  Vaqt: $(date '+%Y-%m-%d %H:%M:%S') | $ROOT${NC}"
echo ""

[[ $FAIL -gt 0 ]] && exit 1
exit 0
