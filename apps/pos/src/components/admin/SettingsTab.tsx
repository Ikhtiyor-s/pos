import { useState, useEffect, useCallback } from 'react';
import {
  Store, Printer, Globe, Info, Activity, Wifi, WifiOff, Settings, Save, Loader2,
  RefreshCw, List, BarChart3, ChefHat, CreditCard, Smartphone, ScanBarcode,
  Plus, Trash2, X, Check, Monitor, Usb, Camera, Keyboard, AlertTriangle,
  Power, PowerOff, Edit3, Zap, Volume2, VolumeX, Hash,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../services/api';
import { settingsService, type BusinessSettings } from '../../services/settings.service';

interface SettingsTabProps {
  bizSettings: BusinessSettings | null;
  onSettingsUpdate: (settings: BusinessSettings) => void;
  activeIntegrations: number;
  onOpenIntegrationHub: () => void;
}

interface PrinterDevice {
  id: string;
  name: string;
  type: 'kitchen' | 'cashier' | 'label';
  connection: 'usb' | 'network' | 'bluetooth';
  address: string;
  isActive: boolean;
  paperWidth: 58 | 80;
}

interface ScannerDevice {
  id: string;
  name: string;
  type: 'barcode' | 'qr' | 'both';
  connection: 'usb' | 'bluetooth' | 'camera';
  isActive: boolean;
  autoAdd: boolean;
  sound: boolean;
}

const DEFAULT_PRINTERS: PrinterDevice[] = [
  { id: 'kitchen-1', name: 'Oshxona printer', type: 'kitchen', connection: 'usb', address: 'USB001', isActive: true, paperWidth: 80 },
  { id: 'cashier-1', name: 'Kassa printer', type: 'cashier', connection: 'usb', address: 'USB002', isActive: true, paperWidth: 58 },
];

const DEFAULT_SCANNERS: ScannerDevice[] = [
  { id: 'scanner-1', name: 'USB Barcode Scanner', type: 'both', connection: 'usb', isActive: true, autoAdd: true, sound: true },
];

type SettingsSection = 'business' | 'printers' | 'scanners' | 'integrations' | 'system';

export default function SettingsTab({ bizSettings, onSettingsUpdate, activeIntegrations, onOpenIntegrationHub }: SettingsTabProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('business');
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Printer state
  const [printers, setPrinters] = useState<PrinterDevice[]>(() => {
    try { return JSON.parse(localStorage.getItem('pos-printers') || 'null') || DEFAULT_PRINTERS; }
    catch { return DEFAULT_PRINTERS; }
  });
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<PrinterDevice | null>(null);
  const [printerForm, setPrinterForm] = useState<Partial<PrinterDevice>>({});
  const [printerServerOnline, setPrinterServerOnline] = useState<boolean | null>(null);

  // Scanner state
  const [scanners, setScanners] = useState<ScannerDevice[]>(() => {
    try { return JSON.parse(localStorage.getItem('pos-scanners') || 'null') || DEFAULT_SCANNERS; }
    catch { return DEFAULT_SCANNERS; }
  });
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [editingScanner, setEditingScanner] = useState<ScannerDevice | null>(null);
  const [scannerForm, setScannerForm] = useState<Partial<ScannerDevice>>({});

  useEffect(() => {
    if (!initialized && bizSettings) {
      setForm({ name: bizSettings.name || '', address: bizSettings.address || '', phone: bizSettings.phone || '', email: bizSettings.email || '' });
      setInitialized(true);
    }
  }, [bizSettings, initialized]);

  // Save printers/scanners to localStorage
  useEffect(() => { localStorage.setItem('pos-printers', JSON.stringify(printers)); }, [printers]);
  useEffect(() => { localStorage.setItem('pos-scanners', JSON.stringify(scanners)); }, [scanners]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings', form);
      const settings = await settingsService.get();
      onSettingsUpdate(settings);
      alert('Sozlamalar saqlandi!');
    } catch { alert('Xatolik yuz berdi'); }
    finally { setSaving(false); }
  };

  const checkPrinterServer = useCallback(async () => {
    try {
      const { data } = await api.get('/printer/status');
      setPrinterServerOnline(!!(data.data?.online || data.online));
    } catch { setPrinterServerOnline(false); }
  }, []);

  useEffect(() => { checkPrinterServer(); }, [checkPrinterServer]);

  // Printer CRUD
  const savePrinter = () => {
    if (!printerForm.name) return;
    const device: PrinterDevice = {
      id: editingPrinter?.id || `printer-${Date.now()}`,
      name: printerForm.name || '',
      type: printerForm.type || 'cashier',
      connection: printerForm.connection || 'usb',
      address: printerForm.address || '',
      isActive: printerForm.isActive ?? true,
      paperWidth: printerForm.paperWidth || 80,
    };
    setPrinters((prev) => editingPrinter ? prev.map((p) => p.id === editingPrinter.id ? device : p) : [...prev, device]);
    setShowPrinterModal(false);
    setEditingPrinter(null);
  };

  const deletePrinter = (id: string) => {
    if (!confirm("Printerni o'chirmoqchimisiz?")) return;
    setPrinters((prev) => prev.filter((p) => p.id !== id));
  };

  const togglePrinter = (id: string) => {
    setPrinters((prev) => prev.map((p) => p.id === id ? { ...p, isActive: !p.isActive } : p));
  };

  // Scanner CRUD
  const saveScanner = () => {
    if (!scannerForm.name) return;
    const device: ScannerDevice = {
      id: editingScanner?.id || `scanner-${Date.now()}`,
      name: scannerForm.name || '',
      type: scannerForm.type || 'both',
      connection: scannerForm.connection || 'usb',
      isActive: scannerForm.isActive ?? true,
      autoAdd: scannerForm.autoAdd ?? true,
      sound: scannerForm.sound ?? true,
    };
    setScanners((prev) => editingScanner ? prev.map((s) => s.id === editingScanner.id ? device : s) : [...prev, device]);
    setShowScannerModal(false);
    setEditingScanner(null);
  };

  const deleteScanner = (id: string) => {
    if (!confirm("Skanerni o'chirmoqchimisiz?")) return;
    setScanners((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleScanner = (id: string) => {
    setScanners((prev) => prev.map((s) => s.id === id ? { ...s, isActive: !s.isActive } : s));
  };

  const testPrint = async (printerId: string) => {
    try {
      await api.post(`/printer/test/${printerId}`);
      alert('✅ Test chop yuborildi');
    } catch { window.print(); }
  };

  const s = bizSettings as Record<string, unknown> | null;

  const sections: { id: SettingsSection; label: string; icon: typeof Store; count?: number }[] = [
    { id: 'business', label: 'Biznes', icon: Store },
    { id: 'printers', label: 'Printerlar', icon: Printer, count: printers.filter((p) => p.isActive).length },
    { id: 'scanners', label: 'Skanerlar', icon: ScanBarcode, count: scanners.filter((s) => s.isActive).length },
    { id: 'integrations', label: 'Integratsiyalar', icon: Globe, count: activeIntegrations },
    { id: 'system', label: 'Tizim', icon: Info },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Sozlamalar</h2>

      {/* Section tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {sections.map((sec) => (
          <button key={sec.id} onClick={() => setActiveSection(sec.id)}
            className={cn('flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all',
              activeSection === sec.id ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md' : 'glass-card border border-white/60 text-gray-700 hover:bg-white/80'
            )}>
            <sec.icon size={16} />
            {sec.label}
            {sec.count != null && sec.count > 0 && (
              <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold', activeSection === sec.id ? 'bg-white/25' : 'bg-blue-500/10 text-blue-600')}>{sec.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ====== BUSINESS ====== */}
      {activeSection === 'business' && (
        <div className="glass-card rounded-2xl border border-white/60 shadow-lg p-6 max-w-xl">
          <div className="flex items-center gap-2 mb-5"><Store size={20} className="text-blue-600" /><h3 className="text-lg font-bold text-gray-900">Biznes ma'lumotlari</h3></div>
          <div className="space-y-4">
            {[
              { label: 'Nomi', key: 'name' as const, type: 'text', placeholder: 'Restoran nomi' },
              { label: 'Manzil', key: 'address' as const, type: 'text', placeholder: 'Manzil' },
              { label: 'Telefon', key: 'phone' as const, type: 'tel', placeholder: '+998 90 123 45 67' },
              { label: 'Email', key: 'email' as const, type: 'email', placeholder: 'email@example.com' },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                <input type={field.type} value={form[field.key]} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder={field.placeholder} />
              </div>
            ))}
            <button disabled={saving} onClick={handleSave}
              className={cn('w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-md transition-all', saving ? 'bg-gray-300' : 'bg-gradient-to-r from-green-500 to-green-600 hover:shadow-lg')}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </div>
      )}

      {/* ====== PRINTERS ====== */}
      {activeSection === 'printers' && (
        <div className="space-y-4">
          {/* Server status */}
          <div className="flex items-center justify-between glass-card rounded-2xl border border-white/60 shadow-lg p-4">
            <div className="flex items-center gap-3">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', printerServerOnline ? 'bg-green-500/10' : 'bg-red-500/10')}>
                <Monitor size={20} className={printerServerOnline ? 'text-green-500' : 'text-red-500'} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">XPrinter Server</p>
                <p className="text-xs text-gray-500">localhost:8000</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', printerServerOnline ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500')}>
                <div className={cn('h-2 w-2 rounded-full', printerServerOnline ? 'bg-green-500' : 'bg-red-500')} />
                {printerServerOnline ? 'Online' : 'Offline'}
              </span>
              <button onClick={checkPrinterServer} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><RefreshCw size={14} /></button>
            </div>
          </div>

          {/* Printer list */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Ulangan printerlar</h3>
            <button onClick={() => { setEditingPrinter(null); setPrinterForm({ type: 'cashier', connection: 'usb', isActive: true, paperWidth: 80 }); setShowPrinterModal(true); }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all">
              <Plus size={16} /> Printer qo'shish
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {printers.map((printer) => (
              <div key={printer.id} className={cn('glass-card rounded-2xl border-2 p-5 transition-all', printer.isActive ? 'border-green-200/60' : 'border-gray-200/60 opacity-60')}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl shadow-md',
                      printer.type === 'kitchen' ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white' :
                      printer.type === 'label' ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white' :
                      'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                    )}>
                      {printer.type === 'kitchen' ? <ChefHat size={20} /> : printer.type === 'label' ? <ScanBarcode size={20} /> : <CreditCard size={20} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{printer.name}</h4>
                      <p className="text-xs text-gray-500">{printer.type === 'kitchen' ? 'Oshxona' : printer.type === 'label' ? 'Etiketka' : 'Kassa'} • {printer.paperWidth}mm</p>
                    </div>
                  </div>
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', printer.isActive ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-500')}>
                    {printer.isActive ? <><Power size={10} /> Faol</> : <><PowerOff size={10} /> O'chiq</>}
                  </span>
                </div>

                <div className="space-y-1 mb-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {printer.connection === 'usb' ? <Usb size={12} /> : printer.connection === 'bluetooth' ? <Zap size={12} /> : <Globe size={12} />}
                    <span>{printer.connection === 'usb' ? 'USB' : printer.connection === 'bluetooth' ? 'Bluetooth' : 'Tarmoq'}: {printer.address}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <button onClick={() => testPrint(printer.id)} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-green-500/10 text-green-600 py-2 text-xs font-medium hover:bg-green-500/20 transition-colors">
                    <Printer size={13} /> Test chop
                  </button>
                  <button onClick={() => { setEditingPrinter(printer); setPrinterForm(printer); setShowPrinterModal(true); }} className="flex items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 px-3 py-2 text-xs font-medium hover:bg-blue-500/20 transition-colors">
                    <Edit3 size={13} />
                  </button>
                  <button onClick={() => togglePrinter(printer.id)} className={cn('flex items-center justify-center rounded-lg px-3 py-2 text-xs font-medium transition-colors', printer.isActive ? 'bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20' : 'bg-green-500/10 text-green-600 hover:bg-green-500/20')}>
                    {printer.isActive ? <PowerOff size={13} /> : <Power size={13} />}
                  </button>
                  <button onClick={() => deletePrinter(printer.id)} className="flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 px-3 py-2 text-xs font-medium hover:bg-red-500/20 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="flex gap-3">
            <button onClick={async () => { try { await api.post('/printer/print/daily-report'); alert('✅ Kunlik hisobot chop etildi'); } catch { alert('Xatolik!'); } }}
              className="flex items-center gap-2 rounded-xl bg-blue-500/10 border border-blue-200 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-500/20 transition-all">
              <BarChart3 size={14} /> Kunlik hisobot chop
            </button>
          </div>
        </div>
      )}

      {/* ====== SCANNERS ====== */}
      {activeSection === 'scanners' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Barcode skanerlar</h3>
            <button onClick={() => { setEditingScanner(null); setScannerForm({ type: 'both', connection: 'usb', isActive: true, autoAdd: true, sound: true }); setShowScannerModal(true); }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all">
              <Plus size={16} /> Skaner qo'shish
            </button>
          </div>

          {/* Scanner info */}
          <div className="glass-card rounded-2xl border border-white/60 shadow-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 shrink-0"><ScanBarcode size={20} className="text-orange-500" /></div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Qanday ishlaydi?</p>
                <p className="text-xs text-gray-500 mt-1">USB barcode skaner klaviatura rejimida (HID mode) ishlaydi. Skanerlangan kod avtomatik POS ga tushadi. Kamera orqali ham skanerlash mumkin.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scanners.map((scanner) => (
              <div key={scanner.id} className={cn('glass-card rounded-2xl border-2 p-5 transition-all', scanner.isActive ? 'border-orange-200/60' : 'border-gray-200/60 opacity-60')}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl shadow-md',
                      scanner.connection === 'camera' ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white' :
                      scanner.connection === 'bluetooth' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' :
                      'bg-gradient-to-br from-orange-500 to-orange-600 text-white'
                    )}>
                      {scanner.connection === 'camera' ? <Camera size={20} /> : scanner.connection === 'bluetooth' ? <Zap size={20} /> : <Usb size={20} />}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{scanner.name}</h4>
                      <p className="text-xs text-gray-500">
                        {scanner.type === 'barcode' ? 'Barcode' : scanner.type === 'qr' ? 'QR kod' : 'Barcode + QR'} •
                        {scanner.connection === 'usb' ? ' USB' : scanner.connection === 'bluetooth' ? ' Bluetooth' : ' Kamera'}
                      </p>
                    </div>
                  </div>
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', scanner.isActive ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-500')}>
                    {scanner.isActive ? <><Power size={10} /> Faol</> : <><PowerOff size={10} /> O'chiq</>}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium', scanner.autoAdd ? 'bg-blue-500/10 text-blue-600' : 'bg-gray-500/10 text-gray-500')}>
                    <Zap size={10} /> {scanner.autoAdd ? 'Avto-qo\'shish' : 'Qo\'lda'}
                  </span>
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium', scanner.sound ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-500')}>
                    {scanner.sound ? <Volume2 size={10} /> : <VolumeX size={10} />} {scanner.sound ? 'Ovoz' : 'Ovozsiz'}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <button onClick={() => { setEditingScanner(scanner); setScannerForm(scanner); setShowScannerModal(true); }} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-500/10 text-blue-600 py-2 text-xs font-medium hover:bg-blue-500/20 transition-colors">
                    <Edit3 size={13} /> Tahrirlash
                  </button>
                  <button onClick={() => toggleScanner(scanner.id)} className={cn('flex items-center justify-center rounded-lg px-3 py-2 text-xs font-medium transition-colors', scanner.isActive ? 'bg-yellow-500/10 text-yellow-600' : 'bg-green-500/10 text-green-600')}>
                    {scanner.isActive ? <PowerOff size={13} /> : <Power size={13} />}
                  </button>
                  <button onClick={() => deleteScanner(scanner.id)} className="flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 px-3 py-2 text-xs font-medium hover:bg-red-500/20 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====== INTEGRATIONS ====== */}
      {activeSection === 'integrations' && (
        <div className="space-y-4 max-w-xl">
          {[
            { icon: Store, name: 'Nonbor', desc: 'Onlayn buyurtmalar sinxronizatsiyasi', enabled: !!s?.nonborEnabled },
            { icon: Smartphone, name: 'Telegram', desc: 'Buyurtma bildirishnomalari', enabled: !!s?.telegramEnabled },
            { icon: CreditCard, name: 'Payme', desc: "To'lov qabul qilish", enabled: !!s?.paymeEnabled },
            { icon: CreditCard, name: 'Click', desc: "To'lov qabul qilish", enabled: !!s?.clickEnabled },
          ].map((int) => (
            <div key={int.name} className="flex items-center justify-between glass-card rounded-2xl border border-white/60 shadow-lg px-5 py-4">
              <div className="flex items-center gap-3">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', int.enabled ? 'bg-green-500/10' : 'bg-gray-100')}>
                  <int.icon size={18} className={int.enabled ? 'text-green-500' : 'text-gray-400'} />
                </div>
                <div><p className="text-sm font-semibold text-gray-900">{int.name}</p><p className="text-xs text-gray-500">{int.desc}</p></div>
              </div>
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', int.enabled ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-500')}>
                {int.enabled ? <><Wifi size={10} /> Ulangan</> : <><WifiOff size={10} /> O'chiq</>}
              </span>
            </div>
          ))}
          <button onClick={onOpenIntegrationHub} className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all">
            <Settings size={14} /> Integratsiyalarni boshqarish
            {activeIntegrations > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1 text-xs font-bold">{activeIntegrations}</span>}
          </button>
        </div>
      )}

      {/* ====== SYSTEM ====== */}
      {activeSection === 'system' && (
        <div className="glass-card rounded-2xl border border-white/60 shadow-lg p-6 max-w-xl">
          <div className="flex items-center gap-2 mb-4"><Info size={20} className="text-gray-600" /><h3 className="text-lg font-bold text-gray-900">Tizim ma'lumotlari</h3></div>
          <div className="space-y-3">
            {[
              { label: 'API versiya', value: 'v3.0.0' },
              { label: "Ma'lumotlar bazasi", value: 'Faol', isActive: true },
              { label: 'Valyuta', value: bizSettings?.currency || 'UZS' },
              { label: 'Vaqt zonasi', value: bizSettings?.timezone || 'Asia/Tashkent' },
              { label: 'Printerlar', value: `${printers.filter((p) => p.isActive).length} ta faol` },
              { label: 'Skanerlar', value: `${scanners.filter((s) => s.isActive).length} ta faol` },
              { label: 'Server', value: printerServerOnline ? 'Online' : 'Offline', isActive: printerServerOnline || false },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl glass-strong border border-white/60 px-4 py-3">
                <span className="text-sm text-gray-600">{item.label}</span>
                {item.isActive != null ? (
                  <span className={cn('inline-flex items-center gap-1 text-sm font-medium', item.isActive ? 'text-green-600' : 'text-red-500')}><Activity size={12} /> {item.value}</span>
                ) : (
                  <span className="text-sm font-medium text-gray-900">{item.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====== PRINTER MODAL ====== */}
      {showPrinterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowPrinterModal(false)}>
          <div className="glass-card rounded-2xl border border-white/60 shadow-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">{editingPrinter ? 'Printerni tahrirlash' : "Yangi printer qo'shish"}</h3>
              <button onClick={() => setShowPrinterModal(false)} className="rounded-lg p-2 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Printer nomi *</label>
                <input type="text" value={printerForm.name || ''} onChange={(e) => setPrinterForm({ ...printerForm, name: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 outline-none" placeholder="Oshxona printer" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Turi</label>
                  <select value={printerForm.type || 'cashier'} onChange={(e) => setPrinterForm({ ...printerForm, type: e.target.value as PrinterDevice['type'] })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 outline-none bg-white">
                    <option value="cashier">Kassa</option>
                    <option value="kitchen">Oshxona</option>
                    <option value="label">Etiketka</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ulanish</label>
                  <select value={printerForm.connection || 'usb'} onChange={(e) => setPrinterForm({ ...printerForm, connection: e.target.value as PrinterDevice['connection'] })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 outline-none bg-white">
                    <option value="usb">USB</option>
                    <option value="network">Tarmoq (LAN)</option>
                    <option value="bluetooth">Bluetooth</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manzil / Port</label>
                  <input type="text" value={printerForm.address || ''} onChange={(e) => setPrinterForm({ ...printerForm, address: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 outline-none" placeholder="USB001 yoki 192.168.1.100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qog'oz kengligi</label>
                  <select value={printerForm.paperWidth || 80} onChange={(e) => setPrinterForm({ ...printerForm, paperWidth: Number(e.target.value) as 58 | 80 })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 outline-none bg-white">
                    <option value={58}>58mm</option>
                    <option value={80}>80mm</option>
                  </select>
                </div>
              </div>
              <button onClick={savePrinter} disabled={!printerForm.name}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg disabled:opacity-50 transition-all">
                <Save size={16} /> {editingPrinter ? 'Saqlash' : "Qo'shish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== SCANNER MODAL ====== */}
      {showScannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowScannerModal(false)}>
          <div className="glass-card rounded-2xl border border-white/60 shadow-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">{editingScanner ? 'Skanerni tahrirlash' : "Yangi skaner qo'shish"}</h3>
              <button onClick={() => setShowScannerModal(false)} className="rounded-lg p-2 hover:bg-gray-100"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Skaner nomi *</label>
                <input type="text" value={scannerForm.name || ''} onChange={(e) => setScannerForm({ ...scannerForm, name: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 outline-none" placeholder="USB Barcode Scanner" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Skanerlash turi</label>
                  <select value={scannerForm.type || 'both'} onChange={(e) => setScannerForm({ ...scannerForm, type: e.target.value as ScannerDevice['type'] })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 outline-none bg-white">
                    <option value="barcode">Faqat Barcode</option>
                    <option value="qr">Faqat QR kod</option>
                    <option value="both">Barcode + QR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ulanish</label>
                  <select value={scannerForm.connection || 'usb'} onChange={(e) => setScannerForm({ ...scannerForm, connection: e.target.value as ScannerDevice['connection'] })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 outline-none bg-white">
                    <option value="usb">USB (HID)</option>
                    <option value="bluetooth">Bluetooth</option>
                    <option value="camera">Kamera</option>
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                <label className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2"><Zap size={14} className="text-blue-500" /><span className="text-sm text-gray-700">Avto-qo'shish (skanerlanganda savatga tushadi)</span></div>
                  <input type="checkbox" checked={scannerForm.autoAdd ?? true} onChange={(e) => setScannerForm({ ...scannerForm, autoAdd: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                </label>
                <label className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-2"><Volume2 size={14} className="text-green-500" /><span className="text-sm text-gray-700">Ovozli signal</span></div>
                  <input type="checkbox" checked={scannerForm.sound ?? true} onChange={(e) => setScannerForm({ ...scannerForm, sound: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                </label>
              </div>
              <button onClick={saveScanner} disabled={!scannerForm.name}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg disabled:opacity-50 transition-all">
                <Save size={16} /> {editingScanner ? 'Saqlash' : "Qo'shish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
