#!/bin/sh
set -e

SCHEMA="../../packages/database/prisma/schema.prisma"
MIGRATIONS="../../packages/database/prisma/migrations"

echo "======================================"
echo "  Oshxona POS API — ishga tushirish"
echo "======================================"

# 1. Migrate
echo "[DB] Migration tekshirilmoqda..."
if [ -d "$MIGRATIONS" ] && [ "$(ls -A $MIGRATIONS 2>/dev/null)" ]; then
  echo "[DB] prisma migrate deploy..."
  npx prisma migrate deploy --schema=$SCHEMA
else
  echo "[DB] prisma db push..."
  npx prisma db push --schema=$SCHEMA --accept-data-loss
fi

# 2. Seed (faqat birinchi marta — User jadvali bo'sh bo'lsa)
echo "[DB] Seed tekshirilmoqda..."
USER_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count().then(n => { console.log(n); p.\$disconnect(); }).catch(() => { console.log(0); p.\$disconnect(); });
" 2>/dev/null || echo "0")

if [ "$USER_COUNT" = "0" ]; then
  echo "[DB] Seed ishga tushirilmoqda (birinchi marta)..."
  cd ../../packages/database && npx ts-node prisma/seed.ts && cd ../../apps/api
  echo "[DB] Seed yakunlandi ✓"
else
  echo "[DB] Ma'lumotlar mavjud ($USER_COUNT ta user) — seed o'tkazib yuborildi"
fi

# 3. Start
echo "[API] Ishga tushirilmoqda..."
exec node dist/index.js
