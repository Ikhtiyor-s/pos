import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Lock, UtensilsCrossed, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const resetSchema = z.object({
  password: z.string().min(6, 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Parollar bir xil emas',
  path: ['confirmPassword'],
});

type ResetForm = z.infer<typeof resetSchema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isReset, setIsReset] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetForm) => {
    try {
      setIsLoading(true);
      // TODO: API call
      console.log('Reset password:', data);
      setIsReset(true);
    } catch {
      // handle error
    } finally {
      setIsLoading(false);
    }
  };

  if (isReset) {
    return (
      <div className="flex min-h-screen">
        <div className="flex w-full flex-col justify-center px-8 lg:w-1/2 lg:px-16 xl:px-24">
          <div className="mx-auto w-full max-w-md text-center">
            <div className="mb-6 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Password Changed</h2>
            <p className="text-gray-600 mb-8">
              We have sent a verification link to your email. Click on the link in your mailbox &amp; sit below.
            </p>
            <Button
              onClick={() => navigate('/login')}
              className="h-12 w-full bg-green-500 hover:bg-green-600 text-white font-medium text-base"
            >
              Verification Link Set Successfully
            </Button>
          </div>
        </div>

        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 to-orange-600 relative overflow-hidden">
          <div className="absolute top-20 right-20 h-64 w-64 rounded-full bg-white/10"></div>
          <div className="absolute bottom-20 left-20 h-48 w-48 rounded-full bg-white/10"></div>
          <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-white">
            <div className="h-48 w-48 rounded-full bg-white/20 flex items-center justify-center">
              <UtensilsCrossed className="h-24 w-24 text-white" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Side */}
      <div className="flex w-full flex-col justify-center px-8 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-600">
              <UtensilsCrossed className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pointsell</h1>
              <p className="text-sm text-gray-500">Restaurant POS System</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Reset Password</h2>
            <p className="mt-2 text-gray-600">Yangi parolingizni kiriting</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Yangi parol</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  type="password"
                  placeholder="Kamida 6 ta belgi"
                  className="h-12 pl-10 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                  {...register('password')}
                />
              </div>
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Parolni tasdiqlash</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  type="password"
                  placeholder="Parolni qayta kiriting"
                  className="h-12 pl-10 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                  {...register('confirmPassword')}
                />
              </div>
              {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>}
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
                'Change Password'
              )}
            </Button>
          </form>

          <div className="mt-8">
            <Link to="/login" className="text-sm font-medium text-gray-500 hover:text-gray-700">
              Kirish sahifasiga qaytish
            </Link>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 to-orange-600 relative overflow-hidden">
        <div className="absolute top-20 right-20 h-64 w-64 rounded-full bg-white/10"></div>
        <div className="absolute bottom-20 left-20 h-48 w-48 rounded-full bg-white/10"></div>
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-white">
          <div className="h-48 w-48 rounded-full bg-white/20 flex items-center justify-center">
            <UtensilsCrossed className="h-24 w-24 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
