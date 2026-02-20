// Integration Core — Delivery Adapter
// Yetkazib berish xizmatiga HTTP POST yuborish

import axios from 'axios';
import { BaseAdapter } from './base.adapter.js';
import type { EventPayload } from '../core/types.js';

const DELIVERY_EVENTS = ['order:new', 'order:status', 'order:completed', 'order:cancelled'];

export class DeliveryAdapter extends BaseAdapter {
  key = 'delivery';

  shouldHandle(event: string, settings: any): boolean {
    if (!settings?.deliveryEnabled || !settings.deliveryApiUrl) {
      return false;
    }

    return DELIVERY_EVENTS.includes(event);
  }

  async execute(payload: EventPayload, settings: any): Promise<void> {
    await axios.post(
      `${settings.deliveryApiUrl}/webhook`,
      {
        event: payload.event,
        timestamp: payload.timestamp,
        data: payload.data,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(settings.deliveryApiKey ? { Authorization: `Bearer ${settings.deliveryApiKey}` } : {}),
        },
        timeout: 10000,
      }
    );
  }
}
