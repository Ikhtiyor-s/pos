import { prisma } from '@oshxona/database';
import { AppError } from '../../middleware/errorHandler.js';

// ==========================================
// TELEGRAM BOT SERVICE
// Multi-tenant bot: ordering, notifications, admin commands
// ==========================================

// --- Types ---

interface TgUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TgMessage {
  message_id: number;
  from: TgUser;
  chat: { id: number; type: string };
  text?: string;
  contact?: { phone_number: string };
}

interface TgCallbackQuery {
  id: string;
  from: TgUser;
  message: { message_id: number; chat: { id: number } };
  data?: string;
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface Session {
  cart: CartItem[];
  orderType?: 'DINE_IN' | 'TAKEAWAY';
  tableNumber?: number;
  expiresAt: number;
}

// --- Session store ---

const SESSION_TTL = 30 * 60 * 1000;
const sessions = new Map<string, Session>();

function skey(tenantId: string, chatId: string) { return `${tenantId}:${chatId}`; }

function getSession(tenantId: string, chatId: string): Session {
  const key = skey(tenantId, chatId);
  const now = Date.now();
  let s = sessions.get(key);
  if (!s || s.expiresAt < now) {
    s = { cart: [], expiresAt: now + SESSION_TTL };
    sessions.set(key, s);
  }
  s.expiresAt = now + SESSION_TTL;
  return s;
}

function patchSession(tenantId: string, chatId: string, patch: Partial<Session>) {
  const s = getSession(tenantId, chatId);
  Object.assign(s, patch, { expiresAt: Date.now() + SESSION_TTL });
  sessions.set(skey(tenantId, chatId), s);
}

function clearSession(tenantId: string, chatId: string) {
  sessions.delete(skey(tenantId, chatId));
}

// Cleanup stale sessions every 15 min
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of sessions) { if (v.expiresAt < now) sessions.delete(k); }
}, 15 * 60 * 1000);

// --- Telegram API wrapper ---

const TG_API = 'https://api.telegram.org/bot';

