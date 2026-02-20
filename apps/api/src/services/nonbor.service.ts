import axios, { type AxiosInstance } from 'axios';
import { prisma } from '@oshxona/database';

// ============ TYPES ============

export interface NonborBusiness {
  id?: number;
  title: string;
  address: string;
  logo?: string | null;
  lat: number;
  long: number;
  phone_number?: string;
}

export interface NonborProduct {
  id: number;
  name: string;
  state: string;
  price: number;
  images: Array<{ id: number; image: string }>;
}

export interface NonborOrderItem {
  id: number;
  order: number;
  product: NonborProduct;
  addon_price: number;
  accepted: boolean;
  count?: number;
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
  created_at: string;
  updated_at: string;
}

export type NonborOrderState =
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
  success: boolean;
  result: {
    total_count: number;
    count: number;
    results: NonborOrder[];
  };
}

export interface NonborSellerInfoResponse {
  success: boolean;
  result: Array<{ id: number; [key: string]: any }>;
}

export interface NonborBusinessesResponse {
  success: boolean;
  result: NonborBusiness[];
}

// ============ SERVICE ============

class NonborApiService {
  private client: AxiosInstance | null = null;

  private async getClient(): Promise<AxiosInstance> {
    if (this.client) return this.client;

    const settings = await prisma.settings.findFirst();
    const baseURL = settings?.nonborApiUrl || 'https://nonbor.uz/api/v2';
    const secret = settings?.nonborApiSecret || 'nonbor-secret-key';

    this.client = axios.create({
      baseURL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Bot-Secret': secret,
      },
    });

    return this.client;
  }

  // Clientni reset qilish (settings o'zgarganda)
  resetClient() {
    this.client = null;
  }

  // Qabul qilingan bizneslar ro'yxati
  async getBusinesses(): Promise<NonborBusiness[]> {
    const client = await this.getClient();
    const { data } = await client.get<NonborBusinessesResponse>(
      '/telegram_bot/businesses/accepted/'
    );
    return data.result || [];
  }

  // Seller ma'lumotlari (telefon bo'yicha)
  async getSellerInfo(phone: string): Promise<{ id: number } | null> {
    const client = await this.getClient();
    const { data } = await client.post<NonborSellerInfoResponse>(
      '/telegram_bot/get_seller_info/',
      { username: phone }
    );
    if (data.success && data.result?.length > 0) {
      return data.result[0];
    }
    return null;
  }

  // Seller buyurtmalari
  async getSellerOrders(sellerId: number): Promise<NonborOrder[]> {
    const client = await this.getClient();
    const { data } = await client.get<NonborOrdersResponse>(
      `/telegram_bot/sellers/${sellerId}/orders/`
    );
    return data.result?.results || [];
  }

  // Buyurtma tafsilotlari
  async getOrderDetail(sellerId: number, orderId: number): Promise<NonborOrder | null> {
    const client = await this.getClient();
    const { data } = await client.get(
      `/telegram_bot/sellers/${sellerId}/orders/${orderId}/`
    );
    const results = data.result?.results || data.result;
    if (Array.isArray(results) && results.length > 0) {
      return results[0];
    }
    return null;
  }

  // Buyurtma statusini yangilash
  async updateOrderState(orderId: number, state: NonborOrderState): Promise<void> {
    const client = await this.getClient();
    // Nonbor API da PATCH /orders/{id}/ endpoint domain boshida (api/v2 siz)
    const baseURL = this.client?.defaults.baseURL || 'https://nonbor.uz/api/v2';
    const domain = baseURL.split('/api/')[0];
    await axios.patch(
      `${domain}/orders/${orderId}/`,
      { state },
      { headers: this.client?.defaults.headers as any }
    );
  }

  // Buyurtma status countlari
  async getOrderStatusCount(sellerId: number): Promise<Record<string, number>> {
    const client = await this.getClient();
    const { data } = await client.get(
      `/telegram_bot/sellers/${sellerId}/orders/status_count/`
    );
    return data.result || {};
  }

  // Biznes ma'lumotlarini ID bo'yicha topish
  async findBusinessById(businessId: number): Promise<NonborBusiness | null> {
    const businesses = await this.getBusinesses();
    return businesses.find((b) => b.id === businessId) || null;
  }
}

export const nonborApiService = new NonborApiService();
