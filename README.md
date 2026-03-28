# Oshxona POS — Restoran Boshqaruv Tizimi v3.0

To'liq avtomatlashtirilgan restoran/kafe boshqaruvi va POS tizimi. Multi-tenant SaaS arxitektura, real-time buyurtma boshqaruvi, barcode/MXIK integratsiya.

## Loyiha Tuzilishi

```
oshxona-pos/
├── apps/
│   ├── api/          # Backend API (Express + Prisma + Socket.IO)
│   ├── pos/          # Kassir/Admin POS (React + Vite)
│   ├── kitchen/      # Oshpaz Paneli (React + Vite)
│   ├── waiter/       # Ofitsiant ilovasi (React + Vite + Capacitor)
│   ├── web/          # Admin Dashboard (React + Vite)
│   └── qr-menu/      # Mijoz QR Menyu (React + Vite)
│
├── packages/
│   ├── database/     # Prisma schema va client
│   ├── shared/       # Umumiy tiplar va utility
│   ├── config/       # Umumiy konfiguratsiya
│   └── offline-sync/ # Offline sinxronizatsiya
│
├── docker/           # Docker Compose + Dockerfile lar
└── API_DOCUMENTATION.md  # To'liq API hujjatlari
```

## Texnologiyalar

| Qatlam | Texnologiya |
|--------|------------|
| Backend | Node.js 20, Express.js, TypeScript, Prisma ORM |
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Zustand |
| Database | PostgreSQL 16, Redis 7 |
| Real-time | Socket.IO |
| Monorepo | Turborepo |
| Desktop | Electron |
| Mobile | Capacitor (Android/iOS) |
| Konteyner | Docker Compose |

## Tezkor O'rnatish

### Docker bilan (tavsiya etiladi)

```bash
# 1. Klonlash
git clone https://github.com/Ikhtiyor-s/pos.git
cd pos

# 2. Docker orqali ishga tushirish
cd docker
docker compose up -d

# 3. Seed data yaratish
docker exec oshxona-backend sh -c "cd /app/packages/database && npx tsx prisma/seed.ts"
```

Tayyor! Brauzerda oching:
- **POS Terminal**: http://localhost:4000
- **Backend API**: http://localhost:3000

### Dev rejimda (lokal)

```bash
# 1. Bog'liqliklarni o'rnatish
npm install

# 2. Environment sozlash
cp .env.example .env
# .env faylini tahrirlang

# 3. Database sozlash
npm run db:push
npm run db:seed

# 4. Barcha ilovalarni ishga tushirish
npm run dev
```

Dev portlar:
| Ilova | Port | Manzil |
|-------|------|--------|
| Backend API | 3000 | http://localhost:3000 |
| POS (Kassir/Admin) | 5174 | http://localhost:5174 |
| Kitchen (Oshpaz) | 5175 | http://localhost:5175 |
| Waiter (Ofitsiant) | 5176 | http://localhost:5176 |
| Web (Dashboard) | 5177 | http://localhost:5177 |
| QR-Menu (Mijoz) | 5180 | http://localhost:5180 |

## Demo Kirish Ma'lumotlari

| Rol | Email | Parol | PIN |
|-----|-------|-------|-----|
| Admin | admin@oshxona.uz | 1234 | 1234 |
| Manager | manager@oshxona.uz | manager123 | — |
| Kassir | kassir@oshxona.uz | 5678 | 5678 |
| Oshpaz | oshpaz@oshxona.uz | 9012 | 9012 |
| Ofitsiant | ofitsiant@oshxona.uz | 3456 | 3456 |

## Foydalanuvchi Rollari

| Rol | Vakolatlari |
|-----|-------------|
| **SUPER_ADMIN** | Barcha tenant boshqaruvi, billing, tizim sozlamalari |
| **MANAGER** | Mahsulot/kategoriya CRUD, xodimlar, hisobotlar, sozlamalar |
| **CASHIER** | Buyurtma yaratish, to'lov qabul qilish, stol boshqarish |
| **CHEF** | Oshxona buyurtmalari, taom statusi yangilash |
| **WAITER** | Stol ko'rish, buyurtma berish, mijozga xizmat |
| **WAREHOUSE** | Ombor boshqaruvi, stock, ta'minot buyurtmalari |
| **ACCOUNTANT** | Moliyaviy hisobotlar, invoice, kassir tarixi |

## Buyurtma Oqimi (Real-time)

```
Kassir/Ofitsiant/QR-Menu          Oshxona              Kassir
     ┌─────┐                    ┌─────┐              ┌─────┐
     │ NEW │ ──Socket.IO──────► │PREP │ ──Socket.IO─► │READY│ ──► COMPLETED
     └─────┘                    └─────┘              └─────┘
        │                          │                     │
    Buyurtma                   Oshpaz                  To'lov
    yaratildi                 tayyorlaydi              qilindi
```

**Status pipeline:**
`NEW → CONFIRMED → PREPARING → READY → DELIVERING → COMPLETED`

**Item statuses:**
`PENDING → PREPARING → READY → SERVED`

## Asosiy Funksiyalar

