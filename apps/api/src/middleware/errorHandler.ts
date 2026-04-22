import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  INVENTORY_INSUFFICIENT: 'INVENTORY_INSUFFICIENT',
  ORDER_INVALID_STATUS: 'ORDER_INVALID_STATUS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code: ErrorCode;

  constructor(message: string, statusCode: number, code: ErrorCode = ErrorCode.INTERNAL) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const requestId = req.requestId;
  const isProd = process.env.NODE_ENV === 'production';

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Validation error',
      errors: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      requestId,
    });
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error('App error', { requestId, code: err.code, message: err.message, stack: err.stack });
    }
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      requestId,
    });
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as { code?: string; meta?: { target?: string[] } };
    if (prismaError.code === 'P2002') {
      const target = prismaError.meta?.target?.[0] || 'field';
      return res.status(409).json({
        success: false,
        code: ErrorCode.CONFLICT,
        message: `${target} allaqachon mavjud`,
        requestId,
      });
    }
    if (prismaError.code === 'P2025') {
      return res.status(404).json({
        success: false,
        code: ErrorCode.NOT_FOUND,
        message: "Ma'lumot topilmadi",
        requestId,
      });
    }
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      code: ErrorCode.TOKEN_INVALID,
      message: 'Yaroqsiz token',
      requestId,
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      code: ErrorCode.TOKEN_EXPIRED,
      message: 'Token muddati tugagan',
      requestId,
    });
  }

  logger.error('Unhandled error', { requestId, message: err.message, stack: err.stack });

  return res.status(500).json({
    success: false,
    code: ErrorCode.INTERNAL,
    message: isProd ? 'Server xatosi' : err.message,
    requestId,
  });
}
