import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { prisma } from '@oshxona/database';
import { logger } from '../utils/logger.js';

// ==========================================
// TYPES — Nonbor v2 API (test.nonbor.uz)
// Based on actual OpenAPI schema /api/v2/schema/
// ==========================================

export interface NonborBusiness {
  id: number;
  title: string;
  address: string;
  logo?: string | null;
  lat: number;
  long: number;
  phone_number?: string;
  is_active?: boolean;
  description?: string;
  working_hours?: any;
}

export interface NonborCategory {
  id: number;
  name: string;
  business: number;
  image?: string | null;
  order?: number;
  is_active?: boolean;
  products_count?: number;
}

export interface NonborProductImage {
  id: number;
  image: string;
  product: number;
}

export interface NonborProductUnit {
  id: number;
  name: string;
}

export interface NonborProduct {
  id: number;
  name: string;
  state: string;
  price: number;       // tiyin hisobida (100 = 1 so'm)
  description?: string;
  category?: number | NonborCategory;
  images: NonborProductImage[];
  is_active?: boolean;
  mxik_code?: string;
  barcode?: string;
  unit?: NonborProductUnit;
  netto?: number;
}

// Nonbor API schema dan: OrderItemList
export interface NonborOrderItem {
  id: number;
  order: number;
  product: NonborProduct;
  quantity: number;          // ← aslida shu, "count" emas
  price: number;
  addon_price: number;
  accepted: boolean;
  rate?: number | null;
  comment?: string | null;
  sale_in_percentage: number;
  addons: any[];
}

export interface NonborUser {
  id?: number;
  username?: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;    // Bu field API'da yo'q, user.username orqali kelishi mumkin
  lat?: number | null;
  long?: number | null;
}

export interface NonborDelivery {
  id: number;
  lat: number;
  long: number;
  address: string;
  entrance?: string | null;
  floor?: string | null;
  apartment?: string | null;
  courier_comment?: string | null;
  price: number;
  current_price: number;
  status?: string;
  courier?: {
    id: number;
    name: string;
    phone: string;
    lat?: number;
    long?: number;
  } | null;
  created_at: string;
  updated_at: string;
}

// Barcha holat: State89bEnum
export type NonborOrderState =
  | 'PENDING'
  | 'WAITING_PAYMENT'
  | 'CHECKING'
  | 'ACCEPTED'
  | 'READY'
  | 'PAYMENT_EXPIRED'
  | 'ACCEPT_EXPIRED'
  | 'CANCELLED_CLIENT'
  | 'CANCELLED_SELLER'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'COMPLETED';

// BusinessOrderSerialiazers schema'dan
export interface NonborOrder {
  id: number;
  business: NonborBusiness;
  delivery_method: 'NOT_CHOSEN' | 'PICKUP' | 'DELIVERY';
  payment_method: 'NOT_CHOSEN' | 'CASH' | 'CLICK' | 'CARD' | null;
  state: NonborOrderState;
  type: 'TAYYOR' | 'REJA' | 'BUYURTMA';
  total_price: string;      // readOnly, computed
  price: number | null;
  items: NonborOrderItem[];  // OrderItemList[] — to'liq ob'ektlar, ID emas
  created_at: string;
  updated_at: string;
  delivery: string | NonborDelivery | null;   // readOnly
  rate?: number | null;
  comment?: string | null;
  user: NonborUser;
  paid: boolean;
  pre_comment?: string | null;
  accepted_at?: string | null;
  checking_at?: string | null;
  paid_at?: string | null;
  ready_at?: string | null;
}

export interface NonborOrdersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: NonborOrder[];
}

// seller-products endpoint response
export interface NonborSellerProduct {
  id: number;
  name: string;
  state: string;
  price: number;
  description?: string;
  is_active: boolean;
  images: NonborProductImage[];
  category?: NonborCategory | null;
  mxik_code?: string;
  barcode?: string;
  unit?: NonborProductUnit;
  netto?: number;
  menu_category?: { id: number; name: string } | null;
  ordering?: number | null;
}

