import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, UtensilsCrossed, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const forgotSchema = z.object({
  email: z.string().email('Yaroqli email kiriting'),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotForm) => {
    try {
      setIsLoading(true);
      // TODO: API call
      console.log('Forgot password:', data.email);
      setSentEmail(data.email);
      setIsSent(true);
    } catch {
      // handle error
    } finally {
      setIsLoading(false);
    }
  };

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

          {!isSent ? (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900">Forget Password</h2>
                <p className="mt-2 text-gray-600">
                  Please enter your email address below, you will receive a Verification link.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      className="h-12 pl-10 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                      {...register('email')}
                    />
                  </div>
                  {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
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
                    'Continue'
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900">Password Changed</h2>
                <p className="mt-2 text-gray-600">
                  We have sent a verification link to your email: <span className="font-semibold text-orange-500">{sentEmail}</span>
                </p>
              </div>

              <p className="text-gray-600 mb-6">Click on the link in your mailbox &amp; sit below.</p>

              <Link to="/login">
                <Button className="h-12 w-full bg-orange-500 hover:bg-orange-600 text-white font-medium text-base">
                  Open Google
                </Button>
              </Link>

              <p className="mt-4 text-center text-sm text-gray-500">Resend Link</p>
            </>
          )}

          <div className="mt-8">
            <Link to="/login" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700">
              <ArrowLeft size={16} />
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
          <div className="mb-8">
            <div className="h-48 w-48 rounded-full bg-white/20 flex items-center justify-center">
              <UtensilsCrossed className="h-24 w-24 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4 text-center">Parolni tiklash</h2>
          <p className="text-white/80 text-center max-w-md">
            Emailingizga yuborilgan havola orqali parolingizni yangilang
          </p>
        </div>
      </div>
    </div>
  );
}
