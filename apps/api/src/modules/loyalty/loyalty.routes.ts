import { Router } from 'express';
import { LoyaltyController } from './loyalty.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { Role } from '@oshxona/database';

const router = Router();

router.use(authenticate);

// ==========================================
// PROGRAM
// ==========================================

router.get('/program', LoyaltyController.getProgram);
router.put('/program', authorize(Role.MANAGER, Role.SUPER_ADMIN), LoyaltyController.setupProgram);

// ==========================================
// CUSTOMER BALANCE (kassada ishlatiladi)
// ==========================================

router.get('/customer/:customerId/balance', LoyaltyController.getCustomerBalance);
router.get('/max-spendable', LoyaltyController.calcMaxSpendable);

// ==========================================
// POINTS
// ==========================================

router.get('/account/:customerId', LoyaltyController.getAccount);
router.post('/earn', LoyaltyController.earnPoints);
router.post('/spend', LoyaltyController.spendPoints);
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
