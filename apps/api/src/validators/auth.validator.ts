import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .email('Yaroqli email kiriting')
    .optional(),
  phone: z
    .string()
    .regex(/^\+998\d{9}$/, 'Telefon raqam +998XXXXXXXXX formatida bo\'lishi kerak')
    .optional(),
  password: z
    .string({ required_error: 'Parol kiritilishi shart' })
    .min(4, 'Parol kamida 4 ta belgidan iborat bo\'lishi kerak'),
}).refine(
  (data) => data.email || data.phone,
  { message: 'Email yoki telefon raqam kiritilishi shart', path: ['email'] }
);

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
    .min(4, 'Parol kamida 4 ta belgidan iborat bo\'lishi kerak'),
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

// PIN login
export const pinLoginSchema = z.object({
  pin: z
    .string({ required_error: 'PIN kiritilishi shart' })
    .min(4, 'PIN kamida 4 ta raqamdan iborat bo\'lishi kerak')
    .max(8, 'PIN ko\'pi bilan 8 ta raqamdan iborat bo\'lishi kerak')
    .regex(/^\d+$/, 'PIN faqat raqamlardan iborat bo\'lishi kerak'),
  // tenantId ixtiyoriy — bo'sh bo'lsa birinchi active tenant ishlatiladi
  tenantId: z.string().uuid().optional().or(z.literal('')).transform(v => v || undefined),
});

// PIN o'rnatish
export const setPinSchema = z.object({
  pin: z
    .string({ required_error: 'PIN kiritilishi shart' })
    .min(4, 'PIN kamida 4 ta raqamdan iborat bo\'lishi kerak')
    .max(8, 'PIN ko\'pi bilan 8 ta raqamdan iborat bo\'lishi kerak')
    .regex(/^\d+$/, 'PIN faqat raqamlardan iborat bo\'lishi kerak'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type PinLoginInput = z.infer<typeof pinLoginSchema>;
export type SetPinInput = z.infer<typeof setPinSchema>;
