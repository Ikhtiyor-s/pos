import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Package, ShoppingBag, Grid3X3, Users, BarChart3, Boxes, Settings as SettingsIcon,
  PanelLeftClose, PanelLeft, LogOut, Clock, AlertTriangle, Wifi,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../services/api';
import { Warehouse } from '../Warehouse';
import { IntegrationHub } from '../IntegrationHub';
import { LowStockAlert } from '../LowStockAlert';
import DashboardTab from '../admin/DashboardTab';
import ProductsTab from '../admin/ProductsTab';
import OrdersTab from '../admin/OrdersTab';
import TablesTab from '../admin/TablesTab';
import StaffTab from '../admin/StaffTab';
import ReportsTab from '../admin/ReportsTab';
import SettingsTab from '../admin/SettingsTab';
import type { DashboardData, ActiveOrderData, RecentOrder, AdminProduct, CategoryItem, TableData } from '../../types';
import { settingsService, type BusinessSettings } from '../../services/settings.service';
import { inventoryService, type LowStockItem } from '../../services/inventory.service';

type AdminTab = 'dashboard' | 'products' | 'orders' | 'tables' | 'staff' | 'reports' | 'inventory' | 'settings';

interface AdminDashboardProps {
  user: { name?: string; firstName?: string; role?: string } | null;
  bizSettings: BusinessSettings | null;
  categories: CategoryItem[];
  tables: TableData[];
  activeOrders: ActiveOrderData[];
  lowStockItems: LowStockItem[];
  activeIntegrations: number;
  onLogout: () => void;
  onRefreshData: () => void;
  onSettingsUpdate: (s: BusinessSettings) => void;
  lockElements: React.ReactNode;
}

const TABS: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Mahsulotlar', icon: Package },
  { id: 'orders', label: 'Buyurtmalar', icon: ShoppingBag },
  { id: 'tables', label: 'Stollar', icon: Grid3X3 },
  { id: 'staff', label: 'Xodimlar', icon: Users },
  { id: 'reports', label: 'Hisobotlar', icon: BarChart3 },
  { id: 'inventory', label: 'Ombor', icon: Boxes },
  { id: 'settings', label: 'Sozlamalar', icon: SettingsIcon },
];

export default function AdminDashboard({
  user, bizSettings, categories, tables, activeOrders, lowStockItems,
  activeIntegrations, onLogout, onRefreshData, onSettingsUpdate, lockElements,
}: AdminDashboardProps) {
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardPeriod, setDashboardPeriod] = useState<'today' | 'week' | 'month' | 'year'>('today');
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [adminProducts, setAdminProducts] = useState<AdminProduct[]>([]);
  const [allOrders, setAllOrders] = useState<RecentOrder[]>([]);
  const [showIntegrationHub, setShowIntegrationHub] = useState(false);
  const [showLowStock, setShowLowStock] = useState(false);

  const fetchDashboard = useCallback(async (period: 'today' | 'week' | 'month' | 'year') => {
    setDashboardLoading(true);
    try {
      const { data } = await api.get(`/dashboard?period=${period}`);
      setDashboardData(data.data || data);
    } catch { /* ignore */ }
    finally { setDashboardLoading(false); }
  }, []);

  const fetchAdminProducts = useCallback(async () => {
    try {
      const { data: response } = await api.get('/products', { params: { limit: 500 } });
      setAdminProducts(response.data?.data || response.data || []);
    } catch { /* ignore */ }
  }, []);

  const fetchAllOrders = useCallback(async () => {
    try {
      const { data: response } = await api.get('/orders', { params: { limit: 100 } });
      const orders = response.data?.data || response.data || [];
      setAllOrders(Array.isArray(orders) ? orders : []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (adminTab === 'dashboard') fetchDashboard(dashboardPeriod);
    else if (adminTab === 'products') fetchAdminProducts();
    else if (adminTab === 'orders') fetchAllOrders();
    else if (adminTab === 'reports') { fetchDashboard(dashboardPeriod); fetchAllOrders(); }
  }, [adminTab, dashboardPeriod, fetchDashboard, fetchAdminProducts, fetchAllOrders]);

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {lockElements}

      {/* Sidebar */}
      <aside className={cn(
        'flex flex-col border-r border-gray-200/60 bg-white/80 backdrop-blur transition-all duration-300 flex-shrink-0',
        sidebarCollapsed ? 'w-16' : 'w-56'
      )}>
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-gray-200/60 px-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-500 shadow-md flex-shrink-0">
            <LayoutDashboard className="h-4 w-4 text-white" />
          </div>
          {!sidebarCollapsed && <span className="font-bold text-gray-900 text-sm truncate">{bizSettings?.name || 'Admin'}</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {TABS.map((tab) => {
            const isActive = adminTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setAdminTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                  isActive ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}>
                <tab.icon size={18} className="flex-shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{tab.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-gray-200/60 p-2 space-y-1">
          {lowStockItems.length > 0 && (
            <button onClick={() => setShowLowStock(true)}
              className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-colors">
              <AlertTriangle size={14} />
              {!sidebarCollapsed && <span>Kam qolgan: {lowStockItems.length}</span>}
            </button>
          )}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-gray-500 hover:bg-gray-100 transition-colors">
            {sidebarCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
            {!sidebarCollapsed && <span>Yig'ish</span>}
          </button>
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {(user?.firstName || user?.name || '?')[0].toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <>
                <span className="text-xs font-medium text-gray-700 truncate flex-1">{user?.name || user?.firstName}</span>
                <button onClick={onLogout} className="text-gray-400 hover:text-red-500 transition-colors"><LogOut size={14} /></button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {adminTab === 'dashboard' && (
            <DashboardTab dashboardData={dashboardData} dashboardPeriod={dashboardPeriod} onPeriodChange={setDashboardPeriod} dashboardLoading={dashboardLoading} />
          )}
          {adminTab === 'products' && (
            <ProductsTab adminProducts={adminProducts} categories={categories} onRefreshProducts={fetchAdminProducts} onRefreshData={onRefreshData} />
          )}
          {adminTab === 'orders' && (
            <OrdersTab activeOrders={activeOrders} allOrders={allOrders} onRefresh={fetchAllOrders} />
          )}
          {adminTab === 'tables' && (
            <TablesTab tables={tables} activeOrders={activeOrders} onRefresh={onRefreshData} />
          )}
          {adminTab === 'staff' && <StaffTab />}
          {adminTab === 'reports' && (
            <ReportsTab dashboardData={dashboardData} allOrders={allOrders} dashboardPeriod={dashboardPeriod} dashboardLoading={dashboardLoading} onPeriodChange={setDashboardPeriod} />
          )}
          {adminTab === 'inventory' && <Warehouse />}
          {adminTab === 'settings' && (
            <SettingsTab bizSettings={bizSettings} onSettingsUpdate={onSettingsUpdate} activeIntegrations={activeIntegrations} onOpenIntegrationHub={() => setShowIntegrationHub(true)} />
          )}
        </div>
      </main>

      <IntegrationHub isOpen={showIntegrationHub} onClose={() => setShowIntegrationHub(false)} onStatusChange={onRefreshData} />
      <LowStockAlert isOpen={showLowStock} onClose={() => setShowLowStock(false)} items={lowStockItems} />
    </div>
  );
}
