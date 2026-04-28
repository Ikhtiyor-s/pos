#!/usr/bin/env bash
# =============================================================================
# check-build-env.sh — Build muhitini tekshirish
#
# ISHLATISH:
#   bash scripts/check-build-env.sh
#   bash scripts/check-build-env.sh --fix   # ba'zi muammolarni tuzatish
# =============================================================================

set +e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'
B='\033[0;34m'; C='\033[0;36m'; M='\033[0;35m'
BOLD='\033[1m'; NC='\033[0m'

PASS=0; FAIL=0; WARN=0
BLOCKERS=()

FIX_MODE=false
[[ "${1:-}" == "--fix" ]] && FIX_MODE=true

ok()   { echo -e "  ${G}OK${NC}  $*"; PASS=$((PASS+1)); }
fail() { echo -e "  ${R}XX${NC}  ${BOLD}$*${NC}"; FAIL=$((FAIL+1)); BLOCKERS+=("$*"); }
warn() { echo -e "  ${Y}!!${NC}  $*"; WARN=$((WARN+1)); }
info() { echo -e "  ${B}..${NC}  $*"; }
sep()  { echo -e "\n${BOLD}${C}=== $* ===${NC}"; }

ver() { command -v "$1" &>/dev/null && "$1" --version 2>&1 | head -1 || echo "NOT FOUND"; }

# =============================================================================
echo ""
echo -e "${BOLD}${M}============================================${NC}"
echo -e "${BOLD}${M}  BUILD MUHITI TEKSHIRUVI${NC}"
echo -e "${BOLD}${M}============================================${NC}"
echo ""

# =============================================================================
sep "NODE.JS VA NPM"
# =============================================================================

NODE_VER=$(node --version 2>/dev/null || echo "")
if [[ -n "$NODE_VER" ]]; then
  NODE_MAJOR=$(echo "$NODE_VER" | tr -d 'v' | cut -d. -f1)
  if [[ "$NODE_MAJOR" -ge 18 ]]; then
    ok "Node.js $NODE_VER (>= 18 kerak)"
  else
    fail "Node.js $NODE_VER — v18+ talab qilinadi"
  fi
else
  fail "Node.js topilmadi — https://nodejs.org yuklab oling"
fi

NPM_VER=$(npm --version 2>/dev/null || echo "")
[[ -n "$NPM_VER" ]] \
  && ok  "npm $NPM_VER" \
  || fail "npm topilmadi"

# pnpm yoki yarn ixtiyoriy
command -v pnpm &>/dev/null && ok  "pnpm $(pnpm --version 2>/dev/null) mavjud (ixtiyoriy)" \
                             || info "pnpm mavjud emas (ixtiyoriy)"

# =============================================================================
sep "ELECTRON BUILD"
# =============================================================================

# node_modules
for app in pos kitchen waiter; do
  NM="$ROOT/apps/${app}/node_modules"
  [[ -d "$NM" ]] \
    && ok  "apps/${app}/node_modules mavjud" \
    || {
      warn "apps/${app}/node_modules topilmadi"
      if $FIX_MODE; then
        info "  npm install ishlatilmoqda..."
        (cd "$ROOT/apps/${app}" && npm install --legacy-peer-deps 2>&1 | tail -2)
      fi
    }
done

# electron/main.cjs fayllar
for app in pos kitchen waiter; do
  MAIN="$ROOT/apps/${app}/electron/main.cjs"
  [[ -f "$MAIN" ]] \
    && ok  "apps/${app}/electron/main.cjs mavjud" \
    || fail "apps/${app}/electron/main.cjs YOQ — build ishlmaydi"
done

# electron-builder.json
for app in pos kitchen waiter; do
  CFG="$ROOT/apps/${app}/electron-builder.json"
  [[ -f "$CFG" ]] \
    && ok  "apps/${app}/electron-builder.json mavjud" \
    || warn "apps/${app}/electron-builder.json yoq — package.json config ishlatiladi"
done

