import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  initTheme: () => void;
}

function applyTheme(theme: Theme): boolean {
  const root = document.documentElement;
  let dark = false;

  if (theme === 'dark') {
    root.classList.add('dark');
    dark = true;
  } else if (theme === 'light') {
    root.classList.remove('dark');
    dark = false;
  } else {
    // system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
      dark = true;
    } else {
      root.classList.remove('dark');
      dark = false;
    }
  }

  return dark;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      isDark: false,

      setTheme: (theme: Theme) => {
        const isDark = applyTheme(theme);
        set({ theme, isDark });
      },

      initTheme: () => {
        const { theme } = get();
        const isDark = applyTheme(theme);
        set({ isDark });

        // Listen for system theme changes when theme is 'system'
        if (theme === 'system') {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          const handler = (e: MediaQueryListEvent) => {
            const { theme: currentTheme } = get();
            if (currentTheme === 'system') {
              const dark = e.matches;
              if (dark) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
              set({ isDark: dark });
            }
          };
          mediaQuery.addEventListener('change', handler);
        }
      },
    }),
    {
      name: 'waiter-theme',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
