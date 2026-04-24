import { z } from 'zod';

export const setupWebhookSchema = z.object({
  appUrl: z.string().url(),
});

export const broadcastSchema = z.object({
  message: z.string().min(1).max(4096),
});

export const getTelegramUsersQuerySchema = z.object({
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().positive().max(100).default(50),
  isActive: z.preprocess(v => v === 'true' ? true : v === 'false' ? false : v, z.boolean().optional()),
});

export type SetupWebhookInput    = z.infer<typeof setupWebhookSchema>;
export type BroadcastInput       = z.infer<typeof broadcastSchema>;
export type GetTelegramUsersQuery = z.infer<typeof getTelegramUsersQuerySchema>;
