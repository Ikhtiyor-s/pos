import { Request, Response, NextFunction } from 'express';
import { ReservationService } from './reservation.service.js';
import { successResponse, paginatedResponse } from '../../utils/response.js';
import {
  createReservationSchema,
  getReservationsQuerySchema,
  cancelReservationSchema,
  availableSlotsQuerySchema,
} from './reservation.validator.js';

export class ReservationController {
  // ==========================================
  // CRUD
  // ==========================================

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = createReservationSchema.parse(req.body);
      const reservation = await ReservationService.create(tenantId, data);
      return successResponse(res, reservation, 'Bron yaratildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const query = getReservationsQuerySchema.parse(req.query);
      const result = await ReservationService.getAll(tenantId, query);
      return paginatedResponse(res, result.reservations, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const reservation = await ReservationService.getById(tenantId, req.params.id);
      return successResponse(res, reservation);
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // STATUS
  // ==========================================

  static async confirm(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const reservation = await ReservationService.confirm(tenantId, req.params.id);
      return successResponse(res, reservation, 'Bron tasdiqlandi');
    } catch (error) {
      next(error);
    }
  }

  static async seat(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const reservation = await ReservationService.seat(tenantId, req.params.id);
      return successResponse(res, reservation, 'Mehmon joylashtirildi');
    } catch (error) {
      next(error);
    }
  }

  static async complete(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const reservation = await ReservationService.complete(tenantId, req.params.id);
      return successResponse(res, reservation, 'Bron yakunlandi');
    } catch (error) {
      next(error);
    }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { reason } = cancelReservationSchema.parse(req.body);
      const reservation = await ReservationService.cancel(tenantId, req.params.id, reason);
      return successResponse(res, reservation, 'Bron bekor qilindi');
    } catch (error) {
      next(error);
    }
  }

  static async noShow(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const reservation = await ReservationService.noShow(tenantId, req.params.id);
      return successResponse(res, reservation, 'NO_SHOW belgilandi');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // QUERIES
  // ==========================================

  static async getAvailableSlots(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { date, guests } = availableSlotsQuerySchema.parse(req.query);
      const slots = await ReservationService.getAvailableSlots(tenantId, date, guests);
      return successResponse(res, slots);
    } catch (error) {
      next(error);
    }
  }

  static async getTodayReservations(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const reservations = await ReservationService.getTodayReservations(tenantId);
      return successResponse(res, reservations);
    } catch (error) {
      next(error);
    }
  }

  static async lookupByCode(req: Request, res: Response, next: NextFunction) {
    try {
      const reservation = await ReservationService.getByConfirmationCode(req.params.code);
      return successResponse(res, reservation);
    } catch (error) {
      next(error);
    }
  }

  static async sendReminder(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const reservation = await ReservationService.sendReminder(tenantId, req.params.id);
      return successResponse(res, reservation, 'Eslatma yuborildi');
    } catch (error) {
      next(error);
    }
  }
}
