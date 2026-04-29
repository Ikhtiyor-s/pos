import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import { cn } from '../lib/utils';
import {
  UtensilsCrossed,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Delete,
} from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
  lockMode?: boolean;
}

type Mode = 'pin' | 'admin';

export function Login({ onLoginSuccess, lockMode = false }: LoginProps) {
  const [mode, setMode] = useState<Mode>(lockMode ? 'pin' : 'admin');

  // PIN mode state
  const [pin, setPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState('');

  // Admin mode state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');

  const { loginWithPin, login } = useAuthStore();

  // PIN auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length === 4) {
      handlePinSubmit(pin);
    }
  }, [pin]);

  const handlePinSubmit = useCallback(async (pinValue: string) => {
    setPinError('');
    setPinLoading(true);
    try {
      const success = await loginWithPin(pinValue);
      if (success) {
        onLoginSuccess();
      } else {
        setPinError("PIN kod noto'g'ri");
        setPin('');
      }
    } catch {
      setPinError('Tizimga kirishda xatolik');
      setPin('');
    } finally {
      setPinLoading(false);
    }
  }, [loginWithPin, onLoginSuccess]);

  const handleAdminLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) return;
    setAdminError('');
    setAdminLoading(true);
    try {
      await login(email.trim(), password);
      onLoginSuccess();
    } catch (err: any) {
      const status = err?.response?.status;
      const msg    = err?.response?.data?.message;

      if (status === 401 || status === 400) {
        setAdminError("Login yoki parol noto'g'ri");
      } else if (status === 500 || !status) {
        setAdminError('Server bilan ulanishda xatolik. DB ishlamoqdami?');
      } else {
        setAdminError(msg || 'Tizimga kirishda xatolik');
      }
    } finally {
      setAdminLoading(false);
    }
  }, [email, password, login, onLoginSuccess]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode === 'admin' && e.key === 'Enter') handleAdminLogin();
      if (mode === 'pin' && /^\d$/.test(e.key) && pin.length < 4) {
        setPin(p => p + e.key);
        setPinError('');
      }
      if (mode === 'pin' && e.key === 'Backspace') {
        setPin(p => p.slice(0, -1));
        setPinError('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, pin, handleAdminLogin]);

  const pressDigit = (d: string) => {
    if (pin.length < 4 && !pinLoading) {
      setPin(p => p + d);
      setPinError('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-blue-50 flex flex-col items-center justify-center p-4 select-none">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className={cn(
          "mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl shadow-xl",
          lockMode ? "bg-gradient-to-br from-yellow-500 to-orange-500 shadow-yellow-500/20" : "bg-gradient-to-br from-orange-500 to-red-500 shadow-orange-500/20"
        )}>
          {lockMode ? <Lock className="h-10 w-10 text-white" /> : <UtensilsCrossed className="h-10 w-10 text-white" />}
        </div>
        <h1 className="text-3xl font-bold text-gray-900">{lockMode ? 'Ekran bloklangan' : 'Oshxona POS'}</h1>
        {lockMode && <p className="text-sm text-gray-500 mt-1">4 raqamli PIN kodingizni kiriting</p>}
        {!lockMode && <p className="text-sm text-gray-500 mt-1">Email va parol bilan kiring</p>}
      </div>

      {/* Tablar yo'q — birinchi kirish email+parol, qulfcha PIN */}

      {/* PIN mode */}
      {mode === 'pin' && (
        <div className="w-full max-w-sm rounded-2xl border border-white/60 glass-card p-6 shadow-lg">
          <p className="mb-6 text-center text-sm text-gray-500">4 raqamli PIN kodingizni kiriting</p>

          {/* PIN dots */}
          <div className="mb-6 flex justify-center gap-4">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className={`h-4 w-4 rounded-full transition-all ${
                  i < pin.length
                    ? 'bg-orange-500 scale-110'
                    : 'bg-gray-200 border-2 border-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Error */}
          {pinError && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-300/40 px-4 py-2 text-sm text-center text-red-500">
              {pinError}
            </div>
          )}

          {/* Numpad */}
          {pinLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {['1','2','3','4','5','6','7','8','9'].map(d => (
                <button
                  key={d}
                  onClick={() => pressDigit(d)}
                  className="rounded-xl bg-gray-50 border border-gray-200 py-4 text-xl font-semibold text-gray-800 hover:bg-orange-50 hover:border-orange-300 active:scale-95 transition-all"
                >
                  {d}
                </button>
              ))}
              {/* Empty, 0, Delete */}
              <div />
              <button
                onClick={() => pressDigit('0')}
                className="rounded-xl bg-gray-50 border border-gray-200 py-4 text-xl font-semibold text-gray-800 hover:bg-orange-50 hover:border-orange-300 active:scale-95 transition-all"
              >
                0
              </button>
              <button
                onClick={() => { setPin(p => p.slice(0, -1)); setPinError(''); }}
                className="rounded-xl bg-gray-50 border border-gray-200 py-4 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:border-red-300 hover:text-red-500 active:scale-95 transition-all"
              >
                <Delete className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Admin mode */}
      {mode === 'admin' && (
        <div className="w-full max-w-sm rounded-2xl border border-white/60 glass-card p-6 shadow-lg">
          {/* Email */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Login</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={email}
                onChange={e => { setEmail(e.target.value); setAdminError(''); }}
                placeholder="Loginni kiriting"
                autoComplete="username"
                className="w-full rounded-xl border border-gray-200 bg-white/80 py-3 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Parol</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setAdminError(''); }}
                placeholder="Parolni kiriting"
                autoComplete="current-password"
                className="w-full rounded-xl border border-gray-200 bg-white/80 py-3 pl-10 pr-11 text-sm text-gray-900 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {adminError && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-300/40 px-4 py-2 text-sm text-red-500">
              {adminError}
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleAdminLogin}
            disabled={!email.trim() || password.length < 4 || adminLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:shadow-orange-500/30 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {adminLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Kirish
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
