import { Request, Response, NextFunction } from 'express';
import { prisma } from '@oshxona/database';

// ==========================================
// BRANCH ISOLATION MIDDLEWARE
// Staff faqat o'z branch ma'lumotlarini ko'radi
// Admin/Manager barcha branch larni ko'radi
// ==========================================

// Request ga branchId va branch ma'lumotlarni qo'shish
declare global {
  namespace Express {
    interface Request {
      branchContext?: {
        tenantId: string;           // Foydalanuvchining tenantId si
        isParentAdmin: boolean;     // Bu parent tenant admin mi?
        isBranch: boolean;          // Bu branch (child tenant) mi?
        parentTenantId?: string;    // Parent tenant ID (agar branch bo'lsa)
        branchIds: string[];        // Ko'rish mumkin bo'lgan tenant ID lar
        selectedBranchId?: string;  // Tanlangan branch (filter uchun)
      };
    }
  }
}

/**
 * Branch context middleware — har bir autentifikatsiya qilingan request ga
 * branch ma'lumotlarini qo'shadi
 */
export async function branchContext(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !req.user.tenantId) {
    return next();
  }

  try {
    const tenantId = req.user.tenantId;
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        parentId: true,
        children: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    });

    if (!tenant) {
      return next();
    }

    const isBranch = !!tenant.parentId;
    const isParentAdmin = !isBranch && tenant.children.length > 0;

    // Branch staff — faqat o'z tenant datasi
    // Parent admin — o'zi + barcha branchlar
    const branchIds = isBranch
      ? [tenantId]
      : [tenantId, ...tenant.children.map(c => c.id)];

    // Query param orqali branch filter
    const selectedBranchId = req.query.branchId as string | undefined;

    // Validatsiya: tanlangan branch foydalanuvchi ko'ra oladigan branch bo'lishi kerak
    if (selectedBranchId && !branchIds.includes(selectedBranchId)) {
      return res.status(403).json({
        success: false,
        message: 'Bu fillialga kirish huquqingiz yo\'q',
      });
    }

    req.branchContext = {
      tenantId,
      isParentAdmin,
      isBranch,
      parentTenantId: tenant.parentId || undefined,
      branchIds,
      selectedBranchId,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Branch filter helper — Prisma where clause uchun tenantId ni aniqlash
 * Branch staff: faqat o'z tenantId
 * Parent admin + branchId filter: tanlangan branch
 * Parent admin (no filter): barcha branchlar
 */
export function getBranchTenantFilter(req: Request): {
  tenantId?: string;
  tenantIds?: string[];
  singleTenant: boolean;
} {
  const ctx = req.branchContext;

  if (!ctx) {
    return { tenantId: req.user?.tenantId || undefined, singleTenant: true };
  }

  // Branch staff — faqat o'z branch
  if (ctx.isBranch) {
    return { tenantId: ctx.tenantId, singleTenant: true };
  }

  // Parent admin — tanlangan branch yoki barchasi
  if (ctx.selectedBranchId) {
    return { tenantId: ctx.selectedBranchId, singleTenant: true };
  }

  // Barchasi
  return { tenantIds: ctx.branchIds, singleTenant: false };
}

/**
 * Prisma where clause generator
 */
export function branchWhere(req: Request): { tenantId: string } | { tenantId: { in: string[] } } {
  const filter = getBranchTenantFilter(req);
  if (filter.singleTenant && filter.tenantId) {
    return { tenantId: filter.tenantId };
  }
  if (filter.tenantIds) {
    return { tenantId: { in: filter.tenantIds } };
  }
  return { tenantId: req.user?.tenantId || '' };
}

/**
 * Faqat parent admin uchun — branch staff kirsa 403
 */
export function requireParentAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.branchContext) {
    return res.status(403).json({ success: false, message: 'Branch context topilmadi' });
  }

  if (req.branchContext.isBranch) {
    return res.status(403).json({
      success: false,
      message: 'Bu amal faqat bosh restoran admini uchun',
    });
  }

  next();
}
