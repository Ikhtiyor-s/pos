# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Root workspace manifest (npm workspaces uchun)
COPY package.json package-lock.json ./

# Barcha workspace package.json larini ko'chirish (npm workspaces uchun kerak)
COPY packages/shared/package.json       packages/shared/
COPY packages/config/package.json       packages/config/
COPY packages/database/package.json     packages/database/
COPY packages/offline-sync/package.json packages/offline-sync/
COPY apps/pos/package.json              apps/pos/
COPY apps/kitchen/package.json          apps/kitchen/
COPY apps/waiter/package.json           apps/waiter/
COPY apps/web/package.json              apps/web/
COPY apps/qr-menu/package.json          apps/qr-menu/

# Workspace bog'liqliklarini o'rnatish
RUN npm install --legacy-peer-deps

# Manba fayllarini ko'chirish
COPY packages/shared/   packages/shared/
COPY packages/config/   packages/config/
COPY apps/pos/          apps/pos/

# apps/pos ni build qilish (vite build — tsc type check o'tkazib yuboriladi)
# VITE_API_URL va VITE_TENANT_ID — apps/pos/.env dan avtomatik olinadi
RUN cd apps/pos && npx vite build

# ─── Stage 2: Nginx ───────────────────────────────────────────────────────────
FROM nginx:alpine AS runner

COPY --from=builder /app/apps/pos/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
