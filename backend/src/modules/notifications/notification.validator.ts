import { z } from 'zod';

export const listNotificationsSchema = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((v) => (v ? parseInt(v, 10) : 1))
      .pipe(z.number().int().min(1)),
    limit: z
      .string()
      .optional()
      .transform((v) => (v ? parseInt(v, 10) : 20))
      .pipe(z.number().int().min(1).max(100)),
    type: z
      .enum([
        'STOCK_LOW',
        'STOCK_EXPIRED',
        'ORDER_NEW',
        'ORDER_ONLINE',
        'ORDER_CANCELLED',
        'PAYMENT_RECEIVED',
        'SHIFT_OPENED',
        'SHIFT_CLOSED',
        'EXPENSE_PENDING',
        'PURCHASE_ORDER',
        'SYSTEM',
      ])
      .optional(),
    isRead: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
  }),
});

export const markAsReadSchema = z.object({
  params: z.object({
    id: z.string().uuid('Noto\'g\'ri bildirishnoma ID'),
  }),
});

export const updateSettingsSchema = z.object({
  body: z.object({
    stockLowEnabled: z.boolean().optional(),
    stockLowChannels: z
      .array(z.enum(['IN_APP', 'TELEGRAM', 'SMS', 'PUSH']))
      .optional(),
    orderNewEnabled: z.boolean().optional(),
    orderNewChannels: z
      .array(z.enum(['IN_APP', 'TELEGRAM', 'SMS', 'PUSH']))
      .optional(),
    onlineOrderEnabled: z.boolean().optional(),
    onlineOrderChannels: z
      .array(z.enum(['IN_APP', 'TELEGRAM', 'SMS', 'PUSH']))
      .optional(),
    expenseEnabled: z.boolean().optional(),
    expenseChannels: z
      .array(z.enum(['IN_APP', 'TELEGRAM', 'SMS', 'PUSH']))
      .optional(),
  }),
});

export const deleteOldSchema = z.object({
  body: z.object({
    daysOld: z
      .number()
      .int()
      .min(1, 'Kamida 1 kun bo\'lishi kerak')
      .max(365, 'Maksimum 365 kun'),
  }),
});
