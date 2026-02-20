import axios from 'axios';
import { prisma } from '@oshxona/database';
import { emitEvent } from '../integration/index.js';
import type { IntegrationEvent } from '../integration/index.js';
import { telegramService } from './telegram.service.js';

export interface IntegrationStatus {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  configured: boolean;
  category: 'marketplace' | 'payment' | 'notification' | 'delivery' | 'crm';
  icon: string;
}

// Barcha integratsiyalar ro'yxati
const INTEGRATIONS = [
  { id: 'nonbor', name: 'Nonbor', description: 'Nonbor marketplace integratsiya', category: 'marketplace' as const, icon: 'Store' },
  { id: 'payme', name: 'Payme', description: 'Payme to\'lov tizimi', category: 'payment' as const, icon: 'CreditCard' },
  { id: 'click', name: 'Click', description: 'Click to\'lov tizimi', category: 'payment' as const, icon: 'Smartphone' },
  { id: 'uzum', name: 'Uzum Bank', description: 'Uzum Bank to\'lov tizimi', category: 'payment' as const, icon: 'Wallet' },
  { id: 'telegram', name: 'Telegram', description: 'Telegram bot bildirishnomalar', category: 'notification' as const, icon: 'MessageSquare' },
  { id: 'delivery', name: 'Yetkazish', description: 'Yetkazib berish xizmati', category: 'delivery' as const, icon: 'Truck' },
  { id: 'crm', name: 'CRM', description: 'CRM tizimi integratsiya', category: 'crm' as const, icon: 'Users' },
];

// Settings field mapping
const INTEGRATION_FIELDS: Record<string, { enabled: string; configFields: string[] }> = {
  nonbor: { enabled: 'nonborEnabled', configFields: ['nonborSellerId', 'nonborApiUrl', 'nonborApiSecret'] },
  payme: { enabled: 'paymeEnabled', configFields: ['paymeMerchantId', 'paymeSecretKey', 'paymeTestMode'] },
  click: { enabled: 'clickEnabled', configFields: ['clickMerchantId', 'clickServiceId', 'clickSecretKey', 'clickTestMode'] },
  uzum: { enabled: 'uzumEnabled', configFields: ['uzumMerchantId', 'uzumSecretKey', 'uzumTestMode'] },
  telegram: { enabled: 'telegramEnabled', configFields: ['telegramBotToken', 'telegramChatId', 'telegramEvents'] },
  delivery: { enabled: 'deliveryEnabled', configFields: ['deliveryApiUrl', 'deliveryApiKey'] },
  crm: { enabled: 'crmEnabled', configFields: ['crmApiUrl', 'crmApiKey', 'crmEvents'] },
};

export class IntegrationService {
  // Barcha integratsiyalar holati
  static async getAllStatuses(tenantId: string): Promise<IntegrationStatus[]> {
    const settings = await prisma.settings.findFirst({ where: { tenantId } });
    if (!settings) return INTEGRATIONS.map((i) => ({ ...i, enabled: false, configured: false }));

    return INTEGRATIONS.map((integration) => {
      const fields = INTEGRATION_FIELDS[integration.id];
      const s = settings as any;
      const enabled = !!s[fields.enabled];
      const configured = fields.configFields.some((f) => !!s[f]);
      return { ...integration, enabled, configured };
    });
  }

  // Bitta integratsiya holati
  static async getStatus(tenantId: string, id: string): Promise<IntegrationStatus | null> {
    const statuses = await IntegrationService.getAllStatuses(tenantId);
    return statuses.find((s) => s.id === id) || null;
  }

  // Yoqish/o'chirish
  static async toggle(tenantId: string, id: string, enabled: boolean): Promise<void> {
    const fields = INTEGRATION_FIELDS[id];
    if (!fields) throw new Error(`Noma'lum integratsiya: ${id}`);

    await prisma.settings.upsert({
      where: { tenantId },
      update: { [fields.enabled]: enabled },
      create: { tenantId, name: 'Oshxona', [fields.enabled]: enabled },
    });
  }

