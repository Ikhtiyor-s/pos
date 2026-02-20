// Integration Core — Redis ulanish konfiguratsiyasi
// BullMQ o'zining ichki ioredis ni ishlatadi

export const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null as null, // BullMQ talab qiladi
};
