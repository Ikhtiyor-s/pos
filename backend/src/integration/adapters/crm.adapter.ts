// Integration Core — CRM Adapter
// CRM tizimiga HTTP POST yuborish

import axios from 'axios';
import { BaseAdapter } from './base.adapter.js';
import type { EventPayload } from '../core/types.js';

export class CrmAdapter extends BaseAdapter {
  key = 'crm';

  shouldHandle(event: string, settings: any): boolean {
    if (!settings?.crmEnabled || !settings.crmApiUrl) {
      return false;
    }

    const crmEvents: string[] = settings.crmEvents || ['order:new', 'order:completed'];
    return crmEvents.includes(event);
  }

  async execute(payload: EventPayload, settings: any): Promise<void> {
    await axios.post(
      settings.crmApiUrl,
      {
        event: payload.event,
        timestamp: payload.timestamp,
        data: payload.data,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(settings.crmApiKey ? { Authorization: `Bearer ${settings.crmApiKey}` } : {}),
        },
        timeout: 10000,
      }
    );
  }
}
