import { Router } from 'express';
import { LoyaltyController } from './loyalty.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { Role } from '@oshxona/database';

const router = Router();

// Barcha routelar himoyalangan
router.use(authenticate);

// ==========================================
// PROGRAM (faqat MANAGER)
// ==========================================

router.get('/program', LoyaltyController.getProgram);
router.put('/program', authorize(Role.MANAGER, Role.SUPER_ADMIN), LoyaltyController.setupProgram);

// ==========================================
// POINTS
// ==========================================

router.get('/account/:customerId', LoyaltyController.getAccount);
router.post('/earn', LoyaltyController.earnPoints);
router.post('/redeem', LoyaltyController.redeemPoints);

// ==========================================
// LEADERBOARD
// ==========================================

router.get('/leaderboard', LoyaltyController.getLeaderboard);

// ==========================================
// COUPONS
// ==========================================

router.post('/coupons', LoyaltyController.createCoupon);
router.get('/coupons', LoyaltyController.getCoupons);
router.post('/coupons/validate', LoyaltyController.validateCoupon);
router.post('/coupons/apply', LoyaltyController.useCoupon);

export default router;