async function tgCall(token: string, method: string, params: Record<string, unknown>): Promise<any> {
  try {
    const r = await fetch(`${TG_API}${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = await r.json() as any;
    if (!json.ok) console.warn(`[TG] ${method} failed:`, json.description);
    return json;
  } catch (e) {
    console.error(`[TG] ${method} network error:`, e);
    return { ok: false };
  }
}

async function sendMsg(
  token: string,
  chatId: string | number,
  text: string,
  extra: Record<string, unknown> = {},
) {
  return tgCall(token, 'sendMessage', {
    chat_id: chatId, text, parse_mode: 'HTML', ...extra,
  });
}

async function editMsg(
  token: string,
  chatId: string | number,
  msgId: number,
  text: string,
  extra: Record<string, unknown> = {},
) {
  return tgCall(token, 'editMessageText', {
    chat_id: chatId, message_id: msgId, text, parse_mode: 'HTML', ...extra,
  });
}

async function answerCbq(token: string, id: string, text?: string) {
  return tgCall(token, 'answerCallbackQuery', {
    callback_query_id: id, ...(text ? { text, show_alert: false } : {}),
  });
}

function inlineKb(rows: { text: string; callback_data: string }[][]): Record<string, unknown> {
  return { reply_markup: { inline_keyboard: rows } };
}

function money(n: number) {
  return n.toLocaleString('uz-UZ', { maximumFractionDigits: 0 }) + " so'm";
}

// ==========================================
// MAIN SERVICE
// ==========================================

export class TelegramBotService {

  // ==========================================
  // TENANT LOOKUP
  // ==========================================

  static async getSettings(tenantId: string) {
    return prisma.settings.findUnique({ where: { tenantId } });
  }

  static async getTenantByToken(botToken: string): Promise<string | null> {
    const s = await prisma.settings.findFirst({
      where: { telegramBotToken: botToken },
      select: { tenantId: true },
    });
    return s?.tenantId || null;
  }

  // ==========================================
  // WEBHOOK DISPATCHER
  // ==========================================

  static async handleWebhook(tenantId: string, update: TgUpdate): Promise<void> {
    const settings = await this.getSettings(tenantId);
    if (!settings?.telegramBotToken) return;
    const token = settings.telegramBotToken;

    if (update.message) {
      const msg = update.message;
      const chatId = String(msg.chat.id);
      await this.registerUser(tenantId, chatId, msg.from);

      if (msg.contact) {
        await this.handleContact(token, tenantId, chatId, msg.contact.phone_number);
        return;
      }

      const text = (msg.text || '').trim();
      const spaceIdx = text.indexOf(' ');
      const cmd = spaceIdx === -1 ? text : text.slice(0, spaceIdx);
      const arg = spaceIdx === -1 ? '' : text.slice(spaceIdx + 1).trim();

      switch (cmd.toLowerCase()) {
        case '/start':    await this.cmdStart(token, tenantId, chatId, msg.from, settings); break;
        case '/menu':     await this.showCategories(token, tenantId, chatId); break;
        case '/status':   await this.cmdStatus(token, tenantId, chatId, arg || text); break;
        case '/orders':   await this.cmdOrders(token, tenantId, chatId, msg.from); break;
        case '/myorders': await this.cmdMyOrders(token, tenantId, chatId); break;
        case '/cart':     await this.cmdCart(token, tenantId, chatId); break;
        case '/cancel':
          clearSession(tenantId, chatId);
          await sendMsg(token, chatId, '❌ Bekor qilindi. Yangi buyurtma: /menu');
          break;
        case '/help': await this.cmdHelp(token, chatId); break;
        default:
          // Plain text — treat as order number lookup
          if (arg === '' && /^[A-Z0-9-]{4,20}$/i.test(text)) {
            await this.cmdStatus(token, tenantId, chatId, text);
          }
          break;
      }
    } else if (update.callback_query) {
      const cbq = update.callback_query;
      const chatId = String(cbq.message.chat.id);
      const msgId = cbq.message.message_id;
      await answerCbq(token, cbq.id);
      await this.registerUser(tenantId, chatId, cbq.from);
      await this.handleCallback(token, tenantId, chatId, msgId, cbq.data || '');
    }
  }

  // ==========================================
  // COMMANDS
  // ==========================================

  static async cmdStart(
    token: string, tenantId: string, chatId: string,
    tgUser: TgUser, settings: any,
  ) {
    clearSession(tenantId, chatId);
    const name = settings.name || 'Restoran';
    const phone = settings.phone ? `\n📞 ${settings.phone}` : '';
    const address = settings.address ? `\n📍 ${settings.address}` : '';

    await sendMsg(token, chatId,
      `🍽 <b>${name}</b>ga xush kelibsiz, ${tgUser.first_name}!${phone}${address}\n\n` +
      `📋 Menyu: /menu\n📦 Buyurtmalarim: /myorders\n🛒 Savat: /cart\n❓ Yordam: /help`,
      inlineKb([
        [{ text: '📋 Menyu', callback_data: 'menu' }, { text: '🛒 Savat', callback_data: 'cart' }],
        [{ text: '📦 Buyurtmalarim', callback_data: 'myorders' }],
      ]),
    );
  }

  static async cmdStatus(token: string, tenantId: string, chatId: string, ref: string) {
    const r = ref.trim().toUpperCase();
    if (!r) {
      return sendMsg(token, chatId, 'Foydalanish: <code>/status TG1A2B3C</code>');
    }

    const order = await prisma.order.findFirst({
      where: { tenantId, orderNumber: { in: [r, r.toLowerCase()] } },
      include: { items: { include: { product: { select: { name: true } } } } },
    });

    if (!order) {
      return sendMsg(token, chatId, `❌ <b>#${r}</b> buyurtma topilmadi.`);
    }

    const emoji: Record<string, string> = {
      NEW: '🆕', CONFIRMED: '✅', PREPARING: '🍳',
      READY: '🔔', DELIVERING: '🚗', COMPLETED: '✔️', CANCELLED: '❌',
    };
    const label: Record<string, string> = {
      NEW: 'Yangi', CONFIRMED: 'Tasdiqlangan', PREPARING: 'Tayyorlanmoqda',
      READY: 'Tayyor', DELIVERING: 'Yetkazilmoqda', COMPLETED: 'Bajarildi', CANCELLED: 'Bekor',
    };

    const items = order.items.map(i => `  • ${i.product.name} ×${i.quantity}`).join('\n');

    await sendMsg(token, chatId,
      `${emoji[order.status] || '📦'} <b>Buyurtma #${order.orderNumber}</b>\n\n` +
      `Holat: <b>${label[order.status] || order.status}</b>\n\n` +
      `${items}\n\n💰 Jami: <b>${money(Number(order.total))}</b>`,
    );
  }

  static async cmdOrders(token: string, tenantId: string, chatId: string, from: TgUser) {
    const isAdm = await this.isAdmin(tenantId, chatId);
    if (!isAdm) return sendMsg(token, chatId, '❌ Bu buyruq faqat adminlar uchun.');

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const [orders, stats, cancelled] = await Promise.all([
      prisma.order.findMany({
        where: { tenantId, createdAt: { gte: today, lt: tomorrow } },
        select: { orderNumber: true, status: true, total: true, source: true },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
      prisma.order.aggregate({
        where: { tenantId, status: 'COMPLETED', createdAt: { gte: today, lt: tomorrow } },
        _sum: { total: true }, _count: true,
      }),
      prisma.order.count({ where: { tenantId, status: 'CANCELLED', createdAt: { gte: today, lt: tomorrow } } }),
    ]);

    if (orders.length === 0) return sendMsg(token, chatId, '📭 Bugun hali buyurtma yo\'q.');

    const emoji: Record<string, string> = {
      NEW: '🆕', CONFIRMED: '✅', PREPARING: '🍳', READY: '🔔', DELIVERING: '🚗', COMPLETED: '✔️', CANCELLED: '❌',
    };
    const lines = orders.map(o => `${emoji[o.status] || '•'} #${o.orderNumber} — ${money(Number(o.total))}`).join('\n');

    await sendMsg(token, chatId,
      `📊 <b>Bugungi buyurtmalar</b>\n\n${lines}\n\n─────────\n` +
      `✅ Bajarildi: <b>${stats._count}</b> | ❌ Bekor: <b>${cancelled}</b>\n` +
      `💰 Jami: <b>${money(Number(stats._sum.total || 0))}</b>`,
    );
  }

  static async cmdMyOrders(token: string, tenantId: string, chatId: string) {
    const tgUser = await prisma.telegramUser.findFirst({
      where: { chatId, tenantId },
    });

    if (!tgUser?.customerId) {
      return sendMsg(token, chatId,
        '📱 Buyurtmalaringizni ko\'rish uchun telefon raqamingizni ulang.',
        inlineKb([[{ text: '📱 Raqamni ulash', callback_data: 'share_phone' }]]),
      );
    }

    const orders = await prisma.order.findMany({
      where: { tenantId, customerId: tgUser.customerId },
      select: { orderNumber: true, status: true, total: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (orders.length === 0) return sendMsg(token, chatId, '📭 Siz hali buyurtma bermagansiz.');

    const lines = orders.map(o =>
      `• <b>#${o.orderNumber}</b> — ${money(Number(o.total))} (${o.status})`
    ).join('\n');

    await sendMsg(token, chatId, `📦 <b>So\'nggi 5 buyurtma:</b>\n\n${lines}`);
  }

  static async cmdCart(token: string, tenantId: string, chatId: string) {
    const sess = getSession(tenantId, chatId);
    await this.showCart(token, tenantId, chatId, sess);
  }

  static async cmdHelp(token: string, chatId: string) {
    await sendMsg(token, chatId,
      `ℹ️ <b>Yordam</b>\n\n` +
      `/start — Bosh sahifa\n` +
      `/menu — Ovqatlar menyusi\n` +
      `/status RAQAM — Buyurtma holati\n` +
      `/myorders — Mening buyurtmalarim\n` +
      `/cart — Savatim\n` +
      `/cancel — Bekor qilish\n` +
      `/orders — Bugungi buyurtmalar (admin)\n` +
      `/help — Shu yordam`,
    );
  }

  // ==========================================
  // CALLBACK HANDLER
  // ==========================================

  static async handleCallback(
    token: string, tenantId: string, chatId: string, msgId: number, data: string,
  ) {
    const sess = getSession(tenantId, chatId);

    if (data === 'menu' || data === 'back_menu') {
      await this.showCategories(token, tenantId, chatId, msgId);

    } else if (data === 'cart') {
      await this.showCart(token, tenantId, chatId, sess, msgId);

    } else if (data === 'myorders') {
      await this.cmdMyOrders(token, tenantId, chatId);

    } else if (data === 'clr') {
      patchSession(tenantId, chatId, { cart: [], orderType: undefined, tableNumber: undefined });
      await sendMsg(token, chatId, '🛒 Savat tozalandi.', inlineKb([[{ text: '📋 Menyu', callback_data: 'menu' }]]));

    } else if (data === 'chk') {
      await this.showOrderType(token, tenantId, chatId, sess, msgId);

    } else if (data === 'order_confirm') {
      await this.placeOrder(token, tenantId, chatId);

    } else if (data === 'share_phone') {
      await tgCall(token, 'sendMessage', {
        chat_id: chatId,
        text: '📱 Telefon raqamingizni yuboring:',
        reply_markup: {
          keyboard: [[{ text: '📱 Raqamni yuborish', request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });

    } else if (data.startsWith('cat:')) {
      await this.showProducts(token, tenantId, chatId, data.slice(4), msgId);

    } else if (data.startsWith('p:')) {
      await this.showProductDetail(token, tenantId, chatId, data.slice(2), msgId);

    } else if (data.startsWith('add:')) {
      const parts = data.slice(4).split(':');
      const productId = parts[0];
      const qty = parseInt(parts[1]) || 1;
      await this.addToCart(token, tenantId, chatId, productId, qty);

    } else if (data.startsWith('del:')) {
      const productId = data.slice(4);
      const cart = sess.cart.filter(i => i.productId !== productId);
      patchSession(tenantId, chatId, { cart });
      await this.showCart(token, tenantId, chatId, { ...sess, cart }, msgId);

    } else if (data.startsWith('otype:')) {
      const orderType = data.slice(6) as 'DINE_IN' | 'TAKEAWAY';
      patchSession(tenantId, chatId, { orderType });
      if (orderType === 'DINE_IN') {
        await this.showTableSelection(token, tenantId, chatId, msgId);
      } else {
        await this.showConfirm(token, tenantId, chatId, { ...sess, orderType }, msgId);
      }

    } else if (data.startsWith('tbl:')) {
      const tableNumber = parseInt(data.slice(4));
      patchSession(tenantId, chatId, { tableNumber });
      await this.showConfirm(token, tenantId, chatId, { ...sess, tableNumber }, msgId);
    }
  }

  // ==========================================
  // MENU FLOW
  // ==========================================

  static async showCategories(
    token: string, tenantId: string, chatId: string, msgId?: number,
  ) {
    const categories = await prisma.category.findMany({
      where: { tenantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true },
    });

    if (categories.length === 0) {
      return sendMsg(token, chatId, '📭 Menyu hali to\'ldirilmagan.');
    }

    const rows = [
      ...categories.map(c => [{ text: c.name, callback_data: `cat:${c.id}` }]),
      [{ text: '🛒 Savatim', callback_data: 'cart' }],
    ];

    const text = '🍽 <b>Kategoriyani tanlang:</b>';
    const extra = inlineKb(rows);
    if (msgId) await editMsg(token, chatId, msgId, text, extra);
    else await sendMsg(token, chatId, text, extra);
  }

  static async showProducts(
    token: string, tenantId: string, chatId: string, categoryId: string, msgId?: number,
  ) {
    const [category, products] = await Promise.all([
      prisma.category.findUnique({ where: { id: categoryId }, select: { name: true } }),
      prisma.product.findMany({
        where: { tenantId, categoryId, isActive: true, isAvailableOnline: true },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true, price: true },
        take: 20,
      }),
    ]);

    if (products.length === 0) {
      const extra = inlineKb([[{ text: '← Kategoriyalar', callback_data: 'menu' }]]);
      if (msgId) await editMsg(token, chatId, msgId, '📭 Bu kategoriyada mahsulot yo\'q.', extra);
      else await sendMsg(token, chatId, '📭 Bu kategoriyada mahsulot yo\'q.', extra);
      return;
    }

    const list = products.map(p => `• <b>${p.name}</b> — ${money(Number(p.price))}`).join('\n');
    const rows = [
      ...products.map(p => [{ text: `${p.name} — ${money(Number(p.price))}`, callback_data: `p:${p.id}` }]),
      [{ text: '← Kategoriyalar', callback_data: 'menu' }, { text: '🛒 Savat', callback_data: 'cart' }],
    ];

    const text = `📂 <b>${category?.name || 'Mahsulotlar'}</b>\n\n${list}`;
    if (msgId) await editMsg(token, chatId, msgId, text, inlineKb(rows));
    else await sendMsg(token, chatId, text, inlineKb(rows));
  }

  static async showProductDetail(
    token: string, tenantId: string, chatId: string, productId: string, msgId?: number,
  ) {
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId, isActive: true },
      select: { id: true, name: true, price: true, description: true, categoryId: true },
    });
    if (!product) return;

    const desc = product.description ? `\n\n<i>${product.description}</i>` : '';
    const text = `🍽 <b>${product.name}</b>${desc}\n\n💰 Narxi: <b>${money(Number(product.price))}</b>\n\n<b>Miqdorni tanlang:</b>`;

    const rows = [
      [1, 2, 3].map(n => ({ text: `${n} ta`, callback_data: `add:${product.id}:${n}` })),
      [4, 5, 6].map(n => ({ text: `${n} ta`, callback_data: `add:${product.id}:${n}` })),
      [
        { text: '← Orqaga', callback_data: `cat:${product.categoryId}` },
        { text: '🛒 Savat', callback_data: 'cart' },
      ],
    ];

    if (msgId) await editMsg(token, chatId, msgId, text, inlineKb(rows));
    else await sendMsg(token, chatId, text, inlineKb(rows));
  }

  static async addToCart(
    token: string, tenantId: string, chatId: string, productId: string, qty: number,
  ) {
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId, isActive: true },
      select: { id: true, name: true, price: true },
    });
    if (!product) return;

    const sess = getSession(tenantId, chatId);
    const existing = sess.cart.find(i => i.productId === productId);
    if (existing) {
      existing.quantity += qty;
    } else {
      sess.cart.push({ productId, name: product.name, price: Number(product.price), quantity: qty });
    }
    patchSession(tenantId, chatId, { cart: sess.cart });

    const total = sess.cart.reduce((s, i) => s + i.quantity, 0);

    await sendMsg(token, chatId,
      `✅ <b>${product.name}</b> ×${qty} savatga qo\'shildi!\n\nSavatda jami: ${total} ta mahsulot`,
      inlineKb([
        [{ text: '📋 Menyuga qaytish', callback_data: 'menu' }],
        [{ text: '🛒 Savatni ko\'rish', callback_data: 'cart' }],
      ]),
    );
  }

  static async showCart(
    token: string, tenantId: string, chatId: string, sess: Session, msgId?: number,
  ) {
    if (sess.cart.length === 0) {
      const extra = inlineKb([[{ text: '📋 Menyu', callback_data: 'menu' }]]);
      if (msgId) await editMsg(token, chatId, msgId, '🛒 Savat bo\'sh.\n\nBuyurtma berish: /menu', extra);
      else await sendMsg(token, chatId, '🛒 Savat bo\'sh.\n\nBuyurtma berish: /menu', extra);
      return;
    }

    const total = sess.cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const lines = sess.cart.map(i =>
      `• ${i.name} ×${i.quantity} = ${money(i.price * i.quantity)}`
    ).join('\n');

    const delRows = sess.cart.map(i => [{ text: `🗑 ${i.name}`, callback_data: `del:${i.productId}` }]);
    const rows = [
      ...delRows,
      [{ text: '➕ Yana qo\'shish', callback_data: 'menu' }],
      [{ text: '🗑 Tozalash', callback_data: 'clr' }, { text: '✅ Buyurtma berish', callback_data: 'chk' }],
    ];

    const text = `🛒 <b>Savatim</b>\n\n${lines}\n\n💰 Jami: <b>${money(total)}</b>`;
    if (msgId) await editMsg(token, chatId, msgId, text, inlineKb(rows));
    else await sendMsg(token, chatId, text, inlineKb(rows));
  }

  static async showOrderType(
    token: string, tenantId: string, chatId: string, sess: Session, msgId?: number,
  ) {
    if (sess.cart.length === 0) return this.showCart(token, tenantId, chatId, sess, msgId);

    const total = sess.cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const lines = sess.cart.map(i => `• ${i.name} ×${i.quantity}`).join('\n');

    const text = `${lines}\n\n💰 Jami: <b>${money(total)}</b>\n\n<b>Buyurtma turini tanlang:</b>`;
    const rows = [
      [{ text: '🪑 Joyida (Dine-in)', callback_data: 'otype:DINE_IN' }],
      [{ text: '🥡 Olib ketish', callback_data: 'otype:TAKEAWAY' }],
      [{ text: '← Savatga qaytish', callback_data: 'cart' }],
    ];

    if (msgId) await editMsg(token, chatId, msgId, text, inlineKb(rows));
    else await sendMsg(token, chatId, text, inlineKb(rows));
  }

  static async showTableSelection(
    token: string, tenantId: string, chatId: string, msgId?: number,
  ) {
    const tables = await prisma.table.findMany({
      where: { tenantId, status: 'FREE' },
      select: { number: true },
      orderBy: { number: 'asc' },
      take: 24,
    });

    if (tables.length === 0) {
      return sendMsg(token, chatId, '⚠️ Hozir bo\'sh stol yo\'q.',
        inlineKb([[{ text: '🥡 Olib ketish', callback_data: 'otype:TAKEAWAY' }]]),
      );
    }

    const chunk = 4;
    const tblRows: { text: string; callback_data: string }[][] = [];
    for (let i = 0; i < tables.length; i += chunk) {
      tblRows.push(tables.slice(i, i + chunk).map(t => ({
        text: `Stol ${t.number}`, callback_data: `tbl:${t.number}`,
      })));
    }
    tblRows.push([{ text: '← Orqaga', callback_data: 'chk' }]);

    const text = '🪑 <b>Stol tanlang:</b>';
    if (msgId) await editMsg(token, chatId, msgId, text, inlineKb(tblRows));
    else await sendMsg(token, chatId, text, inlineKb(tblRows));
  }

  static async showConfirm(
    token: string, tenantId: string, chatId: string, sess: Session, msgId?: number,
  ) {
    if (sess.cart.length === 0) return this.showCart(token, tenantId, chatId, sess, msgId);

    const total = sess.cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const lines = sess.cart.map(i => `• ${i.name} ×${i.quantity}`).join('\n');
    const typeLabel = sess.orderType === 'DINE_IN'
      ? `🪑 Joyida${sess.tableNumber ? ` (Stol ${sess.tableNumber})` : ''}`
      : '🥡 Olib ketish';

    const text =
      `✅ <b>Buyurtmani tasdiqlang</b>\n\n${lines}\n\n` +
      `💰 Jami: <b>${money(total)}</b>\n` +
      `🍽 Tur: ${typeLabel}`;

    const rows = [
      [{ text: '✅ Tasdiqlash va buyurtma berish', callback_data: 'order_confirm' }],
      [{ text: '← Savatga qaytish', callback_data: 'cart' }],
    ];

    if (msgId) await editMsg(token, chatId, msgId, text, inlineKb(rows));
    else await sendMsg(token, chatId, text, inlineKb(rows));
  }

  // ==========================================
  // ORDER PLACEMENT
  // ==========================================

  static async placeOrder(token: string, tenantId: string, chatId: string) {
    const sess = getSession(tenantId, chatId);
    if (sess.cart.length === 0) return sendMsg(token, chatId, '🛒 Savat bo\'sh.');

    const tgUser = await prisma.telegramUser.findFirst({ where: { chatId, tenantId } });

    const defaultUser = await prisma.user.findFirst({
      where: { tenantId, role: { in: ['MANAGER', 'CASHIER'] as any }, isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!defaultUser) {
      return sendMsg(token, chatId, '⚠️ Kechirasiz, hozir buyurtma qabul qilinmayapti.');
    }

    let tableId: string | undefined;
    if (sess.orderType === 'DINE_IN' && sess.tableNumber) {
      const table = await prisma.table.findFirst({
        where: { tenantId, number: sess.tableNumber, status: 'FREE' },
        select: { id: true },
      });
      tableId = table?.id;
    }

    const subtotal = sess.cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const orderNumber = `TG${Date.now().toString(36).toUpperCase().slice(-7)}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        source: 'TELEGRAM_ORDER',
        type: sess.orderType || 'TAKEAWAY',
        status: 'NEW',
        tableId,
        customerId: tgUser?.customerId,
        userId: defaultUser.id,
        subtotal,
        total: subtotal,
        tenantId,
        items: {
          create: sess.cart.map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.price,
            total: i.price * i.quantity,
          })),
        },
      },
    });

    const cartSnapshot = [...sess.cart];
    clearSession(tenantId, chatId);

    await sendMsg(token, chatId,
      `🎉 <b>Buyurtma qabul qilindi!</b>\n\n` +
      `📋 Raqam: <b>#${orderNumber}</b>\n` +
      `💰 Jami: <b>${money(subtotal)}</b>\n\n` +
      `Holat kuzatish: /status ${orderNumber}`,
    );

    // Staff notification
    this.notifyNewOrder(tenantId, {
      orderNumber,
      total: subtotal,
      source: 'TELEGRAM_ORDER',
      items: cartSnapshot,
    }).catch(console.error);
  }

  // ==========================================
  // CONTACT
  // ==========================================

  static async handleContact(token: string, tenantId: string, chatId: string, phoneRaw: string) {
    const phone = phoneRaw.startsWith('+') ? phoneRaw : `+${phoneRaw}`;
    const tgUser = await prisma.telegramUser.findFirst({ where: { chatId, tenantId } });
    if (!tgUser) return;

    let customer = await prisma.customer.findFirst({
      where: { tenantId, phone: { contains: phone.replace('+998', '').replace('+', '') } },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: { phone, firstName: tgUser.firstName, tenantId },
      });
    }

    await prisma.telegramUser.update({
      where: { id: tgUser.id },
      data: { phone, customerId: customer.id },
    });

    await tgCall(token, 'sendMessage', {
      chat_id: chatId,
      text: '✅ Telefon raqamingiz ulandi! Buyurtma berish: /menu',
      parse_mode: 'HTML',
      reply_markup: { remove_keyboard: true },
    });
  }

  // ==========================================
  // USER / ADMIN CHECK
  // ==========================================

  static async registerUser(tenantId: string, chatId: string, tgUser: TgUser) {
    const existing = await prisma.telegramUser.findFirst({ where: { chatId, tenantId } });
    if (existing) {
      if (tgUser.username !== existing.username || tgUser.first_name !== existing.firstName) {
        await prisma.telegramUser.update({
          where: { id: existing.id },
          data: { username: tgUser.username, firstName: tgUser.first_name },
        });
      }
      return;
    }
    await prisma.telegramUser.create({
      data: { chatId, username: tgUser.username, firstName: tgUser.first_name, tenantId },
    });
  }

  static async isAdmin(tenantId: string, chatId: string): Promise<boolean> {
    const chat = await prisma.telegramChat.findFirst({
      where: { chatId, tenantId, isActive: true, role: { in: ['ADMIN', 'MANAGER'] } },
    });
    return !!chat;
  }

  // ==========================================
  // STAFF NOTIFICATIONS
  // ==========================================

  static async sendToChats(tenantId: string, text: string, event: string): Promise<void> {
    const settings = await this.getSettings(tenantId);
    if (!settings?.telegramBotToken) return;
    if (!settings.telegramEnabled) return;

    const chats = await prisma.telegramChat.findMany({
      where: { tenantId, isActive: true },
      select: { chatId: true, events: true },
    });

    const chatIds = new Set<string>();
    for (const c of chats) {
      if (c.events.includes(event)) chatIds.add(c.chatId);
    }
    // Legacy: telegramChatId from Settings
    if (settings.telegramChatId && (settings.telegramEvents as string[]).includes(event)) {
      chatIds.add(settings.telegramChatId);
    }

    for (const cid of chatIds) {
      try {
        await sendMsg(settings.telegramBotToken, cid, text);
        await new Promise(r => setTimeout(r, 50));
      } catch (e) {
        console.error(`[TG] sendToChats ${cid}:`, e);
      }
    }
  }

  static async notifyNewOrder(tenantId: string, order: {
    orderNumber: string;
    total?: number;
    source?: string;
    items?: { name: string; quantity: number }[];
  }): Promise<void> {
    const srcLabel: Record<string, string> = {
      TELEGRAM_ORDER: '📱 Telegram', POS_ORDER: '🖥 POS',
      QR_ORDER: '📷 QR', WAITER_ORDER: '👨‍🍳 Ofitsiant', NONBOR_ORDER: '🌐 Nonbor',
    };
    const src = srcLabel[order.source || ''] || order.source || '';
    const itemsText = (order.items || []).map(i => `  • ${i.name} ×${i.quantity}`).join('\n');

    await this.sendToChats(tenantId,
      `🆕 <b>Yangi buyurtma #${order.orderNumber}</b>\n` +
      `${src}\n${itemsText}\n` +
      `💰 Jami: <b>${money(Number(order.total || 0))}</b>`,
      'order:new',
    );
  }

  static async notifyLowStock(tenantId: string, items: {
    name: string; quantity: number; unit: string; minQuantity: number;
  }[]): Promise<void> {
    if (items.length === 0) return;
    const lines = items.map(i => `⚠️ ${i.name}: <b>${i.quantity} ${i.unit}</b> (min: ${i.minQuantity})`).join('\n');
    await this.sendToChats(tenantId, `⚠️ <b>Kam qolgan mahsulotlar:</b>\n\n${lines}`, 'stock:low');
  }

  static async sendShiftReport(tenantId: string): Promise<void> {
    const settings = await this.getSettings(tenantId);
    if (!settings?.telegramEnabled || !settings.telegramBotToken) return;

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const [stats, topProducts, cancelled] = await Promise.all([
      prisma.order.aggregate({
        where: { tenantId, status: 'COMPLETED', createdAt: { gte: today, lt: tomorrow } },
        _sum: { total: true, discount: true },
        _count: true,
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: { tenantId, status: 'COMPLETED', createdAt: { gte: today, lt: tomorrow } } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 3,
      }),
      prisma.order.count({
        where: { tenantId, status: 'CANCELLED', createdAt: { gte: today, lt: tomorrow } },
      }),
    ]);

    const productIds = topProducts.map(p => p.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const pMap = new Map(products.map(p => [p.id, p.name]));

    const topText = topProducts.length > 0
      ? topProducts.map((p, i) => `${i + 1}. ${pMap.get(p.productId) || '?'} — ${p._sum.quantity} ta`).join('\n')
      : 'Ma\'lumot yo\'q';

    const dateStr = today.toLocaleDateString('uz-UZ');

    await this.sendToChats(tenantId,
      `📊 <b>Smena hisoboti — ${dateStr}</b>\n\n` +
      `✅ Bajarilgan buyurtmalar: <b>${stats._count}</b>\n` +
      `❌ Bekor qilingan: <b>${cancelled}</b>\n` +
      `💰 Jami daromad: <b>${money(Number(stats._sum.total || 0))}</b>\n` +
      `🏷 Chegirma: ${money(Number(stats._sum.discount || 0))}\n\n` +
      `🏆 <b>Top mahsulotlar:</b>\n${topText}`,
      'shift:report',
    );
  }

  // ==========================================
  // CHAT MANAGEMENT
  // ==========================================

  static async addChat(tenantId: string, data: {
    chatId: string; title?: string; type?: string; role?: string; events?: string[];
  }) {
    return prisma.telegramChat.upsert({
      where: { chatId_tenantId: { chatId: data.chatId, tenantId } },
      update: { title: data.title, role: data.role || 'STAFF', events: data.events, isActive: true },
      create: {
        chatId: data.chatId,
        title: data.title,
        type: data.type || 'private',
        role: data.role || 'STAFF',
        events: data.events || ['order:new', 'stock:low', 'shift:report'],
        tenantId,
      },
    });
  }

  static async getChats(tenantId: string) {
    return prisma.telegramChat.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async removeChat(chatId: string, tenantId: string) {
    return prisma.telegramChat.update({
      where: { chatId_tenantId: { chatId, tenantId } },
      data: { isActive: false },
    });
  }

  // ==========================================
  // BROADCAST & USERS
  // ==========================================

  static async broadcastMessage(tenantId: string, message: string) {
    const settings = await this.getSettings(tenantId);
    if (!settings?.telegramBotToken) throw new AppError('Telegram sozlanmagan', 400);

    const users = await prisma.telegramUser.findMany({
      where: { tenantId, isActive: true },
      select: { chatId: true },
    });

    let sent = 0; let failed = 0;
    for (const u of users) {
      try { await sendMsg(settings.telegramBotToken, u.chatId, message); sent++; }
      catch { failed++; }
      if ((sent + failed) % 25 === 0) await new Promise(r => setTimeout(r, 1000));
    }
    return { total: users.length, sent, failed };
  }

  static async getUsers(tenantId: string, opts: { page?: number; limit?: number; isActive?: boolean } = {}) {
    const page = opts.page || 1;
    const limit = Math.min(opts.limit || 50, 100);
    const where: any = { tenantId };
    if (opts.isActive !== undefined) where.isActive = opts.isActive;

    const [users, total] = await Promise.all([
      prisma.telegramUser.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { id: true, firstName: true, lastName: true, phone: true } } },
      }),
      prisma.telegramUser.count({ where }),
    ]);
    return { users, total, page, limit };
  }

  // ==========================================
  // WEBHOOK SETUP
  // ==========================================

  static async setupWebhook(tenantId: string, appUrl: string) {
    const settings = await this.getSettings(tenantId);
    if (!settings?.telegramBotToken) throw new AppError('Bot token sozlanmagan', 400);
    const webhookUrl = `${appUrl}/api/telegram/webhook/${settings.telegramBotToken}`;
    return tgCall(settings.telegramBotToken, 'setWebhook', { url: webhookUrl, drop_pending_updates: true });
  }

  static async sendOrderStatus(tenantId: string, orderId: string): Promise<void> {
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { customer: { select: { phone: true } } },
    });
    if (!order || !order.customer?.phone) return;

    const tgUser = await prisma.telegramUser.findFirst({
      where: { tenantId, phone: { contains: order.customer.phone.replace('+998', '') } },
    });
    if (!tgUser) return;

    const settings = await this.getSettings(tenantId);
    if (!settings?.telegramBotToken) return;

    await this.cmdStatus(settings.telegramBotToken, tenantId, tgUser.chatId, order.orderNumber);
  }

  static async sendReservationConfirmation(chatId: string, token: string, data: {
    confirmationCode?: string | null;
    customerName: string;
    reservationDate: Date;
    startTime: Date;
    endTime: Date;
    guestCount: number;
  }) {
    const date = data.reservationDate.toLocaleDateString('uz-UZ');
    const start = data.startTime.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    const end = data.endTime.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

    await sendMsg(token, chatId,
      `🎉 <b>Bron tasdiqlandi!</b>\n\n` +
      `👤 ${data.customerName}\n📅 ${date}\n🕐 ${start}–${end}\n👥 ${data.guestCount} kishi` +
      (data.confirmationCode ? `\n\nKod: <code>${data.confirmationCode}</code>` : ''),
    );
  }
}
