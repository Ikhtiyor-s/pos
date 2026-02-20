import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, Loader2, RefreshCw, ClipboardList, Sun, Moon, Monitor, User } from 'lucide-react';
import { tableService, socketService } from '../services';
import { useThemeStore } from '../store/theme';
import { useTranslation } from '../store/language';
import type { Language } from '../utils/translations';
import type { Table } from '../services/table.service';

const languageFlags: Record<Language, string> = {
  uz: '🇺🇿',
  ru: '🇷🇺',
  en: '🇬🇧',
};

export default function TablesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useThemeStore();
  const { t, language, setLanguage } = useTranslation();

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const cycleLanguage = () => {
    const langs: Language[] = ['uz', 'ru', 'en'];
    const currentIndex = langs.indexOf(language);
    const nextIndex = (currentIndex + 1) % langs.length;
    setLanguage(langs[nextIndex]);
  };

  const getThemeIcon = () => {
    if (theme === 'system') return <Monitor className="h-5 w-5" />;
    if (theme === 'dark') return <Moon className="h-5 w-5" />;
    return <Sun className="h-5 w-5" />;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'FREE': return 'bg-green-500';
      case 'OCCUPIED': return 'bg-orange-500';
      case 'RESERVED': return 'bg-blue-500';
      case 'CLEANING': return 'bg-yellow-500';
      default: return 'bg-muted-foreground';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'FREE': return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case 'OCCUPIED': return 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800';
      case 'RESERVED': return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
      case 'CLEANING': return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
      default: return 'bg-muted border-border';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'FREE': return t('tables.free');
      case 'OCCUPIED': return t('tables.occupied');
      case 'RESERVED': return t('tables.reserved');
      case 'CLEANING': return t('tables.cleaning');
      default: return '';
    }
  };

  const freeCount = tables.filter((t: Table) => t.status === 'FREE').length;
  const occupiedCount = tables.filter((t: Table) => t.status === 'OCCUPIED').length;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-center">
          <p className="mb-4 text-red-500 text-sm">{t('error')}</p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Compact Header */}
      <div className="bg-primary px-4 py-3 text-primary-foreground safe-area-top">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{t('tables.title')}</h1>
            <p className="text-xs opacity-90">{t('tables.summary', { free: freeCount, occupied: occupiedCount })}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={cycleLanguage}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 active:bg-white/30 text-lg"
            >
              {languageFlags[language]}
            </button>
            <button
              onClick={cycleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 active:bg-white/30"
            >
              {getThemeIcon()}
            </button>
            <button
              onClick={() => navigate('/orders')}
              className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-medium active:bg-white/30"
            >
              <ClipboardList className="h-4 w-4" />
              {t('tables.orders')}
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 active:bg-white/30"
            >
              <User className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="flex gap-2 px-3 py-2 bg-card border-b border-border overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs font-medium whitespace-nowrap">{freeCount} {t('tables.free')}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-xs font-medium whitespace-nowrap">{occupiedCount} {t('tables.occupied')}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-xs font-medium whitespace-nowrap">{tables.filter((tbl: Table) => tbl.status === 'RESERVED').length} {t('tables.reserved')}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-muted-foreground" />
          <span className="text-xs font-medium whitespace-nowrap">{tables.filter((tbl: Table) => tbl.status === 'CLEANING').length} {t('tables.cleaning')}</span>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-3 gap-2">
          {tables.map((table: Table) => (
            <button
              key={table.id}
              onClick={() => navigate(`/menu/${table.id}`)}
              className={`relative rounded-xl p-3 border transition-transform active:scale-95 ${getStatusBg(table.status)}`}
            >
              {/* Table number */}
              <div className="text-2xl font-bold text-foreground mb-1">
                {table.number}
              </div>

              {/* Capacity */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <Users className="h-3 w-3" />
                <span>{table.capacity}</span>
              </div>

              {/* Status badge */}
              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${getStatusColor(table.status)}`}>
                {getStatusText(table.status)}
              </span>

              {/* Active order indicator */}
              {table.activeOrders && table.activeOrders.length > 0 && (
                <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {table.activeOrders.length}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Pull to refresh hint */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
        <button
          onClick={() => refetch()}
          className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-card shadow-lg px-4 py-2 text-sm text-muted-foreground border border-border"
        >
          <RefreshCw className="h-4 w-4" />
          {t('refresh')}
        </button>
      </div>
    </div>
  );
}
