import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  UtensilsCrossed,
  FolderTree,
  ClipboardList,
  Armchair,
  Package,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Plus,
  Bell,
  Users,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';

// Menu items with icons
const menuItems = [
  {
    id: 'dashboard',
    path: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'products',
    path: '/products',
    label: 'Mahsulotlar',
    icon: UtensilsCrossed,
    count: 156,
  },
  {
    id: 'categories',
    path: '/categories',
    label: 'Kategoriyalar',
    icon: FolderTree,
  },
  {
    id: 'orders',
    path: '/orders',
    label: 'Buyurtmalar',
    icon: ClipboardList,
    badge: '12',
  },
  {
    id: 'tables',
    path: '/tables',
    label: 'Stollar',
    icon: Armchair,
  },
  {
    id: 'employees',
    path: '/employees',
    label: 'Xodimlar',
    icon: Users,
  },
  {
    id: 'inventory',
    path: '/inventory',
    label: 'Ombor',
    icon: Package,
  },
  {
    id: 'reports',
    path: '/reports',
    label: 'Hisobotlar',
    icon: BarChart3,
  },
  {
    id: 'settings',
    path: '/settings',
    label: 'Sozlamalar',
    icon: Settings,
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNewOrder: () => void;
}

export function Sidebar({ collapsed, onToggle, onNewOrder }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-[#1B2537] transition-all duration-300',
        collapsed ? 'w-[70px]' : 'w-[260px]'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo Area */}
        <div className="flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF5722] to-[#E91E63] shadow-lg">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-lg font-bold text-white">DreamsPOS</span>
                <span className="text-[10px] font-medium text-gray-500">Restaurant System</span>
              </div>
            )}
          </Link>
          <button
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-[#2A3547] hover:text-white"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Quick Action Button */}
        {!collapsed && (
          <div className="px-4 py-3">
            <button
              onClick={onNewOrder}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#FF5722] to-[#E91E63] px-4 py-3 font-medium text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110"
            >
              <Plus size={20} />
              <span>Yangi buyurtma</span>
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {!collapsed && (
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Asosiy menyu
            </p>
          )}

          <div className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const isHovered = hoveredItem === item.id;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-[#FF5722] to-[#E91E63] text-white shadow-lg'
                      : 'text-gray-400 hover:bg-[#2A3547] hover:text-white'
                  )}
                >
                  {/* Icon */}
                  <div className="flex h-8 w-8 items-center justify-center">
                    <Icon
                      size={20}
                      className={cn(
                        isActive ? 'text-white' : isHovered ? 'text-white' : 'text-gray-400'
                      )}
                    />
                  </div>

                  {/* Label */}
                  {!collapsed && (
                    <span className="flex-1 text-sm font-medium">{item.label}</span>
                  )}

                  {/* Badge */}
                  {!collapsed && item.badge && (
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-bold',
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[#FF5722]/20 text-[#FF5722]'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Tooltip for collapsed mode */}
                  {collapsed && (
                    <div className="absolute left-full ml-3 hidden rounded-lg bg-[#2A3547] px-3 py-2 text-sm text-white shadow-xl group-hover:block z-50">
                      <div className="font-medium">{item.label}</div>
                      <div className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 bg-[#2A3547]"></div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Notifications */}
        {!collapsed && (
          <div className="mx-3 mb-3 rounded-lg bg-[#2A3547] p-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FF5722]/20">
                  <Bell size={20} className="text-[#FF5722]" />
                </div>
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#E91E63] text-[10px] font-bold text-white">
                  3
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Bildirishnomalar</p>
                <p className="text-xs text-gray-500">3 ta yangi xabar</p>
              </div>
              <ChevronRight size={16} className="text-gray-500" />
            </div>
          </div>
        )}

        {/* User Profile */}
        <div className="border-t border-[#2A3547] p-3">
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg p-2 transition-all hover:bg-[#2A3547]',
              collapsed && 'justify-center'
            )}
          >
            {/* Avatar */}
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-[#FF5722] to-[#E91E63] font-bold text-white">
                {user?.firstName?.charAt(0)}
                {user?.lastName?.charAt(0)}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#1B2537] bg-green-500"></span>
            </div>

            {!collapsed && (
              <>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium text-white">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {user?.role === 'SUPER_ADMIN' && 'Super Admin'}
                    {user?.role === 'MANAGER' && 'Menejer'}
                    {user?.role === 'CASHIER' && 'Kassir'}
                    {user?.role === 'CHEF' && 'Oshpaz'}
                  </p>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-red-500/20 hover:text-red-500"
                  title="Chiqish"
                >
                  <LogOut size={18} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
