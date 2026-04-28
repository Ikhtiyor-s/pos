import axios, { AxiosInstance } from 'axios';
import { prisma } from '@oshxona/database';
import { logger } from '../utils/logger.js';

const DEFAULT_POS_URL = 'http://localhost:8088/api';
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 daqiqa oldin yangilash

// ─── Nonbor POS API response tiplar ─────────────────────────────────────────

interface PosAuthResponse {
  success: boolean;
  data?: {
    accessToken: string;
    refreshToken: string;
    user: { id: string; name: string; firstName: string; lastName: string; phone: string; role: string };
  };
  detail?: string;
}

interface PosCategory {
  id: string;
  name: string;
  nameRu?: string;
  slug?: string;
  sortOrder: number;
  isActive: boolean;
}

interface PosProduct {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  categoryName: string;
  image?: string;
  isActive: boolean;
  barcode?: string;
  cookingTime?: number;
}

interface PosTable {
  id: string;
  name: string;
  capacity: number;
  status: string;
  qrCode?: string;
  sortOrder: number;
  isActive: boolean;
}

interface PosOrder {
  id: string;
  orderNumber: string;
  tableId?: number | null;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod?: string;
  note?: string;
  items?: PosOrderItem[];
}

interface PosOrderItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  note?: string;
  modifiers?: any[];
  variantId?: number | null;
}

interface PosSettings {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  currency: string;
  taxRate: number;
  timezone: string;
  orderPrefix: string;
  bonusPercent?: number;
  logo?: string;
}

class NonborPosService {
  private clients = new Map<string, AxiosInstance>();

  // ── Axios klient (tenant bo'yicha) ─────────────────────────────────────────
  private async getClient(tenantId: string): Promise<AxiosInstance> {
    const settings = await prisma.settings.findUnique({
      where: { tenantId },
      select: {
        nonborPosEnabled: true,
        nonborPosUrl: true,
        nonborPosToken: true,
        nonborPosTokenExpiry: true,
        nonborPosRefreshToken: true,
      },
    });

    if (!settings?.nonborPosEnabled || !settings.nonborPosToken) {
      throw new Error('Nonbor Admin POS ulanmagan');
    }

    const baseURL = (settings.nonborPosUrl || DEFAULT_POS_URL).replace(/\/+$/, '');

    // Token muddati tugayapti → yangilash
    if (settings.nonborPosTokenExpiry) {
      const expiry = new Date(settings.nonborPosTokenExpiry).getTime();
      if (Date.now() >= expiry - TOKEN_REFRESH_BUFFER_MS) {
        const refreshed = await this.doRefreshToken(tenantId, baseURL, settings.nonborPosRefreshToken || '');
        if (refreshed) {
          return this.buildClient(baseURL, refreshed);
        }
      }
    }

    return this.buildClient(baseURL, settings.nonborPosToken);
  }

