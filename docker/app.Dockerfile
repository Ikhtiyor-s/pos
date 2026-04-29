ARG APP_NAME=pos
FROM node:20-alpine AS builder
WORKDIR /app

ARG APP_NAME
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Workspace package.json lar (dependency resolution uchun)
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

COPY packages/shared/    packages/shared/
COPY packages/config/    packages/config/
COPY apps/${APP_NAME}/   apps/${APP_NAME}/

# Windows'da compile qilingan vite.config.js Docker'da path error beradi — o'chirib yuboramiz
RUN rm -f apps/${APP_NAME}/vite.config.js \
          apps/${APP_NAME}/vite.config.d.ts \
          apps/${APP_NAME}/tsconfig.tsbuildinfo \
          apps/${APP_NAME}/tsconfig.node.tsbuildinfo

# Vite build — existing frontend.Dockerfile bilan bir xil yondashuv
RUN cd apps/${APP_NAME} && npx vite build

FROM nginx:alpine
ARG APP_NAME
COPY --from=builder /app/apps/${APP_NAME}/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
