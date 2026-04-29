import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  UtensilsCrossed, Loader2, Mail, Lock,
  Users, Award, Headphones, Eye, EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth';

const loginSchema = z.object({
  email: z.string().min(3, 'Login kiritilishi shart'),
  password: z.string().min(4, 'Parol kamida 4 ta belgidan iborat bo\'lishi kerak'),
});

type LoginForm = z.infer<typeof loginSchema>;

const DEMO_USERS = [
  { role: 'SUPER_ADMIN', email: 'admin@oshxona.uz',       password: 'Admin1234!' },
  { role: 'MANAGER',     email: 'manager@oshxona.uz',     password: 'Manager1234!' },
  { role: 'CASHIER',     email: 'kassir@oshxona.uz',      password: 'Kassir1234!' },
  { role: 'CHEF',        email: 'oshpaz@oshxona.uz',      password: 'Oshpaz1234!' },
  { role: 'WAITER',      email: 'waiter@oshxona.uz',      password: 'Waiter1234!' },
  { role: 'WAREHOUSE',   email: 'ombor@oshxona.uz',       password: 'Ombor1234!' },
  { role: 'ACCOUNTANT',  email: 'buxgalter@oshxona.uz',   password: 'Buxgalter1234!' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await authService.login(data);
      login(response.user, response.accessToken, response.refreshToken);
      navigate('/');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Login yoki parol noto\'g\'ri');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (user: typeof DEMO_USERS[0]) => {
    setValue('email', user.email);
    setValue('password', user.password);
    setError(null);
  };

  return (
    <div className="flex min-h-screen">
      {/* ─── Chap: Login formasi ─────────────────────────────────────── */}
      <div className="flex w-full flex-col justify-center px-8 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">

          {/* Logo */}
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-600">
              <UtensilsCrossed className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Oshxona POS</h1>
              <p className="text-sm text-gray-500">Admin Panel</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Xush kelibsiz!</h2>
            <p className="mt-2 text-gray-600">Tizimga kirish uchun ma'lumotlaringizni kiriting</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Login */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">Login</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="text"
                  autoComplete="username"
                  placeholder="Loginni kiriting"
                  className="h-12 w-full rounded-lg border border-gray-300 pl-10 pr-4 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>

            {/* Parol */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">Parol</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Parolni kiriting"
                  className="h-12 w-full rounded-lg border border-gray-300 pl-10 pr-11 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>

            <Button
              type="submit"
              className="h-12 w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Yuklanmoqda...</>
              ) : 'Kirish'}
            </Button>
          </form>

          {/* Demo loginlar — barcha rollar */}
          <div className="mt-6 rounded-xl bg-gray-50 border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Test loginlar (bosing):</p>
            <div className="grid grid-cols-1 gap-1.5">
              {DEMO_USERS.map(u => (
                <button
                  key={u.role}
                  type="button"
                  onClick={() => fillDemo(u)}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-xs hover:bg-orange-50 hover:text-orange-700 transition-colors text-left group"
                >
                  <span className="font-semibold text-gray-600 group-hover:text-orange-600 w-28">{u.role}</span>
                  <span className="text-gray-500 group-hover:text-gray-700 truncate flex-1">{u.email}</span>
                  <span className="text-gray-400 ml-2 shrink-0">{u.password}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">* Bosib, formani avtomatik to'ldiring</p>
          </div>
        </div>
      </div>

      {/* ─── O'ng: Illyustrasiya ──────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 to-orange-600 relative overflow-hidden">
        <div className="absolute top-20 right-20 h-64 w-64 rounded-full bg-white/10" />
        <div className="absolute bottom-20 left-20 h-48 w-48 rounded-full bg-white/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-white">
          <div className="mb-8">
            <div className="h-48 w-48 rounded-full bg-white/20 flex items-center justify-center">
              <UtensilsCrossed className="h-24 w-24 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4 text-center">Restoran boshqaruvi osonlashdi</h2>
          <p className="text-white/80 text-center mb-12 max-w-md">
            Zamonaviy POS tizimi bilan buyurtmalarni boshqaring va biznesingizni rivojlantiring
          </p>
          <div className="grid grid-cols-3 gap-8">
            {[
              { icon: Users, value: '7', label: 'Rollar' },
              { icon: Award, value: '99%', label: 'Mamnuniyat' },
              { icon: Headphones, value: '24/7', label: 'Yordam' },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex flex-col items-center text-center">
                <div className="h-14 w-14 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                  <Icon className="h-7 w-7" />
                </div>
                <span className="text-2xl font-bold">{value}</span>
                <span className="text-sm text-white/80">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
