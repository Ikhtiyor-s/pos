import { prisma, Prisma, ShiftStatus } from '@oshxona/database';
import { AppError } from '../../middleware/errorHandler.js';

export class StaffSchedulingService {
  // ==========================================
  // SHIFTS
  // ==========================================

  static async createShift(
    tenantId: string,
    data: {
      userId: string;
      date: string;
      startTime: string;
      endTime: string;
      notes?: string;
      breakMinutes?: number;
    }
  ) {
    // Foydalanuvchi mavjudligini tekshirish
    const user = await prisma.user.findFirst({
      where: { id: data.userId, tenantId, isActive: true },
    });

    if (!user) {
      throw new AppError('Xodim topilmadi', 404);
    }

    // O'sha kunda smena mavjudligini tekshirish
    const dateObj = new Date(data.date);
    const nextDay = new Date(dateObj);
    nextDay.setDate(nextDay.getDate() + 1);

    const existing = await prisma.shift.findFirst({
      where: {
        tenantId,
        userId: data.userId,
        date: { gte: dateObj, lt: nextDay },
        status: { in: ['SCHEDULED', 'ACTIVE'] },
      },
    });

    if (existing) {
      throw new AppError('Bu xodimning bu sanada smenasi allaqachon mavjud', 409);
    }

    const shift = await prisma.shift.create({
      data: {
        userId: data.userId,
        date: dateObj,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        notes: data.notes,
        breakMinutes: data.breakMinutes || 0,
        tenantId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    return shift;
  }

  static async getShifts(
    tenantId: string,
    options: {
      userId?: string;
      dateFrom?: string;
      dateTo?: string;
      status?: ShiftStatus;
      page?: number;
      limit?: number;
    }
  ) {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.ShiftWhereInput = { tenantId };

    if (options.userId) {
      where.userId = options.userId;
    }

    if (options.dateFrom || options.dateTo) {
      where.date = {};
      if (options.dateFrom) where.date.gte = new Date(options.dateFrom);
      if (options.dateTo) where.date.lte = new Date(options.dateTo);
    }

    if (options.status) {
      where.status = options.status;
    }

    const [shifts, total] = await Promise.all([
      prisma.shift.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        include: {
          user: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      }),
      prisma.shift.count({ where }),
    ]);

    return { shifts, page, limit, total };
  }

  static async updateShift(
    tenantId: string,
    shiftId: string,
    data: {
      userId?: string;
      date?: string;
      startTime?: string;
      endTime?: string;
      notes?: string;
      breakMinutes?: number;
      status?: ShiftStatus;
    }
  ) {
    const shift = await prisma.shift.findFirst({
      where: { id: shiftId, tenantId },
    });

    if (!shift) {
      throw new AppError('Smena topilmadi', 404);
    }

    const updateData: Prisma.ShiftUpdateInput = {};

    if (data.userId) updateData.user = { connect: { id: data.userId } };
    if (data.date) updateData.date = new Date(data.date);
    if (data.startTime) updateData.startTime = new Date(data.startTime);
    if (data.endTime) updateData.endTime = new Date(data.endTime);
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.breakMinutes !== undefined) updateData.breakMinutes = data.breakMinutes;
    if (data.status) updateData.status = data.status;

    return prisma.shift.update({
      where: { id: shiftId },
      data: updateData,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });
  }

  static async deleteShift(tenantId: string, shiftId: string) {
    const shift = await prisma.shift.findFirst({
      where: { id: shiftId, tenantId },
    });

    if (!shift) {
      throw new AppError('Smena topilmadi', 404);
    }

    if (shift.status !== 'SCHEDULED') {
      throw new AppError('Faqat rejalashtirilgan smenalarni o\'chirish mumkin', 400);
    }

    await prisma.shift.delete({ where: { id: shiftId } });

    return { message: 'Smena o\'chirildi' };
  }

  // ==========================================
  // CLOCK IN / OUT
  // ==========================================

  static async clockIn(tenantId: string, userId: string) {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Bugungi smenani topish
    const shift = await prisma.shift.findFirst({
      where: {
        tenantId,
        userId,
        date: { gte: today, lt: tomorrow },
        status: { in: ['SCHEDULED', 'LATE'] },
      },
    });

    // Allaqachon clockIn qilganmi tekshirish
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        tenantId,
        userId,
        clockIn: { gte: today, lt: tomorrow },
        clockOut: null,
      },
    });

    if (existingAttendance) {
      throw new AppError('Siz allaqachon ishga kirgan ekansiz', 400);
    }

    // Kechikish tekshirish
    let isLate = false;
    if (shift) {
      isLate = now > shift.startTime;
    }

    // Attendance yozuvi yaratish
    const attendance = await prisma.attendance.create({
      data: {
        userId,
        clockIn: now,
        isLate,
        tenantId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    // Smena statusini yangilash
    if (shift) {
      await prisma.shift.update({
        where: { id: shift.id },
        data: {
          status: isLate ? 'LATE' : 'ACTIVE',
          actualStart: now,
        },
      });
    }

    return { attendance, isLate, shift: shift ? { id: shift.id, status: isLate ? 'LATE' : 'ACTIVE' } : null };
  }

  static async clockOut(tenantId: string, userId: string) {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Ochiq attendance topish
    const attendance = await prisma.attendance.findFirst({
      where: {
        tenantId,
        userId,
        clockOut: null,
      },
      orderBy: { clockIn: 'desc' },
    });

    if (!attendance) {
      throw new AppError('Faol ish vaqti topilmadi. Avval clock-in qiling', 400);
    }

    // Soatlarni hisoblash
    const diffMs = now.getTime() - attendance.clockIn.getTime();
    const hours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        clockOut: now,
        hours,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    // Bugungi smenani COMPLETED qilish
    const shift = await prisma.shift.findFirst({
      where: {
        tenantId,
        userId,
        date: { gte: today, lt: tomorrow },
        status: { in: ['ACTIVE', 'LATE'] },
      },
    });

    if (shift) {
      // Overtime hisoblash (8 soatdan ortiq)
      const overtimeMinutes = Math.max(0, Math.round((hours - 8) * 60));

      await prisma.shift.update({
        where: { id: shift.id },
        data: {
          status: 'COMPLETED',
          actualEnd: now,
          overtime: overtimeMinutes,
        },
      });
    }

    return { attendance: updatedAttendance, hours };
  }

  // ==========================================
  // ATTENDANCE
  // ==========================================

  static async getAttendance(
    tenantId: string,
    options: {
      userId?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.AttendanceWhereInput = { tenantId };

    if (options.userId) {
      where.userId = options.userId;
    }

    if (options.dateFrom || options.dateTo) {
      where.clockIn = {};
      if (options.dateFrom) where.clockIn.gte = new Date(options.dateFrom);
      if (options.dateTo) where.clockIn.lte = new Date(options.dateTo);
    }

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { clockIn: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      }),
      prisma.attendance.count({ where }),
    ]);

    return { records, page, limit, total };
  }

  // ==========================================
  // PAYROLL
  // ==========================================

  static async calculatePayroll(
    tenantId: string,
    userId: string,
    periodStart: string,
    periodEnd: string,
    baseSalary: number
  ) {
    // Foydalanuvchi mavjudligini tekshirish
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new AppError('Xodim topilmadi', 404);
    }

    // Davrdagi attendance yozuvlarini olish
    const attendances = await prisma.attendance.findMany({
      where: {
        tenantId,
        userId,
        clockIn: { gte: new Date(periodStart) },
        clockOut: { lte: new Date(periodEnd) },
      },
    });

    // Umumiy soatlar va overtimeni hisoblash
    let totalHours = 0;
    let totalOvertimeHours = 0;

    for (const att of attendances) {
      const hours = att.hours ? Number(att.hours) : 0;
      totalHours += hours;
      // Kunlik 8 soatdan ortiq = overtime
      if (hours > 8) {
        totalOvertimeHours += hours - 8;
      }
    }

    // Overtime uchun 1.5x stavka
    const hourlyRate = baseSalary / (30 * 8); // Oylik / (30 kun * 8 soat)
    const overtimePay = parseFloat((totalOvertimeHours * hourlyRate * 1.5).toFixed(2));
    const totalPay = parseFloat((baseSalary + overtimePay).toFixed(2));

    // Mavjud payroll tekshirish
    const existing = await prisma.payroll.findFirst({
      where: {
        userId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
      },
    });

    if (existing) {
      throw new AppError('Bu davr uchun payroll allaqachon mavjud', 409);
    }

    const payroll = await prisma.payroll.create({
      data: {
        userId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        baseSalary,
        overtimePay,
        totalPay,
        tenantId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    return {
      payroll,
      summary: {
        totalHours: parseFloat(totalHours.toFixed(2)),
        totalOvertimeHours: parseFloat(totalOvertimeHours.toFixed(2)),
        attendanceDays: attendances.length,
        hourlyRate: parseFloat(hourlyRate.toFixed(2)),
      },
    };
  }

  static async getPayroll(
    tenantId: string,
    options: {
      userId?: string;
      periodStart?: string;
      periodEnd?: string;
      isPaid?: boolean;
      page?: number;
      limit?: number;
    }
  ) {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.PayrollWhereInput = { tenantId };

    if (options.userId) where.userId = options.userId;
    if (options.isPaid !== undefined) where.isPaid = options.isPaid;

    if (options.periodStart) {
      where.periodStart = { gte: new Date(options.periodStart) };
    }
    if (options.periodEnd) {
      where.periodEnd = { lte: new Date(options.periodEnd) };
    }

    const [payrolls, total] = await Promise.all([
      prisma.payroll.findMany({
        where,
        skip,
        take: limit,
        orderBy: { periodStart: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      }),
      prisma.payroll.count({ where }),
    ]);

    return { payrolls, page, limit, total };
  }

  static async markPayrollPaid(tenantId: string, payrollId: string) {
    const payroll = await prisma.payroll.findFirst({
      where: { id: payrollId, tenantId },
    });

    if (!payroll) {
      throw new AppError('Payroll topilmadi', 404);
    }

    if (payroll.isPaid) {
      throw new AppError('Bu payroll allaqachon to\'langan', 400);
    }

    return prisma.payroll.update({
      where: { id: payrollId },
      data: {
        isPaid: true,
        paidAt: new Date(),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });
  }

  // ==========================================
  // DASHBOARD
  // ==========================================

  static async getStaffDashboard(tenantId: string) {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Bugungi smenalar
    const todayShifts = await prisma.shift.findMany({
      where: {
        tenantId,
        date: { gte: today, lt: tomorrow },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    // Bugungi attendance
    const todayAttendance = await prisma.attendance.findMany({
      where: {
        tenantId,
        clockIn: { gte: today, lt: tomorrow },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    const lateStaff = todayShifts.filter((s) => s.status === 'LATE');
    const activeStaff = todayShifts.filter((s) => s.status === 'ACTIVE');
    const scheduledStaff = todayShifts.filter((s) => s.status === 'SCHEDULED');
    const completedStaff = todayShifts.filter((s) => s.status === 'COMPLETED');
    const currentlyWorking = todayAttendance.filter((a) => !a.clockOut);

    return {
      todayShifts,
      summary: {
        totalScheduled: todayShifts.length,
        active: activeStaff.length,
        late: lateStaff.length,
        waiting: scheduledStaff.length,
        completed: completedStaff.length,
        currentlyWorking: currentlyWorking.length,
      },
      lateStaff,
      activeStaff,
      currentlyWorking,
    };
  }

  static async getWeeklySchedule(tenantId: string, weekStart: string) {
    const startDate = new Date(weekStart);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    const shifts = await prisma.shift.findMany({
      where: {
        tenantId,
        date: { gte: startDate, lt: endDate },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    // Kunlar bo'yicha guruh
    const schedule: Record<string, typeof shifts> = {};
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(day.getDate() + i);
      const dayKey = day.toISOString().split('T')[0];
      schedule[dayKey] = [];
    }

    for (const shift of shifts) {
      const dayKey = shift.date.toISOString().split('T')[0];
      if (schedule[dayKey]) {
        schedule[dayKey].push(shift);
      }
    }

    return { weekStart: startDate, weekEnd: endDate, schedule };
  }
}
