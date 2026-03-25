import { prisma } from '@oshxona/database';
import { AppError } from '../../middleware/errorHandler.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_API = 'https://api.telegram.org/bot';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
    contact?: {
      phone_number: string;
    };
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      first_name: string;
      username?: string;
    };
    message: {
      chat: {
        id: number;
      };
    };
    data: string;
  };
}

interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

interface InlineKeyboard {
  inline_keyboard: InlineKeyboardButton[][];
}

export class TelegramBotService {
  // ==========================================
  // WEBHOOK HANDLER
  // ==========================================

  static async handleWebhook(tenantId: string, update: TelegramUpdate) {
    try {
      if (update.callback_query) {
        const { callback_query } = update;
        const chatId = String(callback_query.message.chat.id);
        const data = callback_query.data;

        // Callback query javob berish
        await this.answerCallbackQuery(callback_query.id);

        // Foydalanuvchini ro'yxatga olish
        await this.registerUser(
          tenantId,
          chatId,
          callback_query.from.username,
          callback_query.from.first_name
        );

        // Callback data ni qayta ishlash
        if (data.startsWith('category_')) {
          const categoryId = data.replace('category_', '');
          await this.sendCategoryProducts(tenantId, chatId, categoryId);
        } else if (data.startsWith('order_')) {
          const [, productId, quantity] = data.split('_');
          await this.handleOrder(tenantId, chatId, productId, parseInt(quantity || '1'));
        }

        return { ok: true };
      }

      if (update.message) {
        const { message } = update;
        const chatId = String(message.chat.id);
        const text = message.text || '';

        // Foydalanuvchini ro'yxatga olish
        await this.registerUser(
          tenantId,
          chatId,
          message.from.username,
          message.from.first_name
        );

        // Kontakt yuborilsa — telefon raqamini bog'lash
        if (message.contact) {
          await this.linkCustomer(tenantId, chatId, message.contact.phone_number);
          await this.sendMessage(chatId, 'Telefon raqamingiz bog\'landi! Endi buyurtma berishingiz mumkin.');
          return { ok: true };
        }

        // Komandalar
        if (text === '/start') {
          await this.sendMessage(
            chatId,
            `Assalomu alaykum, ${message.from.first_name}! \nBuyurtma berish uchun /menu ni bosing.\nTelefon raqamingizni yuborish uchun /connect ni bosing.`
          );
        } else if (text === '/menu') {
          await this.sendMenuMessage(tenantId, chatId);
        } else if (text === '/connect') {
          await this.sendMessage(chatId, 'Telefon raqamingizni yuborish uchun pastdagi tugmani bosing:', {
            inline_keyboard: [],
          });
          // Reply keyboard bilan telefon so'rash
          await this.sendMessageWithReplyKeyboard(chatId, 'Telefon raqamingizni yuboring:', {
            keyboard: [[{ text: 'Telefon raqamni yuborish', request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true,
          });
        } else {
          await this.sendMessage(chatId, 'Buyurtma berish uchun /menu ni bosing.');
        }

        return { ok: true };
      }

      return { ok: true };
    } catch (error) {
      console.error('Telegram webhook xatolik:', error);
      return { ok: false, error: String(error) };
    }
  }

  // ==========================================
  // MESSAGING
  // ==========================================

  static async sendMessage(chatId: string, text: string, keyboard?: InlineKeyboard) {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    };

    if (keyboard) {
      body.reply_markup = keyboard;
    }

    const response = await fetch(`${TELEGRAM_API}${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = await response.json() as any;

    if (!result.ok) {
      console.error('Telegram sendMessage xatolik:', result);
    }

    return result;
  }

  static async sendMessageWithReplyKeyboard(
    chatId: string,
    text: string,
    keyboard: Record<string, unknown>
  ) {
    const body = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: keyboard,
    };

    const response = await fetch(`${TELEGRAM_API}${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return response.json();
  }

  private static async answerCallbackQuery(callbackQueryId: string) {
    await fetch(`${TELEGRAM_API}${BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId }),
    });
  }

  // ==========================================
  // USER MANAGEMENT
  // ==========================================

  static async registerUser(
    tenantId: string,
    chatId: string,
    username?: string,
    firstName?: string
  ) {
    const existing = await prisma.telegramUser.findFirst({
      where: { chatId, tenantId },
    });

    if (existing) {
      // Yangilash
      if (username || firstName) {
        await prisma.telegramUser.update({
          where: { id: existing.id },
          data: {
            username: username || existing.username,
            firstName: firstName || existing.firstName,
          },
        });
      }
      return existing;
    }

    return prisma.telegramUser.create({
      data: {
        chatId,
        username,
        firstName,
        tenantId,
      },
    });
  }

  static async linkCustomer(tenantId: string, chatId: string, phone: string) {
    // Telefon raqamini tozalash
    const cleanPhone = phone.replace(/[^0-9+]/g, '');

    const telegramUser = await prisma.telegramUser.findFirst({
      where: { chatId, tenantId },
    });

    if (!telegramUser) {
      throw new AppError('Telegram foydalanuvchi topilmadi', 404);
    }

    // Mavjud mijozni topish
    const customer = await prisma.customer.findFirst({
      where: {
        tenantId,
        phone: { contains: cleanPhone.replace('+', '') },
      },
    });

    if (customer) {
      await prisma.telegramUser.update({
        where: { id: telegramUser.id },
        data: {
          phone: cleanPhone,
          customerId: customer.id,
        },
      });
      return { linked: true, customer };
    }

    // Yangi mijoz yaratish
    const newCustomer = await prisma.customer.create({
      data: {
        phone: cleanPhone,
        firstName: telegramUser.firstName,
        tenantId,
      },
    });

    await prisma.telegramUser.update({
      where: { id: telegramUser.id },
      data: {
        phone: cleanPhone,
        customerId: newCustomer.id,
      },
    });

    return { linked: true, customer: newCustomer };
  }

  // ==========================================
  // ORDER STATUS
  // ==========================================

  static async sendOrderStatus(tenantId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        items: { include: { product: { select: { name: true } } } },
        customer: { select: { phone: true } },
      },
    });

    if (!order) {
      throw new AppError('Buyurtma topilmadi', 404);
    }

    // Mijozning telegram chatId sini topish
    if (!order.customer?.phone) return null;

    const telegramUser = await prisma.telegramUser.findFirst({
      where: {
        tenantId,
        phone: { contains: order.customer.phone.replace('+', '') },
        isActive: true,
      },
    });

    if (!telegramUser) return null;

    const statusLabels: Record<string, string> = {
      NEW: 'Yangi',
      CONFIRMED: 'Tasdiqlandi',
      PREPARING: 'Tayyorlanmoqda',
      READY: 'Tayyor',
      DELIVERING: 'Yetkazilmoqda',
      COMPLETED: 'Bajarildi',
      CANCELLED: 'Bekor qilindi',
    };

    const itemsList = order.items
      .map((item) => `  - ${item.product.name} x${item.quantity}`)
      .join('\n');

    const text = `<b>Buyurtma #${order.orderNumber}</b>\n\nHolat: <b>${statusLabels[order.status] || order.status}</b>\n\nMahsulotlar:\n${itemsList}\n\nJami: <b>${order.total} so'm</b>`;

    return this.sendMessage(telegramUser.chatId, text);
  }

  // ==========================================
  // MENU
  // ==========================================

  static async sendMenuMessage(tenantId: string, chatId: string) {
    const categories = await prisma.category.findMany({
      where: { tenantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (categories.length === 0) {
      return this.sendMessage(chatId, 'Hozircha menyu mavjud emas.');
    }

    const keyboard: InlineKeyboard = {
      inline_keyboard: categories.map((cat) => [
        { text: cat.name, callback_data: `category_${cat.id}` },
      ]),
    };

    return this.sendMessage(chatId, '<b>Kategoriyalardan birini tanlang:</b>', keyboard);
  }

  static async sendCategoryProducts(tenantId: string, chatId: string, categoryId: string) {
    const products = await prisma.product.findMany({
      where: {
        tenantId,
        categoryId,
        isActive: true,
        isAvailableOnline: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    if (products.length === 0) {
      return this.sendMessage(chatId, 'Bu kategoriyada mahsulotlar mavjud emas.');
    }

    const productLines = products.map(
      (p) => `<b>${p.name}</b> - ${p.price} so'm`
    );

    const keyboard: InlineKeyboard = {
      inline_keyboard: products.map((p) => [
        { text: `${p.name} - ${p.price} so'm`, callback_data: `order_${p.id}_1` },
      ]),
    };

    return this.sendMessage(
      chatId,
      `<b>Mahsulotlar:</b>\n\n${productLines.join('\n')}\n\nBuyurtma berish uchun mahsulotni tanlang:`,
      keyboard
    );
  }

  // ==========================================
  // ORDER
  // ==========================================

  static async handleOrder(tenantId: string, chatId: string, productId: string, quantity: number) {
    const telegramUser = await prisma.telegramUser.findFirst({
      where: { chatId, tenantId },
      include: { customer: true },
    });

    if (!telegramUser) {
      return this.sendMessage(chatId, 'Avval /start buyrug\'ini yuboring.');
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId, isActive: true },
    });

    if (!product) {
      return this.sendMessage(chatId, 'Mahsulot topilmadi.');
    }

    // Tenant settings orqali manager/default user topish
    const defaultUser = await prisma.user.findFirst({
      where: { tenantId, role: 'MANAGER', isActive: true },
    });

    if (!defaultUser) {
      return this.sendMessage(chatId, 'Kechirasiz, hozir buyurtma qabul qila olmaymiz.');
    }

    const total = Number(product.price) * quantity;

    // Order yaratish
    const orderNumber = `TG-${Date.now().toString(36).toUpperCase()}`;
    const order = await prisma.order.create({
      data: {
        orderNumber,
        source: 'TELEGRAM_ORDER',
        type: 'TAKEAWAY',
        status: 'NEW',
        customerId: telegramUser.customerId,
        userId: defaultUser.id,
        subtotal: total,
        total,
        tenantId,
        items: {
          create: {
            productId: product.id,
            quantity,
            price: product.price,
            total,
          },
        },
      },
    });

    const text = `<b>Buyurtma qabul qilindi!</b>\n\nBuyurtma: #${orderNumber}\nMahsulot: ${product.name}\nMiqdor: ${quantity}\nJami: ${total} so'm\n\nBuyurtma holatini kuzatib boring.`;

    return this.sendMessage(chatId, text);
  }

  // ==========================================
  // RESERVATION CONFIRMATION
  // ==========================================

  static async sendReservationConfirmation(
    chatId: string,
    reservation: {
      confirmationCode?: string | null;
      customerName: string;
      reservationDate: Date;
      startTime: Date;
      endTime: Date;
      guestCount: number;
    }
  ) {
    const date = reservation.reservationDate.toLocaleDateString('uz-UZ');
    const start = reservation.startTime.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    const end = reservation.endTime.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

    const text = `<b>Bron tasdiqlandi!</b>\n\nMehmon: ${reservation.customerName}\nSana: ${date}\nVaqt: ${start} - ${end}\nMehmonlar: ${reservation.guestCount}\n${reservation.confirmationCode ? `\nKod: <code>${reservation.confirmationCode}</code>` : ''}`;

    return this.sendMessage(chatId, text);
  }

  // ==========================================
  // BROADCAST
  // ==========================================

  static async broadcastMessage(tenantId: string, message: string) {
    const users = await prisma.telegramUser.findMany({
      where: { tenantId, isActive: true },
    });

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        await this.sendMessage(user.chatId, message);
        sent++;
      } catch {
        failed++;
      }
      // Rate limit — 30 xabar/sekundda
      if ((sent + failed) % 25 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return { total: users.length, sent, failed };
  }

  // ==========================================
  // WEBHOOK SETUP
  // ==========================================

  static async setupWebhook(webhookUrl: string) {
    const response = await fetch(`${TELEGRAM_API}${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl }),
    });

    return response.json();
  }
}
