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

// Order sources with labels
export const ORDER_SOURCE_LABELS: Record<string, { uz: string; ru: string; en: string }> = {
  POS_ORDER: { uz: 'POS Terminal', ru: 'POS Терминал', en: 'POS Terminal' },
  WAITER_ORDER: { uz: 'Ofitsiant', ru: 'Официант', en: 'Waiter' },
  QR_ORDER: { uz: 'QR Menyu', ru: 'QR Меню', en: 'QR Menu' },
  NONBOR_ORDER: { uz: 'Nonbor', ru: 'Nonbor', en: 'Nonbor' },
  TELEGRAM_ORDER: { uz: 'Telegram', ru: 'Telegram', en: 'Telegram' },
  WEBSITE_ORDER: { uz: 'Veb-sayt', ru: 'Веб-сайт', en: 'Website' },
  API_ORDER: { uz: 'Tashqi API', ru: 'Внешний API', en: 'External API' },
};

export const ORDER_SOURCE_COLORS: Record<string, string> = {
  POS_ORDER: '#3b82f6',     // blue
  WAITER_ORDER: '#8b5cf6',  // purple
  QR_ORDER: '#06b6d4',      // cyan
  NONBOR_ORDER: '#f97316',  // orange
  TELEGRAM_ORDER: '#0088cc', // telegram blue
  WEBSITE_ORDER: '#10b981',  // emerald
  API_ORDER: '#6b7280',      // gray
};

export const ORDER_SOURCE_ICONS: Record<string, string> = {
  POS_ORDER: '🖥️',
  WAITER_ORDER: '📋',
  QR_ORDER: '📱',
  NONBOR_ORDER: '🛒',
  TELEGRAM_ORDER: '✈️',
  WEBSITE_ORDER: '🌐',
  API_ORDER: '🔗',
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

// ==========================================
// FINANCE MODULE CONSTANTS
// ==========================================

export const EXPENSE_STATUS_LABELS: Record<string, { uz: string; ru: string; en: string }> = {
  PENDING: { uz: 'Kutilmoqda', ru: 'Ожидает', en: 'Pending' },
  APPROVED: { uz: 'Tasdiqlangan', ru: 'Одобрен', en: 'Approved' },
  REJECTED: { uz: 'Rad etilgan', ru: 'Отклонен', en: 'Rejected' },
  PAID: { uz: "To'langan", ru: 'Оплачен', en: 'Paid' },
};

export const EXPENSE_STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  APPROVED: '#3b82f6',
  REJECTED: '#ef4444',
  PAID: '#22c55e',
};

export const INCOME_SOURCE_LABELS: Record<string, { uz: string; ru: string; en: string }> = {
  ORDER: { uz: 'Buyurtma', ru: 'Заказ', en: 'Order' },
  REFUND: { uz: 'Qaytarish', ru: 'Возврат', en: 'Refund' },
  BONUS: { uz: 'Bonus', ru: 'Бонус', en: 'Bonus' },
  OTHER: { uz: 'Boshqa', ru: 'Другое', en: 'Other' },
};

export const REPORT_PERIOD_LABELS: Record<string, { uz: string; ru: string; en: string }> = {
  DAILY: { uz: 'Kunlik', ru: 'Ежедневно', en: 'Daily' },
  WEEKLY: { uz: 'Haftalik', ru: 'Еженедельно', en: 'Weekly' },
  MONTHLY: { uz: 'Oylik', ru: 'Ежемесячно', en: 'Monthly' },
};

// ==========================================
// ONLINE ORDERS MODULE CONSTANTS
// ==========================================

export const ONLINE_ORDER_SOURCE_LABELS: Record<string, { uz: string; ru: string; en: string }> = {
  NONBOR: { uz: 'Nonbor', ru: 'Nonbor', en: 'Nonbor' },
  TELEGRAM: { uz: 'Telegram', ru: 'Telegram', en: 'Telegram' },
  WEBSITE: { uz: 'Veb-sayt', ru: 'Веб-сайт', en: 'Website' },
  EXTERNAL_API: { uz: 'Tashqi API', ru: 'Внешний API', en: 'External API' },
};

export const ONLINE_ORDER_STATUS_LABELS: Record<string, { uz: string; ru: string; en: string }> = {
  RECEIVED: { uz: 'Qabul qilingan', ru: 'Получен', en: 'Received' },
  ACCEPTED: { uz: 'Qabul qilindi', ru: 'Принят', en: 'Accepted' },
  REJECTED: { uz: 'Rad etilgan', ru: 'Отклонен', en: 'Rejected' },
  MAPPED: { uz: 'Ulangan', ru: 'Связан', en: 'Mapped' },
  COMPLETED: { uz: 'Yakunlangan', ru: 'Завершен', en: 'Completed' },
  FAILED: { uz: 'Xatolik', ru: 'Ошибка', en: 'Failed' },
};

export const ONLINE_ORDER_SOURCE_COLORS: Record<string, string> = {
  NONBOR: '#f97316',
  TELEGRAM: '#0088cc',
  WEBSITE: '#8b5cf6',
  EXTERNAL_API: '#6b7280',
};

