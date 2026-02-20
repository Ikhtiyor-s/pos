import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Edit,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Users,
  ShoppingCart,
  Package,
  Armchair,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { tenantService } from '@/services/tenant.service';
import type { Tenant, CreateTenantDto, UpdateTenantDto, TenantStats } from '@/types/tenant';

export function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [stats, setStats] = useState<TenantStats | null>(null);
  const [formError, setFormError] = useState('');

  // Form state
  const [createForm, setCreateForm] = useState<CreateTenantDto>({
    name: '', slug: '', adminEmail: '', adminPassword: '', adminFirstName: '', adminLastName: '',
  });
  const [editForm, setEditForm] = useState<UpdateTenantDto>({});

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const query: Record<string, any> = { page, limit };
      if (search) query.search = search;
      if (statusFilter !== 'all') query.isActive = statusFilter === 'active';
      const result = await tenantService.getAll(query);
      setTenants(result.tenants);
      setTotal(result.meta.total);
      setTotalPages(result.meta.totalPages);
    } catch (err) {
      console.error('Tenantlar yuklashda xatolik:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  // Slug generator
  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  // Create
  const handleCreate = async () => {
    setFormError('');
    try {
      await tenantService.create(createForm);
      setIsCreateOpen(false);
      setCreateForm({ name: '', slug: '', adminEmail: '', adminPassword: '', adminFirstName: '', adminLastName: '' });
      fetchTenants();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Xatolik yuz berdi');
    }
  };

  // Update
  const handleUpdate = async () => {
    if (!selectedTenant) return;
    setFormError('');
    try {
      await tenantService.update(selectedTenant.id, editForm);
      setIsEditOpen(false);
      setSelectedTenant(null);
      fetchTenants();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Xatolik yuz berdi');
    }
  };

  // Toggle
  const handleToggle = async (tenant: Tenant) => {
    try {
      await tenantService.toggle(tenant.id);
      fetchTenants();
    } catch (err) {
      console.error('Toggle xatolik:', err);
    }
  };

  // Stats
  const handleStats = async (tenant: Tenant) => {
    try {
      const data = await tenantService.getStats(tenant.id);
      setStats(data);
      setSelectedTenant(tenant);
      setIsStatsOpen(true);
    } catch (err) {
      console.error('Statistika yuklashda xatolik:', err);
    }
  };

  // Edit open
  const openEdit = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setEditForm({
      name: tenant.name,
      slug: tenant.slug,
      domain: tenant.domain,
      phone: tenant.phone,
      email: tenant.email,
      address: tenant.address,
    });
    setFormError('');
    setIsEditOpen(true);
  };

  const activeTenants = tenants.filter(t => t.isActive).length;
  const inactiveTenants = tenants.filter(t => !t.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenantlar</h1>
          <p className="text-sm text-gray-500 mt-1">Restoranlarni boshqarish</p>
        </div>
        <button
          onClick={() => { setIsCreateOpen(true); setFormError(''); }}
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
        >
          <Plus size={18} />
          Yangi Tenant
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Building2 size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
              <p className="text-xs text-gray-500">Jami tenantlar</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
              <Eye size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{activeTenants}</p>
              <p className="text-xs text-gray-500">Faol</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
              <EyeOff size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{inactiveTenants}</p>
              <p className="text-xs text-gray-500">Nofaol</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Qidirish (nom, slug, email, telefon)..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-orange-500 focus:outline-none"
          />
        </div>
        <div className="flex rounded-lg border border-gray-200 bg-white">
          {(['all', 'active', 'inactive'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-4 py-2 text-sm font-medium transition-colors ${statusFilter === s ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-50'} ${s === 'all' ? 'rounded-l-lg' : s === 'inactive' ? 'rounded-r-lg' : ''}`}
            >
              {s === 'all' ? 'Barchasi' : s === 'active' ? 'Faol' : 'Nofaol'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">Yuklanmoqda...</div>
        ) : tenants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Building2 size={48} className="mb-3 opacity-50" />
            <p className="text-lg font-medium">Tenant topilmadi</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Restoran</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Slug</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Statistika</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Obuna</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Holat</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 font-bold text-orange-600 text-sm">
                        {tenant.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{tenant.name}</p>
                        <p className="text-xs text-gray-500">{tenant.email || tenant.phone || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">{tenant.slug}</code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Users size={14} />{tenant._count?.users || 0}</span>
                      <span className="flex items-center gap-1"><ShoppingCart size={14} />{tenant._count?.orders || 0}</span>
                      <span className="flex items-center gap-1"><Package size={14} />{tenant._count?.products || 0}</span>
                      <span className="flex items-center gap-1"><Armchair size={14} />{tenant._count?.tables || 0}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {tenant.subscription ? (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                        {tenant.subscription.plan.name}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Yo'q</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleToggle(tenant)}>
                      {tenant.isActive ? (
                        <ToggleRight size={28} className="text-green-500 hover:text-green-600 transition-colors" />
                      ) : (
                        <ToggleLeft size={28} className="text-gray-400 hover:text-gray-500 transition-colors" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleStats(tenant)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        title="Statistika"
                      >
                        <BarChart3 size={16} />
                      </button>
                      <button
                        onClick={() => openEdit(tenant)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                        title="Tahrirlash"
                      >
                        <Edit size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
            <p className="text-sm text-gray-500">Jami: {total} ta</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-600">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Yangi Tenant Yaratish</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{formError}</div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Restoran nomi *</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value, slug: generateSlug(e.target.value) })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                    placeholder="Oq Saroy"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                  <input
                    type="text"
                    value={createForm.slug}
                    onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                    placeholder="oq-saroy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input
                    type="text"
                    value={createForm.phone || ''}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                    placeholder="+998901234567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={createForm.email || ''}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                    placeholder="info@restoran.uz"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manzil</label>
                <input
                  type="text"
                  value={createForm.address || ''}
                  onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                  placeholder="Toshkent sh., Chilonzor t."
                />
              </div>

              <hr className="border-gray-100" />
              <p className="text-sm font-semibold text-gray-700">Admin foydalanuvchi</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ismi *</label>
                  <input
                    type="text"
                    value={createForm.adminFirstName}
                    onChange={(e) => setCreateForm({ ...createForm, adminFirstName: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                    placeholder="Ali"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Familiyasi *</label>
                  <input
                    type="text"
                    value={createForm.adminLastName}
                    onChange={(e) => setCreateForm({ ...createForm, adminLastName: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                    placeholder="Valiyev"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admin email *</label>
                  <input
                    type="email"
                    value={createForm.adminEmail}
                    onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                    placeholder="admin@restoran.uz"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admin parol *</label>
                  <input
                    type="password"
                    value={createForm.adminPassword}
                    onChange={(e) => setCreateForm({ ...createForm, adminPassword: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                    placeholder="Min 6 belgi"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleCreate}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
              >
                Yaratish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Tenantni Tahrirlash</h2>
              <button onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{formError}</div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Restoran nomi</label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input
                    type="text"
                    value={editForm.slug || ''}
                    onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input
                    type="text"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manzil</label>
                <input
                  type="text"
                  value={editForm.address || ''}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                <input
                  type="text"
                  value={editForm.domain || ''}
                  onChange={(e) => setEditForm({ ...editForm, domain: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                  placeholder="restoran.oshxona.uz"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsEditOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleUpdate}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {isStatsOpen && stats && selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedTenant.name}</h2>
                <p className="text-sm text-gray-500">Statistika</p>
              </div>
              <button onClick={() => setIsStatsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Foydalanuvchilar', value: stats.counts.users, icon: Users, color: 'blue' },
                { label: 'Buyurtmalar', value: stats.counts.orders, icon: ShoppingCart, color: 'green' },
                { label: 'Mahsulotlar', value: stats.counts.products, icon: Package, color: 'orange' },
                { label: 'Stollar', value: stats.counts.tables, icon: Armchair, color: 'purple' },
              ].map((item) => (
                <div key={item.label} className={`rounded-xl bg-${item.color}-50 p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <item.icon size={16} className={`text-${item.color}-600`} />
                    <span className="text-xs text-gray-500">{item.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                </div>
              ))}
            </div>

            {stats.subscription && (
              <div className="mt-4 rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-medium text-gray-700">Obuna</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-gray-600">{stats.subscription.plan.name}</span>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${stats.subscription.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {stats.subscription.status}
                  </span>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsStatsOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
