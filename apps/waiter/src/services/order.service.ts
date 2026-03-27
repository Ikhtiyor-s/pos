import api from './api';

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
    const { data: response } = await api.get('/orders');
    // API returns { success, data: [...orders] }
    return { data: response.data || [] };
  },

  getByTableId: async (tableId: string): Promise<OrdersResponse> => {
    const { data: response } = await api.get(`/orders?tableId=${tableId}&limit=50`);
    const all = response.data || [];
    // Only show active orders (not completed/cancelled)
    const active = all.filter((o: any) =>
      !['COMPLETED', 'CANCELLED'].includes(o.status)
    );
    return { data: active };
  },

  create: async (payload: CreateOrderPayload): Promise<{ data: { id: string } }> => {
    const { data: response } = await api.post('/orders', payload);
    return { data: response.data };
  },

  addItems: async (orderId: string, items: { productId: string; quantity: number }[]): Promise<void> => {
    await api.post(`/orders/${orderId}/items`, { items });
  },

  updateStatus: async (orderId: string, status: string): Promise<void> => {
    await api.patch(`/orders/${orderId}/status`, { status });
  },

  updateItemQuantity: async (orderId: string, itemId: string, quantity: number): Promise<void> => {
    await api.patch(`/orders/${orderId}/items/${itemId}`, { quantity });
  },

  printReceipt: async (orderId: string): Promise<void> => {
    await api.post(`/printer/print/receipt/${orderId}`);
  },
};
