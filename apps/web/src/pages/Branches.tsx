import { useState, useEffect, useCallback } from 'react';
import {
  GitBranch,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  Edit,
  ChevronLeft,
  ChevronRight,
  Users,
  ShoppingCart,
  Package,
  Armchair,
  X,
  Eye,
  EyeOff,
  MapPin,
  Phone,
} from 'lucide-react';
import { branchService } from '@/services/branch.service';
import type { Branch, CreateBranchDto, UpdateBranchDto } from '@/types/branch';

export function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
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
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState<CreateBranchDto>({
    name: '', slug: '', managerEmail: '', managerPassword: '', managerFirstName: '', managerLastName: '',
  });
  const [editForm, setEditForm] = useState<UpdateBranchDto>({});

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const query: Record<string, any> = { page, limit };
      if (search) query.search = search;
      if (statusFilter !== 'all') query.isActive = statusFilter === 'active';
      const result = await branchService.getAll(query);
      setBranches(result.branches);
      setTotal(result.meta.total);
      setTotalPages(result.meta.totalPages);
    } catch (err) {
      console.error('Filliallar yuklashda xatolik:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // Auto-slug generatsiya
  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  // Fillial yaratish
  const handleCreate = async () => {
    setFormError('');
    try {
      await branchService.create(createForm);
      setIsCreateOpen(false);
      setCreateForm({ name: '', slug: '', managerEmail: '', managerPassword: '', managerFirstName: '', managerLastName: '' });
      fetchBranches();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Xatolik yuz berdi');
    }
  };

  // Fillial yangilash
  const handleUpdate = async () => {
    if (!selectedBranch) return;
    setFormError('');
    try {
      await branchService.update(selectedBranch.id, editForm);
      setIsEditOpen(false);
      setSelectedBranch(null);
      fetchBranches();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Xatolik yuz berdi');
    }
  };

  // Toggle active
  const handleToggle = async (id: string) => {
    try {
      await branchService.toggle(id);
      fetchBranches();
    } catch (err) {
      console.error('Toggle xatolik:', err);
    }
  };

  // Edit ochish
  const openEdit = (branch: Branch) => {
    setSelectedBranch(branch);
    setEditForm({ name: branch.name, slug: branch.slug, phone: branch.phone, address: branch.address });
    setFormError('');
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Filliallar</h1>
          <p className="text-sm text-gray-500 mt-1">Jami: {total} ta fillial</p>
        </div>
        <button
          onClick={() => { setFormError(''); setIsCreateOpen(true); }}
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
        >
          <Plus size={18} />
          Yangi fillial
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Qidirish..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {(['all', 'active', 'inactive'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s === 'all' ? 'Barchasi' : s === 'active' ? 'Faol' : 'Nofaol'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-6 py-4">Fillial</th>
              <th className="px-6 py-4">Menejer</th>
              <th className="px-6 py-4 text-center">Buyurtmalar</th>
              <th className="px-6 py-4 text-center">Mahsulotlar</th>
              <th className="px-6 py-4 text-center">Stollar</th>
              <th className="px-6 py-4 text-center">Xodimlar</th>
              <th className="px-6 py-4 text-center">Holat</th>
              <th className="px-6 py-4 text-right">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-400">Yuklanmoqda...</td>
              </tr>
            ) : branches.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                  <GitBranch className="mx-auto mb-3 text-gray-300" size={40} />
                  <p>Filliallar topilmadi</p>
                </td>
              </tr>
            ) : (
              branches.map((branch) => {
                const manager = branch.users?.[0];
                return (
                  <tr key={branch.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{branch.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          {branch.address && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <MapPin size={12} />{branch.address}
                            </span>
                          )}
                          {branch.phone && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Phone size={12} />{branch.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {manager ? (
                        <div>
                          <p className="text-sm text-gray-900">{manager.firstName} {manager.lastName}</p>
                          <p className="text-xs text-gray-400">{manager.email}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <ShoppingCart size={14} className="text-gray-400" />
                        <span className="text-sm font-medium">{branch._count?.orders || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Package size={14} className="text-gray-400" />
                        <span className="text-sm font-medium">{branch._count?.products || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Armchair size={14} className="text-gray-400" />
                        <span className="text-sm font-medium">{branch._count?.tables || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Users size={14} className="text-gray-400" />
                        <span className="text-sm font-medium">{branch._count?.users || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleToggle(branch.id)}>
                        {branch.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                            <ToggleRight size={14} /> Faol
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                            <ToggleLeft size={14} /> Nofaol
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEdit(branch)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        title="Tahrirlash"
                      >
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
            <p className="text-sm text-gray-500">
              {(page - 1) * limit + 1}-{Math.min(page * limit, total)} / {total}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =================== CREATE MODAL =================== */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Yangi fillial</h2>
              <button onClick={() => setIsCreateOpen(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{formError}</div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fillial nomi *</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setCreateForm({ ...createForm, name, slug: generateSlug(name) });
                    }}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    placeholder="Masalan: Chilonzor filiali"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                  <input
                    type="text"
                    value={createForm.slug}
                    onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    placeholder="chilonzor-filiali"
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
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    placeholder="+998..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manzil</label>
                  <input
                    type="text"
                    value={createForm.address || ''}
                    onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    placeholder="Manzil..."
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Fillial menejeri</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ism *</label>
                    <input
                      type="text"
                      value={createForm.managerFirstName}
                      onChange={(e) => setCreateForm({ ...createForm, managerFirstName: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Familiya *</label>
                    <input
                      type="text"
                      value={createForm.managerLastName}
                      onChange={(e) => setCreateForm({ ...createForm, managerLastName: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      value={createForm.managerEmail}
                      onChange={(e) => setCreateForm({ ...createForm, managerEmail: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Parol *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={createForm.managerPassword}
                        onChange={(e) => setCreateForm({ ...createForm, managerPassword: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 pr-10 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleCreate}
                className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600"
              >
                Yaratish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================== EDIT MODAL =================== */}
      {isEditOpen && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Fillialni tahrirlash</h2>
              <button onClick={() => setIsEditOpen(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{formError}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomi</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input
                  type="text"
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manzil</label>
                <input
                  type="text"
                  value={editForm.address || ''}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsEditOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleUpdate}
                className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
