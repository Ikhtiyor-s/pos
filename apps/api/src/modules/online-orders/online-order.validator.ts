import { z } from 'zod';

// Online buyurtma manbalari
export const onlineOrderSourceEnum = z.enum(['NONBOR', 'TELEGRAM', 'WEBSITE', 'EXTERNAL_API']);

// Online buyurtma statuslari
export const onlineOrderStatusEnum = z.enum([
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'MAPPED',
  'COMPLETED',
  'CANCELLED',
]);

// Yangi online buyurtma qabul qilish
export const receiveOnlineOrderSchema = z.object({
  source: onlineOrderSourceEnum,
  externalId: z.string().min(1, 'externalId kiritilishi shart'),
  rawPayload: z.any(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  deliveryAddress: z.string().optional(),
  totalAmount: z.number().positive('Summa musbat bo\'lishi kerak'),
  tenantId: z.string().uuid().optional(),
  items: z
    .array(
      z.object({
        externalProductId: z.string().optional(),
        name: z.string(),
        quantity: z.number().int().positive(),
        price: z.number().min(0),
        total: z.number().min(0),
        notes: z.string().optional(),
      })
    )
    .optional(),
});

// Online buyurtmani rad etish
export const rejectOnlineOrderSchema = z.object({
  reason: z.string().min(1, 'Rad etish sababi kiritilishi shart'),
});

// Online buyurtmani mahalliy buyurtmaga bog'lash
export const mapToLocalOrderSchema = z.object({
  localOrderId: z.string().uuid('Yaroqli buyurtma ID kiritilishi shart'),
});

// Online buyurtmalar ro'yxati filtrlari
export const listOnlineOrdersQuerySchema = z.object({
  source: onlineOrderSourceEnum.optional(),
  status: onlineOrderStatusEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

// Statistika filtrlari
export const onlineOrderStatsQuerySchema = z.object({
  dateFrom: z.string().min(1, 'dateFrom kiritilishi shart'),
  dateTo: z.string().min(1, 'dateTo kiritilishi shart'),
});

// Inferred types
export type ReceiveOnlineOrderInput = z.infer<typeof receiveOnlineOrderSchema>;
export type RejectOnlineOrderInput = z.infer<typeof rejectOnlineOrderSchema>;
export type MapToLocalOrderInput = z.infer<typeof mapToLocalOrderSchema>;
export type ListOnlineOrdersQuery = z.infer<typeof listOnlineOrdersQuerySchema>;
export type OnlineOrderStatsQuery = z.infer<typeof onlineOrderStatsQuerySchema>;
export type OnlineOrderSource = z.infer<typeof onlineOrderSourceEnum>;
export type OnlineOrderStatus = z.infer<typeof onlineOrderStatusEnum>;
