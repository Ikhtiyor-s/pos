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
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';

// Menu items with icons, colors and descriptions
const menuItems = [
  {
    id: 'dashboard',
    path: '/',
    label: 'Dashboard',
    description: 'Umumiy statistika',
    icon: LayoutDashboard,
    color: '#6366f1', // indigo
  },
  {
    id: 'products',
    path: '/products',
    label: 'Mahsulotlar',
    description: 'Taomlar va ichimliklar',
    icon: UtensilsCrossed,
    color: '#22c55e', // green
    count: 156,
  },
  {
    id: 'categories',
    path: '/categories',
    label: 'Kategoriyalar',
    description: 'Mahsulot guruhlari',
    icon: FolderTree,
    color: '#3b82f6', // blue
    count: 24,
  },
  {
    id: 'orders',
    path: '/orders',
    label: 'Buyurtmalar',
    description: "Ko'rish va boshqarish",
    icon: ClipboardList,
    color: '#f59e0b', // amber
    badge: '12+',
  },
  {
    id: 'tables',
    path: '/tables',
    label: 'Stollar',
    description: 'Joylashtirish va holat',
    icon: Armchair,
    color: '#a855f7', // purple
    status: { free: 6, occupied: 4 },
  },
  {
    id: 'inventory',
    path: '/inventory',
    label: 'Ombor',
    description: 'Xomashyolar boshqaruvi',
    icon: Package,
    color: '#06b6d4', // cyan
  },
  {
    id: 'reports',
    path: '/reports',
    label: 'Hisobotlar',
    description: 'Statistika va tahlil',
    icon: BarChart3,
    color: '#ec4899', // pink
  },
  {
    id: 'settings',
    path: '/settings',
    label: 'Sozlamalar',
    description: 'Tizim sozlamalari',
    icon: Settings,
    color: '#64748b', // slate
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
        'fixed left-0 top-0 z-40 h-screen border-r border-slate-800 bg-slate-900 transition-all duration-300',
        collapsed ? 'w-20' : 'w-72'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo Area */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/20">
              <span className="text-xl">🍽️</span>
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-lg font-bold text-white">Oshxona</span>
                <span className="text-[10px] font-medium text-slate-500">POS TIZIMI v2.1</span>
              </div>
            )}
          </Link>
          <button
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Quick Action Button */}
        {!collapsed && (
          <div className="p-4">
            <button
              onClick={onNewOrder}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 font-medium text-white shadow-lg shadow-orange-500/20 transition-all hover:shadow-orange-500/30 hover:brightness-110"
            >
              <Plus size={20} />
              <span>Yangi buyurtma</span>
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {!collapsed && (
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Asosiy menyu
            </p>
          )}

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
                  'group relative flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200',
                  isActive
                    ? 'bg-slate-800/80 text-white'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                )}
                style={{
                  borderLeft: isActive ? `3px solid ${item.color}` : '3px solid transparent',
                }}
              >
                {/* Icon with color */}
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg transition-all',
                    isActive || isHovered ? 'scale-110' : ''
                  )}
                  style={{
                    backgroundColor: isActive ? `${item.color}20` : 'transparent',
                  }}
                >
                  <Icon
                    size={20}
                    style={{ color: isActive || isHovered ? item.color : undefined }}
                    className={cn(!isActive && !isHovered && 'text-slate-500')}
                  />
                </div>

                {/* Label and Description */}
                {!collapsed && (
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-[11px] text-slate-500">{item.description}</span>
                  </div>
                )}

                {/* Badge or Count */}
                {!collapsed && item.badge && (
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-bold"
                    style={{
                      backgroundColor: `${item.color}20`,
                      color: item.color,
                    }}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Status indicator for tables */}
                {!collapsed && item.status && (
                  <div className="flex items-center gap-1">
                    <span className="flex items-center gap-1 text-xs">
                      <span className="h-2 w-2 rounded-full bg-green-500"></span>
                      <span className="text-green-500">{item.status.free}</span>
                    </span>
                    <span className="text-slate-600">/</span>
                    <span className="flex items-center gap-1 text-xs">
                      <span className="h-2 w-2 rounded-full bg-red-500"></span>
                      <span className="text-red-500">{item.status.occupied}</span>
                    </span>
                  </div>
                )}

                {/* Active indicator */}
                {isActive && (
                  <div
                    className="absolute right-2 h-2 w-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                )}

                {/* Tooltip for collapsed mode */}
                {collapsed && (
                  <div className="absolute left-full ml-2 hidden rounded-lg bg-slate-800 px-3 py-2 text-sm text-white shadow-xl group-hover:block">
                    <div className="font-medium">{item.label}</div>
                    <div className="text-xs text-slate-400">{item.description}</div>
                    {/* Arrow */}
                    <div className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 bg-slate-800"></div>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Notifications */}
        {!collapsed && (
          <div className="mx-3 mb-3 rounded-xl bg-slate-800/50 p-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell size={20} className="text-slate-400" />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  3
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Bildirishnomalar</p>
                <p className="text-xs text-slate-500">3 ta yangi xabar</p>
              </div>
              <ChevronRight size={16} className="text-slate-500" />
            </div>
          </div>
        )}

        {/* User Profile */}
        <div className="border-t border-slate-800 p-3">
          <div
            className={cn(
              'flex items-center gap-3 rounded-xl bg-slate-800/50 p-3 transition-all hover:bg-slate-800',
              collapsed && 'justify-center p-2'
            )}
          >
            {/* Avatar */}
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-white shadow-lg">
                {user?.firstName?.charAt(0)}
                {user?.lastName?.charAt(0)}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 bg-green-500"></span>
            </div>

            {!collapsed && (
              <>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium text-white">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {user?.role === 'SUPER_ADMIN' && 'Super Admin'}
                    {user?.role === 'MANAGER' && 'Menejer'}
                    {user?.role === 'CASHIER' && 'Kassir'}
                    {user?.role === 'CHEF' && 'Oshpaz'}
                  </p>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-500"
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
