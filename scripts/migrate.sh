#!/bin/sh
# ==========================================
# Prisma Migration Script
# Birinchi marta: ./scripts/migrate.sh init
# Yangi migration: ./scripts/migrate.sh add_column_name
# ==========================================

set -e

SCHEMA="packages/database/prisma/schema.prisma"
NAME=${1:-"migration"}

if [ "$NAME" = "init" ]; then
  echo "🚀 Boshlang'ich migration yaratilmoqda..."
  npx prisma migrate dev --name init --schema=$SCHEMA
elif [ "$NAME" = "deploy" ]; then
  echo "🚀 Production migration ishlatilmoqda..."
  npx prisma migrate deploy --schema=$SCHEMA
else
  echo "🔄 Yangi migration: $NAME"
  npx prisma migrate dev --name "$NAME" --schema=$SCHEMA
fi

echo "✅ Migration yakunlandi"
