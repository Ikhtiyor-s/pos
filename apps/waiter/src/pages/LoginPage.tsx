import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ChefHat, Delete } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { useTranslation } from '../store/language';
import type { Language } from '../utils/translations';

const LANG_FLAGS: Record<Language, string> = { uz: '🇺🇿', ru: '🇷🇺', en: '🇬🇧' };
const LANGS: Language[] = ['uz', 'ru', 'en'];

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginWithPin, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const { t, language, setLanguage } = useTranslation();
  const cycleLanguage = () => setLanguage(LANGS[(LANGS.indexOf(language) + 1) % LANGS.length]);
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/tables', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handlePinSubmit = useCallback(async (pinValue: string) => {
    const success = await loginWithPin(pinValue);
    if (success) {
      navigate('/tables', { replace: true });
    } else {
      setPin('');
    }
  }, [loginWithPin, navigate]);

  useEffect(() => {
    if (pin.length === 4) {
      handlePinSubmit(pin);
    }
  }, [pin, handlePinSubmit]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key) && pin.length < 4 && !isLoading) {
        setPin(p => p + e.key);
        clearError();
      }
      if (e.key === 'Backspace') {
        setPin(p => p.slice(0, -1));
        clearError();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, isLoading, clearError]);

  const pressDigit = (d: string) => {
    if (pin.length < 4 && !isLoading) {
      setPin(p => p + d);
      clearError();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-orange-500 to-pink-500">
      {/* Language switcher */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={cycleLanguage}
          className="flex items-center gap-1.5 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium active:bg-white/30 transition-all"
        >
          <span className="text-base">{LANG_FLAGS[language]}</span>
          <span>{t(`languages.${language}` as any)}</span>
        </button>
      </div>

      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm mb-6">
          <ChefHat className="h-14 w-14 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-1">{t('login.appSubtitle' as any)}</h1>
        <p className="text-white/80 text-sm">{t('login.appName' as any)}</p>
      </div>

      {/* PIN panel */}
      <div className="bg-white rounded-t-3xl px-6 py-8 shadow-2xl">
        <p className="text-center text-sm text-gray-500 mb-6">
          {t('login.pinHint' as any) || '4 raqamli PIN kodingizni kiriting'}
        </p>

        {/* PIN dots */}
        <div className="flex justify-center gap-5 mb-6">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`h-4 w-4 rounded-full transition-all duration-150 ${
                i < pin.length
                  ? 'bg-orange-500 scale-110'
                  : 'border-2 border-gray-300 bg-gray-100'
              }`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-center text-red-600">
            {error}
          </div>
        )}

        {/* Numpad */}
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
              <button
                key={d}
                onPointerDown={() => pressDigit(d)}
                className="rounded-2xl bg-gray-50 border border-gray-200 py-5 text-xl font-semibold text-gray-800 active:bg-orange-50 active:border-orange-300 active:scale-95 transition-all touch-none"
              >
                {d}
              </button>
            ))}
            <div />
            <button
              onPointerDown={() => pressDigit('0')}
              className="rounded-2xl bg-gray-50 border border-gray-200 py-5 text-xl font-semibold text-gray-800 active:bg-orange-50 active:border-orange-300 active:scale-95 transition-all touch-none"
            >
              0
            </button>
            <button
              onPointerDown={() => { setPin(p => p.slice(0, -1)); clearError(); }}
              className="rounded-2xl bg-gray-50 border border-gray-200 py-5 flex items-center justify-center text-gray-400 active:bg-red-50 active:border-red-300 active:text-red-500 active:scale-95 transition-all touch-none"
            >
              <Delete className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
