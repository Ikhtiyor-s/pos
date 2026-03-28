import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { prisma } from '@oshxona/database';

// ============ TYPES — Nonbor v2 API ============

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

export interface NonborProduct {
  id: number;
  name: string;
  state: string;
  price: number;
  description?: string;
  category?: number | NonborCategory;
  images: NonborProductImage[];
  is_active?: boolean;
  mxik_code?: string;
  barcode?: string;
}

export interface NonborOrderItem {
  id: number;
  order: number;
  product: NonborProduct;
  addon_price: number;
  accepted: boolean;
  count?: number;
  total_price?: number;
}

export interface NonborUser {
  first_name: string;
  last_name: string;
  phone: string | null;
  lat: number | null;
  long: number | null;
  lang: string;
}

export interface NonborDelivery {
  id: number;
  lat: number;
  long: number;
  address: string;
  entrance: string | null;
  floor: string | null;
  apartment: string | null;
  courier_comment: string | null;
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

export type NonborOrderState =
  | 'PENDING'
  | 'CHECKING'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'CANCELLED';

export interface NonborOrder {
  id: number;
  business: NonborBusiness;
  delivery_method: 'PICKUP' | 'DELIVERY';
  payment_method: 'CASH' | 'CARD' | 'CLICK' | 'PAYME';
  state: NonborOrderState;
  total_price: number;
  price: number;
  items: number[];
  order_item: NonborOrderItem[];
  delivery: NonborDelivery | null;
  user: NonborUser;
  paid: boolean;
  created_at: string;
  updated_at: string;
}

export interface NonborOrdersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: NonborOrder[];
}

export interface NonborCategoriesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: NonborCategory[];
}

export interface NonborProductsByCategoryResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Array<{
    id: number;
    name: string;
    products: NonborProduct[];
  }>;
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

// ============ PAGINATION HELPER ============

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ============ SETTINGS CACHE ============

interface NonborSettings {
  nonborApiUrl: string;
  nonborApiSecret: string;
  nonborSellerId: number | null;
  nonborEnabled: boolean;
  tenantId: string;
}

// ============ SERVICE ============

class NonborV2Service {
  private clients: Map<string, AxiosInstance> = new Map();
  private settingsCache: Map<string, { settings: NonborSettings; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // ──────────── Auth & Client ────────────

  /**
   * Get settings for a tenant (with cache)
   */
  private async getSettings(tenantId?: string): Promise<NonborSettings> {
    const cacheKey = tenantId || '__default__';
    const cached = this.settingsCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.settings;
    }

    const where = tenantId ? { tenantId } : { nonborEnabled: true };
    const dbSettings = await prisma.settings.findFirst({ where });

    if (!dbSettings) {
      throw new Error(`Nonbor sozlamalari topilmadi${tenantId ? ` (tenant: ${tenantId})` : ''}`);
    }

    const settings: NonborSettings = {
      nonborApiUrl: dbSettings.nonborApiUrl || 'https://prod.nonbor.uz/api/v2',
      nonborApiSecret: dbSettings.nonborApiSecret || '',
      nonborSellerId: dbSettings.nonborSellerId,
      nonborEnabled: dbSettings.nonborEnabled,
      tenantId: dbSettings.tenantId,
    };

    this.settingsCache.set(cacheKey, { settings, timestamp: Date.now() });
    return settings;
  }

  /**
   * Get JWT auth token from settings
   */
  async getAuthToken(tenantId?: string): Promise<string> {
    const settings = await this.getSettings(tenantId);
    if (!settings.nonborApiSecret) {
      throw new Error('Nonbor JWT token sozlanmagan (nonborApiSecret)');
    }
    return settings.nonborApiSecret;
  }

  /**
   * Get or create Axios client for a tenant
   */
  private async getClient(tenantId?: string): Promise<AxiosInstance> {
    const settings = await this.getSettings(tenantId);
    const cacheKey = settings.tenantId;

    const existing = this.clients.get(cacheKey);
    if (existing) return existing;

    const baseURL = settings.nonborApiUrl.replace(/\/+$/, '');
    const token = settings.nonborApiSecret;

    const client = axios.create({
      baseURL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    // Response interceptor for error logging
    client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const status = error.response?.status;
        const url = error.config?.url;
        const method = error.config?.method?.toUpperCase();
        console.error(`[Nonbor API] ${method} ${url} → ${status}`, error.response?.data || error.message);

        if (status === 401) {
          // Token expired — clear cache so next request fetches fresh settings
          this.clients.delete(cacheKey);
          this.settingsCache.delete(cacheKey);
        }

        return Promise.reject(error);
      }
    );

    this.clients.set(cacheKey, client);
    return client;
  }

