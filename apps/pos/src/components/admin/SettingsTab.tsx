import { useState, useEffect } from 'react';
import { Store, Printer, Globe, Info, Activity, Wifi, WifiOff, Settings, Save, Loader2, RefreshCw, List, BarChart3, ChefHat, CreditCard, Smartphone } from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../services/api';
import { settingsService, type BusinessSettings } from '../../services/settings.service';

interface SettingsTabProps {
  bizSettings: BusinessSettings | null;
  onSettingsUpdate: (settings: BusinessSettings) => void;
  activeIntegrations: number;
  onOpenIntegrationHub: () => void;
}

export default function SettingsTab({ bizSettings, onSettingsUpdate, activeIntegrations, onOpenIntegrationHub }: SettingsTabProps) {
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && bizSettings) {
      setForm({
        name: bizSettings.name || '',
        address: bizSettings.address || '',
        phone: bizSettings.phone || '',
        email: bizSettings.email || '',
      });
      setInitialized(true);
    }
  }, [bizSettings, initialized]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings', form);
      const settings = await settingsService.get();
      onSettingsUpdate(settings);
      alert('Sozlamalar saqlandi!');
    } catch {
      alert('Sozlamalarni saqlashda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const checkPrinter = async () => {
    try {
      const { data } = await api.get('/printer/status');
      const status = data.data || data;
      alert(status.online ? '✅ XPrinter server ishlayapti' : '❌ XPrinter server ishlamayapti');
    } catch { alert('❌ Printer serverga ulanib bo\'lmadi'); }
  };

  const listPrinters = async () => {
    try {
      const { data } = await api.get('/printer/list');
      const printers = data.data || data || [];
      if (Array.isArray(printers) && printers.length > 0) {
        alert('Printerlar:\n' + printers.map((p: { name?: string; id?: string; status?: string }) => `• ${p.name || p.id} (${p.status || 'unknown'})`).join('\n'));
      } else {
        alert('Ulangan printerlar topilmadi.\n\nXPrinter dasturini ishga tushiring:\nhttp://localhost:8000');
      }
    } catch { alert('Printer serverga ulanib bo\'lmadi.\n\nXPrinter dasturini ishga tushiring.'); }
  };

  const testPrint = async () => {
    try {
      const { data } = await api.get('/printer/list');
      const printers = data.data || data || [];
      if (printers.length > 0) {
        await api.post(`/printer/test/${printers[0].id || 'default'}`);
        alert('✅ Test chop yuborildi');
      } else { window.print(); }
    } catch { window.print(); }
  };

  const dailyReport = async () => {
    try {
      await api.post('/printer/print/daily-report');
      alert('✅ Kunlik hisobot chop etildi');
    } catch { alert('Xatolik!'); }
  };

  const settings = bizSettings as Record<string, unknown> | null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Sozlamalar</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business info */}
        <div className="glass-card rounded-2xl border border-white/60 shadow-lg p-6">
          <div className="flex items-center gap-2 mb-5">
            <Store size={20} className="text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">Biznes ma'lumotlari</h3>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Nomi', key: 'name' as const, type: 'text', placeholder: 'Restoran nomi' },
              { label: 'Manzil', key: 'address' as const, type: 'text', placeholder: 'Manzil' },
              { label: 'Telefon', key: 'phone' as const, type: 'tel', placeholder: '+998 90 123 45 67' },
              { label: 'Email', key: 'email' as const, type: 'email', placeholder: 'email@example.com' },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                <input
                  type={field.type}
                  value={form[field.key]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder={field.placeholder}
                />
              </div>
            ))}
            <button
              disabled={saving}
              onClick={handleSave}
              className={cn(
                'w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-md transition-all',
                saving ? 'bg-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-green-500 to-green-600 hover:shadow-lg'
              )}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Printer */}
          <div className="glass-card rounded-2xl border border-white/60 shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Printer size={20} className="text-gray-600" />
                <h3 className="text-lg font-bold text-gray-900">Printerlar</h3>
              </div>
              <button onClick={checkPrinter} className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-500/20 transition-colors">
                <RefreshCw size={12} /> Tekshirish
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl glass-strong border border-white/60 px-4 py-3">
                <div className="flex items-center gap-2"><Activity size={14} className="text-gray-400" /><span className="text-sm text-gray-700">XPrinter server</span></div>
                <span className="text-xs font-medium text-gray-500">localhost:8000</span>
              </div>
              <div className="rounded-xl glass-strong border border-white/60 p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">Printer sozlamalari</h4>
                {[
                  { icon: ChefHat, color: 'text-orange-500', name: 'Oshxona printer', desc: 'Buyurtma kelganda avtomatik chop' },
                  { icon: CreditCard, color: 'text-blue-500', name: 'Kassa printer', desc: "To'lov qilinganda chek chop" },
                ].map((p) => (
                  <div key={p.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p.icon size={14} className={p.color} />
                      <div><p className="text-sm font-medium text-gray-800">{p.name}</p><p className="text-xs text-gray-400">{p.desc}</p></div>
                    </div>
                    <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-green-500" /><span className="text-xs text-green-600">Faol</span></div>
                  </div>
                ))}
              </div>
              <button onClick={listPrinters} className="w-full flex items-center justify-center gap-2 rounded-xl glass-strong border border-white/60 py-2.5 text-sm font-medium text-gray-700 hover:bg-white/50 transition-all">
                <List size={14} /> Printerlar ro'yxati
              </button>
              <div className="flex gap-2">
                <button onClick={testPrint} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500/10 border border-green-200 py-2.5 text-sm font-medium text-green-700 hover:bg-green-500/20 transition-all">
                  <Printer size={14} /> Test chek
                </button>
                <button onClick={dailyReport} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-500/10 border border-blue-200 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-500/20 transition-all">
                  <BarChart3 size={14} /> Kunlik hisobot
                </button>
              </div>
            </div>
          </div>

          {/* Integrations */}
          <div className="glass-card rounded-2xl border border-white/60 shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4"><Globe size={20} className="text-blue-600" /><h3 className="text-lg font-bold text-gray-900">Integratsiyalar</h3></div>
            <div className="space-y-3">
              {[
                { icon: Store, name: 'Nonbor', enabled: !!settings?.nonborEnabled },
                { icon: Smartphone, name: 'Telegram', enabled: !!settings?.telegramEnabled },
              ].map((int) => (
                <div key={int.name} className="flex items-center justify-between rounded-xl glass-strong border border-white/60 px-4 py-3">
                  <div className="flex items-center gap-2"><int.icon size={14} className="text-blue-500" /><span className="text-sm text-gray-700">{int.name}</span></div>
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', int.enabled ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-500')}>
                    {int.enabled ? <><Wifi size={10} /> Ulangan</> : <><WifiOff size={10} /> O'chiq</>}
                  </span>
                </div>
              ))}
              <button onClick={onOpenIntegrationHub} className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all">
                <Settings size={14} /> Integratsiyalarni boshqarish
                {activeIntegrations > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1 text-xs font-bold">{activeIntegrations}</span>}
              </button>
            </div>
          </div>

          {/* System info */}
          <div className="glass-card rounded-2xl border border-white/60 shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4"><Info size={20} className="text-gray-600" /><h3 className="text-lg font-bold text-gray-900">Tizim ma'lumotlari</h3></div>
            <div className="space-y-3">
              {[
                { label: 'API versiya', value: 'v1.0.0' },
                { label: "Ma'lumotlar bazasi", value: '✅ Faol', isActive: true },
                { label: 'Valyuta', value: bizSettings?.currency || 'UZS' },
                { label: 'Vaqt zonasi', value: bizSettings?.timezone || 'Asia/Tashkent' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-xl glass-strong border border-white/60 px-4 py-3">
                  <span className="text-sm text-gray-600">{item.label}</span>
                  {item.isActive ? (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600"><Activity size={12} /> Faol</span>
                  ) : (
                    <span className="text-sm font-medium text-gray-900">{item.value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
