import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'cashier' | 'admin';
  pin?: string;
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

// Mock users - haqiqiy loyihada backend dan keladi
const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'Sardor Kassirov',
    email: 'kassir@oshxona.uz',
    role: 'cashier',
    pin: '1234',
  },
  {
    id: '2',
    name: 'Admin User',
    email: 'admin@oshxona.uz',
    role: 'admin',
    pin: '0000',
  },
];

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      currentShift: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        // Mock login - haqiqiy loyihada backend API ga so'rov
        await new Promise((resolve) => setTimeout(resolve, 500));

        const user = MOCK_USERS.find((u) => u.email === email);

        if (user && password === 'password') {
          set({ user, isAuthenticated: true });
          return true;
        }

        return false;
      },

      loginWithPin: async (pin: string) => {
        // Mock PIN login
        await new Promise((resolve) => setTimeout(resolve, 300));

        const user = MOCK_USERS.find((u) => u.pin === pin);

        if (user) {
          set({ user, isAuthenticated: true });
          return true;
        }

        return false;
      },

      logout: () => {
        const { currentShift } = get();

        // Agar shift ochiq bo'lsa, yopish talab qilinadi
        if (currentShift && !currentShift.endTime) {
          if (!confirm('Shift hali ochiq! Chiqishdan oldin shiftni yopishingiz kerak. Davom etasizmi?')) {
            return;
          }
        }

        set({
          user: null,
          isAuthenticated: false,
          currentShift: null
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

        // Bu yerda backend ga shift ma'lumotlarini yuborish kerak
        console.log('Shift yopildi:', updatedShift);
      },

      updateShiftStats: (stats: Partial<Shift>) => {
        const { currentShift } = get();

        if (!currentShift) return;

        set({
          currentShift: {
            ...currentShift,
            ...stats
          }
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        currentShift: state.currentShift,
      }),
    }
  )
);
