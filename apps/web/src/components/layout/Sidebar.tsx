import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  UtensilsCrossed,
  FolderTree,
  ClipboardList,
  Armchair,
  Settings,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Plus,
  Bell,
  Users,
  Send,
  CreditCard,
  Building2,
  GitBranch,
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
    id: 'tenants',
    path: '/tenants',
    label: 'Tenantlar',
    icon: Building2,
    superAdminOnly: true,
  },
  {
    id: 'branches',
    path: '/branches',
    label: 'Filliallar',
    icon: GitBranch,
    managerOnly: true,
  },
  {
    id: 'products',
    path: '/products',
    label: 'Product',
    icon: UtensilsCrossed,
  },
  {
    id: 'orders',
    path: '/orders',
    label: 'Pending Order',
    icon: ClipboardList,
    badge: '12',
  },
  {
    id: 'categories',
    path: '/categories',
    label: 'Kategoriyalar',
    icon: FolderTree,
  },
  {
    id: 'tables',
    path: '/tables',
    label: 'Stollar',
    icon: Armchair,
  },
  {
    id: 'customers',
    path: '/customers',
    label: 'Customers',
    icon: Users,
  },
  {
    id: 'notifications',
    path: '/notifications',
    label: 'Notification',
    icon: Bell,
  },
  {
    id: 'messages',
    path: '/messages',
    label: 'Messages',
    icon: Send,
  },
  {
    id: 'billing',
    path: '/billing',
    label: 'Billing',
    icon: CreditCard,
  },
  {
    id: 'settings',
    path: '/settings',
    label: 'Setting',
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
        'fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-300 shadow-sm',
        collapsed ? 'w-[70px]' : 'w-[260px]'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo Area */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-100">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 shadow-md">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-lg font-bold text-gray-900">DreamsPOS</span>
                <span className="text-[10px] font-medium text-gray-400">Restaurant System</span>
              </div>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={onToggle}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        {/* Collapsed toggle */}
        {collapsed && (
          <div className="flex justify-center py-2">
            <button
              onClick={onToggle}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Quick Action Button */}
        {!collapsed && (
          <div className="px-4 py-3">
            <button
              onClick={onNewOrder}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 font-medium text-white shadow-md transition-all hover:bg-orange-600 hover:shadow-lg"
            >
              <Plus size={20} />
              <span>Yangi buyurtma</span>
            </button>
          </div>
        )}

        {collapsed && (
          <div className="flex justify-center px-2 py-2">
            <button
              onClick={onNewOrder}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500 text-white shadow-md transition-all hover:bg-orange-600"
              title="Yangi buyurtma"
            >
              <Plus size={20} />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {!collapsed && (
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Asosiy menyu
            </p>
          )}

          <div className="space-y-1">
            {menuItems.filter(item => {
              if (item.superAdminOnly) return user?.role === 'SUPER_ADMIN';
              if (item.managerOnly) return user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN';
              return true;
            }).map((item) => {
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
                      ? 'bg-orange-50 text-orange-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-orange-500" />
                  )}

                  {/* Icon */}
                  <div className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                    isActive ? 'bg-orange-100' : isHovered ? 'bg-gray-100' : ''
                  )}>
                    <Icon
                      size={20}
                      className={cn(
                        isActive ? 'text-orange-600' : 'text-gray-500'
                      )}
                    />
                  </div>

                  {/* Label */}
                  {!collapsed && (
                    <span className="flex-1 text-sm">{item.label}</span>
                  )}

                  {/* Badge */}
                  {!collapsed && item.badge && (
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-bold',
                        isActive
                          ? 'bg-orange-200 text-orange-800'
                          : 'bg-orange-100 text-orange-700'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Tooltip for collapsed mode */}
                  {collapsed && (
                    <div className="absolute left-full ml-3 hidden rounded-lg bg-gray-800 px-3 py-2 text-sm text-white shadow-xl group-hover:block z-50">
                      <div className="font-medium">{item.label}</div>
                      <div className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 bg-gray-800"></div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Notifications */}
        {!collapsed && (
          <div className="mx-3 mb-3 rounded-lg bg-orange-50 border border-orange-100 p-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                  <Bell size={20} className="text-orange-600" />
                </div>
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  3
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Bildirishnomalar</p>
                <p className="text-xs text-gray-500">3 ta yangi xabar</p>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </div>
          </div>
        )}

        {/* User Profile */}
        <div className="border-t border-gray-200 p-3">
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg p-2 transition-all hover:bg-gray-50',
              collapsed && 'justify-center'
            )}
          >
            {/* Avatar */}
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-orange-600 font-bold text-white text-sm">
                {user?.firstName?.charAt(0)}
                {user?.lastName?.charAt(0)}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500"></span>
            </div>

            {!collapsed && (
              <>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium text-gray-900">
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
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-all hover:bg-red-50 hover:text-red-500"
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
