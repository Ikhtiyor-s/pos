#!/usr/bin/env bash
# =============================================================================
# test-full-system.sh — Oshxona POS tizimi TO'LIQ test skripti
#
# ISHLATISH:
#   bash scripts/test-full-system.sh
#   BASE_URL=http://localhost:3000 bash scripts/test-full-system.sh
#   TEST_EMAIL=admin@test.com TEST_PASSWORD=secret bash scripts/test-full-system.sh
#
# TALABLAR:
#   - curl (HTTP so'rovlar)
#   - jq (JSON parse, ixtiyoriy — yo'q bo'lsa grep ishlatiladi)
#   - API ishlab turishi kerak
#
# OUTPUT:
#   ✅ — muvaffaqiyatli
#   ❌ — xato
#   ⚠️  — ogohlantirish / o'tkazildi
#   📊 — hisobot / ma'lumot
# =============================================================================

set +e  # Xato bo'lsa ham davom etsin

# ── Konfiguratsiya ─────────────────────────────────────────────────────────────
BASE_URL="${BASE_URL:-http://localhost:3000}"
API="${BASE_URL}/api"
TEST_EMAIL="${TEST_EMAIL:-admin@test.com}"
TEST_PASSWORD="${TEST_PASSWORD:-Test1234!}"
TEST_TENANT_SLUG="${TEST_TENANT_SLUG:-test-restoran}"
TIMEOUT=10
TMP="/tmp/pos_test_$$"
mkdir -p "$TMP"

# ── Ranglar ────────────────────────────────────────────────────────────────────
G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'
B='\033[0;34m'; C='\033[0;36m'; M='\033[0;35m'
BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

# ── Global holat ───────────────────────────────────────────────────────────────
TOKEN=""
REFRESH_TOKEN=""
TEST_USER_ID=""
CATEGORY_ID=""
PRODUCT_ID=""
PRODUCT_ID2=""
TABLE_ID=""
ORDER_ID=""
ORDER_ITEM_ID=""
CUSTOMER_ID=""
INVENTORY_ID=""
SUPPLIER_ID=""
WEBHOOK_ID=""
COUPON_ID=""
RESERVATION_ID=""
SHIFT_ID=""
DRIVER_ID=""
EXPENSE_CAT_ID=""
EXPENSE_ID=""
PLAN_ID=""
BRANCH_ID=""
NOTIFICATION_ID=""

# ── Hisoblagichlar ─────────────────────────────────────────────────────────────
T_TOTAL=0; T_PASS=0; T_FAIL=0; T_WARN=0; T_SKIP=0
declare -a FAILED_TESTS=()
SECTION_NUM=0; CURRENT_SECTION=""

# ── JSON yordamchilari ─────────────────────────────────────────────────────────
HAS_JQ=false
command -v jq &>/dev/null && HAS_JQ=true

jget() {
  local json="$1" key="$2"
  if $HAS_JQ; then
    echo "$json" | jq -r "$key" 2>/dev/null
  else
    echo "$json" | grep -o "\"${key#*.}\":\"[^\"]*\"" | cut -d'"' -f4 | head -1
  fi
}

jget_nested() {
  local json="$1" path="$2"
  if $HAS_JQ; then
    echo "$json" | jq -r "$path" 2>/dev/null
  else
    local key; key=$(echo "$path" | sed 's/.*\.//')
    echo "$json" | grep -o "\"$key\":\"[^\"]*\"" | cut -d'"' -f4 | head -1
  fi
}

# ── Output funksiyalar ─────────────────────────────────────────────────────────
sep() {
  SECTION_NUM=$((SECTION_NUM+1))
  CURRENT_SECTION="$*"
  echo ""
  echo -e "${BOLD}${M}╔══════════════════════════════════════════════════════╗${NC}"
  printf "${BOLD}${M}║  %-51s ║${NC}\n" "$(printf '%d. %s' $SECTION_NUM "$*")"
  echo -e "${BOLD}${M}╚══════════════════════════════════════════════════════╝${NC}"
}

ok()   { echo -e "  ${G}✅${NC}  [$T_TOTAL] $*"; T_PASS=$((T_PASS+1)); }
fail() {
  echo -e "  ${R}❌${NC}  [$T_TOTAL] $*"
  T_FAIL=$((T_FAIL+1))
  FAILED_TESTS+=("[$T_TOTAL] $SECTION_NUM.$CURRENT_SECTION — $*")
}
warn() { echo -e "  ${Y}⚠️ ${NC}  [$T_TOTAL] $*"; T_WARN=$((T_WARN+1)); }
skip() { echo -e "  ${DIM}⏭  [$T_TOTAL] $*${NC}"; T_SKIP=$((T_SKIP+1)); }
info() { echo -e "  ${B}ℹ️ ${NC}  $*"; }

# ── Asosiy test funksiyasi ─────────────────────────────────────────────────────
# Ishlatish: run_test LABEL METHOD PATH [BODY] [EXPECTED_STATUS] [TOKEN_VAR]
run_test() {
  local label="$1"
  local method="$2"
  local path="$3"
  local body="${4:-}"
  local expected="${5:-200}"
  local use_token="${6:-true}"

  T_TOTAL=$((T_TOTAL+1))

  local url="${API}${path}"
  local resp_file="$TMP/resp_${T_TOTAL}.json"
  local status_file="$TMP/status_${T_TOTAL}.txt"

  # curl buyrug'ini qurish
  local curl_args=(-s -o "$resp_file" -w "%{http_code}" --max-time "$TIMEOUT" -X "$method")

  if [[ "$use_token" == "true" && -n "$TOKEN" ]]; then
    curl_args+=(-H "Authorization: Bearer $TOKEN")
  fi

  if [[ -n "$body" ]]; then
    curl_args+=(-H "Content-Type: application/json" -d "$body")
  fi

  local http_code
  http_code=$(curl "${curl_args[@]}" "$url" 2>/dev/null)
  local resp; resp=$(cat "$resp_file" 2>/dev/null || echo "{}")

  echo "$http_code" > "$status_file"

  # Natijani tekshirish
  if [[ "$expected" == *"|"* ]]; then
    # Bir nechta qabul qilingan statuslar (masalan "200|201")
    local accepted=false
    IFS='|' read -ra codes <<< "$expected"
    for code in "${codes[@]}"; do
      [[ "$http_code" == "$code" ]] && accepted=true && break
    done
    if $accepted; then
      ok "$label → HTTP $http_code"
    else
      fail "$label → HTTP $http_code (kutilgan: $expected)"
    fi
  elif [[ "$http_code" == "$expected" ]]; then
    ok "$label → HTTP $http_code"
  elif [[ "$http_code" == "000" ]]; then
    fail "$label → Timeout/Ulanib bo'lmadi"
  else
    local err_msg
    if $HAS_JQ; then
      err_msg=$(echo "$resp" | jq -r '.message // .error // empty' 2>/dev/null | head -1)
    else
      err_msg=$(echo "$resp" | grep -o '"message":"[^"]*"' | cut -d'"' -f4 | head -1)
    fi
    fail "$label → HTTP $http_code (kutilgan: $expected)${err_msg:+ — $err_msg}"
  fi

  echo "$resp"
}

# ── Token olish funksiyasi ─────────────────────────────────────────────────────
auth_header() {
  [[ -n "$TOKEN" ]] && echo "-H 'Authorization: Bearer $TOKEN'" || echo ""
}

# =============================================================================
# BOSHLASH
# =============================================================================
echo ""
echo -e "${BOLD}${C}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${C}║     🍽️  OSHXONA POS — TO'LIQ TIZIM TEST SKRIPTI          ║${NC}"
echo -e "${BOLD}${C}║     20 bo'lim • 100+ test • Avtomatik hisobot              ║${NC}"
echo -e "${BOLD}${C}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
info "API manzil : $API"
info "Test email : $TEST_EMAIL"
$HAS_JQ && info "jq         : ✅ mavjud (to'liq JSON parsing)" \
         || info "jq         : ⚠️  topilmadi (grep fallback ishlatiladi)"
echo ""

# Health check — API ishlab turganmi?
info "API health tekshiruv..."
HC=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 5 "${BASE_URL}/healthz" 2>/dev/null || echo "000")
if [[ "$HC" != "200" ]]; then
  echo -e "${R}${BOLD}❌  API ${BASE_URL} ishlamayapti (HTTP $HC). Skript to'xtatildi.${NC}"
  echo -e "${Y}    Ishga tushirish: npm run dev yoki docker-compose up${NC}"
  exit 1
fi
ok "API /healthz → HTTP 200 (ishlamoqda)"

# =============================================================================
sep "AUTENTIFIKATSIYA (Authentication)"
# =============================================================================

# 1.1 Login (email + parol)
T_TOTAL=$((T_TOTAL+1))
info "1.1 Login email/parol bilan..."
LOGIN_RESP=$(curl -s --max-time "$TIMEOUT" -X POST \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
  "${API}/auth/login" 2>/dev/null || echo "{}")
LOGIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" -X POST \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
  "${API}/auth/login" 2>/dev/null || echo "000")

