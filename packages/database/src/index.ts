import { PrismaClient } from '@prisma/client';

// Global prisma instance (singleton pattern)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Export all types from Prisma Client
export * from '@prisma/client';

// Export prisma as default
export default prisma;