# Ikonkalar
echo ""
info "Ikonkalar tekshirilmoqda:"
for app in pos kitchen waiter; do
  ICO_ICO="$ROOT/apps/${app}/public/icon.ico"
  ICO_PNG="$ROOT/apps/${app}/public/icon.png"
  ICO_FAV="$ROOT/apps/${app}/public/favicon.ico"

  if [[ -f "$ICO_ICO" ]]; then
    ok  "apps/${app}/public/icon.ico mavjud"
  elif [[ -f "$ICO_FAV" ]]; then
    warn "apps/${app}/public/favicon.ico bor, icon.ico yoq — favicon.ico ishlatiladi"
  elif [[ -f "$ICO_PNG" ]]; then
    warn "apps/${app}/public/icon.png bor, .ico emas — konversiya kerak"
  else
    warn "apps/${app}/public/icon.ico topilmadi — standart Electron icon ishlatiladi"
    if $FIX_MODE; then
      # PNG dan ICO yaratish (ImageMagick bo'lsa)
      if command -v convert &>/dev/null && [[ -f "$ROOT/assets/icon.png" ]]; then
        convert "$ROOT/assets/icon.png" -resize 256x256 "$ICO_ICO"
        ok "  icon.ico yaratildi (ImageMagick bilan)"
      fi
    fi
  fi
done

# =============================================================================
sep "FLUTTER (Android APK)"
# =============================================================================

FLUTTER_OK=false
FLUTTER_VER=$(flutter --version 2>/dev/null | head -1 || echo "")
if [[ -n "$FLUTTER_VER" ]]; then
  ok  "Flutter: $FLUTTER_VER"
  FLUTTER_OK=true
else
  warn "Flutter topilmadi — Android APK build ishlmaydi"
  info "  https://flutter.dev/docs/get-started/install"
fi

if $FLUTTER_OK; then
  # Java
  JAVA_VER=$(java -version 2>&1 | head -1 || echo "")
  [[ -n "$JAVA_VER" ]] \
    && ok  "Java: $JAVA_VER" \
    || warn "Java topilmadi (Flutter uchun kerak)"

  # Android SDK
  if [[ -n "${ANDROID_HOME:-}" ]] || [[ -n "${ANDROID_SDK_ROOT:-}" ]]; then
    SDK_PATH="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
    ok  "ANDROID_HOME: $SDK_PATH"

    # adb
    command -v adb &>/dev/null \
      && ok  "adb $(adb --version 2>/dev/null | head -1)" \
      || warn "adb topilmadi (\$ANDROID_HOME/platform-tools/ ga PATH sozlang)"

    # build-tools
    BT="$SDK_PATH/build-tools"
    [[ -d "$BT" ]] \
      && ok  "Android Build Tools: $(ls "$BT" | tail -1)" \
      || warn "Android Build Tools topilmadi"
  else
    warn "ANDROID_HOME yoki ANDROID_SDK_ROOT belgilanmagan"
    info "  Android Studio dan: Preferences > SDK Manager > SDK Tools"
  fi

  # Flutter apps
  for flapp in "flutter-pos" "waiter_flutter"; do
    FLDIR="$ROOT/apps/${flapp}"
    if [[ -d "$FLDIR" ]]; then
      PUBSPEC="$FLDIR/pubspec.yaml"
      [[ -f "$PUBSPEC" ]] \
        && ok  "apps/${flapp}/pubspec.yaml mavjud" \
        || fail "apps/${flapp}/pubspec.yaml topilmadi"

      ANDROID_DIR="$FLDIR/android"
      if [[ -d "$ANDROID_DIR" ]]; then
        ok  "apps/${flapp}/android/ mavjud"
        GRADLE="$ANDROID_DIR/app/build.gradle"
        GRADLE_KTS="$ANDROID_DIR/app/build.gradle.kts"
        [[ -f "$GRADLE" || -f "$GRADLE_KTS" ]] \
          && ok  "apps/${flapp}/android/app/build.gradle mavjud" \
          || fail "apps/${flapp}/android/app/build.gradle topilmadi"
      else
        warn "apps/${flapp}/android/ topilmadi"
        info "  flutter create --platforms=android . ishlatib qayta yarating"
      fi
    else
      warn "apps/${flapp}/ topilmadi"
    fi
  done

  # flutter doctor
  info "Flutter doctor tekshirilmoqda..."
  FLUTTER_DOC=$(flutter doctor --no-version-check 2>&1 | grep -E "^\[" | head -10)
  echo "$FLUTTER_DOC" | while IFS= read -r line; do
    if echo "$line" | grep -q "\[v\]"; then
      ok  "  $line"
    elif echo "$line" | grep -q "\[!\]"; then
      warn "  $line"
    elif echo "$line" | grep -q "\[x\]"; then
      fail "  $line"
    fi
  done
