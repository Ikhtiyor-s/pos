import { Request, Response, NextFunction } from 'express';
import { Server } from 'socket.io';
import { OrderService } from '../services/order.service.js';
import { PaymentService } from '../services/payment.service.js';
import { nonborSyncService } from '../services/nonbor-sync.service.js';
import { IntegrationService } from '../services/integration.service.js';
import { PrinterService } from '../modules/printer/printer.service.js';
import { OrderLifecycleService } from '../modules/order-lifecycle/order-lifecycle.service.js';
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
      const { page, limit, status, type, source, tableId, userId, startDate, endDate } = req.query;

      const result = await OrderService.getAll(tenantId, {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        status: status as any,
        type: type as any,
        source: source as string,
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

      // Unified Order Lifecycle — auto-transitions + broadcast + print
      OrderLifecycleService.onOrderCreated(tenantId, order).catch(console.error);

      // Integration Hub
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

      // Unified Lifecycle Engine orqali transition
      const result = await OrderLifecycleService.transitionStatus(
        tenantId, req.params.id, status, req.user!.id
      );

      if (!result.success) {
        return res.status(400).json({ success: false, message: result.message });
      }

      const order = result.order;

      // Nonbor sync (agar kerak bo'lsa)
      if ((order as any).isNonborOrder && (order as any).nonborOrderId) {
        nonborSyncService.syncStatusToNonbor({
          id: order.id,
          status: order.status,
          nonborOrderId: (order as any).nonborOrderId,
          isNonborOrder: true,
        }).catch((err: any) => console.error('[Nonbor] Status sync xatolik:', err));
      }

      // Integration Hub
      const integrationEvent = status === 'CANCELLED' ? 'order:cancelled'
        : status === 'COMPLETED' ? 'order:completed'
        : 'order:status';
      IntegrationService.dispatchEvent(integrationEvent, { orderId: order.id, status: order.status, order }).catch(console.error);

      return successResponse(res, order, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async updateItemStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { status } = updateOrderItemStatusSchema.parse(req.body);

      // Unified Lifecycle — item status + auto-advance to READY
      const result = await OrderLifecycleService.onItemStatusChange(
        tenantId,
        req.params.orderId,
        req.params.itemId,
        status
      );

      const msg = result.autoAdvanced
        ? 'Element holati yangilandi, buyurtma TAYYOR'
        : 'Element holati yangilandi';

      return successResponse(res, result.order, msg);
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

  static async updateItemQuantity(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { quantity } = req.body;
      if (typeof quantity !== 'number') {
        return res.status(400).json({ success: false, message: 'quantity raqam bo\'lishi kerak' });
      }
      const order = await OrderService.updateItemQuantity(tenantId, req.params.id, req.params.itemId, quantity);
      const io = req.app.get('io') as Server;
      io.to('kitchen').emit('order:updated', order);
      io.to('pos').emit('order:updated', order);
      io.to('waiter').emit('order:updated', order);
      return successResponse(res, order, 'Element yangilandi');
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

      // Unified Lifecycle — broadcast + auto-print receipt
      OrderLifecycleService.onPaymentReceived(tenantId, orderId, { method, amount }).catch(console.error);

      return successResponse(res, order, 'To\'lov qabul qilindi');
    } catch (error) {
      next(error);
    }
  }
}
