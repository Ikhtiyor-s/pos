import { Request, Response, NextFunction } from 'express';
import { prisma } from '@oshxona/database';

// ==========================================
// STRICT TENANT GUARD MIDDLEWARE
// Global level tenant isolation enforcer
//
// QOIDALAR:
// 1. Har bir restoran alohida tenant
// 2. Tenant A — Tenant B data sini ko'ra olmaydi
// 3. SUPER_ADMIN — faqat global statistikani ko'radi
// 4. Restaurant Admin — faqat o'z datasini ko'radi
// 5. tenant_id barcha jadvallar da majburiy
// ==========================================

// Request ga tenant kontekstni qo'shish
declare global {
  namespace Express {
    interface Request {
      tenantGuard?: {
        tenantId: string;
        isSuperAdmin: boolean;
        allowedTenantIds: string[];   // Ko'rish mumkin bo'lgan tenant IDlar
        parentTenantId?: string;      // Branch uchun
      };
    }
  }
}

/**
 * Strict Tenant Guard — BARCHA autentifikatsiya qilingan route larda ishlaydi
 *
 * - SUPER_ADMIN: tenantId = null, faqat global endpoint lar
 * - MANAGER/Staff: tenantId majburiy, faqat o'z tenant data si
 * - Branch staff: faqat o'z branch (child tenant) data si
 * - Parent admin: o'zi + children
 */
export function strictTenantGuard(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next(); // Auth middleware hali ishlamagan
  }

  const { role, tenantId } = req.user;

  // SUPER_ADMIN — global foydalanuvchi
  if (role === 'SUPER_ADMIN') {
    req.tenantGuard = {
      tenantId: '',
      isSuperAdmin: true,
      allowedTenantIds: [], // Barcha tenant ga kirish
    };
    return next();
  }

  // Tenant bo'lmagan foydalanuvchi — bloklash
  if (!tenantId) {
    return res.status(403).json({
      success: false,
      message: 'Tenant tayinlanmagan. Administrator bilan bog\'laning.',
      code: 'TENANT_REQUIRED',
    });
  }

  req.tenantGuard = {
    tenantId,
    isSuperAdmin: false,
    allowedTenantIds: [tenantId], // Default: faqat o'z tenant
  };

  next();
}

/**
 * Tenant kontekstni to'liq yuklash (branch isolation bilan)
 * strictTenantGuard dan KEYIN ishlatiladi
 */
export async function loadTenantContext(req: Request, res: Response, next: NextFunction) {
  if (!req.tenantGuard || req.tenantGuard.isSuperAdmin) {
    return next();
  }

  try {
    const tenantId = req.tenantGuard.tenantId;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        parentId: true,
        isActive: true,
        children: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    });

    if (!tenant) {
      return res.status(403).json({
        success: false,
        message: 'Tenant topilmadi',
        code: 'TENANT_NOT_FOUND',
      });
    }

    if (!tenant.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Tashkilotingiz bloklangan',
        code: 'TENANT_INACTIVE',
      });
    }

    // Branch (child tenant) — faqat o'z data si
    if (tenant.parentId) {
      req.tenantGuard.parentTenantId = tenant.parentId;
      req.tenantGuard.allowedTenantIds = [tenantId];
    } else {
      // Parent tenant — o'zi + children
      req.tenantGuard.allowedTenantIds = [
        tenantId,
        ...tenant.children.map(c => c.id),
      ];
    }

    next();
  } catch (error) {
    next(error);
  }
}

// ==========================================
// HELPER: Tenant ID ni xavfsiz olish
// ==========================================

/**
 * Request dan tenantId ni oladi
 * SUPER_ADMIN uchun — query param dan oladi (agar berilgan bo'lsa)
 * Restaurant staff uchun — faqat o'z tenantId
 */
export function getTenantId(req: Request): string | null {
  if (!req.tenantGuard) return req.user?.tenantId || null;

  if (req.tenantGuard.isSuperAdmin) {
    // SUPER_ADMIN query param orqali ma'lum tenant ni tanlashi mumkin
    const queryTenantId = req.query.tenantId as string;
    return queryTenantId || null;
  }

  return req.tenantGuard.tenantId;
}