fi

# =============================================================================
sep "DISK JOYI"
# =============================================================================

# Build uchun kamida 5GB disk kerak
DISK_FREE=$(df -BG "$ROOT" 2>/dev/null | tail -1 | awk '{print $4}' | tr -d 'G')
if [[ -n "$DISK_FREE" ]]; then
  if [[ "$DISK_FREE" -ge 5 ]]; then
    ok  "Disk: ${DISK_FREE}GB bo'sh (5GB talab qilinadi)"
  else
    fail "Disk: ${DISK_FREE}GB bo'sh — 5GB+ talab qilinadi"
  fi
else
  warn "Disk joyini tekshirib bo'lmadi"
fi

# RAM
if command -v free &>/dev/null; then
  RAM_FREE_MB=$(free -m | awk '/^Mem:/{print $7}')
  [[ "$RAM_FREE_MB" -ge 2048 ]] \
    && ok  "RAM: ${RAM_FREE_MB}MB bo'sh" \
    || warn "RAM: ${RAM_FREE_MB}MB bo'sh — 2GB+ tavsiya qilinadi"
fi

# =============================================================================
sep "INTERNET VA TARMOQ"
# =============================================================================

if curl -sf --max-time 5 https://registry.npmjs.org/ -o /dev/null; then
  ok  "npm registry: bog'lanish bor"
else
  warn "npm registry: bog'lanib bo'lmadi — offline build imkonsiz bo'lishi mumkin"
fi

if $FLUTTER_OK; then
  if curl -sf --max-time 5 https://pub.dev/ -o /dev/null; then
    ok  "pub.dev: bog'lanish bor"
  else
    warn "pub.dev: bog'lanib bo'lmadi — flutter packages yuklanmasligi mumkin"
  fi
fi

# =============================================================================
sep "RELEASE PAPKALAR"
# =============================================================================

for dir in \
  "release/windows/pos" \
  "release/windows/kitchen" \
  "release/windows/waiter" \
  "release/android/pos" \
  "release/android/waiter"; do
  FULL="$ROOT/$dir"
  if [[ -d "$FULL" ]]; then
    ok  "release/${dir#release/}/ mavjud"
  else
    if $FIX_MODE; then
      mkdir -p "$FULL"
      ok  "$dir/ yaratildi"
    else
      info "$dir/ topilmadi — build paytida avtomatik yaratiladi"
    fi
  fi
done

# =============================================================================
# YAKUNIY NATIJA
# =============================================================================

echo ""
echo -e "${BOLD}${M}============================================${NC}"
echo -e "${BOLD}${M}  NATIJA${NC}"
echo -e "${BOLD}${M}============================================${NC}"
printf "  ${G}OK  O'tdi      : %-4s${NC}\n" "$PASS"
printf "  ${R}XX  Blocker    : %-4s${NC}\n" "$FAIL"
printf "  ${Y}!!  Ogohlantirish: %-4s${NC}\n" "$WARN"
echo ""

if [[ ${#BLOCKERS[@]} -gt 0 ]]; then
  echo -e "  ${R}${BOLD}BLOCKERLAR (tuzating):${NC}"
  for b in "${BLOCKERS[@]}"; do
    echo -e "    ${R}*${NC} $b"
  done
  echo ""
fi

if [[ $FAIL -eq 0 ]]; then
  echo -e "  ${G}${BOLD}Build muhiti tayyor! build-all.sh ishlatsa boladi.${NC}"
  echo -e "  ${G}  bash scripts/build-all.sh${NC}"
else
  echo -e "  ${R}${BOLD}${FAIL} ta blocker bor — birinchi tuzating.${NC}"
  echo -e "  ${Y}  bash scripts/check-build-env.sh --fix${NC}"
fi

echo ""
[[ $FAIL -gt 0 ]] && exit 1
exit 0
