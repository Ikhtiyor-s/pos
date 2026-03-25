import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { superAdminOnly } from './tenant-guard.middleware.js';
import { TenantIsolationController } from './tenant-isolation.controller.js';

const router = Router();

router.use(authenticate);

// ==========================================
// SUPER ADMIN ONLY — Global operations
// ==========================================

// Global statistikalar
router.get('/global-stats', superAdminOnly, TenantIsolationController.getGlobalStats);

// Barcha tenantlar ro'yxati (aggregated)
router.get('/tenants', superAdminOnly, TenantIsolationController.getTenantOverviews);

// Tenant performance ranking
router.get('/performance-ranking', superAdminOnly, TenantIsolationController.getPerformanceRanking);

// ==========================================
// SECURITY & AUDIT
// ==========================================

// Security dashboard
router.get('/security', superAdminOnly, TenantIsolationController.getSecurityDashboard);

// Audit logs
router.get('/audit-logs', superAdminOnly, TenantIsolationController.getAuditLogs);

export default router;
