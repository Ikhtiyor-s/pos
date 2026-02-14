import { useState } from 'react';
import { useAuthStore } from '../store/auth';
import {
  UtensilsCrossed,
  Mail,
  Lock,
  KeyRound,
  Loader2,
  DollarSign,
  LogIn,
} from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [mode, setMode] = useState<'email' | 'pin'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [startingCash, setStartingCash] = useState('');

  const { login, loginWithPin, startShift, user } = useAuthStore();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(email, password);

      if (success) {
        setShowShiftModal(true);
      } else {
        setError('Email yoki parol noto\'g\'ri');
      }
    } catch (err) {
      setError('Tizimga kirishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handlePinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await loginWithPin(pin);

      if (success) {
        setShowShiftModal(true);
      } else {
        setError('PIN kod noto\'g\'ri');
      }
    } catch (err) {
      setError('Tizimga kirishda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

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

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      setPin(pin + digit);
    }
  };

  const handlePinDelete = () => {
    setPin(pin.slice(0, -1));
  };

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
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 to-red-500 relative overflow-hidden">
        <div className="absolute top-20 right-20 h-64 w-64 rounded-full bg-white/10"></div>
        <div className="absolute bottom-20 left-20 h-48 w-48 rounded-full bg-white/10"></div>

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-white">
          <div className="mb-8">
            <div className="relative">
              <div className="h-48 w-48 rounded-full bg-white/20 flex items-center justify-center">
                <UtensilsCrossed className="h-24 w-24 text-white" />
              </div>
            </div>
          </div>

          <h2 className="text-4xl font-bold mb-4 text-center">Oshxona POS Tizimi</h2>
          <p className="text-white/80 text-center mb-12 max-w-md text-lg">
            Professional kassir tizimi bilan stollarni boshqaring va to'lovlarni qabul qiling
          </p>

          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold">500+</div>
              <div className="text-sm text-white/80">Buyurtmalar</div>
            </div>
            <div>
              <div className="text-3xl font-bold">24/7</div>
              <div className="text-sm text-white/80">Xizmat</div>
            </div>
            <div>
              <div className="text-3xl font-bold">100%</div>
              <div className="text-sm text-white/80">Ishonch</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-red-500">
              <UtensilsCrossed className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Oshxona POS</h1>
              <p className="text-sm text-slate-400">Kassir tizimi</p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="mb-6 flex gap-2 rounded-xl bg-slate-800 p-1">
            <button
              onClick={() => setMode('email')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                mode === 'email'
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mail size={16} className="inline mr-2" />
              Email
            </button>
            <button
              onClick={() => setMode('pin')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                mode === 'pin'
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound size={16} className="inline mr-2" />
              PIN Kod
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Email Login Form */}
          {mode === 'email' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="kassir@oshxona.uz"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-4 py-3 text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Parol
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 pl-10 pr-4 py-3 text-white placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 py-3 font-semibold text-white transition-all hover:shadow-lg hover:shadow-orange-500/20 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Yuklanmoqda...
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    Kirish
                  </>
                )}
              </button>

              {/* Demo credentials */}
              <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                <p className="text-xs font-semibold text-slate-400 mb-1">Demo kirish:</p>
                <p className="text-xs text-slate-500">
                  Email: <span className="text-slate-300">kassir@oshxona.uz</span>
                </p>
                <p className="text-xs text-slate-500">
                  Parol: <span className="text-slate-300">password</span>
                </p>
              </div>
            </form>
          )}

          {/* PIN Login Form */}
          {mode === 'pin' && (
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300 text-center">
                  PIN kodni kiriting
                </label>
                <div className="flex justify-center gap-2 mb-6">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-12 w-12 rounded-lg border-2 flex items-center justify-center text-2xl font-bold ${
                        pin.length > i
                          ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                          : 'border-slate-700 bg-slate-800 text-slate-600'
                      }`}
                    >
                      {pin.length > i ? '•' : ''}
                    </div>
                  ))}
                </div>
              </div>

              {/* PIN Numpad */}
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handlePinInput(num.toString())}
                    className="h-14 rounded-lg border border-slate-700 bg-slate-800 text-xl font-semibold text-white hover:bg-slate-700 transition-colors"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handlePinDelete}
                  className="h-14 rounded-lg border border-slate-700 bg-slate-800 text-sm font-medium text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  O'chirish
                </button>
                <button
                  type="button"
                  onClick={() => handlePinInput('0')}
                  className="h-14 rounded-lg border border-slate-700 bg-slate-800 text-xl font-semibold text-white hover:bg-slate-700 transition-colors"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (pin.length === 4) {
                      handlePinLogin(new Event('submit') as any);
                    }
                  }}
                  disabled={pin.length !== 4 || loading}
                  className="h-14 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-sm font-semibold text-white hover:shadow-lg hover:shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 size={18} className="mx-auto animate-spin" /> : 'Kirish'}
                </button>
              </div>

              {/* Demo PIN */}
              <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-center">
                <p className="text-xs font-semibold text-slate-400 mb-1">Demo PIN:</p>
                <p className="text-lg font-bold text-slate-300">1234</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
