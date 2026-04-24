import React, { useState, useCallback, useEffect } from 'react';
import { cn } from '../../../lib/utils';
import { Gift, Search, Star, CheckCircle, Loader2, X } from 'lucide-react';
import api from '../../../services/api';
import { LoyaltyService, LoyaltyBalance } from '../../../services/loyalty.service';

const TIER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  BRONZE:   { label: 'Bronza',  color: 'text-orange-700',  bg: 'bg-orange-100 dark:bg-orange-900/30' },
  SILVER:   { label: 'Kumush',  color: 'text-gray-600',    bg: 'bg-gray-100 dark:bg-gray-700/50' },
  GOLD:     { label: 'Oltin',   color: 'text-yellow-700',  bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  PLATINUM: { label: 'Platina', color: 'text-purple-700',  bg: 'bg-purple-100 dark:bg-purple-900/30' },
};

interface LoyaltyPanelProps {
  orderId: string;
  orderTotal: number;
  /** Called with discount amount when points are spent */
  onPointsApplied: (discountAmount: number, pointsUsed: number, customerId: string) => void;
  /** Called when applied points are removed */
  onPointsRemoved: () => void;
  applied: boolean;
  appliedDiscount: number;
}

interface CustomerSearchResult {
  id: string;
  firstName?: string;
  lastName?: string;
  phone: string;
}

export default function LoyaltyPanel({
  orderId,
  orderTotal,
  onPointsApplied,
  onPointsRemoved,
  applied,
  appliedDiscount,
}: LoyaltyPanelProps) {
  const [phone, setPhone] = useState('');
  const [customer, setCustomer] = useState<CustomerSearchResult | null>(null);
  const [balance, setBalance] = useState<LoyaltyBalance | null>(null);
  const [maxPoints, setMaxPoints] = useState(0);
  const [maxDiscount, setMaxDiscount] = useState(0);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [searching, setSearching] = useState(false);
  const [applying, setApplying] = useState(false);
  const [searchError, setSearchError] = useState('');

  const effectiveTotal = applied ? orderTotal + appliedDiscount : orderTotal;

  const searchCustomer = useCallback(async () => {
    const q = phone.trim();
    if (q.length < 7) return;
    setSearching(true);
    setSearchError('');
    setBalance(null);
    setCustomer(null);
    try {
      const { data } = await api.get('/customers', { params: { search: q, limit: 1 } });
      const list: CustomerSearchResult[] = data.data?.customers || data.data || [];
      if (list.length === 0) {
        setSearchError('Mijoz topilmadi');
        return;
      }
      const found = list[0];
      setCustomer(found);

      const bal = await LoyaltyService.getBalance(found.id);
      setBalance(bal);

      const { maxPoints: mp, maxDiscount: md } = await LoyaltyService.calcMaxSpendable(
        found.id,
        effectiveTotal
      );
      setMaxPoints(mp);
      setMaxDiscount(md);
      setPointsToUse(mp);
    } catch {
      setSearchError('Xatolik yuz berdi');
    } finally {
      setSearching(false);
    }
  }, [phone, effectiveTotal]);

  useEffect(() => {
    if (applied) return;
    const t = setTimeout(() => {
      if (phone.trim().length >= 7) searchCustomer();
    }, 600);
    return () => clearTimeout(t);
  }, [phone, searchCustomer, applied]);

  const handleApply = async () => {
    if (!customer || pointsToUse <= 0 || !orderId) return;
    setApplying(true);
    try {
      const result = await LoyaltyService.spendPoints(customer.id, pointsToUse, orderId);
      onPointsApplied(result.discountAmount, result.spentPoints, customer.id);
    } catch (e: any) {
      setSearchError(e?.response?.data?.message || 'Ball sarflashda xatolik');
    } finally {
      setApplying(false);
    }
  };

  const handleRemove = () => {
    onPointsRemoved();
    setBalance(null);
    setCustomer(null);
    setPhone('');
    setPointsToUse(0);
    setMaxPoints(0);
    setMaxDiscount(0);
  };

  if (applied) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-800 dark:text-green-300">
              Ball chegirmasi qo'llandi
            </span>
          </div>
          <button
            onClick={handleRemove}
            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <p className="mt-1 text-xs text-green-700 dark:text-green-400">
          -{appliedDiscount.toLocaleString('uz-UZ')} so'm chegirma
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
        <Gift size={15} className="text-blue-500" />
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Sodiqlik ballari</span>
      </div>

      <div className="p-3 space-y-3">
        {/* Phone Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchCustomer()}
              placeholder="+998 90 123 45 67"
              className={cn(
                'w-full h-9 pl-3 pr-8 rounded-lg text-sm border',
                'bg-gray-50 dark:bg-gray-700/50',
                'border-gray-200 dark:border-gray-600',
                'text-gray-900 dark:text-gray-100 placeholder-gray-400',
                'focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
              )}
            />
            {searching && (
              <Loader2 size={14} className="absolute right-2 top-2.5 text-gray-400 animate-spin" />
            )}
          </div>
          <button
            onClick={searchCustomer}
            disabled={searching || phone.trim().length < 7}
            className={cn(
              'h-9 w-9 flex items-center justify-center rounded-lg',
              'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white',
              'disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
            )}
          >
            <Search size={15} />
          </button>
        </div>

        {/* Error */}
        {searchError && (
          <p className="text-xs text-red-500 dark:text-red-400">{searchError}</p>
        )}

        {/* Customer Balance */}
        {balance && customer && (
          <div className="space-y-2">
            {/* Customer Info */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {customer.firstName} {customer.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{customer.phone}</p>
              </div>
              {(() => {
                const tier = TIER_CONFIG[balance.tier] || TIER_CONFIG.BRONZE;
                return (
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', tier.bg, tier.color)}>
                    <Star size={10} className="inline mr-0.5" />
                    {tier.label}
                  </span>
                );
              })()}
            </div>

            {/* Balance */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400">Joriy balans</p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                  {balance.points.toLocaleString()} ball
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-blue-600 dark:text-blue-400">Chegirma qiymati</p>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  {balance.maxSpendableSum.toLocaleString()} so'm
                </p>
              </div>
            </div>

            {/* Points to use */}
            {maxPoints > 0 ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Ishlatish ({pointsToUse} ball)
                  </span>
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                    -{(pointsToUse * balance.pointsValue).toLocaleString()} so'm
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={maxPoints}
                  value={pointsToUse}
                  onChange={(e) => setPointsToUse(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setPointsToUse(Math.floor(maxPoints / 2))}
                    className="flex-1 h-7 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Yarmi
                  </button>
                  <button
                    onClick={() => setPointsToUse(maxPoints)}
                    className="flex-1 h-7 text-xs rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Hammasi
                  </button>
                </div>

                <button
                  onClick={handleApply}
                  disabled={applying || pointsToUse <= 0}
                  className={cn(
                    'w-full h-9 rounded-xl text-sm font-semibold',
                    'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                    'flex items-center justify-center gap-2 transition-colors'
                  )}
                >
                  {applying ? (
                    <><Loader2 size={14} className="animate-spin" /> Sarflanmoqda...</>
                  ) : (
                    <><Gift size={14} /> Ballar bilan to'lash</>
                  )}
                </button>
              </div>
            ) : (
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 py-1">
                Ushbu buyurtma uchun yetarli ball yo'q
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
