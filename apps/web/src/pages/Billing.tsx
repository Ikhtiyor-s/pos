import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  CreditCard,
  Package,
  FileText,
  BarChart3,
  Plug,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Clock,
  DollarSign,
  Warehouse,
  ChefHat,
  Users,
  Loader2,
  Eye,
  ToggleRight,
  ToggleLeft,
  RefreshCw,
  Zap,
  Shield,
  TrendingUp,
  Ban,
  CheckCircle,
  XCircle,
  Settings2,
  TestTube,
  ClipboardList,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { billingService } from '@/services/billing.service';
import type {
  Plan,
  CreatePlanDto,
  Subscription,
  BillingInvoice,
  UsageData,
  InvoiceSummary,
  InvoiceBreakdown,
  Integration,
  InvoiceStatus,
} from '@/types/billing';

// ============ HELPERS ============

const formatPrice = (price: number) =>
  new Intl.NumberFormat('uz-UZ').format(price) + ' so\'m';

const monthNames = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

const invoiceStatusMap: Record<InvoiceStatus, { label: string; color: string; icon: typeof Check }> = {
  PENDING: { label: 'Kutilmoqda', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  PAID: { label: 'To\'langan', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  OVERDUE: { label: 'Muddati o\'tgan', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  CANCELLED: { label: 'Bekor qilingan', color: 'bg-gray-100 text-gray-600', icon: Ban },
};

const subscriptionStatusMap: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Faol', color: 'bg-green-100 text-green-700' },
  EXPIRED: { label: 'Muddati tugagan', color: 'bg-red-100 text-red-700' },
  SUSPENDED: { label: 'To\'xtatilgan', color: 'bg-yellow-100 text-yellow-700' },
  CANCELLED: { label: 'Bekor qilingan', color: 'bg-gray-100 text-gray-600' },
};

type TabId = 'plans' | 'subscription' | 'invoices' | 'usage' | 'integrations';

const tabs: { id: TabId; label: string; icon: typeof CreditCard }[] = [
  { id: 'plans', label: 'Tarif rejalar', icon: Package },
  { id: 'subscription', label: 'Obuna', icon: CreditCard },
  { id: 'invoices', label: 'Hisob-fakturalar', icon: FileText },
  { id: 'usage', label: 'Foydalanish', icon: BarChart3 },
  { id: 'integrations', label: 'Integratsiyalar', icon: Plug },
];

// ============ MAIN PAGE ============

export function BillingPage() {
  const [activeTab, setActiveTab] = useState<TabId>('plans');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing va Xizmatlar</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tarif rejalar, obuna, to'lovlar va integratsiyalarni boshqaring
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-white text-orange-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'plans' && <PlansTab />}
      {activeTab === 'subscription' && <SubscriptionTab />}
      {activeTab === 'invoices' && <InvoicesTab />}
      {activeTab === 'usage' && <UsageTab />}
      {activeTab === 'integrations' && <IntegrationsTab />}
    </div>
  );
}

// ============ PLANS TAB ============

function PlansTab() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const data = await billingService.getPlans();
      setPlans(data);
    } catch (err) {
      console.error('Tarif rejalar yuklanmadi:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(id);
      await billingService.deletePlan(id);
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xatolik yuz berdi';
      alert(msg);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleFormSubmit = async (data: CreatePlanDto) => {
    try {
      if (editingPlan) {
        const updated = await billingService.updatePlan(editingPlan.id, data);
        setPlans((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
      } else {
        const created = await billingService.createPlan(data);
        setPlans((prev) => [...prev, created]);
      }
      setIsFormOpen(false);
      setEditingPlan(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xatolik yuz berdi';
      alert(msg);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Tarif rejalar</h2>
        <Button
          onClick={() => { setEditingPlan(null); setIsFormOpen(true); }}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Plus size={18} className="mr-2" />
          Yangi tarif
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16">
          <Package size={48} className="mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">Tarif rejalar yo'q</p>
          <p className="mt-1 text-sm text-gray-400">Birinchi tarif rejani yarating</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                'relative overflow-hidden rounded-xl border bg-white p-6 transition-shadow hover:shadow-lg',
                !plan.isActive && 'opacity-60'
              )}
            >
              {/* Badge */}
              {plan.isActive && (
                <div className="absolute right-4 top-4">
                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                    Faol
                  </span>
                </div>
              )}

              <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
              {plan.description && (
                <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
              )}

              {/* Price */}
              <div className="mt-4">
                <span className="text-3xl font-bold text-orange-600">
                  {formatPrice(Number(plan.basePrice))}
                </span>
                <span className="text-sm text-gray-500">/oy</span>
              </div>

              {/* Per-unit prices */}
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between text-gray-600">
                  <span className="flex items-center gap-2">
                    <Warehouse size={14} /> Ombor
                  </span>
                  <span className="font-medium">+{formatPrice(Number(plan.pricePerWarehouse))}/ta</span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span className="flex items-center gap-2">
                    <ChefHat size={14} /> Oshxona
                  </span>
                  <span className="font-medium">+{formatPrice(Number(plan.pricePerKitchen))}/ta</span>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <span className="flex items-center gap-2">
                    <Users size={14} /> Ofitsiant
                  </span>
                  <span className="font-medium">+{formatPrice(Number(plan.pricePerWaiter))}/ta</span>
                </div>
              </div>

              {/* Limits */}
              <div className="mt-4 border-t pt-4 space-y-1.5 text-sm text-gray-500">
                <p>Foydalanuvchilar: max <strong className="text-gray-900">{plan.maxUsers}</strong></p>
                <p>Buyurtmalar: <strong className="text-gray-900">{plan.maxOrders === 0 ? 'Cheksiz' : plan.maxOrders + '/oy'}</strong></p>
                <p>Omborlar: max <strong className="text-gray-900">{plan.maxWarehouses}</strong></p>
                <p>Oshxonalar: max <strong className="text-gray-900">{plan.maxKitchens}</strong></p>
                <p>Ofitsiantlar: max <strong className="text-gray-900">{plan.maxWaiters}</strong></p>
              </div>

              {/* Features */}
              <div className="mt-3 flex gap-2">
                {plan.hasIntegrations && (
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    Integratsiyalar
                  </span>
                )}
                {plan.hasReports && (
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                    Hisobotlar
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setEditingPlan(plan); setIsFormOpen(true); }}
                >
                  <Edit size={14} className="mr-1" /> Tahrirlash
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(plan.id)}
                  disabled={isDeleting === plan.id}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  {isDeleting === plan.id ? (
                    <Loader2 size={14} className="mr-1 animate-spin" />
                  ) : (
                    <Trash2 size={14} className="mr-1" />
                  )}
                  O'chirish
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plan Form Modal */}
      <PlanFormModal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingPlan(null); }}
        onSubmit={handleFormSubmit}
        plan={editingPlan}
      />
    </div>
  );
}

