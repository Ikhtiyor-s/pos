// Markirovka kunlik hisobot cron — O'zbekiston majburiy raqamli markirovka
// Har kuni 23:30 da ishlaydi, muvaffaqiyatsiz bo'lsa 09:00 da qayta yuboradi

import cron from 'node-cron';
import axios from 'axios';
import { prisma, MarkirovkaAction } from '@oshxona/database';
import { logger } from '../utils/logger.js';
import { redis } from '../config/redis.js';

// ==========================================
// KONSTANTALAR
// ==========================================

const BASE_URL         = process.env.MARKIROVKA_API_URL ?? 'https://api.markirovka.uz';
const API_KEY          = process.env.MARKIROVKA_API_KEY ?? '';
const API_TIMEOUT_MS   = 15_000;

// Cron jadval
const DAILY_CRON       = '30 23 * * *';   // Har kuni 23:30
const RETRY_CRON       = '0  9  * * *';   // Har kuni 09:00 (qayta urinish)

// Redis kalitlari
const RETRY_SET_KEY      = 'markirovka:report:retry:set';      // Sorted Set (score = nextRetryAt)
const RETRY_PAYLOAD_PFX  = 'markirovka:report:retry:payload:'; // String (JSON)
const RETRY_TTL_SEC      = 48 * 3600;                          // 48 soat
const MAX_RETRY          = 3;
const RETRY_BACKOFF_MS   = [5 * 60_000, 30 * 60_000, 2 * 3600_000]; // 5d, 30d, 2s

// ==========================================
// TIPLAR
// ==========================================

interface ReportItem {
  markCode:      string;
  soldAt:        Date;
  receiptNumber: string;
  price:         number;
}

interface DailyReportPayload {
  tenantId:    string;
  sellerTin:   string;
  date:        string;       // YYYY-MM-DD
  generatedAt: string;       // ISO 8601
  totalSold:   number;
  items:       ReportItem[];
}

interface RetryEntry {
  tenantId:  string;
  date:      string;
  attempts:  number;
  lastError: string;
}

// ==========================================
// XML GENERATOR (O'zbekiston standarti)
// ==========================================

function escapeXml(value: string | number): string {
  return String(value)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&apos;');
}

