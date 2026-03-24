import api from './api';

export interface KitchenOrderItem {
  id: string;
  quantity: number;
  price: number;
  total: number;
  notes?: string;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
  product: {
    id: string;
    name: string;
    cookingTime?: number;
  };
}

export interface KitchenOrder {
  id: string;
  orderNumber: string;
  type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  status: 'NEW' | 'CONFIRMED' | 'PREPARING' | 'READY';
  createdAt: string;
  notes?: string;
  table?: {
    id: string;
    number: number;
    name?: string;
  };
  items: KitchenOrderItem[];
}

export const kitchenService = {
  getOrders: async (): Promise<KitchenOrder[]> => {
    try {
      const { data: response } = await api.get('/orders/kitchen');
      return response.data || [];
    } catch {
      // Fallback: /orders endpoint with status filter
      try {
        const { data: response } = await api.get('/orders', { params: { status: 'NEW,CONFIRMED,PREPARING', limit: 50 } });
        const orders = response.data?.data || response.data || [];
        return Array.isArray(orders) ? orders : [];
      } catch {
        return [];
      }
    }
  },

  updateItemStatus: async (
    orderId: string,
    itemId: string,
    status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED'
  ): Promise<void> => {
    await api.patch(`/orders/${orderId}/items/${itemId}/status`, { status });
  },

  updateOrderStatus: async (
    orderId: string,
    status: string
  ): Promise<void> => {
    await api.patch(`/orders/${orderId}/status`, { status });
  },
};
