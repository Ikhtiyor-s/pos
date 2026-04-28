// Markirovka xizmati — O'zbekiston majburiy raqamli markirovka tizimi integratsiyasi
// Davlat serveri: https://api.markirovka.uz (placeholder — kerakli URL bilan almashtiring)

import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { prisma, MarkirovkaStatus, MarkirovkaAction } from '@oshxona/database';
import { logger } from '../utils/logger.js';
import { redis } from '../config/redis.js';
import { AppError, ErrorCode } from '../middleware/errorHandler.js';
import { randomUUID } from 'crypto';

// ==========================================
// KONSTANTALAR
// ==========================================

const BASE_URL     = process.env.MARKIROVKA_API_URL ?? 'https://api.markirovka.uz';
const API_KEY      = process.env.MARKIROVKA_API_KEY ?? '';
const TIMEOUT_MS   = 10_000;
const MAX_RETRIES  = 3;
const RETRY_DELAYS = [1_000, 3_000, 7_000] as const;
const QUEUE_KEY    = 'markirovka:offline:queue';
const QUEUE_MAX    = 2_000;

// ==========================================
// TIPLAR
// ==========================================

export interface VerifyResult {
  valid: boolean;
  gtin: string;
  serialNumber: string;
  productName?: string;
  expiryDate?: string;
  manufacturerName?: string;
  status: string;
  raw: unknown;
}

export interface ReceiveOptions {
  markCode: string;
  batchNumber: string;
  importerTin: string;
  tenantId: string;
  productId: string;
  supplierId?: string;
  invoiceNumber?: string;
  expiryDate?: Date;
}

export interface SaleReportOptions {
  markCode: string;
  orderId: string;
  price: number;
  receiptNumber: string;
  tenantId: string;
  soldByUserId: string;
}

export interface CheckBeforeSellResult {
  valid: boolean;
  reason?: string;
  product?: {
    id: string;
    gtin: string;
    serialNumber: string;
    batchNumber: string | null;
    expiryDate: Date | null;
    status: MarkirovkaStatus;
  };
}

export interface BatchReceiveResult {
  markCode: string;
  success: boolean;
  error?: string;
}

export interface DailyReport {
  date: string;
  received: number;
  verified: number;
  sold: number;
  failed: number;
  queued: number;
  byStatus: Partial<Record<MarkirovkaStatus, number>>;
  topGtins: Array<{ gtin: string; count: number }>;
}

export interface TraceResult {
  product: Awaited<ReturnType<typeof prisma.markirovkaProduct.findFirst>>;
  logs: Awaited<ReturnType<typeof prisma.markirovkaLog.findMany>>;
  timeline: Array<{ action: string; status: string; at: Date }>;
}

interface OfflineJob {
  id: string;
  action: 'VERIFY' | 'RECEIVE' | 'SELL';
  markCode: string;
  tenantId: string;
  payload: Record<string, unknown>;
  attempts: number;
  createdAt: string;
}

interface ApiVerifyResponse {
  success: boolean;
  data?: {
    gtin: string;
    serial: string;
    product_name?: string;
    expiry_date?: string;
    manufacturer_name?: string;
    status: string;
  };
  error?: string;
}

interface ApiSaleResponse {
  success: boolean;
  transaction_id?: string;
  error?: string;
}

// ==========================================
// AXIOS KLIENT
// ==========================================

let _client: AxiosInstance | null = null;

function getClient(): AxiosInstance {
  if (_client) return _client;

  _client = axios.create({
    baseURL: BASE_URL,
    timeout: TIMEOUT_MS,
    headers: {
      'Content-Type': 'application/json',
      ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
    },
  });

  _client.interceptors.response.use(
    (res) => res,
    (err: AxiosError) => {
      logger.error('Markirovka API xatosi', {
        url:     err.config?.url,
        method:  err.config?.method,
        status:  err.response?.status,
        body:    err.response?.data,
        message: err.message,
      });
      return Promise.reject(err);
    },
  );

  return _client;
}