  private buildClient(baseURL: string, token: string): AxiosInstance {
    return axios.create({
      baseURL,
      timeout: 15000,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  resetClient(tenantId?: string) {
    if (tenantId) {
      this.clients.delete(tenantId);
    } else {
      this.clients.clear();
    }
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  async loginWithCredentials(params: {
    username: string;
    password: string;
    nonborTenantId: string;   // Nonbor'dagi business_id
    posUrl?: string;
    tenantId: string;          // Bizning tenant
  }): Promise<{
    user: PosAuthResponse['data'] extends undefined ? never : NonNullable<PosAuthResponse['data']>['user'];
    settings: PosSettings | null;
    synced: { categories: number; products: number; tables: number };
  }> {
    const { username, password, nonborTenantId, tenantId } = params;
    const baseURL = (params.posUrl || DEFAULT_POS_URL).replace(/\/+$/, '');

    logger.info('[NonborPOS] Login boshlandi', { username, nonborTenantId, baseURL });

    const resp = await axios.post<PosAuthResponse>(
      `${baseURL}/pos/auth/login-pin`,
      { username, password, tenantId: nonborTenantId },
      { timeout: 10000 },
    );

    const data = resp.data;
    if (!data.success || !data.data?.accessToken) {
      const msg = data.detail || 'Login yoki parol noto\'g\'ri';
      throw new Error(msg);
    }

    const { accessToken, refreshToken, user } = data.data;

    // Token expiry — 24 soat
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Sozlamalarni bazaga saqlash
    await prisma.settings.upsert({
      where: { tenantId },
      update: {
        nonborPosEnabled: true,
        nonborPosUrl: baseURL,
        nonborPosUsername: username,
        nonborPosTenantId: nonborTenantId,
        nonborPosToken: accessToken,
        nonborPosRefreshToken: refreshToken,
        nonborPosTokenExpiry: tokenExpiry,
      },
      create: {
        tenantId,
        name: 'Oshxona',
        nonborPosEnabled: true,
        nonborPosUrl: baseURL,
        nonborPosUsername: username,
        nonborPosTenantId: nonborTenantId,
        nonborPosToken: accessToken,
        nonborPosRefreshToken: refreshToken,
        nonborPosTokenExpiry: tokenExpiry,
        taxRate: 0,
        currency: 'UZS',
        orderPrefix: 'ORD',
      },
    });

    this.resetClient(tenantId);
    const client = this.buildClient(baseURL, accessToken);

    // Full sync
    const [posSettings, synced] = await Promise.all([
      this.doSyncSettings(tenantId, client),
      this.doSyncAll(tenantId, client),
    ]);

    logger.info('[NonborPOS] Login muvaffaqiyatli', { tenantId, user: user.name, synced });

    return { user, settings: posSettings, synced };
  }

  // ── Token yangilash ────────────────────────────────────────────────────────
  private async doRefreshToken(tenantId: string, baseURL: string, refreshToken: string): Promise<string | null> {
    try {
      const resp = await axios.post(`${baseURL}/pos/auth/refresh`, { refreshToken }, { timeout: 10000 });
      const d = resp.data;
      if (d?.success && d?.data?.accessToken) {
        const newToken = d.data.accessToken;
        const newRefresh = d.data.refreshToken || refreshToken;
        const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await prisma.settings.update({
          where: { tenantId },
          data: {
            nonborPosToken: newToken,
            nonborPosRefreshToken: newRefresh,
            nonborPosTokenExpiry: tokenExpiry,
          },
        });
        this.resetClient(tenantId);
        return newToken;
      }
    } catch (err) {
      logger.warn('[NonborPOS] Token yangilashda xato', { error: (err as Error).message });
    }
    return null;
  }

  // ── Disconnect ─────────────────────────────────────────────────────────────
  async disconnect(tenantId: string): Promise<void> {
    await prisma.settings.update({
      where: { tenantId },
      data: {
        nonborPosEnabled: false,
        nonborPosToken: null,
        nonborPosRefreshToken: null,
        nonborPosTokenExpiry: null,
      },
    });
    this.resetClient(tenantId);
  }

  // ── Settings sync ──────────────────────────────────────────────────────────
  private async doSyncSettings(tenantId: string, client: AxiosInstance): Promise<PosSettings | null> {
    try {
      const resp = await client.get('/pos/settings');
      const d: PosSettings = resp.data?.success ? resp.data.data : resp.data;
      if (!d?.name) return null;

      await prisma.settings.update({
        where: { tenantId },
        data: {
          name: d.name || undefined,
          address: d.address || undefined,
          phone: d.phone || undefined,
          logo: d.logo || undefined,
          currency: d.currency || 'UZS',
          taxRate: d.taxRate ?? 0,
          orderPrefix: d.orderPrefix || 'ORD',
        },
      });
      return d;
    } catch (err) {
      logger.warn('[NonborPOS] Settings sync xato', { error: (err as Error).message });
      return null;
    }
  }

  // ── Categories sync ────────────────────────────────────────────────────────
  private async doSyncCategories(tenantId: string, client: AxiosInstance): Promise<number> {
    try {
      const resp = await client.get('/pos/categories');
      const list: PosCategory[] = resp.data?.success ? resp.data.data : resp.data;
      if (!Array.isArray(list)) return 0;

      let count = 0;
      for (const cat of list) {
        if (!cat.isActive) continue;
        const slug = cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        await prisma.category.upsert({
          where: { slug_tenantId: { slug, tenantId } },
          update: { name: cat.name, isActive: cat.isActive, sortOrder: cat.sortOrder },
          create: { name: cat.name, slug, isActive: cat.isActive, sortOrder: cat.sortOrder, tenantId },
        }).catch(() => null);
        count++;
      }

      logger.info('[NonborPOS] Kategoriyalar sync', { tenantId, count });
      return count;
    } catch (err) {
      logger.warn('[NonborPOS] Categories sync xato', { error: (err as Error).message });
      return 0;
    }
  }

  // ── Products sync ──────────────────────────────────────────────────────────
  private async doSyncProducts(tenantId: string, client: AxiosInstance): Promise<number> {
    try {
      const resp = await client.get('/pos/products', { params: { limit: 500 } });
      const raw = resp.data?.success ? resp.data.data : resp.data;
      const list: PosProduct[] = Array.isArray(raw) ? raw : (raw?.data || []);
      if (!list.length) return 0;

      // Kategoriya mapping (Nonbor ID → Bizning DB ID)
      const categories = await prisma.category.findMany({ where: { tenantId }, select: { id: true, name: true, slug: true } });
      const catByName = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));

      let count = 0;
      for (const p of list) {
        if (!p.isActive) continue;
        const categoryId = catByName.get(p.categoryName?.toLowerCase()) ?? null;

        // barcode field bilan upsert (NPOS-{id} format)
        const nposBarcode = `NPOS-${p.id}`;
        await prisma.product.upsert({
          where: { barcode_tenantId: { barcode: nposBarcode, tenantId } },
          update: {
            name: p.name,
            price: p.price,
            image: p.image || null,
            isActive: p.isActive,
            ...(categoryId ? { categoryId } : {}),
          },
          create: {
            name: p.name,
            price: p.price,
            barcode: nposBarcode,
            image: p.image || null,
            isActive: p.isActive,
            categoryId: categoryId ?? categories[0]?.id ?? '',
            tenantId,
          },
        }).catch(() => null);
        count++;
      }

      logger.info('[NonborPOS] Mahsulotlar sync', { tenantId, count });
      return count;
    } catch (err) {
      logger.warn('[NonborPOS] Products sync xato', { error: (err as Error).message });
      return 0;
    }
  }

  // ── Tables sync ────────────────────────────────────────────────────────────
  private async doSyncTables(tenantId: string, client: AxiosInstance): Promise<number> {
    try {
      const resp = await client.get('/pos/tables');
      const list: PosTable[] = resp.data?.success ? resp.data.data : resp.data;
      if (!Array.isArray(list)) return 0;

      let count = 0;
      for (let idx = 0; idx < list.length; idx++) {
        const t = list[idx];
        if (!t.isActive) continue;
        // Nonbor POS table ID'dan raqam ajratamiz, yo'qsa sortOrder ishlatamiz
        const tableNum = parseInt(t.id) || t.sortOrder + 1 || idx + 100;
        const existing = await prisma.table.findFirst({
          where: { tenantId, name: t.name },
        });
        if (existing) {
          await prisma.table.update({
            where: { id: existing.id },
            data: { capacity: t.capacity, isActive: t.isActive, name: t.name },
          }).catch(() => null);
        } else {
          await prisma.table.create({
            data: {
              number: tableNum,
              name: t.name,
              capacity: t.capacity,
              isActive: t.isActive,
              qrCode: `npos-${t.id}`,
              tenantId,
            },
          }).catch(() => null);
        }
        count++;
      }

      logger.info('[NonborPOS] Stollar sync', { tenantId, count });
      return count;
    } catch (err) {
      logger.warn('[NonborPOS] Tables sync xato', { error: (err as Error).message });
      return 0;
    }
  }

  // ── Full sync ──────────────────────────────────────────────────────────────
  private async doSyncAll(tenantId: string, client: AxiosInstance): Promise<{ categories: number; products: number; tables: number }> {
    const [categories, products, tables] = await Promise.all([
      this.doSyncCategories(tenantId, client),
      this.doSyncProducts(tenantId, client),
      this.doSyncTables(tenantId, client),
    ]);
    return { categories, products, tables };
  }

  // ── Public sync (authenticated) ────────────────────────────────────────────
  async syncAll(tenantId: string): Promise<{ settings: PosSettings | null; categories: number; products: number; tables: number }> {
    const client = await this.getClient(tenantId);
    const [settings, synced] = await Promise.all([
      this.doSyncSettings(tenantId, client),
      this.doSyncAll(tenantId, client),
    ]);
    return { settings, ...synced };
  }

  // ── Order → Nonbor POS yuborish ────────────────────────────────────────────
  async forwardOrder(params: {
    tenantId: string;
    localOrderId: string;
    tableId?: number | null;
    customerName?: string;
    customerPhone?: string;
    orderType?: string;
    paymentMethod?: string;
    discount?: number;
    note?: string;
    items: Array<{
      productId?: string;
      productName: string;
      quantity: number;
      price: number;
      note?: string;
    }>;
  }): Promise<string | null> {
    const { tenantId, localOrderId } = params;

    try {
      const client = await this.getClient(tenantId);

      const payload = {
        tableId: params.tableId ?? null,
        customerName: params.customerName || '',
        customerPhone: params.customerPhone || '',
        orderType: params.orderType || 'DINE_IN',
        paymentMethod: params.paymentMethod || 'CASH',
        discount: params.discount || 0,
        note: params.note || '',
        items: params.items.map(item => ({
          productId: item.productId ? parseInt(item.productId.replace('NPOS-', '')) || 0 : 0,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          note: item.note || '',
          modifiers: [],
        })),
      };

      const resp = await client.post('/pos/orders', payload);
      const posOrder: PosOrder = resp.data?.success ? resp.data.data : resp.data;
      const posOrderId = posOrder?.id;

      if (posOrderId) {
        await prisma.order.update({
          where: { id: localOrderId },
          data: { nonborPosOrderId: posOrderId },
        }).catch(() => null);

        logger.info('[NonborPOS] Buyurtma yuborildi', { tenantId, localOrderId, posOrderId });
        return posOrderId;
      }
    } catch (err) {
      logger.warn('[NonborPOS] Buyurtma forward xato', {
        tenantId, localOrderId, error: (err as Error).message,
      });
    }
    return null;
  }

  // ── Order status yangilash ─────────────────────────────────────────────────
  async updateOrderStatus(tenantId: string, posOrderId: string, status: string): Promise<void> {
    try {
      const client = await this.getClient(tenantId);
      // Oshxona status → Nonbor POS status mapping
      const statusMap: Record<string, string> = {
        PENDING: 'NEW',
        CONFIRMED: 'NEW',
        PREPARING: 'PREPARING',
        READY: 'READY',
        SERVED: 'SERVED',
        PAID: 'PAID',
        COMPLETED: 'COMPLETED',
        CANCELLED: 'CANCELLED',
      };
      const posStatus = statusMap[status] || status;
      await client.patch(`/pos/orders/${posOrderId}/status`, { status: posStatus });
      logger.info('[NonborPOS] Status yangilandi', { tenantId, posOrderId, posStatus });
    } catch (err) {
      logger.warn('[NonborPOS] Status update xato', { tenantId, posOrderId, error: (err as Error).message });
    }
  }

  // ── To'lov qayd etish ──────────────────────────────────────────────────────
  async recordPayment(tenantId: string, posOrderId: string, amount: number, method: string): Promise<void> {
    try {
      const client = await this.getClient(tenantId);
      await client.post(`/pos/orders/${posOrderId}/payment`, { amount, method, reference: '' });
      logger.info('[NonborPOS] To\'lov qayd etildi', { tenantId, posOrderId, amount, method });
    } catch (err) {
      logger.warn('[NonborPOS] Payment qayd xato', { tenantId, posOrderId, error: (err as Error).message });
    }
  }

  // ── Dashboard statistika ───────────────────────────────────────────────────
  async getDashboard(tenantId: string, period: string = 'today'): Promise<any> {
    const client = await this.getClient(tenantId);
    const resp = await client.get('/pos/dashboard', { params: { period } });
    return resp.data?.success ? resp.data.data : resp.data;
  }

  // ── Monitoring ─────────────────────────────────────────────────────────────
  async getStatus(tenantId: string): Promise<{
    connected: boolean;
    url?: string;
    username?: string;
    nonborTenantId?: string;
    tokenExpiry?: Date | null;
  }> {
    const s = await prisma.settings.findUnique({
      where: { tenantId },
      select: {
        nonborPosEnabled: true,
        nonborPosUrl: true,
        nonborPosUsername: true,
        nonborPosTenantId: true,
        nonborPosTokenExpiry: true,
      },
    });

    if (!s?.nonborPosEnabled) return { connected: false };

    return {
      connected: true,
      url: s.nonborPosUrl || DEFAULT_POS_URL,
      username: s.nonborPosUsername || undefined,
      nonborTenantId: s.nonborPosTenantId || undefined,
      tokenExpiry: s.nonborPosTokenExpiry,
    };
  }
}

export const nonborPosService = new NonborPosService();
