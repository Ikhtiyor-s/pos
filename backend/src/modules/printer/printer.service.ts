import { prisma } from '@oshxona/database';
import { xprinterClient } from './xprinter-client.js';
import {
  formatKitchenTicket,
  formatCustomerReceipt,
  formatDailyReport,
} from './print-formatter.js';

// ==========================================
// PRINTER SERVICE
// POS va XPrinter orasidagi asosiy service layer
// Auto-print hooks + manual print + daily report
// ==========================================

interface PrintConfig {
  businessId: number;
  businessName: string;
  autoKitchenPrint: boolean;
  autoReceiptPrint: boolean;
}

// Default konfiguratsiya — env dan yoki settings dan olinadi
function getDefaultConfig(): PrintConfig {
  return {
    businessId: parseInt(process.env.XPRINTER_BUSINESS_ID || '1'),
    businessName: process.env.XPRINTER_BUSINESS_NAME || 'Milliy Taomlar',
    autoKitchenPrint: process.env.XPRINTER_AUTO_KITCHEN !== 'false',
    autoReceiptPrint: process.env.XPRINTER_AUTO_RECEIPT !== 'false',
  };
}

export class PrinterService {

  // ==========================================
  // AUTO-PRINT: KITCHEN TICKET
  // Order yaratilganda yoki oshxonaga yuborilganda
  // ==========================================

