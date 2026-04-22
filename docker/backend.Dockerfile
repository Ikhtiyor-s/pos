FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++ openssl
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/config/package.json     packages/config/
COPY packages/database/package.json   packages/database/
COPY packages/shared/package.json     packages/shared/
COPY packages/offline-sync/package.json packages/offline-sync/
COPY apps/api/package.json            apps/api/

RUN npm install --legacy-peer-deps

COPY packages/ packages/
COPY apps/api/ apps/api/

RUN cd packages/database && npx prisma generate
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

# migrate deploy — migrations papkasi bo'lsa ishlatadi (production)
# db push — birinchi deploy yoki migrations yo'q bo'lsa (data-destructive o'zgarishlarda to'xtaydi)
CMD ["sh", "-c", "\
  SCHEMA=../../packages/database/prisma/schema.prisma; \
  MIGRATIONS=../../packages/database/prisma/migrations; \
  if [ -d \"$MIGRATIONS\" ] && [ \"$(ls -A $MIGRATIONS 2>/dev/null)\" ]; then \
    echo '[DB] Running prisma migrate deploy...'; \
    npx prisma migrate deploy --schema=$SCHEMA; \
  else \
    echo '[DB] No migrations found — running prisma db push (safe mode)...'; \
    npx prisma db push --schema=$SCHEMA; \
  fi && node dist/index.js"]
