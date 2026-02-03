import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { translations, type Language } from '../utils/translations';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'uz',
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'waiter-language',
    }
  )
);

// Hook to get translated text
export function useTranslation() {
  const { language } = useLanguageStore();

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    // Get the translated string for current language
    if (value && typeof value === 'object' && language in value) {
      let text = value[language] as string;

      // Replace parameters like {name} with actual values
      if (params) {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
        });
      }

      return text;
    }

    return key;
  };

  return { t, language, setLanguage: useLanguageStore.getState().setLanguage };
}

// Shorthand hook for just getting the t function
export function useT() {
  return useTranslation().t;
}
