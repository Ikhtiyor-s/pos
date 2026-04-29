import { prisma, TableStatus } from '@oshxona/database';
import QRCode from 'qrcode';
import { AppError } from '../middleware/errorHandler.js';

export class TableService {
  static async getAll(tenantId: string, floor?: number) {
    const tables = await prisma.table.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(floor != null ? { floor } : {}),
      },
      include: {
        orders: {
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          select: { id: true, orderNumber: true, status: true, total: true, createdAt: true },
        },
      },
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    });

    return tables;
  }

  static async getById(tenantId: string, id: string) {
    const table = await prisma.table.findUnique({
      where: { id, tenantId },
      include: {
        orders: {
          where: {
            status: {
              notIn: ['COMPLETED', 'CANCELLED'],
            },
          },
          include: {
            items: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (!table) {
      throw new AppError('Stol topilmadi', 404);
    }

    return table;
  }

  static async create(tenantId: string, data: {
    number: number;
    name?: string;
    capacity?: number;
    floor?: number;
    positionX?: number;
    positionY?: number;
  }) {
    const floor = data.floor ?? 1;

    // Bir etajda bir xil raqamli stol bo'lmasin
    const existing = await prisma.table.findFirst({
      where: { number: data.number, floor, tenantId },
    });

    if (existing) {
      throw new AppError(`${floor}-etajda ${data.number}-raqamli stol allaqachon mavjud`, 400);
    }

    const qrCode = `TABLE-F${floor}-${String(data.number).padStart(3, '0')}-${Date.now()}`;

    const table = await prisma.table.create({
      data: {
        tenantId,
        number: data.number,
        floor,
        name: data.name || `${floor}-etaj, ${data.number}-stol`,
        capacity: data.capacity || 4,
        qrCode,
        positionX: data.positionX,
        positionY: data.positionY,
      },
    });

    return table;
  }

  static async update(
    tenantId: string,
    id: string,
    data: {
      name?: string;
      capacity?: number;
      status?: TableStatus;
      positionX?: number;
      positionY?: number;
      isActive?: boolean;
    }
  ) {
    await this.getById(tenantId, id);

    const table = await prisma.table.update({
      where: { id, tenantId },
      data,
    });

    return table;
  }

  static async delete(tenantId: string, id: string) {
    const table = await this.getById(tenantId, id);

    // Check for active orders
    if (table.orders.length > 0) {
      throw new AppError('Bu stolda faol buyurtmalar mavjud', 400);
    }

    await prisma.table.delete({
      where: { id, tenantId },
    });
  }

  static async generateQRCode(tenantId: string, id: string) {
    const table = await this.getById(tenantId, id);

    const menuUrl = `${process.env.CLIENT_URL}/menu?table=${table.qrCode}`;

    const qrCodeDataUrl = await QRCode.toDataURL(menuUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    return {
      table,
      qrCode: qrCodeDataUrl,
      menuUrl,
    };
  }

  static async getByQRCode(tenantId: string, qrCode: string) {
    const table = await prisma.table.findFirst({
      where: { qrCode, tenantId },
      include: {
        orders: {
          where: {
            status: {
              notIn: ['COMPLETED', 'CANCELLED'],
            },
          },
        },
      },
    });

    if (!table) {
      throw new AppError('Stol topilmadi', 404);
    }

    return table;
  }

  static async updateStatus(tenantId: string, id: string, status: TableStatus) {
    await this.getById(tenantId, id);

    const table = await prisma.table.update({
      where: { id, tenantId },
      data: { status },
    });

    return table;
  }
}
