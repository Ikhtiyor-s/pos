// Integration Core — Markaziy Dispatcher
// Worker chaqiradi — adapterlarni topib, bajaradi

import { prisma } from '@oshxona/database';
import { getActiveAdapters } from './adapter-registry.js';
import type { EventPayload } from './types.js';

export async function dispatch(payload: EventPayload): Promise<void> {
  const settings = await prisma.settings.findFirst();
  const adapters = getActiveAdapters();

  const errors: Error[] = [];

  for (const adapter of adapters) {
    if (!adapter.shouldHandle(payload.event, settings)) continue;

    const start = Date.now();
    try {
      await adapter.execute(payload, settings);
      const duration = Date.now() - start;

      // Muvaffaqiyatli log
      await logResult(adapter.key, payload, 'SUCCESS', duration);
    } catch (err: any) {
      const duration = Date.now() - start;

      // Xatolik log
      await logResult(adapter.key, payload, 'FAILED', duration, err.message);
      errors.push(err);
    }
  }

  // Agar birorta adapter xato bersa — BullMQ retry uchun throw
  if (errors.length > 0) {
    throw new Error(`[Integration] ${errors.length} adapter(lar) xato: ${errors.map((e) => e.message).join('; ')}`);
  }
}

async function logResult(
  adapter: string,
  payload: EventPayload,
  status: string,
  duration: number,
  error?: string
): Promise<void> {
  try {
    await prisma.integrationLog.create({
      data: {
        adapter,
        event: payload.event,
        payload: payload.data as any,
        status,
        error,
        duration,
      },
    });
  } catch (err) {
    console.error(`[Integration] Log yozishda xatolik:`, err);
  }
}
