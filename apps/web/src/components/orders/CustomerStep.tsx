import { useState } from 'react';
import { Search, User, Phone, MapPin, Star, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NewOrderCustomer, mockCustomers, MockCustomer } from '@/types/newOrder';

interface CustomerStepProps {
  selectedCustomer: NewOrderCustomer | null;
  onSelectCustomer: (customer: NewOrderCustomer | null) => void;
  onNext: () => void;
  onSkip: () => void;
}

export function CustomerStep({
  selectedCustomer,
  onSelectCustomer,
  onNext,
  onSkip,
}: CustomerStepProps) {
  const [search, setSearch] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Partial<NewOrderCustomer>>({
    name: '',
    phone: '',
    address: '',
  });

  // Qidiruv natijalari
  const filteredCustomers = mockCustomers.filter((customer) => {
    const searchLower = search.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchLower) ||
      customer.phone.includes(search)
    );
  });

  // Mijozni tanlash
  const handleSelectCustomer = (customer: MockCustomer) => {
    onSelectCustomer({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      bonusPoints: customer.bonusPoints,
    });
  };

  // Yangi mijoz qo'shish
  const handleAddNewCustomer = () => {
    if (newCustomer.name && newCustomer.phone) {
      onSelectCustomer({
        name: newCustomer.name,
        phone: newCustomer.phone,
        address: newCustomer.address,
      });
      setShowNewForm(false);
    }
  };

  // Narxni formatlash
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' so\'m';
  };

  return (
    <div className="space-y-4">
      {/* Tanlangan mijoz */}
      {selectedCustomer && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                <User size={24} className="text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{selectedCustomer.name}</h3>
                <p className="text-sm text-gray-500">{selectedCustomer.phone}</p>
                {selectedCustomer.bonusPoints !== undefined && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={12} className="text-amber-400" />
                    <span className="text-xs text-amber-400">
                      {formatPrice(selectedCustomer.bonusPoints)} bonus
                    </span>
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectCustomer(null)}
              className="border-gray-300 text-gray-500"
            >
              <X size={16} className="mr-1" />
              Bekor
            </Button>
          </div>
        </div>
      )}

      {/* Qidiruv va yangi mijoz */}
      {!selectedCustomer && !showNewForm && (
        <>
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <Input
              type="text"
              placeholder="Ism yoki telefon raqam bo'yicha qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white border-gray-200 text-gray-900"
            />
          </div>

          {/* Mijozlar ro'yxati */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => handleSelectCustomer(customer)}
                  className="w-full flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 transition-all hover:border-orange-500/50 hover:bg-gray-100"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                    <User size={20} className="text-gray-500" />
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="font-medium text-gray-900">{customer.name}</h4>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Phone size={12} />
                        {customer.phone}
                      </span>
                      {customer.address && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <MapPin size={12} />
                          {customer.address}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Star size={14} className="text-amber-400" />
                      <span className="text-sm font-medium text-amber-400">
                        {formatPrice(customer.bonusPoints)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {customer.ordersCount} buyurtma
                    </span>
                  </div>
                </button>
              ))
            ) : search ? (
              <div className="py-8 text-center">
                <p className="text-gray-500">Mijoz topilmadi</p>
                <Button
                  variant="outline"
                  onClick={() => setShowNewForm(true)}
                  className="mt-3 border-orange-500/50 text-orange-400"
                >
                  <Plus size={16} className="mr-1" />
                  Yangi mijoz qo'shish
                </Button>
              </div>
            ) : (
              <div className="py-4 text-center text-gray-400">
                Qidiruv matnini kiriting
              </div>
            )}
          </div>

          {/* Yangi mijoz qo'shish tugmasi */}
          {!search && (
            <Button
              variant="outline"
              onClick={() => setShowNewForm(true)}
              className="w-full border-dashed border-gray-300 text-gray-500 hover:border-orange-500/50 hover:text-orange-400"
            >
              <Plus size={16} className="mr-2" />
              Yangi mijoz qo'shish
            </Button>
          )}
        </>
      )}

      {/* Yangi mijoz formasi */}
      {!selectedCustomer && showNewForm && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Yangi mijoz</h3>
            <button
              onClick={() => setShowNewForm(false)}
              className="text-gray-500 hover:text-gray-900"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-sm text-gray-500">
                Ism familiya *
              </label>
              <Input
                type="text"
                placeholder="Mijoz ismi"
                value={newCustomer.name}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, name: e.target.value })
                }
                className="bg-gray-200 border-gray-300 text-gray-900"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-gray-500">
                Telefon raqam *
              </label>
              <Input
                type="tel"
                placeholder="+998 90 123 45 67"
                value={newCustomer.phone}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, phone: e.target.value })
                }
                className="bg-gray-200 border-gray-300 text-gray-900"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-gray-500">
                Manzil (ixtiyoriy)
              </label>
              <Input
                type="text"
                placeholder="Manzil"
                value={newCustomer.address}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, address: e.target.value })
                }
                className="bg-gray-200 border-gray-300 text-gray-900"
              />
            </div>

            <Button
              onClick={handleAddNewCustomer}
              disabled={!newCustomer.name || !newCustomer.phone}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus size={16} className="mr-2" />
              Mijozni qo'shish
            </Button>
          </div>
        </div>
      )}

      {/* Harakatlar */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={onSkip}
          className="border-gray-300 text-gray-500"
        >
          O'tkazib yuborish
        </Button>
        <Button
          onClick={onNext}
          disabled={!selectedCustomer}
          className={cn(
            'bg-orange-500 hover:bg-orange-600 text-white',
            !selectedCustomer && 'opacity-50 cursor-not-allowed'
          )}
        >
          Davom etish
        </Button>
      </div>
    </div>
  );
}