/**
 * Request dan ko'rish mumkin bo'lgan tenant IDs ni oladi
 * Prisma where: { tenantId: { in: getVisibleTenantIds(req) } }
 */
export function getVisibleTenantIds(req: Request): string[] {
  if (!req.tenantGuard) {
    return req.user?.tenantId ? [req.user.tenantId] : [];
  }

  // Branch filter (query param orqali)
  const branchId = req.query.branchId as string;
  if (branchId && req.tenantGuard.allowedTenantIds.includes(branchId)) {
    return [branchId];
  }

  return req.tenantGuard.allowedTenantIds;
}

/**
 * Tenant ID ni validatsiya qilish — berilgan ID foydalanuvchining tenant iga tegishlimi?
 */
export function validateTenantAccess(req: Request, targetTenantId: string): boolean {
  if (!req.tenantGuard) return false;
  if (req.tenantGuard.isSuperAdmin) return true;
  return req.tenantGuard.allowedTenantIds.includes(targetTenantId);
}

/**
 * Prisma WHERE clause generator — tenant isolation uchun
 */
export function tenantWhere(req: Request): { tenantId: string } | { tenantId: { in: string[] } } {
  const ids = getVisibleTenantIds(req);

  if (ids.length === 0) {
    // SUPER_ADMIN without filter — xavfsizlik uchun bo'sh natija
    return { tenantId: '__none__' };
  }

  if (ids.length === 1) {
    return { tenantId: ids[0] };
  }

  return { tenantId: { in: ids } };
}

// ==========================================
// SUPER_ADMIN ONLY GUARD
// ==========================================

export function superAdminOnly(req: Request, res: Response, next: NextFunction) {
  if (!req.tenantGuard?.isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Bu amal faqat Super Admin uchun',
      code: 'SUPER_ADMIN_ONLY',
    });
  }
  next();
}

// ==========================================
// CROSS-TENANT ACCESS PREVENTION
// Route params dagi :id ga tegishli entityning tenantId sini tekshirish
// ==========================================

export function preventCrossTenantAccess(entityName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.tenantGuard?.isSuperAdmin) return next();

    const entityId = req.params.id || req.params.orderId;
    if (!entityId) return next();

    const allowedIds = req.tenantGuard?.allowedTenantIds || [];
    if (allowedIds.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Ruxsat berilmagan',
        code: 'ACCESS_DENIED',
      });
    }

    try {
      // Dynamic table query — entity nomiga qarab
      let entityTenantId: string | null = null;

      switch (entityName) {
        case 'order': {
          const order = await prisma.order.findUnique({
            where: { id: entityId },
            select: { tenantId: true },
          });
          entityTenantId = order?.tenantId || null;
          break;
        }
        case 'product': {
          const product = await prisma.product.findUnique({
            where: { id: entityId },
            select: { tenantId: true },
          });
          entityTenantId = product?.tenantId || null;
          break;
        }
        case 'table': {
          const table = await prisma.table.findUnique({
            where: { id: entityId },
            select: { tenantId: true },
          });
          entityTenantId = table?.tenantId || null;
          break;
        }
        case 'user': {
          const user = await prisma.user.findUnique({
            where: { id: entityId },
            select: { tenantId: true },
          });
          entityTenantId = user?.tenantId || null;
          break;
        }
        case 'inventory': {
          const item = await prisma.inventoryItem.findUnique({
            where: { id: entityId },
            select: { tenantId: true },
          });
          entityTenantId = item?.tenantId || null;
          break;
        }
        default:
          return next();
      }

      if (!entityTenantId) {
        return res.status(404).json({
          success: false,
          message: `${entityName} topilmadi`,
        });
      }

      if (!allowedIds.includes(entityTenantId)) {
        // AUDIT: Cross-tenant access attempt!
        console.error(
          `[SECURITY] Cross-tenant access attempt! ` +
          `User: ${req.user?.id} (tenant: ${req.user?.tenantId}) ` +
          `tried to access ${entityName}:${entityId} (tenant: ${entityTenantId})`
        );

        return res.status(403).json({
          success: false,
          message: 'Bu ma\'lumotga kirish huquqingiz yo\'q',
          code: 'CROSS_TENANT_DENIED',
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
