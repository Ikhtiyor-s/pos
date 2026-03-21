import { Router } from 'express';
import authRoutes from './auth.routes.js';
import productsRoutes from './products.routes.js';
import categoriesRoutes from './categories.routes.js';
import ordersRoutes from './orders.routes.js';
import tablesRoutes from './tables.routes.js';
import inventoryRoutes from './inventory.routes.js';
import settingsRoutes from './settings.routes.js';
import nonborRoutes from './nonbor.routes.js';
import webhookRoutes from './webhook.routes.js';
import paymentRoutes from './payment.routes.js';
import integrationRoutes from './integration.routes.js';
import billingRoutes from './billing.routes.js';
import tenantRoutes from './tenant.routes.js';
import branchRoutes from './branch.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import customerRoutes from './customer.routes.js';
import userRoutes from './user.routes.js';

// Yangi modullar
import notificationRoutes from '../modules/notifications/notification.routes.js';
import warehouseRoutes from '../modules/warehouse/warehouse.routes.js';
import financeRoutes from '../modules/finance/finance.routes.js';
import onlineOrderRoutes from '../modules/online-orders/online-order.routes.js';
import analyticsRoutes from '../modules/ai-analytics/analytics.routes.js';
import printerRoutes from '../modules/printer/printer.routes.js';
import syncRoutes from '../modules/sync/sync.routes.js';
import tenantIsolationRoutes from '../modules/tenant-isolation/tenant-isolation.routes.js';
import qrMenuRoutes from './qr-menu.routes.js';

const router = Router();

// API routes
router.use('/auth', authRoutes);
router.use('/products', productsRoutes);
router.use('/categories', categoriesRoutes);
router.use('/orders', ordersRoutes);
router.use('/tables', tablesRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/settings', settingsRoutes);
router.use('/nonbor', nonborRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/payments', paymentRoutes);
router.use('/integrations', integrationRoutes);
router.use('/billing', billingRoutes);
router.use('/tenants', tenantRoutes);
router.use('/branches', branchRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/customers', customerRoutes);
router.use('/users', userRoutes);

// Yangi modular tizim
router.use('/notifications', notificationRoutes);
router.use('/warehouse', warehouseRoutes);
router.use('/finance', financeRoutes);
router.use('/online-orders', onlineOrderRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/printer', printerRoutes);
router.use('/sync', syncRoutes);
router.use('/admin', tenantIsolationRoutes);
router.use('/qr-menu', qrMenuRoutes);

// API info
router.get('/', (_req, res) => {
  res.json({
    name: 'Oshxona POS API',
    version: '3.0.0',
    description: 'Oshxona POS SaaS — Multi-Role Restaurant Management System',
    endpoints: {
      // Core
      auth: '/api/auth',
      products: '/api/products',
      categories: '/api/categories',
      orders: '/api/orders',
      tables: '/api/tables',
      inventory: '/api/inventory',
      settings: '/api/settings',
      payments: '/api/payments',
      customers: '/api/customers',
      users: '/api/users',
      dashboard: '/api/dashboard',
      // Integrations
      nonbor: '/api/nonbor',
      webhooks: '/api/webhooks',
      integrations: '/api/integrations',
      // Multi-tenant
      billing: '/api/billing',
      tenants: '/api/tenants',
      branches: '/api/branches',
      // New modules
      notifications: '/api/notifications',
      warehouse: '/api/warehouse',
      finance: '/api/finance',
      onlineOrders: '/api/online-orders',
      analytics: '/api/analytics',
      printer: '/api/printer',
      sync: '/api/sync',
      admin: '/api/admin',
    },
  });
});

export default router;
