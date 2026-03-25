import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import {
  UtensilsCrossed,
  Loader2,
  Delete,
  ArrowRight,
  Shield,
  ChefHat,
  User,
  Utensils,
} from 'lucide-react';

const MAX_PIN_LENGTH = 4;
const MIN_PIN_LENGTH = 4;

interface LoginProps {
  onLoginSuccess: () => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [startingCash, setStartingCash] = useState('');

  const { loginWithPin, startShift, user } = useAuthStore();

  const handlePinInput = useCallback((digit: string) => {
    setError('');
    setPin((prev) => {
      if (prev.length >= MAX_PIN_LENGTH) return prev;
      return prev + digit;
    });
  }, []);

  const handlePinDelete = useCallback(() => {
    setError('');
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const handlePinClear = useCallback(() => {
    setError('');
    setPin('');
  }, []);

  const handleLogin = useCallback(async () => {
    if (pin.length < MIN_PIN_LENGTH) return;

    setError('');
    setLoading(true);

    try {
      const success = await loginWithPin(pin);
      if (success) {
        // Admin rolini POS dan bloklash — faqat web panel orqali kiradi
        const loggedUser = useAuthStore.getState().user;
        const adminRoles = ['super_admin', 'admin', 'manager', 'owner'];
        if (loggedUser && adminRoles.includes(loggedUser.role?.toLowerCase())) {
          useAuthStore.getState().logout();
          setError('Admin panel: localhost:5173 dan kiring');
          setPin('');
          return;
        }
        startShift(0);
        onLoginSuccess();
      } else {
        setError('PIN kod noto\'g\'ri');
        setPin('');
      }
    } catch {
      setError('Tizimga kirishda xatolik yuz berdi');
      setPin('');
    } finally {
      setLoading(false);
    }
  }, [pin, loginWithPin]);

  // Klaviatura bilan kirish
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showShiftModal) return;

      if (e.key >= '0' && e.key <= '9') {
        handlePinInput(e.key);
      } else if (e.key === 'Backspace') {
        handlePinDelete();
      } else if (e.key === 'Escape') {
        handlePinClear();
      } else if (e.key === 'Enter') {
        handleLogin();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showShiftModal, handlePinInput, handlePinDelete, handlePinClear, handleLogin]);

  const handleStartShift = () => {
    const cash = parseFloat(startingCash);

    if (isNaN(cash) || cash < 0) {
      alert('Noto\'g\'ri summa kiritildi');
      return;
    }

    startShift(cash);
    setShowShiftModal(false);
    onLoginSuccess();
  };

  const canSubmit = pin.length >= MIN_PIN_LENGTH && !loading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-blue-50 flex flex-col items-center justify-center p-4 select-none">
      {/* Logo va sarlavha */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 shadow-xl shadow-orange-500/20">
          <UtensilsCrossed className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Oshxona POS</h1>
        <p className="mt-1 text-sm font-semibold text-gray-600">PIN kodni kiriting</p>
      </div>

      {/* PIN indikator */}
      <div className="mb-6 flex items-center justify-center gap-2.5">
        {Array.from({ length: MAX_PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`h-4 w-4 rounded-full transition-all duration-200 ${
              pin.length > i
                ? 'bg-orange-500 scale-110 shadow-md shadow-orange-500/40'
                : i < MIN_PIN_LENGTH
                  ? 'glass border border-gray-300 backdrop-blur-sm'
                  : 'bg-white/40 border border-gray-200 backdrop-blur-sm'
            }`}
          />
        ))}
      </div>

      {/* Xato xabari */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-300/40 px-4 py-2 text-sm text-red-500 backdrop-blur-sm">
          {error}
        </div>
      )}

      {/* Raqamli klaviatura */}
      <div className="w-full max-w-xs">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handlePinInput(num.toString())}
              disabled={loading}
              className="h-16 rounded-xl glass-card border border-white/60 text-2xl font-semibold text-gray-900 transition-all hover:bg-white/60 hover:border-white/80 active:scale-95 active:bg-white/70 disabled:opacity-50 shadow-sm"
            >
              {num}
            </button>
          ))}

          {/* O'chirish */}
          <button
            type="button"
            onClick={handlePinDelete}
            onContextMenu={(e) => {
              e.preventDefault();
              handlePinClear();
            }}
            disabled={loading || pin.length === 0}
            className="h-16 rounded-xl glass-card border border-white/60 text-gray-600 transition-all hover:bg-white/60 hover:text-gray-900 active:scale-95 disabled:opacity-30 flex items-center justify-center shadow-sm"
          >
            <Delete size={24} />
          </button>

          {/* 0 */}
          <button
            type="button"
            onClick={() => handlePinInput('0')}
            disabled={loading}
            className="h-16 rounded-xl glass-card border border-white/60 text-2xl font-semibold text-gray-900 transition-all hover:bg-white/60 hover:border-white/80 active:scale-95 active:bg-white/70 disabled:opacity-50 shadow-sm"
          >
            0
          </button>

          {/* Kirish */}
          <button
            type="button"
            onClick={handleLogin}
            disabled={!canSubmit}
            className="h-16 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white transition-all hover:shadow-lg hover:shadow-orange-500/30 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-md"
          >
            {loading ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <ArrowRight size={24} />
            )}
          </button>
        </div>
      </div>

      {/* Mavjud PIN kodlar */}
      <div className="mt-8 w-full max-w-xs rounded-2xl border border-white/60 glass-card p-4 shadow-lg">
        <p className="mb-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">Mavjud PIN kodlar</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-xl glass-strong border border-white/60 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
                <Shield size={14} className="text-white" />
              </div>
              <span className="text-sm font-medium text-gray-800">Admin / Manager</span>
            </div>
            <span className="font-mono text-sm font-bold text-orange-500">1234</span>
          </div>
          <div className="flex items-center justify-between rounded-xl glass-strong border border-white/60 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                <User size={14} className="text-white" />
              </div>
              <span className="text-sm font-medium text-gray-800">Kassir</span>
            </div>
            <span className="font-mono text-sm font-bold text-blue-500">5678</span>
          </div>
          <div className="flex items-center justify-between rounded-xl glass-strong border border-white/60 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
                <ChefHat size={14} className="text-white" />
              </div>
              <span className="text-sm font-medium text-gray-800">Oshpaz</span>
            </div>
            <span className="font-mono text-sm font-bold text-green-500">9012</span>
          </div>
          <div className="flex items-center justify-between rounded-xl glass-strong border border-white/60 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-violet-500">
                <Utensils size={14} className="text-white" />
              </div>
              <span className="text-sm font-medium text-gray-800">Ofitsiant</span>
            </div>
            <span className="font-mono text-sm font-bold text-purple-500">3456</span>
          </div>
        </div>
      </div>
    </div>
  );
}
