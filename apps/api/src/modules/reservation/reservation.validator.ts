import { z } from 'zod';

// ==========================================
// RESERVATION
// ==========================================

export const createReservationSchema = z.object({
  customerName: z.string({ required_error: 'Mijoz ismi kiritilishi shart' }).min(2),
  customerPhone: z.string({ required_error: 'Telefon raqami kiritilishi shart' }).min(5),
  customerId: z.string().uuid().optional(),
  tableId: z.string().uuid().optional(),
  guestCount: z.number({ required_error: 'Mehmonlar soni kiritilishi shart' }).int().positive(),
  reservationDate: z.string({ required_error: 'Sana kiritilishi shart' }).datetime(),
  startTime: z.string({ required_error: 'Boshlanish vaqti kiritilishi shart' }).datetime(),
  endTime: z.string({ required_error: 'Tugash vaqti kiritilishi shart' }).datetime(),
  notes: z.string().optional(),
  source: z.enum(['PHONE', 'WEBSITE', 'TELEGRAM', 'WALK_IN']).optional().default('PHONE'),
});

export const getReservationsQuerySchema = z.object({
  date: z.string().optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const cancelReservationSchema = z.object({
  reason: z.string().optional(),
});

export const availableSlotsQuerySchema = z.object({
  date: z.string({ required_error: 'Sana kiritilishi shart' }),
  guests: z.coerce.number({ required_error: 'Mehmonlar soni kiritilishi shart' }).int().positive(),
});

// Types
export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type GetReservationsQuery = z.infer<typeof getReservationsQuerySchema>;
export type CancelReservationInput = z.infer<typeof cancelReservationSchema>;
export type AvailableSlotsQuery = z.infer<typeof availableSlotsQuerySchema>;
