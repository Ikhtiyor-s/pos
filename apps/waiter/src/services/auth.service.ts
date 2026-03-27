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

interface DailyStats {
  ordersCount: number;
  completedOrdersCount: number;
  totalSales: number;
  averageOrderValue: number;
  attendance?: {
    status: string;
    checkIn: string | null;
    checkOut: string | null;
  };
}

export const authService = {
  login: async (phone: string, password: string): Promise<LoginResponse> => {
    const { data: response } = await api.post('/auth/login', { phone, password });
    return response.data;
  },

  loginWithPin: async (pin: string): Promise<LoginResponse> => {
    const tenantId = import.meta.env.VITE_TENANT_ID;
    const { data: response } = await api.post('/auth/login-pin', { pin, tenantId });
    return response.data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post('/auth/logout', { refreshToken });
  },

  getMe: async (): Promise<User> => {
    const { data: response } = await api.get('/auth/me');
    return response.data;
  },

  getMyDailyStats: async (): Promise<DailyStats> => {
    try {
      const { data: response } = await api.get('/auth/me/stats');
      return response.data;
    } catch {
      // Stats endpoint may not exist yet
      return {
        ordersCount: 0,
        completedOrdersCount: 0,
        totalSales: 0,
        averageOrderValue: 0,
      };
    }
  },

  checkIn: async (): Promise<void> => {
    try {
      await api.post('/auth/attendance/check-in');
    } catch {
      // Attendance endpoint may not exist yet
    }
  },

  checkOut: async (): Promise<void> => {
    try {
      await api.post('/auth/attendance/check-out');
    } catch {
      // Attendance endpoint may not exist yet
    }
  },
};