  /**
   * Reset client and settings cache (call when settings change)
   */
  resetClient(tenantId?: string) {
    if (tenantId) {
      this.clients.delete(tenantId);
      this.settingsCache.delete(tenantId);
    } else {
      this.clients.clear();
      this.settingsCache.clear();
    }
  }

  /**
   * Get the business ID (seller ID) for a tenant
   */
  private async getBusinessId(tenantId?: string): Promise<number> {
    const settings = await this.getSettings(tenantId);
    if (!settings.nonborSellerId) {
      throw new Error('Nonbor seller/business ID sozlanmagan');
    }
    return settings.nonborSellerId;
  }

  // ──────────── Business ────────────

  /**
   * GET /business/{id}/detail/ — business details
   */
  async getBusinessDetail(businessId: number, tenantId?: string): Promise<NonborBusiness> {
    const client = await this.getClient(tenantId);
    const { data } = await client.get<NonborBusiness>(`/business/${businessId}/detail/`);
    return data;
  }

  /**
   * PATCH /business/{id}/update/ — update business (multipart supported)
   */
  async updateBusiness(
    businessId: number,
    updateData: Partial<{ title: string; address: string; phone_number: string; description: string; logo: any }>,
    tenantId?: string
  ): Promise<NonborBusiness> {
    const client = await this.getClient(tenantId);

    // If logo is a file, use FormData
    if (updateData.logo && typeof updateData.logo !== 'string') {
      const formDataModule = await import('form-data') as any;
      const FormDataCls = formDataModule.default || formDataModule;
      const form = new FormDataCls();
      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined && value !== null) {
          form.append(key, value);
        }
      }
      const { data } = await client.patch<NonborBusiness>(`/business/${businessId}/update/`, form, {
        headers: { ...form.getHeaders() },
      });
      return data;
    }

    const { data } = await client.patch<NonborBusiness>(`/business/${businessId}/update/`, updateData);
    return data;
  }

  /**
   * PATCH /business/{id}/update_active_status/ — toggle active
   */
  async toggleBusinessActive(businessId: number, isActive: boolean, tenantId?: string): Promise<void> {
    const client = await this.getClient(tenantId);
    await client.patch(`/business/${businessId}/update_active_status/`, { is_active: isActive });
  }

  /**
   * GET /business/{id}/products-by-category/ — products grouped by category
   */
  async getProductsByCategory(
    businessId: number,
    page = 1,
    pageSize = 50,
    tenantId?: string
  ): Promise<NonborProductsByCategoryResponse> {
    const client = await this.getClient(tenantId);
    const { data } = await client.get<NonborProductsByCategoryResponse>(
      `/business/${businessId}/products-by-category/`,
      { params: { page, page_size: pageSize } }
    );
    return data;
  }

  /**
   * Convenience: find business by ID (alias for getBusinessDetail)
   */
  async findBusinessById(businessId: number, tenantId?: string): Promise<NonborBusiness | null> {
    try {
      return await this.getBusinessDetail(businessId, tenantId);
    } catch {
      return null;
    }
  }

  // ──────────── Categories ────────────

  /**
   * GET /categories/?businesses__id={id} — categories for business
   */
  async getCategories(businessId: number, tenantId?: string): Promise<NonborCategory[]> {
    const client = await this.getClient(tenantId);
    const { data } = await client.get<NonborCategoriesResponse>('/categories/', {
      params: { businesses__id: businessId },
    });
    return data.results || [];
  }

  /**
   * POST /category/create/ — create category
   */
  async createCategory(name: string, businessId: number, tenantId?: string): Promise<NonborCategory> {
    const client = await this.getClient(tenantId);
    const { data } = await client.post<NonborCategory>('/category/create/', {
      name,
      business: businessId,
    });
    return data;
  }

  /**
   * PUT /category/{id}/update/ — update category
   */
  async updateCategory(
    categoryId: number,
    updateData: Partial<{ name: string; order: number; is_active: boolean }>,
    tenantId?: string
  ): Promise<NonborCategory> {
    const client = await this.getClient(tenantId);
    const { data } = await client.put<NonborCategory>(`/category/${categoryId}/update/`, updateData);
    return data;
  }

  /**
   * DELETE /category/{id}/delete/
   */
  async deleteCategory(categoryId: number, tenantId?: string): Promise<void> {
    const client = await this.getClient(tenantId);
    await client.delete(`/category/${categoryId}/delete/`);
  }

  // ──────────── Products ────────────

  /**
   * POST /product/create/ — create product
   */
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
    tenantId?: string
  ): Promise<NonborProduct> {
    const client = await this.getClient(tenantId);
    const { data } = await client.post<NonborProduct>('/product/create/', productData);
    return data;
  }

  /**
   * PATCH /product/{id}/update/ — update product
   */
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
    tenantId?: string
  ): Promise<NonborProduct> {
    const client = await this.getClient(tenantId);
    const { data } = await client.patch<NonborProduct>(`/product/${productId}/update/`, updateData);
    return data;
  }

  /**
   * DELETE /product/{id}/delete/
   */
  async deleteProduct(productId: number, tenantId?: string): Promise<void> {
    const client = await this.getClient(tenantId);
    await client.delete(`/product/${productId}/delete/`);
  }

  /**
   * GET /product/{id}/detail/
   */
  async getProductDetail(productId: number, tenantId?: string): Promise<NonborProduct> {
    const client = await this.getClient(tenantId);
    const { data } = await client.get<NonborProduct>(`/product/${productId}/detail/`);
    return data;
  }

  /**
   * POST /product-image/add/ — add image (multipart: product, image)
   */
  async addProductImage(productId: number, imageFile: any, tenantId?: string): Promise<NonborProductImage> {
    const client = await this.getClient(tenantId);
    const formDataModule = await import('form-data') as any;
    const FormDataCls = formDataModule.default || formDataModule;
    const form = new FormDataCls();
    form.append('product', String(productId));
    form.append('image', imageFile);

    const { data } = await client.post<NonborProductImage>('/product-image/add/', form, {
      headers: { ...form.getHeaders() },
    });
    return data;
  }

  // ──────────── Menu Categories ────────────

  /**
   * GET /menu-categories/?business={id}
   */
  async getMenuCategories(businessId: number, tenantId?: string): Promise<NonborMenuCategory[]> {
    const client = await this.getClient(tenantId);
    const { data } = await client.get<NonborMenuCategory[]>('/menu-categories/', {
      params: { business: businessId },
    });
    return Array.isArray(data) ? data : [];
  }

  /**
   * POST /menu-category-save/?business={id} — save categories order
   */
  async saveMenuCategoriesOrder(
    businessId: number,
    categories: Array<{ id: number; order: number }>,
    tenantId?: string
  ): Promise<void> {
    const client = await this.getClient(tenantId);
    await client.post('/menu-category-save/', categories, {
      params: { business: businessId },
    });
  }

  // ──────────── Orders (SELLER side) ────────────

  /**
   * GET /order/business-orders/ — seller's orders
   */
  async getBusinessOrders(
    states = 'PENDING,ACCEPTED',
    page = 1,
    pageSize = 20,
    tenantId?: string
  ): Promise<NonborOrdersResponse> {
    const client = await this.getClient(tenantId);
    const { data } = await client.get<NonborOrdersResponse>('/order/business-orders/', {
      params: { states, page, page_size: pageSize },
    });
    return data;
  }

  /**
   * GET /order/order-detail-for-seller/{id}/ — single order detail for seller
   */
  async getOrderDetail(orderId: number, tenantId?: string): Promise<NonborOrder> {
    const client = await this.getClient(tenantId);
    const { data } = await client.get<NonborOrder>(`/order/order-detail-for-seller/${orderId}/`);
    return data;
  }

  /**
   * PATCH /order/order-status-change/{id}/ — change order status
   */
  async changeOrderStatus(
    orderId: number,
    state: 'ACCEPTED' | 'READY' | 'CANCELLED' | 'DELIVERED',
    tenantId?: string
  ): Promise<void> {
    const client = await this.getClient(tenantId);
    await client.patch(`/order/order-status-change/${orderId}/`, { state });
  }

  /**
   * Legacy alias for changeOrderStatus (backward compatibility)
   */
  async updateOrderState(orderId: number, state: NonborOrderState, tenantId?: string): Promise<void> {
    await this.changeOrderStatus(orderId, state as any, tenantId);
  }

  // ──────────── Delivery ────────────

  /**
   * POST /delivery/accept/ — start courier search
   */
  async acceptDelivery(orderId: number, tenantId?: string): Promise<any> {
    const client = await this.getClient(tenantId);
    const { data } = await client.post('/delivery/accept/', { order_id: orderId });
    return data;
  }

  /**
   * POST /delivery/cancel/ — cancel delivery
   */
  async cancelDelivery(orderId: number, reason?: string, tenantId?: string): Promise<any> {
    const client = await this.getClient(tenantId);
    const { data } = await client.post('/delivery/cancel/', {
      order_id: orderId,
      ...(reason ? { reason } : {}),
    });
    return data;
  }

  /**
   * POST /delivery/detail/ — delivery details
   */
  async getDeliveryDetail(orderId: number, tenantId?: string): Promise<NonborDelivery> {
    const client = await this.getClient(tenantId);
    const { data } = await client.post<NonborDelivery>('/delivery/detail/', { order_id: orderId });
    return data;
  }

  /**
   * POST /delivery/calculate-price/ — calculate delivery cost
   */
  async calculateDeliveryPrice(
    params: { from_lat: number; from_long: number; to_lat: number; to_long: number },
    tenantId?: string
  ): Promise<{ price: number; distance: number; estimated_time: number }> {
    const client = await this.getClient(tenantId);
    const { data } = await client.post('/delivery/calculate-price/', params);
    return data;
  }

  /**
   * GET /delivery/orders/{order_id}/tracking/ — GPS tracking
   */
  async getDeliveryTracking(orderId: number, tenantId?: string): Promise<NonborDeliveryTracking> {
    const client = await this.getClient(tenantId);
    const { data } = await client.get<NonborDeliveryTracking>(`/delivery/orders/${orderId}/tracking/`);
    return data;
  }

  // ──────────── MXIK ────────────

  /**
   * GET /mxik-codes/?search=keyword
   */
  async searchMxikCodes(keyword: string, tenantId?: string): Promise<NonborMxikCode[]> {
    const client = await this.getClient(tenantId);
    const { data } = await client.get<PaginatedResponse<NonborMxikCode>>('/mxik-codes/', {
      params: { search: keyword },
    });
    return data.results || [];
  }

  /**
   * POST /mxik-code/validate/ — validate MXIK code
   */
  async validateMxikCode(mxikCode: string, tenantId?: string): Promise<{ valid: boolean; name?: string }> {
    const client = await this.getClient(tenantId);
    const { data } = await client.post('/mxik-code/validate/', { mxik_code: mxikCode });
    return data;
  }

  // ──────────── OFD (Fiscal receipts) ────────────

  /**
   * POST /ofd/receipts/create/ — create fiscal receipt
   */
  async createFiscalReceipt(
    orderId: number,
    receiptType = 'SALE',
    isRefund = false,
    tenantId?: string
  ): Promise<NonborFiscalReceipt> {
    const client = await this.getClient(tenantId);
    const { data } = await client.post<NonborFiscalReceipt>('/ofd/receipts/create/', {
      order_id: orderId,
      receipt_type: receiptType,
      is_refund: isRefund,
    });
    return data;
  }

  /**
   * GET /ofd/receipts/{order_id}/status/ — receipt status
   */
  async getReceiptStatus(orderId: number, tenantId?: string): Promise<{ status: string; fiscal_sign?: string; qr_code_url?: string }> {
    const client = await this.getClient(tenantId);
    const { data } = await client.get(`/ofd/receipts/${orderId}/status/`);
    return data;
  }

  // ──────────── Notifications ────────────

  /**
   * GET /notification/notifications/?is_read=false
   */
  async getNotifications(isRead?: boolean, tenantId?: string): Promise<NonborNotification[]> {
    const client = await this.getClient(tenantId);
    const params: any = {};
    if (isRead !== undefined) params.is_read = isRead;
    const { data } = await client.get<PaginatedResponse<NonborNotification>>('/notification/notifications/', { params });
    return data.results || [];
  }

  /**
   * POST /notification/notifications/set-all-read/
   */
  async markAllNotificationsRead(tenantId?: string): Promise<void> {
    const client = await this.getClient(tenantId);
    await client.post('/notification/notifications/set-all-read/');
  }

  // ──────────── Sync (POS <-> Nonbor) ────────────

  /**
   * Push local products to Nonbor
   */
  async syncProductsToNonbor(tenantId: string): Promise<{ created: number; updated: number; errors: string[] }> {
    const settings = await this.getSettings(tenantId);
    const businessId = settings.nonborSellerId;
    if (!businessId) throw new Error('Nonbor business ID sozlanmagan');

    // Get all local products for this tenant
    const localProducts = await prisma.product.findMany({
      where: { tenantId, isActive: true },
      include: { category: true },
    });

    // Get existing Nonbor categories to map
    const nonborCategories = await this.getCategories(businessId, tenantId);
    const categoryMap = new Map<string, number>();
    for (const nc of nonborCategories) {
      categoryMap.set(nc.name.toLowerCase(), nc.id);
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const product of localProducts) {
      try {
        // Find or create Nonbor category
        let nonborCategoryId: number | undefined;
        if (product.category?.name) {
          const catName = product.category.name.toLowerCase();
          if (categoryMap.has(catName)) {
            nonborCategoryId = categoryMap.get(catName);
          } else {
            // Create category on Nonbor
            const newCat = await this.createCategory(product.category.name, businessId, tenantId);
            categoryMap.set(catName, newCat.id);
            nonborCategoryId = newCat.id;
          }
        }

        if (product.nonborProductId) {
          // Update existing product on Nonbor
          await this.updateProduct(
            product.nonborProductId,
            {
              name: product.name,
              price: Number(product.price),
              ...(nonborCategoryId ? { category: nonborCategoryId } : {}),
              is_active: product.isActive,
            },
            tenantId
          );
          updated++;
        } else {
          // Create new product on Nonbor
          const nonborProduct = await this.createProduct(
            {
              name: product.name,
              price: Number(product.price),
              ...(nonborCategoryId ? { category: nonborCategoryId } : {}),
              is_active: product.isActive,
            },
            tenantId
          );

          // Save Nonbor product ID to local DB
          await prisma.product.update({
            where: { id: product.id },
            data: { nonborProductId: nonborProduct.id },
          });
          created++;
        }
      } catch (err: any) {
        errors.push(`${product.name}: ${err.message || 'Xatolik'}`);
      }
    }

    return { created, updated, errors };
  }

  /**
   * Pull Nonbor orders to local POS
   * Returns the raw orders for the sync service to process
   */
  async syncOrdersFromNonbor(tenantId: string): Promise<NonborOrder[]> {
    const settings = await this.getSettings(tenantId);
    if (!settings.nonborEnabled || !settings.nonborSellerId) {
      return [];
    }

    // Fetch active orders (PENDING + ACCEPTED states)
    const response = await this.getBusinessOrders('PENDING,ACCEPTED,CHECKING,PREPARING,READY', 1, 100, tenantId);
    return response.results || [];
  }

  /**
   * Push local order status change to Nonbor
   */
  async syncOrderStatusToNonbor(
    localOrderId: string,
    nonborOrderId: number,
    status: 'ACCEPTED' | 'READY' | 'CANCELLED' | 'DELIVERED',
    tenantId?: string
  ): Promise<void> {
    await this.changeOrderStatus(nonborOrderId, status, tenantId);
    console.log(`[Nonbor] Status sync: local=${localOrderId} nonbor=#${nonborOrderId} → ${status}`);
  }

  // ──────────── Legacy compatibility ────────────

  /**
   * @deprecated Use getBusinessOrders() instead
   * Legacy method — fetches orders (backward compatible with old getSellerOrders)
   */
  async getSellerOrders(sellerId: number, tenantId?: string): Promise<NonborOrder[]> {
    const response = await this.getBusinessOrders('PENDING,ACCEPTED,CHECKING,PREPARING,READY,DELIVERING', 1, 100, tenantId);
    return response.results || [];
  }

  /**
   * @deprecated Use getBusinessOrders() instead
   * Legacy method — fetches businesses list
   */
  async getBusinesses(tenantId?: string): Promise<NonborBusiness[]> {
    try {
      const settings = await this.getSettings(tenantId);
      if (settings.nonborSellerId) {
        const business = await this.getBusinessDetail(settings.nonborSellerId, tenantId);
        return business ? [business] : [];
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * @deprecated Use getBusinessOrders() with status counting instead
   * Legacy method for order status counts
   */
  async getOrderStatusCount(sellerId: number, tenantId?: string): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    const states = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED', 'CANCELLED'];

    // Fetch orders for each state and count
    try {
      for (const state of states) {
        const response = await this.getBusinessOrders(state, 1, 1, tenantId);
        counts[state] = response.count || 0;
      }
    } catch {
      // Return whatever we have
    }

    return counts;
  }
}

export const nonborApiService = new NonborV2Service();
