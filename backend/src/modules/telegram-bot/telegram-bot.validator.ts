import { z } from 'zod';

// ==========================================
// WEBHOOK
// ==========================================

export const webhookParamsSchema = z.object({
  tenantId: z.string({ required_error: 'Tenant ID kiritilishi shart' }).uuid(),
});

// ==========================================
// SETUP WEBHOOK
// ==========================================

export const setupWebhookSchema = z.object({
  webhookUrl: z.string({ required_error: 'Webhook URL kiritilishi shart' }).url(),
});

// ==========================================
// BROADCAST
// ==========================================

export const broadcastSchema = z.object({
  message: z.string({ required_error: 'Xabar matni kiritilishi shart' }).min(1).max(4096),
});

// ==========================================
// USERS QUERY
// ==========================================

export const getTelegramUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  isActive: z.preprocess((val) => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return val;
  }, z.boolean().optional()),
});

// Types
export type WebhookParams = z.infer<typeof webhookParamsSchema>;
export type SetupWebhookInput = z.infer<typeof setupWebhookSchema>;
export type BroadcastInput = z.infer<typeof broadcastSchema>;
export type GetTelegramUsersQuery = z.infer<typeof getTelegramUsersQuerySchema>;
