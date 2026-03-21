import { z } from 'zod';

// ==========================================
// ANALYTICS VALIDATORS
// ==========================================

export const getSnapshotsSchema = z.object({
  type: z
    .enum(['DAILY_SALES', 'WEEKLY_SUMMARY', 'PRODUCT_PERFORMANCE', 'CUSTOMER_BEHAVIOR', 'INVENTORY_TURNOVER'])
    .optional(),
  dateFrom: z
    .string()
    .datetime({ message: 'Noto\'g\'ri sana formati' })
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  dateTo: z
    .string()
    .datetime({ message: 'Noto\'g\'ri sana formati' })
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  page: z
    .string()
    .optional()
    .default('1')
    .transform(Number)
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform(Number)
    .pipe(z.number().int().positive().max(100)),
});

export const createSnapshotSchema = z.object({
  date: z
    .string()
    .datetime({ message: 'Noto\'g\'ri sana formati' })
    .optional()
    .transform((val) => (val ? new Date(val) : new Date())),
});

// ==========================================
// FORECAST VALIDATORS
// ==========================================

export const getForecastsSchema = z.object({
  type: z.enum(['DEMAND', 'REVENUE', 'INVENTORY']).optional(),
  dateFrom: z
    .string()
    .datetime({ message: 'Noto\'g\'ri sana formati' })
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  dateTo: z
    .string()
    .datetime({ message: 'Noto\'g\'ri sana formati' })
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
});

export const generateForecastSchema = z.object({
  targetDate: z
    .string()
    .datetime({ message: 'Noto\'g\'ri sana formati' })
    .optional()
    .transform((val) => {
      if (val) return new Date(val);
      // Default: ertangi kun
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow;
    }),
});

// ==========================================
// ANOMALY VALIDATORS
// ==========================================

export const getAnomaliesSchema = z.object({
  dateFrom: z
    .string()
    .datetime({ message: 'Noto\'g\'ri sana formati' })
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  dateTo: z
    .string()
    .datetime({ message: 'Noto\'g\'ri sana formati' })
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
});

export const detectAnomaliesSchema = z.object({
  date: z
    .string()
    .datetime({ message: 'Noto\'g\'ri sana formati' })
    .optional()
    .transform((val) => (val ? new Date(val) : new Date())),
});

// ==========================================
// TYPE EXPORTS
// ==========================================

export type GetSnapshotsInput = z.infer<typeof getSnapshotsSchema>;
export type CreateSnapshotInput = z.infer<typeof createSnapshotSchema>;
export type GetForecastsInput = z.infer<typeof getForecastsSchema>;
export type GenerateForecastInput = z.infer<typeof generateForecastSchema>;
export type GetAnomaliesInput = z.infer<typeof getAnomaliesSchema>;
export type DetectAnomaliesInput = z.infer<typeof detectAnomaliesSchema>;
