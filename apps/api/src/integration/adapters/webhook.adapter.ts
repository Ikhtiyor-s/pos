// Integration Core — Webhook Adapter
// Outgoing webhooklarga event yuborish (webhookService wrap)

import { BaseAdapter } from './base.adapter.js';
import { webhookService } from '../../services/webhook.service.js';
import type { EventPayload } from '../core/types.js';
import type { WebhookEvent } from '../../services/webhook.service.js';

export class WebhookAdapter extends BaseAdapter {
  key = 'webhook';

  shouldHandle(_event: string, _settings: any): boolean {
    // Webhooklar har doim aktiv — o'zlari event filtrlaydi (events has: event)
    return true;
  }

  async execute(payload: EventPayload, _settings: any): Promise<void> {
    await webhookService.emit(payload.event as WebhookEvent, payload.data);
  }
}
