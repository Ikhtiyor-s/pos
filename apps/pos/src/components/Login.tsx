import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import {
  UtensilsCrossed,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  User,
  Lock,
} from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { loginWithPin } = useAuthStore();

  const handleLogin = useCallback(async () => {
    if (!username.trim() || !password.trim()) return;
    setError('');
    setLoading(true);
    try {
      const success = await loginWithPin(username.trim(), password);
      if (success) {
        onLoginSuccess();
      } else {
        setError("Login yoki parol noto'g'ri");
        setPassword('');
      }
    } catch {
      setError('Tizimga kirishda xatolik yuz berdi');
      setPassword('');
    } finally {
      setLoading(false);
    }
  }, [username, password, loginWithPin, onLoginSuccess]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleLogin();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleLogin]);

  const canSubmit = username.trim().length > 0 && password.length >= 6 && !loading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-blue-50 flex flex-col items-center justify-center p-4 select-none">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 shadow-xl shadow-orange-500/20">
          <UtensilsCrossed className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Oshxona POS</h1>
        <p className="mt-1 text-sm font-semibold text-gray-600">Tizimga kirish</p>
      </div>

      {/* Form */}
      <div className="w-full max-w-sm rounded-2xl border border-white/60 glass-card p-6 shadow-lg">
        {/* Username */}
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Login</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(''); }}
              placeholder="login"
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
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="••••••••"
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
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-300/40 px-4 py-2 text-sm text-red-500">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={handleLogin}
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:shadow-orange-500/30 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Kirish
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
