import { Request, Response, NextFunction } from 'express';
import { StaffSchedulingService } from './staff.service.js';
import { successResponse, paginatedResponse } from '../../utils/response.js';
import {
  createShiftSchema,
  getShiftsQuerySchema,
  updateShiftSchema,
  getAttendanceQuerySchema,
  calculatePayrollSchema,
  getPayrollQuerySchema,
  weeklyScheduleQuerySchema,
} from './staff.validator.js';

export class StaffController {
  // ==========================================
  // SHIFTS
  // ==========================================

  static async createShift(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = createShiftSchema.parse(req.body);
      const shift = await StaffSchedulingService.createShift(tenantId, data);
      return successResponse(res, shift, 'Smena yaratildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getShifts(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const query = getShiftsQuerySchema.parse(req.query);
      const result = await StaffSchedulingService.getShifts(tenantId, query);
      return paginatedResponse(res, result.shifts, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }

  static async updateShift(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = updateShiftSchema.parse(req.body);
      const shift = await StaffSchedulingService.updateShift(tenantId, req.params.id, data);
      return successResponse(res, shift, 'Smena yangilandi');
    } catch (error) {
      next(error);
    }
  }

  static async deleteShift(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const result = await StaffSchedulingService.deleteShift(tenantId, req.params.id);
      return successResponse(res, result, 'Smena o\'chirildi');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // CLOCK IN / OUT
  // ==========================================

  static async clockIn(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const userId = req.user!.id;
      const result = await StaffSchedulingService.clockIn(tenantId, userId);
      return successResponse(res, result, result.isLate ? 'Ishga kirdingiz (kechikish bilan)' : 'Ishga kirdingiz');
    } catch (error) {
      next(error);
    }
  }

  static async clockOut(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const userId = req.user!.id;
      const result = await StaffSchedulingService.clockOut(tenantId, userId);
      return successResponse(res, result, `Ishdan chiqdingiz. Jami: ${result.hours} soat`);
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // ATTENDANCE
  // ==========================================

  static async getAttendance(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const query = getAttendanceQuerySchema.parse(req.query);
      const result = await StaffSchedulingService.getAttendance(tenantId, query);
      return paginatedResponse(res, result.records, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // PAYROLL
  // ==========================================

  static async calculatePayroll(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = calculatePayrollSchema.parse(req.body);
      const result = await StaffSchedulingService.calculatePayroll(
        tenantId,
        data.userId,
        data.periodStart,
        data.periodEnd,
        data.baseSalary
      );
      return successResponse(res, result, 'Payroll hisoblandi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getPayroll(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const query = getPayrollQuerySchema.parse(req.query);
      const result = await StaffSchedulingService.getPayroll(tenantId, query);
      return paginatedResponse(res, result.payrolls, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }

  static async markPayrollPaid(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const payroll = await StaffSchedulingService.markPayrollPaid(tenantId, req.params.id);
      return successResponse(res, payroll, 'Payroll to\'landi deb belgilandi');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // DASHBOARD
  // ==========================================

  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const dashboard = await StaffSchedulingService.getStaffDashboard(tenantId);
      return successResponse(res, dashboard);
    } catch (error) {
      next(error);
    }
  }

  static async getWeeklySchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { weekStart } = weeklyScheduleQuerySchema.parse(req.query);
      const schedule = await StaffSchedulingService.getWeeklySchedule(tenantId, weekStart);
      return successResponse(res, schedule);
    } catch (error) {
      next(error);
    }
  }
}
