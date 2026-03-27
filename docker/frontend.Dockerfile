FROM node:20-alpine AS builder
WORKDIR /app

ARG VITE_API_URL=/api
ARG VITE_TENANT_ID
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_TENANT_ID=$VITE_TENANT_ID

# Faqat kerakli workspace package.json lar
COPY package.json package-lock.json ./
COPY packages/shared/package.json     packages/shared/
COPY packages/config/package.json     packages/config/
COPY packages/database/package.json   packages/database/
COPY packages/offline-sync/package.json packages/offline-sync/
COPY apps/pos/package.json            apps/pos/
COPY apps/kitchen/package.json        apps/kitchen/
COPY apps/waiter/package.json         apps/waiter/
COPY apps/web/package.json            apps/web/
COPY apps/qr-menu/package.json        apps/qr-menu/

RUN npm install --legacy-peer-deps

COPY packages/shared/ packages/shared/
COPY packages/config/ packages/config/
COPY apps/pos/        apps/pos/

RUN cd apps/pos && npx vite build

# ─── Nginx ────────────────────────────────────────────────────────────────────
FROM nginx:alpine3.21
COPY --from=builder /app/apps/pos/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
