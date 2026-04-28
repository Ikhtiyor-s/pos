#!/usr/bin/env bash
# =============================================================================
# build-all.sh — Barcha platformalar uchun build
#
# ISHLATISH:
#   bash scripts/build-all.sh                    # hammasi
#   bash scripts/build-all.sh --windows          # faqat EXE
#   bash scripts/build-all.sh --android          # faqat APK
#   bash scripts/build-all.sh --app pos          # faqat bitta app
#   bash scripts/build-all.sh --skip-flutter     # Flutter skip
#
# NATIJA:
#   release/windows/pos/      → Oshxona-POS-Setup-*.exe
#   release/windows/kitchen/  → Oshxona-Kitchen-Setup-*.exe
#   release/windows/waiter/   → Oshxona-Waiter-Setup-*.exe
#   release/android/pos/      → oshxona-pos-release.apk
#   release/android/waiter/   → oshxona-waiter-release.apk
# =============================================================================

set +e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
RELEASE="$ROOT/release"
START_TIME=$(date +%s)

G='\033[0;32m'; R='\033[0;31m'; Y='\033[1;33m'
B='\033[0;34m'; C='\033[0;36m'; M='\033[0;35m'
BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

# ── Bayroqlar ──────────────────────────────────────────────────────────────────
BUILD_WIN=true
BUILD_AND=true
ONLY_APP=""

for arg in "$@"; do
  case "$arg" in
    --windows)       BUILD_AND=false ;;
    --android)       BUILD_WIN=false ;;
    --skip-flutter)  BUILD_AND=false ;;
    --app)           shift; ONLY_APP="$1" ;;
  esac
done

# ── Hisoblagichlar ─────────────────────────────────────────────────────────────
BUILD_OK=0; BUILD_FAIL=0
declare -a BUILT_FILES=()
declare -a FAILED_APPS=()

# ── Output ─────────────────────────────────────────────────────────────────────
ok()     { echo -e "  ${G}OK${NC}  $*";   BUILD_OK=$((BUILD_OK+1));   }
fail()   { echo -e "  ${R}XX${NC}  ${BOLD}$*${NC}"; BUILD_FAIL=$((BUILD_FAIL+1)); FAILED_APPS+=("$*"); }
warn()   { echo -e "  ${Y}!!${NC}  $*"; }
info()   { echo -e "  ${B}..${NC}  $*"; }
step()   { echo -e "\n${BOLD}${C}>>> $*${NC}"; }
divider(){ echo -e "${DIM}  ────────────────────────────────────────────${NC}"; }

elapsed() {
  local end; end=$(date +%s)
  echo $(( end - START_TIME ))s
}

# ── Release papkalar ───────────────────────────────────────────────────────────
mkdir -p "$RELEASE/windows/pos" \
         "$RELEASE/windows/kitchen" \
         "$RELEASE/windows/waiter" \
         "$RELEASE/android/pos" \
         "$RELEASE/android/waiter"

# =============================================================================
echo ""
echo -e "${BOLD}${M}======================================================${NC}"
echo -e "${BOLD}${M}  OSHXONA POS — TO'LIQ BUILD TIZIMI${NC}"
echo -e "${BOLD}${M}  Windows EXE + Android APK${NC}"
echo -e "${BOLD}${M}======================================================${NC}"
echo ""
info "Loyiha  : $ROOT"
info "Release : $RELEASE"
info "Vaqt    : $(date '+%Y-%m-%d %H:%M:%S')"
$BUILD_WIN && info "Windows : ha (EXE)" || info "Windows : o'tkazildi"
$BUILD_AND && info "Android : ha (APK)" || info "Android : o'tkazildi"
[[ -n "$ONLY_APP" ]] && info "Faqat   : $ONLY_APP"
echo ""

# =============================================================================
# ICON TAYYORLASH
# =============================================================================
step "ICON TAYYORLASH"

prepare_icon() {
  local app="$1"
  local pub="$ROOT/apps/${app}/public"

  mkdir -p "$pub"

  # icon.ico mavjudmi?
  if [[ -f "$pub/icon.ico" ]]; then
    ok  "apps/${app}: icon.ico mavjud"
    return
  fi

  # favicon.ico ni icon.ico ga ko'chirish
  if [[ -f "$pub/favicon.ico" ]]; then
    cp "$pub/favicon.ico" "$pub/icon.ico"
    ok  "apps/${app}: favicon.ico → icon.ico"
    return
  fi

  # Umumiy icon bormi?
  for src in \
    "$ROOT/assets/icon.ico" \
    "$ROOT/assets/icons/icon.ico" \
    "$ROOT/apps/pos/public/favicon.ico" \
    "$ROOT/apps/web/public/favicon.ico"; do
    if [[ -f "$src" ]]; then
      cp "$src" "$pub/icon.ico"
      ok  "apps/${app}: icon.ico ($src dan ko'chirildi)"
      return
    fi
  done

  # Minimal fallback — 1x1 shaffof ICO yaratish (Node.js bilan)
  warn "apps/${app}: icon.ico yo'q — standart Electron icon ishlatiladi"
}