### POS Terminal (Kassir/Admin)
- Stollar bilan ishlash (floor plan, QR kod)
- Tezkor buyurtma qabul qilish
- Barcode skanerlash (USB, Kamera, Qo'lda)
- To'lov qabul qilish (naqd, karta, Payme, Click, Uzum)
- Admin panel: Dashboard, Mahsulotlar, Buyurtmalar, Xodimlar, Hisobotlar, Stollar, Ombor, Sozlamalar
- MXIK kod integratsiya (Soliq.uz)
- Printer boshqaruvi (XPrinter)

### Oshpaz Paneli
- Real-time buyurtmalar (Socket.IO)
- Taom statusi yangilash (Qabul → Tayyorlash → Tayyor)
- Ovozli bildirishnomalar

### Ofitsiant Ilovasi
- Stol tanlash va buyurtma berish
- Mahsulot qidirish
- Mavjud buyurtmaga qo'shimcha qilish
- PIN orqali tezkor kirish

### QR-Menu (Mijoz)
- QR kod skanerlash orqali menu ko'rish
- Autentifikatsiyasiz buyurtma berish
- Buyurtma holati kuzatish

### Admin Dashboard
- Daromad analitikasi (kunlik, haftalik, oylik, yillik)
- Top mahsulotlar, to'lov usullari statistikasi
- Xodimlar boshqaruvi
- Ombor boshqaruvi (purchase orders, waste logs, stock alerts)
- Integratsiyalar (Nonbor, Telegram, to'lov tizimlari)

## Tashqi Integratsiyalar

| Servis | Maqsad |
|--------|--------|
| **Tasnif.Soliq.uz** | MXIK kodlar bazasi (O'zbekiston soliq tasnifi) |
| **Open Food Facts** | Global barcode bazasi (mahsulot nomi, rasm, brend) |
| **Nonbor** | Onlayn buyurtmalar sinxronizatsiyasi |
| **Payme** | To'lov qabul qilish |
| **Click** | To'lov qabul qilish |
| **Uzum Bank** | To'lov qabul qilish |
| **Telegram** | Buyurtma bildirishnomalari |
| **Eskiz SMS** | SMS xabarnomalar |

## API Hujjatlari

To'liq API hujjatlari: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

### Asosiy endpointlar:

```
POST   /api/auth/login           # Kirish
POST   /api/auth/login-pin       # PIN orqali kirish
POST   /api/auth/forgot-password # Parol tiklash
GET    /api/products             # Mahsulotlar
POST   /api/orders               # Buyurtma yaratish
GET    /api/orders/kitchen       # Oshxona buyurtmalari
GET    /api/tables               # Stollar
GET    /api/qr-menu/:qrCode      # QR menu (public)
POST   /api/qr-menu/order        # QR buyurtma (public)
GET    /api/dashboard            # Dashboard statistika
GET    /api/mxik/scan/:barcode   # Barcode + MXIK lookup
```

## Kod Strukturasi (POS App)

```
apps/pos/src/
├── App.tsx                    # Asosiy router
├── types/index.ts             # Markazlashtirilgan tiplar
├── lib/helpers.ts             # Yordamchi funksiyalar
├── store/
│   ├── auth.ts                # Autentifikatsiya state
│   └── cart.ts                # Savat state
├── services/
│   ├── api.ts                 # Axios instance + interceptors
│   ├── product.service.ts     # Mahsulot API
│   ├── order.service.ts       # Buyurtma API
│   └── ...
├── components/
│   ├── Login.tsx              # Kirish sahifasi
│   ├── views/
│   │   ├── KitchenView.tsx    # Oshpaz ko'rinishi
│   │   └── WaiterView.tsx     # Ofitsiant ko'rinishi
│   ├── admin/
│   │   ├── DashboardTab.tsx   # Dashboard analitikasi
│   │   ├── ProductsTab.tsx    # Mahsulotlar CRUD + barcode
│   │   ├── OrdersTab.tsx      # Buyurtmalar tarixi
│   │   ├── TablesTab.tsx      # Stollar boshqaruvi
│   │   ├── StaffTab.tsx       # Xodimlar boshqaruvi
│   │   ├── ReportsTab.tsx     # Hisobotlar
│   │   └── SettingsTab.tsx    # Sozlamalar
│   ├── tablet/                # Tablet POS layout
│   └── shared/                # Umumiy komponentlar
```

## Xavfsizlik

- JWT autentifikatsiya (access + refresh tokens)
- Bcrypt parol hashing (salt rounds: 10)
- Socket.IO autentifikatsiya (token noto'g'ri = ulanish rad)
- Environment validation (server ishga tushganda tekshiriladi)
- Strict tenant isolation (multi-tenant xavfsizlik)
- Rate limiting (200 req/min global, 5 req/min login)
- CORS strict origin tekshiruvi
- Multer fayl validatsiyasi (jpeg/png/webp, 5MB limit)
- Prisma ORM (SQL injection himoya)
- Helmet security headers
- Order yaratish `$transaction` ichida (atomik)

## Docker

```bash
# Barcha servislarni ishga tushirish
cd docker && docker compose up -d

# Faqat backend qayta build
docker compose up --build -d backend

# Loglarni ko'rish
docker logs oshxona-backend -f

# Konteynerlar holati
docker ps --filter "name=oshxona"
```

Docker servislar:
| Servis | Port | Tavsif |
|--------|------|--------|
| oshxona-backend | 3000 | API + Socket.IO |
| oshxona-pos | 4000 | POS Frontend (nginx) |
| oshxona-postgres | 5432 | PostgreSQL 16 |
| oshxona-redis | 6379 | Redis 7 |

## Build

```bash
# Windows EXE (Electron)
npm run build:exe:pos
npm run build:exe:kitchen
npm run build:exe:waiter

# Android APK (Capacitor)
npm run build:apk:pos
npm run build:apk:waiter
```

## Skriptlar

```bash
npm run dev              # Barcha ilovalar dev mode
npm run build            # Barcha ilovalar build
npm run db:push          # Prisma schema push
npm run db:seed          # Demo data yaratish
npm run db:studio        # Prisma Studio (DB UI)
npm run db:migrate       # Migration yaratish
```

## Litsenziya

MIT License
