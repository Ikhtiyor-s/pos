import { z } from 'zod';

// ==========================================
// ASOSIY SCHEMALAR
// ==========================================

export const receiveProductSchema = z.object({
  markCode:      z.string().min(20, 'Markirovka kodi kamida 20 belgidan iborat bo\'lishi kerak'),
  batchNumber:   z.string().min(1,  'Partiya raqami kiritilishi shart'),
  importerTin:   z.string().regex(/^\d{9}$/, 'INN aynan 9 raqamdan iborat bo\'lishi kerak'),
  productId:     z.string().uuid('Mahsulot ID UUID formatida bo\'lishi kerak'),
  supplierId:    z.string().uuid('Yetkazib beruvchi ID UUID formatida bo\'lishi kerak').optional(),
  invoiceNumber: z.string().min(1).optional(),
  expiryDate:    z.string().datetime({ message: 'Sana ISO 8601 formatida bo\'lishi kerak' }).optional(),
});

export const batchReceiveSchema = z.object({
  items: z
    .array(receiveProductSchema)
    .min(1,   'Kamida bitta element bo\'lishi kerak')
    .max(100, 'Maksimal 100 ta element bitta so\'rovda qabul qilinadi'),
});

export const reportSaleSchema = z.object({
  markCode:      z.string().min(20, 'Markirovka kodi kamida 20 belgidan iborat bo\'lishi kerak'),
  orderId:       z.string().uuid('Buyurtma ID UUID formatida bo\'lishi kerak'),
  price:         z.number().positive('Narx musbat bo\'lishi kerak'),
  receiptNumber: z.string().min(1, 'Chek raqami kiritilishi shart'),
});

// ==========================================
// QUERY SCHEMALAR
// ==========================================

const pageLimit = {
  page:  z.string().optional().transform((v) => (v ? Math.max(1, parseInt(v)) : 1)),
  limit: z.string().optional().transform((v) => (v ? Math.min(100, Math.max(1, parseInt(v))) : 20)),
};

export const getProductsQuerySchema = z.object({
  ...pageLimit,
  status:      z.enum(['MANUFACTURED', 'IMPORTED', 'IN_STOCK', 'RESERVED', 'SOLD', 'EXPIRED']).optional(),
  gtin:        z.string().optional(),
  batchNumber: z.string().optional(),
  productId:   z.string().uuid().optional(),
  search:      z.string().max(100).optional(),
});

export const getBatchesQuerySchema = z.object({
  ...pageLimit,
  productId:   z.string().uuid().optional(),
  supplierId:  z.string().uuid().optional(),
  batchNumber: z.string().optional(),
});

export const getLogsQuerySchema = z.object({
  ...pageLimit,
  action:   z.enum(['VERIFY', 'RECEIVE', 'SELL', 'REPORT']).optional(),
  status:   z.enum(['SUCCESS', 'FAILED', 'QUEUED']).optional(),
  markCode: z.string().optional(),
});

export const dailyReportQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Sana YYYY-MM-DD formatida bo\'lishi kerak')
    .optional(),
});

// ==========================================
// EKSPORT TIPLARI
// ==========================================

export type ReceiveProductInput  = z.infer<typeof receiveProductSchema>;
export type BatchReceiveInput    = z.infer<typeof batchReceiveSchema>;
export type ReportSaleInput      = z.infer<typeof reportSaleSchema>;
export type GetProductsQuery     = z.infer<typeof getProductsQuerySchema>;
export type GetBatchesQuery      = z.infer<typeof getBatchesQuerySchema>;
export type GetLogsQuery         = z.infer<typeof getLogsQuerySchema>;
export type DailyReportQuery     = z.infer<typeof dailyReportQuerySchema>;
