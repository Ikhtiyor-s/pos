import { Request, Response, NextFunction } from 'express';
import { Server } from 'socket.io';
import { OrderService } from '../services/order.service.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import {
  createOrderSchema,
  updateOrderSchema,
  updateOrderItemStatusSchema,
  addOrderItemsSchema,
} from '../validators/order.validator.js';

export class OrderController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, status, type, tableId, userId, startDate, endDate } = req.query;

      const result = await OrderService.getAll({
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
      const order = await OrderService.getById(req.params.id);
      return successResponse(res, order);
    } catch (error) {
      next(error);
    }
  }

  static async getKitchenOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const orders = await OrderService.getKitchenOrders();
      return successResponse(res, orders);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createOrderSchema.parse(req.body);
      const order = await OrderService.create(data, req.user!.id);

      // Emit socket event
      const io = req.app.get('io') as Server;
      io.to('kitchen').emit('order:new', order);
      io.to('admin').emit('order:new', order);

      return successResponse(res, order, 'Buyurtma yaratildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = updateOrderSchema.parse(req.body);

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status kiritilishi shart',
        });
      }

      const order = await OrderService.updateStatus(req.params.id, status);

      // Emit socket event
      const io = req.app.get('io') as Server;
      io.emit('order:status', { orderId: order.id, status: order.status });

      return successResponse(res, order, 'Buyurtma holati yangilandi');
    } catch (error) {
      next(error);
    }
  }

  static async updateItemStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = updateOrderItemStatusSchema.parse(req.body);
      const item = await OrderService.updateItemStatus(
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
      const { items } = addOrderItemsSchema.parse(req.body);
      const order = await OrderService.addItems(req.params.id, items);

      // Emit socket event
      const io = req.app.get('io') as Server;
      io.to('kitchen').emit('order:updated', order);

      return successResponse(res, order, 'Elementlar qo\'shildi');
    } catch (error) {
      next(error);
    }
  }
}
