import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

jest.mock('@oshxona/database', () => ({
  prisma: {
    user: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    tenant: { findUnique: jest.fn() },
    refreshToken: { create: jest.fn(), findUnique: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() },
    passwordResetToken: {
      create: jest.fn(), findUnique: jest.fn(), delete: jest.fn(), deleteMany: jest.fn(), update: jest.fn(),
    },
    $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
  },
  Role: { SUPER_ADMIN: 'SUPER_ADMIN', MANAGER: 'MANAGER', CASHIER: 'CASHIER', CHEF: 'CHEF', WAITER: 'WAITER' },
}));

jest.mock('../../../utils/logger.js', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-chars-long-xyz';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-chars-xyz';

import { AuthService } from '../../../services/auth.service.js';
import { prisma } from '@oshxona/database';
import { AppError } from '../../../middleware/errorHandler.js';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('AuthService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('generateTokens', () => {
    it('should generate valid JWT tokens', () => {
      const tokens = AuthService.generateTokens('user-1', 'CASHIER' as any, 'tenant-1');

      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();

      const decoded = jwt.verify(tokens.accessToken, process.env.JWT_SECRET!) as any;
      expect(decoded.userId).toBe('user-1');
      expect(decoded.role).toBe('CASHIER');
      expect(decoded.tenantId).toBe('tenant-1');
    });

    it('should support null tenantId for SUPER_ADMIN', () => {
      const tokens = AuthService.generateTokens('admin-1', 'SUPER_ADMIN' as any, null);
      const decoded = jwt.verify(tokens.accessToken, process.env.JWT_SECRET!) as any;
      expect(decoded.tenantId).toBeNull();
    });
  });

  describe('login', () => {
    const hashedPassword = bcrypt.hashSync('password123', 10);

    it('should login successfully with correct credentials', async () => {
      const mockUser = {
        id: 'user-1', email: 'test@test.com', phone: null,
        password: hashedPassword, role: 'CASHIER', isActive: true,
        tenantId: 'tenant-1', firstName: 'Test', lastName: 'User',
        pinCode: null, createdAt: new Date(), updatedAt: new Date(),
      };

      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([mockUser]);
      (mockPrisma.tenant.findUnique as jest.Mock).mockResolvedValue({ isActive: true });
      (mockPrisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await AuthService.login({ email: 'test@test.com', password: 'password123' });

      expect(result.accessToken).toBeTruthy();
      expect(result.user.email).toBe('test@test.com');
      expect((result.user as any).password).toBeUndefined();
    });

    it('should throw for wrong password', async () => {
      const mockUser = { id: 'user-1', password: hashedPassword, isActive: true, tenantId: null };
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([mockUser]);

      await expect(
        AuthService.login({ email: 'test@test.com', password: 'wrongpass' }),
      ).rejects.toThrow(AppError);
    });

    it('should throw for blocked user', async () => {
      const mockUser = { id: 'user-1', password: hashedPassword, isActive: false, tenantId: null };
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([mockUser]);

      await expect(
        AuthService.login({ email: 'test@test.com', password: 'password123' }),
      ).rejects.toThrow(AppError);
    });

    it('should throw for blocked tenant', async () => {
      const mockUser = {
        id: 'user-1', password: hashedPassword, isActive: true, tenantId: 'tenant-1',
      };
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([mockUser]);
      (mockPrisma.tenant.findUnique as jest.Mock).mockResolvedValue({ isActive: false });

      await expect(
        AuthService.login({ email: 'test@test.com', password: 'password123' }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('refreshToken', () => {
    it('should rotate refresh token', async () => {
      const tokens = AuthService.generateTokens('user-1', 'CASHIER' as any, 'tenant-1');

      (mockPrisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'rt-1',
        token: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: 'user-1', role: 'CASHIER', tenantId: 'tenant-1' },
      });
      (mockPrisma.refreshToken.delete as jest.Mock).mockResolvedValue({});
      (mockPrisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const newTokens = await AuthService.refreshToken(tokens.refreshToken);

      expect(newTokens.accessToken).toBeTruthy();
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt-1' } });
      expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
    });

    it('should throw for expired refresh token', async () => {
      (mockPrisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        id: 'rt-1',
        token: 'old-token',
        expiresAt: new Date(Date.now() - 1000), // o'tgan
        user: {},
      });
      (mockPrisma.refreshToken.delete as jest.Mock).mockResolvedValue({});

      await expect(AuthService.refreshToken('old-token')).rejects.toThrow(AppError);
    });
  });
});
