import { Router } from 'express';
import authRoutes from './auth.routes.js';
import productsRoutes from './products.routes.js';
import categoriesRoutes from './categories.routes.js';
import ordersRoutes from './orders.routes.js';
import tablesRoutes from './tables.routes.js';

const router = Router();

// API routes
router.use('/auth', authRoutes);
router.use('/products', productsRoutes);
router.use('/categories', categoriesRoutes);
router.use('/orders', ordersRoutes);
router.use('/tables', tablesRoutes);

// API info
router.get('/', (_req, res) => {
  res.json({
    name: 'Oshxona POS API',
    version: '1.0.0',
    description: 'Oshxona POS tizimi API',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      categories: '/api/categories',
      orders: '/api/orders',
      tables: '/api/tables',
    },
  });
});

export default router;