// ==========================================
// ICHKI YORDAMCHI FUNKSIYALAR
// ==========================================

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callWithRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isNetwork     = axios.isAxiosError(err) && !err.response;
      const isTimeout     = axios.isAxiosError(err) && err.code === 'ECONNABORTED';
      const isServerError = axios.isAxiosError(err) && (err.response?.status ?? 0) >= 500;

      if (!isNetwork && !isTimeout && !isServerError) throw err;

      if (attempt < retries - 1) {
        const delay = RETRY_DELAYS[attempt] ?? 7_000;
        logger.warn('Markirovka API — qayta urinish', { attempt: attempt + 1, maxRetries: retries, delayMs: delay });
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

async function saveLog(
  tenantId: string,
  markCode: string,
  action: MarkirovkaAction,
  request: unknown,
  response: unknown,
  status: 'SUCCESS' | 'FAILED' | 'QUEUED',
): Promise<void> {
  try {
    await prisma.markirovkaLog.create({
      data: {
        tenantId,
        markCode,
        action,
        request:  request  ? (request  as object) : undefined,
        response: response ? (response as object) : undefined,
        status,
      },
    });
  } catch (err) {
    logger.error('MarkirovkaLog yozishda xato', { markCode, action, error: (err as Error).message });
  }
}

function isOfflineError(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  return (
    !err.response              ||
    err.code === 'ECONNABORTED' ||
    err.code === 'ENOTFOUND'   ||
    err.code === 'ECONNREFUSED'
  );
}

// ==========================================
// OFFLINE QUEUE (Redis LIST)
// ==========================================

async function pushToOfflineQueue(job: Omit<OfflineJob, 'id' | 'attempts' | 'createdAt'>): Promise<void> {
  const item: OfflineJob = { id: randomUUID(), attempts: 0, createdAt: new Date().toISOString(), ...job };

  const queueLen = await redis.llen(QUEUE_KEY);
  if (queueLen >= QUEUE_MAX) {
    await redis.rpop(QUEUE_KEY);
    logger.warn('Markirovka offline queue to\'la, eski element olib tashlanmoqda', { queueLen });
  }

  await redis.lpush(QUEUE_KEY, JSON.stringify(item));
  logger.info('Markirovka offline queue ga qo\'shildi', { jobId: item.id, action: item.action, markCode: item.markCode });
}

// ==========================================
// XIZMAT SINFI
// ==========================================

export class MarkirovkaService {

  // ──────────────────────────────────────────
  // 1. KODNI DAVLAT SERVERIDA TEKSHIRISH
  // ──────────────────────────────────────────

  static async verifyCode(markCode: string, tenantId: string): Promise<VerifyResult> {
    const reqBody = { code: markCode };
    let apiResponse: ApiVerifyResponse | null = null;

    try {
      const { data } = await callWithRetry(() =>
        getClient().post<ApiVerifyResponse>('/api/v1/verify', reqBody),
      );
      apiResponse = data;
    } catch (err) {
      if (isOfflineError(err)) {
        await pushToOfflineQueue({ action: 'VERIFY', markCode, tenantId, payload: { code: markCode } });
        await saveLog(tenantId, markCode, MarkirovkaAction.VERIFY, reqBody, null, 'QUEUED');
        logger.warn('Markirovka: tarmoq yo\'q, verify queue ga qo\'shildi', { markCode });
        return { valid: false, gtin: '', serialNumber: '', status: 'QUEUED', raw: null };
      }
      await saveLog(tenantId, markCode, MarkirovkaAction.VERIFY, reqBody, { error: (err as Error).message }, 'FAILED');
      throw err;
    }

    const isValid = apiResponse.success && !!apiResponse.data;
    await saveLog(tenantId, markCode, MarkirovkaAction.VERIFY, reqBody, apiResponse, isValid ? 'SUCCESS' : 'FAILED');

    if (isValid) {
      await prisma.markirovkaProduct.updateMany({
        where: { markCode, tenantId },
        data:  { verifiedAt: new Date() },
      });
    }

    return {
      valid:            isValid,
      gtin:             apiResponse.data?.gtin ?? '',
      serialNumber:     apiResponse.data?.serial ?? '',
      productName:      apiResponse.data?.product_name,
      expiryDate:       apiResponse.data?.expiry_date,
      manufacturerName: apiResponse.data?.manufacturer_name,
      status:           apiResponse.data?.status ?? 'UNKNOWN',
      raw:              apiResponse,
    };
  }

  // ──────────────────────────────────────────
  // 2. MAHSULOTNI QABUL QILISH
  // ──────────────────────────────────────────

  static async receiveProduct(options: ReceiveOptions): Promise<void> {
    const { markCode, batchNumber, importerTin, tenantId, productId, supplierId, invoiceNumber, expiryDate } = options;

    const existing = await prisma.markirovkaProduct.findUnique({ where: { markCode } });
    if (existing) throw new Error(`Markirovka kodi allaqachon mavjud: ${markCode}`);

    let gtin = '', serialNumber = '';
    let apiResponse: unknown = null;

    try {
      const verify = await MarkirovkaService.verifyCode(markCode, tenantId);
      if (!verify.valid && verify.status !== 'QUEUED') {
        throw new Error(`Markirovka kodi noto'g'ri yoki davlat serverida topilmadi: ${markCode}`);
      }
      gtin         = verify.gtin;
      serialNumber = verify.serialNumber;
      apiResponse  = verify.raw;
    } catch (err) {
      if (!(err instanceof Error && err.message.includes('queue'))) {
        await saveLog(tenantId, markCode, MarkirovkaAction.RECEIVE, options, { error: (err as Error).message }, 'FAILED');
        throw err;
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.markirovkaProduct.create({
        data: {
          tenantId,
          productId,
          markCode,
          gtin:         gtin         || markCode.slice(0, 14),
          serialNumber: serialNumber || markCode.slice(14),
          batchNumber,
          expiryDate,
          status:       MarkirovkaStatus.IN_STOCK,
          importedAt:   new Date(),
          importerTin,
        },
      });

      const existingBatch = await tx.markirovkaBatch.findUnique({
        where: { batchNumber_tenantId: { batchNumber, tenantId } },
      });

      if (existingBatch) {
        await tx.markirovkaBatch.update({
          where: { batchNumber_tenantId: { batchNumber, tenantId } },
          data:  { quantity: { increment: 1 } },
        });
      } else {
        await tx.markirovkaBatch.create({
          data: { tenantId, batchNumber, productId, quantity: 1, receivedAt: new Date(), expiryDate, supplierId, invoiceNumber },
        });
      }
    });

    await saveLog(tenantId, markCode, MarkirovkaAction.RECEIVE, options, apiResponse, 'SUCCESS');
    logger.info('Markirovka: mahsulot qabul qilindi', { markCode, batchNumber, tenantId });
  }

  // ──────────────────────────────────────────
  // 3. PARTIYAVIY QABUL QILISH
  // ──────────────────────────────────────────

  static async batchReceive(items: ReceiveOptions[]): Promise<BatchReceiveResult[]> {
    const results: BatchReceiveResult[] = [];

    for (const item of items) {
      try {
        await MarkirovkaService.receiveProduct(item);
        results.push({ markCode: item.markCode, success: true });
      } catch (err) {
        results.push({ markCode: item.markCode, success: false, error: (err as Error).message });
        logger.warn('Markirovka batchReceive: bitta element xato', {
          markCode: item.markCode,
          error:    (err as Error).message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    logger.info('Markirovka batchReceive yakunlandi', {
      total:   items.length,
      success: successCount,
      failed:  items.length - successCount,
    });

    return results;
  }

  // ──────────────────────────────────────────
  // 4. SOTILGANLIGINI XABAR QILISH
  // ──────────────────────────────────────────

  static async reportSale(options: SaleReportOptions): Promise<void> {
    const { markCode, orderId, price, receiptNumber, tenantId, soldByUserId } = options;

    const product = await prisma.markirovkaProduct.findUnique({ where: { markCode } });
    if (!product)                                        throw new Error(`Markirovka kodi bazada topilmadi: ${markCode}`);
    if (product.tenantId !== tenantId)                   throw new Error('Ruxsat yo\'q: bu markirovka kodi boshqa tenant uchun');
    if (product.status === MarkirovkaStatus.SOLD)        throw new Error(`Markirovka kodi allaqachon sotilgan: ${markCode}`);
    if (product.status === MarkirovkaStatus.EXPIRED)     throw new Error(`Markirovka kodi muddati o'tgan: ${markCode}`);

    const reqBody = { code: markCode, order_id: orderId, price, receipt_number: receiptNumber, sold_at: new Date().toISOString() };
    let apiResponse: ApiSaleResponse | null = null;

    try {
      const { data } = await callWithRetry(() =>
        getClient().post<ApiSaleResponse>('/api/v1/sale', reqBody),
      );
      apiResponse = data;
      if (!data.success) throw new Error(`Davlat serveri sotuv xabarini qabul qilmadi: ${data.error ?? 'nomalum xato'}`);
    } catch (err) {
      if (isOfflineError(err)) {
        await pushToOfflineQueue({
          action: 'SELL',
          markCode,
          tenantId,
          payload: { ...reqBody, soldByUserId } as Record<string, unknown>,
        });
        await saveLog(tenantId, markCode, MarkirovkaAction.SELL, reqBody, null, 'QUEUED');
        logger.warn('Markirovka: tarmoq yo\'q, sotuv queue ga qo\'shildi', { markCode });
      } else {
        await saveLog(tenantId, markCode, MarkirovkaAction.SELL, reqBody, { error: (err as Error).message }, 'FAILED');
        throw err;
      }
    }

    await prisma.markirovkaProduct.update({
      where: { markCode },
      data:  { status: MarkirovkaStatus.SOLD, soldAt: new Date(), soldBy: soldByUserId, orderId },
    });

    await saveLog(tenantId, markCode, MarkirovkaAction.SELL, reqBody, apiResponse, 'SUCCESS');
    logger.info('Markirovka: sotuv qayd etildi', { markCode, orderId, tenantId });
  }

  // ──────────────────────────────────────────
  // 5. SOTISHDAN OLDIN TEKSHIRISH
  // ──────────────────────────────────────────

  static async checkBeforeSell(markCode: string, tenantId: string): Promise<CheckBeforeSellResult> {
    const product = await prisma.markirovkaProduct.findUnique({ where: { markCode } });

    if (!product)                                    return { valid: false, reason: 'Markirovka kodi bazada topilmadi' };
    if (product.tenantId !== tenantId)               return { valid: false, reason: 'Bu markirovka kodi ushbu restoran uchun emas' };
    if (product.status === MarkirovkaStatus.SOLD)    return { valid: false, reason: 'Mahsulot allaqachon sotilgan',    product: product as CheckBeforeSellResult['product'] };
    if (product.status === MarkirovkaStatus.EXPIRED) return { valid: false, reason: 'Mahsulot muddati o\'tgan',        product: product as CheckBeforeSellResult['product'] };
    if (product.status === MarkirovkaStatus.RESERVED)return { valid: false, reason: 'Mahsulot boshqa buyurtma uchun band', product: product as CheckBeforeSellResult['product'] };

    if (product.status !== MarkirovkaStatus.IN_STOCK) {
      return { valid: false, reason: `Mahsulot holati mos emas: ${product.status}`, product: product as CheckBeforeSellResult['product'] };
    }

    if (product.expiryDate && product.expiryDate < new Date()) {
      await prisma.markirovkaProduct.update({ where: { markCode }, data: { status: MarkirovkaStatus.EXPIRED } });
      return { valid: false, reason: 'Mahsulot muddati o\'tib ketgan (bazada yangilandi)', product: product as CheckBeforeSellResult['product'] };
    }

    try {
      const verify = await MarkirovkaService.verifyCode(markCode, tenantId);
      if (!verify.valid && verify.status !== 'QUEUED') {
        return { valid: false, reason: 'Davlat serveri kodni tasdiqlamadi', product: product as CheckBeforeSellResult['product'] };
      }
    } catch {
      logger.warn('Markirovka checkBeforeSell: verify API muammosi, local ma\'lumotdan foydalanilmoqda', { markCode });
    }

    return { valid: true, product: product as CheckBeforeSellResult['product'] };
  }

  // ──────────────────────────────────────────
  // 6. MUDDATI O'TGANLAR
  // ──────────────────────────────────────────

  static async getExpiredProducts(tenantId: string) {
    const now = new Date();

    await prisma.markirovkaProduct.updateMany({
      where: {
        tenantId,
        status:    { in: [MarkirovkaStatus.IN_STOCK, MarkirovkaStatus.MANUFACTURED, MarkirovkaStatus.IMPORTED] },
        expiryDate: { lt: now, not: null },
      },
      data: { status: MarkirovkaStatus.EXPIRED },
    });

    return prisma.markirovkaProduct.findMany({
      where:   { tenantId, status: MarkirovkaStatus.EXPIRED },
      include: { product: { select: { id: true, name: true, sku: true } } },
      orderBy: { expiryDate: 'asc' },
    });
  }

  // ──────────────────────────────────────────
  // 7. KUNLIK HISOBOT
  // ──────────────────────────────────────────

  static async getDailyReport(tenantId: string, dateStr?: string): Promise<DailyReport> {
    const base = dateStr ? new Date(dateStr) : new Date();
    const dayStart = new Date(base); dayStart.setHours(0,  0,  0,   0);
    const dayEnd   = new Date(base); dayEnd.setHours(23, 59, 59, 999);

    const logWhere = (action: MarkirovkaAction | null, logStatus: string) => ({
      tenantId,
      ...(action ? { action } : {}),
      status:    logStatus,
      createdAt: { gte: dayStart, lte: dayEnd },
    });

    const [received, verified, sold, failed, queued, byStatus, soldToday] = await Promise.all([
      prisma.markirovkaLog.count({ where: logWhere(MarkirovkaAction.RECEIVE, 'SUCCESS') }),
      prisma.markirovkaLog.count({ where: logWhere(MarkirovkaAction.VERIFY,  'SUCCESS') }),
      prisma.markirovkaLog.count({ where: logWhere(MarkirovkaAction.SELL,    'SUCCESS') }),
      prisma.markirovkaLog.count({ where: { tenantId, status: 'FAILED',  createdAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.markirovkaLog.count({ where: { tenantId, status: 'QUEUED',  createdAt: { gte: dayStart, lte: dayEnd } } }),
      prisma.markirovkaProduct.groupBy({
        by:     ['status'],
        where:  { tenantId },
        _count: { _all: true },
      }),
      prisma.markirovkaProduct.findMany({
        where:  { tenantId, status: MarkirovkaStatus.SOLD, soldAt: { gte: dayStart, lte: dayEnd } },
        select: { gtin: true },
      }),
    ]);

    const gtinCounts = soldToday.reduce<Record<string, number>>((acc, p) => {
      acc[p.gtin] = (acc[p.gtin] ?? 0) + 1;
      return acc;
    }, {});

    const topGtins = Object.entries(gtinCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([gtin, count]) => ({ gtin, count }));

    return {
      date:      base.toISOString().split('T')[0]!,
      received,
      verified,
      sold,
      failed,
      queued,
      byStatus:  Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
      topGtins,
    };
  }

  // ──────────────────────────────────────────
  // 8. SERIAL RAQAM BO'YICHA KUZATISH
  // ──────────────────────────────────────────

  static async traceBySerial(serialNumber: string, tenantId: string): Promise<TraceResult> {
    const product = await prisma.markirovkaProduct.findFirst({
      where: {
        OR:       [{ serialNumber }, { markCode: serialNumber }],
        tenantId,
      },
      include: {
        product: { select: { id: true, name: true, sku: true, barcode: true, image: true } },
      },
    });

    if (!product) {
      throw new AppError(`Serial raqam topilmadi: ${serialNumber}`, 404, ErrorCode.NOT_FOUND);
    }

    const logs = await prisma.markirovkaLog.findMany({
      where:   { markCode: product.markCode, tenantId },
      orderBy: { createdAt: 'asc' },
    });

    const timeline = logs.map((l) => ({ action: l.action, status: l.status, at: l.createdAt }));

    return { product, logs, timeline };
  }

  // ──────────────────────────────────────────
  // 9. OFFLINE QUEUE NI QAYTA ISHLASH
  // ──────────────────────────────────────────

  static async processOfflineQueue(): Promise<{ processed: number; failed: number }> {
    let processed = 0, failed = 0;

    const queueLen = await redis.llen(QUEUE_KEY);
    if (queueLen === 0) return { processed, failed };

    logger.info('Markirovka offline queue ishlanmoqda', { queueLen });

    for (let i = 0; i < queueLen; i++) {
      const raw = await redis.rpop(QUEUE_KEY);
      if (!raw) break;

      let job: OfflineJob;
      try {
        job = JSON.parse(raw) as OfflineJob;
      } catch {
        logger.error('Markirovka queue: JSON parse xatosi', { raw });
        failed++;
        continue;
      }

      if (job.attempts >= MAX_RETRIES) {
        await saveLog(job.tenantId, job.markCode, job.action as MarkirovkaAction, job.payload, null, 'FAILED');
        logger.warn('Markirovka queue: max retry oshdi, tashlandi', { jobId: job.id, action: job.action });
        failed++;
        continue;
      }

      try {
        const p = job.payload as Record<string, unknown>;

        if (job.action === 'VERIFY') {
          await MarkirovkaService.verifyCode(job.markCode, job.tenantId);
        } else if (job.action === 'SELL') {
          await MarkirovkaService.reportSale({
            markCode:      job.markCode,
            orderId:       p.order_id     as string,
            price:         p.price        as number,
            receiptNumber: p.receipt_number as string,
            tenantId:      job.tenantId,
            soldByUserId:  p.soldByUserId as string,
          });
        } else if (job.action === 'RECEIVE') {
          await MarkirovkaService.receiveProduct({
            markCode:      job.markCode,
            batchNumber:   p.batchNumber   as string,
            importerTin:   p.importerTin   as string,
            tenantId:      job.tenantId,
            productId:     p.productId     as string,
            supplierId:    p.supplierId    as string | undefined,
            invoiceNumber: p.invoiceNumber as string | undefined,
            expiryDate:    p.expiryDate    ? new Date(p.expiryDate as string) : undefined,
          });
        }

        processed++;
        logger.info('Markirovka queue: muvaffaqiyatli', { jobId: job.id, action: job.action });
      } catch (err) {
        job.attempts++;
        if (job.attempts < MAX_RETRIES) {
          await redis.lpush(QUEUE_KEY, JSON.stringify(job));
          logger.warn('Markirovka queue: qayta navbatga', { jobId: job.id, attempts: job.attempts, error: (err as Error).message });
        } else {
          await saveLog(job.tenantId, job.markCode, job.action as MarkirovkaAction, job.payload, { error: (err as Error).message }, 'FAILED');
          logger.error('Markirovka queue: max retry, tashlandi', { jobId: job.id });
        }
        failed++;
      }
    }

    logger.info('Markirovka offline queue yakunlandi', { processed, failed });
    return { processed, failed };
  }

  // ──────────────────────────────────────────
  // 10. STATISTIKA
  // ──────────────────────────────────────────

  static async getStats(tenantId: string) {
    const [byStatus, offlineQueueLen, recentLogs] = await Promise.all([
      prisma.markirovkaProduct.groupBy({
        by:     ['status'],
        where:  { tenantId },
        _count: { _all: true },
      }),
      redis.llen(QUEUE_KEY),
      prisma.markirovkaLog.findMany({
        where:   { tenantId },
        orderBy: { createdAt: 'desc' },
        take:    10,
        select:  { markCode: true, action: true, status: true, createdAt: true },
      }),
    ]);

    return {
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])) as Record<MarkirovkaStatus, number>,
      offlineQueueLen,
      recentLogs,
    };
  }
}
