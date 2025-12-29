import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Product, Category, CreateProductDto } from '@/types/product';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProductDto) => void;
  product?: Product | null; // Tahrirlash uchun
  categories: Category[];
  isLoading?: boolean;
}

// Boshlang'ich form qiymatlari
const initialFormData: CreateProductDto = {
  name: '',
  description: '',
  categoryId: '',
  price: 0,
  costPrice: 0,
  stock: 0,
  minStock: 10,
  unit: 'dona',
  image: '',
  status: 'active',
  sku: '',
  cookingTime: undefined,
  calories: undefined,
};

export function ProductForm({
  isOpen,
  onClose,
  onSubmit,
  product,
  categories,
  isLoading = false,
}: ProductFormProps) {
  const [formData, setFormData] = useState<CreateProductDto>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Tahrirlash rejimida form qiymatlarini to'ldirish
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || '',
        categoryId: product.categoryId,
        price: product.price,
        costPrice: product.costPrice,
        stock: product.stock,
        minStock: product.minStock,
        unit: product.unit,
        image: product.image || '',
        status: product.status,
        sku: product.sku,
        cookingTime: product.cookingTime,
        calories: product.calories,
      });
    } else {
      setFormData(initialFormData);
    }
    setErrors({});
  }, [product, isOpen]);

  // Form maydonini yangilash
  const updateField = <K extends keyof CreateProductDto>(
    field: K,
    value: CreateProductDto[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Xatoni tozalash
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // Validatsiya
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Mahsulot nomi kiritilishi shart';
    }
    if (!formData.categoryId) {
      newErrors.categoryId = 'Kategoriya tanlanishi shart';
    }
    if (formData.price <= 0) {
      newErrors.price = 'Narx 0 dan katta bo\'lishi kerak';
    }
    if (formData.costPrice < 0) {
      newErrors.costPrice = 'Tannarx manfiy bo\'lmasligi kerak';
    }
    if (formData.costPrice >= formData.price) {
      newErrors.costPrice = 'Tannarx sotuv narxidan kam bo\'lishi kerak';
    }
    if (formData.stock < 0) {
      newErrors.stock = 'Zahira manfiy bo\'lmasligi kerak';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Formni yuborish
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  // Foyda foizi va summasi
  const profitAmount = formData.price - formData.costPrice;
  const profitMargin = formData.price > 0
    ? Math.round((profitAmount / formData.price) * 100)
    : 0;

  // O'lchov birliklarri
  const unitOptions = [
    { value: 'dona', label: 'Dona' },
    { value: 'kg', label: 'Kilogramm' },
    { value: 'litr', label: 'Litr' },
    { value: 'porsiya', label: 'Porsiya' },
  ];

  // Status options
  const statusOptions = [
    { value: 'active', label: 'Faol' },
    { value: 'inactive', label: 'Nofaol' },
  ];

  // Kategoriya options
  const categoryOptions = categories.map((cat) => ({
    value: cat.id,
    label: cat.name,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot qo\'shish'}
      description={product ? `${product.name} ni tahrirlash` : 'Yangi mahsulot ma\'lumotlarini kiriting'}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* ===== ASOSIY MA'LUMOTLAR ===== */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Asosiy ma'lumotlar
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Mahsulot nomi */}
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Mahsulot nomi <span className="text-red-400">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Masalan: O'zbek oshi"
                  className={cn(
                    'bg-slate-800 border-slate-700 text-white',
                    errors.name && 'border-red-500'
                  )}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-400">{errors.name}</p>
                )}
              </div>

              {/* Tavsif */}
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Tavsif
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Mahsulot haqida qisqacha tavsif..."
                  rows={3}
                  className="flex w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
                />
              </div>

              {/* Kategoriya */}
              <div>
                <Select
                  label="Kategoriya"
                  options={categoryOptions}
                  value={formData.categoryId}
                  onChange={(value) => updateField('categoryId', value)}
                  placeholder="Kategoriya tanlang"
                  error={errors.categoryId}
                />
              </div>

              {/* SKU */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  SKU (Mahsulot kodi)
                </label>
                <Input
                  value={formData.sku}
                  onChange={(e) => updateField('sku', e.target.value.toUpperCase())}
                  placeholder="Masalan: OSH-001"
                  className="bg-slate-800 border-slate-700 text-white uppercase"
                />
              </div>
            </div>
          </div>

          {/* ===== NARX VA TANNARX ===== */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Narx va tannarx
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              {/* Sotuv narxi */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Sotuv narxi <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.price || ''}
                    onChange={(e) => updateField('price', Number(e.target.value))}
                    placeholder="0"
                    className={cn(
                      'bg-slate-800 border-slate-700 text-white pr-16',
                      errors.price && 'border-red-500'
                    )}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    so'm
                  </span>
                </div>
                {errors.price && (
                  <p className="mt-1 text-sm text-red-400">{errors.price}</p>
                )}
              </div>

              {/* Tannarx */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Tannarx <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.costPrice || ''}
                    onChange={(e) => updateField('costPrice', Number(e.target.value))}
                    placeholder="0"
                    className={cn(
                      'bg-slate-800 border-slate-700 text-white pr-16',
                      errors.costPrice && 'border-red-500'
                    )}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    so'm
                  </span>
                </div>
                {errors.costPrice && (
                  <p className="mt-1 text-sm text-red-400">{errors.costPrice}</p>
                )}
              </div>

              {/* Foyda ko'rsatkichi */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Foyda
                </label>
                <div className="flex h-10 items-center rounded-lg border border-slate-700 bg-slate-800/50 px-3">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      profitAmount > 0 ? 'text-green-400' : 'text-slate-400'
                    )}
                  >
                    {profitAmount > 0 ? '+' : ''}{profitAmount.toLocaleString()} so'm
                    <span className="ml-2 text-slate-500">({profitMargin}%)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ===== ZAHIRA BOSHQARUVI ===== */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Zahira boshqaruvi
            </h3>
            <div className="grid gap-4 md:grid-cols-4">
              {/* Joriy zahira */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Joriy zahira
                </label>
                <Input
                  type="number"
                  value={formData.stock || ''}
                  onChange={(e) => updateField('stock', Number(e.target.value))}
                  placeholder="0"
                  className={cn(
                    'bg-slate-800 border-slate-700 text-white',
                    errors.stock && 'border-red-500'
                  )}
                />
                {errors.stock && (
                  <p className="mt-1 text-sm text-red-400">{errors.stock}</p>
                )}
              </div>

              {/* Minimal zahira */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Minimal zahira
                </label>
                <Input
                  type="number"
                  value={formData.minStock || ''}
                  onChange={(e) => updateField('minStock', Number(e.target.value))}
                  placeholder="10"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              {/* O'lchov birligi */}
              <div>
                <Select
                  label="O'lchov birligi"
                  options={unitOptions}
                  value={formData.unit}
                  onChange={(value) => updateField('unit', value as CreateProductDto['unit'])}
                />
              </div>

              {/* Status */}
              <div>
                <Select
                  label="Status"
                  options={statusOptions}
                  value={formData.status || 'active'}
                  onChange={(value) => updateField('status', value as 'active' | 'inactive')}
                />
              </div>
            </div>
          </div>

          {/* ===== QO'SHIMCHA MA'LUMOTLAR ===== */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Qo'shimcha ma'lumotlar
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              {/* Tayyorlash vaqti */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Tayyorlash vaqti
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.cookingTime || ''}
                    onChange={(e) => updateField('cookingTime', Number(e.target.value) || undefined)}
                    placeholder="0"
                    className="bg-slate-800 border-slate-700 text-white pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    min
                  </span>
                </div>
              </div>

              {/* Kaloriya */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Kaloriya
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.calories || ''}
                    onChange={(e) => updateField('calories', Number(e.target.value) || undefined)}
                    placeholder="0"
                    className="bg-slate-800 border-slate-700 text-white pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    kkal
                  </span>
                </div>
              </div>

              {/* Rasm URL */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Rasm URL
                </label>
                <Input
                  value={formData.image || ''}
                  onChange={(e) => updateField('image', e.target.value)}
                  placeholder="https://..."
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            {/* Rasm preview */}
            {formData.image && (
              <div className="mt-4">
                <div className="relative h-32 w-32 overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
                  <img
                    src={formData.image}
                    alt="Preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '';
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <ModalFooter className="-mx-6 -mb-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="border-slate-700"
          >
            Bekor qilish
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isLoading && <Loader2 size={18} className="mr-2 animate-spin" />}
            {product ? 'Saqlash' : 'Qo\'shish'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
