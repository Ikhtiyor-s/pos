import { prisma } from '@oshxona/database';

// ==========================================
// TENANT AUDIT LOGGER
// Barcha cross-tenant access attemptlarni va muhim
// operatsiyalarni audit_logs jadvaliga yozadi
// ==========================================

export type AuditAction =
  | 'LOGIN'
  | 'LOGIN_FAILED'
  | 'ORDER_CREATE'
  | 'ORDER_UPDATE'
  | 'ORDER_DELETE'
  | 'PAYMENT_CREATE'
  | 'PRODUCT_CREATE'
  | 'PRODUCT_UPDATE'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'SETTINGS_UPDATE'
  | 'BRANCH_CREATE'
  | 'CROSS_TENANT_ATTEMPT'
  | 'UNAUTHORIZED_ACCESS'
  | 'DATA_EXPORT'
  | 'BULK_OPERATION';

interface AuditEntry {
  action: AuditAction;
  userId?: string;
  tenantId?: string;
  targetTenantId?: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class TenantAuditService {

  // ==========================================
  // LOG AUDIT ENTRY
  // ==========================================

  static async log(entry: AuditEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: entry.action,
          userId: entry.userId,
          tenantId: entry.tenantId,
          entity: entry.entityType || 'system',
          entityId: entry.entityId,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          newData: {
            ...entry.details,
            targetTenantId: entry.targetTenantId,
            severity: entry.severity,
          } as any,
        },
      });
    } catch (error) {
      // Audit log xatosi tizimni to'xtatmasligi kerak
      console.error('[Audit] Log xatolik:', error);
    }
  }

  // ==========================================
  // SECURITY EVENTS
  // ==========================================

  static async logCrossTenantAttempt(
    userId: string,
    userTenantId: string,
    targetTenantId: string,
    entityType: string,
    entityId: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.log({
      action: 'CROSS_TENANT_ATTEMPT',
      userId,
      tenantId: userTenantId,
      targetTenantId,
      entityType,
      entityId,
      severity: 'CRITICAL',
      ipAddress,
      details: {
        message: `User ${userId} (tenant: ${userTenantId}) tried to access ${entityType}:${entityId} (tenant: ${targetTenantId})`,
      },
    });
  }

  static async logUnauthorizedAccess(
    userId: string,
    tenantId: string,
    endpoint: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.log({
      action: 'UNAUTHORIZED_ACCESS',
      userId,
      tenantId,
      severity: 'HIGH',
      ipAddress,
      details: { endpoint },
    });
  }

  // ==========================================
  // QUERY AUDIT LOGS
  // ==========================================

  static async getSecurityEvents(
    tenantId: string | null, // null = global (SUPER_ADMIN)
    options: {
      action?: AuditAction;
      severity?: string;
      dateFrom?: string;
      dateTo?: string;
      page: number;
      limit: number;
    },
  ) {
    const { page, limit, action, severity, dateFrom, dateTo } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Tenant filter
    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (action) where.action = action;

    if (severity) {
      where.newData = { path: ['severity'], equals: severity };
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page, limit };
  }

  // ==========================================
  // SECURITY DASHBOARD
  // ==========================================

  static async getSecurityDashboard(tenantId: string | null) {
    const last24h = new Date();
    last24h.setHours(last24h.getHours() - 24);

    const where: any = { createdAt: { gte: last24h } };
    if (tenantId) where.tenantId = tenantId;

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const crossTenantAttempts = logs.filter(l => l.action === 'CROSS_TENANT_ATTEMPT');
    const unauthorizedAccess = logs.filter(l => l.action === 'UNAUTHORIZED_ACCESS');
    const failedLogins = logs.filter(l => l.action === 'LOGIN_FAILED');

    return {
      last24h: {
        totalEvents: logs.length,
        crossTenantAttempts: crossTenantAttempts.length,
        unauthorizedAccess: unauthorizedAccess.length,
        failedLogins: failedLogins.length,
      },
      recentCritical: logs
        .filter(l => {
          const data = l.newData as any;
          return data?.severity === 'CRITICAL';
        })
        .slice(0, 10),
      alerts: [
        ...(crossTenantAttempts.length > 0
          ? [{ type: 'CRITICAL' as const, icon: '🚨', title: 'Cross-tenant kirishga urinish!', message: `Oxirgi 24 soatda ${crossTenantAttempts.length} ta noto\'g\'ri kirishga urinish aniqlandi.` }]
          : []),
        ...(failedLogins.length > 5
          ? [{ type: 'WARNING' as const, icon: '⚠️', title: 'Ko\'p muvaffaqiyatsiz login', message: `${failedLogins.length} ta muvaffaqiyatsiz login urinishi. Brute-force hujum bo\'lishi mumkin.` }]
          : []),
        ...(crossTenantAttempts.length === 0 && unauthorizedAccess.length === 0
          ? [{ type: 'SUCCESS' as const, icon: '✅', title: 'Xavfsizlik holati yaxshi', message: 'Oxirgi 24 soatda xavfsizlik tahdidlari aniqlanmadi.' }]
          : []),
      ],
    };
  }
}