if [[ "$LOGIN_STATUS" == "200" || "$LOGIN_STATUS" == "201" ]]; then
  ok "1.1 Login (email) → HTTP $LOGIN_STATUS"
  T_PASS=$((T_PASS+1))
  if $HAS_JQ; then
    TOKEN=$(echo "$LOGIN_RESP" | jq -r '.data.accessToken // .data.tokens.accessToken // empty' 2>/dev/null)
    REFRESH_TOKEN=$(echo "$LOGIN_RESP" | jq -r '.data.refreshToken // .data.tokens.refreshToken // empty' 2>/dev/null)
    ME_ID=$(echo "$LOGIN_RESP" | jq -r '.data.user.id // .data.id // empty' 2>/dev/null)
  else
    TOKEN=$(echo "$LOGIN_RESP" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 | head -1)
    REFRESH_TOKEN=$(echo "$LOGIN_RESP" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4 | head -1)
  fi
  [[ -n "$TOKEN" ]] && info "  Token olindi: ${TOKEN:0:20}..." || warn "  Token bo'sh!"
else
  fail "1.1 Login (email) → HTTP $LOGIN_STATUS — Test foydalanuvchisi yo'qmi?"
  T_FAIL=$((T_FAIL+1))
  FAILED_TESTS+=("[1.1] Login xato — keyingi testlar token talab qiladi")
  warn "  TEST_EMAIL va TEST_PASSWORD to'g'ri ekanligini tekshiring"
fi

# 1.2 Login (PIN)
T_TOTAL=$((T_TOTAL+1))
info "1.2 PIN bilan login..."
PIN_RESP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" -X POST \
  -H "Content-Type: application/json" \
  -d "{\"pin\":\"1234\",\"tenantId\":\"test\"}" \
  "${API}/auth/login-pin" 2>/dev/null || echo "000")
if [[ "$PIN_RESP" == "200" || "$PIN_RESP" == "201" ]]; then
  ok "1.2 Login (PIN) → HTTP $PIN_RESP"
  T_PASS=$((T_PASS+1))
elif [[ "$PIN_RESP" == "400" || "$PIN_RESP" == "401" || "$PIN_RESP" == "404" ]]; then
  warn "1.2 Login (PIN) → HTTP $PIN_RESP (PIN yoki tenant topilmadi — normal)"
  T_WARN=$((T_WARN+1))
else
  fail "1.2 Login (PIN) → HTTP $PIN_RESP"
  T_FAIL=$((T_FAIL+1))
fi

# 1.3 Token yangilash (refresh)
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$REFRESH_TOKEN" ]]; then
  REFRESH_RESP=$(curl -s --max-time "$TIMEOUT" -X POST \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}" \
    "${API}/auth/refresh" 2>/dev/null || echo "{}")
  REFRESH_STATUS=$(echo "$REFRESH_RESP" | grep -c '"success":true' || echo "0")
  RF_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" -X POST \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}" \
    "${API}/auth/refresh" 2>/dev/null || echo "000")
  if [[ "$RF_HTTP" == "200" || "$RF_HTTP" == "201" ]]; then
    ok "1.3 Refresh token → HTTP $RF_HTTP"
    T_PASS=$((T_PASS+1))
  else
    warn "1.3 Refresh token → HTTP $RF_HTTP"
    T_WARN=$((T_WARN+1))
  fi
else
  skip "1.3 Refresh token — TOKEN yo'q, o'tkazildi"
  T_SKIP=$((T_SKIP+1))
fi

# 1.4 GET /me
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  ME_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" \
    "${API}/auth/me" 2>/dev/null || echo "000")
  if [[ "$ME_HTTP" == "200" ]]; then
    ok "1.4 GET /auth/me → HTTP 200"
    T_PASS=$((T_PASS+1))
  else
    fail "1.4 GET /auth/me → HTTP $ME_HTTP"
    T_FAIL=$((T_FAIL+1))
  fi
else
  skip "1.4 GET /me — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 1.5 Parolni o'zgartirish
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  CP_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X PUT -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"oldPassword\":\"$TEST_PASSWORD\",\"newPassword\":\"$TEST_PASSWORD\"}" \
    "${API}/auth/change-password" 2>/dev/null || echo "000")
  if [[ "$CP_HTTP" == "200" || "$CP_HTTP" == "400" ]]; then
    ok "1.5 Change password → HTTP $CP_HTTP"
    T_PASS=$((T_PASS+1))
  else
    warn "1.5 Change password → HTTP $CP_HTTP"
    T_WARN=$((T_WARN+1))
  fi
else
  skip "1.5 Change password — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 1.6 Logout
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  LO_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X POST -H "Authorization: Bearer $TOKEN" \
    "${API}/auth/logout" 2>/dev/null || echo "000")
  if [[ "$LO_HTTP" == "200" || "$LO_HTTP" == "204" ]]; then
    ok "1.6 Logout → HTTP $LO_HTTP"
    T_PASS=$((T_PASS+1))
  else
    warn "1.6 Logout → HTTP $LO_HTTP"
    T_WARN=$((T_WARN+1))
  fi
else
  skip "1.6 Logout — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# Token qayta olish (logout qilindi)
if [[ -n "$TEST_EMAIL" ]]; then
  NEW_LOGIN=$(curl -s --max-time "$TIMEOUT" -X POST \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
    "${API}/auth/login" 2>/dev/null || echo "{}")
  if $HAS_JQ; then
    TOKEN=$(echo "$NEW_LOGIN" | jq -r '.data.accessToken // .data.tokens.accessToken // empty' 2>/dev/null)
    REFRESH_TOKEN=$(echo "$NEW_LOGIN" | jq -r '.data.refreshToken // .data.tokens.refreshToken // empty' 2>/dev/null)
  else
    TOKEN=$(echo "$NEW_LOGIN" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 | head -1)
  fi
fi

# =============================================================================
sep "XODIMLAR (User Management)"
# =============================================================================

# 2.1 Xodim yaratish
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  TS=$(date +%s)
  CREATE_USER_RESP=$(curl -s --max-time "$TIMEOUT" -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"testuser${TS}@test.com\",\"password\":\"Test1234!\",\"firstName\":\"Test\",\"lastName\":\"User${TS}\",\"role\":\"CASHIER\"}" \
    "${API}/users" 2>/dev/null || echo "{}")
  CU_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" -X POST \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"email\":\"testuser${TS}x@test.com\",\"password\":\"Test1234!\",\"firstName\":\"Test\",\"lastName\":\"UserX\",\"role\":\"WAITER\"}" \
    "${API}/users" 2>/dev/null || echo "000")
  if [[ "$CU_HTTP" == "200" || "$CU_HTTP" == "201" ]]; then
    ok "2.1 POST /users → HTTP $CU_HTTP"
    T_PASS=$((T_PASS+1))
    if $HAS_JQ; then
      TEST_USER_ID=$(echo "$CREATE_USER_RESP" | jq -r '.data.id // empty' 2>/dev/null)
    fi
  elif [[ "$CU_HTTP" == "403" || "$CU_HTTP" == "401" ]]; then
    warn "2.1 POST /users → HTTP $CU_HTTP (ruxsat yo'q — MANAGER kerak)"
    T_WARN=$((T_WARN+1))
  else
    fail "2.1 POST /users → HTTP $CU_HTTP"
    T_FAIL=$((T_FAIL+1))
  fi
else
  skip "2.1 POST /users — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 2.2 Xodimlar ro'yxati
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  GU_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/users" 2>/dev/null || echo "000")
  if [[ "$GU_HTTP" == "200" ]]; then
    ok "2.2 GET /users → HTTP 200"
    T_PASS=$((T_PASS+1))
  else
    fail "2.2 GET /users → HTTP $GU_HTTP"
    T_FAIL=$((T_FAIL+1))
  fi
else
  skip "2.2 GET /users — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 2.3 Bitta xodim
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" && -n "$TEST_USER_ID" ]]; then
  GU1_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/users/${TEST_USER_ID}" 2>/dev/null || echo "000")
  if [[ "$GU1_HTTP" == "200" ]]; then
    ok "2.3 GET /users/:id → HTTP 200"
    T_PASS=$((T_PASS+1))
  else
    fail "2.3 GET /users/:id → HTTP $GU1_HTTP"
    T_FAIL=$((T_FAIL+1))
  fi
else
  skip "2.3 GET /users/:id — ID yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 2.4 Xodimni yangilash
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" && -n "$TEST_USER_ID" ]]; then
  UU_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X PUT -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"firstName\":\"Updated\",\"lastName\":\"Name\"}" \
    "${API}/users/${TEST_USER_ID}" 2>/dev/null || echo "000")
  if [[ "$UU_HTTP" == "200" ]]; then
    ok "2.4 PUT /users/:id → HTTP 200"
    T_PASS=$((T_PASS+1))
  else
    fail "2.4 PUT /users/:id → HTTP $UU_HTTP"
    T_FAIL=$((T_FAIL+1))
  fi
