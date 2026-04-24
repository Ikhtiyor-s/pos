#!/usr/bin/env bash
# =============================================================================
# setup-github-secrets.sh
# GitHub repository secretlarini gh CLI orqali o'rnatish
#
# Talab: gh CLI o'rnatilgan va autentifikatsiya qilingan bo'lishi shart
#   brew install gh  |  winget install GitHub.cli
#   gh auth login
#
# Ishlatish:
#   chmod +x scripts/setup-github-secrets.sh
#   ./scripts/setup-github-secrets.sh
# =============================================================================
set -euo pipefail

REPO="${1:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"

echo "Repository: $REPO"
echo ""

# ──────────────────────────────────────────────────────────────────────────────
# Helper funksiya
set_secret() {
  local name="$1"
  local value="$2"
  if [ -z "$value" ]; then
    echo "⚠️  $name bo'sh, o'tkazib yuborildi"
    return
  fi
  echo "$value" | gh secret set "$name" --repo "$REPO"
  echo "✅ $name o'rnatildi"
}

prompt_secret() {
  local name="$1"
  local hint="${2:-}"
  local value
  echo -n "🔑 $name${hint:+ ($hint)}: "
  read -rs value
  echo ""
  set_secret "$name" "$value"
}

prompt_var() {
  local name="$1"
  local hint="${2:-}"
  local value
  echo -n "📌 $name${hint:+ ($hint)}: "
  read -r value
  echo "$value" | gh variable set "$name" --repo "$REPO"
  echo "✅ Variable: $name"
}

# ============================================================
echo "=== SERVER (SSH) ==="
prompt_secret "SSH_HOST"        "server IP yoki hostname, masalan: 192.168.1.100"
prompt_secret "SSH_USER"        "server SSH user, masalan: deploy"
echo ""
echo "SSH private key fayl yo'lini kiriting:"
echo -n "  SSH key fayl: "
read -r SSH_KEY_FILE
if [ -f "$SSH_KEY_FILE" ]; then
  gh secret set "SSH_PRIVATE_KEY" --repo "$REPO" < "$SSH_KEY_FILE"
  echo "✅ SSH_PRIVATE_KEY o'rnatildi"
else
  echo "⚠️  Fayl topilmadi: $SSH_KEY_FILE"
fi
prompt_secret "SSH_PORT"        "SSH port (default: 22)"

# ============================================================
echo ""
echo "=== DEPLOY KONFIGURATSIYA ==="
prompt_var   "DEPLOY_PATH"       "server da docker-compose.prod.yml joylashgan papka"
prompt_secret "APP_URL"          "Asosiy URL, masalan: https://pos.example.com"
prompt_secret "HEALTH_CHECK_URL" "Health check URL, masalan: https://api.example.com"

# ============================================================
echo ""
echo "=== DATABASE ==="
prompt_secret "POSTGRES_USER"     "postgres user"
prompt_secret "POSTGRES_PASSWORD" "postgres parol"
prompt_secret "POSTGRES_DB"       "postgres DB nomi"

# ============================================================
echo ""
echo "=== APPLICATION SECRETS ==="
prompt_secret "JWT_SECRET"         "JWT secret (kamida 32 belgi)"
prompt_secret "JWT_REFRESH_SECRET" "JWT refresh secret (kamida 32 belgi)"

# ============================================================
echo ""
echo "=== FRONTEND ==="
prompt_secret "VITE_TENANT_ID" "Default tenant UUID"

# ============================================================
echo ""
echo "=== NOTIFICATIONS (ixtiyoriy) ==="
prompt_secret "TELEGRAM_BOT_TOKEN" "Telegram bot token (ixtiyoriy)"
prompt_secret "TELEGRAM_CHAT_ID"   "Telegram chat ID (ixtiyoriy)"
prompt_secret "SLACK_WEBHOOK_URL"  "Slack webhook URL (ixtiyoriy)"

# ============================================================
echo ""
echo "🎉 Barcha secretlar o'rnatildi!"
echo ""
echo "Tekshirish:"
echo "  gh secret list --repo $REPO"
echo ""
echo "GitHub Environment 'production' yaratish (agar kerak bo'lsa):"
echo "  gh api repos/$REPO/environments/production -X PUT"