export interface NonborSellerProductsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: NonborSellerProduct[];
}

// seller-menu endpoint response
export interface NonborSellerMenu {
  id: number;
  name: string;
  netto?: number;
  state: string;
  price: number;
  images: string;
  menu_category?: { id: number; name: string } | null;
  ordering?: number | null;
}

export interface NonborMenuCategory {
  id: number;
  name: string;
  order: number;
  business: number;
}

export interface NonborMxikCode {
  code: string;
  name: string;
  description?: string;
}

export interface NonborFiscalReceipt {
  id: number;
  order_id: number;
  receipt_type: string;
  is_refund: boolean;
  status: string;
  fiscal_sign?: string;
  qr_code_url?: string;
  created_at: string;
}

export interface NonborNotification {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface NonborDeliveryTracking {
  order_id: number;
  courier: {
    id: number;
    name: string;
    phone: string;
    lat: number;
    long: number;
  } | null;
  status: string;
  estimated_time?: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ==========================================
// SETTINGS CACHE
// ==========================================

interface NonborSettings {
  nonborApiUrl: string;
  nonborApiSecret: string;
  nonborSellerId: number | null;
  nonborEnabled: boolean;
  tenantId: string;
}

const DEFAULT_API_URL = 'https://test.nonbor.uz/api/v2';

// ==========================================
// SERVICE
// ==========================================

class NonborV2Service {
  private clients: Map<string, AxiosInstance> = new Map();
  private settingsCache: Map<string, { settings: NonborSettings; ts: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 daqiqa

  // ──────────── Auth & Client ────────────

  private async getSettings(tenantId?: string): Promise<NonborSettings> {
    const cacheKey = tenantId || '__default__';
    const cached = this.settingsCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) return cached.settings;

    const where = tenantId ? { tenantId } : { nonborEnabled: true };
    const db = await prisma.settings.findFirst({ where });

    if (!db) throw new Error(`Nonbor sozlamalari topilmadi${tenantId ? ` (tenant: ${tenantId})` : ''}`);

    const settings: NonborSettings = {
      nonborApiUrl: (db.nonborApiUrl || DEFAULT_API_URL).replace(/\/+$/, ''),
      nonborApiSecret: db.nonborApiSecret || '',
      nonborSellerId: db.nonborSellerId,
      nonborEnabled: db.nonborEnabled,
      tenantId: db.tenantId,
    };

    this.settingsCache.set(cacheKey, { settings, ts: Date.now() });
    return settings;
  }

  async getAuthToken(tenantId?: string): Promise<string> {
    const s = await this.getSettings(tenantId);
    if (!s.nonborApiSecret) throw new Error('Nonbor JWT token sozlanmagan (nonborApiSecret)');
    return s.nonborApiSecret;
  }

  private async getClient(tenantId?: string): Promise<AxiosInstance> {
    const settings = await this.getSettings(tenantId);
    const cacheKey = settings.tenantId;
    const existing = this.clients.get(cacheKey);
    if (existing) return existing;

    const client = axios.create({
      baseURL: settings.nonborApiUrl,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        ...(settings.nonborApiSecret ? { Authorization: `Bearer ${settings.nonborApiSecret}` } : {}),
      },
    });

    client.interceptors.response.use(
      (r) => r,
      (error: AxiosError) => {
        const status = error.response?.status;
        const url = error.config?.url;
        const method = error.config?.method?.toUpperCase();
        logger.error('Nonbor API error', { method, url, status, body: error.response?.data });

        if (status === 401) {
          this.clients.delete(cacheKey);
          this.settingsCache.delete(cacheKey);
        }
        return Promise.reject(error);
      },
    );

    this.clients.set(cacheKey, client);
    return client;
  }

  resetClient(tenantId?: string) {
    if (tenantId) {
      this.clients.delete(tenantId);
      this.settingsCache.delete(tenantId);
    } else {
      this.clients.clear();
      this.settingsCache.clear();
    }
  }

  private async getBusinessId(tenantId?: string): Promise<number> {
    const s = await this.getSettings(tenantId);
    if (!s.nonborSellerId) throw new Error('Nonbor seller/business ID sozlanmagan');
    return s.nonborSellerId;
  }

