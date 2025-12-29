import { prisma, TableStatus } from '@oshxona/database';
import QRCode from 'qrcode';
import { AppError } from '../middleware/errorHandler.js';

export class TableService {
  static async getAll() {
    const tables = await prisma.table.findMany({
      where: { isActive: true },
      include: {
        orders: {
          where: {
            status: {
              notIn: ['COMPLETED', 'CANCELLED'],
            },
          },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            createdAt: true,
          },
        },
      },
      orderBy: { number: 'asc' },
    });

    return tables;
  }

  static async getById(id: string) {
    const table = await prisma.table.findUnique({
      where: { id },
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

  static async create(data: {
    number: number;
    name?: string;
    capacity?: number;
    positionX?: number;
    positionY?: number;
  }) {
    // Check if table number exists
    const existing = await prisma.table.findUnique({
      where: { number: data.number },
    });

    if (existing) {
      throw new AppError('Bu raqamli stol mavjud', 400);
    }

    // Generate unique QR code
    const qrCode = `TABLE-${String(data.number).padStart(3, '0')}-${Date.now()}`;

    const table = await prisma.table.create({
      data: {
        number: data.number,
        name: data.name || `Stol ${data.number}`,
        capacity: data.capacity || 4,
        qrCode,
        positionX: data.positionX,
        positionY: data.positionY,
      },
    });

    return table;
  }

  static async update(
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
    await this.getById(id);

    const table = await prisma.table.update({
      where: { id },
      data,
    });

    return table;
  }

  static async delete(id: string) {
    const table = await this.getById(id);

    // Check for active orders
    if (table.orders.length > 0) {
      throw new AppError('Bu stolda faol buyurtmalar mavjud', 400);
    }

    await prisma.table.delete({
      where: { id },
    });
  }

  static async generateQRCode(id: string) {
    const table = await this.getById(id);

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

  static async getByQRCode(qrCode: string) {
    const table = await prisma.table.findUnique({
      where: { qrCode },
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

  static async updateStatus(id: string, status: TableStatus) {
    await this.getById(id);

    const table = await prisma.table.update({
      where: { id },
      data: { status },
    });

    return table;
  }
}
