import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface TenantInfo {
  name: string;
  logo?: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  categoryId: string;
  weight?: string;
  calories?: number;
  available: boolean;
}

export interface TableInfo {
  id: string;
  number: number;
  name?: string;
}

export interface MenuResponse {
  tenant: TenantInfo;
  table: TableInfo;
  categories: Category[];
  products: Product[];
}

export interface OrderItem {
  productId: string;
  quantity: number;
  notes?: string;
}

export interface PlaceOrderData {
  tableId: string;
  items: OrderItem[];
  customerName?: string;
  customerPhone?: string;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  status: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    notes?: string;
  }>;
  total: number;
  createdAt: string;
}

export const getMenuByTable = async (tableQrCode: string): Promise<MenuResponse> => {
  const { data } = await api.get<MenuResponse>(`/qr-menu/${tableQrCode}`);
  return data;
};

export const placeOrder = async (orderData: PlaceOrderData): Promise<OrderResponse> => {
  const { data } = await api.post<OrderResponse>('/qr-menu/order', orderData);
  return data;
};

export const getOrderStatus = async (orderId: string): Promise<OrderResponse> => {
  const { data } = await api.get<OrderResponse>(`/qr-menu/order/${orderId}`);
  return data;
};

export default api;