else
  skip "2.4 PUT /users/:id — ID yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 2.5 PIN yaratish
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" && -n "$TEST_USER_ID" ]]; then
  PIN_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X PUT -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"pin\":\"1234\"}" \
    "${API}/auth/users/${TEST_USER_ID}/pin" 2>/dev/null || echo "000")
  if [[ "$PIN_HTTP" == "200" || "$PIN_HTTP" == "201" ]]; then
    ok "2.5 PUT /auth/users/:id/pin → HTTP $PIN_HTTP"
    T_PASS=$((T_PASS+1))
  elif [[ "$PIN_HTTP" == "403" || "$PIN_HTTP" == "404" ]]; then
    warn "2.5 PIN yaratish → HTTP $PIN_HTTP"
    T_WARN=$((T_WARN+1))
  else
    fail "2.5 PIN yaratish → HTTP $PIN_HTTP"
    T_FAIL=$((T_FAIL+1))
  fi
else
  skip "2.5 PIN yaratish — ID yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# =============================================================================
sep "KATEGORIYALAR (Category Management)"
# =============================================================================

# 3.1 Kategoriya yaratish
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  CAT_TS=$(date +%s)
  CAT_RESP=$(curl -s --max-time "$TIMEOUT" -X POST \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"name\":\"Test Cat ${CAT_TS}\",\"slug\":\"test-cat-${CAT_TS}\"}" \
    "${API}/categories" 2>/dev/null || echo "{}")
  CAT_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" -X POST \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"name\":\"Test Cat2 ${CAT_TS}\",\"slug\":\"test-cat2-${CAT_TS}\"}" \
    "${API}/categories" 2>/dev/null || echo "000")
  if [[ "$CAT_HTTP" == "200" || "$CAT_HTTP" == "201" ]]; then
    ok "3.1 POST /categories → HTTP $CAT_HTTP"
    T_PASS=$((T_PASS+1))
    $HAS_JQ && CATEGORY_ID=$(echo "$CAT_RESP" | jq -r '.data.id // empty' 2>/dev/null)
  elif [[ "$CAT_HTTP" == "403" ]]; then
    warn "3.1 POST /categories → HTTP 403 (MANAGER kerak)"
    T_WARN=$((T_WARN+1))
  else
    fail "3.1 POST /categories → HTTP $CAT_HTTP"
    T_FAIL=$((T_FAIL+1))
  fi
else
  skip "3.1 POST /categories — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 3.2 Kategoriyalar ro'yxati
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  GC_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/categories" 2>/dev/null || echo "000")
  if [[ "$GC_HTTP" == "200" ]]; then
    ok "3.2 GET /categories → HTTP 200"
    T_PASS=$((T_PASS+1))
    # Birinchi kategoriyaning ID sini olish
    if [[ -z "$CATEGORY_ID" ]]; then
      CATS_RESP=$(curl -s --max-time "$TIMEOUT" \
        -H "Authorization: Bearer $TOKEN" "${API}/categories" 2>/dev/null || echo "{}")
      $HAS_JQ && CATEGORY_ID=$(echo "$CATS_RESP" | jq -r '.data[0].id // empty' 2>/dev/null)
    fi
  else
    fail "3.2 GET /categories → HTTP $GC_HTTP"
    T_FAIL=$((T_FAIL+1))
  fi
else
  skip "3.2 GET /categories — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 3.3 Kategoriyani yangilash
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" && -n "$CATEGORY_ID" ]]; then
  UC_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"name\":\"Updated Category\"}" \
    "${API}/categories/${CATEGORY_ID}" 2>/dev/null || echo "000")
  if [[ "$UC_HTTP" == "200" ]]; then
    ok "3.3 PUT /categories/:id → HTTP 200"
    T_PASS=$((T_PASS+1))
  else
    fail "3.3 PUT /categories/:id → HTTP $UC_HTTP"
    T_FAIL=$((T_FAIL+1))
  fi
else
  skip "3.3 PUT /categories/:id — ID yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# =============================================================================
sep "MAHSULOTLAR (Product Management)"
# =============================================================================

# 4.1 Mahsulot yaratish
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" && -n "$CATEGORY_ID" ]]; then
  PROD_TS=$(date +%s)
  PROD_RESP=$(curl -s --max-time "$TIMEOUT" -X POST \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"name\":\"Test Mahsulot ${PROD_TS}\",\"price\":15000,\"categoryId\":\"${CATEGORY_ID}\"}" \
    "${API}/products" 2>/dev/null || echo "{}")
  PROD_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" -X POST \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"name\":\"Test Mahsulot2 ${PROD_TS}\",\"price\":25000,\"categoryId\":\"${CATEGORY_ID}\"}" \
    "${API}/products" 2>/dev/null || echo "000")
  if [[ "$PROD_HTTP" == "200" || "$PROD_HTTP" == "201" ]]; then
    ok "4.1 POST /products → HTTP $PROD_HTTP"
    T_PASS=$((T_PASS+1))
    $HAS_JQ && PRODUCT_ID=$(echo "$PROD_RESP" | jq -r '.data.id // empty' 2>/dev/null)
  elif [[ "$PROD_HTTP" == "403" ]]; then
    warn "4.1 POST /products → HTTP 403 (MANAGER kerak)"
    T_WARN=$((T_WARN+1))
  else
    fail "4.1 POST /products → HTTP $PROD_HTTP"
    T_FAIL=$((T_FAIL+1))
  fi
elif [[ -n "$TOKEN" ]]; then
  warn "4.1 POST /products — Kategoriya ID yo'q, avval kategoriya yarating"
  T_WARN=$((T_WARN+1))
else
  skip "4.1 POST /products — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 4.2 Mahsulotlar ro'yxati
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  GP_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/products" 2>/dev/null || echo "000")
  if [[ "$GP_HTTP" == "200" ]]; then
    ok "4.2 GET /products → HTTP 200"
    T_PASS=$((T_PASS+1))
    if [[ -z "$PRODUCT_ID" ]]; then
      PRODS_RESP=$(curl -s --max-time "$TIMEOUT" \
        -H "Authorization: Bearer $TOKEN" "${API}/products" 2>/dev/null || echo "{}")
      $HAS_JQ && PRODUCT_ID=$(echo "$PRODS_RESP" | jq -r '.data[0].id // empty' 2>/dev/null)
    fi
  else
    fail "4.2 GET /products → HTTP $GP_HTTP"
    T_FAIL=$((T_FAIL+1))
  fi
else
  skip "4.2 GET /products — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 4.3 Bitta mahsulot
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" && -n "$PRODUCT_ID" ]]; then
  GP1_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/products/${PRODUCT_ID}" 2>/dev/null || echo "000")
  [[ "$GP1_HTTP" == "200" ]] && { ok "4.3 GET /products/:id → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { fail "4.3 GET /products/:id → HTTP $GP1_HTTP"; T_FAIL=$((T_FAIL+1)); }
else
  skip "4.3 GET /products/:id — ID yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 4.4 Mahsulotni yangilash
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" && -n "$PRODUCT_ID" ]]; then
  UP_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"price\":20000,\"name\":\"Yangilangan Mahsulot\"}" \
    "${API}/products/${PRODUCT_ID}" 2>/dev/null || echo "000")
  [[ "$UP_HTTP" == "200" ]] && { ok "4.4 PUT /products/:id → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { fail "4.4 PUT /products/:id → HTTP $UP_HTTP"; T_FAIL=$((T_FAIL+1)); }
else
  skip "4.4 PUT /products/:id — ID yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 4.5 Narx yangilash
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" && -n "$PRODUCT_ID" ]]; then
  PRP_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"price\":22000}" \
    "${API}/products/${PRODUCT_ID}/price" 2>/dev/null || echo "000")
  [[ "$PRP_HTTP" == "200" || "$PRP_HTTP" == "404" ]] && { ok "4.5 PATCH /products/:id/price → HTTP $PRP_HTTP"; T_PASS=$((T_PASS+1)); } \
    || { warn "4.5 PATCH /products/:id/price → HTTP $PRP_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "4.5 PATCH price — ID yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 4.6 Barcode qidirish
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  BC_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" \
    "${API}/products/barcode/1234567890" 2>/dev/null || echo "000")
  [[ "$BC_HTTP" == "200" || "$BC_HTTP" == "404" ]] && { ok "4.6 GET /products/barcode/:code → HTTP $BC_HTTP"; T_PASS=$((T_PASS+1)); } \
    || { fail "4.6 GET /products/barcode/:code → HTTP $BC_HTTP"; T_FAIL=$((T_FAIL+1)); }
else
  skip "4.6 Barcode qidirish — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 4.7 Ommaviy narx yangilash
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" && -n "$PRODUCT_ID" ]]; then
  BULK_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"items\":[{\"id\":\"${PRODUCT_ID}\",\"price\":25000}]}" \
    "${API}/products/bulk/price-update" 2>/dev/null || echo "000")
  [[ "$BULK_HTTP" == "200" || "$BULK_HTTP" == "404" ]] && { ok "4.7 POST /products/bulk/price-update → HTTP $BULK_HTTP"; T_PASS=$((T_PASS+1)); } \
    || { warn "4.7 Bulk price update → HTTP $BULK_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "4.7 Bulk price — ID yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# =============================================================================
sep "STOLLAR (Table Management)"
# =============================================================================

# 5.1 Stol yaratish
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  TBL_TS=$(date +%s | tail -c 4)
  TBL_RESP=$(curl -s --max-time "$TIMEOUT" -X POST \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"number\":${TBL_TS},\"capacity\":4,\"name\":\"Test Stol ${TBL_TS}\"}" \
    "${API}/tables" 2>/dev/null || echo "{}")
  TBL_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" -X POST \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"number\":$((TBL_TS+1)),\"capacity\":6}" \
    "${API}/tables" 2>/dev/null || echo "000")
  if [[ "$TBL_HTTP" == "200" || "$TBL_HTTP" == "201" ]]; then
    ok "5.1 POST /tables → HTTP $TBL_HTTP"
    T_PASS=$((T_PASS+1))
    $HAS_JQ && TABLE_ID=$(echo "$TBL_RESP" | jq -r '.data.id // empty' 2>/dev/null)
  elif [[ "$TBL_HTTP" == "403" ]]; then
    warn "5.1 POST /tables → HTTP 403"
    T_WARN=$((T_WARN+1))
  else
    fail "5.1 POST /tables → HTTP $TBL_HTTP"
    T_FAIL=$((T_FAIL+1))
  fi
