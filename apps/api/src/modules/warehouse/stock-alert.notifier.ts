import { Server } from 'socket.io';
import { prisma } from '@oshxona/database';
import { logger } from '../../utils/logger.js';

interface AlertItem {
  id: string;
  severity: string;
  currentQty: any;
  minQty: any;
  inventoryItem: { id: string; name: string; sku: string; unit: string };
}

const SEVERITY_EMOJI: Record<string, string> = {
  CRITICAL: '🔴',
  HIGH:     '🟠',
  MEDIUM:   '🟡',
  LOW:      '🟢',
};

export class StockAlertNotifier {
  static async notify(tenantId: string, alerts: AlertItem[], io?: Server) {
    if (!alerts.length) return;

    this.emitSocketIO(tenantId, alerts, io);
    await this.sendTelegram(tenantId, alerts);
  }

  private static emitSocketIO(tenantId: string, alerts: AlertItem[], io?: Server) {
    if (!io) return;

    const payload = {
      count:    alerts.length,
      critical: alerts.filter(a => a.severity === 'CRITICAL').length,
      high:     alerts.filter(a => a.severity === 'HIGH').length,
      alerts,
      at: new Date().toISOString(),
    };

    io.to(`tenant:${tenantId}:admin`).emit('stock:alert', payload);
    io.to(`tenant:${tenantId}:warehouse`).emit('stock:alert', payload);

    logger.info('[StockAlert] Socket.IO emit', { tenantId, count: alerts.length });
  }

  private static async sendTelegram(tenantId: string, alerts: AlertItem[]) {
    try {
      const settings = await prisma.settings.findUnique({
        where: { tenantId },
        select: {
          telegramEnabled:  true,
          telegramBotToken: true,
          telegramChatId:   true,
          telegramEvents:   true,
        },
      });

      if (!settings?.telegramEnabled || !settings.telegramBotToken || !settings.telegramChatId) {
        return;
      }

      // telegramEvents ro'yxatida STOCK_LOW bo'lishi kerak (agar bo'sh bo'lsa — barchasi yubor)
      const events = Array.isArray(settings.telegramEvents) ? settings.telegramEvents as string[] : [];
      if (events.length > 0 && !events.includes('STOCK_LOW')) return;

      const critical = alerts.filter(a => a.severity === 'CRITICAL');
      const high     = alerts.filter(a => a.severity === 'HIGH');
      const others   = alerts.filter(a => !['CRITICAL', 'HIGH'].includes(a.severity));

      let text = `⚠️ *Ombor ogohlantirishi*\n`;
      text += `${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}\n\n`;

      const group = (items: AlertItem[], label: string) => {
        if (!items.length) return;
        text += `*${label}*\n`;
        items.forEach(a => {
          const cur = Number(a.currentQty).toFixed(2);
          const min = Number(a.minQty).toFixed(2);
          text += `${SEVERITY_EMOJI[a.severity]} ${a.inventoryItem.name} — ${cur}/${min} ${a.inventoryItem.unit} (SKU: ${a.inventoryItem.sku})\n`;
        });
        text += '\n';
      };

      group(critical, '🔴 Tugagan (kritik):');
      group(high,     '🟠 Kam qolgan:');
      group(others,   '🟡 Past daraja:');

      const url = `https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`;

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id:    settings.telegramChatId,
          text,
          parse_mode: 'Markdown',
        }),
      });

      if (!resp.ok) {
        const body = await resp.text();
        logger.warn('[StockAlert] Telegram xato', { status: resp.status, body });
      } else {
        logger.info('[StockAlert] Telegram yuborildi', { tenantId, alerts: alerts.length });
      }
    } catch (err) {
      logger.error('[StockAlert] Telegram xatolik', { error: (err as Error).message });
    }
  }
}
