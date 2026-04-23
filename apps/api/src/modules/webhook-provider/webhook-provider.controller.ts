import { Request, Response, NextFunction } from 'express';
import { Server } from 'socket.io';
import { prisma } from '@oshxona/database';
import { successResponse, errorResponse, paginatedResponse } from '../../utils/response.js';
import {
  listProviders, getProvider, createProvider, updateProvider, deleteProvider,
  getRetryQueue, processWebhookOrder, enqueueRetry, verifyWebhookSignature,
} from './webhook-provider.service.js';
import { getPlatformConfig, CUSTOM_CONFIG, type FieldMapping } from './webhook-configs.js';

export class WebhookProviderController {
  // ============ CRUD ============

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const providers = await listProviders(req.user!.tenantId!);
      return successResponse(res, providers);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const provider = await getProvider(req.user!.tenantId!, req.params.id);
      if (!provider) return errorResponse(res, 'Provider topilmadi', 404);
      return successResponse(res, provider);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { providerName, secret, fieldMapping, statusMapping, notes } = req.body;
      if (!providerName) return errorResponse(res, 'providerName majburiy');

      const validNames = ['YANDEX_EATS', 'DELIVERY_CLUB', 'EXPRESS24', 'OLX_FOOD', 'CUSTOM'];
      if (!validNames.includes(providerName)) {
        return errorResponse(res, `providerName noto'g'ri. Mumkin: ${validNames.join(', ')}`);
      }

      const existing = await prisma.webhookProvider.findFirst({
        where: { tenantId: req.user!.tenantId!, providerName },
      });
      if (existing) return errorResponse(res, 'Bu platforma allaqachon qo\'shilgan', 409);

      const provider = await createProvider(req.user!.tenantId!, {
        providerName, secret, fieldMapping, statusMapping, notes,
      });

      return successResponse(res, provider, 'Webhook provider qo\'shildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const provider = await getProvider(req.user!.tenantId!, req.params.id);
      if (!provider) return errorResponse(res, 'Provider topilmadi', 404);

      const { isActive, secret, fieldMapping, statusMapping, notes } = req.body;
      const updated = await updateProvider(req.params.id, { isActive, secret, fieldMapping, statusMapping, notes });
      return successResponse(res, updated, 'Webhook provider yangilandi');
    } catch (error) {
      next(error);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const provider = await getProvider(req.user!.tenantId!, req.params.id);
      if (!provider) return errorResponse(res, 'Provider topilmadi', 404);

      await deleteProvider(req.params.id);
      return successResponse(res, null, 'Webhook provider o\'chirildi');
    } catch (error) {
      next(error);
    }
  }

  // ============ PRE-BUILT CONFIG ============

  static async getDefaultConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const { providerName } = req.params;
      const config = getPlatformConfig(providerName) || CUSTOM_CONFIG;
      return successResponse(res, config);
    } catch (error) {
      next(error);
    }
  }

  // ============ RETRY QUEUE ============

  static async getQueue(req: Request, res: Response, next: NextFunction) {
    try {
      const provider = await getProvider(req.user!.tenantId!, req.params.id);
      if (!provider) return errorResponse(res, 'Provider topilmadi', 404);

      const resolved = req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined;
      const queue = await getRetryQueue(req.params.id, resolved);
      return successResponse(res, queue);
    } catch (error) {
      next(error);
    }
  }

  // ============ INCOMING WEBHOOK (auth yo'q) ============
  // POST /api/webhook-providers/incoming/:providerName/:tenantSlug

  static async receive(req: Request, res: Response, next: NextFunction) {
    try {
      const { providerName, tenantSlug } = req.params;
      const payload = req.body;
      const rawBody = JSON.stringify(payload);

      // 1. Tenant topish
      const tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug },
        select: { id: true, isActive: true },
      });

      if (!tenant || !tenant.isActive) {
        return res.status(404).json({ success: false, error: 'Tenant topilmadi' });
      }

      // 2. Provider topish
      const provider = await prisma.webhookProvider.findFirst({
        where: { tenantId: tenant.id, providerName: providerName as any, isActive: true },
      });

      if (!provider) {
        return res.status(404).json({ success: false, error: 'Provider topilmadi yoki faol emas' });
      }

      // 3. Signature tekshirish
      if (provider.secret) {
        const signature = (
          req.headers['x-signature']
          || req.headers['x-webhook-signature']
          || req.headers['x-hub-signature-256']
        ) as string | undefined;

        if (signature) {
          const cleanSig = signature.replace(/^sha256=/, '');
          const valid = verifyWebhookSignature(rawBody, cleanSig, provider.secret);
          if (!valid) {
            console.warn(`[WebhookProvider] Invalid signature: ${providerName}/${tenantSlug}`);
            return res.status(401).json({ success: false, error: 'Invalid signature' });
          }
        }
      }

      // 4. Config olish (custom yoki pre-built)
      const config = provider.fieldMapping
        ? { fieldMapping: provider.fieldMapping as unknown as FieldMapping }
        : (getPlatformConfig(providerName) || CUSTOM_CONFIG);

      // 5. Darhol 200 qaytarish (async qayta ishlash)
      res.status(200).json({ success: true, received: true });

      // 6. Buyurtma qayta ishlash (background)
      const result = await processWebhookOrder(
        tenant.id,
        provider.id,
        providerName,
        payload,
        config.fieldMapping,
      );

      if (result.success) {
        // Socket.IO ga yuborish
        const io = req.app.get('io') as Server | undefined;
        if (io) {
          io.to(`tenant:${tenant.id}:pos`).emit('order:new', { source: 'WEBHOOK', providerName, orderId: result.orderId });
          io.to(`tenant:${tenant.id}:kitchen`).emit('order:new', { source: 'WEBHOOK', providerName });
        }
        console.log(`[WebhookProvider] ${providerName}/${tenantSlug} → order ${result.orderId}`);
      } else {
        console.error(`[WebhookProvider] ${providerName}/${tenantSlug} xato: ${result.error}`);
        await enqueueRetry(provider.id, payload);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[WebhookProvider] receive xatosi:', message);
      if (!res.headersSent) {
        return res.status(500).json({ success: false, error: message });
      }
    }
  }

  // ============ TEST (provider ni sinab ko'rish) ============

  static async test(req: Request, res: Response, next: NextFunction) {
    try {
      const provider = await getProvider(req.user!.tenantId!, req.params.id);
      if (!provider) return errorResponse(res, 'Provider topilmadi', 404);

      const testPayload = req.body.payload || generateTestPayload(provider.providerName);

      const config = provider.fieldMapping
        ? { fieldMapping: provider.fieldMapping as unknown as FieldMapping }
        : (getPlatformConfig(provider.providerName) || CUSTOM_CONFIG);

      const result = await processWebhookOrder(
        req.user!.tenantId!,
        provider.id,
        provider.providerName,
        testPayload,
        config.fieldMapping,
      );

      return successResponse(res, { ...result, testPayload }, result.success ? 'Test muvaffaqiyatli' : 'Test xatosi');
    } catch (error) {
      next(error);
    }
  }

  // ============ AVAILABLE PROVIDERS LIST ============

  static async getAvailableProviders(_req: Request, res: Response, next: NextFunction) {
    try {
      const providers = [
        { name: 'YANDEX_EATS', label: 'Yandex Eats', country: 'RU' },
        { name: 'DELIVERY_CLUB', label: 'Delivery Club', country: 'RU' },
        { name: 'EXPRESS24', label: 'Express24', country: 'UZ' },
        { name: 'OLX_FOOD', label: 'OLX Food', country: 'UZ' },
        { name: 'CUSTOM', label: 'Maxsus (Custom)', country: 'ANY' },
      ];
      return successResponse(res, providers);
    } catch (error) {
      next(error);
    }
  }
}

