import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Public routes
router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);

// Protected routes
router.get('/me', authenticate, AuthController.me);

export default router;
