# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# bcrypt native module uchun build tools
RUN apk add --no-cache python3 make g++ openssl

WORKDIR /app

# packages/database faqat file: reference uchun kerak (build shart emas)
# backend/tsconfig.json paths alias @oshxona/database → ./src/lib/prisma.ts
COPY packages/database/package.json packages/database/
COPY packages/database/prisma/       packages/database/prisma/
COPY packages/database/src/          packages/database/src/

# backend deps o'rnatish
# prisma generate uchun schema avval kerak!
COPY backend/package*.json backend/
COPY backend/prisma/       backend/prisma/
RUN cd backend && npm install

# Prisma client ni schema dan qayta generate qilish (turli versiyalar uchun)
RUN cd backend && npx prisma generate --schema=prisma/schema.prisma

# manba fayllarini ko'chirish
COPY backend/ backend/

# build (tsc + tsc-alias: @oshxona/database → relative import ga o'zgaradi)
RUN cd backend && npm run build

# ─── Stage 2: Production runner ───────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app/backend
ENV NODE_ENV=production

COPY --from=builder /app/backend/node_modules ./node_modules/
COPY --from=builder /app/backend/dist         ./dist/
COPY --from=builder /app/backend/prisma       ./prisma/
COPY --from=builder /app/backend/package.json ./

RUN mkdir -p uploads/products uploads/categories uploads/inventory

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --schema=prisma/schema.prisma --accept-data-loss && node dist/index.js"]
