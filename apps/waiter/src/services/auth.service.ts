import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

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
    const { data } = await api.post('/auth/login', { phone, password });
    return data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post('/auth/logout', { refreshToken });
  },

  getMyDailyStats: async (): Promise<DailyStats> => {
    const { data } = await api.get('/auth/me/stats');
    return data;
  },

  checkIn: async (): Promise<void> => {
    await api.post('/auth/attendance/check-in');
  },

  checkOut: async (): Promise<void> => {
    await api.post('/auth/attendance/check-out');
  },
};
