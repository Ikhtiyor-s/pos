# Oshxona POS Tizimi

To'liq avtomatlashtirilgan oshxona (restoran, kafe) boshqaruvi va POS tizimi.

## Loyiha Tuzilishi

```
oshxona-pos/
├── apps/
│   ├── api/          # Backend API (Node.js + Express)
│   ├── web/          # Admin Dashboard (React + Vite)
│   ├── pos/          # Kassir POS (React + Vite)
│   ├── kitchen/      # Oshpaz Paneli (React + Vite)
│   └── mobile/       # Mobil ilova (React Native) - keyingi bosqich
│
├── packages/
│   ├── database/     # Prisma schema va migrations
│   ├── shared/       # Umumiy tiplar va utility'lar
│   ├── ui/           # Umumiy UI komponentlar
│   └── config/       # ESLint, TypeScript konfiguratsiyalar
│
├── docker/           # Docker compose fayllari
└── docs/             # Hujjatlar
```

## Texnologiyalar

- **Backend**: Node.js, Express.js, TypeScript, Prisma
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Shadcn/ui
- **Database**: PostgreSQL, Redis
- **Real-time**: Socket.io
- **Monorepo**: Turborepo

## O'rnatish

### 1. Talablar

- Node.js 20+
- PostgreSQL 16+
- Redis (ixtiyoriy, keshlash uchun)
- Docker (ixtiyoriy)

### 2. Repository'ni klonlash

```bash
git clone <repository-url>
cd oshxona-pos
```

### 3. Bog'liqliklarni o'rnatish

```bash
npm install
```

### 4. Environment o'zgaruvchilarini sozlash

```bash
cp .env.example .env
```

`.env` faylini tahrirlang va kerakli qiymatlarni kiriting.

### 5. Docker orqali database'ni ishga tushirish

```bash
cd docker
docker-compose up -d
```

### 6. Prisma migratsiyalarni bajarish

```bash
npm run db:push
npm run db:seed
```

### 7. Development serverni ishga tushirish

```bash
npm run dev
```

## Portlar

- **API**: http://localhost:3000
- **Admin Dashboard**: http://localhost:5173
- **POS Terminal**: http://localhost:5174
- **Oshpaz Paneli**: http://localhost:5175
- **Adminer (DB)**: http://localhost:8080

## Demo kirish ma'lumotlari

- **Admin**: admin@oshxona.uz / admin123
- **Kassir**: kassir@oshxona.uz / kassir123
- **Oshpaz**: oshpaz@oshxona.uz / oshpaz123

## Asosiy Funksiyalar

### Admin Dashboard
- Foydalanuvchilar boshqaruvi
- Mahsulotlar va kategoriyalar
- Buyurtmalar monitoringi
- Hisobotlar va analitika
- Ombor boshqaruvi
- Tizim sozlamalari

### POS Terminal
- Tezkor buyurtma qabul qilish
- Stollar bilan ishlash
- To'lov qabul qilish (naqd, karta, Payme, Click)
- Chek chiqarish

### Oshpaz Paneli
- Real-time buyurtmalar
- Buyurtma holatini yangilash
- Ovozli bildirishnomalar

### QR Menyu
- Har bir stol uchun QR kod
- Mijoz telefoni orqali menyu ko'rish
- Onlayn buyurtma berish

## API Endpointlar

### Autentifikatsiya
- `POST /api/auth/login` - Tizimga kirish
- `POST /api/auth/register` - Ro'yxatdan o'tish
- `POST /api/auth/refresh` - Token yangilash
- `GET /api/auth/me` - Joriy foydalanuvchi

### Mahsulotlar
- `GET /api/products` - Barcha mahsulotlar
- `POST /api/products` - Yangi mahsulot
- `PUT /api/products/:id` - Mahsulotni yangilash
- `DELETE /api/products/:id` - Mahsulotni o'chirish

### Buyurtmalar
- `GET /api/orders` - Barcha buyurtmalar
- `POST /api/orders` - Yangi buyurtma
- `PATCH /api/orders/:id/status` - Holat yangilash
- `GET /api/orders/kitchen` - Oshpaz uchun buyurtmalar

### Stollar
- `GET /api/tables` - Barcha stollar
- `GET /api/tables/:id/qr` - QR kod olish

## Loyiha Bosqichlari

### Bosqich 1: MVP (Tayyor)
- [x] Monorepo strukturasi
- [x] Backend API asosiy funksiyalar
- [x] Admin Dashboard asosiy sahifalar
- [x] POS Terminal asosiy funksiyalar
- [x] Oshpaz paneli

### Bosqich 2: To'liq funksionallik
- [ ] Ombor boshqaruvi
- [ ] Hisobotlar
- [ ] To'lov integratsiyalari (Payme, Click)
- [ ] QR menyu

### Bosqich 3: Mobil ilova
- [ ] React Native ilova
- [ ] QR skanerlash
- [ ] Push bildirishnomalar

## Litsenziya

MIT License
