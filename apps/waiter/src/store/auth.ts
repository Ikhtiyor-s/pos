import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService, type User } from '../services/auth.service';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (phone: string, password: string) => Promise<boolean>;
  loginWithPin: (pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (phone: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authService.login(phone, password);

          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });

          return true;
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.message || 'Login xatoligi',
          });
          return false;
        }
      },

      loginWithPin: async (pin: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.loginWithPin(pin);
          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.message || "PIN kod noto'g'ri",
          });
          return false;
        }
      },

      logout: async () => {
        const { refreshToken } = get();

        try {
          if (refreshToken) {
            await authService.logout(refreshToken);
          }
        } catch (e) {
          // Ignore logout errors
        }

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      setUser: (user: User) => {
        set({ user });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'waiter-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
