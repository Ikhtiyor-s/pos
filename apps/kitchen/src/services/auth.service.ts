import api from './api';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  role: string;
  avatar?: string;
  isActive: boolean;
}

interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  login: async (phone: string, password: string): Promise<LoginResponse> => {
    const { data: response } = await api.post('/auth/login', { phone, password });
    return response.data;
  },

  loginWithPin: async (pin: string, tenantId: string): Promise<LoginResponse> => {
    const { data: response } = await api.post('/auth/login-pin', { pin, tenantId });
    return response.data;
  },

  loginWithEmail: async (email: string, password: string): Promise<LoginResponse> => {
    const { data: response } = await api.post('/auth/login', { email, password });
    return response.data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post('/auth/logout', { refreshToken });
  },

  getMe: async (): Promise<User> => {
    const { data: response } = await api.get('/auth/me');
    return response.data;
  },
};
