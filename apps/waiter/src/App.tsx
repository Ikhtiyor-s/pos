import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { UtensilsCrossed, ClipboardList, Bell, User } from 'lucide-react';
import TablesPage from './pages/TablesPage';
import MenuPage from './pages/MenuPage';
import OrdersPage from './pages/OrdersPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import { useThemeStore } from './store/theme';
import { useAuthStore } from './store/auth';
import { useTranslation } from './store/language';

const NAV_ITEMS = [
  { id: 'tables',        label: 'Stollar',         icon: UtensilsCrossed, path: '/tables' },
  { id: 'orders',        label: 'Buyurtmalar',      icon: ClipboardList,   path: '/orders' },
  { id: 'notifications', label: 'Bildirishnomalar', icon: Bell,            path: '/notifications' },
  { id: 'profile',       label: 'Profil',           icon: User,            path: '/profile' },
];

function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const activeId = NAV_ITEMS.find(n => pathname.startsWith(n.path))?.id ?? 'tables';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map(({ id, label, icon: Icon, path }) => {
          const active = activeId === id;
          return (
            <button
              key={id}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                active ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'
              }`}
              style={{ minHeight: '44px' }}
            >
              <Icon className="h-6 w-6" />
              <span className="text-[11px] mt-0.5 font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden pb-safe">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function BackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [showExitDialog, setShowExitDialog] = useState(false);

  useEffect(() => {
    const handler = CapApp.addListener('backButton', () => {
      const onHome = location.pathname === '/tables' || location.pathname === '/';
      if (onHome) {
        setShowExitDialog(true);
      } else {
        navigate('/tables', { replace: true });
      }
    });
    return () => { handler.then(h => h.remove()); };
  }, [location.pathname, navigate]);

  if (!showExitDialog) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6">
        <h3 className="text-lg font-bold text-foreground mb-2">{t('exit.title' as any)}</h3>
        <p className="text-muted-foreground mb-6">{t('exit.confirm' as any)}</p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowExitDialog(false)}
            className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-medium"
          >
            {t('cancel')}
          </button>
          <button
            onClick={() => CapApp.exitApp()}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium"
          >
            {t('exit.exit' as any)}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const initTheme = useThemeStore((s) => s.initTheme);
  useEffect(() => { initTheme(); }, [initTheme]);

  return (
    <div className="h-full w-full bg-background text-foreground transition-colors duration-300">
      <BackButtonHandler />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/tables" replace />} />
        <Route path="/tables" element={
          <ProtectedRoute>
            <MainLayout><TablesPage /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/menu/:tableId" element={
          <ProtectedRoute><MenuPage /></ProtectedRoute>
        } />
        <Route path="/orders" element={
          <ProtectedRoute>
            <MainLayout><OrdersPage /></MainLayout>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <MainLayout><ProfilePage /></MainLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  );
}
