import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Plus,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
  AlertCircle,
  Users,
  Edit3,
  Check,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { customerApiService, type CustomerApi } from '@/services/customer.service';

const ITEMS_PER_PAGE = 10;

export function CustomersPage() {
  // Data state
  const [customers, setCustomers] = useState<CustomerApi[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerApi | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerApi | null>(null);

  // Loading / error
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    phone: '',
    firstName: '',
    lastName: '',
    email: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Debounce ref
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchQuery]);

  // Load customers from API
  const loadCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await customerApiService.getAll({
        search: debouncedSearch || undefined,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      });
      setCustomers(result.customers);
      setTotalCount(result.total);
    } catch (err: any) {
      setError(err.response?.data?.message || "Ma'lumotlarni yuklashda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, currentPage]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Helpers
  const getCustomerName = (c: CustomerApi) => {
    const parts = [c.firstName, c.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'Nomsiz';
  };

  const getInitial = (c: CustomerApi) => {
    if (c.firstName) return c.firstName.charAt(0).toUpperCase();
    if (c.lastName) return c.lastName.charAt(0).toUpperCase();
    return '?';
  };

  // Form handlers
  const resetForm = () => {
    setFormData({ phone: '', firstName: '', lastName: '', email: '', notes: '' });
    setFormErrors({});
  };

  const openAddForm = () => {
    setEditingCustomer(null);
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (customer: CustomerApi) => {
    setEditingCustomer(customer);
    setFormData({
      phone: customer.phone || '',
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      email: customer.email || '',
      notes: customer.notes || '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.phone.trim()) {
      errors.phone = 'Telefon raqam kiritilishi shart';
    } else if (!/^\+?\d{9,15}$/.test(formData.phone.replace(/[\s-]/g, ''))) {
      errors.phone = "Telefon raqam noto'g'ri formatda";
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Email noto'g'ri formatda";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setIsSaving(true);
      const payload: Record<string, any> = {
        phone: formData.phone.trim(),
      };
      if (formData.firstName.trim()) payload.firstName = formData.firstName.trim();
      if (formData.lastName.trim()) payload.lastName = formData.lastName.trim();
      if (formData.email.trim()) payload.email = formData.email.trim();
      if (formData.notes.trim()) payload.notes = formData.notes.trim();

      if (editingCustomer) {
        await customerApiService.update(editingCustomer.id, payload);
        showToast('success', "Mijoz muvaffaqiyatli yangilandi");
      } else {
        await customerApiService.create(payload as any);
        showToast('success', "Yangi mijoz muvaffaqiyatli qo'shildi");
      }
      setIsFormOpen(false);
      resetForm();
      await loadCustomers();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Xatolik yuz berdi';
      showToast('error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCustomer) return;
    try {
      setIsDeleting(true);
      await customerApiService.delete(deletingCustomer.id);
      showToast('success', "Mijoz muvaffaqiyatli o'chirildi");
      setIsDeleteOpen(false);
      setDeletingCustomer(null);
      await loadCustomers();
    } catch (err: any) {
      const msg = err.response?.data?.message || "O'chirishda xatolik yuz berdi";
      showToast('error', msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // ===== FORM VIEW =====
  if (isFormOpen) {
    return (
      <div className="animate-fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {editingCustomer ? 'Mijozni tahrirlash' : 'Yangi mijoz'}
          </h1>
          <button
            onClick={() => { setIsFormOpen(false); resetForm(); }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Avatar placeholder */}
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-3xl font-bold">
              {formData.firstName ? formData.firstName.charAt(0).toUpperCase() : formData.phone ? '#' : '?'}
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Phone - required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefon raqam <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+998901234567"
                className={cn(
                  'w-full h-11 px-4 border rounded-lg focus:outline-none text-sm',
                  formErrors.phone ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-orange-500'
                )}
              />
              {formErrors.phone && (
                <p className="mt-1 text-xs text-red-500">{formErrors.phone}</p>
              )}
            </div>

            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ism</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={e => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="Ismni kiriting"
                className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 text-sm"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Familiya</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={e => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Familiyani kiriting"
                className="w-full h-11 px-4 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 text-sm"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@example.com"
                className={cn(
                  'w-full h-11 px-4 border rounded-lg focus:outline-none text-sm',
                  formErrors.email ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-orange-500'
                )}
              />
              {formErrors.email && (
                <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>
              )}
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Izoh</label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Qo'shimcha izoh..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 text-sm resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button
              onClick={() => { setIsFormOpen(false); resetForm(); }}
              className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              {editingCustomer ? 'Saqlash' : "Qo'shish"}
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className={cn(
            'fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg flex items-center gap-2',
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          )}>
            {toast.type === 'success' ? <Check size={16} /> : <XCircle size={16} />}
            {toast.message}
          </div>
        )}
      </div>
    );
  }

  // ===== LOADING STATE =====
  if (isLoading && customers.length === 0) {
    return (
      <div className="animate-fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mijozlar</h1>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center py-24">
          <Loader2 size={40} className="text-orange-500 animate-spin mb-4" />
          <p className="text-gray-500 text-sm">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  // ===== ERROR STATE =====
  if (error && customers.length === 0) {
    return (
      <div className="animate-fade-in-up">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mijozlar</h1>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center py-24">
          <AlertCircle size={40} className="text-red-400 mb-4" />
          <p className="text-gray-700 font-medium mb-1">Xatolik yuz berdi</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button
            onClick={loadCustomers}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            Qayta yuklash
          </button>
        </div>
      </div>
    );
  }

  // ===== MAIN LIST VIEW =====
  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mijozlar</h1>
        <button
          onClick={openAddForm}
          className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={18} />
          Yangi mijoz
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Mijozlarni qidirish..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 text-sm"
          />
          {isLoading && searchQuery && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" size={16} />
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {customers.length === 0 && !isLoading ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20">
            <Users size={48} className="text-gray-300 mb-4" />
            <p className="text-gray-700 font-medium mb-1">Mijozlar topilmadi</p>
            <p className="text-gray-400 text-sm mb-4">
              {debouncedSearch
                ? `"${debouncedSearch}" bo'yicha natija topilmadi`
                : "Hali mijoz qo'shilmagan"}
            </p>
            {!debouncedSearch && (
              <button
                onClick={openAddForm}
                className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <Plus size={16} />
                Yangi mijoz qo'shish
              </button>
            )}
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Ism</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Telefon</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Email</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Buyurtmalar soni</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Bonus</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Holat</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(customer => (
                  <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    {/* Ism */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold text-sm flex-shrink-0">
                          {getInitial(customer)}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {getCustomerName(customer)}
                        </span>
                      </div>
                    </td>
                    {/* Telefon */}
                    <td className="px-6 py-4 text-sm text-gray-600">{customer.phone}</td>
                    {/* Email */}
                    <td className="px-6 py-4 text-sm text-gray-500">{customer.email || '-'}</td>
                    {/* Buyurtmalar soni */}
                    <td className="px-6 py-4 text-sm text-gray-600">{customer._count?.orders ?? 0}</td>
                    {/* Bonus */}
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-green-600">{customer.bonusPoints.toLocaleString()}</span>
                    </td>
                    {/* Holat */}
                    <td className="px-6 py-4">
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
                        customer.isActive
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      )}>
                        <span className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          customer.isActive ? 'bg-green-500' : 'bg-gray-400'
                        )} />
                        {customer.isActive ? 'Faol' : 'Nofaol'}
                      </span>
                    </td>
                    {/* Amallar */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditForm(customer)}
                          className="text-blue-500 hover:text-blue-700 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                          title="Tahrirlash"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingCustomer(customer);
                            setIsDeleteOpen(true);
                          }}
                          className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          title="O'chirish"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                <span className="text-sm text-gray-500">
                  {totalCount} ta mijozdan{' '}
                  <span className="font-medium text-gray-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span>
                  {' - '}
                  <span className="font-medium text-gray-900">{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)}</span>
                  {' '}ko'rsatilmoqda
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 hover:bg-gray-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          'w-8 h-8 rounded-lg text-sm font-medium',
                          currentPage === pageNum
                            ? 'bg-orange-500 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 hover:bg-gray-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Modal */}
      {isDeleteOpen && deletingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="text-red-500" size={32} />
              </div>
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">
              Mijozni o'chirish
            </h3>
            <p className="text-sm text-center text-gray-500 mb-6">
              <span className="font-medium text-gray-700">{getCustomerName(deletingCustomer)}</span> mijozini
              o'chirishni xohlaysizmi? Bu amalni ortga qaytarib bo'lmaydi.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setIsDeleteOpen(false); setDeletingCustomer(null); }}
                disabled={isDeleting}
                className="px-8 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-8 py-2.5 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-60 transition-colors flex items-center gap-2"
              >
                {isDeleting && <Loader2 size={16} className="animate-spin" />}
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={cn(
          'fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg flex items-center gap-2',
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        )}>
          {toast.type === 'success' ? <Check size={16} /> : <XCircle size={16} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}
