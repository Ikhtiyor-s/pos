import { Router } from 'express';
import { SmsController } from './sms.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = Router();

// ==========================================
// PUBLIC — OTP (auth yo'q)
// ==========================================

router.post('/send-otp', SmsController.sendOtp);
router.post('/verify-otp', SmsController.verifyOtp);

// ==========================================
// AUTHENTICATED ROUTES
// ==========================================

router.post('/send', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), SmsController.sendSms);
router.post('/broadcast', authenticate, authorize('MANAGER', 'SUPER_ADMIN'), SmsController.broadcast);
router.get('/logs', authenticate, SmsController.getLogs);
router.get('/stats', authenticate, SmsController.getStats);

export default router;