  static async autoPrintKitchenTicket(orderId: string, tenantId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const config = await this.getConfig(tenantId);
    if (!config.autoKitchenPrint) {
      return { success: true, message: 'Auto kitchen print o\'chirilgan' };
    }

    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId, tenantId },
        include: {
          table: { select: { number: true, name: true } },
          customer: { select: { firstName: true, lastName: true, phone: true } },
          user: { select: { firstName: true, lastName: true } },
          items: {
            include: { product: { select: { id: true, name: true, price: true } } },
          },
        },
      });

      if (!order) return { success: false, message: 'Buyurtma topilmadi' };

      const payload = formatKitchenTicket(
        order as any,
        config.businessName,
        config.businessId,
      );

      const result = await xprinterClient.sendWebhook(payload);

      if (result.success) {
        console.log(`[Printer] Kitchen ticket chop etildi: ${order.orderNumber}`);
        return { success: true, message: `Kitchen ticket: ${result.data?.completed || 0} printerga yuborildi` };
      }

      console.error(`[Printer] Kitchen ticket xatolik: ${result.error}`);
      return { success: false, message: result.error || 'XPrinter xatolik' };
    } catch (error: any) {
      console.error('[Printer] Kitchen ticket xatolik:', error.message);
      return { success: false, message: error.message };
    }
  }

  // ==========================================
  // AUTO-PRINT: CUSTOMER RECEIPT
  // To'lov qabul qilinganda
  // ==========================================

  static async autoPrintReceipt(orderId: string, tenantId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const config = await this.getConfig(tenantId);
    if (!config.autoReceiptPrint) {
      return { success: true, message: 'Auto receipt print o\'chirilgan' };
    }

    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId, tenantId },
        include: {
          table: { select: { number: true, name: true } },
          customer: { select: { firstName: true, lastName: true, phone: true } },
          user: { select: { firstName: true, lastName: true } },
          items: {
            include: { product: { select: { id: true, name: true, price: true } } },
          },
          payments: {
            where: { status: 'COMPLETED' },
            select: { method: true, amount: true, status: true },
          },
        },
      });

      if (!order) return { success: false, message: 'Buyurtma topilmadi' };

      const payload = formatCustomerReceipt(
        order as any,
        config.businessName,
        config.businessId,
      );

      const result = await xprinterClient.sendWebhook(payload);

      if (result.success) {
        console.log(`[Printer] Receipt chop etildi: ${order.orderNumber}`);
        return { success: true, message: `Receipt: ${result.data?.completed || 0} printerga yuborildi` };
      }

      console.error(`[Printer] Receipt xatolik: ${result.error}`);
      return { success: false, message: result.error || 'XPrinter xatolik' };
    } catch (error: any) {
      console.error('[Printer] Receipt xatolik:', error.message);
      return { success: false, message: error.message };
    }
  }

  // ==========================================
  // MANUAL PRINT: KITCHEN TICKET
  // ==========================================

  static async printKitchenTicket(orderId: string, tenantId: string) {
    const config = await this.getConfig(tenantId);

    const order = await prisma.order.findUnique({
      where: { id: orderId, tenantId },
      include: {
        table: { select: { number: true, name: true } },
        customer: { select: { firstName: true, lastName: true, phone: true } },
        user: { select: { firstName: true, lastName: true } },
        items: {
          include: { product: { select: { id: true, name: true, price: true } } },
        },
      },
    });

    if (!order) throw new Error('Buyurtma topilmadi');

    const payload = formatKitchenTicket(order as any, config.businessName, config.businessId);
    return xprinterClient.sendWebhook(payload);
  }

  // ==========================================
  // MANUAL PRINT: RECEIPT
  // ==========================================

  static async printReceipt(orderId: string, tenantId: string) {
    const config = await this.getConfig(tenantId);

    const order = await prisma.order.findUnique({
      where: { id: orderId, tenantId },
      include: {
        table: { select: { number: true, name: true } },
        customer: { select: { firstName: true, lastName: true, phone: true } },
        user: { select: { firstName: true, lastName: true } },
        items: {
          include: { product: { select: { id: true, name: true, price: true } } },
        },
        payments: {
          where: { status: 'COMPLETED' },
          select: { method: true, amount: true, status: true },
        },
      },
    });

    if (!order) throw new Error('Buyurtma topilmadi');

    const payload = formatCustomerReceipt(order as any, config.businessName, config.businessId);
    return xprinterClient.sendWebhook(payload);
  }

  // ==========================================
  // DAILY REPORT PRINT
  // ==========================================

  static async printDailyReport(tenantId: string, date?: string) {
    const config = await this.getConfig(tenantId);
    const reportDate = date || new Date().toISOString().split('T')[0];

    const dayStart = new Date(reportDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(reportDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Ma'lumotlarni yig'ish
    const orders = await prisma.order.findMany({
      where: { tenantId, createdAt: { gte: dayStart, lte: dayEnd }, status: { not: 'CANCELLED' } },
      select: { total: true, discount: true, source: true },
    });

    const payments = await prisma.payment.findMany({
      where: {
        order: { tenantId, createdAt: { gte: dayStart, lte: dayEnd } },
        status: 'COMPLETED',
      },
      select: { method: true, amount: true },
    });

    const refunds = await prisma.payment.findMany({
      where: {
        order: { tenantId, createdAt: { gte: dayStart, lte: dayEnd } },
        status: 'REFUNDED',
      },
      select: { amount: true },
    });

    // Top mahsulotlar
    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: { tenantId, createdAt: { gte: dayStart, lte: dayEnd }, status: { not: 'CANCELLED' } },
        status: { not: 'CANCELLED' },
      },
      _sum: { quantity: true, total: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 5,
    });

    const productIds = topProducts.map(t => t.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const productNameMap = new Map(products.map(p => [p.id, p.name]));

    // Kassa
    const cashRegister = await prisma.cashRegister.findFirst({
      where: { tenantId, openedAt: { gte: dayStart, lte: dayEnd } },
      orderBy: { openedAt: 'desc' },
    });

    // To'lov turlari bo'yicha
    const cashTotal = payments.filter(p => p.method === 'CASH').reduce((s, p) => s + Number(p.amount), 0);
    const cardTotal = payments.filter(p => ['CARD', 'HUMO'].includes(p.method)).reduce((s, p) => s + Number(p.amount), 0);
    const onlineTotal = payments.filter(p => ['PAYME', 'CLICK', 'UZUM', 'OTHER'].includes(p.method)).reduce((s, p) => s + Number(p.amount), 0);

    // Source bo'yicha
    const sourceMap = new Map<string, { orders: number; revenue: number }>();
    for (const order of orders) {
      const src = (order as any).source || 'POS_ORDER';
      if (!sourceMap.has(src)) sourceMap.set(src, { orders: 0, revenue: 0 });
      const e = sourceMap.get(src)!;
      e.orders++;
      e.revenue += Number(order.total);
    }

    const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
    const totalDiscount = orders.reduce((s, o) => s + Number(o.discount), 0);
    const totalRefunds = refunds.reduce((s, r) => s + Number(r.amount), 0);

    const reportData = {
      date: reportDate,
      businessName: config.businessName,
      totalOrders: orders.length,
      totalRevenue: Math.round(totalRevenue),
      totalCash: Math.round(cashTotal),
      totalCard: Math.round(cardTotal),
      totalOnline: Math.round(onlineTotal),
      totalDiscount: Math.round(totalDiscount),
      totalRefunds: Math.round(totalRefunds),
      netRevenue: Math.round(totalRevenue - totalRefunds),
      topProducts: topProducts.map(t => ({
        name: productNameMap.get(t.productId) || 'Noma\'lum',
        quantity: t._sum.quantity || 0,
        revenue: Math.round(Number(t._sum.total || 0)),
      })),
      bySource: Array.from(sourceMap.entries()).map(([source, data]) => ({
        source,
        orders: data.orders,
        revenue: Math.round(data.revenue),
      })),
      openingCash: cashRegister ? Number(cashRegister.openingCash) : undefined,
      closingCash: cashRegister?.closedAt ? Number(cashRegister.closingCash) : undefined,
      difference: cashRegister?.difference ? Number(cashRegister.difference) : undefined,
    };

    const payload = formatDailyReport(reportData, config.businessId);
    return xprinterClient.sendWebhook(payload);
  }

  // ==========================================
  // PRINTER MANAGEMENT (proxy to XPrinter)
  // ==========================================

  static async listPrinters(tenantId: string) {
    const config = await this.getConfig(tenantId);
    return xprinterClient.listPrinters(config.businessId);
  }

  static async testPrint(printerId: number) {
    return xprinterClient.testPrint(printerId);
  }

  static async getStatus() {
    return xprinterClient.healthCheck();
  }

  static async getJobHistory(tenantId: string, filters?: { status?: string; order_id?: string }) {
    const config = await this.getConfig(tenantId);
    return xprinterClient.listJobs(config.businessId, filters);
  }

  static async retryJob(jobId: number) {
    return xprinterClient.retryJob(jobId);
  }

  // ==========================================
  // CONFIG
  // ==========================================

  private static async getConfig(tenantId: string): Promise<PrintConfig> {
    const defaults = getDefaultConfig();

    // Settings dan tenant-specific config olishga harakat
    const settings = await prisma.settings.findFirst({
      where: { tenantId },
    });

    if (settings) {
      const data = settings as any;
      return {
        businessId: data.xprinterBusinessId || defaults.businessId,
        businessName: data.businessName || data.restaurantName || defaults.businessName,
        autoKitchenPrint: data.autoKitchenPrint ?? defaults.autoKitchenPrint,
        autoReceiptPrint: data.autoReceiptPrint ?? defaults.autoReceiptPrint,
      };
    }

    return defaults;
  }
}
