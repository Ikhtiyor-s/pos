import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Users, Shield, Phone, Mail, Edit3, Trash2, Eye, EyeOff, X, Loader2, Save } from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../services/api';
import type { StaffMember, StaffFormData } from '../../types';

const INITIAL_FORM: StaffFormData = {
  firstName: '', lastName: '', email: '', phone: '', role: 'CASHIER', pin: '',
};

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'Admin', color: 'bg-red-500/10 text-red-600' },
  admin: { label: 'Admin', color: 'bg-red-500/10 text-red-600' },
  manager: { label: 'Admin', color: 'bg-red-500/10 text-red-600' },
  cashier: { label: 'Kassir', color: 'bg-blue-500/10 text-blue-600' },
  kassir: { label: 'Kassir', color: 'bg-blue-500/10 text-blue-600' },
  chef: { label: 'Oshpaz', color: 'bg-green-500/10 text-green-600' },
  oshpaz: { label: 'Oshpaz', color: 'bg-green-500/10 text-green-600' },
  waiter: { label: 'Ofitsiant', color: 'bg-purple-500/10 text-purple-600' },
  ofitsiant: { label: 'Ofitsiant', color: 'bg-purple-500/10 text-purple-600' },
  warehouse: { label: 'Omborchi', color: 'bg-amber-500/10 text-amber-600' },
};

export default function StaffTab() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<StaffFormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const { data: response } = await api.get('/users');
      const users = response.data?.data || response.data || [];
      setStaffList(Array.isArray(users) ? users : []);
    } catch {
      console.error('[Admin] Xodimlarni yuklashda xatolik');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const openEdit = (staff: StaffMember) => {
    setForm({
      firstName: staff.firstName || '',
      lastName: staff.lastName || '',
      email: staff.email || '',
      phone: staff.phone || '',
      role: staff.role || 'CASHIER',
      pin: '',
      _id: staff.id,
    });
    setShowModal(true);
  };

  const openNew = () => {
    setForm(INITIAL_FORM);
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        role: form.role,
        ...(form.pin ? { pin: form.pin } : {}),
      };
      if (form._id) {
        await api.put(`/users/${form._id}`, payload);
      } else {
        await api.post('/users', { ...payload, pin: form.pin });
      }
      setShowModal(false);
      fetchStaff();
    } catch {
      alert('Xodim saqlashda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (staff: StaffMember) => {
    if (!confirm(`"${staff.firstName}" ni o'chirishni tasdiqlaysizmi?`)) return;
    try {
      await api.delete(`/users/${staff.id}`);
      fetchStaff();
    } catch { alert('Xatolik!'); }
  };

  const handleToggle = async (staff: StaffMember) => {
    try {
      await api.patch(`/users/${staff.id}`, { isActive: !staff.isActive });
      fetchStaff();
    } catch { alert('Xatolik!'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Xodimlar</h2>
        <button onClick={openNew} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all">
          <UserPlus size={16} /> Yangi xodim
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : staffList.length === 0 ? (
        <div className="glass-card rounded-2xl border border-white/60 shadow-lg p-8">
          <div className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">Xodimlar topilmadi</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffList.map((staff) => {
            const rc = ROLE_CONFIG[(staff.role || '').toLowerCase()] || { label: staff.role || "Noma'lum", color: 'bg-gray-500/10 text-gray-600' };
            const initials = ((staff.firstName || '?')[0] + (staff.lastName || '')[0]).toUpperCase();

            return (
              <div key={staff.id} className="glass-card rounded-2xl border border-white/60 shadow-lg p-5 hover:shadow-xl transition-all">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold shadow-md flex-shrink-0',
                    staff.isActive ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-gray-300 text-gray-500'
                  )}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate mb-1">{staff.firstName} {staff.lastName}</h3>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', rc.color)}>
                        <Shield size={10} /> {rc.label}
                      </span>
                      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', staff.isActive ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-500')}>
                        {staff.isActive ? 'Faol' : 'Nofaol'}
                      </span>
                    </div>
                    {staff.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <Phone size={12} /> <span>{staff.phone}</span>
                      </div>
                    )}
                    {staff.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Mail size={12} /> <span className="truncate">{staff.email}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                  <button onClick={() => openEdit(staff)} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-500/10 text-blue-600 py-2 text-xs font-medium hover:bg-blue-500/20 transition-colors">
                    <Edit3 size={13} /> Tahrirlash
                  </button>
                  <button onClick={() => handleDelete(staff)} className="flex items-center justify-center gap-1.5 rounded-lg bg-red-500/10 text-red-500 px-3 py-2 text-xs font-medium hover:bg-red-500/20 transition-colors">
                    <Trash2 size={13} />
                  </button>
                  <button onClick={() => handleToggle(staff)} className={cn('flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors', staff.isActive ? 'bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20' : 'bg-green-500/10 text-green-600 hover:bg-green-500/20')} title={staff.isActive ? 'Bloklash' : 'Faollashtirish'}>
                    {staff.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="glass-card rounded-2xl border border-white/60 shadow-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">{form._id ? 'Xodimni tahrirlash' : "Yangi xodim qo'shish"}</h3>
              <button onClick={() => setShowModal(false)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ism</label>
                  <input type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Ism" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Familiya</label>
                  <input type="text" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Familiya" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="email@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="+998 90 123 45 67" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lavozim</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white">
                  <option value="CASHIER">Kassir</option>
                  <option value="CHEF">Oshpaz</option>
                  <option value="WAITER">Ofitsiant</option>
                  <option value="WAREHOUSE">Omborchi</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PIN kod (4 raqam)</label>
                <input type="text" maxLength={4} value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm tracking-[0.5em] text-center font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="••••" />
              </div>
              <button
                disabled={saving || !form.firstName || (!form._id && (!form.pin || form.pin.length < 4))}
                onClick={handleSave}
                className={cn(
                  'w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-md transition-all',
                  saving || !form.firstName ? 'bg-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:shadow-lg'
                )}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