export const ONLINE_ORDER_STATUS_COLORS: Record<string, string> = {
  RECEIVED: '#3b82f6',
  ACCEPTED: '#22c55e',
  REJECTED: '#ef4444',
  MAPPED: '#8b5cf6',
  COMPLETED: '#10b981',
  FAILED: '#dc2626',
};

// ==========================================
// WAREHOUSE MODULE CONSTANTS
// ==========================================

export const PURCHASE_ORDER_STATUS_LABELS: Record<string, { uz: string; ru: string; en: string }> = {
  DRAFT: { uz: 'Qoralama', ru: 'Черновик', en: 'Draft' },
  SENT: { uz: 'Yuborilgan', ru: 'Отправлен', en: 'Sent' },
  PARTIAL: { uz: 'Qisman', ru: 'Частично', en: 'Partial' },
  RECEIVED: { uz: 'Qabul qilingan', ru: 'Получен', en: 'Received' },
  CANCELLED: { uz: 'Bekor qilingan', ru: 'Отменен', en: 'Cancelled' },
};

export const PURCHASE_ORDER_STATUS_COLORS: Record<string, string> = {
  DRAFT: '#6b7280',
  SENT: '#3b82f6',
  PARTIAL: '#f59e0b',
  RECEIVED: '#22c55e',
  CANCELLED: '#ef4444',
};

export const ALERT_SEVERITY_LABELS: Record<string, { uz: string; ru: string; en: string }> = {
  LOW: { uz: 'Past', ru: 'Низкий', en: 'Low' },
  MEDIUM: { uz: "O'rta", ru: 'Средний', en: 'Medium' },
  HIGH: { uz: 'Yuqori', ru: 'Высокий', en: 'High' },
  CRITICAL: { uz: 'Kritik', ru: 'Критический', en: 'Critical' },
};

export const ALERT_SEVERITY_COLORS: Record<string, string> = {
  LOW: '#6b7280',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};

// ==========================================
// NOTIFICATION MODULE CONSTANTS
// ==========================================

export const NOTIFICATION_TYPE_LABELS: Record<string, { uz: string; ru: string; en: string }> = {
  STOCK_LOW: { uz: 'Kam zaxira', ru: 'Мало запасов', en: 'Low Stock' },
  STOCK_EXPIRED: { uz: 'Muddati tugagan', ru: 'Истёк срок', en: 'Expired Stock' },
  ORDER_NEW: { uz: 'Yangi buyurtma', ru: 'Новый заказ', en: 'New Order' },
  ORDER_ONLINE: { uz: 'Online buyurtma', ru: 'Онлайн заказ', en: 'Online Order' },
  ORDER_CANCELLED: { uz: 'Bekor qilingan', ru: 'Отменён', en: 'Cancelled' },
  PAYMENT_RECEIVED: { uz: "To'lov qabul qilindi", ru: 'Оплата получена', en: 'Payment Received' },
  SHIFT_OPENED: { uz: 'Smena ochildi', ru: 'Смена открыта', en: 'Shift Opened' },
  SHIFT_CLOSED: { uz: 'Smena yopildi', ru: 'Смена закрыта', en: 'Shift Closed' },
  EXPENSE_PENDING: { uz: 'Xarajat kutilmoqda', ru: 'Расход ожидает', en: 'Expense Pending' },
  PURCHASE_ORDER: { uz: 'Xarid buyurtmasi', ru: 'Заказ поставщику', en: 'Purchase Order' },
  SYSTEM: { uz: 'Tizim', ru: 'Система', en: 'System' },
};

export const NOTIFICATION_CHANNEL_LABELS: Record<string, { uz: string; ru: string; en: string }> = {
  IN_APP: { uz: 'Ilova ichida', ru: 'В приложении', en: 'In App' },
  TELEGRAM: { uz: 'Telegram', ru: 'Telegram', en: 'Telegram' },
  SMS: { uz: 'SMS', ru: 'СМС', en: 'SMS' },
  PUSH: { uz: 'Push', ru: 'Push', en: 'Push' },
};

// ==========================================
// AI ANALYTICS CONSTANTS
// ==========================================

export const PRODUCT_CATEGORY_LABELS: Record<string, { uz: string; ru: string; en: string }> = {
  STAR: { uz: 'Yulduz', ru: 'Звезда', en: 'Star' },
  OPPORTUNITY: { uz: 'Imkoniyat', ru: 'Возможность', en: 'Opportunity' },
  WORKHORSE: { uz: 'Ishchan', ru: 'Рабочая лошадка', en: 'Workhorse' },
  PROBLEM: { uz: 'Muammo', ru: 'Проблема', en: 'Problem' },
};

export const FORECAST_TYPE_LABELS: Record<string, { uz: string; ru: string; en: string }> = {
  DEMAND: { uz: 'Talab', ru: 'Спрос', en: 'Demand' },
  REVENUE: { uz: 'Daromad', ru: 'Доход', en: 'Revenue' },
  INVENTORY: { uz: 'Zaxira', ru: 'Запасы', en: 'Inventory' },
};