for app in pos kitchen waiter; do
  [[ -n "$ONLY_APP" && "$ONLY_APP" != "$app" ]] && continue
  prepare_icon "$app"
done

# =============================================================================
# WINDOWS EXE BUILD
# =============================================================================

if $BUILD_WIN; then
  step "WINDOWS EXE BUILD"

  build_exe() {
    local app="$1"
    local label="$2"
    local setup_name="$3"

    echo ""
    divider
    echo -e "  ${BOLD}Building: ${C}${label}${NC} (apps/${app})"
    divider

    local app_dir="$ROOT/apps/${app}"

    # 1. Dependencies
    if [[ ! -d "$app_dir/node_modules" ]]; then
      info "npm install (apps/${app})..."
      (cd "$app_dir" && npm install --legacy-peer-deps 2>&1 | tail -3) || {
        fail "${label}: npm install xato"
        return 1
      }
    fi

    # 2. Vite build
    info "Vite build..."
    VITE_OUT=$(cd "$app_dir" && npm run build 2>&1)
    if [[ $? -ne 0 ]]; then
      fail "${label}: Vite build xato"
      echo "$VITE_OUT" | tail -10 | while read -r line; do info "  $line"; done
      return 1
    fi

    # 3. Electron builder
    info "Electron-builder (NSIS installer)..."
    local cfg=""
    [[ -f "$app_dir/electron-builder.json" ]] && cfg="--config electron-builder.json"

    EB_OUT=$(cd "$app_dir" && npx electron-builder --win $cfg 2>&1)
    if [[ $? -ne 0 ]]; then
      fail "${label}: electron-builder xato"
      echo "$EB_OUT" | grep -iE "error|warn" | tail -10 | while read -r line; do info "  $line"; done
      return 1
    fi

    # 4. Natijani topish va ko'chirish
    local out_dir="$RELEASE/windows/${app}"

    # electron-builder output topish
    local built_file
    built_file=$(find "$app_dir/release" -name "*.exe" -newer "$app_dir/package.json" 2>/dev/null | head -1)
    if [[ -z "$built_file" ]]; then
      built_file=$(find "$app_dir" -name "*Setup*.exe" -newer "$app_dir/package.json" 2>/dev/null | head -1)
    fi

    if [[ -n "$built_file" ]]; then
      TARGET="${out_dir}/${setup_name}.exe"
      cp "$built_file" "$TARGET"
      SIZE=$(du -sh "$TARGET" 2>/dev/null | cut -f1)
      ok  "${label}: ${setup_name}.exe (${SIZE})"
      BUILT_FILES+=("$TARGET")
    else
      # electron-builder.json da output path bor
      built_file=$(find "$out_dir" -name "*.exe" 2>/dev/null | head -1)
      if [[ -n "$built_file" ]]; then
        SIZE=$(du -sh "$built_file" 2>/dev/null | cut -f1)
        ok  "${label}: $(basename "$built_file") (${SIZE})"
        BUILT_FILES+=("$built_file")
      else
        warn "${label}: .exe topilmadi — release/ papkasini tekshiring"
        warn "  electron-builder.json da output: ../../release/windows/${app}"
      fi
    fi
  }

  if [[ -z "$ONLY_APP" || "$ONLY_APP" == "pos" ]]; then
    build_exe "pos"     "POS Kassa"        "Oshxona-POS-Setup"
  fi
  if [[ -z "$ONLY_APP" || "$ONLY_APP" == "kitchen" ]]; then
    build_exe "kitchen" "Oshxona Kitchen"  "Oshxona-Kitchen-Setup"
  fi
  if [[ -z "$ONLY_APP" || "$ONLY_APP" == "waiter" ]]; then
    build_exe "waiter"  "Ofitsiant Waiter" "Oshxona-Waiter-Setup"
  fi
fi

# =============================================================================
# ANDROID APK BUILD
# =============================================================================

