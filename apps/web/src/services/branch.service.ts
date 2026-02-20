import api from '@/lib/api';
import type { Branch, CreateBranchDto, UpdateBranchDto, BranchQuery } from '@/types/branch';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface PaginatedResponse {
  success: boolean;
  data: Branch[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const branchService = {
  async getAll(query?: BranchQuery): Promise<{ branches: Branch[]; meta: PaginatedResponse['meta'] }> {
    const res = await api.get<PaginatedResponse>('/branches', { params: query });
    return { branches: res.data.data, meta: res.data.meta! };
  },

  async getById(id: string): Promise<Branch> {
    const res = await api.get<ApiResponse<Branch>>(`/branches/${id}`);
    return res.data.data;
  },

  async create(data: CreateBranchDto): Promise<{ branch: Branch; manager: any }> {
    const res = await api.post<ApiResponse<{ branch: Branch; manager: any }>>('/branches', data);
    return res.data.data;
  },

  async update(id: string, data: UpdateBranchDto): Promise<Branch> {
    const res = await api.put<ApiResponse<Branch>>(`/branches/${id}`, data);
    return res.data.data;
  },

  async toggle(id: string): Promise<Branch> {
    const res = await api.patch<ApiResponse<Branch>>(`/branches/${id}/toggle`);
    return res.data.data;
  },
};