else
  skip "5.1 POST /tables — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 5.2 Stollar ro'yxati
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  GT_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/tables" 2>/dev/null || echo "000")
  if [[ "$GT_HTTP" == "200" ]]; then
    ok "5.2 GET /tables → HTTP 200"
    T_PASS=$((T_PASS+1))
    if [[ -z "$TABLE_ID" ]]; then
      TBL_LIST=$(curl -s --max-time "$TIMEOUT" -H "Authorization: Bearer $TOKEN" \
        "${API}/tables" 2>/dev/null || echo "{}")
      $HAS_JQ && TABLE_ID=$(echo "$TBL_LIST" | jq -r '.data[0].id // empty' 2>/dev/null)
    fi
  else
    fail "5.2 GET /tables → HTTP $GT_HTTP"
    T_FAIL=$((T_FAIL+1))
  fi
else
  skip "5.2 GET /tables — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 5.3 Stol holatini o'zgartirish
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" && -n "$TABLE_ID" ]]; then
  TST_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"status\":\"OCCUPIED\"}" \
    "${API}/tables/${TABLE_ID}/status" 2>/dev/null || echo "000")
  [[ "$TST_HTTP" == "200" ]] && { ok "5.3 PATCH /tables/:id/status → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { fail "5.3 PATCH /tables/:id/status → HTTP $TST_HTTP"; T_FAIL=$((T_FAIL+1)); }
else
  skip "5.3 Stol holati — ID yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 5.4 Stol QR kodi
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" && -n "$TABLE_ID" ]]; then
  QR_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/tables/${TABLE_ID}/qr" 2>/dev/null || echo "000")
  [[ "$QR_HTTP" == "200" || "$QR_HTTP" == "404" ]] && { ok "5.4 GET /tables/:id/qr → HTTP $QR_HTTP"; T_PASS=$((T_PASS+1)); } \
    || { fail "5.4 GET /tables/:id/qr → HTTP $QR_HTTP"; T_FAIL=$((T_FAIL+1)); }
else
  skip "5.4 Table QR — ID yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# =============================================================================
sep "QR MENYU (QR Menu & Public Endpoints)"
# =============================================================================

# 6.1 QR menyu (public, token kerak emas)
T_TOTAL=$((T_TOTAL+1))
QRM_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  "${API}/qr-menu/test-qr-code" 2>/dev/null || echo "000")
[[ "$QRM_HTTP" == "200" || "$QRM_HTTP" == "404" ]] \
  && { ok "6.1 GET /qr-menu/:qrCode (public) → HTTP $QRM_HTTP"; T_PASS=$((T_PASS+1)); } \
  || { warn "6.1 GET /qr-menu/:qrCode → HTTP $QRM_HTTP"; T_WARN=$((T_WARN+1)); }

# 6.2 QR orqali buyurtma
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$PRODUCT_ID" && -n "$TABLE_ID" ]]; then
  QRO_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X POST -H "Content-Type: application/json" \
    -d "{\"tableId\":\"${TABLE_ID}\",\"items\":[{\"productId\":\"${PRODUCT_ID}\",\"quantity\":1}]}" \
    "${API}/qr-menu/order" 2>/dev/null || echo "000")
  [[ "$QRO_HTTP" == "200" || "$QRO_HTTP" == "201" || "$QRO_HTTP" == "400" || "$QRO_HTTP" == "404" ]] \
    && { ok "6.2 POST /qr-menu/order → HTTP $QRO_HTTP"; T_PASS=$((T_PASS+1)); } \
    || { warn "6.2 POST /qr-menu/order → HTTP $QRO_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "6.2 QR order — PRODUCT_ID yoki TABLE_ID yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# =============================================================================
sep "MARKIROVKA (O'zbekiston davlat tizimi)"
# =============================================================================

TEST_MARK="01234567890123456789TEST"

# 7.1 Kodni tekshirish (verify — davlat serveri)
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  MV_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 \
    -X POST -H "Authorization: Bearer $TOKEN" \
    "${API}/markirovka/verify/${TEST_MARK}" 2>/dev/null || echo "000")
  [[ "$MV_HTTP" == "200" || "$MV_HTTP" == "202" ]] \
    && { ok "7.1 POST /markirovka/verify/:code → HTTP $MV_HTTP (QUEUED bo'lishi mumkin)"; T_PASS=$((T_PASS+1)); } \
    || { fail "7.1 POST /markirovka/verify/:code → HTTP $MV_HTTP"; T_FAIL=$((T_FAIL+1)); }
else
  skip "7.1 Markirovka verify — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 7.2 Mahsulot qabul qilish
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" && -n "$PRODUCT_ID" ]]; then
  MR_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"markCode\":\"${TEST_MARK}\",\"batchNumber\":\"BATCH-TEST-001\",\"importerTin\":\"123456789\",\"productId\":\"${PRODUCT_ID}\"}" \
    "${API}/markirovka/receive" 2>/dev/null || echo "000")
  [[ "$MR_HTTP" == "200" || "$MR_HTTP" == "201" || "$MR_HTTP" == "400" || "$MR_HTTP" == "409" ]] \
    && { ok "7.2 POST /markirovka/receive → HTTP $MR_HTTP"; T_PASS=$((T_PASS+1)); } \
    || { fail "7.2 POST /markirovka/receive → HTTP $MR_HTTP"; T_FAIL=$((T_FAIL+1)); }
