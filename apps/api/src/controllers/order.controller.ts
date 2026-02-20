import { Request, Response, NextFunction } from 'express';
import { Server } from 'socket.io';
import { OrderService } from '../services/order.service.js';
import { PaymentService } from '../services/payment.service.js';
import { nonborSyncService } from '../services/nonbor-sync.service.js';
import { IntegrationService } from '../services/integration.service.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js';
import {
  createOrderSchema,
  updateOrderSchema,
  updateOrderItemStatusSchema,
  addOrderItemsSchema,
} from '../validators/order.validator.js';
import { z } from 'zod';

const addPaymentSchema = z.object({
  method: z.enum(['CASH', 'CARD', 'PAYME', 'CLICK', 'UZUM', 'HUMO', 'OTHER']),
  amount: z.number().positive(),
  reference: z.string().optional(),
});

export class OrderController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { page, limit, status, type, tableId, userId, startDate, endDate } = req.query;

      const result = await OrderService.getAll(tenantId, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        status: status as any,
        type: type as any,
        tableId: tableId as string,
        userId: userId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      return paginatedResponse(res, result.orders, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const order = await OrderService.getById(tenantId, req.params.id);
      return successResponse(res, order);
    } catch (error) {
      next(error);
    }
  }

  static async getKitchenOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const orders = await OrderService.getKitchenOrders(tenantId);
      return successResponse(res, orders);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = createOrderSchema.parse(req.body);
      const order = await OrderService.create(tenantId, data, req.user!.id);

      // Emit socket event to all relevant rooms
      const io = req.app.get('io') as Server;
      io.to('kitchen').emit('order:new', order);
      io.to('pos').emit('order:new', order);
      io.to('admin').emit('order:new', order);
      io.to('waiter').emit('order:new', order);

      // Integration Hub — barcha integratsiyalarga event dispatch
      IntegrationService.dispatchEvent('order:new', order).catch(console.error);

      return successResponse(res, order, 'Buyurtma yaratildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { status } = updateOrderSchema.parse(req.body);

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status kiritilishi shart',
        });
      }

      const order = await OrderService.updateStatus(tenantId, req.params.id, status);

      // Emit socket event
      const io = req.app.get('io') as Server;
      io.emit('order:status', { orderId: order.id, status: order.status });

      // Nonbor buyurtma bo'lsa, statusni Nonborga sync qilish
      if ((order as any).isNonborOrder && (order as any).nonborOrderId) {
        nonborSyncService.syncStatusToNonbor({
          id: order.id,
          status: order.status,
          nonborOrderId: (order as any).nonborOrderId,
          isNonborOrder: true,
        }).catch((err) => console.error('[Nonbor] Status sync xatolik:', err));
      }

      // Integration Hub — barcha integratsiyalarga event dispatch
      const integrationEvent = status === 'CANCELLED' ? 'order:cancelled'
        : status === 'COMPLETED' ? 'order:completed'
        : 'order:status';
      IntegrationService.dispatchEvent(integrationEvent, { orderId: order.id, status: order.status, order }).catch(console.error);

      return successResponse(res, order, 'Buyurtma holati yangilandi');
    } catch (error) {
      next(error);
    }
  }

  static async updateItemStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { status } = updateOrderItemStatusSchema.parse(req.body);
      const item = await OrderService.updateItemStatus(
        tenantId,
        req.params.orderId,
        req.params.itemId,
        status
      );

      // Emit socket event
      const io = req.app.get('io') as Server;
      io.emit('order:item:status', {
        orderId: req.params.orderId,
        itemId: item.id,
        status: item.status,
      });

      return successResponse(res, item, 'Element holati yangilandi');
    } catch (error) {
      next(error);
    }
  }

  static async addItems(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { items } = addOrderItemsSchema.parse(req.body);
      const order = await OrderService.addItems(tenantId, req.params.id, items);

      // Emit socket event to all relevant rooms
      const io = req.app.get('io') as Server;
      io.to('kitchen').emit('order:updated', order);
      io.to('pos').emit('order:updated', order);
      io.to('waiter').emit('order:updated', order);

      return successResponse(res, order, 'Elementlar qo\'shildi');
    } catch (error) {
      next(error);
    }
  }

  // Kassir to'lov qabul qilish
  static async addPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const orderId = req.params.id;
      const { method, amount, reference } = addPaymentSchema.parse(req.body);

      // Buyurtmani tekshirish
      const orderInfo = await PaymentService.findOrderForPayment(orderId, amount, tenantId);
      if (!orderInfo) {
        return errorResponse(res, 'Buyurtma topilmadi', 404);
      }

      if (orderInfo.remaining <= 0) {
        return errorResponse(res, 'Buyurtma allaqachon to\'liq to\'langan');
      }

      if (amount > orderInfo.remaining) {
        return errorResponse(res, `To'lov summasi qoldiqdan oshmasligi kerak. Qoldiq: ${orderInfo.remaining} UZS`);
      }

      // Payment yaratish
      const payment = await PaymentService.createPayment({
        orderId,
        method: method as any,
        amount,
        reference,
      });

      // Naqd va karta to'lovlar darhol COMPLETED
      if (['CASH', 'CARD', 'HUMO', 'OTHER'].includes(method)) {
        await PaymentService.completePayment(payment.id);
      }

      // Yangilangan buyurtma qaytarish
      const order = await OrderService.getById(tenantId, orderId);

      // Socket event
      const io = req.app.get('io') as Server;
      io.emit('order:payment', { orderId, method, amount });

      return successResponse(res, order, 'To\'lov qabul qilindi');
    } catch (error) {
      next(error);
    }
  }
}
