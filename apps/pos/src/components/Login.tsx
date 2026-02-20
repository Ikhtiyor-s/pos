import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import {
  UtensilsCrossed,
  Loader2,
  DollarSign,
  LogIn,
  Delete,
  ArrowRight,
} from 'lucide-react';

const MAX_PIN_LENGTH = 8;
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
        setShowShiftModal(true);
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

  // Shift modal
  if (showShiftModal && user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-500">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Xush kelibsiz, {user.name}!</h2>
            <p className="mt-2 text-slate-400">Shiftni boshlash uchun kassadagi naqd pulni kiriting</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Boshlang'ich kassa (so'm)
              </label>
              <input
                type="number"
                value={startingCash}
                onChange={(e) => setStartingCash(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
                autoFocus
              />
            </div>

            <button
              onClick={handleStartShift}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 py-3 font-semibold text-white transition-all hover:shadow-lg hover:shadow-orange-500/20"
            >
              <LogIn size={18} />
              Shiftni boshlash
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 select-none">
      {/* Logo va sarlavha */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 shadow-xl shadow-orange-500/20">
          <UtensilsCrossed className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white">Oshxona POS</h1>
        <p className="mt-1 text-sm text-slate-500">PIN kodni kiriting</p>
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
                  ? 'bg-slate-700 border border-slate-600'
                  : 'bg-slate-800 border border-slate-700'
            }`}
          />
        ))}
      </div>

      {/* Xato xabari */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-400">
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
              className="h-16 rounded-xl bg-slate-800 border border-slate-700 text-2xl font-semibold text-white transition-all hover:bg-slate-700 hover:border-slate-600 active:scale-95 active:bg-slate-600 disabled:opacity-50"
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
            className="h-16 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 transition-all hover:bg-slate-700 hover:text-white active:scale-95 disabled:opacity-30 flex items-center justify-center"
          >
            <Delete size={24} />
          </button>

          {/* 0 */}
          <button
            type="button"
            onClick={() => handlePinInput('0')}
            disabled={loading}
            className="h-16 rounded-xl bg-slate-800 border border-slate-700 text-2xl font-semibold text-white transition-all hover:bg-slate-700 hover:border-slate-600 active:scale-95 active:bg-slate-600 disabled:opacity-50"
          >
            0
          </button>

          {/* Kirish */}
          <button
            type="button"
            onClick={handleLogin}
            disabled={!canSubmit}
            className="h-16 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white transition-all hover:shadow-lg hover:shadow-orange-500/20 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <ArrowRight size={24} />
            )}
          </button>
        </div>
      </div>

      {/* Qo'shimcha ma'lumot */}
      <p className="mt-8 text-xs text-slate-600">
        PIN kod administratordan olinadi
      </p>
    </div>
  );
}
