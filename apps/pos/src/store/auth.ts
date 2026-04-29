import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  avatar?: string;
}

export interface Shift {
  id: string;
  userId: string;
  startTime: string;
  endTime?: string;
  startingCash: number;
  endingCash?: number;
  totalSales?: number;
  totalOrders?: number;
  cashSales?: number;
  cardSales?: number;
  paymeSales?: number;
  clickSales?: number;
  uzumSales?: number;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  currentShift: Shift | null;
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  loginWithPin: (pin: string) => Promise<boolean>;
  logout: () => void;
  startShift: (startingCash: number) => void;
  endShift: (endingCash: number) => void;
  updateShiftStats: (stats: Partial<Shift>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      currentShift: null,
      isAuthenticated: false,

      login: async (emailOrPhone: string, password: string) => {
        const isEmail = emailOrPhone.includes('@');
        const payload = isEmail
          ? { email: emailOrPhone, password }
          : { phone: emailOrPhone, password };

        const { data: response } = await api.post('/auth/login', payload);
        const { user: apiUser, accessToken, refreshToken } = response.data;

        const user: User = {
          id: apiUser.id,
          firstName: apiUser.firstName || '',
          lastName: apiUser.lastName || '',
          name: `${apiUser.firstName || ''} ${apiUser.lastName || ''}`.trim(),
          email: apiUser.email,
          phone: apiUser.phone,
          role: apiUser.role?.toLowerCase() || 'cashier',
          avatar: apiUser.avatar,
        };

        set({
          user, accessToken, refreshToken, isAuthenticated: true,
          currentShift: {
            id: `shift-${Date.now()}`, userId: user.id,
            startTime: new Date().toISOString(), startingCash: 0,
          },
        });
        return true;
      },

      loginWithPin: async (pin: string) => {
        try {
          const tenantId = import.meta.env.VITE_TENANT_ID;
          const { data: response } = await api.post('/auth/login-pin', { pin, tenantId });
          const { user: apiUser, accessToken, refreshToken } = response.data;

          const user: User = {
            id: apiUser.id,
            firstName: apiUser.firstName || '',
            lastName: apiUser.lastName || '',
            name: `${apiUser.firstName || ''} ${apiUser.lastName || ''}`.trim(),
            email: apiUser.email,
            phone: apiUser.phone,
            role: apiUser.role?.toLowerCase() || 'cashier',
            avatar: apiUser.avatar,
          };

          set({
            user, accessToken, refreshToken, isAuthenticated: true,
            currentShift: { id: `shift-${Date.now()}`, userId: user.id, startTime: new Date().toISOString(), startingCash: 0 },
          });
          return true;
        } catch (error) {
          console.error('[POS] PIN login xatoligi:', error);
          return false;
        }
      },

      logout: () => {
        const { currentShift, refreshToken: rt } = get();

        // Agar shift ochiq bo'lsa, yopish talab qilinadi
        if (currentShift && !currentShift.endTime) {
          if (!confirm('Shift hali ochiq! Chiqishdan oldin shiftni yopishingiz kerak. Davom etasizmi?')) {
            return;
          }
        }

        // Backend logout
        if (rt) {
          api.post('/auth/logout', { refreshToken: rt }).catch(() => {});
        }

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          currentShift: null,
        });
      },

      startShift: (startingCash: number) => {
        const { user } = get();

        if (!user) return;

        const newShift: Shift = {
          id: `shift-${Date.now()}`,
          userId: user.id,
          startTime: new Date().toISOString(),
          startingCash,
          totalSales: 0,
          totalOrders: 0,
          cashSales: 0,
          cardSales: 0,
          paymeSales: 0,
          clickSales: 0,
          uzumSales: 0,
        };

        set({ currentShift: newShift });
      },

      endShift: (endingCash: number) => {
        const { currentShift } = get();

        if (!currentShift) return;

        const updatedShift: Shift = {
          ...currentShift,
          endTime: new Date().toISOString(),
          endingCash,
        };

        set({ currentShift: updatedShift });
        console.log('Shift yopildi:', updatedShift);
      },

      updateShiftStats: (stats: Partial<Shift>) => {
        const { currentShift } = get();

        if (!currentShift) return;

        set({
          currentShift: {
            ...currentShift,
            ...stats,
          },
        });
      },
    }),
    {
      name: 'pos-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        currentShift: state.currentShift,
      }),
    }
  )
);
