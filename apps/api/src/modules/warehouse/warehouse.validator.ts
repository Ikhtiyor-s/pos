import { z } from 'zod';

// ==========================================
// PURCHASE ORDERS
// ==========================================

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string({ required_error: 'Yetkazib beruvchi tanlanishi shart' }).uuid(),
  items: z
    .array(
      z.object({
        inventoryItemId: z.string({ required_error: 'Mahsulot tanlanishi shart' }).uuid(),
        quantity: z.number({ required_error: 'Miqdor kiritilishi shart' }).positive('Miqdor musbat bo\'lishi kerak'),
        unitPrice: z.number({ required_error: 'Narx kiritilishi shart' }).positive('Narx musbat bo\'lishi kerak'),
      })
    )
    .min(1, 'Kamida bitta mahsulot bo\'lishi kerak'),
  expectedAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const getPurchaseOrdersQuerySchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED']).optional(),
  supplierId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const updatePurchaseOrderStatusSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED'], {
    required_error: 'Status tanlanishi shart',
  }),
});

export const receivePurchaseOrderSchema = z.object({
  receivedItems: z
    .array(
      z.object({
        itemId: z.string({ required_error: 'Element ID kiritilishi shart' }).uuid(),
        receivedQty: z.number({ required_error: 'Qabul qilingan miqdor kiritilishi shart' }).positive('Miqdor musbat bo\'lishi kerak'),
      })
    )
    .min(1, 'Kamida bitta element bo\'lishi kerak'),
});

// ==========================================
// STOCK ALERTS
// ==========================================

export const getStockAlertsQuerySchema = z.object({
  isResolved: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ==========================================
// WASTE LOGS
// ==========================================

export const createWasteLogSchema = z.object({
  inventoryItemId: z.string({ required_error: 'Mahsulot tanlanishi shart' }).uuid(),
  quantity: z.number({ required_error: 'Miqdor kiritilishi shart' }).positive('Miqdor musbat bo\'lishi kerak'),
  reason: z.string({ required_error: 'Sabab kiritilishi shart' }).min(3, 'Sabab kamida 3 ta belgidan iborat bo\'lishi kerak'),
});

export const getWasteLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export const getWasteReportQuerySchema = z.object({
  dateFrom: z.string({ required_error: 'Boshlanish sanasi kiritilishi shart' }),
  dateTo: z.string({ required_error: 'Tugash sanasi kiritilishi shart' }),
});

// Types
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type GetPurchaseOrdersQuery = z.infer<typeof getPurchaseOrdersQuerySchema>;
export type UpdatePurchaseOrderStatusInput = z.infer<typeof updatePurchaseOrderStatusSchema>;
export type ReceivePurchaseOrderInput = z.infer<typeof receivePurchaseOrderSchema>;
export type GetStockAlertsQuery = z.infer<typeof getStockAlertsQuerySchema>;
export type CreateWasteLogInput = z.infer<typeof createWasteLogSchema>;
export type GetWasteLogsQuery = z.infer<typeof getWasteLogsQuerySchema>;
export type GetWasteReportQuery = z.infer<typeof getWasteReportQuerySchema>;