  // ──────────── Business ────────────

  async getBusinessDetail(businessId: number, tenantId?: string): Promise<NonborBusiness> {
    const client = await this.getClient(tenantId);
    const { data } = await client.get<NonborBusiness>(`/business/${businessId}/detail/`);
    return data;
  }

  async updateBusiness(
    businessId: number,
    updateData: Partial<{ title: string; address: string; phone_number: string; description: string; logo: any }>,
    tenantId?: string,
  ): Promise<NonborBusiness> {
    const client = await this.getClient(tenantId);
    if (updateData.logo && typeof updateData.logo !== 'string') {
      const { default: FormData } = await import('form-data') as any;
      const form = new FormData();
      for (const [k, v] of Object.entries(updateData)) {
        if (v != null) form.append(k, v);
      }
      const { data } = await client.patch<NonborBusiness>(`/business/${businessId}/update/`, form, {
        headers: form.getHeaders(),
      });
      return data;
    }
    const { data } = await client.patch<NonborBusiness>(`/business/${businessId}/update/`, updateData);
    return data;
  }

  async toggleBusinessActive(businessId: number, isActive: boolean, tenantId?: string): Promise<void> {
    const client = await this.getClient(tenantId);
    await client.patch(`/business/${businessId}/update_active_status/`, { is_active: isActive });
  }

  async findBusinessById(businessId: number, tenantId?: string): Promise<NonborBusiness | null> {
    try {
      return await this.getBusinessDetail(businessId, tenantId);
    } catch {
      return null;
    }
  }

  // ──────────── Categories ────────────

  async getCategories(businessId: number, tenantId?: string): Promise<NonborCategory[]> {
    const client = await this.getClient(tenantId);
    // GET /business/{id}/products-by-category/ — kategoriyalar bilan mahsulotlar
    // Lekin kategoriyalar ro'yxati uchun seller-products'dagi category field ishlatiladi
    // Nonbor'da standalone categories endpoint yo'q, shuning uchun products orqali olamiz
    const { data } = await client.get<PaginatedResponse<NonborSellerProduct>>('/seller-products/', {
      params: { business_id: businessId, page_size: 1 },
    });

    // Kategoriyalarni products'dan yig'amiz
    const seen = new Set<number>();
    const categories: NonborCategory[] = [];

    const allProducts = await this.getAllSellerProducts(businessId, tenantId);
    for (const p of allProducts) {
      const cat = p.category;
      if (cat && typeof cat === 'object' && !seen.has(cat.id)) {
        seen.add(cat.id);
        categories.push(cat);
      }
    }
    return categories;
  }

  async createCategory(name: string, businessId: number, tenantId?: string): Promise<NonborCategory> {
    const client = await this.getClient(tenantId);
    const { data } = await client.post<NonborCategory>('/category/create/', { name, business: businessId });
    return data;
  }

  async updateCategory(
    categoryId: number,
    updateData: Partial<{ name: string; order: number; is_active: boolean }>,
    tenantId?: string,
  ): Promise<NonborCategory> {
    const client = await this.getClient(tenantId);
    const { data } = await client.put<NonborCategory>(`/category/${categoryId}/update/`, updateData);
    return data;
  }

  async deleteCategory(categoryId: number, tenantId?: string): Promise<void> {
    const client = await this.getClient(tenantId);
    await client.delete(`/category/${categoryId}/delete/`);
  }

  // ──────────── Products ────────────

  // GET /api/v2/seller-products/ — seller'ning barcha mahsulotlari
  async getSellerProducts(
    businessId: number,
    params: {
      page?: number;
      pageSize?: number;
      categoryId?: number;
      isActive?: boolean;
      search?: string;
    } = {},
    tenantId?: string,
  ): Promise<NonborSellerProductsResponse> {
    const client = await this.getClient(tenantId);
    const { data } = await client.get<NonborSellerProductsResponse>('/seller-products/', {
      params: {
        business_id: businessId,
        page: params.page || 1,
        page_size: params.pageSize || 50,
        ...(params.categoryId != null ? { category_id: params.categoryId } : {}),
        ...(params.isActive != null ? { is_active: params.isActive } : {}),
        ...(params.search ? { search: params.search } : {}),
      },
    });
    return data;
  }

