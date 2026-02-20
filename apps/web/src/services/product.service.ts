import api from '@/lib/api';
import type { Product, Category } from '@/types/product';

interface ProductApiResponse {
  id: string;
  name: string;
  nameRu?: string;
  nameEn?: string;
  description?: string;
  barcode?: string;
  price: number;
  costPrice?: number;
  image?: string;
  categoryId: string;
  category?: { id: string; name: string; slug: string };
  isActive: boolean;
  cookingTime?: number;
  calories?: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface QRCodeResponse {
  product: ProductApiResponse;
  qrCode: string;
  barcode: string;
}

// API dan kelgan mahsulotni frontend Product tipiga o'girish
function mapApiProduct(p: ProductApiResponse): Product {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    categoryId: p.categoryId,
    category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : undefined,
    price: Number(p.price),
    costPrice: Number(p.costPrice || 0),
    stock: 0,
    minStock: 0,
    unit: 'porsiya',
    image: p.image,
    status: p.isActive ? 'active' : 'inactive',
    barcode: p.barcode,
    sku: p.barcode || '',
    cookingTime: p.cookingTime,
    calories: p.calories,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export const productApiService = {
  // Barcha mahsulotlar
  async getAll(params?: { search?: string; categoryId?: string; page?: number; limit?: number }): Promise<{ products: Product[]; total: number }> {
    const response = await api.get('/products', { params });
    const items: ProductApiResponse[] = response.data.data || [];
    return {
      products: items.map(mapApiProduct),
      total: response.data.meta?.total || items.length,
    };
  },

  // Bitta mahsulot
  async getById(id: string): Promise<Product> {
    const response = await api.get(`/products/${id}`);
    return mapApiProduct(response.data.data);
  },

  // Yangi mahsulot yaratish
  async create(data: { name: string; price: number; categoryId: string; description?: string; costPrice?: number; cookingTime?: number; calories?: number; image?: string }): Promise<Product> {
    const response = await api.post('/products', data);
    return mapApiProduct(response.data.data);
  },

  // Mahsulot yangilash
  async update(id: string, data: Record<string, any>): Promise<Product> {
    const response = await api.put(`/products/${id}`, data);
    return mapApiProduct(response.data.data);
  },

  // Mahsulot o'chirish
  async delete(id: string): Promise<void> {
    await api.delete(`/products/${id}`);
  },

  // Barcode bo'yicha qidirish
  async getByBarcode(barcode: string): Promise<ProductApiResponse> {
    const response = await api.get(`/products/barcode/${encodeURIComponent(barcode)}`);
    return response.data.data;
  },

  // QR kod
  async getQRCode(id: string): Promise<QRCodeResponse> {
    const response = await api.get(`/products/${id}/qr`);
    return response.data.data;
  },

  // Barcode generatsiya
  async generateBarcode(id: string): Promise<ProductApiResponse> {
    const response = await api.post(`/products/${id}/generate-barcode`);
    return response.data.data;
  },
};

// Kategoriya service
export const categoryApiService = {
  async getAll(): Promise<Category[]> {
    const response = await api.get('/categories');
    const items = response.data.data || [];
    return items.map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      image: c.image,
      productCount: c._count?.products || c.productCount || 0,
    }));
  },

  async create(data: { name: string; slug: string; image?: string }): Promise<Category> {
    const response = await api.post('/categories', data);
    const c = response.data.data;
    return { id: c.id, name: c.name, slug: c.slug, image: c.image };
  },

  async update(id: string, data: Record<string, any>): Promise<Category> {
    const response = await api.put(`/categories/${id}`, data);
    const c = response.data.data;
    return { id: c.id, name: c.name, slug: c.slug, image: c.image };
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/categories/${id}`);
  },
};