  // Konfiguratsiya yangilash
  static async updateConfig(tenantId: string, id: string, config: Record<string, any>): Promise<void> {
    const fields = INTEGRATION_FIELDS[id];
    if (!fields) throw new Error(`Noma'lum integratsiya: ${id}`);

    // Faqat ruxsat etilgan fieldlarni olish
    const allowedFields = [fields.enabled, ...fields.configFields];
    const updateData: Record<string, any> = {};

    for (const [key, value] of Object.entries(config)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateData[key] = value;
      }
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.settings.upsert({
        where: { tenantId },
        update: updateData,
        create: { tenantId, name: 'Oshxona', ...updateData },
      });
    }
  }

  // Ulanishni tekshirish
  static async testConnection(tenantId: string, id: string): Promise<{ success: boolean; message: string }> {
    const settings = await prisma.settings.findFirst({ where: { tenantId } });
    if (!settings) return { success: false, message: 'Sozlamalar topilmadi' };

    switch (id) {
      case 'telegram': {
        if (!settings.telegramBotToken || !settings.telegramChatId) {
          return { success: false, message: 'Bot token va chat ID kiriting' };
        }
        return telegramService.testConnection(settings.telegramBotToken, settings.telegramChatId);
      }
      case 'delivery': {
        if (!settings.deliveryApiUrl) return { success: false, message: 'API URL kiriting' };
        try {
          await axios.get(settings.deliveryApiUrl, {
            headers: settings.deliveryApiKey ? { Authorization: `Bearer ${settings.deliveryApiKey}` } : {},
            timeout: 5000,
          });
          return { success: true, message: 'Ulanish muvaffaqiyatli' };
        } catch {
          return { success: false, message: 'Ulanib bo\'lmadi' };
        }
      }
      case 'crm': {
        if (!settings.crmApiUrl) return { success: false, message: 'API URL kiriting' };
        try {
          await axios.get(settings.crmApiUrl, {
            headers: settings.crmApiKey ? { Authorization: `Bearer ${settings.crmApiKey}` } : {},
            timeout: 5000,
          });
          return { success: true, message: 'Ulanish muvaffaqiyatli' };
        } catch {
          return { success: false, message: 'Ulanib bo\'lmadi' };
        }
      }
      case 'payme':
        return { success: !!settings.paymeMerchantId && !!settings.paymeSecretKey, message: settings.paymeMerchantId ? 'Konfiguratsiya to\'g\'ri' : 'Merchant ID va Secret Key kiriting' };
      case 'click':
        return { success: !!settings.clickMerchantId && !!settings.clickSecretKey, message: settings.clickMerchantId ? 'Konfiguratsiya to\'g\'ri' : 'Merchant ID va Secret Key kiriting' };
      case 'uzum':
        return { success: !!settings.uzumMerchantId && !!settings.uzumSecretKey, message: settings.uzumMerchantId ? 'Konfiguratsiya to\'g\'ri' : 'Merchant ID va Secret Key kiriting' };
      case 'nonbor':
        return { success: !!settings.nonborEnabled && !!settings.nonborSellerId, message: settings.nonborSellerId ? 'Ulangan' : 'Seller ID kiriting' };
      default:
        return { success: false, message: `Noma'lum integratsiya: ${id}` };
    }
  }

  // Integratsiya loglari (IntegrationLog + WebhookLog)
  static async getLogs(tenantId: string, id: string, page = 1, limit = 20) {
    // IntegrationLog jadvalidan
    const [integrationLogs, integrationTotal] = await Promise.all([
      prisma.integrationLog.findMany({
        where: { tenantId, adapter: id },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.integrationLog.count({ where: { tenantId, adapter: id } }),
    ]);

    if (integrationTotal > 0) {
      return {
        logs: integrationLogs.map((log) => ({
          id: log.id,
          event: log.event,
          status: log.status,
          error: log.error,
          duration: log.duration,
          attempt: log.attempt,
          createdAt: log.createdAt,
          payload: log.payload,
        })),
        total: integrationTotal,
      };
    }

    // Fallback: eski WebhookLog jadvalidan
    const webhook = await prisma.webhook.findFirst({
      where: { service: id },
    });

    if (!webhook) return { logs: [], total: 0 };

    const [logs, total] = await Promise.all([
      prisma.webhookLog.findMany({
        where: { webhookId: webhook.id },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.webhookLog.count({ where: { webhookId: webhook.id } }),
    ]);

    return { logs, total };
  }

  // ============ MARKAZIY EVENT DISPATCHER (Queue-based) ============

  static async dispatchEvent(event: string, data: any): Promise<void> {
    try {
      await emitEvent(event as IntegrationEvent, data);
    } catch (err) {
      console.error('[Integration] dispatchEvent xatolik:', err);
    }
  }
}
