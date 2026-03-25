import { Router } from 'express';
import { StaffController } from './staff.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = Router();

// ==========================================
// BARCHA ROUTELAR AUTENTIFIKATSIYA TALAB QILADI
// ==========================================

router.use(authenticate);

// ==========================================
// SHIFTS (MANAGER / SUPER_ADMIN)
// ==========================================

router.post('/shifts', authorize('MANAGER', 'SUPER_ADMIN'), StaffController.createShift);
router.get('/shifts', StaffController.getShifts);
router.put('/shifts/:id', authorize('MANAGER', 'SUPER_ADMIN'), StaffController.updateShift);
router.delete('/shifts/:id', authorize('MANAGER', 'SUPER_ADMIN'), StaffController.deleteShift);

// ==========================================
// CLOCK IN / OUT
// ==========================================

router.post('/clock-in', StaffController.clockIn);
router.post('/clock-out', StaffController.clockOut);

// ==========================================
// ATTENDANCE
// ==========================================

router.get('/attendance', StaffController.getAttendance);

// ==========================================
// PAYROLL (MANAGER / SUPER_ADMIN)
// ==========================================

router.post('/payroll/calculate', authorize('MANAGER', 'SUPER_ADMIN'), StaffController.calculatePayroll);
router.get('/payroll', StaffController.getPayroll);
router.patch('/payroll/:id/pay', authorize('MANAGER', 'SUPER_ADMIN'), StaffController.markPayrollPaid);

// ==========================================
// DASHBOARD
// ==========================================

router.get('/dashboard', StaffController.getDashboard);
router.get('/weekly-schedule', StaffController.getWeeklySchedule);

export default router;
