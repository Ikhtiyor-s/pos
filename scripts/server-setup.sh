#!/usr/bin/env bash
# =============================================================================
# server-setup.sh — Server birinchi marta sozlash
# Ubuntu 22.04/24.04 uchun
#
# Ishlatish (server root):
#   curl -sSL https://raw.githubusercontent.com/OWNER/oshxona-pos/main/scripts/server-setup.sh | bash
# =============================================================================
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/oshxona-pos}"
REPO_URL="${REPO_URL:-https://github.com/OWNER/oshxona-pos.git}"

log()  { echo "[$(date '+%H:%M:%S')] $*"; }
ok()   { echo "[$(date '+%H:%M:%S')] ✅ $*"; }

# ──────────────────────────────────────────────────────────────────────────────
log "1/7 — Tizim yangilash"
apt-get update -qq && apt-get upgrade -y -qq

# ──────────────────────────────────────────────────────────────────────────────
log "2/7 — Docker o'rnatish"
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
  ok "Docker o'rnatildi"
else
  ok "Docker allaqachon o'rnatilgan: $(docker --version)"
fi

# ──────────────────────────────────────────────────────────────────────────────
log "3/7 — Deploy user yaratish"
if ! id "$DEPLOY_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$DEPLOY_USER"
  usermod -aG docker "$DEPLOY_USER"
  ok "User '$DEPLOY_USER' yaratildi"
else
  usermod -aG docker "$DEPLOY_USER"
  ok "User '$DEPLOY_USER' allaqachon mavjud"
fi

# ──────────────────────────────────────────────────────────────────────────────
log "4/7 — SSH key o'rnatish"
DEPLOY_HOME=$(getent passwd "$DEPLOY_USER" | cut -d: -f6)
mkdir -p "$DEPLOY_HOME/.ssh"
chmod 700 "$DEPLOY_HOME/.ssh"

if [ ! -f "$DEPLOY_HOME/.ssh/authorized_keys" ]; then
  touch "$DEPLOY_HOME/.ssh/authorized_keys"
fi
chmod 600 "$DEPLOY_HOME/.ssh/authorized_keys"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_HOME/.ssh"

echo ""
echo "⚠️  GitHub Actions SSH public key ni authorized_keys ga qo'shing:"
echo "   $DEPLOY_HOME/.ssh/authorized_keys"
echo ""

# ──────────────────────────────────────────────────────────────────────────────
log "5/7 — Deploy papka yaratish"
mkdir -p "$DEPLOY_PATH"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_PATH"

# ──────────────────────────────────────────────────────────────────────────────
log "6/7 — docker-compose.prod.yml va .env fayllar"
cat > "$DEPLOY_PATH/SETUP_INSTRUCTIONS.txt" << 'EOF'
=== QILISH KERAK NARSALAR ===

1. .env faylini yarating:
   nano /opt/oshxona-pos/.env

   .env namunasi:
   ─────────────────────────────────────
   POSTGRES_USER=oshxona
   POSTGRES_PASSWORD=STRONG_PASSWORD_HERE
   POSTGRES_DB=oshxona_pos
   DATABASE_URL=postgresql://oshxona:STRONG_PASSWORD_HERE@postgres:5432/oshxona_pos
   REDIS_URL=redis://redis:6379
   JWT_SECRET=STRONG_JWT_SECRET_MIN_32_CHARS
   JWT_REFRESH_SECRET=STRONG_REFRESH_SECRET_MIN_32
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   CLIENT_URL=https://pos.yourdomain.com
   NODE_ENV=production
   PORT=3000
   BACKEND_IMAGE=ghcr.io/OWNER/oshxona-pos/backend
   FRONTEND_IMAGE=ghcr.io/OWNER/oshxona-pos/frontend
   HEALTH_CHECK_URL=http://localhost:3000
   ─────────────────────────────────────

2. docker-compose.prod.yml ni sozlang:
   GitHub Actions CI/CD bu faylni git repoda o'qiydi.
   BACKEND_IMAGE va FRONTEND_IMAGE ni to'g'ri repo URL bilan almashtiring.

3. SSH key ni ulang:
   GitHub Settings → Deploy Keys → Public keyni qo'shing
   YOKI
   GitHub Secrets → SSH_PRIVATE_KEY ga private keyni qo'shing
EOF

chown "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_PATH/SETUP_INSTRUCTIONS.txt"

# ──────────────────────────────────────────────────────────────────────────────
log "7/7 — Firewall (ufw)"
if command -v ufw &>/dev/null; then
  ufw allow 22/tcp    # SSH
  ufw allow 80/tcp    # HTTP
  ufw allow 443/tcp   # HTTPS
  ufw --force enable
  ok "ufw sozlandi"
fi

# ──────────────────────────────────────────────────────────────────────────────
echo ""
ok "Server setup yakunlandi!"
echo ""
echo "=== KEYINGI QADAMLAR ==="
echo "1. cat $DEPLOY_PATH/SETUP_INSTRUCTIONS.txt"
echo "2. .env faylini sozlang"
echo "3. sudo -u $DEPLOY_USER bash"
echo "4. mkdir -p ~/.ssh && nano ~/.ssh/authorized_keys"
echo "   (GitHub Actions SSH public key qo'shing)"
echo ""
echo "Deploy path: $DEPLOY_PATH"
echo "Deploy user: $DEPLOY_USER"
