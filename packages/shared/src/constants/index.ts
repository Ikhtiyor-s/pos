// Order statuses with labels
export const ORDER_STATUS_LABELS: Record<string, { uz: string; ru: string; en: string }> = {
  NEW: { uz: 'Yangi', ru: 'Новый', en: 'New' },
  CONFIRMED: { uz: 'Tasdiqlangan', ru: 'Подтвержден', en: 'Confirmed' },
  PREPARING: { uz: 'Tayyorlanmoqda', ru: 'Готовится', en: 'Preparing' },
  READY: { uz: 'Tayyor', ru: 'Готов', en: 'Ready' },
  DELIVERING: { uz: 'Yetkazilmoqda', ru: 'Доставляется', en: 'Delivering' },
  COMPLETED: { uz: 'Yakunlangan', ru: 'Завершен', en: 'Completed' },
  CANCELLED: { uz: 'Bekor qilingan', ru: 'Отменен', en: 'Cancelled' },
};

// Item statuses with labels
export const ITEM_STATUS_LABELS: Record<string, { uz: string; ru: string; en: string }> = {
  PENDING: { uz: 'Kutilmoqda', ru: 'Ожидает', en: 'Pending' },
  PREPARING: { uz: 'Tayyorlanmoqda', ru: 'Готовится', en: 'Preparing' },
  READY: { uz: 'Tayyor', ru: 'Готов', en: 'Ready' },
  SERVED: { uz: 'Berilgan', ru: 'Подан', en: 'Served' },
  CANCELLED: { uz: 'Bekor qilingan', ru: 'Отменен', en: 'Cancelled' },
};

// Table statuses with labels
export const TABLE_STATUS_LABELS: Record<string, { uz: string; ru: string; en: string }> = {
  FREE: { uz: 'Bo\'sh', ru: 'Свободен', en: 'Free' },
  OCCUPIED: { uz: 'Band', ru: 'Занят', en: 'Occupied' },
  RESERVED: { uz: 'Bron qilingan', ru: 'Забронирован', en: 'Reserved' },
  CLEANING: { uz: 'Tozalanmoqda', ru: 'Уборка', en: 'Cleaning' },
};

// Order types with labels
export const ORDER_TYPE_LABELS: Record<string, { uz: string; ru: string; en: string }> = {
  DINE_IN: { uz: 'Stolda', ru: 'В зале', en: 'Dine In' },
  TAKEAWAY: { uz: 'Olib ketish', ru: 'С собой', en: 'Takeaway' },
  DELIVERY: { uz: 'Yetkazib berish', ru: 'Доставка', en: 'Delivery' },
};

// Payment methods with labels
export const PAYMENT_METHOD_LABELS: Record<string, { uz: string; ru: string; en: string }> = {
  CASH: { uz: 'Naqd', ru: 'Наличные', en: 'Cash' },
  CARD: { uz: 'Karta', ru: 'Карта', en: 'Card' },
  PAYME: { uz: 'Payme', ru: 'Payme', en: 'Payme' },
  CLICK: { uz: 'Click', ru: 'Click', en: 'Click' },
  UZUM: { uz: 'Uzum Bank', ru: 'Uzum Bank', en: 'Uzum Bank' },
  HUMO: { uz: 'Humo', ru: 'Humo', en: 'Humo' },
  OTHER: { uz: 'Boshqa', ru: 'Другое', en: 'Other' },
};

// Role labels
export const ROLE_LABELS: Record<string, { uz: string; ru: string; en: string }> = {
  SUPER_ADMIN: { uz: 'Super Admin', ru: 'Супер Админ', en: 'Super Admin' },
  MANAGER: { uz: 'Menejer', ru: 'Менеджер', en: 'Manager' },
  CASHIER: { uz: 'Kassir', ru: 'Кассир', en: 'Cashier' },
  CHEF: { uz: 'Oshpaz', ru: 'Повар', en: 'Chef' },
  WAREHOUSE: { uz: 'Omborchi', ru: 'Кладовщик', en: 'Warehouse' },
  ACCOUNTANT: { uz: 'Hisobchi', ru: 'Бухгалтер', en: 'Accountant' },
};

// Status colors for UI
export const ORDER_STATUS_COLORS: Record<string, string> = {
  NEW: '#3b82f6', // blue
  CONFIRMED: '#8b5cf6', // purple
  PREPARING: '#f59e0b', // amber
  READY: '#10b981', // emerald
  DELIVERING: '#06b6d4', // cyan
  COMPLETED: '#22c55e', // green
  CANCELLED: '#ef4444', // red
};

export const TABLE_STATUS_COLORS: Record<string, string> = {
  FREE: '#22c55e', // green
  OCCUPIED: '#ef4444', // red
  RESERVED: '#f59e0b', // amber
  CLEANING: '#6b7280', // gray
};

// Currency formatting
export const CURRENCIES = {
  UZS: { symbol: "so'm", code: 'UZS', decimals: 0 },
  USD: { symbol: '$', code: 'USD', decimals: 2 },
  EUR: { symbol: '€', code: 'EUR', decimals: 2 },
  RUB: { symbol: '₽', code: 'RUB', decimals: 2 },
};

// Units for inventory
export const INVENTORY_UNITS = [
  { value: 'kg', label: 'Kilogramm (kg)' },
  { value: 'g', label: 'Gramm (g)' },
  { value: 'litr', label: 'Litr (L)' },
  { value: 'ml', label: 'Millilitr (ml)' },
  { value: 'dona', label: 'Dona' },
  { value: 'pachka', label: 'Pachka' },
  { value: 'quti', label: 'Quti' },
];
