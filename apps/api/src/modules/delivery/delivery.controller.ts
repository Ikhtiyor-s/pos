import { Request, Response, NextFunction } from 'express';
import { DeliveryService } from './delivery.service.js';
import { successResponse, paginatedResponse } from '../../utils/response.js';
import {
  createDeliverySchema,
  assignDriverSchema,
  deliveredSchema,
  failedSchema,
  createDriverSchema,
  updateDriverStatusSchema,
  getDriversQuerySchema,
  getDeliveriesQuerySchema,
  getDeliveryStatsQuerySchema,
} from './delivery.validator.js';

export class DeliveryController {
  // ==========================================
  // DRIVERS
  // ==========================================

  static async createDriver(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = createDriverSchema.parse(req.body);
      const driver = await DeliveryService.createDriver(tenantId, data);
      return successResponse(res, driver, 'Haydovchi qo\'shildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getDrivers(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const query = getDriversQuerySchema.parse(req.query);
      const drivers = await DeliveryService.getDrivers(tenantId, {
        status: query.status as any,
      });
      return successResponse(res, drivers);
    } catch (error) {
      next(error);
    }
  }

  static async updateDriverStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { status } = updateDriverStatusSchema.parse(req.body);
      const driver = await DeliveryService.updateDriverStatus(tenantId, req.params.id, status as any);
      return successResponse(res, driver, 'Haydovchi statusi yangilandi');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // DELIVERIES
  // ==========================================

  static async createDelivery(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = createDeliverySchema.parse(req.body);
      const delivery = await DeliveryService.createDelivery(tenantId, data.orderId, {
        deliveryAddress: data.deliveryAddress,
        customerPhone: data.customerPhone,
        pickupAddress: data.pickupAddress,
        distance: data.distance,
        deliveryFee: data.deliveryFee,
        notes: data.notes,
      });
      return successResponse(res, delivery, 'Yetkazib berish yaratildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getDeliveries(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const query = getDeliveriesQuerySchema.parse(req.query);
      const result = await DeliveryService.getAllDeliveries(tenantId, query);
      return paginatedResponse(res, result.deliveries, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }

  static async getActiveDeliveries(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const deliveries = await DeliveryService.getActiveDeliveries(tenantId);
      return successResponse(res, deliveries);
    } catch (error) {
      next(error);
    }
  }

  static async getDeliveryById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const delivery = await DeliveryService.getById(tenantId, req.params.id);
      return successResponse(res, delivery);
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // STATUS TRANSITIONS
  // ==========================================

  static async assignDriver(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { driverId } = assignDriverSchema.parse(req.body);
      const delivery = await DeliveryService.assignDriver(tenantId, req.params.id, driverId);
      return successResponse(res, delivery, 'Haydovchi tayinlandi');
    } catch (error) {
      next(error);
    }
  }

  static async pickUp(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const delivery = await DeliveryService.pickUp(tenantId, req.params.id);
      return successResponse(res, delivery, 'Buyurtma olindi');
    } catch (error) {
      next(error);
    }
  }

  static async inTransit(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const delivery = await DeliveryService.inTransit(tenantId, req.params.id);
      return successResponse(res, delivery, 'Buyurtma yo\'lda');
    } catch (error) {
      next(error);
    }
  }

  static async delivered(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { rating } = deliveredSchema.parse(req.body);
      const delivery = await DeliveryService.delivered(tenantId, req.params.id, rating);
      return successResponse(res, delivery, 'Buyurtma yetkazib berildi');
    } catch (error) {
      next(error);
    }
  }

  static async failed(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { reason } = failedSchema.parse(req.body);
      const delivery = await DeliveryService.failed(tenantId, req.params.id, reason);
      return successResponse(res, delivery, 'Yetkazib berish muvaffaqiyatsiz');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // STATS
  // ==========================================

  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { dateFrom, dateTo } = getDeliveryStatsQuerySchema.parse(req.query);
      const stats = await DeliveryService.getDeliveryStats(tenantId, dateFrom, dateTo);
      return successResponse(res, stats);
    } catch (error) {
      next(error);
    }
  }
}
