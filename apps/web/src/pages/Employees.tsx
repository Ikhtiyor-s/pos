import { useState } from 'react';
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  X,
  Phone,
  Mail,
  Shield,
  UserCheck,
  UserX,
  Eye,
  EyeOff,
  Users,
  ChefHat,
  Wallet,
  Crown,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type EmployeeRole = 'CASHIER' | 'WAITER' | 'CHEF' | 'MANAGER' | 'SUPER_ADMIN';
type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  role: EmployeeRole;
  status: EmployeeStatus;
  pin?: string;
  createdAt: string;
  lastActiveAt?: string;
  shiftsToday?: number;
  ordersToday?: number;
}

interface EmployeeFormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: EmployeeRole;
  pin: string;
  password: string;
}

// Mock data
const mockEmployees: Employee[] = [
  {
    id: '1',
    firstName: 'Sardor',
    lastName: 'Kassirov',
    phone: '+998 90 111 22 33',
    email: 'sardor@oshxona.uz',
    role: 'CASHIER',
    status: 'ACTIVE',
    pin: '1234',
    createdAt: '2025-01-15',
    lastActiveAt: '2026-02-14T10:30:00',
    shiftsToday: 1,
    ordersToday: 23,
  },
  {
    id: '2',
    firstName: 'Jasur',
    lastName: 'Ofitsiantov',
    phone: '+998 91 222 33 44',
    email: 'jasur@oshxona.uz',
    role: 'WAITER',
    status: 'ACTIVE',
    pin: '5678',
    createdAt: '2025-02-20',
    lastActiveAt: '2026-02-14T11:15:00',
    shiftsToday: 1,
    ordersToday: 15,
  },
  {
    id: '3',
    firstName: 'Dilshod',
    lastName: 'Oshpazov',
    phone: '+998 93 333 44 55',
    email: 'dilshod@oshxona.uz',
    role: 'CHEF',
    status: 'ACTIVE',
    pin: '9012',
    createdAt: '2025-03-10',
    lastActiveAt: '2026-02-14T09:00:00',
    shiftsToday: 1,
    ordersToday: 47,
  },
  {
    id: '4',
    firstName: 'Aziza',
    lastName: 'Kassirova',
    phone: '+998 94 444 55 66',
    role: 'CASHIER',
    status: 'INACTIVE',
    createdAt: '2025-06-01',
    lastActiveAt: '2026-01-20T18:00:00',
  },
  {
    id: '5',
    firstName: 'Bobur',
    lastName: 'Ofitsiantov',
    phone: '+998 95 555 66 77',
    role: 'WAITER',
    status: 'BLOCKED',
    createdAt: '2025-04-15',
    lastActiveAt: '2025-12-10T16:30:00',
  },
  {
    id: '6',
    firstName: 'Nodir',
    lastName: 'Menejerov',
    phone: '+998 97 777 88 99',
    email: 'nodir@oshxona.uz',
    role: 'MANAGER',
    status: 'ACTIVE',
    pin: '0000',
    createdAt: '2025-01-01',
    lastActiveAt: '2026-02-14T08:00:00',
    shiftsToday: 1,
  },
];

const roleConfig: Record<EmployeeRole, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  CASHIER: { label: 'Kassir', color: 'text-green-700', bgColor: 'bg-green-100', icon: Wallet },
  WAITER: { label: 'Ofitsiant', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Users },
  CHEF: { label: 'Oshpaz', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: ChefHat },
  MANAGER: { label: 'Menejer', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Shield },
  SUPER_ADMIN: { label: 'Admin', color: 'text-red-700', bgColor: 'bg-red-100', icon: Crown },
};