// ==========================================
// TEST PAYLOAD GENERATOR
// ==========================================

function generateTestPayload(providerName: string): any {
  const base = {
    YANDEX_EATS: {
      order_nr: `TEST-${Date.now()}`,
      user_info: { name: 'Test Foydalanuvchi', phone: '+998901234567' },
      delivery_info: { address: { full: 'Toshkent, Chilonzor 3' } },
      cart: {
        items: [{ id: 'p1', name: 'Palov', quantity: 2, price: { value: 25000 }, total_price: 50000 }],
        total_price: 50000,
      },
      pricing: { total: 50000 },
      user_comment: 'Test buyurtma',
    },
    DELIVERY_CLUB: {
      order: {
        uuid: `TEST-${Date.now()}`,
        client_name: 'Test Foydalanuvchi',
        client_phone: '+998901234567',
        delivery_address: 'Toshkent, Yunusobod 5',
        items: [{ external_id: 'p1', name: 'Lag\'mon', count: 1, price: 30000, total_price: 30000 }],
        total_amount: 30000,
        comment: 'Test',
      },
    },
    EXPRESS24: {
      id: `TEST-${Date.now()}`,
      client: { name: 'Test Foydalanuvchi', phone: '+998901234567' },
      address: 'Toshkent, Mirzo Ulug\'bek 7',
      products: [{ product_id: 'p1', name: 'Shashlik', quantity: 3, price: 20000, amount: 60000 }],
      total: 60000,
      comment: 'Test buyurtma',
    },
    OLX_FOOD: {
      order_id: `TEST-${Date.now()}`,
      buyer_name: 'Test Foydalanuvchi',
      buyer_phone: '+998901234567',
      delivery_address: 'Toshkent, Shayxontohur 2',
      order_items: [{ product_id: 'p1', product_name: 'Manti', quantity: 10, unit_price: 5000, total_price: 50000 }],
      total_price: 50000,
    },
    CUSTOM: {
      id: `TEST-${Date.now()}`,
      customer_name: 'Test Foydalanuvchi',
      customer_phone: '+998901234567',
      delivery_address: 'Toshkent shahar',
      items: [{ id: 'p1', name: 'Osh', quantity: 2, price: 25000, total: 50000 }],
      total_amount: 50000,
    },
  };

  return (base as any)[providerName] || base.CUSTOM;
}
