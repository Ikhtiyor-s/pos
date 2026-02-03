import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Lock, Eye, EyeOff, Loader2, ChefHat } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { useTranslation } from '../store/language';
import type { Language } from '../utils/translations';

const languageFlags: Record<Language, string> = {
  uz: '🇺🇿',
  ru: '🇷🇺',
  en: '🇬🇧',
};

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const { t, language, setLanguage } = useTranslation();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/tables', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone || !password) return;

    // Clean phone: remove all non-digits, then add +998 prefix
    const digits = phone.replace(/\D/g, '');
    // Handle different input formats
    let cleanPhone: string;
    if (digits.startsWith('998') && digits.length === 12) {
      cleanPhone = `+${digits}`;
    } else if (digits.length === 9) {
      cleanPhone = `+998${digits}`;
    } else {
      cleanPhone = `+998${digits.slice(-9)}`;
    }

    const success = await login(cleanPhone, password);
    if (success) {
      navigate('/tables', { replace: true });
    }
  };

  const formatPhone = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');

    // Get last 9 digits (local number)
    let localNumber = digits;
    if (digits.startsWith('998')) {
      localNumber = digits.slice(3);
    }

    // Limit to 9 digits
    localNumber = localNumber.slice(0, 9);

    // Format as +998 XX XXX XX XX
    if (localNumber.length <= 2) return `+998 ${localNumber}`;
    if (localNumber.length <= 5) return `+998 ${localNumber.slice(0, 2)} ${localNumber.slice(2)}`;
    if (localNumber.length <= 7) return `+998 ${localNumber.slice(0, 2)} ${localNumber.slice(2, 5)} ${localNumber.slice(5)}`;
    return `+998 ${localNumber.slice(0, 2)} ${localNumber.slice(2, 5)} ${localNumber.slice(5, 7)} ${localNumber.slice(7, 9)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const cycleLanguage = () => {
    const langs: Language[] = ['uz', 'ru', 'en'];
    const currentIndex = langs.indexOf(language);
    const nextIndex = (currentIndex + 1) % langs.length;
    setLanguage(langs[nextIndex]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-orange-500 to-pink-500">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={cycleLanguage}
          className="flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium hover:bg-white/30 transition-all"
        >
          <span className="text-lg">{languageFlags[language]}</span>
          <span>{t('languages.' + language)}</span>
        </button>
      </div>

      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
            <ChefHat className="h-12 w-12 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">{t('login.appName')}</h1>
        <p className="text-white/80 text-sm">{t('login.appSubtitle')}</p>
      </div>

      {/* Login Form */}
      <div className="bg-white dark:bg-card rounded-t-3xl px-6 py-8 shadow-2xl">
        <h2 className="text-xl font-bold text-gray-800 dark:text-foreground mb-6 text-center">
          {t('login.title')}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Phone Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-foreground mb-1.5">
              {t('login.phone')}
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder={t('login.phonePlaceholder')}
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-border dark:bg-background dark:text-foreground focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900/50 outline-none transition-all"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-foreground mb-1.5">
              {t('login.password')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.passwordPlaceholder')}
                className="w-full pl-11 pr-11 py-3 rounded-xl border border-gray-200 dark:border-border dark:bg-background dark:text-foreground focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900/50 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !phone || !password}
            className="w-full py-3.5 mt-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold rounded-xl shadow-lg shadow-orange-200 dark:shadow-orange-900/30 hover:shadow-xl hover:shadow-orange-300 dark:hover:shadow-orange-900/50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t('login.submitting')}
              </>
            ) : (
              t('login.submit')
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400 dark:text-muted-foreground">
          {t('login.hint')}
        </p>
      </div>
    </div>
  );
}
