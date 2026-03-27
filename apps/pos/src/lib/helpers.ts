export function isAdminRole(role?: string): boolean {
  const r = role?.toLowerCase() || '';
  return ['super_admin', 'admin', 'manager', 'owner'].includes(r);
}

export function isCashierRole(role?: string): boolean {
  const r = role?.toLowerCase() || '';
  return r === 'cashier' || r === 'kassir';
}

export function isChefRole(role?: string): boolean {
  const r = role?.toLowerCase() || '';
  return ['chef', 'oshpaz', 'cook', 'kitchen'].includes(r);
}

export function isWaiterRole(role?: string): boolean {
  const r = role?.toLowerCase() || '';
  return ['waiter', 'ofitsiant'].includes(r);
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('uz-UZ').format(price) + " so'm";
}

export const CATEGORY_ICONS: Record<string, string> = {
  'osh': '🍛', 'salat': '🥗', 'shorva': '🍲', 'ichimlik': '🍵', 'shirinlik': '🍰',
  'taom': '🍛', 'non': '🍞', 'pishiriq': '🥟', 'desert': '🍰', 'default': '🍽️',
};

export const PAYMENT_METHODS = {
  cash: 'CASH',
  card: 'CARD',
  payme: 'PAYME',
  click: 'CLICK',
  uzum: 'UZUM',
} as const;

export const INITIAL_PRODUCT_FORM = {
  name: '', price: '', costPrice: '', categoryId: '', description: '',
  barcode: '', mxikCode: '', stockQuantity: '', weight: '',
};

export const INITIAL_STAFF_FORM = {
  firstName: '', lastName: '', email: '', phone: '', role: 'CASHIER', pin: '',
};

export const INITIAL_TABLE_FORM = {
  number: '', name: '', capacity: '4', floor: '1-etaj', status: 'free',
};

export function getStatusColor(status: string): string {
  switch (status) {
    case 'NEW': return 'bg-blue-500';
    case 'CONFIRMED': return 'bg-indigo-500';
    case 'PREPARING': return 'bg-yellow-500';
    case 'READY': return 'bg-green-500';
    case 'COMPLETED': return 'bg-gray-400';
    case 'CANCELLED': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'NEW': return 'Yangi';
    case 'CONFIRMED': return 'Tasdiqlangan';
    case 'PREPARING': return 'Tayyorlanmoqda';
    case 'READY': return 'Tayyor';
    case 'COMPLETED': return 'Yakunlangan';
    case 'CANCELLED': return 'Bekor qilingan';
    default: return status;
  }
}
