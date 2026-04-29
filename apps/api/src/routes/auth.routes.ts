import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// Public routes
router.post('/login', AuthController.login);
router.post('/login-pin', AuthController.loginWithPin);
// Nonbor Admin POS: {username, password, tenantId} → slug@pos.local bilan auth
router.post('/nonbor-login-pin', AuthController.nonborLoginPin);
router.post('/register', AuthController.register);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

// Protected routes
router.get('/me', authenticate, AuthController.me);
router.put('/change-password', authenticate, AuthController.changePassword);

// PIN boshqaruvi (faqat MANAGER/SUPER_ADMIN)
router.put('/users/:userId/pin', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), AuthController.setUserPin);
router.delete('/users/:userId/pin', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), AuthController.removeUserPin);

export default router;
