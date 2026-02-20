// Integration Core — Adapter ro'yxati

import type { BaseAdapter } from '../adapters/base.adapter.js';
import { WebhookAdapter } from '../adapters/webhook.adapter.js';
import { TelegramAdapter } from '../adapters/telegram.adapter.js';
import { CrmAdapter } from '../adapters/crm.adapter.js';
import { DeliveryAdapter } from '../adapters/delivery.adapter.js';

const adapters: BaseAdapter[] = [
  new WebhookAdapter(),
  new TelegramAdapter(),
  new CrmAdapter(),
  new DeliveryAdapter(),
];

export function getActiveAdapters(): BaseAdapter[] {
  return adapters;
}
