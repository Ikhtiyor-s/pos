import api from '@/lib/api';
import type { Tenant, TenantStats, CreateTenantDto, UpdateTenantDto, TenantQuery } from '@/types/tenant';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface PaginatedResponse {
  success: boolean;
  data: Tenant[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const tenantService = {
  async getAll(query?: TenantQuery): Promise<{ tenants: Tenant[]; meta: PaginatedResponse['meta'] }> {
    const res = await api.get<PaginatedResponse>('/tenants', { params: query });
    return { tenants: res.data.data, meta: res.data.meta! };
  },

  async getById(id: string): Promise<Tenant> {
    const res = await api.get<ApiResponse<Tenant>>(`/tenants/${id}`);
    return res.data.data;
  },

  async create(data: CreateTenantDto): Promise<{ tenant: Tenant; adminUser: any }> {
    const res = await api.post<ApiResponse<{ tenant: Tenant; adminUser: any }>>('/tenants', data);
    return res.data.data;
  },

  async update(id: string, data: UpdateTenantDto): Promise<Tenant> {
    const res = await api.put<ApiResponse<Tenant>>(`/tenants/${id}`, data);
    return res.data.data;
  },

  async toggle(id: string): Promise<Tenant> {
    const res = await api.patch<ApiResponse<Tenant>>(`/tenants/${id}/toggle`);
    return res.data.data;
  },

  async getStats(id: string): Promise<TenantStats> {
    const res = await api.get<ApiResponse<TenantStats>>(`/tenants/${id}/stats`);
    return res.data.data;
  },
};
