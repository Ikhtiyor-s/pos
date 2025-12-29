import { useState } from 'react';
import { Trash2, Plus, Minus, Percent, Tag, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NewOrderItem, NewOrderData } from '@/types/newOrder';

interface CartStepProps {
  items: NewOrderItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateItemNotes: (itemId: string, notes: string) => void;
  discountPercent: number;
  discountAmount: number;
  onDiscountChange: (percent: number, amount: number) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  orderType: NewOrderData['type'];
  onNext: () => void;
  onBack: () => void;
}

export function CartStep({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateItemNotes,
  discountPercent,
  discountAmount,
  onDiscountChange,
  notes,
  onNotesChange,
  orderType,
  onNext,
  onBack,
}: CartStepProps) {
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [showDiscount, setShowDiscount] = useState(discountPercent > 0 || discountAmount > 0);
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>(
    discountPercent > 0 ? 'percent' : 'amount'
  );

  // Hisoblashlar
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = orderType === 'delivery' ? 15000 : 0;

  // Chegirma hisoblash
  const calculateDiscount = () => {
    if (discountPercent > 0) {
      return Math.round(subtotal * (discountPercent / 100));
    }
    return discountAmount;
  };

  const discount = calculateDiscount();
  const total = subtotal + deliveryFee - discount;

  // Narxni formatlash
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price);
  };

  // Chegirmani o'zgartirish
  const handleDiscountChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    if (discountType === 'percent') {
      const clampedValue = Math.min(Math.max(numValue, 0), 100);
      onDiscountChange(clampedValue, 0);
    } else {
      const clampedValue = Math.min(Math.max(numValue, 0), subtotal);
      onDiscountChange(0, clampedValue);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mahsulotlar ro'yxati */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-400">
          Buyurtma elementlari ({items.length})
        </h3>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-700 bg-slate-800/50 p-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-white">{item.name}</h4>
                  <p className="text-sm text-orange-400">
                    {formatPrice(item.price)} x {item.quantity} ={' '}
                    <span className="font-semibold">
                      {formatPrice(item.price * item.quantity)} so'm
                    </span>
                  </p>

                  {/* Izoh */}
                  {editingNotes === item.id ? (
                    <div className="mt-2 flex gap-2">
                      <Input
                        type="text"
                        placeholder="Izoh qo'shing..."
                        defaultValue={item.notes}
                        className="h-8 text-sm bg-slate-700 border-slate-600"
                        autoFocus
                        onBlur={(e) => {
                          onUpdateItemNotes(item.id, e.target.value);
                          setEditingNotes(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            onUpdateItemNotes(item.id, e.currentTarget.value);
                            setEditingNotes(null);
                          }
                        }}
                      />
                    </div>
                  ) : item.notes ? (
                    <button
                      onClick={() => setEditingNotes(item.id)}
                      className="mt-1 text-xs text-slate-400 hover:text-white flex items-center gap-1"
                    >
                      <MessageSquare size={12} />
                      {item.notes}
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditingNotes(item.id)}
                      className="mt-1 text-xs text-slate-500 hover:text-slate-400 flex items-center gap-1"
                    >
                      <MessageSquare size={12} />
                      Izoh qo'shish
                    </button>
                  )}
                </div>

                {/* Miqdor va o'chirish */}
                <div className="flex items-center gap-3 ml-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        if (item.quantity === 1) {
                          onRemoveItem(item.id);
                        } else {
                          onUpdateQuantity(item.id, item.quantity - 1);
                        }
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-700 text-white hover:bg-slate-600"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm font-medium text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500 text-white hover:bg-orange-600"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="text-slate-400 hover:text-red-400"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chegirma */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Tag size={18} className="text-green-400" />
            <span className="font-medium text-white">Chegirma</span>
          </div>
          {!showDiscount ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDiscount(true)}
              className="border-slate-600 text-slate-400 text-xs"
            >
              <Plus size={14} className="mr-1" />
              Qo'shish
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowDiscount(false);
                onDiscountChange(0, 0);
              }}
              className="border-slate-600 text-slate-400 text-xs"
            >
              Bekor
            </Button>
          )}
        </div>

        {showDiscount && (
          <div className="space-y-3">
            {/* Chegirma turi */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setDiscountType('percent');
                  onDiscountChange(0, 0);
                }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors',
                  discountType === 'percent'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                    : 'bg-slate-700 text-slate-400'
                )}
              >
                <Percent size={16} />
                Foiz
              </button>
              <button
                onClick={() => {
                  setDiscountType('amount');
                  onDiscountChange(0, 0);
                }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors',
                  discountType === 'amount'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                    : 'bg-slate-700 text-slate-400'
                )}
              >
                <Tag size={16} />
                Summa
              </button>
            </div>

            {/* Chegirma qiymati */}
            <div className="relative">
              <Input
                type="number"
                placeholder={discountType === 'percent' ? '0-100%' : '0 so\'m'}
                value={discountType === 'percent' ? discountPercent || '' : discountAmount || ''}
                onChange={(e) => handleDiscountChange(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {discountType === 'percent' ? '%' : 'so\'m'}
              </span>
            </div>

            {discount > 0 && (
              <p className="text-sm text-green-400">
                Chegirma: -{formatPrice(discount)} so'm
              </p>
            )}
          </div>
        )}
      </div>

      {/* Buyurtma izohi */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-400">
          <MessageSquare size={16} />
          Buyurtma uchun izoh
        </label>
        <Input
          type="text"
          placeholder="Qo'shimcha ko'rsatmalar..."
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="bg-slate-700 border-slate-600 text-white"
        />
      </div>

      {/* Hisob-kitob */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Mahsulotlar:</span>
          <span className="text-white">{formatPrice(subtotal)} so'm</span>
        </div>

        {orderType === 'delivery' && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Yetkazish:</span>
            <span className="text-white">{formatPrice(deliveryFee)} so'm</span>
          </div>
        )}

        {discount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-green-400">Chegirma:</span>
            <span className="text-green-400">-{formatPrice(discount)} so'm</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-700">
          <span className="font-medium text-white">Jami:</span>
          <span className="text-xl font-bold text-orange-400">
            {formatPrice(total)} so'm
          </span>
        </div>
      </div>

      {/* Harakatlar */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-700">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-slate-600 text-slate-400"
        >
          Orqaga
        </Button>
        <Button
          onClick={onNext}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          To'lovga o'tish
        </Button>
      </div>
    </div>
  );
}
