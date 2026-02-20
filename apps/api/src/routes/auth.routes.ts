import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Public routes
router.post('/login', AuthController.login);
router.post('/login-pin', AuthController.loginWithPin);
router.post('/register', AuthController.register);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);

// Protected routes
router.get('/me', authenticate, AuthController.me);

// PIN boshqaruvi (faqat MANAGER/SUPER_ADMIN)
router.put('/users/:userId/pin', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), AuthController.setUserPin);
router.delete('/users/:userId/pin', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), AuthController.removeUserPin);

export default router;
