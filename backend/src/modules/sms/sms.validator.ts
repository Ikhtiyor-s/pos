import { z } from 'zod';

// ==========================================
// OTP
// ==========================================

export const sendOtpSchema = z.object({
  phone: z.string({ required_error: 'Telefon raqami kiritilishi shart' }).min(9).max(15),
});

export const verifyOtpSchema = z.object({
  phone: z.string({ required_error: 'Telefon raqami kiritilishi shart' }).min(9).max(15),
  code: z.string({ required_error: 'OTP kodi kiritilishi shart' }).length(6),
});

// ==========================================
// SEND SMS
// ==========================================

export const sendSmsSchema = z.object({
  phone: z.string({ required_error: 'Telefon raqami kiritilishi shart' }).min(9).max(15),
  message: z.string({ required_error: 'Xabar matni kiritilishi shart' }).min(1).max(160),
  type: z.enum(['ORDER_STATUS', 'RESERVATION', 'LOYALTY']).optional().default('ORDER_STATUS'),
});

// ==========================================
// BROADCAST
// ==========================================

export const broadcastSmsSchema = z.object({
  phones: z.array(z.string().min(9).max(15)).min(1, 'Kamida bitta telefon raqam kiritilishi shart').max(1000),
  message: z.string({ required_error: 'Xabar matni kiritilishi shart' }).min(1).max(160),
});

// ==========================================
// LOGS QUERY
// ==========================================

export const getSmsLogsQuerySchema = z.object({
  type: z.enum(['OTP', 'ORDER_STATUS', 'RESERVATION', 'MARKETING', 'LOYALTY']).optional(),
  phone: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

// Types
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type SendSmsInput = z.infer<typeof sendSmsSchema>;
export type BroadcastSmsInput = z.infer<typeof broadcastSmsSchema>;
export type GetSmsLogsQuery = z.infer<typeof getSmsLogsQuerySchema>;
