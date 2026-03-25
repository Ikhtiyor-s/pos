// Integration Core — Telegram Adapter
// Telegram botga bildirishnoma yuborish (telegramService wrap)

import { BaseAdapter } from './base.adapter.js';
import { telegramService } from '../../services/telegram.service.js';
import type { EventPayload } from '../core/types.js';

export class TelegramAdapter extends BaseAdapter {
  key = 'telegram';

  shouldHandle(event: string, settings: any): boolean {
    if (!settings?.telegramEnabled || !settings.telegramBotToken || !settings.telegramChatId) {
      return false;
    }

    // Faqat tanlangan eventlar uchun
    const events: string[] = settings.telegramEvents || ['order:new'];
    return events.includes(event);
  }

  async execute(payload: EventPayload, _settings: any): Promise<void> {
    await telegramService.handleEvent(payload.event, payload.data);
  }
}
