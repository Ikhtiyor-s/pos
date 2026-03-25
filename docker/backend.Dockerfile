FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++ openssl
WORKDIR /app

# Workspace manifest larini ko'chirish
COPY package.json package-lock.json ./
COPY packages/config/package.json     packages/config/
COPY packages/database/package.json   packages/database/
COPY packages/shared/package.json     packages/shared/
COPY packages/offline-sync/package.json packages/offline-sync/
COPY apps/api/package.json            apps/api/

# Workspace install (faqat api va uning bog'liqliklari)
RUN npm install --legacy-peer-deps

# Manba fayllarini ko'chirish
COPY packages/ packages/
COPY apps/api/ apps/api/

# Prisma client generatsiya
RUN cd packages/database && npx prisma generate

# Backend build
RUN cd apps/api && npm run build

# ─── Runner ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/packages       packages/
COPY --from=builder /app/apps/api/dist  apps/api/dist/
COPY --from=builder /app/node_modules   node_modules/
COPY --from=builder /app/apps/api/package.json apps/api/

RUN mkdir -p apps/api/uploads/products apps/api/uploads/categories apps/api/uploads/inventory

WORKDIR /app/apps/api
EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --schema=../../packages/database/prisma/schema.prisma --accept-data-loss && node dist/index.js"]