  // Barcha mahsulotlarni pagination bilan olish
  async getAllSellerProducts(businessId: number, tenantId?: string): Promise<NonborSellerProduct[]> {
    const all: NonborSellerProduct[] = [];
    let page = 1;
    const pageSize = 100;

    while (true) {
      const resp = await this.getSellerProducts(businessId, { page, pageSize }, tenantId);
      all.push(...resp.results);
      if (!resp.next || all.length >= resp.count) break;
      page++;
    }

    logger.info('Nonbor all seller products fetched', { businessId, count: all.length });
    return all;
  }

  // GET /api/v2/seller-menu — menu kategoriyali mahsulotlar
  async getSellerMenu(
    params: { menuCategory?: number[]; page?: number; pageSize?: number } = {},
    tenantId?: string,
  ): Promise<PaginatedResponse<NonborSellerMenu>> {
    const client = await this.getClient(tenantId);
    const { data } = await client.get<PaginatedResponse<NonborSellerMenu>>('/seller-menu', {
      params: {
        page: params.page || 1,
        page_size: params.pageSize || 50,
        ...(params.menuCategory?.length ? { menu_category: params.menuCategory } : {}),
      },
    });
    return data;
  }

  async createProduct(
    productData: {
      name: string;
      price: number;
      category?: number;
      description?: string;
      barcode?: string;
      mxik_code?: string;
      is_active?: boolean;
      [key: string]: any;
    },
    tenantId?: string,
  ): Promise<NonborProduct> {
    const client = await this.getClient(tenantId);
    const { data } = await client.post<NonborProduct>('/product/create_with_images/', productData);
    return data;
  }

  async updateProduct(
    productId: number,
    updateData: Partial<{
      name: string;
      price: number;
      category: number;
      description: string;
      barcode: string;
      mxik_code: string;
      is_active: boolean;
    }>,
    tenantId?: string,
  ): Promise<NonborProduct> {
    const client = await this.getClient(tenantId);
    const { data } = await client.patch<NonborProduct>(`/product/${productId}/update_with_images/`, updateData);
    return data;
  }

  async toggleProductActive(productId: number, isActive: boolean, tenantId?: string): Promise<void> {
    const client = await this.getClient(tenantId);
    await client.patch(`/products/${productId}/update_active_status/`, { is_active: isActive });
  }

  async deleteProduct(productId: number, tenantId?: string): Promise<void> {
    const client = await this.getClient(tenantId);
    await client.delete(`/product/${productId}/delete/`);
  }

  async getProductDetail(productId: number, tenantId?: string): Promise<NonborProduct> {
    const client = await this.getClient(tenantId);
    const { data } = await client.get<NonborProduct>(`/product/${productId}/detail/`);
    return data;
  }

  async addProductImage(productId: number, imageFile: any, tenantId?: string): Promise<NonborProductImage> {
    const client = await this.getClient(tenantId);
    const { default: FormData } = await import('form-data') as any;
    const form = new FormData();
    form.append('product', String(productId));
    form.append('image', imageFile);
    const { data } = await client.post<NonborProductImage>('/product-image/add/', form, {
      headers: form.getHeaders(),
    });
    return data;
  }

  // ──────────── Menu Categories ────────────

  async getMenuCategories(businessId: number, tenantId?: string): Promise<NonborMenuCategory[]> {
    const client = await this.getClient(tenantId);
    const { data } = await client.get<NonborMenuCategory[]>('/menu-categories/', {
      params: { business: businessId },
    });
    return Array.isArray(data) ? data : [];
  }

  async saveMenuCategoriesOrder(
    businessId: number,
    categories: Array<{ id: number; order: number }>,
    tenantId?: string,
  ): Promise<void> {
    const client = await this.getClient(tenantId);
    await client.post('/menu-category-save/', categories, { params: { business: businessId } });
  }

