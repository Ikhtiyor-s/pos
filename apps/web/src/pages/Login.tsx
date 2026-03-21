import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UtensilsCrossed, Loader2, Mail, Lock, Users, Award, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth';

const loginSchema = z.object({
  email: z.string().email('Yaroqli email kiriting'),
  password: z.string().min(6, 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setError(null);
      setIsLoading(true);

      const response = await authService.login(data);
      login(response.user, response.accessToken, response.refreshToken);
      navigate('/');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Tizimga kirishda xatolik yuz berdi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Login Form */}
      <div className="flex w-full flex-col justify-center px-8 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-600">
              <UtensilsCrossed className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">DreamsPOS</h1>
              <p className="text-sm text-gray-500">Restaurant POS System</p>
            </div>
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Xush kelibsiz!</h2>
            <p className="mt-2 text-gray-600">Tizimga kirish uchun ma'lumotlaringizni kiriting</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@oshxona.uz"
                  className="h-12 pl-10 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Parol
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="h-12 pl-10 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
                Eslab qolish
              </label>
              <Link to="/forgot-password" className="text-sm font-medium text-orange-500 hover:text-orange-600">
                Forgot Password?
              </Link>
            </div>

            <Button
              type="submit"
              className="h-12 w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Yuklanmoqda...
                </>
              ) : (
                'Kirish'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don't have an account? <Link to="/register" className="font-semibold text-orange-500 hover:text-orange-600">Sign Up</Link>
          </p>

          {/* Demo Credentials */}
          <div className="mt-4 rounded-xl bg-gray-50 border border-gray-200 p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Demo kirish:</p>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Email:</span> admin@oshxona.uz</p>
              <p><span className="font-medium">Parol:</span> 1234</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 to-orange-600 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-20 right-20 h-64 w-64 rounded-full bg-white/10"></div>
        <div className="absolute bottom-20 left-20 h-48 w-48 rounded-full bg-white/10"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-white/5"></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-white">
          {/* Main Illustration */}
          <div className="mb-8">
            <div className="relative">
              <div className="h-48 w-48 rounded-full bg-white/20 flex items-center justify-center">
                <UtensilsCrossed className="h-24 w-24 text-white" />
              </div>
              <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-white/30 flex items-center justify-center">
                <span className="text-2xl">🍽️</span>
              </div>
              <div className="absolute -bottom-4 -left-4 h-12 w-12 rounded-full bg-white/30 flex items-center justify-center">
                <span className="text-xl">☕</span>
              </div>
            </div>
          </div>

          <h2 className="text-3xl font-bold mb-4 text-center">Restoran boshqaruvi osonlashdi</h2>
          <p className="text-white/80 text-center mb-12 max-w-md">
            Zamonaviy POS tizimi bilan buyurtmalarni boshqaring, hisobotlarni ko'ring va biznesingizni rivojlantiring
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                <Users className="h-7 w-7" />
              </div>
              <span className="text-2xl font-bold">500+</span>
              <span className="text-sm text-white/80">Mijozlar</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                <Award className="h-7 w-7" />
              </div>
              <span className="text-2xl font-bold">99%</span>
              <span className="text-sm text-white/80">Mamnuniyat</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-xl bg-white/20 flex items-center justify-center mb-3">
                <Headphones className="h-7 w-7" />
              </div>
              <span className="text-2xl font-bold">24/7</span>
              <span className="text-sm text-white/80">Yordam</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
