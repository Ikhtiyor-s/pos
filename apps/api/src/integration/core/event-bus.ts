// Integration Core — Markaziy Event Emitter
// POS modullaridan chaqiriladi (order, product, inventory, etc.)

import { addToQueue } from '../queue/queue.js';
import type { IntegrationEvent } from './types.js';

export async function emitEvent(event: IntegrationEvent, data: any): Promise<void> {
  try {
    await addToQueue({
      event,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`[Integration] Event queue ga qo'shib bo'lmadi (${event}):`, err);
  }
}
