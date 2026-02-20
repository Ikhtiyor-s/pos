import api from '@/lib/api';
import type { Category } from '@/types/category';

const COLORS = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#EC4899', '#F59E0B', '#06B6D4'];

function mapApiCategory(c: any, index: number): Category {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug || '',
    description: c.description || c.nameRu || '',
    color: COLORS[index % COLORS.length],
    icon: undefined,
    image: c.image,
    parentId: c.parentId,
    displayOrder: c.sortOrder ?? index,
    productCount: c._count?.products ?? 0,
    subcategoryCount: 0,
    status: c.isActive !== false ? 'active' : 'inactive',
    showOnReceipt: true,
    showAsSection: true,
    createdAt: c.createdAt || new Date().toISOString(),
    updatedAt: c.updatedAt || new Date().toISOString(),
  };
}

export const categoryFullService = {
  async getAll(): Promise<Category[]> {
    const response = await api.get('/categories');
    const items = response.data.data || [];
    return items.map(mapApiCategory);
  },

  async create(data: { name: string; slug?: string; description?: string; image?: string; sortOrder?: number }): Promise<Category> {
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const response = await api.post('/categories', { ...data, slug });
    return mapApiCategory(response.data.data, 0);
  },

  async update(id: string, data: Record<string, any>): Promise<Category> {
    const response = await api.put(`/categories/${id}`, data);
    return mapApiCategory(response.data.data, 0);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/categories/${id}`);
  },
};