// ============ PLAN FORM MODAL ============

function PlanFormModal({
  isOpen,
  onClose,
  onSubmit,
  plan,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePlanDto) => Promise<void>;
  plan: Plan | null;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreatePlanDto>({
    name: '',
    basePrice: 0,
    pricePerWarehouse: 0,
    pricePerKitchen: 0,
    pricePerWaiter: 0,
    maxUsers: 5,
    maxOrders: 0,
    maxWarehouses: 1,
    maxKitchens: 1,
    maxWaiters: 2,
    hasIntegrations: false,
    hasReports: false,
    isActive: true,
  });

  useEffect(() => {
    if (plan) {
      setForm({
        name: plan.name,
        nameRu: plan.nameRu || '',
        nameEn: plan.nameEn || '',
        description: plan.description || '',
        basePrice: Number(plan.basePrice),
        pricePerWarehouse: Number(plan.pricePerWarehouse),
        pricePerKitchen: Number(plan.pricePerKitchen),
        pricePerWaiter: Number(plan.pricePerWaiter),
        maxUsers: plan.maxUsers,
        maxOrders: plan.maxOrders,
        maxWarehouses: plan.maxWarehouses,
        maxKitchens: plan.maxKitchens,
        maxWaiters: plan.maxWaiters,
        hasIntegrations: plan.hasIntegrations,
        hasReports: plan.hasReports,
        isActive: plan.isActive,
      });
    } else {
      setForm({
        name: '',
        basePrice: 0,
        pricePerWarehouse: 0,
        pricePerKitchen: 0,
        pricePerWaiter: 0,
        maxUsers: 5,
        maxOrders: 0,
        maxWarehouses: 1,
        maxKitchens: 1,
        maxWaiters: 2,
        hasIntegrations: false,
        hasReports: false,
        isActive: true,
      });
    }
  }, [plan, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
    } finally {
      setLoading(false);
    }
  };

  const updateField = <K extends keyof CreatePlanDto>(key: K, value: CreatePlanDto[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={plan ? 'Tarifni tahrirlash' : 'Yangi tarif yaratish'} size="lg">
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Asosiy */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase text-gray-400">Asosiy ma'lumotlar</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Tarif nomi *</label>
                <Input
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Masalan: Professional"
                  className="bg-white border-gray-300"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Tavsif</label>
                <textarea
                  value={form.description || ''}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Tarif haqida qisqacha tavsif"
                  rows={2}
                  className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Narxlar */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase text-gray-400">Narxlar (so'm)</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Asosiy narx *</label>
                <Input
                  type="number"
                  value={form.basePrice || ''}
                  onChange={(e) => updateField('basePrice', Number(e.target.value))}
                  placeholder="0"
                  className="bg-white border-gray-300"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Ombor uchun (har biri)</label>
                <Input
                  type="number"
                  value={form.pricePerWarehouse || ''}
                  onChange={(e) => updateField('pricePerWarehouse', Number(e.target.value))}
                  placeholder="0"
                  className="bg-white border-gray-300"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Oshxona uchun (har biri)</label>
                <Input
                  type="number"
                  value={form.pricePerKitchen || ''}
                  onChange={(e) => updateField('pricePerKitchen', Number(e.target.value))}
                  placeholder="0"
                  className="bg-white border-gray-300"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Ofitsiant uchun (har biri)</label>
                <Input
                  type="number"
                  value={form.pricePerWaiter || ''}
                  onChange={(e) => updateField('pricePerWaiter', Number(e.target.value))}
                  placeholder="0"
                  className="bg-white border-gray-300"
                />
              </div>
            </div>
          </div>

          {/* Limitlar */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase text-gray-400">Limitlar</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Max foydalanuvchilar</label>
                <Input type="number" value={form.maxUsers || ''} onChange={(e) => updateField('maxUsers', Number(e.target.value))} className="bg-white border-gray-300" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Max buyurtmalar (0=cheksiz)</label>
                <Input type="number" value={form.maxOrders ?? ''} onChange={(e) => updateField('maxOrders', Number(e.target.value))} className="bg-white border-gray-300" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Max omborlar</label>
                <Input type="number" value={form.maxWarehouses || ''} onChange={(e) => updateField('maxWarehouses', Number(e.target.value))} className="bg-white border-gray-300" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Max oshxonalar</label>
                <Input type="number" value={form.maxKitchens || ''} onChange={(e) => updateField('maxKitchens', Number(e.target.value))} className="bg-white border-gray-300" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Max ofitsiantlar</label>
                <Input type="number" value={form.maxWaiters || ''} onChange={(e) => updateField('maxWaiters', Number(e.target.value))} className="bg-white border-gray-300" />
              </div>
            </div>
          </div>

          {/* Xususiyatlar */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase text-gray-400">Xususiyatlar</h3>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.hasIntegrations}
                  onChange={(e) => updateField('hasIntegrations', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700">Integratsiyalar</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.hasReports}
                  onChange={(e) => updateField('hasReports', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700">Hisobotlar</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => updateField('isActive', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700">Faol</span>
              </label>
            </div>
          </div>
        </div>

        <ModalFooter className="-mx-6 -mb-4 mt-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Bekor qilish
          </Button>
          <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white">
            {loading && <Loader2 size={18} className="mr-2 animate-spin" />}
            {plan ? 'Saqlash' : 'Yaratish'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// ============ SUBSCRIPTION TAB ============

function SubscriptionTab() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isResourceOpen, setIsResourceOpen] = useState(false);
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Create form
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [createWarehouses, setCreateWarehouses] = useState(1);
  const [createKitchens, setCreateKitchens] = useState(1);
  const [createWaiters, setCreateWaiters] = useState(1);
  const [createNotes, setCreateNotes] = useState('');

  // Resources form
  const [resWarehouses, setResWarehouses] = useState(1);
  const [resKitchens, setResKitchens] = useState(1);
  const [resWaiters, setResWaiters] = useState(1);

  // Override form
  const [overridePrice, setOverridePrice] = useState<string>('');
  const [overrideNotes, setOverrideNotes] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [sub, plansData] = await Promise.all([
        billingService.getSubscription(),
        billingService.getPlans(true),
      ]);
      setSubscription(sub);
      setPlans(plansData);
      if (sub) {
        setResWarehouses(sub.warehouses);
        setResKitchens(sub.kitchens);
        setResWaiters(sub.waiters);
      }
    } catch (err) {
      console.error('Obuna yuklanmadi:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const sub = await billingService.createSubscription({
        planId: selectedPlanId,
        warehouses: createWarehouses,
        kitchens: createKitchens,
        waiters: createWaiters,
        notes: createNotes || undefined,
      });
      setSubscription(sub);
      setIsCreateOpen(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateResources = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const sub = await billingService.updateResources({
        warehouses: resWarehouses,
        kitchens: resKitchens,
        waiters: resWaiters,
      });
      setSubscription(sub);
      setIsResourceOpen(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setFormLoading(false);
    }
  };

  const handleOverridePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const priceValue = overridePrice === '' ? null : Number(overridePrice);
      const sub = await billingService.overridePrice({
        overridePrice: priceValue,
        notes: overrideNotes || undefined,
      });
      setSubscription(sub);
      setIsOverrideOpen(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16">
          <CreditCard size={48} className="mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">Faol obuna mavjud emas</p>
          <p className="mt-1 text-sm text-gray-400">Tarif rejasini tanlang va obuna bo'ling</p>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="mt-4 bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus size={18} className="mr-2" /> Obuna yaratish
          </Button>
        </div>

        {/* Create Subscription Modal */}
        <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Obuna yaratish" size="md">
          <form onSubmit={handleCreateSubscription}>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Tarif rejasi *</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
                  required
                >
                  <option value="">Tanlang...</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatPrice(Number(p.basePrice))}/oy
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Omborlar</label>
                  <Input type="number" value={createWarehouses} onChange={(e) => setCreateWarehouses(Number(e.target.value))} min={0} className="bg-white border-gray-300" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Oshxonalar</label>
                  <Input type="number" value={createKitchens} onChange={(e) => setCreateKitchens(Number(e.target.value))} min={0} className="bg-white border-gray-300" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Ofitsiantlar</label>
                  <Input type="number" value={createWaiters} onChange={(e) => setCreateWaiters(Number(e.target.value))} min={0} className="bg-white border-gray-300" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Izoh</label>
                <textarea
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  rows={2}
                  className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
                />
              </div>
            </div>
            <ModalFooter className="-mx-6 -mb-4 mt-6">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Bekor qilish</Button>
              <Button type="submit" disabled={formLoading} className="bg-orange-500 hover:bg-orange-600 text-white">
                {formLoading && <Loader2 size={18} className="mr-2 animate-spin" />}
                Obuna yaratish
              </Button>
            </ModalFooter>
          </form>
        </Modal>
      </div>
    );
  }

  const status = subscriptionStatusMap[subscription.status] || { label: subscription.status, color: 'bg-gray-100 text-gray-600' };

  return (
    <div className="space-y-6">
      {/* Obuna ma'lumotlari */}
      <div className="rounded-xl border bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">{subscription.plan.name}</h2>
              <span className={cn('rounded-full px-3 py-1 text-xs font-medium', status.color)}>
                {status.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {new Date(subscription.startDate).toLocaleDateString('uz')} — {new Date(subscription.endDate).toLocaleDateString('uz')}
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} variant="outline" size="sm">
            <RefreshCw size={14} className="mr-1" /> Tarif almashtirish
          </Button>
        </div>

        {/* Narx tafsiloti */}
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-orange-50 p-4">
            <p className="text-sm text-orange-600">Oylik to'lov</p>
            <p className="mt-1 text-2xl font-bold text-orange-700">{formatPrice(Number(subscription.totalPrice))}</p>
            {subscription.overridePrice !== null && (
              <p className="mt-1 text-xs text-orange-500">Qo'lda belgilangan</p>
            )}
          </div>
          <div className="rounded-lg bg-blue-50 p-4">
            <div className="flex items-center gap-2">
              <Warehouse size={16} className="text-blue-600" />
              <p className="text-sm text-blue-600">Omborlar</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-blue-700">{subscription.warehouses}</p>
          </div>
          <div className="rounded-lg bg-green-50 p-4">
            <div className="flex items-center gap-2">
              <ChefHat size={16} className="text-green-600" />
              <p className="text-sm text-green-600">Oshxonalar</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-green-700">{subscription.kitchens}</p>
          </div>
          <div className="rounded-lg bg-purple-50 p-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-purple-600" />
              <p className="text-sm text-purple-600">Ofitsiantlar</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-purple-700">{subscription.waiters}</p>
          </div>
        </div>

        {/* Amallar */}
        <div className="mt-6 flex gap-3">
          <Button
            onClick={() => {
              setResWarehouses(subscription.warehouses);
              setResKitchens(subscription.kitchens);
              setResWaiters(subscription.waiters);
              setIsResourceOpen(true);
            }}
            variant="outline"
          >
            <Settings2 size={16} className="mr-2" /> Resurslarni o'zgartirish
          </Button>
          <Button
            onClick={() => {
              setOverridePrice(subscription.overridePrice !== null ? String(subscription.overridePrice) : '');
              setOverrideNotes('');
              setIsOverrideOpen(true);
            }}
            variant="outline"
          >
            <DollarSign size={16} className="mr-2" /> Narxni belgilash
          </Button>
        </div>
      </div>

      {/* Resources Modal */}
      <Modal isOpen={isResourceOpen} onClose={() => setIsResourceOpen(false)} title="Resurslarni yangilash" size="sm">
        <form onSubmit={handleUpdateResources}>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Omborlar soni</label>
              <Input type="number" value={resWarehouses} onChange={(e) => setResWarehouses(Number(e.target.value))} min={0} className="bg-white border-gray-300" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Oshxonalar soni</label>
              <Input type="number" value={resKitchens} onChange={(e) => setResKitchens(Number(e.target.value))} min={0} className="bg-white border-gray-300" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Ofitsiantlar soni</label>
              <Input type="number" value={resWaiters} onChange={(e) => setResWaiters(Number(e.target.value))} min={0} className="bg-white border-gray-300" />
            </div>
          </div>
          <ModalFooter className="-mx-6 -mb-4 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsResourceOpen(false)}>Bekor qilish</Button>
            <Button type="submit" disabled={formLoading} className="bg-orange-500 hover:bg-orange-600 text-white">
              {formLoading && <Loader2 size={18} className="mr-2 animate-spin" />}
              Saqlash
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Override Price Modal */}
      <Modal isOpen={isOverrideOpen} onClose={() => setIsOverrideOpen(false)} title="Narxni belgilash" size="sm">
        <form onSubmit={handleOverridePrice}>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Narx (bo'sh qoldirsangiz — avtomatik hisoblanadi)
              </label>
              <Input
                type="number"
                value={overridePrice}
                onChange={(e) => setOverridePrice(e.target.value)}
                placeholder="Avtomatik"
                className="bg-white border-gray-300"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Izoh</label>
              <textarea
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                rows={2}
                className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
              />
            </div>
          </div>
          <ModalFooter className="-mx-6 -mb-4 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsOverrideOpen(false)}>Bekor qilish</Button>
            <Button type="submit" disabled={formLoading} className="bg-orange-500 hover:bg-orange-600 text-white">
              {formLoading && <Loader2 size={18} className="mr-2 animate-spin" />}
              Saqlash
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Create/Change subscription modal (reuse from above) */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Tarif almashtirish" size="md">
        <form onSubmit={handleCreateSubscription}>
          <div className="space-y-4">
            <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
              <p className="text-sm text-yellow-700">
                <AlertTriangle size={14} className="inline mr-1" />
                Yangi obuna yaratilganda hozirgi obuna bekor qilinadi
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Tarif rejasi *</label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
                required
              >
                <option value="">Tanlang...</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatPrice(Number(p.basePrice))}/oy
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Omborlar</label>
                <Input type="number" value={createWarehouses} onChange={(e) => setCreateWarehouses(Number(e.target.value))} min={0} className="bg-white border-gray-300" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Oshxonalar</label>
                <Input type="number" value={createKitchens} onChange={(e) => setCreateKitchens(Number(e.target.value))} min={0} className="bg-white border-gray-300" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Ofitsiantlar</label>
                <Input type="number" value={createWaiters} onChange={(e) => setCreateWaiters(Number(e.target.value))} min={0} className="bg-white border-gray-300" />
              </div>
            </div>
          </div>
          <ModalFooter className="-mx-6 -mb-4 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Bekor qilish</Button>
            <Button type="submit" disabled={formLoading} className="bg-orange-500 hover:bg-orange-600 text-white">
              {formLoading && <Loader2 size={18} className="mr-2 animate-spin" />}
              Obuna yaratish
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}

// ============ INVOICES TAB ============

function InvoicesTab() {
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<BillingInvoice | null>(null);
  const [breakdown, setBreakdown] = useState<InvoiceBreakdown | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Generate form
  const now = new Date();
  const [genYear, setGenYear] = useState(now.getFullYear());
  const [genMonth, setGenMonth] = useState(now.getMonth() + 1);

  // Pay form
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('');

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const [data, sum] = await Promise.all([
        billingService.getInvoices({
          status: statusFilter || undefined,
          page,
          limit: 20,
        }),
        billingService.getInvoiceSummary(),
      ]);
      setInvoices(data.invoices);
      setTotalPages(data.pagination.totalPages);
      setSummary(sum);
    } catch (err) {
      console.error('Hisob-fakturalar yuklanmadi:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await billingService.generateInvoice({ year: genYear, month: genMonth });
      setIsGenerateOpen(false);
      loadInvoices();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setFormLoading(false);
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setFormLoading(true);
    try {
      await billingService.payInvoice(selectedInvoice.id, {
        paidAmount: Number(payAmount),
        paymentMethod: payMethod,
      });
      setIsPayOpen(false);
      setSelectedInvoice(null);
      loadInvoices();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Bu hisob-fakturani bekor qilmoqchimisiz?')) return;
    try {
      await billingService.cancelInvoice(id);
      loadInvoices();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  const handleViewDetail = async (invoice: BillingInvoice) => {
    try {
      const data = await billingService.getInvoice(invoice.id);
      setSelectedInvoice(data.invoice);
      setBreakdown(data.breakdown);
      setIsDetailOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckOverdue = async () => {
    try {
      const result = await billingService.checkOverdue();
      alert(`${result.updated} ta hisob-faktura muddati o'tgan deb belgilandi`);
      loadInvoices();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border bg-white p-4">
            <p className="text-sm text-gray-500">Oylik tarif</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{formatPrice(summary.currentMonthlyPrice)}</p>
          </div>
          <div className="rounded-xl border bg-yellow-50 p-4">
            <p className="text-sm text-yellow-600">Kutilayotgan</p>
            <p className="mt-1 text-2xl font-bold text-yellow-700">{summary.pending.count} ta</p>
            <p className="text-sm text-yellow-600">{formatPrice(summary.pending.totalAmount)}</p>
          </div>
          <div className="rounded-xl border bg-green-50 p-4">
            <p className="text-sm text-green-600">To'langan</p>
            <p className="mt-1 text-2xl font-bold text-green-700">{summary.paid.count} ta</p>
            <p className="text-sm text-green-600">{formatPrice(summary.paid.totalPaid)}</p>
          </div>
          <div className="rounded-xl border bg-red-50 p-4">
            <p className="text-sm text-red-600">Muddati o'tgan</p>
            <p className="mt-1 text-2xl font-bold text-red-700">{summary.overdue.count} ta</p>
            <p className="text-sm text-red-600">{formatPrice(summary.overdue.totalAmount)}</p>
          </div>
        </div>
      )}

      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as InvoiceStatus | ''); setPage(1); }}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:ring-2 focus:ring-orange-500/50"
          >
            <option value="">Barchasi</option>
            <option value="PENDING">Kutilmoqda</option>
            <option value="PAID">To'langan</option>
            <option value="OVERDUE">Muddati o'tgan</option>
            <option value="CANCELLED">Bekor qilingan</option>
          </select>
          <Button variant="outline" size="sm" onClick={handleCheckOverdue}>
            <AlertTriangle size={14} className="mr-1" /> Muddati o'tganlarni tekshirish
          </Button>
        </div>
        <Button onClick={() => setIsGenerateOpen(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
          <Plus size={18} className="mr-2" /> Hisob-faktura yaratish
        </Button>
      </div>

      {/* Invoices table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16">
          <FileText size={48} className="mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">Hisob-fakturalar yo'q</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Raqam</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Davr</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Summa</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Muddat</th>
                <th className="w-36 px-4 py-3 text-right text-sm font-medium text-gray-600">Harakatlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => {
                const st = invoiceStatusMap[inv.status];
                const StatusIcon = st.icon;
                return (
                  <tr key={inv.id} className="transition-colors hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-medium text-gray-900">{inv.invoiceNumber}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {monthNames[inv.periodMonth - 1]} {inv.periodYear}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{formatPrice(Number(inv.totalAmount))}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', st.color)}>
                        <StatusIcon size={12} /> {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(inv.dueDate).toLocaleDateString('uz')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleViewDetail(inv)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                          <Eye size={16} />
                        </button>
                        {(inv.status === 'PENDING' || inv.status === 'OVERDUE') && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setPayAmount(String(Number(inv.totalAmount)));
                              setPayMethod('');
                              setIsPayOpen(true);
                            }}
                            className="rounded-lg p-2 text-green-600 hover:bg-green-50"
                            title="To'lov"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        {inv.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancel(inv.id)}
                            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                            title="Bekor qilish"
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Oldingi
          </Button>
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Keyingi
          </Button>
        </div>
      )}

      {/* Generate Invoice Modal */}
      <Modal isOpen={isGenerateOpen} onClose={() => setIsGenerateOpen(false)} title="Hisob-faktura yaratish" size="sm">
        <form onSubmit={handleGenerate}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Yil</label>
                <Input type="number" value={genYear} onChange={(e) => setGenYear(Number(e.target.value))} className="bg-white border-gray-300" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Oy</label>
                <select
                  value={genMonth}
                  onChange={(e) => setGenMonth(Number(e.target.value))}
                  className="block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:ring-2 focus:ring-orange-500/50"
                >
                  {monthNames.map((name, i) => (
                    <option key={i} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Hisob-faktura yoqilgan xizmatlar asosida avtomatik hisoblanadi
            </p>
          </div>
          <ModalFooter className="-mx-6 -mb-4 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsGenerateOpen(false)}>Bekor qilish</Button>
            <Button type="submit" disabled={formLoading} className="bg-orange-500 hover:bg-orange-600 text-white">
              {formLoading && <Loader2 size={18} className="mr-2 animate-spin" />}
              Yaratish
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Pay Invoice Modal */}
      <Modal isOpen={isPayOpen} onClose={() => setIsPayOpen(false)} title="To'lov qilish" size="sm">
        <form onSubmit={handlePay}>
          <div className="space-y-4">
            {selectedInvoice && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-sm text-gray-500">Hisob-faktura: <strong>{selectedInvoice.invoiceNumber}</strong></p>
                <p className="text-lg font-bold text-gray-900">{formatPrice(Number(selectedInvoice.totalAmount))}</p>
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">To'lov summasi *</label>
              <Input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0"
                className="bg-white border-gray-300"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">To'lov usuli *</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:ring-2 focus:ring-orange-500/50"
                required
              >
                <option value="">Tanlang...</option>
                <option value="cash">Naqd</option>
                <option value="card">Bank kartasi</option>
                <option value="transfer">Bank o'tkazmasi</option>
                <option value="payme">Payme</option>
                <option value="click">Click</option>
                <option value="uzum">Uzum</option>
              </select>
            </div>
          </div>
          <ModalFooter className="-mx-6 -mb-4 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsPayOpen(false)}>Bekor qilish</Button>
            <Button type="submit" disabled={formLoading} className="bg-green-600 hover:bg-green-700 text-white">
              {formLoading && <Loader2 size={18} className="mr-2 animate-spin" />}
              To'lovni tasdiqlash
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Invoice Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Hisob-faktura tafsiloti" size="md">
        {selectedInvoice && breakdown && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-lg font-bold text-gray-900">{selectedInvoice.invoiceNumber}</p>
                <p className="text-sm text-gray-500">
                  {monthNames[selectedInvoice.periodMonth - 1]} {selectedInvoice.periodYear}
                </p>
              </div>
              <span className={cn('rounded-full px-3 py-1 text-xs font-medium', invoiceStatusMap[selectedInvoice.status].color)}>
                {invoiceStatusMap[selectedInvoice.status].label}
              </span>
            </div>

            {/* Breakdown */}
            <div className="rounded-lg border">
              <div className="border-b bg-gray-50 px-4 py-2">
                <p className="text-sm font-semibold text-gray-700">Xizmatlar tafsiloti</p>
              </div>
              <div className="divide-y">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-600">Asosiy tarif</span>
                  <span className="font-medium text-gray-900">{formatPrice(breakdown.basePrice)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-600">
                    Omborlar ({breakdown.warehouses.count} × {formatPrice(breakdown.warehouses.pricePerUnit)})
                  </span>
                  <span className="font-medium text-gray-900">{formatPrice(breakdown.warehouses.total)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-600">
                    Oshxonalar ({breakdown.kitchens.count} × {formatPrice(breakdown.kitchens.pricePerUnit)})
                  </span>
                  <span className="font-medium text-gray-900">{formatPrice(breakdown.kitchens.total)}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-600">
                    Ofitsiantlar ({breakdown.waiters.count} × {formatPrice(breakdown.waiters.pricePerUnit)})
                  </span>
                  <span className="font-medium text-gray-900">{formatPrice(breakdown.waiters.total)}</span>
                </div>
                <div className="flex items-center justify-between bg-orange-50 px-4 py-3">
                  <span className="font-semibold text-orange-700">Jami</span>
                  <span className="text-lg font-bold text-orange-700">{formatPrice(breakdown.totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Payment info */}
            {selectedInvoice.paidAt && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                <p className="text-sm font-medium text-green-700">To'lov ma'lumotlari</p>
                <div className="mt-2 space-y-1 text-sm text-green-600">
                  <p>Summa: <strong>{formatPrice(Number(selectedInvoice.paidAmount))}</strong></p>
                  <p>Usul: <strong>{selectedInvoice.paymentMethod}</strong></p>
                  <p>Sana: <strong>{new Date(selectedInvoice.paidAt).toLocaleString('uz')}</strong></p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============ USAGE TAB ============

function UsageTab() {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    billingService.getUsage().then(setUsage).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!usage) return null;

  const usageItems = [
    { label: 'Foydalanuvchilar', icon: Users, ...usage.usage.users, color: 'blue' },
    { label: 'Buyurtmalar (oylik)', icon: ClipboardList, ...usage.usage.orders, color: 'orange' },
    { label: 'Omborlar', icon: Warehouse, ...usage.usage.warehouses, color: 'green' },
    { label: 'Oshxonalar', icon: ChefHat, ...usage.usage.kitchens, color: 'purple' },
    { label: 'Ofitsiantlar', icon: Users, ...usage.usage.waiters, color: 'pink' },
  ];

  return (
    <div className="space-y-6">
      {/* Subscription info */}
      {usage.subscription && (
        <div className="rounded-xl border bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{usage.subscription.plan}</h2>
              <p className="text-sm text-gray-500">Oylik to'lov: {formatPrice(Number(usage.subscription.totalPrice))}</p>
            </div>
            <span className={cn(
              'rounded-full px-3 py-1 text-xs font-medium',
              subscriptionStatusMap[usage.subscription.status]?.color || 'bg-gray-100 text-gray-600'
            )}>
              {subscriptionStatusMap[usage.subscription.status]?.label || usage.subscription.status}
            </span>
          </div>
        </div>
      )}

      {/* Usage bars */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {usageItems.map((item) => {
          const Icon = item.icon;
          const percentage = item.limit > 0 ? Math.min((item.current / item.limit) * 100, 100) : 0;
          const isUnlimited = item.limit === 0;
          const isWarning = percentage >= 80;
          const isDanger = percentage >= 95;

          return (
            <div key={item.label} className="rounded-xl border bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon size={18} className="text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {item.current} / {isUnlimited ? '∞' : item.limit}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    isDanger ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500',
                    isUnlimited && 'bg-blue-400'
                  )}
                  style={{ width: isUnlimited ? '10%' : `${percentage}%` }}
                />
              </div>
              {!isUnlimited && percentage >= 80 && (
                <p className={cn('mt-2 text-xs', isDanger ? 'text-red-500' : 'text-yellow-600')}>
                  {isDanger ? 'Limit tugash arafasida!' : 'Limitga yaqinlashmoqda'}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Features */}
      <div className="rounded-xl border bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase text-gray-400">Qo'shimcha xususiyatlar</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className={cn(
            'flex items-center gap-3 rounded-lg p-4 border',
            usage.features.hasIntegrations ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
          )}>
            <Plug size={24} className={usage.features.hasIntegrations ? 'text-green-600' : 'text-gray-400'} />
            <div>
              <p className="font-medium text-gray-900">Integratsiyalar</p>
              <p className="text-sm text-gray-500">{usage.features.hasIntegrations ? 'Yoqilgan' : 'Yoqilmagan'}</p>
            </div>
            {usage.features.hasIntegrations ? (
              <CheckCircle size={20} className="ml-auto text-green-600" />
            ) : (
              <XCircle size={20} className="ml-auto text-gray-400" />
            )}
          </div>
          <div className={cn(
            'flex items-center gap-3 rounded-lg p-4 border',
            usage.features.hasReports ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
          )}>
            <TrendingUp size={24} className={usage.features.hasReports ? 'text-green-600' : 'text-gray-400'} />
            <div>
              <p className="font-medium text-gray-900">Hisobotlar</p>
              <p className="text-sm text-gray-500">{usage.features.hasReports ? 'Yoqilgan' : 'Yoqilmagan'}</p>
            </div>
            {usage.features.hasReports ? (
              <CheckCircle size={20} className="ml-auto text-green-600" />
            ) : (
              <XCircle size={20} className="ml-auto text-gray-400" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ INTEGRATIONS TAB ============

function IntegrationsTab() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const loadIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await billingService.getIntegrations();
      setIntegrations(data);
    } catch (err) {
      console.error('Integratsiyalar yuklanmadi:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadIntegrations(); }, [loadIntegrations]);

  const handleToggle = async (id: string) => {
    try {
      const updated = await billingService.toggleIntegration(id);
      setIntegrations((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Xatolik');
    }
  };

  const handleOpenConfig = (integration: Integration) => {
    setSelectedIntegration(integration);
    setConfigForm(integration.config || {});
    setTestResult(null);
    setConfigOpen(true);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIntegration) return;
    setFormLoading(true);
    try {
      const updated = await billingService.updateIntegrationConfig(selectedIntegration.id, configForm);
      setIntegrations((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setConfigOpen(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setFormLoading(false);
    }
  };

  const handleTest = async () => {
    if (!selectedIntegration) return;
    setFormLoading(true);
    try {
      const result = await billingService.testIntegration(selectedIntegration.id);
      setTestResult(result);
    } catch (err: unknown) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : 'Test muvaffaqiyatsiz' });
    } finally {
      setFormLoading(false);
    }
  };

  // Integration config fields by key
  const configFields: Record<string, { label: string; placeholder: string; type?: string }[]> = {
    telegram: [
      { label: 'Bot Token', placeholder: '123456:ABC-DEF...' },
      { label: 'Chat ID', placeholder: '-1001234567890' },
    ],
    payme: [
      { label: 'Merchant ID', placeholder: 'merchant_id' },
      { label: 'Key', placeholder: 'secret_key', type: 'password' },
    ],
    click: [
      { label: 'Merchant ID', placeholder: 'merchant_id' },
      { label: 'Service ID', placeholder: 'service_id' },
      { label: 'Secret Key', placeholder: 'secret_key', type: 'password' },
    ],
    uzum: [
      { label: 'Terminal ID', placeholder: 'terminal_id' },
      { label: 'Secret Key', placeholder: 'secret_key', type: 'password' },
    ],
    delivery: [
      { label: 'API URL', placeholder: 'https://api.delivery.uz' },
      { label: 'API Key', placeholder: 'api_key', type: 'password' },
    ],
    crm: [
      { label: 'API URL', placeholder: 'https://crm.example.com/api' },
      { label: 'API Key', placeholder: 'api_key', type: 'password' },
    ],
  };

  const categoryIcons: Record<string, typeof Zap> = {
    payment: CreditCard,
    notification: Bell,
    delivery: Package,
    marketplace: Shield,
    crm: Users,
  };

  const categoryLabels: Record<string, string> = {
    payment: 'To\'lov tizimlari',
    notification: 'Bildirishnomalar',
    delivery: 'Yetkazib berish',
    marketplace: 'Marketplace',
    crm: 'CRM',
  };

  // Group by category
  const grouped = integrations.reduce((acc, int) => {
    const cat = int.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(int);
    return acc;
  }, {} as Record<string, Integration[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([category, items]) => {
        const CategoryIcon = categoryIcons[category] || Zap;
        return (
          <div key={category}>
            <div className="mb-4 flex items-center gap-2">
              <CategoryIcon size={20} className="text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                {categoryLabels[category] || category}
              </h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((integration) => (
                <div key={integration.id} className="rounded-xl border bg-white p-5 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{integration.name}</h4>
                      {integration.description && (
                        <p className="mt-1 text-sm text-gray-500">{integration.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggle(integration.id)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-colors',
                        integration.isActive
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-gray-100 text-gray-500 border border-gray-200'
                      )}
                    >
                      {integration.isActive ? (
                        <><ToggleRight size={16} /> Faol</>
                      ) : (
                        <><ToggleLeft size={16} /> O'chiq</>
                      )}
                    </button>
                  </div>
                  <div className="mt-4">
                    <Button variant="outline" size="sm" onClick={() => handleOpenConfig(integration)}>
                      <Settings2 size={14} className="mr-1" /> Sozlash
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {integrations.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-16">
          <Plug size={48} className="mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-500">Integratsiyalar topilmadi</p>
        </div>
      )}

      {/* Config Modal */}
      <Modal isOpen={configOpen} onClose={() => setConfigOpen(false)} title={selectedIntegration ? `${selectedIntegration.name} sozlamalari` : 'Sozlamalar'} size="md">
        <form onSubmit={handleSaveConfig}>
          <div className="space-y-4">
            {selectedIntegration && (configFields[selectedIntegration.key] || []).map((field, i) => {
              const fieldKey = field.label.toLowerCase().replace(/\s+/g, '_');
              return (
                <div key={i}>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">{field.label}</label>
                  <Input
                    type={field.type || 'text'}
                    value={configForm[fieldKey] || ''}
                    onChange={(e) => setConfigForm((prev) => ({ ...prev, [fieldKey]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="bg-white border-gray-300"
                  />
                </div>
              );
            })}

            {/* Agar config fieldlar yo'q bo'lsa — generic JSON editor */}
            {selectedIntegration && !configFields[selectedIntegration.key] && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Konfiguratsiya (JSON)</label>
                <textarea
                  value={JSON.stringify(configForm, null, 2)}
                  onChange={(e) => {
                    try {
                      setConfigForm(JSON.parse(e.target.value));
                    } catch { /* ignore */ }
                  }}
                  rows={6}
                  className="flex w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-orange-500/50"
                />
              </div>
            )}

            {/* Test result */}
            {testResult && (
              <div className={cn(
                'rounded-lg p-3 border',
                testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              )}>
                <p className={cn('text-sm font-medium', testResult.success ? 'text-green-700' : 'text-red-700')}>
                  {testResult.success ? '✓ Ulanish muvaffaqiyatli' : '✗ Ulanish muvaffaqiyatsiz'}
                </p>
                <p className={cn('text-sm', testResult.success ? 'text-green-600' : 'text-red-600')}>
                  {testResult.message}
                </p>
              </div>
            )}
          </div>
          <ModalFooter className="-mx-6 -mb-4 mt-6">
            <Button type="button" variant="outline" onClick={handleTest} disabled={formLoading}>
              <TestTube size={14} className="mr-1" /> Test qilish
            </Button>
            <Button type="button" variant="outline" onClick={() => setConfigOpen(false)}>Bekor qilish</Button>
            <Button type="submit" disabled={formLoading} className="bg-orange-500 hover:bg-orange-600 text-white">
              {formLoading && <Loader2 size={18} className="mr-2 animate-spin" />}
              Saqlash
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