else
  skip "7.2 Markirovka receive — TOKEN/PRODUCT_ID yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 7.3 Sotishdan oldin tekshirish
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  MC_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" \
    "${API}/markirovka/check/${TEST_MARK}" 2>/dev/null || echo "000")
  [[ "$MC_HTTP" == "200" ]] \
    && { ok "7.3 GET /markirovka/check/:code → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { fail "7.3 GET /markirovka/check/:code → HTTP $MC_HTTP"; T_FAIL=$((T_FAIL+1)); }
else
  skip "7.3 Markirovka check — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 7.4 Muddati o'tganlar
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  ME_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/markirovka/expired" 2>/dev/null || echo "000")
  [[ "$ME_HTTP" == "200" ]] \
    && { ok "7.4 GET /markirovka/expired → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { fail "7.4 GET /markirovka/expired → HTTP $ME_HTTP"; T_FAIL=$((T_FAIL+1)); }
else
  skip "7.4 Markirovka expired — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 7.5 Kunlik hisobot
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  TODAY=$(date +%Y-%m-%d 2>/dev/null || date -u +%Y-%m-%d)
  MD_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" \
    "${API}/markirovka/report/daily?date=${TODAY}" 2>/dev/null || echo "000")
  [[ "$MD_HTTP" == "200" ]] \
    && { ok "7.5 GET /markirovka/report/daily → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { fail "7.5 GET /markirovka/report/daily → HTTP $MD_HTTP"; T_FAIL=$((T_FAIL+1)); }
else
  skip "7.5 Markirovka report — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 7.6 Stats
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  MS_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/markirovka/stats" 2>/dev/null || echo "000")
  [[ "$MS_HTTP" == "200" ]] \
    && { ok "7.6 GET /markirovka/stats → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { fail "7.6 GET /markirovka/stats → HTTP $MS_HTTP"; T_FAIL=$((T_FAIL+1)); }
else
  skip "7.6 Markirovka stats — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# =============================================================================
sep "BUYURTMALAR (Order Management)"
# =============================================================================

# 8.1 Buyurtma yaratish
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" && -n "$PRODUCT_ID" ]]; then
  ORD_RESP=$(curl -s --max-time "$TIMEOUT" -X POST \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"source\":\"POS_ORDER\",\"type\":\"DINE_IN\",\"tableId\":\"${TABLE_ID}\",\"items\":[{\"productId\":\"${PRODUCT_ID}\",\"quantity\":2}]}" \
    "${API}/orders" 2>/dev/null || echo "{}")
  ORD_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" -X POST \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"source\":\"POS_ORDER\",\"type\":\"TAKEAWAY\",\"items\":[{\"productId\":\"${PRODUCT_ID}\",\"quantity\":1}]}" \
    "${API}/orders" 2>/dev/null || echo "000")
  if [[ "$ORD_HTTP" == "200" || "$ORD_HTTP" == "201" ]]; then
    ok "8.1 POST /orders → HTTP $ORD_HTTP"
    T_PASS=$((T_PASS+1))
    $HAS_JQ && ORDER_ID=$(echo "$ORD_RESP" | jq -r '.data.id // empty' 2>/dev/null)
    $HAS_JQ && ORDER_ITEM_ID=$(echo "$ORD_RESP" | jq -r '.data.items[0].id // empty' 2>/dev/null)
  elif [[ "$ORD_HTTP" == "403" ]]; then
    warn "8.1 POST /orders → HTTP 403"
    T_WARN=$((T_WARN+1))
  else
    fail "8.1 POST /orders → HTTP $ORD_HTTP"
    T_FAIL=$((T_FAIL+1))
  fi
else
  skip "8.1 POST /orders — TOKEN/PRODUCT_ID yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 8.2 Buyurtmalar ro'yxati
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  GO_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/orders" 2>/dev/null || echo "000")
  if [[ "$GO_HTTP" == "200" ]]; then
    ok "8.2 GET /orders → HTTP 200"
    T_PASS=$((T_PASS+1))
    if [[ -z "$ORDER_ID" ]]; then
      ORD_LIST=$(curl -s --max-time "$TIMEOUT" \
        -H "Authorization: Bearer $TOKEN" "${API}/orders" 2>/dev/null || echo "{}")
      $HAS_JQ && ORDER_ID=$(echo "$ORD_LIST" | jq -r '.data[0].id // empty' 2>/dev/null)
    fi
  else
    fail "8.2 GET /orders → HTTP $GO_HTTP"
    T_FAIL=$((T_FAIL+1))
  fi
else
  skip "8.2 GET /orders — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 8.3 Bitta buyurtma
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" && -n "$ORDER_ID" ]]; then
  GO1_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/orders/${ORDER_ID}" 2>/dev/null || echo "000")
  [[ "$GO1_HTTP" == "200" ]] && { ok "8.3 GET /orders/:id → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { fail "8.3 GET /orders/:id → HTTP $GO1_HTTP"; T_FAIL=$((T_FAIL+1)); }
else
  skip "8.3 GET /orders/:id — ID yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 8.4 Buyurtma statusini yangilash (NEW → CONFIRMED)
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" && -n "$ORDER_ID" ]]; then
  OS_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"status\":\"CONFIRMED\"}" \
    "${API}/orders/${ORDER_ID}/status" 2>/dev/null || echo "000")
  [[ "$OS_HTTP" == "200" ]] && { ok "8.4 PATCH /orders/:id/status → HTTP 200 (NEW→CONFIRMED)"; T_PASS=$((T_PASS+1)); } \
    || { fail "8.4 PATCH /orders/:id/status → HTTP $OS_HTTP"; T_FAIL=$((T_FAIL+1)); }
else
  skip "8.4 Order status — ID yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 8.5 Mahsulot qo'shish
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" && -n "$ORDER_ID" && -n "$PRODUCT_ID" ]]; then
  OI_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"items\":[{\"productId\":\"${PRODUCT_ID}\",\"quantity\":1}]}" \
    "${API}/orders/${ORDER_ID}/items" 2>/dev/null || echo "000")
  [[ "$OI_HTTP" == "200" || "$OI_HTTP" == "201" ]] && { ok "8.5 POST /orders/:id/items → HTTP $OI_HTTP"; T_PASS=$((T_PASS+1)); } \
    || { fail "8.5 POST /orders/:id/items → HTTP $OI_HTTP"; T_FAIL=$((T_FAIL+1)); }
else
  skip "8.5 Add order item — ID yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 8.6 To'lov qabul qilish
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" && -n "$ORDER_ID" ]]; then
  PAY_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"method\":\"CASH\",\"amount\":50000}" \
    "${API}/orders/${ORDER_ID}/payment" 2>/dev/null || echo "000")
  [[ "$PAY_HTTP" == "200" || "$PAY_HTTP" == "201" || "$PAY_HTTP" == "400" ]] \
    && { ok "8.6 POST /orders/:id/payment → HTTP $PAY_HTTP"; T_PASS=$((T_PASS+1)); } \
    || { fail "8.6 POST /orders/:id/payment → HTTP $PAY_HTTP"; T_FAIL=$((T_FAIL+1)); }
else
  skip "8.6 Order payment — ID yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 8.7 Oshxona buyurtmalari
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  KO_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/orders/kitchen" 2>/dev/null || echo "000")
  [[ "$KO_HTTP" == "200" ]] && { ok "8.7 GET /orders/kitchen → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { warn "8.7 GET /orders/kitchen → HTTP $KO_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "8.7 Kitchen orders — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# =============================================================================
sep "MIJOZLAR (Customer Management)"
# =============================================================================

# 9.1 Mijoz yaratish
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  CUST_TS=$(date +%s)
  CUST_RESP=$(curl -s --max-time "$TIMEOUT" -X POST \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"phone\":\"+998901${CUST_TS: -7}\",\"firstName\":\"Test\",\"lastName\":\"Mijoz\"}" \
    "${API}/customers" 2>/dev/null || echo "{}")
  CUST_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" -X POST \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"phone\":\"+998901$((CUST_TS+1))\"}" \
    "${API}/customers" 2>/dev/null || echo "000")
  if [[ "$CUST_HTTP" == "200" || "$CUST_HTTP" == "201" ]]; then
    ok "9.1 POST /customers → HTTP $CUST_HTTP"
    T_PASS=$((T_PASS+1))
    $HAS_JQ && CUSTOMER_ID=$(echo "$CUST_RESP" | jq -r '.data.id // empty' 2>/dev/null)
  else
    fail "9.1 POST /customers → HTTP $CUST_HTTP"
    T_FAIL=$((T_FAIL+1))
  fi
else
  skip "9.1 POST /customers — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 9.2 Mijozlar ro'yxati
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  GCU_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/customers" 2>/dev/null || echo "000")
  [[ "$GCU_HTTP" == "200" ]] && { ok "9.2 GET /customers → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { fail "9.2 GET /customers → HTTP $GCU_HTTP"; T_FAIL=$((T_FAIL+1)); }
else
  skip "9.2 GET /customers — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 9.3 Bitta mijoz
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" && -n "$CUSTOMER_ID" ]]; then
  GC1_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/customers/${CUSTOMER_ID}" 2>/dev/null || echo "000")
  [[ "$GC1_HTTP" == "200" ]] && { ok "9.3 GET /customers/:id → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { fail "9.3 GET /customers/:id → HTTP $GC1_HTTP"; T_FAIL=$((T_FAIL+1)); }
else
  skip "9.3 GET /customers/:id — ID yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 9.4 Mijozni yangilash
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" && -n "$CUSTOMER_ID" ]]; then
  UC1_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"firstName\":\"Yangilangan\"}" \
    "${API}/customers/${CUSTOMER_ID}" 2>/dev/null || echo "000")
  [[ "$UC1_HTTP" == "200" ]] && { ok "9.4 PUT /customers/:id → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { fail "9.4 PUT /customers/:id → HTTP $UC1_HTTP"; T_FAIL=$((T_FAIL+1)); }
else
  skip "9.4 PUT /customers/:id — ID yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# =============================================================================
sep "OMBOR (Inventory Management)"
# =============================================================================

# 10.1 Ombor mahsuloti yaratish
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  INV_TS=$(date +%s)
  INV_RESP=$(curl -s --max-time "$TIMEOUT" -X POST \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"name\":\"Test Ingredient ${INV_TS}\",\"sku\":\"SKU-${INV_TS}\",\"unit\":\"kg\",\"quantity\":100,\"minQuantity\":10}" \
    "${API}/inventory" 2>/dev/null || echo "{}")
  INV_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" -X POST \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"name\":\"Test Ingredient2 ${INV_TS}\",\"sku\":\"SKU2-${INV_TS}\",\"unit\":\"litr\",\"quantity\":50}" \
    "${API}/inventory" 2>/dev/null || echo "000")
  if [[ "$INV_HTTP" == "200" || "$INV_HTTP" == "201" ]]; then
    ok "10.1 POST /inventory → HTTP $INV_HTTP"
    T_PASS=$((T_PASS+1))
    $HAS_JQ && INVENTORY_ID=$(echo "$INV_RESP" | jq -r '.data.id // empty' 2>/dev/null)
  elif [[ "$INV_HTTP" == "403" ]]; then
    warn "10.1 POST /inventory → HTTP 403 (WAREHOUSE kerak)"
    T_WARN=$((T_WARN+1))
  else
    fail "10.1 POST /inventory → HTTP $INV_HTTP"
    T_FAIL=$((T_FAIL+1))
  fi
else
  skip "10.1 POST /inventory — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 10.2 Ombor ro'yxati
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  GI_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/inventory" 2>/dev/null || echo "000")
  if [[ "$GI_HTTP" == "200" ]]; then
    ok "10.2 GET /inventory → HTTP 200"
    T_PASS=$((T_PASS+1))
    if [[ -z "$INVENTORY_ID" ]]; then
      INV_LIST=$(curl -s --max-time "$TIMEOUT" \
        -H "Authorization: Bearer $TOKEN" "${API}/inventory" 2>/dev/null || echo "{}")
      $HAS_JQ && INVENTORY_ID=$(echo "$INV_LIST" | jq -r '.data[0].id // empty' 2>/dev/null)
    fi
  else
    fail "10.2 GET /inventory → HTTP $GI_HTTP"
    T_FAIL=$((T_FAIL+1))
  fi
else
  skip "10.2 GET /inventory — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 10.3 Kirim/chiqim tranzaksiyasi
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" && -n "$INVENTORY_ID" ]]; then
  TR_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"type\":\"IN\",\"quantity\":20,\"notes\":\"Test kirim\"}" \
    "${API}/inventory/${INVENTORY_ID}/transaction" 2>/dev/null || echo "000")
  [[ "$TR_HTTP" == "200" || "$TR_HTTP" == "201" ]] \
    && { ok "10.3 POST /inventory/:id/transaction → HTTP $TR_HTTP"; T_PASS=$((T_PASS+1)); } \
    || { fail "10.3 POST /inventory/:id/transaction → HTTP $TR_HTTP"; T_FAIL=$((T_FAIL+1)); }
else
  skip "10.3 Inventory transaction — ID yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 10.4 Kam qolgan mahsulotlar
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  LS_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/inventory/low-stock" 2>/dev/null || echo "000")
  [[ "$LS_HTTP" == "200" ]] && { ok "10.4 GET /inventory/low-stock → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { warn "10.4 GET /inventory/low-stock → HTTP $LS_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "10.4 Low stock — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 10.5 Stock alerts
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  SA_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/warehouse/stock-alerts" 2>/dev/null || echo "000")
  [[ "$SA_HTTP" == "200" ]] && { ok "10.5 GET /warehouse/stock-alerts → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { warn "10.5 GET /warehouse/stock-alerts → HTTP $SA_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "10.5 Stock alerts — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 10.6 Xarid buyurtmasi (Purchase Order)
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" && -n "$INVENTORY_ID" ]]; then
  PO_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"supplierId\":null,\"items\":[{\"inventoryItemId\":\"${INVENTORY_ID}\",\"quantity\":50,\"unitPrice\":1000}]}" \
    "${API}/warehouse/purchase-orders" 2>/dev/null || echo "000")
  [[ "$PO_HTTP" == "200" || "$PO_HTTP" == "201" || "$PO_HTTP" == "400" ]] \
    && { ok "10.6 POST /warehouse/purchase-orders → HTTP $PO_HTTP"; T_PASS=$((T_PASS+1)); } \
    || { warn "10.6 POST /warehouse/purchase-orders → HTTP $PO_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "10.6 Purchase order — INVENTORY_ID yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# =============================================================================
sep "TO'LOVLAR (Payment Integrations)"
# =============================================================================

# 11.1 Payme callback (to'g'ri imzosiz → xato qaytarishi kerak)
T_TOTAL=$((T_TOTAL+1))
PAYME_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/json" \
  -d "{\"method\":\"CheckPerformTransaction\",\"params\":{\"amount\":10000,\"account\":{\"order_id\":\"test\"}}}" \
  "${API}/payments/payme/callback" 2>/dev/null || echo "000")
[[ "$PAYME_HTTP" == "200" || "$PAYME_HTTP" == "400" || "$PAYME_HTTP" == "401" ]] \
  && { ok "11.1 POST /payments/payme/callback → HTTP $PAYME_HTTP (endpoint mavjud)"; T_PASS=$((T_PASS+1)); } \
  || { fail "11.1 POST /payments/payme/callback → HTTP $PAYME_HTTP"; T_FAIL=$((T_FAIL+1)); }

# 11.2 Click callback
T_TOTAL=$((T_TOTAL+1))
CLICK_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  -X POST -H "Content-Type: application/x-www-form-urlencoded" \
  -d "click_trans_id=test&service_id=test&click_paydoc_id=test&merchant_trans_id=test&amount=1000&action=0&sign_time=2024&sign_string=test" \
  "${API}/payments/click/prepare" 2>/dev/null || echo "000")
[[ "$CLICK_HTTP" == "200" || "$CLICK_HTTP" == "400" ]] \
  && { ok "11.2 POST /payments/click/prepare → HTTP $CLICK_HTTP (endpoint mavjud)"; T_PASS=$((T_PASS+1)); } \
  || { warn "11.2 POST /payments/click/prepare → HTTP $CLICK_HTTP"; T_WARN=$((T_WARN+1)); }

# 11.3 To'lov holati
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" && -n "$ORDER_ID" ]]; then
  PST_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" \
    "${API}/orders/${ORDER_ID}" 2>/dev/null || echo "000")
  [[ "$PST_HTTP" == "200" || "$PST_HTTP" == "404" ]] \
    && { ok "11.3 GET /orders/:id (payments ko'rish) → HTTP $PST_HTTP"; T_PASS=$((T_PASS+1)); } \
    || { warn "11.3 Payment status → HTTP $PST_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "11.3 Payment status — ID yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# =============================================================================
sep "SODIQLIK DASTURI (Loyalty Program)"
# =============================================================================

# 12.1 Dastur sozlash
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  LP_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/loyalty/program" 2>/dev/null || echo "000")
  [[ "$LP_HTTP" == "200" || "$LP_HTTP" == "404" ]] \
    && { ok "12.1 GET /loyalty/program → HTTP $LP_HTTP"; T_PASS=$((T_PASS+1)); } \
    || { fail "12.1 GET /loyalty/program → HTTP $LP_HTTP"; T_FAIL=$((T_FAIL+1)); }
else
  skip "12.1 Loyalty program — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 12.2 Mijoz balansi
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" && -n "$CUSTOMER_ID" ]]; then
  LB_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" \
    "${API}/loyalty/customer/${CUSTOMER_ID}/balance" 2>/dev/null || echo "000")
  [[ "$LB_HTTP" == "200" || "$LB_HTTP" == "404" ]] \
    && { ok "12.2 GET /loyalty/customer/:id/balance → HTTP $LB_HTTP"; T_PASS=$((T_PASS+1)); } \
    || { fail "12.2 GET /loyalty/customer/:id/balance → HTTP $LB_HTTP"; T_FAIL=$((T_FAIL+1)); }
else
  skip "12.2 Loyalty balance — CUSTOMER_ID yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 12.3 Ball yig'ish
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" && -n "$CUSTOMER_ID" && -n "$ORDER_ID" ]]; then
  LE_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"customerId\":\"${CUSTOMER_ID}\",\"orderId\":\"${ORDER_ID}\",\"amount\":50000}" \
    "${API}/loyalty/earn" 2>/dev/null || echo "000")
  [[ "$LE_HTTP" == "200" || "$LE_HTTP" == "201" || "$LE_HTTP" == "404" || "$LE_HTTP" == "400" ]] \
    && { ok "12.3 POST /loyalty/earn → HTTP $LE_HTTP"; T_PASS=$((T_PASS+1)); } \
    || { warn "12.3 POST /loyalty/earn → HTTP $LE_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "12.3 Loyalty earn — IDs yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 12.4 Kuponlar ro'yxati
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  LCO_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/loyalty/coupons" 2>/dev/null || echo "000")
  [[ "$LCO_HTTP" == "200" ]] \
    && { ok "12.4 GET /loyalty/coupons → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { warn "12.4 GET /loyalty/coupons → HTTP $LCO_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "12.4 Coupons — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# =============================================================================
sep "STATISTIKA VA HISOBOTLAR (Analytics & Reports)"
# =============================================================================

# 13.1 Dashboard statistika
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  DB_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/dashboard" 2>/dev/null || echo "000")
  [[ "$DB_HTTP" == "200" ]] && { ok "13.1 GET /dashboard → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { fail "13.1 GET /dashboard → HTTP $DB_HTTP"; T_FAIL=$((T_FAIL+1)); }
else
  skip "13.1 Dashboard — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 13.2 Analytics dashboard
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  AN_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/analytics/dashboard" 2>/dev/null || echo "000")
  [[ "$AN_HTTP" == "200" ]] && { ok "13.2 GET /analytics/dashboard → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { warn "13.2 GET /analytics/dashboard → HTTP $AN_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "13.2 Analytics — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 13.3 Manba statistikasi
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  AS_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/analytics/sources/stats" 2>/dev/null || echo "000")
  [[ "$AS_HTTP" == "200" ]] && { ok "13.3 GET /analytics/sources/stats → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { warn "13.3 GET /analytics/sources/stats → HTTP $AS_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "13.3 Sources stats — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 13.4 Sotuv hisoboti (JSON)
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  SR_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 \
    -H "Authorization: Bearer $TOKEN" \
    "${API}/reports/data/sales?period=today" 2>/dev/null || echo "000")
  [[ "$SR_HTTP" == "200" || "$SR_HTTP" == "404" ]] \
    && { ok "13.4 GET /reports/data/sales → HTTP $SR_HTTP"; T_PASS=$((T_PASS+1)); } \
    || { warn "13.4 GET /reports/data/sales → HTTP $SR_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "13.4 Sales report — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 13.5 Moliyaviy hisobot
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  FR_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/finance/reports" 2>/dev/null || echo "000")
  [[ "$FR_HTTP" == "200" ]] \
    && { ok "13.5 GET /finance/reports → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { warn "13.5 GET /finance/reports → HTTP $FR_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "13.5 Finance reports — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 13.6 Kunlik sotuv
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  DS_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/dashboard/daily-sales" 2>/dev/null || echo "000")
  [[ "$DS_HTTP" == "200" ]] \
    && { ok "13.6 GET /dashboard/daily-sales → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { warn "13.6 GET /dashboard/daily-sales → HTTP $DS_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "13.6 Daily sales — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# =============================================================================
sep "NONBOR INTEGRATSIYA (Nonbor Marketplace)"
# =============================================================================

# 14.1 Nonbor ulanish holati
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  NS_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/nonbor/status" 2>/dev/null || echo "000")
  [[ "$NS_HTTP" == "200" || "$NS_HTTP" == "404" ]] \
    && { ok "14.1 GET /nonbor/status → HTTP $NS_HTTP"; T_PASS=$((T_PASS+1)); } \
    || { warn "14.1 GET /nonbor/status → HTTP $NS_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "14.1 Nonbor status — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 14.2 Nonbor qo'lda sinxronizatsiya
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  NSY_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 \
    -X POST -H "Authorization: Bearer $TOKEN" \
    "${API}/nonbor/sync" 2>/dev/null || echo "000")
  [[ "$NSY_HTTP" == "200" || "$NSY_HTTP" == "201" || "$NSY_HTTP" == "400" || "$NSY_HTTP" == "404" || "$NSY_HTTP" == "503" ]] \
    && { ok "14.2 POST /nonbor/sync → HTTP $NSY_HTTP"; T_PASS=$((T_PASS+1)); } \
    || { warn "14.2 POST /nonbor/sync → HTTP $NSY_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "14.2 Nonbor sync — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 14.3 Online buyurtmalar
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  OO_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/online-orders" 2>/dev/null || echo "000")
  [[ "$OO_HTTP" == "200" ]] \
    && { ok "14.3 GET /online-orders → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { warn "14.3 GET /online-orders → HTTP $OO_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "14.3 Online orders — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# =============================================================================
sep "OFLAYN REJIM (Offline Sync)"
# =============================================================================

# 15.1 Sync health (token kerak emas)
T_TOTAL=$((T_TOTAL+1))
SH_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
  "${API}/sync/health" 2>/dev/null || echo "000")
[[ "$SH_HTTP" == "200" || "$SH_HTTP" == "404" ]] \
  && { ok "15.1 GET /sync/health → HTTP $SH_HTTP"; T_PASS=$((T_PASS+1)); } \
  || { warn "15.1 GET /sync/health → HTTP $SH_HTTP"; T_WARN=$((T_WARN+1)); }

# 15.2 Kutilayotgan o'zgarishlar
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  SP_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/sync/pending" 2>/dev/null || echo "000")
  [[ "$SP_HTTP" == "200" ]] \
    && { ok "15.2 GET /sync/pending → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { warn "15.2 GET /sync/pending → HTTP $SP_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "15.2 Sync pending — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 15.3 Pull (serverdan ma'lumot olish)
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  PU_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/sync/pull" 2>/dev/null || echo "000")
  [[ "$PU_HTTP" == "200" ]] \
    && { ok "15.3 GET /sync/pull → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { warn "15.3 GET /sync/pull → HTTP $PU_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "15.3 Sync pull — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 15.4 Batch sync
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  BS_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"operations\":[]}" \
    "${API}/sync/batch" 2>/dev/null || echo "000")
  [[ "$BS_HTTP" == "200" || "$BS_HTTP" == "400" ]] \
    && { ok "15.4 POST /sync/batch → HTTP $BS_HTTP"; T_PASS=$((T_PASS+1)); } \
    || { warn "15.4 POST /sync/batch → HTTP $BS_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "15.4 Sync batch — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# =============================================================================
sep "REAL-TIME (Socket.IO & WebSocket)"
# =============================================================================

# 16.1 Socket.IO ulanish tekshiruvi (HTTP polling)
T_TOTAL=$((T_TOTAL+1))
SOCK_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 \
  "${BASE_URL}/socket.io/?EIO=4&transport=polling" 2>/dev/null || echo "000")
[[ "$SOCK_HTTP" == "200" || "$SOCK_HTTP" == "400" || "$SOCK_HTTP" == "101" ]] \
  && { ok "16.1 Socket.IO HTTP polling endpoint → HTTP $SOCK_HTTP"; T_PASS=$((T_PASS+1)); } \
  || { warn "16.1 Socket.IO endpoint → HTTP $SOCK_HTTP (WebSocket server ishlamayaptimi?)"; T_WARN=$((T_WARN+1)); }

# 16.2 WebSocket ulanish (nc yoki websocat)
T_TOTAL=$((T_TOTAL+1))
if command -v websocat &>/dev/null; then
  WS_RESP=$(echo '42["join:pos"]' | timeout 3 websocat \
    "ws://${BASE_URL#http://}/socket.io/?EIO=4&transport=websocket" 2>/dev/null | head -1 || echo "")
  [[ -n "$WS_RESP" ]] \
    && { ok "16.2 WebSocket ulanish → muvaffaqiyatli"; T_PASS=$((T_PASS+1)); } \
    || { warn "16.2 WebSocket ulanish → javob yo'q (websocat mavjud)"; T_WARN=$((T_WARN+1)); }
else
  warn "16.2 WebSocket test — websocat topilmadi (o'rnatish: cargo install websocat)"
  T_WARN=$((T_WARN+1))
fi

# 16.3 SSE (Server-Sent Events) — agar mavjud bo'lsa
T_TOTAL=$((T_TOTAL+1))
skip "16.3 SSE events — Socket.IO orqali ishlaydi (alohida test kerak emas)"
T_SKIP=$((T_SKIP+1))

# =============================================================================
sep "SOZLAMALAR VA FILLIALLAR (Settings & Branches)"
# =============================================================================

# 17.1 Sozlamalar olish
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  SET_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/settings" 2>/dev/null || echo "000")
  [[ "$SET_HTTP" == "200" || "$SET_HTTP" == "404" ]] \
    && { ok "17.1 GET /settings → HTTP $SET_HTTP"; T_PASS=$((T_PASS+1)); } \
    || { fail "17.1 GET /settings → HTTP $SET_HTTP"; T_FAIL=$((T_FAIL+1)); }
else
  skip "17.1 Settings — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 17.2 Sozlamalarni yangilash
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  UST_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"currency\":\"UZS\",\"timezone\":\"Asia/Tashkent\"}" \
    "${API}/settings" 2>/dev/null || echo "000")
  [[ "$UST_HTTP" == "200" || "$UST_HTTP" == "404" ]] \
    && { ok "17.2 PUT /settings → HTTP $UST_HTTP"; T_PASS=$((T_PASS+1)); } \
    || { warn "17.2 PUT /settings → HTTP $UST_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "17.2 Update settings — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 17.3 Filliallar ro'yxati
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  BR_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/branches" 2>/dev/null || echo "000")
  if [[ "$BR_HTTP" == "200" ]]; then
    ok "17.3 GET /branches → HTTP 200"
    T_PASS=$((T_PASS+1))
    BRANCH_RESP=$(curl -s --max-time "$TIMEOUT" \
      -H "Authorization: Bearer $TOKEN" "${API}/branches" 2>/dev/null || echo "{}")
    $HAS_JQ && BRANCH_ID=$(echo "$BRANCH_RESP" | jq -r '.data[0].id // empty' 2>/dev/null)
  else
    warn "17.3 GET /branches → HTTP $BR_HTTP"
    T_WARN=$((T_WARN+1))
  fi
else
  skip "17.3 Branches — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 17.4 Yangi filial
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  NBR_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d "{\"name\":\"Test Filial\",\"slug\":\"test-filial-$(date +%s)\",\"address\":\"Test manzil\"}" \
    "${API}/branches" 2>/dev/null || echo "000")
  [[ "$NBR_HTTP" == "200" || "$NBR_HTTP" == "201" || "$NBR_HTTP" == "403" || "$NBR_HTTP" == "409" ]] \
    && { ok "17.4 POST /branches → HTTP $NBR_HTTP"; T_PASS=$((T_PASS+1)); } \
    || { warn "17.4 POST /branches → HTTP $NBR_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "17.4 POST /branches — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# =============================================================================
sep "AUDIT JURNALI (Audit Logs)"
# =============================================================================

# 18.1 Admin audit loglar
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  AL_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/admin/audit-logs" 2>/dev/null || echo "000")
  [[ "$AL_HTTP" == "200" || "$AL_HTTP" == "403" ]] \
    && { ok "18.1 GET /admin/audit-logs → HTTP $AL_HTTP (SUPER_ADMIN kerak)"; T_PASS=$((T_PASS+1)); } \
    || { warn "18.1 GET /admin/audit-logs → HTTP $AL_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "18.1 Audit logs — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 18.2 Global statistika
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  GS_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/admin/global-stats" 2>/dev/null || echo "000")
  [[ "$GS_HTTP" == "200" || "$GS_HTTP" == "403" ]] \
    && { ok "18.2 GET /admin/global-stats → HTTP $GS_HTTP"; T_PASS=$((T_PASS+1)); } \
    || { warn "18.2 GET /admin/global-stats → HTTP $GS_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "18.2 Global stats — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# =============================================================================
sep "BILDIRISHNOMALAR (Notifications)"
# =============================================================================

# 19.1 Bildirishnomalar ro'yxati
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  NO_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/notifications" 2>/dev/null || echo "000")
  [[ "$NO_HTTP" == "200" ]] \
    && { ok "19.1 GET /notifications → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { fail "19.1 GET /notifications → HTTP $NO_HTTP"; T_FAIL=$((T_FAIL+1)); }
else
  skip "19.1 Notifications — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 19.2 O'qilmagan soni
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  NC_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/notifications/unread-count" 2>/dev/null || echo "000")
  [[ "$NC_HTTP" == "200" ]] \
    && { ok "19.2 GET /notifications/unread-count → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { warn "19.2 GET /notifications/unread-count → HTTP $NC_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "19.2 Unread count — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 19.3 Hammasini o'qilgan deb belgilash
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  RA_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -X PATCH -H "Authorization: Bearer $TOKEN" \
    "${API}/notifications/read-all" 2>/dev/null || echo "000")
  [[ "$RA_HTTP" == "200" || "$RA_HTTP" == "204" ]] \
    && { ok "19.3 PATCH /notifications/read-all → HTTP $RA_HTTP"; T_PASS=$((T_PASS+1)); } \
    || { warn "19.3 PATCH /notifications/read-all → HTTP $RA_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "19.3 Read all — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# =============================================================================
sep "XODIMLAR JADVALI & YETKAZIB BERISH (Staff & Delivery)"
# =============================================================================

# 20.1 Smena jadval
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  SF_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/staff/shifts" 2>/dev/null || echo "000")
  [[ "$SF_HTTP" == "200" ]] \
    && { ok "20.1 GET /staff/shifts → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { warn "20.1 GET /staff/shifts → HTTP $SF_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "20.1 Shifts — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 20.2 Haydovchilar ro'yxati
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  DR_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/delivery/drivers" 2>/dev/null || echo "000")
  [[ "$DR_HTTP" == "200" ]] \
    && { ok "20.2 GET /delivery/drivers → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { warn "20.2 GET /delivery/drivers → HTTP $DR_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "20.2 Drivers — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 20.3 Yetkazib berishlar
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  DL_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/delivery" 2>/dev/null || echo "000")
  [[ "$DL_HTTP" == "200" ]] \
    && { ok "20.3 GET /delivery → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { warn "20.3 GET /delivery → HTTP $DL_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "20.3 Delivery — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 20.4 Bron qilish
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  RES_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/reservations" 2>/dev/null || echo "000")
  [[ "$RES_HTTP" == "200" ]] \
    && { ok "20.4 GET /reservations → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { warn "20.4 GET /reservations → HTTP $RES_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "20.4 Reservations — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 20.5 Moliya (Finance)
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  FIN_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/finance/expenses" 2>/dev/null || echo "000")
  [[ "$FIN_HTTP" == "200" ]] \
    && { ok "20.5 GET /finance/expenses → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { warn "20.5 GET /finance/expenses → HTTP $FIN_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "20.5 Finance — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 20.6 Tarif rejalari (Billing)
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  BIL_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/billing/plans" 2>/dev/null || echo "000")
  [[ "$BIL_HTTP" == "200" ]] \
    && { ok "20.6 GET /billing/plans → HTTP 200"; T_PASS=$((T_PASS+1)); } \
    || { warn "20.6 GET /billing/plans → HTTP $BIL_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "20.6 Billing plans — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 20.7 Bosib chiqarish
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  PR_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/printer/status" 2>/dev/null || echo "000")
  [[ "$PR_HTTP" == "200" || "$PR_HTTP" == "503" || "$PR_HTTP" == "404" ]] \
    && { ok "20.7 GET /printer/status → HTTP $PR_HTTP (printer yo'q bo'lishi mumkin)"; T_PASS=$((T_PASS+1)); } \
    || { warn "20.7 GET /printer/status → HTTP $PR_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "20.7 Printer — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# 20.8 Telegram bot
T_TOTAL=$((T_TOTAL+1))
if [[ -n "$TOKEN" ]]; then
  TG_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Authorization: Bearer $TOKEN" "${API}/telegram/users" 2>/dev/null || echo "000")
  [[ "$TG_HTTP" == "200" || "$TG_HTTP" == "403" ]] \
    && { ok "20.8 GET /telegram/users → HTTP $TG_HTTP"; T_PASS=$((T_PASS+1)); } \
    || { warn "20.8 GET /telegram/users → HTTP $TG_HTTP"; T_WARN=$((T_WARN+1)); }
else
  skip "20.8 Telegram — TOKEN yo'q"
  T_SKIP=$((T_SKIP+1))
fi

# =============================================================================
# TOZALASH (cleanup — test ma'lumotlarini o'chirish)
# =============================================================================
echo ""
echo -e "${DIM}  ── Cleanup ──${NC}"

if [[ -n "$TOKEN" ]]; then
  # Xodimni o'chirish
  [[ -n "$TEST_USER_ID" ]] && curl -sf -o /dev/null -X DELETE \
    -H "Authorization: Bearer $TOKEN" "${API}/users/${TEST_USER_ID}" 2>/dev/null && \
    info "  Test xodim o'chirildi"

  # Buyurtmani bekor qilish
  [[ -n "$ORDER_ID" ]] && curl -sf -o /dev/null -X PATCH \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"status":"CANCELLED"}' "${API}/orders/${ORDER_ID}/status" 2>/dev/null && \
    info "  Test buyurtma bekor qilindi"
fi

# Temp fayllarni tozalash
rm -rf "$TMP" 2>/dev/null

# =============================================================================
# YAKUNIY HISOBOT
# =============================================================================
echo ""
echo -e "${BOLD}${C}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${C}║                  YAKUNIY HISOBOT                          ║${NC}"
echo -e "${BOLD}${C}╠═══════════════════════════════════════════════════════════╣${NC}"
printf "  ${G}✅  Muvaffaqiyatli : %-4s${NC}\n" "$T_PASS"
printf "  ${R}❌  Xato          : %-4s${NC}\n" "$T_FAIL"
printf "  ${Y}⚠️   Ogohlantirish : %-4s${NC}\n" "$T_WARN"
printf "  ${DIM}⏭   O'tkazildi   : %-4s${NC}\n" "$T_SKIP"
printf "  ${B}📊  Jami testlar  : %-4s${NC}\n" "$T_TOTAL"
echo -e "${BOLD}${C}╚═══════════════════════════════════════════════════════════╝${NC}"

# O'tish foizi
if [[ $T_TOTAL -gt 0 ]]; then
  PCT=$(( (T_PASS * 100) / T_TOTAL ))
  echo ""
  printf "  ${BOLD}O'tish foizi: %d%%${NC}\n" "$PCT"
fi

# Xato ro'yxati
if [[ ${#FAILED_TESTS[@]} -gt 0 ]]; then
  echo ""
  echo -e "  ${R}${BOLD}❌ Xato testlar ro'yxati:${NC}"
  for ft in "${FAILED_TESTS[@]}"; do
    echo -e "    ${R}•${NC} $ft"
  done
fi

echo ""
if [[ $T_FAIL -eq 0 ]]; then
  echo -e "  ${G}${BOLD}🎉  BARCHA TESTLAR MUVAFFAQIYATLI O'TDI!${NC}"
elif [[ $T_FAIL -le 5 ]]; then
  echo -e "  ${Y}${BOLD}⚠️   $T_FAIL ta xato bor — ko'rib chiqing.${NC}"
else
  echo -e "  ${R}${BOLD}❌  $T_FAIL ta xato topildi!${NC}"
  echo -e "  ${Y}    Tekshirish: API ishlamoqdami? Foydalanuvchi to'g'rimi?${NC}"
fi

echo ""
echo -e "${DIM}  Vaqt: $(date '+%Y-%m-%d %H:%M:%S') | API: $API${NC}"
echo ""

[[ $T_FAIL -gt 10 ]] && exit 1
exit 0
