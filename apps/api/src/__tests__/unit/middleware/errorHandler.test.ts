import { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';
import { errorHandler, AppError, ErrorCode } from '../../../middleware/errorHandler.js';

jest.mock('../../../utils/logger.js', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

function makeResMock() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function makeReqMock(requestId = 'test-req-id') {
  return { requestId } as Request;
}

describe('errorHandler', () => {
  const next = jest.fn() as NextFunction;

  it('should handle ZodError with field-level errors', () => {
    const schema = z.object({ email: z.string().email(), age: z.number().min(18) });
    let zodError: ZodError;
    try {
      schema.parse({ email: 'not-email', age: 5 });
    } catch (e) {
      zodError = e as ZodError;
    }

    const req = makeReqMock();
    const res = makeResMock();

    errorHandler(zodError!, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(body.errors).toHaveLength(2);
  });

  it('should handle AppError with correct status code and code', () => {
    const err = new AppError('Buyurtma topilmadi', 404, ErrorCode.NOT_FOUND);
    const req = makeReqMock();
    const res = makeResMock();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.code).toBe(ErrorCode.NOT_FOUND);
    expect(body.message).toBe('Buyurtma topilmadi');
    expect(body.requestId).toBe('test-req-id');
  });

  it('should handle Prisma P2002 (unique constraint) with 409', () => {
    const err = Object.assign(new Error('Unique'), {
      name: 'PrismaClientKnownRequestError',
      code: 'P2002',
      meta: { target: ['email'] },
    });

    const req = makeReqMock();
    const res = makeResMock();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.code).toBe(ErrorCode.CONFLICT);
  });

  it('should handle Prisma P2025 (not found) with 404', () => {
    const err = Object.assign(new Error('Not found'), {
      name: 'PrismaClientKnownRequestError',
      code: 'P2025',
      meta: {},
    });

    const req = makeReqMock();
    const res = makeResMock();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should hide error details in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const err = new Error('Internal secret error');
    const req = makeReqMock();
    const res = makeResMock();

    errorHandler(err, req, res, next);

    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.message).toBe('Server xatosi');
    expect(body.message).not.toContain('secret');

    process.env.NODE_ENV = originalEnv;
  });
});
