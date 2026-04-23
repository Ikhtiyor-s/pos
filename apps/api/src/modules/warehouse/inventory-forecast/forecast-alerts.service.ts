import { prisma } from '@oshxona/database';
import { inventoryForecastService } from './forecast.service.js';

// ==========================================
// PREDICTIVE STOCK ALERT SERVICE
// ==========================================
// AI bashorat asosida kam zaxira ogohlantirishlari yaratadi
// va notification module orqali yuboradi

interface AlertResult {
  created: number;
  resolved: number;
  alerts: Array<{
    itemName: string;
    severity: string;
    daysUntilStockout: number;
    currentQuantity: number;
  }>;
}

export class ForecastAlertsService {

  // Barcha tenant lar uchun ogohlantirish yaratish (cron job uchun)
  async runForAllTenants(): Promise<{ tenantId: string; result: AlertResult }[]> {
    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    const results: Array<{ tenantId: string; result: AlertResult }> = [];
    for (const tenant of tenants) {
      const result = await this.checkAndCreateAlerts(tenant.id);
      results.push({ tenantId: tenant.id, result });
    }
    return results;
  }

  // Bitta tenant uchun bashorat asosida alertlar yaratish
  async checkAndCreateAlerts(tenantId: string): Promise<AlertResult> {
    const predictions = await inventoryForecastService.predictStockouts(tenantId);

    let created = 0;
    let resolved = 0;
    const alertItems: AlertResult['alerts'] = [];

    for (const pred of predictions) {
      // Faqat muammoli itemlar uchun
      if (pred.urgency === 'OK') {
        // Eski alertni resolve qilish
        const existingAlert = await prisma.stockAlert.findFirst({
          where: {
            inventoryItemId: pred.inventoryItemId,
            tenantId,
            isResolved: false,
          },
        });
        if (existingAlert) {
          await prisma.stockAlert.update({
            where: { id: existingAlert.id },
            data: { isResolved: true, resolvedAt: new Date() },
          });
          resolved++;
        }
        continue;
      }

      // Severity mapping
      const severityMap: Record<string, 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'> = {
        CRITICAL: 'CRITICAL',
        HIGH: 'HIGH',
        MEDIUM: 'MEDIUM',
        LOW: 'LOW',
      };
      const severity = severityMap[pred.urgency] || 'MEDIUM';

      // Mavjud hal qilinmagan alert bormi?
      const existingAlert = await prisma.stockAlert.findFirst({
        where: {
          inventoryItemId: pred.inventoryItemId,
          tenantId,
          isResolved: false,
        },
      });

      if (existingAlert) {
        // Severity yangilash
        if (existingAlert.severity !== severity) {
          await prisma.stockAlert.update({
            where: { id: existingAlert.id },
            data: {
              severity,
              currentQty: pred.currentQuantity,
            },
          });
        }
        continue;
      }

      // Yangi alert yaratish
      await prisma.stockAlert.create({
        data: {
          inventoryItemId: pred.inventoryItemId,
          tenantId,
          severity,
          currentQty: pred.currentQuantity,
          minQty: pred.minQuantity,
        },
      });

      // IN_APP notification yaratish
      await prisma.notification.create({
        data: {
          type: 'STOCK_LOW',
          channel: 'IN_APP',
          title: severity === 'CRITICAL'
            ? `🚨 ${pred.itemName} tugayapti!`
            : `⚠️ ${pred.itemName} kam qolmoqda`,
          body: pred.insight,
          data: {
            inventoryItemId: pred.inventoryItemId,
            itemName: pred.itemName,
            currentQuantity: pred.currentQuantity,
            daysUntilStockout: pred.daysUntilStockout,
            urgency: pred.urgency,
          },
          tenantId,
          // userId null = barcha MANAGER/WAREHOUSE rollar ko'radi
        },
      });

      created++;
      alertItems.push({
        itemName: pred.itemName,
        severity,
        daysUntilStockout: pred.daysUntilStockout,
        currentQuantity: pred.currentQuantity,
      });
    }

    return { created, resolved, alerts: alertItems };
  }

  // Aktiv alertlarni olish
  async getActiveAlerts(tenantId: string) {
    return prisma.stockAlert.findMany({
      where: { tenantId, isResolved: false },
      include: {
        inventoryItem: {
          select: {
            name: true,
            unit: true,
            quantity: true,
            minQuantity: true,
            costPrice: true,
            supplier: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  // Alertni manually resolve qilish
  async resolveAlert(alertId: string, tenantId: string) {
    return prisma.stockAlert.update({
      where: { id: alertId, tenantId },
      data: { isResolved: true, resolvedAt: new Date() },
    });
  }

  // Alert statistikasi
  async getAlertStats(tenantId: string) {
    const [active, resolvedToday, createdToday] = await Promise.all([
      prisma.stockAlert.count({ where: { tenantId, isResolved: false } }),
      prisma.stockAlert.count({
        where: {
          tenantId,
          isResolved: true,
          resolvedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.stockAlert.count({
        where: {
          tenantId,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    const bySeverity = await prisma.stockAlert.groupBy({
      by: ['severity'],
      where: { tenantId, isResolved: false },
      _count: true,
    });

    return {
      active,
      resolvedToday,
      createdToday,
      bySeverity: Object.fromEntries(bySeverity.map(s => [s.severity, s._count])),
    };
  }
}

export const forecastAlertsService = new ForecastAlertsService();