  // ──────────── Orders (SELLER side) ────────────

  // GET /api/v2/order/business-orders/
  // states — array (PENDING, CHECKING, ACCEPTED, READY, DELIVERING, DELIVERED, COMPLETED, ...)
  async getBusinessOrders(
    states: NonborOrderState[] = ['PENDING', 'CHECKING', 'ACCEPTED'],
    page = 1,
    pageSize = 20,
    tenantId?: string,
  ): Promise<NonborOrdersResponse> {
    const client = await this.getClient(tenantId);
    const { data } = await client.get<NonborOrdersResponse>('/order/business-orders/', {
      params: {
        states,
        page,
        page_size: pageSize,
      },
      // Axios arrays: states[]=PENDING&states[]=ACCEPTED
      paramsSerializer: (params) => {
        const parts: string[] = [];
        for (const [key, val] of Object.entries(params)) {
          if (Array.isArray(val)) {
            for (const v of val) parts.push(`${key}=${encodeURIComponent(v)}`);
          } else if (val != null) {
            parts.push(`${key}=${encodeURIComponent(val as any)}`);
          }
        }
        return parts.join('&');
      },
    });
    return data;
  }

  async getOrderDetail(orderId: number, tenantId?: string): Promise<NonborOrder> {
    const client = await this.getClient(tenantId);
    const { data } = await client.get<NonborOrder>(`/order/order-detail-for-seller/${orderId}/`);
    return data;
  }

  // PATCH /api/v2/order/order-status-change/{id}/
  async changeOrderStatus(
    orderId: number,
    state: 'ACCEPTED' | 'READY' | 'CANCELLED_SELLER' | 'DELIVERED' | 'COMPLETED',
    cancelDescription?: string,
    tenantId?: string,
  ): Promise<void> {
    const client = await this.getClient(tenantId);
    await client.patch(`/order/order-status-change/${orderId}/`, {
      state,
      ...(cancelDescription ? { cancel_description: cancelDescription } : {}),
    });
    logger.info('Nonbor order status changed', { orderId, state });
  }

  // ──────────── Sync: Nonbor → POS ────────────

  async syncOrdersFromNonbor(tenantId: string): Promise<NonborOrder[]> {
    const settings = await this.getSettings(tenantId);
    if (!settings.nonborEnabled || !settings.nonborSellerId) return [];

    const activeStates: NonborOrderState[] = [
      'PENDING', 'WAITING_PAYMENT', 'CHECKING', 'ACCEPTED', 'READY', 'DELIVERING',
    ];
    const response = await this.getBusinessOrders(activeStates, 1, 100, tenantId);
    return response.results || [];
  }