if $BUILD_AND; then
  step "ANDROID APK BUILD"

  build_apk() {
    local flapp="$1"
    local label="$2"
    local out_dir="$3"
    local apk_name="$4"

    echo ""
    divider
    echo -e "  ${BOLD}Building: ${C}${label}${NC} (apps/${flapp})"
    divider

    local app_dir="$ROOT/apps/${flapp}"

    if [[ ! -d "$app_dir" ]]; then
      warn "${label}: apps/${flapp}/ topilmadi — o'tkazildi"
      return 0
    fi

    if ! command -v flutter &>/dev/null; then
      warn "${label}: Flutter topilmadi — APK build o'tkazildi"
      warn "  https://flutter.dev/docs/get-started/install"
      return 0
    fi

    if [[ ! -d "$app_dir/android" ]]; then
      warn "${label}: android/ papkasi topilmadi"
      info "  flutter create --platforms=android . bilan yarating"
      return 0
    fi

    # Flutter pub get
    info "flutter pub get..."
    PUB_OUT=$(cd "$app_dir" && flutter pub get 2>&1)
    if [[ $? -ne 0 ]]; then
      fail "${label}: flutter pub get xato"
      echo "$PUB_OUT" | tail -5 | while read -r line; do info "  $line"; done
      return 1
    fi

    # Build APK
    info "flutter build apk --release..."
    APK_OUT=$(cd "$app_dir" && flutter build apk --release 2>&1)
    if [[ $? -ne 0 ]]; then
      fail "${label}: flutter build apk xato"
      echo "$APK_OUT" | grep -iE "error|failure" | tail -10 | while read -r line; do info "  $line"; done
      return 1
    fi

    # APK ni topish va ko'chirish
    local apk_src="$app_dir/build/app/outputs/flutter-apk/app-release.apk"
    if [[ ! -f "$apk_src" ]]; then
      apk_src=$(find "$app_dir/build" -name "*release*.apk" 2>/dev/null | head -1)
    fi

    if [[ -n "$apk_src" && -f "$apk_src" ]]; then
      mkdir -p "$out_dir"
      TARGET="${out_dir}/${apk_name}"
      cp "$apk_src" "$TARGET"
      SIZE=$(du -sh "$TARGET" 2>/dev/null | cut -f1)
      ok  "${label}: ${apk_name} (${SIZE})"
      BUILT_FILES+=("$TARGET")
    else
      fail "${label}: APK fayli topilmadi"
      return 1
    fi
  }

  if [[ -z "$ONLY_APP" || "$ONLY_APP" == "pos" ]]; then
    build_apk "flutter-pos"   "POS Kassa (Flutter)"  "$RELEASE/android/pos"    "oshxona-pos-release.apk"
  fi
  if [[ -z "$ONLY_APP" || "$ONLY_APP" == "waiter" ]]; then
    build_apk "waiter_flutter" "Waiter (Flutter)"    "$RELEASE/android/waiter" "oshxona-waiter-release.apk"
  fi
fi

# =============================================================================
# NATIJA
# =============================================================================

ELAPSED=$(elapsed)
echo ""
echo -e "${BOLD}${M}======================================================${NC}"
echo -e "${BOLD}${M}  BUILD NATIJASI${NC}"
echo -e "${BOLD}${M}======================================================${NC}"
echo ""

if [[ ${#BUILT_FILES[@]} -gt 0 ]]; then
  echo -e "  ${G}${BOLD}Yaratilgan fayllar:${NC}"
  for f in "${BUILT_FILES[@]}"; do
    SIZE=$(du -sh "$f" 2>/dev/null | cut -f1)
    RELPATH="${f#$ROOT/}"
    echo -e "    ${G}*${NC} $RELPATH  (${SIZE})"
  done
fi

if [[ ${#FAILED_APPS[@]} -gt 0 ]]; then
  echo ""
  echo -e "  ${R}${BOLD}Muvaffaqiyatsiz:${NC}"
  for f in "${FAILED_APPS[@]}"; do
    echo -e "    ${R}*${NC} $f"
  done
fi

echo ""
printf "  ${G}OK${NC}  Muvaffaqiyatli : %-3s\n" "$BUILD_OK"
printf "  ${R}XX${NC}  Xato          : %-3s\n" "$BUILD_FAIL"
printf "  ${B}..${NC}  Vaqt          : %s\n"   "$ELAPSED"
echo ""

if [[ $BUILD_FAIL -eq 0 ]]; then
  echo -e "  ${G}${BOLD}Barcha buildlar muvaffaqiyatli!${NC}"
  echo -e "  ${G}  release/ papkasini tekshiring${NC}"
else
  echo -e "  ${R}${BOLD}${BUILD_FAIL} ta build xato bilan tugadi.${NC}"
  echo -e "  ${Y}  Loglarni yuqorida tekshiring${NC}"
fi

echo ""
# Release papka tuzilmasini ko'rsatish
echo -e "  ${BOLD}release/ tuzilmasi:${NC}"
find "$RELEASE" -name "*.exe" -o -name "*.apk" 2>/dev/null | sort | while read -r f; do
  SIZE=$(du -sh "$f" 2>/dev/null | cut -f1)
  RELPATH="${f#$ROOT/}"
  echo -e "    ${C}${RELPATH}${NC}  (${SIZE})"
done | head -20

echo ""
[[ $BUILD_FAIL -gt 0 ]] && exit 1
exit 0
