import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ShoppingBag,
  DollarSign,
  LogOut,
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { authService } from '../services/auth.service';
import { useTranslation } from '../store/language';

export default function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Fetch daily stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['my-stats'],
    queryFn: () => authService.getMyDailyStats(),
    refetchInterval: 60000, // Refresh every minute
  });

  // Check in mutation
  const checkInMutation = useMutation({
    mutationFn: authService.checkIn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-stats'] });
    },
  });

  // Check out mutation
  const checkOutMutation = useMutation({
    mutationFn: authService.checkOut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-stats'] });
    },
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price);
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-';
    return new Date(timeString).toLocaleTimeString('uz-UZ', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAttendanceStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'LATE':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'ABSENT':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getAttendanceStatusText = (status: string | undefined) => {
    if (status) {
      return t(`attendanceStatus.${status}`);
    }
    return t('attendanceStatus.notSet');
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card p-6">
            <h3 className="text-lg font-bold text-foreground mb-2">{t('profile.logout')}</h3>
            <p className="text-muted-foreground mb-6">{t('profile.logoutConfirm')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-medium"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium"
              >
                {t('profile.logout')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-4 text-white safe-area-top">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/tables')} className="p-2 -ml-2 rounded-full active:bg-white/20">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">{t('profile.title')}</h1>
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="p-2 -mr-2 rounded-full active:bg-white/20"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* User Card */}
        <div className="bg-card rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-muted-foreground text-sm">{user?.phone}</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-medium rounded-full">
                {user?.role ? t(`profile.role.${user.role}`) : user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Attendance Card */}
        <div className="bg-card rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-500" />
            {t('profile.attendance')}
          </h3>

          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t('profile.status')}:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getAttendanceStatusColor(stats?.attendance?.status)}`}>
                  {getAttendanceStatusText(stats?.attendance?.status)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t('profile.checkIn')}:</span>
                <span className="font-medium text-foreground">{formatTime(stats?.attendance?.checkIn || null)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">{t('profile.checkOut')}:</span>
                <span className="font-medium text-foreground">{formatTime(stats?.attendance?.checkOut || null)}</span>
              </div>

              {/* Check In/Out Buttons */}
              <div className="flex gap-2 pt-2">
                {!stats?.attendance?.checkIn ? (
                  <button
                    onClick={() => checkInMutation.mutate()}
                    disabled={checkInMutation.isPending}
                    className="flex-1 py-2.5 bg-green-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {checkInMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    {t('profile.checkInBtn')}
                  </button>
                ) : !stats?.attendance?.checkOut ? (
                  <button
                    onClick={() => checkOutMutation.mutate()}
                    disabled={checkOutMutation.isPending}
                    className="flex-1 py-2.5 bg-red-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {checkOutMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    {t('profile.checkOutBtn')}
                  </button>
                ) : (
                  <div className="flex-1 py-2.5 bg-muted text-muted-foreground font-medium rounded-xl text-center text-sm">
                    {t('profile.workDayEnded')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Today's Stats Card */}
        <div className="bg-card rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            {t('profile.todayStats')}
          </h3>

          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                  <ShoppingBag className="h-4 w-4" />
                  <span className="text-xs font-medium">{t('profile.ordersCount')}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stats?.ordersCount || 0}</p>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">{t('profile.completedOrders')}</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stats?.completedOrdersCount || 0}</p>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3">
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs font-medium">{t('profile.totalSales')}</span>
                </div>
                <p className="text-lg font-bold text-foreground">{formatPrice(stats?.totalSales || 0)}</p>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-medium">{t('profile.averageOrder')}</span>
                </div>
                <p className="text-lg font-bold text-foreground">{formatPrice(stats?.averageOrderValue || 0)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
