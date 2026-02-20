import api from '@/lib/api';

export interface OrderApiItem {
  id: string;
  productId: string;
  product?: { id: string; name: string; price: number; image?: string };
  quantity: number;
  price: number;
  total: number;
  notes?: string;
  status: string;
}

export interface OrderApi {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  tableId?: string;
  table?: { id: string; number: number; name?: string };
  customerId?: string;
  customer?: { id: string; firstName: string; lastName?: string; phone: string };
  userId: string;
  user?: { id: string; firstName: string; lastName?: string };
  items: OrderApiItem[];
  payments: { id: string; method: string; amount: number; status: string }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export const orderApiService = {
  async getAll(params?: { page?: number; limit?: number; status?: string; type?: string }): Promise<{ orders: OrderApi[]; total: number }> {
    const response = await api.get('/orders', { params });
    return {
      orders: response.data.data || [],
      total: response.data.meta?.total || 0,
    };
  },

  async getById(id: string): Promise<OrderApi> {
    const response = await api.get(`/orders/${id}`);
    return response.data.data;
  },

  async create(data: { type: string; tableId?: string; items: { productId: string; quantity: number; price: number }[]; notes?: string }): Promise<OrderApi> {
    const response = await api.post('/orders', data);
    return response.data.data;
  },

  async updateStatus(id: string, status: string): Promise<OrderApi> {
    const response = await api.patch(`/orders/${id}/status`, { status });
    return response.data.data;
  },

  async addPayment(id: string, data: { method: string; amount: number; reference?: string }): Promise<OrderApi> {
    const response = await api.post(`/orders/${id}/payment`, data);
    return response.data.data;
  },

  async getKitchenOrders(): Promise<OrderApi[]> {
    const response = await api.get('/orders/kitchen');
    return response.data.data || [];
  },
};