  // Nonbordan mahsulotlarni POS'ga import qilish
  async pullProductsFromNonbor(tenantId: string): Promise<{
    created: number;
    updated: number;
    skipped: number;
    errors: string[];
  }> {
    const settings = await this.getSettings(tenantId);
    const businessId = settings.nonborSellerId;
    if (!businessId) throw new Error('Nonbor business ID sozlanmagan');

    const nonborProducts = await this.getAllSellerProducts(businessId, tenantId);
    let created = 0, updated = 0, skipped = 0;
    const errors: string[] = [];

    // Batch: mavjud local products'ni olish (nonborProductId bo'yicha)
    const existingLocal = await prisma.product.findMany({
      where: { tenantId, nonborProductId: { not: null } },
      select: { id: true, nonborProductId: true, price: true, name: true, isActive: true },
    });
    const localByNonborId = new Map(existingLocal.map((p) => [p.nonborProductId!, p]));

    // Default "Nonbor" kategoriyasini topish yoki yaratish
    let defaultCategory = await prisma.category.findFirst({ where: { slug: 'nonbor', tenantId } });
    if (!defaultCategory) {
      defaultCategory = await prisma.category.create({
        data: { name: 'Nonbor', slug: 'nonbor', isActive: true, tenantId },
      });
    }

    // Nonbor kategoriyalarini local kategoriyalarga map qilish
    const categoryNameToLocalId = new Map<string, string>();
    const localCategories = await prisma.category.findMany({ where: { tenantId } });
    for (const c of localCategories) categoryNameToLocalId.set(c.name.toLowerCase(), c.id);

    for (const np of nonborProducts) {
      try {
        const existing = localByNonborId.get(np.id);
        const localPrice = np.price; // tiyin → so'm (agar kerak bo'lsa / 100)

        // Kategoriya aniqlash
        let categoryId = defaultCategory.id;
        const catName = typeof np.category === 'object' && np.category ? (np.category as NonborCategory).name : null;
        if (catName) {
          const existingCatId = categoryNameToLocalId.get(catName.toLowerCase());
          if (existingCatId) {
            categoryId = existingCatId;
          } else {
            const newCat = await prisma.category.create({
              data: { name: catName, slug: catName.toLowerCase().replace(/\s+/g, '-'), isActive: true, tenantId },
            });
            categoryNameToLocalId.set(catName.toLowerCase(), newCat.id);
            categoryId = newCat.id;
          }
        }

        if (existing) {
          // Faqat o'zgargan narsalarni update qilish
          const changed =
            existing.name !== np.name ||
            Number(existing.price) !== localPrice ||
            existing.isActive !== np.is_active;

          if (changed) {
            await prisma.product.update({
              where: { id: existing.id },
              data: {
                name: np.name,
                price: localPrice,
                isActive: np.is_active ?? true,
                categoryId,
                image: np.images?.[0]?.image || undefined,
              },
            });
            updated++;
          } else {
            skipped++;
          }
        } else {
          await prisma.product.create({
            data: {
              name: np.name,
              price: localPrice,
              categoryId,
              nonborProductId: np.id,
              image: np.images?.[0]?.image || undefined,
              isActive: np.is_active ?? true,
              tenantId,
            },
          });
          created++;
        }
      } catch (err: any) {
        errors.push(`${np.name} (id:${np.id}): ${err.message}`);
      }
    }

    logger.info('Nonbor products pull complete', { tenantId, created, updated, skipped, errors: errors.length });
    return { created, updated, skipped, errors };
  }

  // POS mahsulotlarini Nonborga push qilish
  async syncProductsToNonbor(tenantId: string): Promise<{ created: number; updated: number; errors: string[] }> {
    const settings = await this.getSettings(tenantId);
    const businessId = settings.nonborSellerId;
    if (!businessId) throw new Error('Nonbor business ID sozlanmagan');

    const localProducts = await prisma.product.findMany({
      where: { tenantId, isActive: true },
      include: { category: true },
    });

    const nonborCats = await this.getCategories(businessId, tenantId);
    const catMap = new Map(nonborCats.map((c) => [c.name.toLowerCase(), c.id]));

    let created = 0, updated = 0;
    const errors: string[] = [];

    for (const product of localProducts) {
      try {
        let nonborCategoryId: number | undefined;
        if (product.category?.name) {
          const key = product.category.name.toLowerCase();
          if (catMap.has(key)) {
            nonborCategoryId = catMap.get(key);
          } else {
            const nc = await this.createCategory(product.category.name, businessId, tenantId);
            catMap.set(key, nc.id);
            nonborCategoryId = nc.id;
          }
        }

        if (product.nonborProductId) {
          await this.updateProduct(product.nonborProductId, {
            name: product.name,
            price: Number(product.price),
            ...(nonborCategoryId ? { category: nonborCategoryId } : {}),
            is_active: product.isActive,
          }, tenantId);
          updated++;
        } else {
          const np = await this.createProduct({
            name: product.name,
            price: Number(product.price),
            ...(nonborCategoryId ? { category: nonborCategoryId } : {}),
            is_active: product.isActive,
          }, tenantId);

          await prisma.product.update({
            where: { id: product.id },
            data: { nonborProductId: np.id },
          });
          created++;
        }
      } catch (err: any) {
        errors.push(`${product.name}: ${err.message}`);
      }
    }

    logger.info('Products synced to Nonbor', { tenantId, created, updated, errors: errors.length });
    return { created, updated, errors };
  }

