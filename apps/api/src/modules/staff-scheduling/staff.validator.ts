import { z } from 'zod';

// ==========================================
// SHIFTS
// ==========================================

export const createShiftSchema = z.object({
  userId: z.string({ required_error: 'Xodim ID kiritilishi shart' }).uuid(),
  date: z.string({ required_error: 'Sana kiritilishi shart' }),
  startTime: z.string({ required_error: 'Boshlanish vaqti kiritilishi shart' }),
  endTime: z.string({ required_error: 'Tugash vaqti kiritilishi shart' }),
  notes: z.string().optional(),
  breakMinutes: z.number().int().min(0).optional(),
});

export const getShiftsQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: z.enum(['SCHEDULED', 'ACTIVE', 'COMPLETED', 'ABSENT', 'LATE']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const updateShiftSchema = z.object({
  userId: z.string().uuid().optional(),
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  notes: z.string().optional(),
  breakMinutes: z.number().int().min(0).optional(),
  status: z.enum(['SCHEDULED', 'ACTIVE', 'COMPLETED', 'ABSENT', 'LATE']).optional(),
});

// ==========================================
// ATTENDANCE
// ==========================================

export const getAttendanceQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

// ==========================================
// PAYROLL
// ==========================================

export const calculatePayrollSchema = z.object({
  userId: z.string({ required_error: 'Xodim ID kiritilishi shart' }).uuid(),
  periodStart: z.string({ required_error: 'Davr boshlanish sanasi kiritilishi shart' }),
  periodEnd: z.string({ required_error: 'Davr tugash sanasi kiritilishi shart' }),
  baseSalary: z.number({ required_error: 'Asosiy maosh kiritilishi shart' }).positive(),
});

export const getPayrollQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  isPaid: z.preprocess((val) => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
  }, z.boolean().optional()),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

// ==========================================
// DASHBOARD
// ==========================================

export const weeklyScheduleQuerySchema = z.object({
  weekStart: z.string({ required_error: 'Hafta boshlanish sanasi kiritilishi shart' }),
});

// Types
export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type GetShiftsQuery = z.infer<typeof getShiftsQuerySchema>;
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;
export type GetAttendanceQuery = z.infer<typeof getAttendanceQuerySchema>;
export type CalculatePayrollInput = z.infer<typeof calculatePayrollSchema>;
export type GetPayrollQuery = z.infer<typeof getPayrollQuerySchema>;
export type WeeklyScheduleQuery = z.infer<typeof weeklyScheduleQuerySchema>;
