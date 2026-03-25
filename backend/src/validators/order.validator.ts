import { z } from 'zod';

export const orderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive('Miqdor musbat bo\'lishi kerak'),
  notes: z.string().optional(),
});

export const createOrderSchema = z.object({
  source: z.enum(['POS_ORDER', 'WAITER_ORDER', 'QR_ORDER', 'NONBOR_ORDER', 'TELEGRAM_ORDER', 'WEBSITE_ORDER', 'API_ORDER']).default('POS_ORDER'),
  type: z.enum(['DINE_IN', 'TAKEAWAY', 'DELIVERY']).default('DINE_IN'),
  tableId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  items: z.array(orderItemSchema).min(1, 'Kamida bitta mahsulot bo\'lishi kerak'),
  notes: z.string().optional(),
  address: z.string().optional(),
  discount: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
});

export const updateOrderSchema = z.object({
  status: z
    .enum(['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'COMPLETED', 'CANCELLED'])
    .optional(),
  notes: z.string().optional(),
  discount: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
});

export const updateOrderItemStatusSchema = z.object({
  status: z.enum(['PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED']),
});

export const addOrderItemsSchema = z.object({
  items: z.array(orderItemSchema).min(1),
});

export type OrderItemInput = z.infer<typeof orderItemSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
