import { Router, Request, Response } from 'express';
import { prisma } from '@oshxona/database';

const router = Router();

// ==========================================
// QR MENU — Public API (auth yo'q, mijozlar uchun)
// ==========================================

// GET /api/qr-menu/:qrCode — Menyu olish (QR code bo'yicha)
router.get('/:qrCode', async (req: Request, res: Response) => {
  try {
    const { qrCode } = req.params;

    // Stolni QR code bo'yicha topish
    const table = await prisma.table.findFirst({
      where: { qrCode },
      select: {
        id: true,
        number: true,
        name: true,
        capacity: true,
        status: true,
        tenantId: true,
      },
    });

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Stol topilmadi. QR kod noto\'g\'ri.',
      });
    }

    // Tenant (restoran) ma'lumotlari
    const tenant = await prisma.tenant.findUnique({
      where: { id: table.tenantId },
      select: {
        id: true,
        name: true,
        logo: true,
        phone: true,
        address: true,
      },
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Restoran topilmadi.',
      });
    }

    // Kategoriyalar
    const categories = await prisma.category.findMany({
      where: { tenantId: table.tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        nameRu: true,
        nameEn: true,
        image: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    // Mahsulotlar (faqat aktiv)
    const products = await prisma.product.findMany({
      where: { tenantId: table.tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        nameRu: true,
        nameEn: true,
        description: true,
        descriptionRu: true,
        descriptionEn: true,
        price: true,
        image: true,
        images: true,
        categoryId: true,
        weight: true,
        weightUnit: true,
        calories: true,
        cookingTime: true,
        isFeatured: true,
        sortOrder: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    res.json({
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          logo: tenant.logo,
          phone: tenant.phone,
          address: tenant.address,
        },
        table: {
          id: table.id,
          number: table.number,
          name: table.name,
        },
        categories,
        products: products.map((p) => ({
          ...p,
          price: Number(p.price),
          weight: p.weight ? Number(p.weight) : null,
        })),
      },
    });
  } catch (error) {
    console.error('[QR Menu] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Menyu yuklanmadi.',
    });
  }
});

// POST /api/qr-menu/order — Buyurtma berish (mijoz)
router.post('/order', async (req: Request, res: Response) => {
  try {
    const { tableId, items, customerName, customerPhone } = req.body;

    if (!tableId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Stol va kamida 1 ta mahsulot tanlang.',
      });
    }

    // Stolni tekshirish
    const table = await prisma.table.findUnique({
      where: { id: tableId },
      select: { id: true, number: true, tenantId: true },
    });

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Stol topilmadi.',
      });
    }

    const tenantId = table.tenantId;

    // Mahsulotlarni tekshirish va narxlarni olish
    const productIds = items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, tenantId, isActive: true },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Ba\'zi mahsulotlar topilmadi yoki faol emas.',
      });
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Jami hisoblash
    let subtotal = 0;
    const orderItems = items.map((item: any) => {
      const product = productMap.get(item.productId)!;
      const price = Number(product.price);
      const quantity = Math.max(1, Math.min(99, parseInt(item.quantity) || 1));
      const total = price * quantity;
      subtotal += total;

      return {
        productId: product.id,
        quantity,
        price,
        total,
        notes: item.notes || null,
      };
    });

    // Mijozni topish yoki yaratish
    let customerId: string | null = null;
    if (customerPhone) {
      const existing = await prisma.customer.findFirst({
        where: { phone: customerPhone, tenantId },
      });
      if (existing) {
        customerId = existing.id;
      } else {
        const newCustomer = await prisma.customer.create({
          data: {
            phone: customerPhone,
            firstName: customerName || 'QR Mijoz',
            tenantId,
          },
        });
        customerId = newCustomer.id;
      }
    }

    // Buyurtma raqami
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const count = await prisma.order.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        },
      },
    });
    const orderNumber = `QR-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    // System user (QR orders uchun)
    const systemUser = await prisma.user.findFirst({
      where: { tenantId, role: 'MANAGER' },
      select: { id: true },
    });

    if (!systemUser) {
      return res.status(500).json({
        success: false,
        message: 'Tizim xatoligi: manager topilmadi.',
      });
    }

    // Buyurtma yaratish
    const order = await prisma.order.create({
      data: {
        orderNumber,
        source: 'QR_ORDER',
        type: 'DINE_IN',
        status: 'NEW',
        tableId: table.id,
        customerId,
        userId: systemUser.id,
        subtotal,
        total: subtotal,
        tenantId,
        items: {
          create: orderItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
            notes: item.notes,
            status: 'PENDING',
          })),
        },
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true } },
          },
        },
        table: { select: { id: true, number: true, name: true } },
      },
    });

    // Stol band qilish
    await prisma.table.update({
      where: { id: table.id },
      data: { status: 'OCCUPIED' },
    });

    res.status(201).json({
      success: true,
      message: 'Buyurtmangiz qabul qilindi!',
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        table: order.table,
        items: order.items.map((i) => ({
          name: i.product.name,
          quantity: i.quantity,
          price: Number(i.price),
        })),
        total: Number(order.total),
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error('[QR Menu] Order error:', error);
    res.status(500).json({
      success: false,
      message: 'Buyurtma yaratishda xatolik.',
    });
  }
});

// GET /api/qr-menu/order/:id — Buyurtma holatini tekshirish
router.get('/order/:id', async (req: Request, res: Response) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        createdAt: true,
        table: { select: { number: true, name: true } },
        items: {
          select: {
            quantity: true,
            price: true,
            status: true,
            product: { select: { name: true } },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Buyurtma topilmadi.',
      });
    }

    res.json({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: Number(order.total),
        createdAt: order.createdAt,
        table: order.table,
        items: order.items.map((i) => ({
          name: i.product.name,
          quantity: i.quantity,
          price: Number(i.price),
          status: i.status,
        })),
      },
    });
  } catch (error) {
    console.error('[QR Menu] Status error:', error);
    res.status(500).json({
      success: false,
      message: 'Holat tekshirishda xatolik.',
    });
  }
});

export default router;
