import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, UtensilsCrossed, FolderTree, ClipboardList,
  Armchair, Settings, LogOut, ChevronRight, ChevronLeft, Plus,
  Bell, Users, Send, CreditCard, Building2, GitBranch,
  Package, BarChart3, Warehouse, ChefHat, UserCheck, Receipt,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';

// ─── Rol nomlari ──────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  MANAGER:     'Menejer',
  CASHIER:     'Kassir',
  CHEF:        'Oshpaz',
  WAITER:      'Ofitsiant',
  WAREHOUSE:   'Ombor xodimi',
  ACCOUNTANT:  'Buxgalter',
};

// ─── Menyu bo'limlari ─────────────────────────────────────────────────────────
interface MenuItem {
  id: string;
  path: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  roles: string[]; // bo'sh = hamma rol ko'radi
}

const ALL_ROLES = ['SUPER_ADMIN', 'MANAGER', 'CASHIER', 'CHEF', 'WAITER', 'WAREHOUSE', 'ACCOUNTANT'];

const MENU_SECTIONS = [
  {
    title: 'Asosiy',
    items: [
      {
        id: 'dashboard', path: '/', label: 'Dashboard', icon: LayoutDashboard,
        roles: ALL_ROLES,
      },
    ] as MenuItem[],
  },
  {
    title: 'Boshqaruv',
    items: [
      {
        id: 'tenants', path: '/tenants', label: 'Tenantlar', icon: Building2,
        roles: ['SUPER_ADMIN'],
      },
      {
        id: 'branches', path: '/branches', label: 'Filliallar', icon: GitBranch,
        roles: ['SUPER_ADMIN', 'MANAGER'],
      },
      {
        id: 'employees', path: '/employees', label: 'Xodimlar', icon: UserCheck,
        roles: ['SUPER_ADMIN', 'MANAGER'],
      },
      {
        id: 'settings', path: '/settings', label: 'Sozlamalar', icon: Settings,
        roles: ['SUPER_ADMIN', 'MANAGER'],
      },
    ] as MenuItem[],
  },
  {
    title: 'Restoran',
    items: [
      {
        id: 'orders', path: '/orders', label: 'Buyurtmalar', icon: ClipboardList,
        roles: ['SUPER_ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'ACCOUNTANT'],
      },
      {
        id: 'tables', path: '/tables', label: 'Stollar', icon: Armchair,
        roles: ['SUPER_ADMIN', 'MANAGER', 'CASHIER', 'WAITER'],
      },
      {
        id: 'customers', path: '/customers', label: 'Mijozlar', icon: Users,
        roles: ['SUPER_ADMIN', 'MANAGER', 'CASHIER'],
      },
    ] as MenuItem[],
  },
  {
    title: 'Menyu & Mahsulotlar',
    items: [
      {
        id: 'products', path: '/products', label: 'Mahsulotlar', icon: UtensilsCrossed,
        roles: ['SUPER_ADMIN', 'MANAGER', 'WAREHOUSE'],
      },
      {
        id: 'categories', path: '/categories', label: 'Kategoriyalar', icon: FolderTree,
        roles: ['SUPER_ADMIN', 'MANAGER'],
      },
    ] as MenuItem[],
  },
  {
    title: 'Ombor',
    items: [
      {
        id: 'warehouse', path: '/warehouse', label: 'Ombor', icon: Warehouse,
        roles: ['SUPER_ADMIN', 'MANAGER', 'WAREHOUSE'],
      },
      {
        id: 'inventory', path: '/inventory', label: 'Inventar', icon: Package,
        roles: ['SUPER_ADMIN', 'MANAGER', 'WAREHOUSE'],
      },
    ] as MenuItem[],
  },
  {
    title: 'Moliya',
    items: [
      {
        id: 'billing', path: '/billing', label: 'Hisob-kitob', icon: CreditCard,
        roles: ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'],
      },
      {
        id: 'reports', path: '/reports', label: 'Hisobotlar', icon: BarChart3,
        roles: ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'],
      },
    ] as MenuItem[],
  },
  {
    title: 'Boshqa',
    items: [
      {
        id: 'notifications', path: '/notifications', label: 'Bildirishnomalar', icon: Bell,
        roles: ALL_ROLES,
      },
      {
        id: 'messages', path: '/messages', label: 'Xabarlar', icon: Send,
        roles: ['SUPER_ADMIN', 'MANAGER'],
      },
    ] as MenuItem[],
  },
];

// ─── Rol bo'yicha menyu filterlash ────────────────────────────────────────────
function getVisibleSections(role: string) {
  return MENU_SECTIONS
    .map(section => ({
      ...section,
      items: section.items.filter(item => item.roles.includes(role)),
    }))
    .filter(section => section.items.length > 0);
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNewOrder: () => void;
}

export function Sidebar({ collapsed, onToggle, onNewOrder }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const role = user?.role || 'CASHIER';
  const visibleSections = getVisibleSections(role);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <aside className={cn(
      'fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-300 shadow-sm',
      collapsed ? 'w-[70px]' : 'w-[260px]'
    )}>
      <div className="flex h-full flex-col">

        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-100">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 shadow-md">
              <UtensilsCrossed className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-lg font-bold text-gray-900">Oshxona POS</span>
                <span className="text-[10px] font-medium text-gray-400">{ROLE_LABELS[role] || role}</span>
              </div>
            )}
          </Link>
          {!collapsed && (
            <button onClick={onToggle} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
              <ChevronLeft size={18} />
            </button>
          )}
        </div>

        {collapsed && (
          <div className="flex justify-center py-2">
            <button onClick={onToggle} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Yangi buyurtma tugmasi (faqat buyurtma yarata oladigan rollar) */}
        {['SUPER_ADMIN', 'MANAGER', 'CASHIER', 'WAITER'].includes(role) && (
          !collapsed ? (
            <div className="px-4 py-3">
              <button onClick={onNewOrder} className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 font-medium text-white shadow-md hover:bg-orange-600 hover:shadow-lg transition-all">
                <Plus size={20} />
                <span>Yangi buyurtma</span>
              </button>
            </div>
          ) : (
            <div className="flex justify-center px-2 py-2">
              <button onClick={onNewOrder} className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500 text-white shadow-md hover:bg-orange-600 transition-all" title="Yangi buyurtma">
                <Plus size={20} />
              </button>
            </div>
          )
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {visibleSections.map(section => (
            <div key={section.title}>
              {!collapsed && (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                  const isHovered = hoveredItem === item.id;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onMouseEnter={() => setHoveredItem(item.id)}
                      onMouseLeave={() => setHoveredItem(null)}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200',
                        isActive ? 'bg-orange-50 text-orange-700 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-orange-500" />}

                      <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg transition-colors', isActive ? 'bg-orange-100' : isHovered ? 'bg-gray-100' : '')}>
                        <Icon size={20} className={cn(isActive ? 'text-orange-600' : 'text-gray-500')} />
                      </div>

                      {!collapsed && <span className="flex-1 text-sm">{item.label}</span>}

                      {!collapsed && item.badge && (
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', isActive ? 'bg-orange-200 text-orange-800' : 'bg-orange-100 text-orange-700')}>
                          {item.badge}
                        </span>
                      )}

                      {collapsed && (
                        <div className="absolute left-full ml-3 hidden rounded-lg bg-gray-800 px-3 py-2 text-sm text-white shadow-xl group-hover:block z-50">
                          <div className="font-medium">{item.label}</div>
                          <div className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 bg-gray-800" />
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile */}
        <div className="border-t border-gray-200 p-3">
          <div className={cn('flex items-center gap-3 rounded-lg p-2 transition-all hover:bg-gray-50', collapsed && 'justify-center')}>
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-orange-600 font-bold text-white text-sm shrink-0">
                {(user?.firstName?.charAt(0) || '') + (user?.lastName?.charAt(0) || '')}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
            </div>

            {!collapsed && (
              <>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="truncate text-xs text-gray-500">{ROLE_LABELS[role] || role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
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
