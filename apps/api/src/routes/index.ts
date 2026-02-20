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

// API info
router.get('/', (_req, res) => {
  res.json({
    name: 'Oshxona POS API',
    version: '2.0.0',
    description: 'Oshxona POS tizimi API + Integration Hub',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      categories: '/api/categories',
      orders: '/api/orders',
      tables: '/api/tables',
      inventory: '/api/inventory',
      settings: '/api/settings',
      nonbor: '/api/nonbor',
      webhooks: '/api/webhooks',
      payments: '/api/payments',
      integrations: '/api/integrations',
      billing: '/api/billing',
      tenants: '/api/tenants',
      branches: '/api/branches',
      dashboard: '/api/dashboard',
      customers: '/api/customers',
      users: '/api/users',
    },
  });
});

export default router;
