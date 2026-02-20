import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '../services/customer.service.js';
import { successResponse, paginatedResponse } from '../utils/response.js';
import { z } from 'zod';

const createCustomerSchema = z.object({
  phone: z.string().min(1, 'Telefon raqam kiritilishi shart'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
});

const updateCustomerSchema = z.object({
  phone: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
  bonusPoints: z.number().optional(),
  isActive: z.boolean().optional(),
});

export class CustomerController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const { search, page, limit } = req.query;
      const result = await CustomerService.getAll(tenantId, {
        search: search as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      return paginatedResponse(
        res,
        result.customers,
        Number(page) || 1,
        Number(limit) || 50,
        result.total
      );
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const customer = await CustomerService.getById(tenantId, req.params.id);
      return successResponse(res, customer);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = createCustomerSchema.parse(req.body);
      const customer = await CustomerService.create(tenantId, data);
      return successResponse(res, customer, 'Mijoz yaratildi', 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      const data = updateCustomerSchema.parse(req.body);
      const customer = await CustomerService.update(tenantId, req.params.id, data);
      return successResponse(res, customer, 'Mijoz yangilandi');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId!;
      await CustomerService.delete(tenantId, req.params.id);
      return successResponse(res, null, 'Mijoz o\'chirildi');
    } catch (error) {
      next(error);
    }
  }
}
