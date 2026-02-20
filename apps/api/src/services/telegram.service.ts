import axios from 'axios';
import { prisma } from '@oshxona/database';

class TelegramService {
  // Xabar yuborish
  async sendMessage(text: string, botToken?: string, chatId?: string): Promise<boolean> {
    try {
      const settings = await prisma.settings.findFirst();
      const token = botToken || settings?.telegramBotToken;
      const chat = chatId || settings?.telegramChatId;

      if (!token || !chat) {
        console.log('[Telegram] Bot token yoki chat ID yo\'q');
        return false;
      }

      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chat,
        text,
        parse_mode: 'HTML',
      }, { timeout: 10000 });

      return true;
    } catch (err: any) {
      console.error('[Telegram] Xabar yuborishda xatolik:', err.message);
      return false;
    }
  }

  // Buyurtma xabarini formatlash
  formatOrderMessage(order: any, event: string): string {
    const eventEmoji: Record<string, string> = {
      'order:new': '\u{1F195}',
      'order:status': '\u{1F504}',
      'order:completed': '\u2705',
      'order:cancelled': '\u274C',
    };

    const statusLabels: Record<string, string> = {
      NEW: 'Yangi',
      CONFIRMED: 'Tasdiqlangan',
      PREPARING: 'Tayyorlanmoqda',
      READY: 'Tayyor',
      DELIVERING: 'Yetkazilmoqda',
      COMPLETED: 'Yakunlangan',
      CANCELLED: 'Bekor qilingan',
    };

    const emoji = eventEmoji[event] || '\u{1F4E6}';
    const statusLabel = statusLabels[order.status] || order.status;

    let msg = `${emoji} <b>${event === 'order:new' ? 'Yangi buyurtma' : 'Buyurtma yangilandi'}</b>\n`;
    msg += `#${order.orderNumber}\n\n`;

    // Buyurtma elementlari
    if (order.items?.length > 0) {
      msg += `\u{1F4CB} <b>Tafsilotlar:</b>\n`;
      for (const item of order.items) {
        const name = item.product?.name || 'Noma\'lum';
        const total = Number(item.total).toLocaleString('uz-UZ');
        msg += `\u2022 ${name} x${item.quantity} \u2014 ${total} so'm\n`;
      }
      msg += '\n';
    }

    // Umumiy
    const total = Number(order.total).toLocaleString('uz-UZ');
    msg += `\u{1F4B0} <b>Jami:</b> ${total} so'm\n`;
    msg += `\u{1F4CA} <b>Holat:</b> ${statusLabel}\n`;

    // Tur
    const typeLabels: Record<string, string> = {
      DINE_IN: 'Stolda',
      TAKEAWAY: 'Olib ketish',
      DELIVERY: 'Yetkazish',
    };
    msg += `\u{1F37D} <b>Tur:</b> ${typeLabels[order.type] || order.type}\n`;

    // Mijoz
    if (order.customer) {
      const name = [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ');
      if (name) msg += `\u{1F464} <b>Mijoz:</b> ${name}\n`;
      if (order.customer.phone) msg += `\u{1F4F1} ${order.customer.phone}\n`;
    }

    // Nonbor
    if (order.isNonborOrder) {
      msg += `\n\u{1F7E3} <i>Nonbor #${order.nonborOrderId}</i>`;
    }

    // Manzil
    if (order.address) {
      msg += `\n\u{1F4CD} ${order.address}`;
    }

    return msg;
  }

  // Event handler
  async handleEvent(event: string, data: any): Promise<void> {
    try {
      const settings = await prisma.settings.findFirst();
      if (!settings?.telegramEnabled || !settings.telegramBotToken || !settings.telegramChatId) {
        return;
      }

      // Faqat tanlangan eventlar uchun
      const events = settings.telegramEvents || ['order:new'];
      if (!events.includes(event)) return;

      const text = this.formatOrderMessage(data, event);
      await this.sendMessage(text);
    } catch (err) {
      console.error('[Telegram] Event handler xatolik:', err);
    }
  }

  // Test ulanish
  async testConnection(botToken: string, chatId: string): Promise<{ success: boolean; message: string }> {
    try {
      const text = '\u2705 <b>POS Integratsiya testi</b>\n\nTelegram bot muvaffaqiyatli ulandi!';
      const result = await this.sendMessage(text, botToken, chatId);
      return result
        ? { success: true, message: 'Test xabar yuborildi' }
        : { success: false, message: 'Xabar yuborib bo\'lmadi' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }
}

export const telegramService = new TelegramService();
