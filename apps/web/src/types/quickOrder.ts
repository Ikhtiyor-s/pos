// Tezkor buyurtma tizimlari uchun tiplar

export interface QuickOrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface QuickOrderProduct {
  id: string;
  name: string;
  price: number;
  image?: string;
  categoryId: string;
  isAvailable: boolean;
}

export interface QuickOrderCategory {
  id: string;
  name: string;
  icon?: string;
  productCount: number;
}

export type QuickOrderStep = 'type' | 'products' | 'payment' | 'receipt';

export interface QuickOrderData {
  items: QuickOrderItem[];
  notes: string;
  orderNumber: string;
  createdAt: string;
}

// Chek ma'lumotlari
export interface ReceiptData {
  orderNumber: string;
  items: QuickOrderItem[];
  subtotal: number;
  total: number;
  createdAt: string;
  cashierName: string;
}
