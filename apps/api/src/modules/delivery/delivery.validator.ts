import { z } from 'zod';

// ==========================================
// DELIVERY
// ==========================================

export const createDeliverySchema = z.object({
  orderId: z.string({ required_error: 'Buyurtma ID kiritilishi shart' }).uuid(),
  deliveryAddress: z.string({ required_error: 'Yetkazib berish manzili kiritilishi shart' }).min(5),
  customerPhone: z.string({ required_error: 'Mijoz telefoni kiritilishi shart' }).min(5),
  pickupAddress: z.string().optional(),
  distance: z.number().positive().optional(),
  deliveryFee: z.number().min(0).optional().default(0),
  notes: z.string().optional(),
});

export const assignDriverSchema = z.object({
  driverId: z.string({ required_error: 'Haydovchi ID kiritilishi shart' }).uuid(),
});

export const deliveredSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
});

export const failedSchema = z.object({
  reason: z.string({ required_error: 'Sabab kiritilishi shart' }).min(3),
});

// ==========================================
// DRIVERS
// ==========================================

export const createDriverSchema = z.object({
  name: z.string({ required_error: 'Haydovchi ismi kiritilishi shart' }).min(2),
  phone: z.string({ required_error: 'Telefon raqami kiritilishi shart' }).min(5),
  vehicle: z.string().optional(),
});

export const updateDriverStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'BUSY', 'OFFLINE'], {
    required_error: 'Status tanlanishi shart',
  }),
});

export const getDriversQuerySchema = z.object({
  status: z.enum(['AVAILABLE', 'BUSY', 'OFFLINE']).optional(),
});

export const getDeliveriesQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const getDeliveryStatsQuerySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

// Types
export type CreateDeliveryInput = z.infer<typeof createDeliverySchema>;
export type AssignDriverInput = z.infer<typeof assignDriverSchema>;
export type DeliveredInput = z.infer<typeof deliveredSchema>;
export type FailedInput = z.infer<typeof failedSchema>;
export type CreateDriverInput = z.infer<typeof createDriverSchema>;
export type UpdateDriverStatusInput = z.infer<typeof updateDriverStatusSchema>;
export type GetDriversQuery = z.infer<typeof getDriversQuerySchema>;
export type GetDeliveriesQuery = z.infer<typeof getDeliveriesQuerySchema>;
export type GetDeliveryStatsQuery = z.infer<typeof getDeliveryStatsQuerySchema>;
