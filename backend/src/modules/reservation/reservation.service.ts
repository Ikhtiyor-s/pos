import { prisma, Prisma, ReservationStatus } from '@oshxona/database';
import { AppError } from '../../middleware/errorHandler.js';

export class ReservationService {
  // ==========================================
  // CRUD
  // ==========================================

  static async create(
    tenantId: string,
    data: {
      customerName: string;
      customerPhone: string;
      customerId?: string;
      tableId?: string;
      guestCount: number;
      reservationDate: string;
      startTime: string;
      endTime: string;
      notes?: string;
      source?: string;
    }
  ) {
    // Stol band emasligini tekshirish
    if (data.tableId) {
      const conflict = await prisma.reservation.findFirst({
        where: {
          tenantId,
          tableId: data.tableId,
          reservationDate: new Date(data.reservationDate),
          status: { in: ['PENDING', 'CONFIRMED', 'SEATED'] },
          OR: [
            {
              startTime: { lte: new Date(data.endTime) },
              endTime: { gte: new Date(data.startTime) },
            },
          ],
        },
      });

      if (conflict) {
        throw new AppError('Bu stol tanlangan vaqtda band', 409);
      }
    }

    const confirmationCode = this.generateConfirmationCode();

    const reservation = await prisma.reservation.create({
      data: {
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerId: data.customerId,
        tableId: data.tableId,
        guestCount: data.guestCount,
        reservationDate: new Date(data.reservationDate),
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        notes: data.notes,
        source: data.source || 'PHONE',
        confirmationCode,
        tenantId,
      },
      include: {
        table: { select: { id: true, number: true, name: true, capacity: true } },
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });

    return reservation;
  }

  static async getAll(
    tenantId: string,
    options: {
      date?: string;
      status?: ReservationStatus;
      page?: number;
      limit?: number;
    }
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ReservationWhereInput = { tenantId };

    if (options.date) {
      const date = new Date(options.date);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.reservationDate = { gte: date, lt: nextDay };
    }

    if (options.status) {
      where.status = options.status;
    }

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'asc' },
        include: {
          table: { select: { id: true, number: true, name: true, capacity: true } },
          customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        },
      }),
      prisma.reservation.count({ where }),
    ]);

    return { reservations, page, limit, total };
  }

  static async getById(tenantId: string, id: string) {
    const reservation = await prisma.reservation.findFirst({
      where: { id, tenantId },
      include: {
        table: { select: { id: true, number: true, name: true, capacity: true } },
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });

    if (!reservation) {
      throw new AppError('Bron topilmadi', 404);
    }

    return reservation;
  }

  // ==========================================
  // STATUS TRANSITIONS
  // ==========================================

  static async confirm(tenantId: string, id: string) {
    const reservation = await this.getById(tenantId, id);

    if (reservation.status !== 'PENDING') {
      throw new AppError('Faqat kutilayotgan bronlarni tasdiqlash mumkin', 400);
    }

    return prisma.reservation.update({
      where: { id },
      data: { status: 'CONFIRMED' },
      include: {
        table: { select: { id: true, number: true, name: true, capacity: true } },
      },
    });
  }

  static async seat(tenantId: string, id: string) {
    const reservation = await this.getById(tenantId, id);

    if (!['PENDING', 'CONFIRMED'].includes(reservation.status)) {
      throw new AppError('Faqat tasdiqlangan bronlarni joylashtirish mumkin', 400);
    }

    // Stolni OCCUPIED qilish
    if (reservation.tableId) {
      await prisma.table.update({
        where: { id: reservation.tableId },
        data: { status: 'OCCUPIED' },
      });
    }

    return prisma.reservation.update({
      where: { id },
      data: { status: 'SEATED' },
      include: {
        table: { select: { id: true, number: true, name: true, capacity: true } },
      },
    });
  }

  static async complete(tenantId: string, id: string) {
    const reservation = await this.getById(tenantId, id);

    if (reservation.status !== 'SEATED') {
      throw new AppError('Faqat joylashtirilgan bronlarni yakunlash mumkin', 400);
    }

    return prisma.reservation.update({
      where: { id },
      data: { status: 'COMPLETED' },
      include: {
        table: { select: { id: true, number: true, name: true, capacity: true } },
      },
    });
  }

  static async cancel(tenantId: string, id: string, reason?: string) {
    const reservation = await this.getById(tenantId, id);

    if (['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(reservation.status)) {
      throw new AppError('Bu bronni bekor qilib bo\'lmaydi', 400);
    }

    return prisma.reservation.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: reason ? `${reservation.notes || ''}\nBekor qilish sababi: ${reason}`.trim() : reservation.notes,
      },
      include: {
        table: { select: { id: true, number: true, name: true, capacity: true } },
      },
    });
  }

  static async noShow(tenantId: string, id: string) {
    const reservation = await this.getById(tenantId, id);

    if (!['PENDING', 'CONFIRMED'].includes(reservation.status)) {
      throw new AppError('Faqat kutilayotgan/tasdiqlangan bronlarga NO_SHOW belgilash mumkin', 400);
    }

    return prisma.reservation.update({
      where: { id },
      data: { status: 'NO_SHOW' },
      include: {
        table: { select: { id: true, number: true, name: true, capacity: true } },
      },
    });
  }

  // ==========================================
  // QUERIES
  // ==========================================

  static async getAvailableSlots(tenantId: string, date: string, guestCount: number) {
    const dateObj = new Date(date);
    const nextDay = new Date(dateObj);
    nextDay.setDate(nextDay.getDate() + 1);

    // Barcha stollarni olish (sig'imi yetarli)
    const tables = await prisma.table.findMany({
      where: {
        tenantId,
        isActive: true,
        capacity: { gte: guestCount },
      },
      orderBy: { capacity: 'asc' },
    });

    // Bu sanada mavjud bronlarni olish
    const reservations = await prisma.reservation.findMany({
      where: {
        tenantId,
        reservationDate: { gte: dateObj, lt: nextDay },
        status: { in: ['PENDING', 'CONFIRMED', 'SEATED'] },
      },
      select: { tableId: true, startTime: true, endTime: true },
    });

    // Har bir stol uchun bo'sh vaqtlarni hisoblash
    const availableTables = tables.map((table) => {
      const tableReservations = reservations.filter((r) => r.tableId === table.id);
      return {
        table: { id: table.id, number: table.number, name: table.name, capacity: table.capacity },
        bookedSlots: tableReservations.map((r) => ({
          startTime: r.startTime,
          endTime: r.endTime,
        })),
      };
    });

    return availableTables;
  }

  static async getByConfirmationCode(code: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { confirmationCode: code },
      include: {
        table: { select: { id: true, number: true, name: true, capacity: true } },
      },
    });

    if (!reservation) {
      throw new AppError('Bron topilmadi', 404);
    }

    return reservation;
  }

  static async getTodayReservations(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const reservations = await prisma.reservation.findMany({
      where: {
        tenantId,
        reservationDate: { gte: today, lt: tomorrow },
      },
      orderBy: { startTime: 'asc' },
      include: {
        table: { select: { id: true, number: true, name: true, capacity: true } },
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });

    return reservations;
  }

  static async sendReminder(tenantId: string, id: string) {
    const reservation = await this.getById(tenantId, id);

    if (reservation.reminderSent) {
      throw new AppError('Eslatma allaqachon yuborilgan', 400);
    }

    return prisma.reservation.update({
      where: { id },
      data: { reminderSent: true },
    });
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private static generateConfirmationCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
