import { prisma, Prisma, SubscriptionStatus, InvoiceStatus } from '@oshxona/database';
import { AppError } from '../middleware/errorHandler.js';
import type {
  CreatePlanInput,
  UpdatePlanInput,
  CreateSubscriptionInput,
  UpdateResourcesInput,
  OverridePriceInput,
  GenerateInvoiceInput,
  PayInvoiceInput,
  InvoiceQueryInput,
} from '../validators/billing.validator.js';

export class BillingService {
  // ============ NARX HISOBLASH ============

  static calculatePrice(
    basePrice: number,
    pricePerWarehouse: number,
    pricePerKitchen: number,
    pricePerWaiter: number,
    warehouses: number,
    kitchens: number,
    waiters: number
  ): number {
    return (
      basePrice +
      pricePerWarehouse * warehouses +
      pricePerKitchen * kitchens +
      pricePerWaiter * waiters
    );
  }

  // ============ PLAN CRUD (GLOBAL — tenantId kerak emas) ============

  static async getAllPlans(options?: { isActive?: boolean }) {
    const where: Prisma.PlanWhereInput = {};
    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    const plans = await prisma.plan.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { basePrice: 'asc' }],
      include: {
        _count: { select: { subscriptions: true } },
      },
    });

    return plans;
  }

  static async getPlanById(id: string) {
    const plan = await prisma.plan.findUnique({
      where: { id },
      include: {
        _count: { select: { subscriptions: true } },
      },
    });

    if (!plan) {
      throw new AppError('Tarif rejasi topilmadi', 404);
    }

    return plan;
  }

  static async createPlan(data: CreatePlanInput) {
    const plan = await prisma.plan.create({ data });
    return plan;
  }

  static async updatePlan(id: string, data: UpdatePlanInput) {
    await this.getPlanById(id);
    const plan = await prisma.plan.update({
      where: { id },
      data,
    });
    return plan;
  }

  static async deletePlan(id: string) {
    await this.getPlanById(id);

    const activeCount = await prisma.subscription.count({
      where: { planId: id, status: SubscriptionStatus.ACTIVE },
    });

    if (activeCount > 0) {
      throw new AppError('Bu tarif rejasida faol obuna mavjud, o\'chirib bo\'lmaydi', 400);
    }

    await prisma.plan.delete({ where: { id } });
  }

  // ============ SUBSCRIPTION BOSHQARUV ============

  static async getSubscription(tenantId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription) {
      return null;
    }

    // Muddati o'tganini avtomatik tekshirish
    if (subscription.status === SubscriptionStatus.ACTIVE && subscription.endDate < new Date()) {
      const updated = await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.EXPIRED },
        include: { plan: true },
      });
      return updated;
    }

    // Oylik hisoblagichni avtomatik yangilash
    const now = new Date();
    if (subscription.monthResetDate < now) {
      const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const updated = await prisma.subscription.update({
        where: { id: subscription.id },
        data: { ordersThisMonth: 0, monthResetDate: nextReset },
        include: { plan: true },
      });
      return updated;
    }

    return subscription;
  }

  static async createSubscription(tenantId: string, data: CreateSubscriptionInput) {
    const plan = await this.getPlanById(data.planId);

    // Mavjud faol obunani bekor qilish
    const existing = await prisma.subscription.findUnique({ where: { tenantId } });
    if (existing && existing.status === SubscriptionStatus.ACTIVE) {
      await prisma.subscription.update({
        where: { tenantId },
        data: { status: SubscriptionStatus.CANCELLED },
      });
    }
    // Agar eski subscription bo'lsa, o'chirish (tenantId @unique)
    if (existing) {
      await prisma.subscription.delete({ where: { tenantId } });
    }

    const warehouses = data.warehouses ?? 1;
    const kitchens = data.kitchens ?? 1;
    const waiters = data.waiters ?? 1;

    // Plan limitlarini tekshirish
    if (warehouses > plan.maxWarehouses) {
      throw new AppError(`Omborlar soni maksimal ${plan.maxWarehouses} dan oshmasligi kerak`, 400);
    }
    if (kitchens > plan.maxKitchens) {
      throw new AppError(`Oshxonalar soni maksimal ${plan.maxKitchens} dan oshmasligi kerak`, 400);
    }
    if (waiters > plan.maxWaiters) {
      throw new AppError(`Ofitsiantlar soni maksimal ${plan.maxWaiters} dan oshmasligi kerak`, 400);
    }

    const calculatedPrice = this.calculatePrice(
      Number(plan.basePrice),
      Number(plan.pricePerWarehouse),
      Number(plan.pricePerKitchen),
      Number(plan.pricePerWaiter),
      warehouses,
      kitchens,
      waiters
    );

    const totalPrice = data.overridePrice !== undefined ? data.overridePrice : calculatedPrice;
    const now = new Date();
    const startDate = data.startDate ? new Date(data.startDate) : now;
    const endDate = data.endDate
      ? new Date(data.endDate)
      : new Date(startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate());
    const monthResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const subscription = await prisma.subscription.create({
      data: {
        tenantId,
        planId: data.planId,
        status: SubscriptionStatus.ACTIVE,
        warehouses,
        kitchens,
        waiters,
        calculatedPrice,
        overridePrice: data.overridePrice ?? null,
        totalPrice,
        startDate,
        endDate,
        ordersThisMonth: 0,
        monthResetDate,
        notes: data.notes,
      },
      include: { plan: true },
    });

    return subscription;
  }

  static async updateResources(tenantId: string, data: UpdateResourcesInput) {
    const subscription = await this.getSubscription(tenantId);
    if (!subscription) {
      throw new AppError('Faol obuna topilmadi', 404);
    }
    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new AppError('Obuna faol emas', 400);
    }

    const plan = subscription.plan;
    const warehouses = data.warehouses ?? subscription.warehouses;
    const kitchens = data.kitchens ?? subscription.kitchens;
    const waiters = data.waiters ?? subscription.waiters;

    if (warehouses > plan.maxWarehouses) {
      throw new AppError(`Omborlar soni maksimal ${plan.maxWarehouses} dan oshmasligi kerak`, 400);
    }
    if (kitchens > plan.maxKitchens) {
      throw new AppError(`Oshxonalar soni maksimal ${plan.maxKitchens} dan oshmasligi kerak`, 400);
    }
    if (waiters > plan.maxWaiters) {
      throw new AppError(`Ofitsiantlar soni maksimal ${plan.maxWaiters} dan oshmasligi kerak`, 400);
    }

    const calculatedPrice = this.calculatePrice(
      Number(plan.basePrice),
      Number(plan.pricePerWarehouse),
      Number(plan.pricePerKitchen),
      Number(plan.pricePerWaiter),
      warehouses,
      kitchens,
      waiters
    );

    const totalPrice =
      subscription.overridePrice !== null
        ? Number(subscription.overridePrice)
        : calculatedPrice;

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        warehouses,
        kitchens,
        waiters,
        calculatedPrice,
        totalPrice,
      },
      include: { plan: true },
    });

    return updated;
  }

  static async overridePrice(tenantId: string, data: OverridePriceInput) {
    const subscription = await this.getSubscription(tenantId);
    if (!subscription) {
      throw new AppError('Faol obuna topilmadi', 404);
    }

    const overridePrice = data.overridePrice;
    const totalPrice =
      overridePrice !== null ? overridePrice : Number(subscription.calculatedPrice);

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        overridePrice,
        totalPrice,
        ...(data.notes && { notes: data.notes }),
      },
      include: { plan: true },
    });

    return updated;
  }

  // ============ FOYDALANISH STATISTIKASI ============

  static async getUsage(tenantId: string) {
    const subscription = await this.getSubscription(tenantId);

    const usersCount = await prisma.user.count({
      where: { tenantId, isActive: true },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const ordersThisMonth = await prisma.order.count({
      where: { tenantId, createdAt: { gte: startOfMonth } },
    });

    if (subscription && subscription.status === SubscriptionStatus.ACTIVE) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { ordersThisMonth },
      });
    }

    return {
      subscription: subscription
        ? {
            id: subscription.id,
            plan: subscription.plan.name,
            planId: subscription.planId,
            status: subscription.status,
            totalPrice: subscription.totalPrice,
            calculatedPrice: subscription.calculatedPrice,
            overridePrice: subscription.overridePrice,
            warehouses: subscription.warehouses,
            kitchens: subscription.kitchens,
            waiters: subscription.waiters,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
          }
        : null,
      usage: {
        users: {
          current: usersCount,
          limit: subscription?.plan.maxUsers ?? 0,
        },
        orders: {
          current: ordersThisMonth,
          limit: subscription?.plan.maxOrders ?? 0,
        },
        warehouses: {
          current: subscription?.warehouses ?? 0,
          limit: subscription?.plan.maxWarehouses ?? 0,
        },
        kitchens: {
          current: subscription?.kitchens ?? 0,
          limit: subscription?.plan.maxKitchens ?? 0,
        },
        waiters: {
          current: subscription?.waiters ?? 0,
          limit: subscription?.plan.maxWaiters ?? 0,
        },
      },
      features: {
        hasIntegrations: subscription?.plan.hasIntegrations ?? false,
        hasReports: subscription?.plan.hasReports ?? false,
      },
    };
  }

  // ============ LIMIT TEKSHIRISH (middleware uchun) ============

  static async checkLimit(tenantId: string, feature: string): Promise<{ allowed: boolean; message?: string }> {
    const subscription = await this.getSubscription(tenantId);

    if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
      return { allowed: false, message: 'Faol obuna mavjud emas' };
    }

    const plan = subscription.plan;

    switch (feature) {
      case 'users': {
        const count = await prisma.user.count({ where: { tenantId, isActive: true } });
        if (count >= plan.maxUsers) {
          return {
            allowed: false,
            message: `Foydalanuvchilar limiti tugadi (${count}/${plan.maxUsers})`,
          };
        }
        return { allowed: true };
      }
      case 'orders': {
        if (plan.maxOrders === 0) return { allowed: true };
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const count = await prisma.order.count({
          where: { tenantId, createdAt: { gte: startOfMonth } },
        });
        if (count >= plan.maxOrders) {
          return {
            allowed: false,
            message: `Oylik buyurtmalar limiti tugadi (${count}/${plan.maxOrders})`,
          };
        }
        return { allowed: true };
      }
      case 'integrations': {
        if (!plan.hasIntegrations) {
          return { allowed: false, message: 'Integratsiyalar bu tarif rejasida mavjud emas' };
        }
        return { allowed: true };
      }
      case 'reports': {
        if (!plan.hasReports) {
          return { allowed: false, message: 'Hisobotlar bu tarif rejasida mavjud emas' };
        }
        return { allowed: true };
      }
      default:
        return { allowed: true };
    }
  }

  // ============ BUYURTMA HISOBLAGICH ============

  static async incrementOrderCount(tenantId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId },
    });

    if (subscription && subscription.status === SubscriptionStatus.ACTIVE) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { ordersThisMonth: { increment: 1 } },
      });
    }
  }

  // ============ OYLIK TO'LOV (INVOICE) ============

  private static generateInvoiceNumber(year: number, month: number): string {
    const ts = Date.now().toString(36).toUpperCase();
    return `INV-${year}${String(month).padStart(2, '0')}-${ts}`;
  }

  static async generateInvoice(tenantId: string, data: GenerateInvoiceInput) {
    const subscription = await this.getSubscription(tenantId);
    if (!subscription) {
      throw new AppError('Faol obuna topilmadi', 404);
    }
    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new AppError('Obuna faol emas, hisob-faktura yaratib bo\'lmaydi', 400);
    }

    // Bu oy uchun allaqachon yaratilganmi?
    const existing = await prisma.billingInvoice.findUnique({
      where: {
        subscriptionId_periodYear_periodMonth: {
          subscriptionId: subscription.id,
          periodYear: data.year,
          periodMonth: data.month,
        },
      },
    });

    if (existing) {
      throw new AppError(
        `${data.year}-yil ${data.month}-oy uchun hisob-faktura allaqachon mavjud`,
        400
      );
    }

    const plan = subscription.plan;

    // Xizmatlar tafsilotini hisoblash
    const basePrice = Number(plan.basePrice);
    const warehouseCount = subscription.warehouses;
    const warehousePrice = Number(plan.pricePerWarehouse);
    const warehouseTotal = warehousePrice * warehouseCount;
    const kitchenCount = subscription.kitchens;
    const kitchenPrice = Number(plan.pricePerKitchen);
    const kitchenTotal = kitchenPrice * kitchenCount;
    const waiterCount = subscription.waiters;
    const waiterPrice = Number(plan.pricePerWaiter);
    const waiterTotal = waiterPrice * waiterCount;

    const calculatedAmount = basePrice + warehouseTotal + kitchenTotal + waiterTotal;
    const overrideAmount = data.overrideAmount ?? null;
    const totalAmount = overrideAmount !== null && overrideAmount !== undefined
      ? overrideAmount
      : (subscription.overridePrice !== null
        ? Number(subscription.overridePrice)
        : calculatedAmount);

    // To'lov muddati — keyingi oyning 10-sanasi
    const dueDate = new Date(data.year, data.month, 10);

    const invoice = await prisma.billingInvoice.create({
      data: {
        tenantId,
        subscriptionId: subscription.id,
        invoiceNumber: this.generateInvoiceNumber(data.year, data.month),
        periodYear: data.year,
        periodMonth: data.month,
        status: InvoiceStatus.PENDING,
        basePrice,
        warehouseCount,
        warehousePrice,
        warehouseTotal,
        kitchenCount,
        kitchenPrice,
        kitchenTotal,
        waiterCount,
        waiterPrice,
        waiterTotal,
        calculatedAmount,
        overrideAmount,
        totalAmount,
        dueDate,
        notes: data.notes,
      },
      include: { subscription: { include: { plan: true } } },
    });

    return invoice;
  }

  static async getInvoices(tenantId: string, query: InvoiceQueryInput) {
    const where: Prisma.BillingInvoiceWhereInput = { tenantId };

    if (query.status) {
      where.status = query.status as InvoiceStatus;
    }
    if (query.year) {
      where.periodYear = query.year;
    }
    if (query.month) {
      where.periodMonth = query.month;
    }

    const [invoices, total] = await Promise.all([
      prisma.billingInvoice.findMany({
        where,
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { subscription: { include: { plan: true } } },
      }),
      prisma.billingInvoice.count({ where }),
    ]);

    return {
      invoices,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  static async getInvoiceById(id: string, tenantId: string) {
    const invoice = await prisma.billingInvoice.findFirst({
      where: { id, tenantId },
      include: { subscription: { include: { plan: true } } },
    });

    if (!invoice) {
      throw new AppError('Hisob-faktura topilmadi', 404);
    }

    // Tafsilot breakdown
    const breakdown = {
      basePrice: Number(invoice.basePrice),
      warehouses: {
        count: invoice.warehouseCount,
        pricePerUnit: Number(invoice.warehousePrice),
        total: Number(invoice.warehouseTotal),
      },
      kitchens: {
        count: invoice.kitchenCount,
        pricePerUnit: Number(invoice.kitchenPrice),
        total: Number(invoice.kitchenTotal),
      },
      waiters: {
        count: invoice.waiterCount,
        pricePerUnit: Number(invoice.waiterPrice),
        total: Number(invoice.waiterTotal),
      },
      calculatedAmount: Number(invoice.calculatedAmount),
      overrideAmount: invoice.overrideAmount ? Number(invoice.overrideAmount) : null,
      totalAmount: Number(invoice.totalAmount),
    };

    return { invoice, breakdown };
  }

  static async payInvoice(id: string, tenantId: string, data: PayInvoiceInput) {
    const invoice = await prisma.billingInvoice.findFirst({ where: { id, tenantId } });

    if (!invoice) {
      throw new AppError('Hisob-faktura topilmadi', 404);
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new AppError('Bu hisob-faktura allaqachon to\'langan', 400);
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new AppError('Bekor qilingan hisob-fakturani to\'lab bo\'lmaydi', 400);
    }

    const updated = await prisma.billingInvoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.PAID,
        paidAmount: data.paidAmount,
        paidAt: new Date(),
        paymentMethod: data.paymentMethod,
        ...(data.notes && { notes: data.notes }),
      },
      include: { subscription: { include: { plan: true } } },
    });

    return updated;
  }

  static async cancelInvoice(id: string, tenantId: string) {
    const invoice = await prisma.billingInvoice.findFirst({ where: { id, tenantId } });

    if (!invoice) {
      throw new AppError('Hisob-faktura topilmadi', 404);
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new AppError('To\'langan hisob-fakturani bekor qilib bo\'lmaydi', 400);
    }

    const updated = await prisma.billingInvoice.update({
      where: { id },
      data: { status: InvoiceStatus.CANCELLED },
      include: { subscription: { include: { plan: true } } },
    });

    return updated;
  }

  static async checkOverdueInvoices() {
    const now = new Date();

    const overdueCount = await prisma.billingInvoice.updateMany({
      where: {
        status: InvoiceStatus.PENDING,
        dueDate: { lt: now },
      },
      data: { status: InvoiceStatus.OVERDUE },
    });

    return { updated: overdueCount.count };
  }

  static async getInvoiceSummary(tenantId: string) {
    const subscription = await this.getSubscription(tenantId);

    const [pending, paid, overdue] = await Promise.all([
      prisma.billingInvoice.aggregate({
        where: { tenantId, status: InvoiceStatus.PENDING },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.billingInvoice.aggregate({
        where: { tenantId, status: InvoiceStatus.PAID },
        _sum: { paidAmount: true },
        _count: true,
      }),
      prisma.billingInvoice.aggregate({
        where: { tenantId, status: InvoiceStatus.OVERDUE },
        _sum: { totalAmount: true },
        _count: true,
      }),
    ]);

    return {
      currentMonthlyPrice: subscription ? Number(subscription.totalPrice) : 0,
      pending: {
        count: pending._count,
        totalAmount: Number(pending._sum.totalAmount ?? 0),
      },
      paid: {
        count: paid._count,
        totalPaid: Number(paid._sum.paidAmount ?? 0),
      },
      overdue: {
        count: overdue._count,
        totalAmount: Number(overdue._sum.totalAmount ?? 0),
      },
    };
  }
}