  async syncOrderStatusToNonbor(
    localOrderId: string,
    nonborOrderId: number,
    status: 'ACCEPTED' | 'READY' | 'CANCELLED_SELLER' | 'DELIVERED' | 'COMPLETED',
    tenantId?: string,
  ): Promise<void> {
    await this.changeOrderStatus(nonborOrderId, status, undefined, tenantId);
    logger.info('Nonbor order status synced', { localOrderId, nonborOrderId, status });
  }

  // ──────────── Delivery ────────────

  async acceptDelivery(orderId: number, tenantId?: string): Promise<any> {
    const client = await this.getClient(tenantId);
    const { data } = await client.post('/delivery/accept/', { order_id: orderId });
    return data;
  }

  async cancelDelivery(orderId: number, reason?: string, tenantId?: string): Promise<any> {
    const client = await this.getClient(tenantId);
    const { data } = await client.post('/delivery/cancel/', { order_id: orderId, ...(reason ? { reason } : {}) });
    return data;
  }

  async getDeliveryTracking(orderId: number, tenantId?: string): Promise<NonborDeliveryTracking> {
    const client = await this.getClient(tenantId);
    const { data } = await client.get<NonborDeliveryTracking>(`/delivery/orders/${orderId}/tracking/`);
    return data;
  }

  // ──────────── MXIK ────────────

  async searchMxikCodes(keyword: string, tenantId?: string): Promise<NonborMxikCode[]> {
    const client = await this.getClient(tenantId);
    const { data } = await client.get<PaginatedResponse<NonborMxikCode>>('/mxik-codes/', {
      params: { search: keyword },
    });
    return data.results || [];
  }

  // ──────────── Notifications ────────────

  async getNotifications(isRead?: boolean, tenantId?: string): Promise<NonborNotification[]> {
    const client = await this.getClient(tenantId);
    const params: any = {};
    if (isRead !== undefined) params.is_read = isRead;
    const { data } = await client.get<PaginatedResponse<NonborNotification>>('/notification/notifications/', { params });
    return data.results || [];
  }

  async markAllNotificationsRead(tenantId?: string): Promise<void> {
    const client = await this.getClient(tenantId);
    await client.post('/notification/notifications/set-all-read/');
  }

  // ──────────── Legacy (backward compat) ────────────

  /** @deprecated Use getBusinessOrders() */
  async getSellerOrders(sellerId: number, tenantId?: string): Promise<NonborOrder[]> {
    const r = await this.getBusinessOrders(['PENDING', 'CHECKING', 'ACCEPTED', 'READY', 'DELIVERING'], 1, 100, tenantId);
    return r.results || [];
  }

  /** @deprecated Use getBusinessDetail() */
  async getBusinesses(tenantId?: string): Promise<NonborBusiness[]> {
    try {
      const s = await this.getSettings(tenantId);
      if (s.nonborSellerId) {
        const b = await this.getBusinessDetail(s.nonborSellerId, tenantId);
        return b ? [b] : [];
      }
      return [];
    } catch { return []; }
  }

  /** @deprecated */
  async getOrderStatusCount(_sellerId: number, tenantId?: string): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    const states: NonborOrderState[] = ['PENDING', 'ACCEPTED', 'READY', 'DELIVERING', 'DELIVERED', 'CANCELLED_SELLER', 'CANCELLED_CLIENT', 'COMPLETED'];
    try {
      for (const state of states) {
        const r = await this.getBusinessOrders([state], 1, 1, tenantId);
        counts[state] = r.count || 0;
      }
    } catch { /* ignore */ }
    return counts;
  }

  /** @deprecated Use changeOrderStatus() */
  async updateOrderState(orderId: number, state: NonborOrderState, tenantId?: string): Promise<void> {
    const mapped = state === 'CANCELLED' || state === 'CANCELLED_CLIENT' ? 'CANCELLED_SELLER' : state as any;
    await this.changeOrderStatus(orderId, mapped, undefined, tenantId);
  }
}

export const nonborApiService = new NonborV2Service();
