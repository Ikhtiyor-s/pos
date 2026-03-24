import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Loader2, RefreshCw, ClipboardList, Bell, User, UtensilsCrossed, Clock, ShoppingBag } from 'lucide-react';
import { tableService, socketService } from '../services';
import { useAuthStore } from '../store/auth';
import { useTranslation } from '../store/language';
import type { Table } from '../services/table.service';

export default function TablesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  };

  // Fetch tables from API
  const { data: tablesData, isLoading, error, refetch } = useQuery({
    queryKey: ['tables'],
    queryFn: () => tableService.getAll(),
  });

  // Connect to Socket.IO for real-time updates
  useEffect(() => {
    socketService.connect();

    const unsubscribe = socketService.onTableStatusUpdate(() => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  const tables = tablesData?.data || [];

  // Pull-to-refresh handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const distance = e.touches[0].clientY - touchStart;
    if (distance > 0 && distance < 150) {
      setPullDistance(distance);
    }
  }, [touchStart]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 80) {
      setIsRefreshing(true);
      await refetch();
      setIsRefreshing(false);
    }
    setPullDistance(0);
    setTouchStart(0);
  }, [pullDistance, refetch]);

  const getStatusCardStyle = (status: string) => {
    switch (status) {
      case 'FREE': return 'bg-emerald-500 border-emerald-400 shadow-emerald-500/20';
      case 'OCCUPIED': return 'bg-red-500 border-red-400 shadow-red-500/20';
      case 'RESERVED': return 'bg-amber-500 border-amber-400 shadow-amber-500/20';
      case 'CLEANING': return 'bg-yellow-400 border-yellow-300 shadow-yellow-400/20';
      default: return 'bg-gray-400 border-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'FREE': return 'Bo\'sh';
      case 'OCCUPIED': return 'Band';
      case 'RESERVED': return 'Bron';
      case 'CLEANING': return 'Tozalanmoqda';
      default: return '';
    }
  };

  const handleTableTap = (table: Table) => {
    if (table.status === 'FREE') {
      navigate(`/menu/${table.id}`);
    } else if (table.status === 'OCCUPIED') {
      navigate(`/menu/${table.id}`);
    } else {
      navigate(`/menu/${table.id}`);
    }
  };

  const freeCount = tables.filter((t: Table) => t.status === 'FREE').length;
  const occupiedCount = tables.filter((t: Table) => t.status === 'OCCUPIED').length;

  // Bottom nav items
  const navItems = [
    { id: 'tables', label: 'Stollar', icon: UtensilsCrossed, path: '/tables' },
    { id: 'orders', label: 'Buyurtmalar', icon: ClipboardList, path: '/orders' },
    { id: 'notifications', label: 'Bildirishnomalar', icon: Bell, path: '/notifications' },
    { id: 'profile', label: 'Profil', icon: User, path: '/profile' },
  ];

  const activeTab = location.pathname.includes('/orders') ? 'orders' :
    location.pathname.includes('/notifications') ? 'notifications' :
    location.pathname.includes('/profile') ? 'profile' : 'tables';

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-orange-500" />
          <p className="mt-3 text-base text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-background px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <RefreshCw className="h-8 w-8 text-red-500" />
          </div>
          <p className="mb-2 text-lg font-semibold text-foreground">Xatolik yuz berdi</p>
          <p className="mb-6 text-sm text-muted-foreground">{t('error')}</p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-base font-medium text-white active:bg-orange-600"
            style={{ minHeight: '44px' }}
          >
            <RefreshCw className="h-5 w-5" />
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header - Dark with clock and user */}
      <div className="bg-gray-900 px-4 pt-3 pb-4 safe-area-top">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Ofitsiant</p>
            <h1 className="text-lg font-bold text-white">{user?.firstName || 'Ofitsiant'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-xl bg-gray-800 px-3 py-2">
              <Clock className="h-4 w-4 text-orange-400" />
              <span className="text-sm font-medium text-white tabular-nums">{formatTime(currentTime)}</span>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mt-3 flex gap-2">
          <div className="flex-1 rounded-xl bg-emerald-500/20 px-3 py-2 text-center">
            <span className="text-lg font-bold text-emerald-400">{freeCount}</span>
            <p className="text-[11px] text-emerald-300/80">Bo'sh</p>
          </div>
          <div className="flex-1 rounded-xl bg-red-500/20 px-3 py-2 text-center">
            <span className="text-lg font-bold text-red-400">{occupiedCount}</span>
            <p className="text-[11px] text-red-300/80">Band</p>
          </div>
          <div className="flex-1 rounded-xl bg-amber-500/20 px-3 py-2 text-center">
            <span className="text-lg font-bold text-amber-400">{tables.filter((tbl: Table) => tbl.status === 'RESERVED').length}</span>
            <p className="text-[11px] text-amber-300/80">Bron</p>
          </div>
          <div className="flex-1 rounded-xl bg-gray-500/20 px-3 py-2 text-center">
            <span className="text-lg font-bold text-gray-400">{tables.length}</span>
            <p className="text-[11px] text-gray-400/80">Jami</p>
          </div>
        </div>
      </div>

      {/* Pull-to-refresh indicator */}
      {pullDistance > 0 && (
        <div
          className="flex items-center justify-center bg-gray-100 dark:bg-gray-900 transition-all overflow-hidden"
          style={{ height: `${Math.min(pullDistance, 80)}px` }}
        >
          <RefreshCw className={`h-5 w-5 text-orange-500 ${pullDistance > 80 ? 'animate-spin' : ''}`} />
          <span className="ml-2 text-sm text-muted-foreground">
            {pullDistance > 80 ? 'Qo\'yib yuboring...' : 'Yangilash uchun torting...'}
          </span>
        </div>
      )}

      {isRefreshing && (
        <div className="flex items-center justify-center bg-orange-50 dark:bg-orange-950/30 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-orange-500 mr-2" />
          <span className="text-sm text-orange-600 dark:text-orange-400">Yangilanmoqda...</span>
        </div>
      )}

      {/* Tables Grid - 2 columns for phone */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-4 pb-24"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="grid grid-cols-2 gap-3">
          {tables.map((table: Table) => (
            <button
              key={table.id}
              onClick={() => handleTableTap(table)}
              className={`relative rounded-2xl p-4 border shadow-lg transition-transform active:scale-95 text-white ${getStatusCardStyle(table.status)}`}
              style={{ minHeight: '120px' }}
            >
              {/* Table number - big */}
              <div className="text-4xl font-extrabold text-white/95 mb-1">
                {table.number}
              </div>

              {/* Capacity */}
              <div className="flex items-center gap-1.5 mb-2">
                <Users className="h-4 w-4 text-white/70" />
                <span className="text-sm text-white/70">{table.capacity} kishi</span>
              </div>

              {/* Status text */}
              <span className="inline-block rounded-lg bg-white/20 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                {getStatusText(table.status)}
              </span>

              {/* Active order indicator */}
              {table.activeOrders && table.activeOrders.length > 0 && (
                <div className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm font-bold text-red-500 shadow-md">
                  {table.activeOrders.length}
                </div>
              )}

              {/* Occupied: show Qo'shimcha hint */}
              {table.status === 'OCCUPIED' && (
                <div className="absolute bottom-3 right-3 text-[11px] text-white/60 font-medium">
                  Qo'shimcha +
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Floating "Olib ketish" button */}
      <div className="fixed bottom-20 right-4 z-40">
        <button
          onClick={() => navigate('/menu/takeaway')}
          className="flex items-center gap-2 rounded-full bg-orange-500 px-5 py-3.5 text-white font-semibold shadow-lg shadow-orange-500/30 active:bg-orange-600 active:scale-95 transition-all"
          style={{ minHeight: '48px' }}
        >
          <ShoppingBag className="h-5 w-5" />
          <span className="text-sm">Olib ketish</span>
        </button>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-bottom" style={{ height: '64px' }}>
        <div className="flex items-center justify-around h-full px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                  isActive ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'
                }`}
                style={{ minHeight: '44px' }}
              >
                <Icon className={`h-6 w-6 ${isActive ? 'text-orange-500' : ''}`} />
                <span className={`text-[11px] mt-0.5 font-medium ${isActive ? 'text-orange-500' : ''}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
