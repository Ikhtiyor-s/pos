import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, Lock, User, Phone, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const registerSchema = z.object({
  firstName: z.string().min(2, 'Ism kamida 2 ta belgidan iborat bo\'lishi kerak'),
  lastName: z.string().min(2, 'Familiya kamida 2 ta belgidan iborat bo\'lishi kerak'),
  email: z.string().email('Yaroqli email kiriting'),
  phone: z.string().min(9, 'Telefon raqamni kiriting'),
  password: z.string().min(6, 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Parollar bir xil emas',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError(null);
      setIsLoading(true);
      // TODO: API call
      console.log('Register data:', data);
      navigate('/login');
    } catch {
      setError('Ro\'yxatdan o\'tishda xatolik yuz berdi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Form */}
      <div className="flex w-full flex-col justify-center px-8 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          {/* Logo */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-600">
              <UtensilsCrossed className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pointsell</h1>
              <p className="text-sm text-gray-500">Restaurant POS System</p>
            </div>
          </div>

          {/* Title */}
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Registration</h2>
            <p className="mt-2 text-gray-600">Yangi hisob yaratish uchun ma'lumotlaringizni kiriting</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Ism</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Ismingiz"
                    className="h-11 pl-10 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    {...register('firstName')}
                  />
                </div>
                {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Familiya</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Familiyangiz"
                    className="h-11 pl-10 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    {...register('lastName')}
                  />
                </div>
                {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  type="email"
                  placeholder="email@example.com"
                  className="h-11 pl-10 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Telefon</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  type="tel"
                  placeholder="+998 90 123 45 67"
                  className="h-11 pl-10 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                  {...register('phone')}
                />
              </div>
              {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Parol</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  type="password"
                  placeholder="Kamida 6 ta belgi"
                  className="h-11 pl-10 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                  {...register('password')}
                />
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Parolni tasdiqlash</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  type="password"
                  placeholder="Parolni qayta kiriting"
                  className="h-11 pl-10 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                  {...register('confirmPassword')}
                />
              </div>
              {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            <div className="flex items-start gap-2">
              <input type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500" required />
              <span className="text-sm text-gray-600">
                By registration, you agree to the <span className="text-orange-500 font-medium cursor-pointer">Terms of Service</span>
              </span>
            </div>

            <Button
              type="submit"
              className="h-12 w-full bg-orange-500 hover:bg-orange-600 text-white font-medium text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Yuklanmoqda...
                </>
              ) : (
                'Sign Up'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account? <Link to="/login" className="font-semibold text-orange-500 hover:text-orange-600">Login</Link>
          </p>
        </div>
      </div>

      {/* Right Side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 to-orange-600 relative overflow-hidden">
        <div className="absolute top-20 right-20 h-64 w-64 rounded-full bg-white/10"></div>
        <div className="absolute bottom-20 left-20 h-48 w-48 rounded-full bg-white/10"></div>
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-white">
          <div className="mb-8">
            <div className="h-48 w-48 rounded-full bg-white/20 flex items-center justify-center">
              <UtensilsCrossed className="h-24 w-24 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4 text-center">Restoran boshqaruvini boshlang</h2>
          <p className="text-white/80 text-center max-w-md">
            Zamonaviy POS tizimi bilan buyurtmalarni boshqaring va biznesingizni rivojlantiring
          </p>
        </div>
      </div>
    </div>
  );
}