const statusConfig: Record<EmployeeStatus, { label: string; color: string; bgColor: string }> = {
  ACTIVE: { label: 'Faol', color: 'text-green-700', bgColor: 'bg-green-100' },
  INACTIVE: { label: 'Nofaol', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  BLOCKED: { label: 'Bloklangan', color: 'text-red-700', bgColor: 'bg-red-100' },
};

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<EmployeeRole | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | 'ALL'>('ALL');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form state
  const [formData, setFormData] = useState<EmployeeFormData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    role: 'WAITER',
    pin: '',
    password: '',
  });

  // Filtrlangan xodimlar
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.phone.includes(searchQuery);
    const matchesRole = roleFilter === 'ALL' || emp.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || emp.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Statistika
  const stats = {
    total: employees.length,
    active: employees.filter((e) => e.status === 'ACTIVE').length,
    inactive: employees.filter((e) => e.status === 'INACTIVE').length,
    blocked: employees.filter((e) => e.status === 'BLOCKED').length,
  };

  // Handlers
  const handleAddEmployee = () => {
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      role: 'WAITER',
      pin: '',
      password: '',
    });
    setIsAddModalOpen(true);
  };

  const handleSaveNewEmployee = () => {
    if (!formData.firstName || !formData.lastName || !formData.phone) return;

    const newEmployee: Employee = {
      id: String(Date.now()),
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      email: formData.email || undefined,
      role: formData.role,
      status: 'ACTIVE',
      pin: formData.pin || undefined,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setEmployees((prev) => [...prev, newEmployee]);
    setIsAddModalOpen(false);
  };

  const handleEditEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFormData({
      firstName: emp.firstName,
      lastName: emp.lastName,
      phone: emp.phone,
      email: emp.email || '',
      role: emp.role,
      pin: emp.pin || '',
      password: '',
    });
    setIsEditModalOpen(true);
    setActiveDropdown(null);
  };

  const handleSaveEditEmployee = () => {
    if (!selectedEmployee) return;

    setEmployees((prev) =>
      prev.map((e) =>
        e.id === selectedEmployee.id
          ? {
              ...e,
              firstName: formData.firstName,
              lastName: formData.lastName,
              phone: formData.phone,
              email: formData.email || undefined,
              role: formData.role,
              pin: formData.pin || undefined,
            }
          : e
      )
    );
    setIsEditModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleDeleteEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsDeleteModalOpen(true);
    setActiveDropdown(null);
  };

  const handleConfirmDelete = () => {
    if (!selectedEmployee) return;
    setEmployees((prev) => prev.filter((e) => e.id !== selectedEmployee.id));
    setIsDeleteModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleToggleStatus = (empId: string, newStatus: EmployeeStatus) => {
    setEmployees((prev) =>
      prev.map((e) => (e.id === empId ? { ...e, status: newStatus } : e))
    );
    setActiveDropdown(null);
  };

  const handleViewEmployee = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsViewModalOpen(true);
    setActiveDropdown(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Xodimlar</h1>
          <p className="text-sm text-gray-500">Restoran xodimlarini boshqarish</p>
        </div>
        <button
          onClick={handleAddEmployee}
          className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#FF5722] to-[#E91E63] px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110"
        >
          <Plus size={18} />
          <span>Yangi xodim</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <Users className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              <p className="text-xs text-gray-500">Jami xodimlar</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              <p className="text-xs text-gray-500">Faol</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <Clock className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
              <p className="text-xs text-gray-500">Nofaol</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <UserX className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.blocked}</p>
              <p className="text-xs text-gray-500">Bloklangan</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Xodim qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-700 placeholder-gray-400 focus:border-[#FF5722] focus:outline-none focus:ring-1 focus:ring-[#FF5722]"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1">
            {(['ALL', 'WAITER', 'CASHIER', 'CHEF', 'MANAGER'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  roleFilter === role
                    ? 'bg-gradient-to-r from-[#FF5722] to-[#E91E63] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {role === 'ALL' ? 'Barchasi' : roleConfig[role].label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-1">
          {(['ALL', 'ACTIVE', 'INACTIVE', 'BLOCKED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                statusFilter === status
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {status === 'ALL' ? 'Barchasi' : statusConfig[status].label}
            </button>
          ))}
        </div>
      </div>

      {/* Employees Table */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Xodim</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Telefon</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rol</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Holat</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">So'nggi faollik</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Bugun</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredEmployees.map((emp) => {
              const role = roleConfig[emp.role];
              const status = statusConfig[emp.status];
              const RoleIcon = role.icon;

              return (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-[#FF5722] to-[#E91E63] font-bold text-white text-sm">
                          {emp.firstName.charAt(0)}
                          {emp.lastName.charAt(0)}
                        </div>
                        {emp.status === 'ACTIVE' && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">
                          {emp.firstName} {emp.lastName}
                        </p>
                        {emp.email && (
                          <p className="text-xs text-gray-500">{emp.email}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-gray-700">{emp.phone}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                        role.bgColor,
                        role.color
                      )}
                    >
                      <RoleIcon size={12} />
                      {role.label}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                        status.bgColor,
                        status.color
                      )}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {emp.lastActiveAt ? (
                      <span className="text-sm text-gray-500">
                        {new Date(emp.lastActiveAt).toLocaleDateString('uz-UZ', {
                          day: 'numeric',
                          month: 'short',
                        })}{' '}
                        {new Date(emp.lastActiveAt).toLocaleTimeString('uz-UZ', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {emp.ordersToday !== undefined ? (
                      <span className="text-sm font-medium text-gray-700">
                        {emp.ordersToday} buyurtma
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() =>
                          setActiveDropdown(activeDropdown === emp.id ? null : emp.id)
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {activeDropdown === emp.id && (
                        <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg bg-white py-1 shadow-lg border border-gray-100">
                          <button
                            onClick={() => handleViewEmployee(emp)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Eye size={14} />
                            Ko'rish
                          </button>
                          <button
                            onClick={() => handleEditEmployee(emp)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit size={14} />
                            Tahrirlash
                          </button>
                          <hr className="my-1" />
                          {emp.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleToggleStatus(emp.id, 'INACTIVE')}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                            >
                              <UserX size={14} />
                              Nofaol qilish
                            </button>
                          )}
                          {emp.status === 'INACTIVE' && (
                            <button
                              onClick={() => handleToggleStatus(emp.id, 'ACTIVE')}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50"
                            >
                              <UserCheck size={14} />
                              Faollashtirish
                            </button>
                          )}
                          {emp.status !== 'BLOCKED' && (
                            <button
                              onClick={() => handleToggleStatus(emp.id, 'BLOCKED')}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:bg-orange-50"
                            >
                              <Shield size={14} />
                              Bloklash
                            </button>
                          )}
                          {emp.status === 'BLOCKED' && (
                            <button
                              onClick={() => handleToggleStatus(emp.id, 'ACTIVE')}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50"
                            >
                              <UserCheck size={14} />
                              Blokdan chiqarish
                            </button>
                          )}
                          <hr className="my-1" />
                          <button
                            onClick={() => handleDeleteEmployee(emp)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                            O'chirish
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {filteredEmployees.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl bg-white py-16 shadow-sm border border-gray-100">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-1">Xodimlar topilmadi</h3>
          <p className="text-sm text-gray-500">Qidiruv yoki filtrlaringizga mos xodim yo'q</p>
        </div>
      )}

      {/* Click outside to close */}
      {activeDropdown && (
        <div className="fixed inset-0 z-0" onClick={() => setActiveDropdown(null)} />
      )}

      {/* Add/Edit Employee Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                {isAddModalOpen ? 'Yangi xodim qo\'shish' : 'Xodimni tahrirlash'}
              </h2>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                  setSelectedEmployee(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ism *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Ism"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Familiya *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Familiya"
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon raqami *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+998 90 123 45 67"
                    className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@oshxona.uz"
                    className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as EmployeeRole })}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                >
                  <option value="WAITER">Ofitsiant</option>
                  <option value="CASHIER">Kassir</option>
                  <option value="CHEF">Oshpaz</option>
                  <option value="MANAGER">Menejer</option>
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PIN kod (4 raqam)</label>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      value={formData.pin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setFormData({ ...formData, pin: val });
                      }}
                      placeholder="••••"
                      maxLength={4}
                      className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parol</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                  setSelectedEmployee(null);
                }}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-gray-700 hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={isAddModalOpen ? handleSaveNewEmployee : handleSaveEditEmployee}
                disabled={!formData.firstName || !formData.lastName || !formData.phone}
                className="flex-1 rounded-lg bg-gradient-to-r from-[#FF5722] to-[#E91E63] px-4 py-2.5 text-white hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Employee Modal */}
      {isViewModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Xodim ma'lumotlari</h2>
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedEmployee(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="text-center mb-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-[#FF5722] to-[#E91E63] text-2xl font-bold text-white mb-3">
                {selectedEmployee.firstName.charAt(0)}
                {selectedEmployee.lastName.charAt(0)}
              </div>
              <h3 className="text-lg font-bold text-gray-800">
                {selectedEmployee.firstName} {selectedEmployee.lastName}
              </h3>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium mt-2',
                  roleConfig[selectedEmployee.role].bgColor,
                  roleConfig[selectedEmployee.role].color
                )}
              >
                {roleConfig[selectedEmployee.role].label}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Telefon</span>
                <span className="text-sm font-medium text-gray-800">{selectedEmployee.phone}</span>
              </div>
              {selectedEmployee.email && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Email</span>
                  <span className="text-sm font-medium text-gray-800">{selectedEmployee.email}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Holat</span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                    statusConfig[selectedEmployee.status].bgColor,
                    statusConfig[selectedEmployee.status].color
                  )}
                >
                  {statusConfig[selectedEmployee.status].label}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Qo'shilgan</span>
                <span className="text-sm font-medium text-gray-800">{selectedEmployee.createdAt}</span>
              </div>
              {selectedEmployee.ordersToday !== undefined && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Bugungi buyurtmalar</span>
                  <span className="text-sm font-bold text-gray-800">{selectedEmployee.ordersToday} ta</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleEditEmployee(selectedEmployee);
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-gray-700 hover:bg-gray-50"
              >
                <Edit size={16} />
                Tahrirlash
              </button>
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedEmployee(null);
                }}
                className="flex-1 rounded-lg bg-gradient-to-r from-[#FF5722] to-[#E91E63] px-4 py-2.5 text-white hover:brightness-110"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mb-4">
                <Trash2 className="h-7 w-7 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Xodimni o'chirish</h2>
              <p className="text-gray-500 mb-6">
                <span className="font-semibold">
                  {selectedEmployee.firstName} {selectedEmployee.lastName}
                </span>{' '}
                ni o'chirishni tasdiqlaysizmi?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedEmployee(null);
                }}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-gray-700 hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-white hover:bg-red-600"
              >
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
