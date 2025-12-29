import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email kiritilishi shart' })
    .email('Yaroqli email kiriting'),
  password: z
    .string({ required_error: 'Parol kiritilishi shart' })
    .min(6, 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak'),
});

export const registerSchema = z.object({
  email: z
    .string({ required_error: 'Email kiritilishi shart' })
    .email('Yaroqli email kiriting'),
  phone: z
    .string()
    .regex(/^\+998\d{9}$/, 'Telefon raqam +998XXXXXXXXX formatida bo\'lishi kerak')
    .optional(),
  password: z
    .string({ required_error: 'Parol kiritilishi shart' })
    .min(6, 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak'),
  firstName: z
    .string({ required_error: 'Ism kiritilishi shart' })
    .min(2, 'Ism kamida 2 ta belgidan iborat bo\'lishi kerak'),
  lastName: z
    .string({ required_error: 'Familiya kiritilishi shart' })
    .min(2, 'Familiya kamida 2 ta belgidan iborat bo\'lishi kerak'),
  role: z.enum(['SUPER_ADMIN', 'MANAGER', 'CASHIER', 'CHEF', 'WAREHOUSE', 'ACCOUNTANT']).optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string({ required_error: 'Refresh token kiritilishi shart' }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
