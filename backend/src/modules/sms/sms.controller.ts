import { Request, Response, NextFunction } from 'express';
import { SmsService } from './sms.service.js';
import { successResponse, paginatedResponse } from '../../utils/response.js';
import {
  sendOtpSchema,
  verifyOtpSchema,
  sendSmsSchema,
  broadcastSmsSchema,
  getSmsLogsQuerySchema,
} from './sms.validator.js';

export class SmsController {
  // ==========================================
  // OTP (Public — auth yo'q)
  // ==========================================

  static async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone } = sendOtpSchema.parse(req.body);
      // tenantId header'dan yoki default olish
      const tenantId = req.headers['x-tenant-id'] as string || '';
      const result = await SmsService.sendOtp(tenantId, phone);
      return successResponse(res, result, 'OTP yuborildi');
    } catch (error) {
      next(error);
    }
  }

  static async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, code } = verifyOtpSchema.parse(req.body);
      const result = await SmsService.verifyOtp(phone, code);
      return successResponse(res, result, 'OTP tasdiqlandi');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // SEND SMS (Authenticated)
  // ==========================================

  static async sendSms(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { phone, message, type } = sendSmsSchema.parse(req.body);
      const result = await SmsService._sendSms(phone, message, type, tenantId);
      return successResponse(res, result, 'SMS yuborildi');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // BROADCAST (Authenticated)
  // ==========================================

  static async broadcast(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { phones, message } = broadcastSmsSchema.parse(req.body);
      const result = await SmsService.sendMarketingMessage(tenantId, phones, message);
      return successResponse(res, result, `${result.sent} ta SMS yuborildi`);
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // LOGS & STATS (Authenticated)
  // ==========================================

  static async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const query = getSmsLogsQuerySchema.parse(req.query);
      const result = await SmsService.getSmsLogs(tenantId, query);
      return paginatedResponse(res, result.logs, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  }

  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const stats = await SmsService.getSmsStats(tenantId);
      return successResponse(res, stats);
    } catch (error) {
      next(error);
    }
  }
}
