import api from './api';

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  total: number;
  notes?: string;
  status: string;
  product?: {
    id: string;
    name: string;
    price: number;
    image?: string;
  };
}

export interface Order {
  id: string;
  orderNumber: string;
  type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  status: string;
  tableId?: string;
  table?: { id: string; number: number; name?: string };
  items: OrderItem[];
  subtotal: number;
  discount: number;
  discountPercent?: number;
  tax: number;
  total: number;
  notes?: string;
  createdAt: string;
  payments?: { id: string; method: string; amount: number }[];
}

interface CreateOrderPayload {
  type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  tableId?: string;
  items: { productId: string; quantity: number; notes?: string }[];
  notes?: string;
  discount?: number;
  discountPercent?: number;
}

export const orderService = {
  getAll: async (params?: { status?: string; tableId?: string }): Promise<Order[]> => {
    const { data: response } = await api.get('/orders', { params });
    return response.data?.data || response.data || [];
  },

  getById: async (id: string): Promise<Order> => {
    const { data: response } = await api.get(`/orders/${id}`);
    return response.data;
  },

  create: async (payload: CreateOrderPayload): Promise<Order> => {
    const { data: response } = await api.post('/orders', payload);
    return response.data;
  },

  updateStatus: async (id: string, status: string): Promise<void> => {
    await api.patch(`/orders/${id}/status`, { status });
  },

  addItems: async (id: string, items: { productId: string; quantity: number; notes?: string }[]): Promise<void> => {
    await api.post(`/orders/${id}/items`, { items });
  },

  addPayment: async (orderId: string, method: string, amount: number): Promise<any> => {
    const { data: response } = await api.post(`/orders/${orderId}/payment`, { method, amount });
    return response.data || response;
  },
};
