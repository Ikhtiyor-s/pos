import { useState, useEffect } from 'react';
import { Loader2, Check } from 'lucide-react';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { categoryIcons, categoryColors } from '@/data/mockCategories';
import type { Category, CreateCategoryDto } from '@/types/category';

interface CategoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCategoryDto) => void;
  category?: Category | null;
  categories: Category[]; // Ota kategoriyalar uchun
  isLoading?: boolean;
}

// Boshlang'ich form qiymatlari
const initialFormData: CreateCategoryDto = {
  name: '',
  description: '',
  color: '#10B981',
  icon: '📁',
  parentId: '',
  status: 'active',
  displayOrder: 1,
  showOnReceipt: true,
  showAsSection: true,
  shortName: '',
  keywords: '',
};

export function CategoryForm({
  isOpen,
  onClose,
  onSubmit,
  category,
  categories,
  isLoading = false,
}: CategoryFormProps) {
  const [formData, setFormData] = useState<CreateCategoryDto>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Tahrirlash rejimida form qiymatlarini to'ldirish
  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        description: category.description || '',
        color: category.color,
        icon: category.icon || '📁',
        parentId: category.parentId || '',
        status: category.status,
        displayOrder: category.displayOrder,
        showOnReceipt: category.showOnReceipt,
        showAsSection: category.showAsSection,
        shortName: category.shortName || '',
        keywords: category.keywords?.join(', ') || '',
      });
    } else {
      setFormData({
        ...initialFormData,
        displayOrder: categories.length + 1,
      });
    }
    setErrors({});
  }, [category, isOpen, categories.length]);

  // Form maydonini yangilash
  const updateField = <K extends keyof CreateCategoryDto>(
    field: K,
    value: CreateCategoryDto[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // Validatsiya
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Kategoriya nomi kiritilishi shart';
    }
    if (formData.name.length > 50) {
      newErrors.name = 'Kategoriya nomi 50 belgidan oshmasligi kerak';
    }
    if (formData.shortName && formData.shortName.length > 12) {
      newErrors.shortName = 'Qisqartma nom 12 belgidan oshmasligi kerak';
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

  // Ota kategoriyalar uchun options (o'zini o'zi ota qilib bo'lmaydi)
  const parentOptions = [
    { value: '', label: 'Asosiy kategoriya (ota yo\'q)' },
    ...categories
      .filter((c) => c.id !== category?.id)
      .map((c) => ({
        value: c.id,
        label: `${c.icon || '📁'} ${c.name}`,
      })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={category ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya qo\'shish'}
      description={
        category
          ? `"${category.name}" kategoriyasini tahrirlash`
          : 'Yangi kategoriya ma\'lumotlarini kiriting'
      }
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
              {/* Kategoriya nomi */}
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Kategoriya nomi <span className="text-red-400">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="Masalan: Milliy taomlar"
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
                  Tavsif (ixtiyoriy)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Kategoriya haqida qisqacha tavsif..."
                  rows={2}
                  className="flex w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
                />
              </div>

              {/* Ota kategoriya */}
              <div>
                <Select
                  label="Ota kategoriya"
                  options={parentOptions}
                  value={formData.parentId || ''}
                  onChange={(value) => updateField('parentId', value)}
                />
              </div>

              {/* Tartib raqami */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Tartib raqami
                </label>
                <Input
                  type="number"
                  value={formData.displayOrder || ''}
                  onChange={(e) =>
                    updateField('displayOrder', Number(e.target.value))
                  }
                  min={1}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* ===== VIZUAL IDENTIFIKATORLAR ===== */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Vizual identifikatorlar
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Ikonka tanlash */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Ikonka
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-3 text-white"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-xl">{formData.icon}</span>
                      <span className="text-sm text-slate-400">Ikonka tanlang</span>
                    </span>
                  </button>

                  {showIconPicker && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowIconPicker(false)}
                      />
                      <div className="absolute left-0 top-full z-20 mt-1 grid w-full grid-cols-10 gap-1 rounded-lg border border-slate-700 bg-slate-800 p-2 shadow-xl">
                        {categoryIcons.map((icon) => (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => {
                              updateField('icon', icon);
                              setShowIconPicker(false);
                            }}
                            className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-colors',
                              formData.icon === icon
                                ? 'bg-orange-500 text-white'
                                : 'hover:bg-slate-700'
                            )}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Rang tanlash */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Rang
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-3 text-white"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-5 w-5 rounded"
                        style={{ backgroundColor: formData.color }}
                      />
                      <span className="text-sm text-slate-400">
                        {formData.color}
                      </span>
                    </span>
                  </button>

                  {showColorPicker && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowColorPicker(false)}
                      />
                      <div className="absolute left-0 top-full z-20 mt-1 grid w-full grid-cols-5 gap-2 rounded-lg border border-slate-700 bg-slate-800 p-3 shadow-xl">
                        {categoryColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => {
                              updateField('color', color);
                              setShowColorPicker(false);
                            }}
                            className={cn(
                              'flex h-8 items-center justify-center rounded-lg transition-transform hover:scale-110',
                              formData.color === color && 'ring-2 ring-white ring-offset-2 ring-offset-slate-800'
                            )}
                            style={{ backgroundColor: color }}
                          >
                            {formData.color === color && (
                              <Check size={16} className="text-white" />
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ===== DISPLAY SOZLAMALARI ===== */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
              Ko'rsatish sozlamalari
            </h3>
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                <div>
                  <p className="font-medium text-white">Kategoriyani faollashtirish</p>
                  <p className="text-sm text-slate-400">
                    Faol kategoriyalar menyuda ko'rinadi
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateField(
                      'status',
                      formData.status === 'active' ? 'inactive' : 'active'
                    )
                  }
                  className={cn(
                    'relative h-6 w-11 rounded-full transition-colors',
                    formData.status === 'active' ? 'bg-green-500' : 'bg-slate-600'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                      formData.status === 'active' ? 'left-5.5 translate-x-0' : 'left-0.5'
                    )}
                    style={{
                      transform:
                        formData.status === 'active'
                          ? 'translateX(20px)'
                          : 'translateX(0)',
                    }}
                  />
                </button>
              </div>

              {/* Chekda ko'rsatish */}
              <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                <div>
                  <p className="font-medium text-white">Chekda ko'rsatish</p>
                  <p className="text-sm text-slate-400">
                    Kategoriya nomi chekda chop etiladi
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateField('showOnReceipt', !formData.showOnReceipt)
                  }
                  className={cn(
                    'relative h-6 w-11 rounded-full transition-colors',
                    formData.showOnReceipt ? 'bg-green-500' : 'bg-slate-600'
                  )}
                >
                  <span
                    className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
                    style={{
                      transform: formData.showOnReceipt
                        ? 'translateX(20px)'
                        : 'translateX(2px)',
                    }}
                  />
                </button>
              </div>

              {/* Qisqartma nom va kalit so'zlar */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    Qisqartma nom (chek uchun)
                  </label>
                  <Input
                    value={formData.shortName || ''}
                    onChange={(e) => updateField('shortName', e.target.value)}
                    placeholder="max 12 belgi"
                    maxLength={12}
                    className={cn(
                      'bg-slate-800 border-slate-700 text-white',
                      errors.shortName && 'border-red-500'
                    )}
                  />
                  {errors.shortName && (
                    <p className="mt-1 text-sm text-red-400">{errors.shortName}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    Kalit so'zlar (ixtiyoriy)
                  </label>
                  <Input
                    value={formData.keywords || ''}
                    onChange={(e) => updateField('keywords', e.target.value)}
                    placeholder="osh, palov, milliy..."
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Vergul bilan ajrating
                  </p>
                </div>
              </div>
            </div>
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
            {category ? 'Saqlash' : 'Yaratish'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