function buildXml(payload: DailyReportPayload): string {
  const itemsXml = payload.items
    .map((item) => `
    <Item>
      <MarkCode>${escapeXml(item.markCode)}</MarkCode>
      <SoldAt>${escapeXml(item.soldAt.toISOString())}</SoldAt>
      <ReceiptNumber>${escapeXml(item.receiptNumber)}</ReceiptNumber>
      <Price>${escapeXml(item.price.toFixed(2))}</Price>
    </Item>`)
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<SaleReport xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Header>
    <Date>${escapeXml(payload.date)}</Date>
    <SellerTin>${escapeXml(payload.sellerTin)}</SellerTin>
    <TotalSold>${escapeXml(payload.totalSold)}</TotalSold>
    <GeneratedAt>${escapeXml(payload.generatedAt)}</GeneratedAt>
  </Header>
  <Items>${itemsXml}
  </Items>
</SaleReport>`.trim();
}

// ==========================================
// MA'LUMOT YIGOR
// ==========================================

async function collectReportData(
  tenantId: string,
  dayStart: Date,
  dayEnd:   Date,
): Promise<ReportItem[]> {
  // Kun davomida SOLD holatiga o'tgan barcha mahsulotlar
  const soldProducts = await prisma.markirovkaProduct.findMany({
    where: {
      tenantId,
      status:  'SOLD',
      soldAt:  { gte: dayStart, lte: dayEnd },
    },
  });

  if (soldProducts.length === 0) return [];

  // Order raqamlarini olish (receiptNumber uchun)
  const orderIds = [...new Set(soldProducts.filter((p) => p.orderId).map((p) => p.orderId!))];

  // Sotuv loglarini olish (price va receipt_number uchun)
  const [orders, sellLogs] = await Promise.all([
    orderIds.length > 0
      ? prisma.order.findMany({
          where:  { id: { in: orderIds }, tenantId },
          select: { id: true, orderNumber: true, total: true },
        })
      : Promise.resolve([]),

    prisma.markirovkaLog.findMany({
      where: {
        tenantId,
        action:   MarkirovkaAction.SELL,
        status:   'SUCCESS',
        markCode: { in: soldProducts.map((p) => p.markCode) },
      },
    }),
  ]);

  type OrderRow = { id: string; orderNumber: string; total: import('@prisma/client/runtime/library').Decimal };
  const orderMap = new Map<string, OrderRow>(orders.map((o) => [o.id, o] as [string, OrderRow]));
  const logMap   = new Map(sellLogs.map((l) => [l.markCode, l] as const));

  return soldProducts.map((p) => {
    const order   = p.orderId ? orderMap.get(p.orderId) : undefined;
    const log     = logMap.get(p.markCode);
    const reqData = log?.request as { price?: number; receipt_number?: string } | null | undefined;

    return {
      markCode:      p.markCode,
      soldAt:        p.soldAt ?? new Date(),
      receiptNumber: reqData?.receipt_number ?? order?.orderNumber ?? 'N/A',
      price:         reqData?.price          ?? Number(order?.total ?? 0),
    };
  });
}

// ==========================================
// DAVLAT SERVERIGA YUBORISH
// ==========================================

async function sendToGovernment(
  xml:      string,
  tenantId: string,
  dateStr:  string,
): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  try {
    const { data } = await axios.post<{ success: boolean; transaction_id?: string; error?: string }>(
      `${BASE_URL}/api/v1/report/daily`,
      xml,
      {
        timeout: API_TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/xml; charset=UTF-8',
          'X-Report-Date': dateStr,
          ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
        },
      },
    );

    if (!data.success) {
      return { success: false, error: data.error ?? 'Davlat serveri xato qaytardi' };
    }

    return { success: true, transactionId: data.transaction_id };
  } catch (err) {
    const isNetwork = axios.isAxiosError(err) && (!err.response || err.code === 'ECONNABORTED');
    const message   = axios.isAxiosError(err)
      ? (err.response?.data as { error?: string })?.error ?? err.message
      : (err as Error).message;

    return { success: false, error: isNetwork ? `NETWORK_ERROR: ${message}` : message };
  }
}

// ==========================================
// HISOBOT JURNALINI SAQLASH
// ==========================================

async function saveReportLog(
  tenantId:    string,
  dateStr:     string,
  request:     object,
  response:    object,
  logStatus:   'SUCCESS' | 'FAILED' | 'QUEUED',
): Promise<void> {
  try {
    await prisma.markirovkaLog.create({
      data: {
        tenantId,
        markCode: `daily-report:${dateStr}`,  // Kunlik hisobot uchun maxsus format
        action:   MarkirovkaAction.REPORT,
        request,
        response,
        status:   logStatus,
      },
    });
  } catch (err) {
    logger.error('[MarkirovkaCron] Jurnal yozishda xato', { tenantId, dateStr, error: (err as Error).message });
  }
}

// ==========================================
// RETRY QUEUE (Redis Sorted Set)
// ==========================================

async function enqueueForRetry(
  tenantId:  string,
  dateStr:   string,
  error:     string,
  attempts:  number,
): Promise<void> {
  const id          = `${tenantId}:${dateStr}`;
  const delay       = RETRY_BACKOFF_MS[attempts] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1]!;
  const nextRetryAt = Date.now() + delay;

  const entry: RetryEntry = { tenantId, date: dateStr, attempts, lastError: error };

  await Promise.all([
    redis.zadd(RETRY_SET_KEY, nextRetryAt, id),
    redis.setex(`${RETRY_PAYLOAD_PFX}${id}`, RETRY_TTL_SEC, JSON.stringify(entry)),
  ]);

  logger.warn('[MarkirovkaCron] Hisobot retry queue ga qo\'shildi', {
    tenantId,
    dateStr,
    attempts,
    nextRetryAt: new Date(nextRetryAt).toISOString(),
    delay: `${(delay / 60_000).toFixed(0)} daqiqa`,
  });
}

async function removeFromRetryQueue(tenantId: string, dateStr: string): Promise<void> {
  const id = `${tenantId}:${dateStr}`;
  await Promise.all([
    redis.zrem(RETRY_SET_KEY,                         id),
    redis.del(`${RETRY_PAYLOAD_PFX}${id}`),
  ]);
}

// ==========================================
// ASOSIY HISOBOT MANTIQ
// ==========================================

async function runDailyReport(tenantId: string, targetDate?: Date): Promise<void> {
  const reportDate = targetDate ?? new Date();
  const dateStr    = reportDate.toISOString().split('T')[0]!;

  const dayStart = new Date(reportDate); dayStart.setHours(0,  0,  0,   0);
  const dayEnd   = new Date(reportDate); dayEnd.setHours(23, 59, 59, 999);

  // Tenant sozlamalarini olish
  const settings = await prisma.settings.findUnique({ where: { tenantId } });
  if (!settings) {
    logger.warn('[MarkirovkaCron] Tenant sozlamalari topilmadi, o\'tkazib yuborildi', { tenantId });
    return;
  }

  // Sotuvchi STIR — settings'da maxsus maydon bo'lguncha env o'zgaruvchisidan olinadi
  // TODO: settings modeliga markirovkaSellerTin maydoni qo'shilgandan keyin shu yerda ishlatish
  const sellerTin = process.env.MARKIROVKA_SELLER_TIN ?? String(settings.nonborSellerId ?? '');
  if (!sellerTin) {
    logger.warn('[MarkirovkaCron] Sotuvchi STIR topilmadi, o\'tkazib yuborildi', { tenantId });
    return;
  }

  // Ma'lumot yig'ish
  const items = await collectReportData(tenantId, dayStart, dayEnd);

  if (items.length === 0) {
    logger.info('[MarkirovkaCron] Kun davomida sotuv yo\'q', { tenantId, dateStr });
    await saveReportLog(tenantId, dateStr, { date: dateStr, sellerTin }, { totalSold: 0 }, 'SUCCESS');
    return;
  }

  // Hisobot tuzish
  const payload: DailyReportPayload = {
    tenantId,
    sellerTin,
    date:        dateStr,
    generatedAt: new Date().toISOString(),
    totalSold:   items.length,
    items,
  };

  const xml = buildXml(payload);

  logger.info('[MarkirovkaCron] Hisobot yuborilmoqda', { tenantId, dateStr, totalSold: items.length });

  // Davlat serveriga yuborish
  const result = await sendToGovernment(xml, tenantId, dateStr);

  const requestSummary = { date: dateStr, sellerTin, totalSold: items.length };
  const responseSummary = { ...result, sentAt: new Date().toISOString() };

  if (result.success) {
    await saveReportLog(tenantId, dateStr, requestSummary, responseSummary, 'SUCCESS');
    await removeFromRetryQueue(tenantId, dateStr);  // Agar retry bo'lsa, o'chirish
    logger.info('[MarkirovkaCron] Hisobot muvaffaqiyatli yuborildi', {
      tenantId,
      dateStr,
      totalSold:     items.length,
      transactionId: result.transactionId,
    });
  } else {
    logger.error('[MarkirovkaCron] Hisobot yuborishda xato', {
      tenantId,
      dateStr,
      error: result.error,
    });
    await saveReportLog(tenantId, dateStr, requestSummary, responseSummary, 'FAILED');
    await enqueueForRetry(tenantId, dateStr, result.error ?? 'Nomalum xato', 0);
  }
}

// ==========================================
// RETRY QUEUE ISHLOV BERUVCHI (09:00)
// ==========================================

async function processRetryQueue(): Promise<void> {
  const now    = Date.now();
  const dueIds = await redis.zrangebyscore(RETRY_SET_KEY, 0, now, 'LIMIT', 0, 50);

  if (dueIds.length === 0) return;

  logger.info('[MarkirovkaCron] Retry queue ishlanmoqda', { count: dueIds.length });

  for (const id of dueIds) {
    const raw = await redis.get(`${RETRY_PAYLOAD_PFX}${id}`);
    if (!raw) {
      await redis.zrem(RETRY_SET_KEY, id);
      continue;
    }

    let entry: RetryEntry;
    try {
      entry = JSON.parse(raw) as RetryEntry;
    } catch {
      logger.error('[MarkirovkaCron] Retry payload parse xatosi', { id });
      await redis.zrem(RETRY_SET_KEY, id);
      continue;
    }

    if (entry.attempts >= MAX_RETRY) {
      logger.error('[MarkirovkaCron] Maksimal urinish soni oshdi, hisobot o\'tkazib yuborildi', {
        tenantId:  entry.tenantId,
        date:      entry.date,
        lastError: entry.lastError,
      });
      await saveReportLog(
        entry.tenantId,
        entry.date,
        { retryExhausted: true, attempts: entry.attempts },
        { error: entry.lastError },
        'FAILED',
      );
      await removeFromRetryQueue(entry.tenantId, entry.date);
      continue;
    }

    // Qayta urinish — o'tgan kunga tegishli sanani o'tkazish
    const reportDate = new Date(entry.date + 'T00:00:00.000Z');

    try {
      await runDailyReport(entry.tenantId, reportDate);
      logger.info('[MarkirovkaCron] Retry muvaffaqiyatli', {
        tenantId: entry.tenantId,
        date:     entry.date,
        attempt:  entry.attempts + 1,
      });
    } catch (err) {
      const nextAttempts = entry.attempts + 1;
      const errorMsg     = (err as Error).message;

      logger.warn('[MarkirovkaCron] Retry xatosi', {
        tenantId: entry.tenantId,
        date:     entry.date,
        attempt:  nextAttempts,
        error:    errorMsg,
      });

      if (nextAttempts < MAX_RETRY) {
        await enqueueForRetry(entry.tenantId, entry.date, errorMsg, nextAttempts);
      } else {
        await saveReportLog(
          entry.tenantId,
          entry.date,
          { retryExhausted: true, attempts: nextAttempts },
          { error: errorMsg },
          'FAILED',
        );
        await removeFromRetryQueue(entry.tenantId, entry.date);
        logger.error('[MarkirovkaCron] Barcha urinishlar tugadi, hisobot yo\'qotildi', {
          tenantId: entry.tenantId,
          date:     entry.date,
        });
      }
    }
  }
}

// ==========================================
// CRON JADVALLAR
// ==========================================

function startDailyReportCron(): void {
  // Har kuni 23:30 — barcha active tenantlar uchun hisobot
  cron.schedule(DAILY_CRON, async () => {
    logger.info('[MarkirovkaCron] Kunlik hisobot cron boshlandi');

    let tenants: { id: string }[] = [];
    try {
      tenants = await prisma.tenant.findMany({
        where:  { isActive: true },
        select: { id: true },
      });
    } catch (err) {
      logger.error('[MarkirovkaCron] Tenantlarni olishda xato', { error: (err as Error).message });
      return;
    }

    logger.info('[MarkirovkaCron] Hisobot ishlovi boshlandi', { tenantCount: tenants.length });

    let success = 0, failed = 0, skipped = 0;

    for (const tenant of tenants) {
      try {
        await runDailyReport(tenant.id);
        success++;
      } catch (err) {
        failed++;
        logger.error('[MarkirovkaCron] Tenant hisobot xatosi', {
          tenantId: tenant.id,
          error:    (err as Error).message,
        });
        // Kutilmagan xato uchun ham retry queue ga qo'shish
        const dateStr = new Date().toISOString().split('T')[0]!;
        await enqueueForRetry(tenant.id, dateStr, (err as Error).message, 0).catch(() => {});
      }
    }

    logger.info('[MarkirovkaCron] Kunlik hisobot yakunlandi', {
      total:   tenants.length,
      success,
      failed,
      skipped,
    });
  }, { timezone: 'Asia/Tashkent' });

  logger.info('[MarkirovkaCron] Kunlik hisobot cron ishga tushdi (har kuni 23:30 Toshkent vaqti)');
}

function startRetryCron(): void {
  // Har kuni 09:00 — kechagi muvaffaqiyatsiz hisobotlarni qayta yuborish
  cron.schedule(RETRY_CRON, async () => {
    logger.info('[MarkirovkaCron] Retry cron boshlandi');
    try {
      await processRetryQueue();
    } catch (err) {
      logger.error('[MarkirovkaCron] Retry cron xatosi', { error: (err as Error).message });
    }
  }, { timezone: 'Asia/Tashkent' });

  logger.info('[MarkirovkaCron] Retry cron ishga tushdi (har kuni 09:00 Toshkent vaqti)');
}

// ==========================================
// EKSPORT
// ==========================================

export function startMarkirovkaReportCrons(): void {
  startDailyReportCron();
  startRetryCron();
}

// Tashqi testlar uchun yordamchi eksportlar
export { runDailyReport, processRetryQueue, buildXml, collectReportData };
