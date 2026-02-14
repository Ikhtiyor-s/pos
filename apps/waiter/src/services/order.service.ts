import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

interface CreateOrderPayload {
  type: string;
  tableId?: string;
  guestCount?: number;
  items: { productId: string; quantity: number }[];
}

interface OrdersResponse {
  data: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    createdAt: string;
    items: {
      id: string;
      quantity: number;
      price: number;
      product?: { id: string; name: string; price: number };
    }[];
  }[];
}

export const orderService = {
  getAll: async (): Promise<OrdersResponse> => {
    const { data } = await api.get('/orders');
    return data;
  },

  getByTableId: async (tableId: string): Promise<OrdersResponse> => {
    const { data } = await api.get(`/orders?tableId=${tableId}&status=active`);
    return data;
  },

  create: async (payload: CreateOrderPayload): Promise<{ data: { id: string } }> => {
    const { data } = await api.post('/orders', payload);
    return data;
  },

  addItems: async (orderId: string, items: { productId: string; quantity: number }[]): Promise<void> => {
    await api.post(`/orders/${orderId}/items`, { items });
  },

  updateStatus: async (orderId: string, status: string): Promise<void> => {
    await api.patch(`/orders/${orderId}/status`, { status });
  },
};
