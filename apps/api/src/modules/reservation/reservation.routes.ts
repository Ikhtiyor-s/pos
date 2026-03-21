import { Router } from 'express';
import { ReservationController } from './reservation.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// ==========================================
// PUBLIC (auth yo'q — mijoz tekshirishi uchun)
// ==========================================

router.get('/lookup/:code', ReservationController.lookupByCode);

// ==========================================
// AUTHENTICATED ROUTES
// ==========================================

router.use(authenticate);

router.post('/', ReservationController.create);
router.get('/', ReservationController.getAll);
router.get('/available-slots', ReservationController.getAvailableSlots);
router.get('/today', ReservationController.getTodayReservations);
router.get('/:id', ReservationController.getById);

// Status transitions
router.patch('/:id/confirm', ReservationController.confirm);
router.patch('/:id/seat', ReservationController.seat);
router.patch('/:id/complete', ReservationController.complete);
router.patch('/:id/cancel', ReservationController.cancel);
router.patch('/:id/no-show', ReservationController.noShow);
router.patch('/:id/reminder', ReservationController.sendReminder);

export default router;
