import { useState } from 'react';
import {
  User,
  Store,
  Bell,
  Shield,
  Palette,
  CreditCard,
  Printer,
  Wifi,
  Database,
  Save,
  ChevronRight,
  Camera,
  Mail,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const settingsSections = [
  { id: 'profile', name: 'Profil', icon: User, description: 'Shaxsiy ma\'lumotlar' },
  { id: 'restaurant', name: 'Restoran', icon: Store, description: 'Biznes sozlamalari' },
  { id: 'notifications', name: 'Bildirishnomalar', icon: Bell, description: 'Xabarnomalar sozlamalari' },
  { id: 'security', name: 'Xavfsizlik', icon: Shield, description: 'Parol va kirish' },
  { id: 'appearance', name: 'Ko\'rinish', icon: Palette, description: 'Mavzu va til' },
  { id: 'payment', name: 'To\'lov', icon: CreditCard, description: 'To\'lov usullari' },
  { id: 'devices', name: 'Qurilmalar', icon: Printer, description: 'Printer va terminallar' },
  { id: 'integrations', name: 'Integratsiya', icon: Wifi, description: 'Tashqi xizmatlar' },
  { id: 'backup', name: 'Zaxira', icon: Database, description: 'Ma\'lumotlar zaxirasi' },
];

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Sozlamalar</h1>
          <p className="text-sm text-gray-500">Tizim va foydalanuvchi sozlamalari</p>
        </div>
        <button
          onClick={handleSave}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-all',
            saved
              ? 'bg-green-500'
              : 'bg-gradient-to-r from-[#FF5722] to-[#E91E63] hover:shadow-xl'
          )}
        >
          {saved ? (
            <>
              <CheckCircle size={18} />
              Saqlandi
            </>
          ) : (
            <>
              <Save size={18} />
              Saqlash
            </>
          )}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="rounded-xl bg-white p-3 shadow-sm border border-gray-100">
            <nav className="space-y-1">
              {settingsSections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all',
                      activeSection === section.id
                        ? 'bg-gradient-to-r from-[#FF5722] to-[#E91E63] text-white'
                        : 'text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    <Icon size={18} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{section.name}</p>
                    </div>
                    <ChevronRight size={16} className={activeSection === section.id ? 'text-white/70' : 'text-gray-400'} />
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeSection === 'profile' && (
            <div className="space-y-6">
              {/* Profile Header */}
              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-[#FF5722] to-[#E91E63] text-3xl font-bold text-white">
                      AK
                    </div>
                    <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg border border-gray-200 hover:bg-gray-50">
                      <Camera size={14} className="text-gray-600" />
                    </button>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Abdulloh Karimov</h2>
                    <p className="text-gray-500">Super Admin</p>
                    <p className="text-sm text-green-500 mt-1">● Faol</p>
                  </div>
                </div>
              </div>

              {/* Profile Form */}
              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Shaxsiy ma'lumotlar</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ism</label>
                    <input
                      type="text"
                      defaultValue="Abdulloh"
                      className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Familiya</label>
                    <input
                      type="text"
                      defaultValue="Karimov"
                      className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        defaultValue="admin@oshxona.uz"
                        className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        defaultValue="+998 90 123 45 67"
                        className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'restaurant' && (
            <div className="space-y-6">
              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Restoran ma'lumotlari</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Restoran nomi</label>
                    <input
                      type="text"
                      defaultValue="Oshxona Restaurant"
                      className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Manzil</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <textarea
                        defaultValue="Toshkent sh., Chilonzor tumani, 12-mavze, 45-uy"
                        rows={2}
                        className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ish vaqti (boshlanishi)</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="time"
                        defaultValue="09:00"
                        className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ish vaqti (tugashi)</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="time"
                        defaultValue="23:00"
                        className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Valyuta va soliq</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valyuta</label>
                    <select className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none">
                      <option>UZS - O'zbek so'mi</option>
                      <option>USD - AQSH dollari</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">QQS (%)</label>
                    <input
                      type="number"
                      defaultValue="12"
                      className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Bildirishnoma sozlamalari</h3>
              <div className="space-y-4">
                {[
                  { label: 'Yangi buyurtma', description: 'Yangi buyurtma kelganda xabar olish' },
                  { label: 'Buyurtma tayyor', description: 'Buyurtma tayyorlanganda xabar olish' },
                  { label: 'Kam qolgan mahsulot', description: 'Omborda mahsulot kam qolganda' },
                  { label: 'Kunlik hisobot', description: 'Har kuni statistika yuborish' },
                  { label: 'Email xabarnomalar', description: 'Email orqali xabar olish' },
                  { label: 'Push xabarnomalar', description: 'Brauzer xabarnomalarini yoqish' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-gray-800">{item.label}</p>
                      <p className="text-sm text-gray-500">{item.description}</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" defaultChecked={index < 4} className="peer sr-only" />
                      <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-gradient-to-r peer-checked:from-[#FF5722] peer-checked:to-[#E91E63] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-6">
              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Parolni o'zgartirish</h3>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Joriy parol</label>
                    <input
                      type="password"
                      className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Yangi parol</label>
                    <input
                      type="password"
                      className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Yangi parolni tasdiqlash</label>
                    <input
                      type="password"
                      className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none"
                    />
                  </div>
                  <button className="rounded-lg bg-gradient-to-r from-[#FF5722] to-[#E91E63] px-4 py-2 text-sm font-medium text-white">
                    Parolni yangilash
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Ikki bosqichli autentifikatsiya</h3>
                <p className="text-sm text-gray-500 mb-4">Hisobingizni qo'shimcha himoya qiling</p>
                <button className="rounded-lg border border-[#FF5722] px-4 py-2 text-sm font-medium text-[#FF5722] hover:bg-orange-50">
                  2FA ni yoqish
                </button>
              </div>
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Ko'rinish sozlamalari</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Mavzu</label>
                  <div className="flex gap-4">
                    {[
                      { id: 'light', name: 'Yorug\'', color: 'bg-white' },
                      { id: 'dark', name: 'Qorong\'u', color: 'bg-gray-900' },
                      { id: 'system', name: 'Tizim', color: 'bg-gradient-to-r from-white to-gray-900' },
                    ].map((theme) => (
                      <button
                        key={theme.id}
                        className={cn(
                          'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
                          theme.id === 'light' ? 'border-[#FF5722]' : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <div className={cn('h-12 w-20 rounded-lg border border-gray-200', theme.color)} />
                        <span className="text-sm font-medium text-gray-700">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Til</label>
                  <select className="w-full max-w-xs rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none">
                    <option>O'zbekcha</option>
                    <option>Русский</option>
                    <option>English</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'payment' && (
            <div className="space-y-6">
              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">To'lov usullari</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Naqd pul', description: 'Naqd to\'lov qabul qilish' },
                    { label: 'Bank kartasi', description: 'Visa, MasterCard, UzCard, Humo' },
                    { label: 'Payme', description: 'Payme orqali QR to\'lov' },
                    { label: 'Click', description: 'Click orqali to\'lov' },
                    { label: 'Uzum', description: 'Uzum QR to\'lov' },
                  ].map((method, index) => (
                    <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="font-medium text-gray-800">{method.label}</p>
                        <p className="text-sm text-gray-500">{method.description}</p>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input type="checkbox" defaultChecked className="peer sr-only" />
                        <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-gradient-to-r peer-checked:from-[#FF5722] peer-checked:to-[#E91E63] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'devices' && (
            <div className="space-y-6">
              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Printerlar</h3>
                <div className="space-y-3">
                  {[
                    { name: 'Kassa printer', type: 'Chek printeri', ip: '192.168.1.100', status: 'Ulangan' },
                    { name: 'Oshxona printer', type: 'Buyurtma printeri', ip: '192.168.1.101', status: 'Ulangan' },
                  ].map((printer, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                          <Printer className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{printer.name}</p>
                          <p className="text-xs text-gray-500">{printer.type} • {printer.ip}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                        {printer.status}
                      </span>
                    </div>
                  ))}
                </div>
                <button className="mt-4 flex items-center gap-2 rounded-lg border border-[#FF5722] px-4 py-2 text-sm font-medium text-[#FF5722] hover:bg-orange-50">
                  <Printer size={16} />
                  Yangi printer qo'shish
                </button>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Chek dizayni</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chek kengligi</label>
                    <select className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none">
                      <option>80mm</option>
                      <option>58mm</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Shrift o'lchami</label>
                    <select className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-gray-800 focus:border-[#FF5722] focus:outline-none">
                      <option>Kichik</option>
                      <option>O'rta</option>
                      <option>Katta</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    { label: 'Logotipni chiqarish', desc: 'Chek tepasida restoran logotipi' },
                    { label: 'QR kodni chiqarish', desc: 'Chek tagida fikr bildirish QR kodi' },
                    { label: 'Rahmat xabari', desc: '"Xaridingiz uchun rahmat!" xabari' },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.label}</p>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input type="checkbox" defaultChecked className="peer sr-only" />
                        <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-gradient-to-r peer-checked:from-[#FF5722] peer-checked:to-[#E91E63] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'integrations' && (
            <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Tashqi integratsiyalar</h3>
              <div className="space-y-3">
                {[
                  { name: 'Telegram Bot', description: 'Buyurtma bildirishnomalari', status: true },
                  { name: 'SMS xabar', description: 'Eskertish va tasdiq SMS', status: false },
                  { name: 'Yetkazib berish', description: 'Tashqi yetkazib berish xizmati', status: false },
                  { name: 'Buxgalteriya', description: '1C yoki boshqa tizim bilan sinxronlash', status: false },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                    <div>
                      <p className="font-medium text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        item.status ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      )}>
                        {item.status ? 'Faol' : 'O\'chirilgan'}
                      </span>
                      <button className="text-sm font-medium text-[#FF5722] hover:text-[#E91E63]">
                        Sozlash
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'backup' && (
            <div className="space-y-6">
              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Ma'lumotlar zaxirasi</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Tizim ma'lumotlarini zaxiralash va tiklash
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                    <div>
                      <p className="font-medium text-gray-800">So'nggi zaxira</p>
                      <p className="text-sm text-gray-500">2026-02-14 08:00</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                      Muvaffaqiyatli
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                    <div>
                      <p className="font-medium text-gray-800">Avtomatik zaxira</p>
                      <p className="text-sm text-gray-500">Har kuni soat 03:00 da</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" defaultChecked className="peer sr-only" />
                      <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-gradient-to-r peer-checked:from-[#FF5722] peer-checked:to-[#E91E63] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full"></div>
                    </label>
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <button className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#FF5722] to-[#E91E63] px-4 py-2 text-sm font-medium text-white hover:brightness-110">
                    <Database size={16} />
                    Hozir zaxiralash
                  </button>
                  <button className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <Download size={16} />
                    Yuklab olish
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
