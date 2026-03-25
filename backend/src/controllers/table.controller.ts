import { Request, Response, NextFunction } from 'express';
import { Server } from 'socket.io';
import { TableService } from '../services/table.service.js';
import { successResponse } from '../utils/response.js';
import { z } from 'zod';

const createTableSchema = z.object({
  number: z.number().int().positive(),
  name: z.string().optional(),
  capacity: z.number().int().positive().default(4),
  positionX: z.number().int().optional(),
  positionY: z.number().int().optional(),
});

const updateTableSchema = z.object({
  name: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  status: z.enum(['FREE', 'OCCUPIED', 'RESERVED', 'CLEANING']).optional(),
  positionX: z.number().int().optional(),
  positionY: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export class TableController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const tables = await TableService.getAll(tenantId);
      return successResponse(res, tables);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const table = await TableService.getById(tenantId, req.params.id);
      return successResponse(res, table);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = createTableSchema.parse(req.body);
      const table = await TableService.create(tenantId, data);
      return successResponse(res, table, 'Stol yaratildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = updateTableSchema.parse(req.body);
      const table = await TableService.update(tenantId, req.params.id, data);

      // Emit socket event
      const io = req.app.get('io') as Server;
      io.emit('table:status', { tableId: table.id, status: table.status });

      return successResponse(res, table, 'Stol yangilandi');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      await TableService.delete(tenantId, req.params.id);
      return successResponse(res, null, 'Stol o\'chirildi');
    } catch (error) {
      next(error);
    }
  }

  static async getQRCode(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const result = await TableService.generateQRCode(tenantId, req.params.id);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  static async getByQRCode(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const table = await TableService.getByQRCode(tenantId, req.params.qrCode);
      return successResponse(res, table);
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { status } = req.body;
      const table = await TableService.updateStatus(tenantId, req.params.id, status);

      // Emit socket event
      const io = req.app.get('io') as Server;
      io.emit('table:status', { tableId: table.id, status: table.status });

      return successResponse(res, table, 'Stol holati yangilandi');
    } catch (error) {
      next(error);
    }
  }
}
