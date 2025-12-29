import api from '@/lib/api';
import type { ApiResponse, AuthResponse } from '@oshxona/shared';

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  phone?: string;
  password: string;
  firstName: string;
  lastName: string;
}

export const authService = {
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', data);
    return response.data.data!;
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', data);
    return response.data.data!;
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post('/auth/logout', { refreshToken });
  },

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await api.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
      '/auth/refresh',
      { refreshToken }
    );
    return response.data.data!;
  },

  async me() {
    const response = await api.get('/auth/me');
    return response.data.data;
  },
};
