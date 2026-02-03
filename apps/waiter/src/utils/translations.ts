export type Language = 'uz' | 'ru' | 'en';

export const translations = {
  // Common
  loading: {
    uz: 'Yuklanmoqda...',
    ru: 'Загрузка...',
    en: 'Loading...',
  },
  error: {
    uz: 'Xatolik yuz berdi',
    ru: 'Произошла ошибка',
    en: 'An error occurred',
  },
  retry: {
    uz: 'Qayta urinish',
    ru: 'Повторить',
    en: 'Retry',
  },
  cancel: {
    uz: 'Bekor qilish',
    ru: 'Отмена',
    en: 'Cancel',
  },
  confirm: {
    uz: 'Tasdiqlash',
    ru: 'Подтвердить',
    en: 'Confirm',
  },
  save: {
    uz: 'Saqlash',
    ru: 'Сохранить',
    en: 'Save',
  },
  delete: {
    uz: "O'chirish",
    ru: 'Удалить',
    en: 'Delete',
  },
  clear: {
    uz: 'Tozalash',
    ru: 'Очистить',
    en: 'Clear',
  },
  total: {
    uz: 'Jami',
    ru: 'Итого',
    en: 'Total',
  },
  refresh: {
    uz: 'Yangilash',
    ru: 'Обновить',
    en: 'Refresh',
  },

  // Login Page
  login: {
    title: {
      uz: 'Tizimga kirish',
      ru: 'Вход в систему',
      en: 'Sign In',
    },
    phone: {
      uz: 'Telefon raqam',
      ru: 'Номер телефона',
      en: 'Phone number',
    },
    phonePlaceholder: {
      uz: '+998 90 123 45 67',
      ru: '+998 90 123 45 67',
      en: '+998 90 123 45 67',
    },
    password: {
      uz: 'Parol',
      ru: 'Пароль',
      en: 'Password',
    },
    passwordPlaceholder: {
      uz: 'Parolni kiriting',
      ru: 'Введите пароль',
      en: 'Enter password',
    },
    submit: {
      uz: 'Kirish',
      ru: 'Войти',
      en: 'Sign In',
    },
    submitting: {
      uz: 'Kirish...',
      ru: 'Вход...',
      en: 'Signing in...',
    },
    hint: {
      uz: 'Admin tomonidan berilgan telefon raqam va parol bilan kiring',
      ru: 'Войдите с номером телефона и паролем, предоставленными администратором',
      en: 'Sign in with the phone number and password provided by admin',
    },
    invalidCredentials: {
      uz: 'Telefon raqam yoki parol noto\'g\'ri',
      ru: 'Неверный номер телефона или пароль',
      en: 'Invalid phone number or password',
    },
    appName: {
      uz: 'Oshxona POS',
      ru: 'Oshxona POS',
      en: 'Oshxona POS',
    },
    appSubtitle: {
      uz: 'Ofitsiant ilovasi',
      ru: 'Приложение официанта',
      en: 'Waiter App',
    },
  },

  // Tables Page
  tables: {
    title: {
      uz: 'Stollar',
      ru: 'Столы',
      en: 'Tables',
    },
    free: {
      uz: "Bo'sh",
      ru: 'Свободен',
      en: 'Free',
    },
    occupied: {
      uz: 'Band',
      ru: 'Занят',
      en: 'Occupied',
    },
    reserved: {
      uz: 'Bron',
      ru: 'Забронирован',
      en: 'Reserved',
    },
    cleaning: {
      uz: 'Tozalanmoqda',
      ru: 'Уборка',
      en: 'Cleaning',
    },
    summary: {
      uz: '{free} ta bo\'sh, {occupied} ta band',
      ru: '{free} свободных, {occupied} занятых',
      en: '{free} free, {occupied} occupied',
    },
    orders: {
      uz: 'Buyurtmalar',
      ru: 'Заказы',
      en: 'Orders',
    },
  },

  // Menu Page
  menu: {
    title: {
      uz: 'Stol #{number}',
      ru: 'Стол #{number}',
      en: 'Table #{number}',
    },
    subtitle: {
      uz: 'Buyurtma qabul qiling',
      ru: 'Примите заказ',
      en: 'Take an order',
    },
    allCategories: {
      uz: 'Barchasi',
      ru: 'Все',
      en: 'All',
    },
    noProducts: {
      uz: 'Mahsulotlar topilmadi',
      ru: 'Товары не найдены',
      en: 'No products found',
    },
    existingOrders: {
      uz: 'Mavjud buyurtmalar',
      ru: 'Текущие заказы',
      en: 'Existing orders',
    },
    newOrder: {
      uz: 'Yangi buyurtma',
      ru: 'Новый заказ',
      en: 'New order',
    },
    guestCount: {
      uz: 'Mehmonlar soni',
      ru: 'Количество гостей',
      en: 'Number of guests',
    },
    addToOrder: {
      uz: "Qo'shish",
      ru: 'Добавить',
      en: 'Add',
    },
    confirmOrder: {
      uz: 'Tasdiqlash',
      ru: 'Подтвердить',
      en: 'Confirm',
    },
    orderError: {
      uz: 'Xatolik yuz berdi. Qayta urinib ko\'ring.',
      ru: 'Произошла ошибка. Попробуйте снова.',
      en: 'An error occurred. Please try again.',
    },
  },

  // Order Status
  orderStatus: {
    NEW: {
      uz: 'Yangi',
      ru: 'Новый',
      en: 'New',
    },
    CONFIRMED: {
      uz: 'Tasdiqlangan',
      ru: 'Подтверждён',
      en: 'Confirmed',
    },
    PREPARING: {
      uz: 'Tayyorlanmoqda',
      ru: 'Готовится',
      en: 'Preparing',
    },
    READY: {
      uz: 'Tayyor',
      ru: 'Готов',
      en: 'Ready',
    },
    SERVED: {
      uz: 'Berildi',
      ru: 'Подан',
      en: 'Served',
    },
    COMPLETED: {
      uz: 'Yakunlangan',
      ru: 'Завершён',
      en: 'Completed',
    },
    CANCELLED: {
      uz: 'Bekor qilingan',
      ru: 'Отменён',
      en: 'Cancelled',
    },
  },

  // Profile Page
  profile: {
    title: {
      uz: 'Profil',
      ru: 'Профиль',
      en: 'Profile',
    },
    logout: {
      uz: 'Chiqish',
      ru: 'Выход',
      en: 'Logout',
    },
    logoutConfirm: {
      uz: 'Tizimdan chiqishni xohlaysizmi?',
      ru: 'Вы хотите выйти из системы?',
      en: 'Do you want to logout?',
    },
    attendance: {
      uz: 'Bugungi davomat',
      ru: 'Посещаемость сегодня',
      en: "Today's attendance",
    },
    status: {
      uz: 'Holat',
      ru: 'Статус',
      en: 'Status',
    },
    checkIn: {
      uz: 'Kelish vaqti',
      ru: 'Время прихода',
      en: 'Check-in time',
    },
    checkOut: {
      uz: 'Ketish vaqti',
      ru: 'Время ухода',
      en: 'Check-out time',
    },
    checkInBtn: {
      uz: 'Ishga keldim',
      ru: 'Пришёл на работу',
      en: 'Check In',
    },
    checkOutBtn: {
      uz: 'Ishdan ketdim',
      ru: 'Ушёл с работы',
      en: 'Check Out',
    },
    workDayEnded: {
      uz: 'Ish kuni yakunlandi',
      ru: 'Рабочий день завершён',
      en: 'Work day ended',
    },
    todayStats: {
      uz: 'Bugungi statistika',
      ru: 'Статистика за сегодня',
      en: "Today's statistics",
    },
    ordersCount: {
      uz: 'Buyurtmalar',
      ru: 'Заказы',
      en: 'Orders',
    },
    completedOrders: {
      uz: 'Bajarilgan',
      ru: 'Выполнено',
      en: 'Completed',
    },
    totalSales: {
      uz: 'Jami savdo',
      ru: 'Общие продажи',
      en: 'Total sales',
    },
    averageOrder: {
      uz: "O'rtacha",
      ru: 'Средний',
      en: 'Average',
    },
    role: {
      WAITER: {
        uz: 'Ofitsiant',
        ru: 'Официант',
        en: 'Waiter',
      },
      CASHIER: {
        uz: 'Kassir',
        ru: 'Кассир',
        en: 'Cashier',
      },
      CHEF: {
        uz: 'Oshpaz',
        ru: 'Повар',
        en: 'Chef',
      },
      MANAGER: {
        uz: 'Menejer',
        ru: 'Менеджер',
        en: 'Manager',
      },
      SUPER_ADMIN: {
        uz: 'Administrator',
        ru: 'Администратор',
        en: 'Administrator',
      },
    },
  },

  // Attendance Status
  attendanceStatus: {
    PRESENT: {
      uz: 'Ishda',
      ru: 'На работе',
      en: 'Present',
    },
    ABSENT: {
      uz: 'Kelmadi',
      ru: 'Отсутствует',
      en: 'Absent',
    },
    LATE: {
      uz: 'Kechikdi',
      ru: 'Опоздал',
      en: 'Late',
    },
    LEAVE: {
      uz: "Ta'tilda",
      ru: 'В отпуске',
      en: 'On leave',
    },
    SICK: {
      uz: 'Kasal',
      ru: 'Болен',
      en: 'Sick',
    },
    notSet: {
      uz: 'Belgilanmagan',
      ru: 'Не отмечен',
      en: 'Not set',
    },
  },

  // Time
  time: {
    justNow: {
      uz: 'Hozirgina',
      ru: 'Только что',
      en: 'Just now',
    },
    minutesAgo: {
      uz: '{min} min oldin',
      ru: '{min} мин назад',
      en: '{min} min ago',
    },
    hoursAgo: {
      uz: '{hours} soat oldin',
      ru: '{hours} ч назад',
      en: '{hours} h ago',
    },
  },

  // Language names
  languages: {
    uz: "O'zbekcha",
    ru: 'Русский',
    en: 'English',
  },
} as const;

export type TranslationKey = keyof typeof translations;
