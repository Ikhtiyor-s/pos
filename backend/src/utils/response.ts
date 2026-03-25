import { Response } from 'express';

interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

interface ErrorResponse {
  success: false;
  message: string;
  errors?: Array<{ field: string; message: string }>;
}

export function successResponse<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
  meta?: SuccessResponse<T>['meta']
): Response {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    ...(meta && { meta }),
  };

  return res.status(statusCode).json(response);
}

export function errorResponse(
  res: Response,
  message: string,
  statusCode = 400,
  errors?: ErrorResponse['errors']
): Response {
  const response: ErrorResponse = {
    success: false,
    message,
    ...(errors && { errors }),
  };

  return res.status(statusCode).json(response);
}

export function paginatedResponse<T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number
): Response {
  return successResponse(res, data, undefined, 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
}
