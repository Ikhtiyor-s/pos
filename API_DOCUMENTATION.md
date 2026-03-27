# Oshxona POS — API Documentation v3.0

**Base URL:** `http://localhost:3000/api`
**Protocol:** REST + Socket.IO (WebSocket)
**Format:** JSON
**Authentication:** JWT Bearer Token

---

## Autentifikatsiya

Barcha himoyalangan endpointlar uchun header:

```
Authorization: Bearer <ACCESS_TOKEN>
```

### Javob formati

```json
// Muvaffaqiyatli
{ "success": true, "data": { ... } }

// Xatolik
{ "success": false, "message": "Xatolik tavsifi" }
```

---

## 1. AUTH — Autentifikatsiya

### POST `/api/auth/login` — Kirish

```json
// Request
{
  "email": "kassir@oshxona.uz",   // email yoki phone
  "password": "5678"              // min 4 belgi
}

// Response 200
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "kassir@oshxona.uz",
      "phone": "+998901234568",
      "firstName": "Kassir",
      "lastName": "Xodim",
      "role": "CASHIER",
      "tenantId": "uuid",
      "isActive": true
    },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

### POST `/api/auth/login-pin` — PIN orqali kirish

```json
// Request
{
  "pin": "3456",
  "tenantId": "uuid"
}

// Response 200 — login bilan bir xil
```

### POST `/api/auth/register` — Ro'yxatdan o'tish

```json
// Request
{
  "email": "user@test.uz",       // required
  "password": "parol123",        // required, min 4
  "firstName": "Ism",            // required, min 2
  "lastName": "Familiya",        // required, min 2
  "phone": "+998901234567",      // optional
  "role": "CASHIER"              // optional, default: CASHIER
}
```

**Rollar:** `SUPER_ADMIN`, `MANAGER`, `CASHIER`, `CHEF`, `WAITER`, `WAREHOUSE`, `ACCOUNTANT`

### POST `/api/auth/refresh` — Token yangilash

```json
{ "refreshToken": "eyJhbG..." }
```

### GET `/api/auth/me` — Joriy foydalanuvchi (AUTH)

### PUT `/api/auth/change-password` — Parol o'zgartirish (AUTH)

```json
{
  "currentPassword": "eski_parol",
  "newPassword": "yangi_parol"    // min 6 belgi
}
```

### PUT `/api/auth/users/:userId/pin` — PIN o'rnatish (MANAGER, SUPER_ADMIN)

```json
{ "pin": "1234" }   // 4-8 raqam
```

### DELETE `/api/auth/users/:userId/pin` — PIN o'chirish (MANAGER, SUPER_ADMIN)

---

## 2. PRODUCTS — Mahsulotlar

### GET `/api/products` — Ro'yxat (AUTH)

**Query params:** `?search=osh&categoryId=uuid&isActive=true`

```json
// Response
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid",
        "name": "O'zbek oshi",
        "nameRu": "Узбекский плов",
        "price": 45000,
        "costPrice": 20000,
        "categoryId": "uuid",
        "category": { "id": "uuid", "name": "Osh va taomlar" },
        "image": "/uploads/products/osh.jpg",
        "cookingTime": 30,
        "calories": 450,
        "isActive": true,
        "isFeatured": true,
        "isAvailableOnline": true,
        "barcode": "4900001",
        "stockQuantity": 50,
        "lowStockAlert": 10,
        "sortOrder": 1
      }
    ],
    "total": 12
  }
}
```

### GET `/api/products/:id` — Bitta mahsulot (AUTH)

### GET `/api/products/barcode/:barcode` — Barcode bo'yicha (AUTH)

### POST `/api/products` — Yaratish (MANAGER, SUPER_ADMIN)

```json
{
  "name": "Yangi taom",              // required, min 2
  "price": 35000,                    // required
  "categoryId": "uuid",              // required

  "nameRu": "Новое блюдо",          // optional
  "nameEn": "New dish",             // optional
  "description": "Tavsif",          // optional
  "costPrice": 18000,               // optional
  "image": "url",                   // optional
  "cookingTime": 25,                // optional (daqiqa)
  "calories": 350,                  // optional
  "weight": 350,                    // optional
  "weightUnit": "g",                // g, kg, ml, l, dona
  "barcode": "490001",              // optional
  "sku": "SKU-001",                 // optional
  "stockQuantity": 100,             // optional
  "lowStockAlert": 10,              // optional
  "trackStock": true,               // optional
  "isActive": true,                 // default: true
  "isFeatured": false,              // optional
  "isAvailableOnline": true,        // default: true
  "tags": ["issiq", "milliy"],      // optional
  "sortOrder": 1,                   // optional

  "variants": [                     // optional
    { "name": "Katta", "price": 45000 },
    { "name": "Kichik", "price": 30000 }
  ],
  "modifiers": [                    // optional
    { "name": "Qo'shimcha go'sht", "price": 10000 }
  ],
  "ingredients": [                  // optional
    { "inventoryItemId": "uuid", "quantity": 0.5 }
  ]
}
```

### PUT `/api/products/:id` — Yangilash (MANAGER, SUPER_ADMIN)

Body: POST bilan bir xil (barcha maydonlar optional)

### DELETE `/api/products/:id` — O'chirish (MANAGER, SUPER_ADMIN)

### POST `/api/products/:id/image` — Rasm yuklash (MANAGER, SUPER_ADMIN)

`Content-Type: multipart/form-data`, field: `image`

---

## 3. CATEGORIES — Kategoriyalar

### GET `/api/categories` — Ro'yxat (AUTH)

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Osh va taomlar",
      "nameRu": "Плов и блюда",
      "slug": "osh-taomlar",
      "image": null,
      "sortOrder": 1,
      "isActive": true
    }
  ]
}
```

### POST `/api/categories` — Yaratish (MANAGER, SUPER_ADMIN)

```json
{
  "name": "Yangi kategoriya",   // required, min 2
  "nameRu": "Новая категория",  // optional
  "slug": "yangi-kategoriya",   // optional (auto-generate)
  "sortOrder": 5,               // optional
  "isActive": true              // default: true
}
```

### PUT `/api/categories/:id` — Yangilash

### DELETE `/api/categories/:id` — O'chirish

---

## 4. ORDERS — Buyurtmalar

### GET `/api/orders` — Ro'yxat (MANAGER, CASHIER, ACCOUNTANT, WAITER)

**Query params:** `?status=NEW&type=DINE_IN&source=POS_ORDER&tableId=uuid&page=1&limit=20`

```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "uuid",
        "orderNumber": "ORD-20260327-0001",
        "source": "POS_ORDER",
        "type": "DINE_IN",
        "status": "CONFIRMED",
        "tableId": "uuid",
        "table": { "id": "uuid", "number": 3, "name": "Stol 3" },
        "userId": "uuid",
        "user": { "firstName": "Kassir", "lastName": "Xodim" },
        "subtotal": 150000,
        "discount": 0,
        "tax": 0,
        "total": 150000,
        "notes": "VIP mijoz",
        "items": [
          {
            "id": "uuid",
            "productId": "uuid",
            "product": { "id": "uuid", "name": "O'zbek oshi", "price": 45000 },
            "quantity": 2,
            "price": 45000,
            "total": 90000,
            "status": "PENDING",
            "notes": "Kam tuzli"
          }
        ],
        "payments": [],
        "createdAt": "2026-03-27T04:05:00.000Z"
      }
    ],
    "total": 3
  }
}
```

### GET `/api/orders/kitchen` — Oshxona buyurtmalari (CHEF, MANAGER)

Faqat `NEW`, `CONFIRMED`, `PREPARING`, `READY` statusdagi buyurtmalar.

### POST `/api/orders` — Buyurtma yaratish (CASHIER, MANAGER, WAITER)

```json
{
  "type": "DINE_IN",                // DINE_IN | TAKEAWAY | DELIVERY
  "tableId": "uuid",               // DINE_IN uchun required
  "customerId": "uuid",            // optional
  "source": "POS_ORDER",           // optional, default: POS_ORDER
  "notes": "Izoh",                 // optional
  "address": "Manzil",             // DELIVERY uchun
  "discount": 5000,                // optional, fixed summa
  "discountPercent": 10,           // optional, foiz (0-100)
  "items": [                       // required, min 1
    {
      "productId": "uuid",         // required
      "quantity": 2,               // required, musbat son
      "notes": "Kam tuzli"         // optional
    }
  ]
}

// Response 201
{
  "success": true,
  "data": {
    "id": "uuid",
    "orderNumber": "ORD-20260327-0001",
    "status": "NEW",
    "total": 178080,
    "items": [...],
    "table": { "number": 1 }
  }
}
```

**Buyurtma manbalari (source):**
`POS_ORDER`, `WAITER_ORDER`, `QR_ORDER`, `NONBOR_ORDER`, `TELEGRAM_ORDER`, `WEBSITE_ORDER`, `API_ORDER`

### POST `/api/orders/:id/items` — Buyurtmaga qo'shish (CASHIER, MANAGER, WAITER)

```json
{
  "items": [
    { "productId": "uuid", "quantity": 1 }
  ]
}
```

### PATCH `/api/orders/:id/status` — Status yangilash (MANAGER, CASHIER, CHEF)

```json
{ "status": "PREPARING" }
```

**Status pipeline:**
```
NEW → CONFIRMED → PREPARING → READY → DELIVERING → COMPLETED
                                                   → CANCELLED
```

### PATCH `/api/orders/:id/items/:itemId/status` — Taom statusi (CHEF, MANAGER)

```json
{ "status": "PREPARING" }
```

**Item status pipeline:**
```
PENDING → PREPARING → READY → SERVED
                             → CANCELLED
```

### PATCH `/api/orders/:id/items/:itemId` — Miqdor yangilash (CASHIER, MANAGER, WAITER)

```json
{ "quantity": 3 }
```

### POST `/api/orders/:id/payment` — To'lov (CASHIER, MANAGER)

```json
{
  "method": "CASH",              // CASH | CARD | PAYME | CLICK | UZUM | HUMO | OTHER
  "amount": 178080               // required
}
```

---

## 5. TABLES — Stollar

### GET `/api/tables` — Ro'yxat (AUTH)

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "number": 1,
      "name": "Stol 1",
      "capacity": 4,
      "status": "FREE",
      "qrCode": "TABLE-001-xxx",
      "positionX": 1,
      "positionY": 1,
      "isActive": true
    }
  ]
}
```

**Stol statuslari:** `FREE`, `OCCUPIED`, `RESERVED`, `CLEANING`

### GET `/api/tables/qr/:qrCode` — QR orqali (PUBLIC, auth kerak emas)

### POST `/api/tables` — Yaratish (MANAGER, SUPER_ADMIN)

```json
{
  "number": 15,            // required
  "name": "VIP-3",         // optional
  "capacity": 6,           // optional
  "positionX": 3,          // optional
  "positionY": 5           // optional
}
```

### PATCH `/api/tables/:id/status` — Status yangilash (CASHIER, MANAGER)

```json
{ "status": "OCCUPIED" }
```

---

## 6. USERS — Foydalanuvchilar

### GET `/api/users` — Ro'yxat (MANAGER, SUPER_ADMIN)

### POST `/api/users` — Yaratish (MANAGER, SUPER_ADMIN)

```json
{
  "email": "yangi@oshxona.uz",     // required
  "password": "parol123",          // required
  "firstName": "Ism",              // required
  "lastName": "Familiya",          // required
  "phone": "+998901234599",        // optional
  "role": "WAITER"                 // required
}
```

### PUT `/api/users/:id` — Yangilash

### PATCH `/api/users/:id/toggle` — Faol/nofaol qilish

### DELETE `/api/users/:id` — O'chirish

---

## 7. CUSTOMERS — Mijozlar

### GET `/api/customers` — Ro'yxat (MANAGER, CASHIER)

### POST `/api/customers` — Yaratish (MANAGER, CASHIER)

```json
{
  "phone": "+998901112233",    // required, unique per tenant
  "firstName": "Alisher",     // optional
  "lastName": "Karimov",      // optional
  "email": "alisher@mail.uz", // optional
  "birthDate": "1990-05-15",  // optional
  "notes": "VIP mijoz"        // optional
}
```

---

## 8. INVENTORY — Ombor

### GET `/api/inventory` — Ro'yxat (AUTH)

### GET `/api/inventory/low-stock` — Kam qolgan (AUTH)

### POST `/api/inventory` — Yaratish (WAREHOUSE, MANAGER)

```json
{
  "name": "Guruch",
  "nameRu": "Рис",
  "sku": "INV-001",
  "unit": "kg",
  "quantity": 100,
  "minQuantity": 20,
  "costPrice": 15000,
  "supplierId": "uuid",
  "expiryDate": "2026-12-31"
}
```

### POST `/api/inventory/:id/transaction` — Tranzaksiya (WAREHOUSE, MANAGER)

```json
{
  "type": "IN",            // IN | OUT | ADJUST | WASTE
  "quantity": 50,
  "notes": "Yangi partiya"
}
```

---

## 9. QR-MENU — Mijoz uchun (PUBLIC, auth kerak emas)

### GET `/api/qr-menu/:qrCode` — Menu ko'rish

```json
// Response
{
  "success": true,
  "data": {
    "tenant": { "name": "Milliy Taomlar", "logo": null, "phone": null },
    "table": { "id": "uuid", "number": 5, "name": "Stol 5" },
    "categories": [
      { "id": "uuid", "name": "Osh va taomlar", "sortOrder": 1 }
    ],
    "products": [
      {
        "id": "uuid",
        "name": "O'zbek oshi",
        "price": 45000,
        "image": null,
        "categoryId": "uuid",
        "cookingTime": 30,
        "isFeatured": true
      }
    ]
  }
}
```

### POST `/api/qr-menu/order` — Buyurtma berish

```json
// Request
{
  "tableId": "uuid",                // required
  "customerName": "Alisher",        // optional
  "customerPhone": "+998901234599", // optional
  "items": [
    { "productId": "uuid", "quantity": 2 }
  ]
}

// Response 201
{
  "success": true,
  "message": "Buyurtmangiz qabul qilindi!",
  "data": {
    "id": "uuid",
    "orderNumber": "QR-20260327-0001",
    "status": "NEW",
    "table": { "number": 5, "name": "Stol 5" },
    "items": [
      { "name": "O'zbek oshi", "quantity": 2, "price": 45000 }
    ],
    "total": 90000,
    "createdAt": "2026-03-27T04:15:00.000Z"
  }
}
```

### GET `/api/qr-menu/order/:id` — Buyurtma holati

---

## 10. DASHBOARD — Hisobotlar

### GET `/api/dashboard` — Asosiy ko'rsatkichlar (AUTH)

```json
{
  "success": true,
  "data": {
    "revenue": { "total": 680640, "averageCheck": 226880 },
    "orders": { "total": 3, "completed": 1 },
    "customers": 2,
    "employees": 5,
    "recentOrders": [...]
  }
}
```

### GET `/api/dashboard/daily-sales` — Kunlik savdo (AUTH)

---

## 11. PAYMENTS — To'lov tizimlari (Webhook)

### POST `/api/payments/payme/callback` — Payme webhook (PUBLIC)

### POST `/api/payments/click/prepare` — Click 1-bosqich (PUBLIC)

### POST `/api/payments/click/complete` — Click 2-bosqich (PUBLIC)

### POST `/api/payments/uzum/callback` — Uzum Bank webhook (PUBLIC)

---

## 12. BILLING — Obuna boshqaruvi

### GET `/api/billing/plans` — Tariflar (AUTH)

### POST `/api/billing/plans` — Tarif yaratish (SUPER_ADMIN)

```json
{
  "name": "Premium",
  "basePrice": 500000,
  "maxUsers": 50,
  "maxOrders": 999999,
  "maxWarehouses": 10,
  "maxKitchens": 10,
  "maxWaiters": 50,
  "hasIntegrations": true,
  "hasReports": true
}
```

### POST `/api/billing/subscription` — Obuna yaratish (SUPER_ADMIN)

```json
{
  "tenantId": "uuid",
  "planId": "uuid",
  "warehouses": 5,
  "kitchens": 3,
  "waiters": 10
}
```

---

## 13. FINANCE — Moliya

### POST `/api/finance/cash-register/open` — Kassa ochish (CASHIER)

### POST `/api/finance/cash-register/:id/close` — Kassa yopish

### POST `/api/finance/expenses` — Xarajat kiritish (MANAGER, ACCOUNTANT)

```json
{
  "title": "Guruch sotib olish",
  "amount": 500000,
  "categoryId": "uuid",
  "description": "50 kg guruch"
}
```

### GET `/api/finance/reports/profit-loss` — Foyda/zarar (MANAGER, ACCOUNTANT)

---

## 14. WAREHOUSE — Ombor boshqaruvi

### POST `/api/warehouse/purchase-orders` — Xarid buyurtma (WAREHOUSE, MANAGER)

```json
{
  "supplierId": "uuid",
  "expectedAt": "2026-04-01",
  "items": [
    { "inventoryItemId": "uuid", "quantity": 100, "unitPrice": 15000 }
  ]
}
```

### POST `/api/warehouse/waste-logs` — Nobudgarchilik (WAREHOUSE, MANAGER)

```json
{
  "inventoryItemId": "uuid",
  "quantity": 5,
  "reason": "Muddati o'tgan"
}
```

---

## 15. Socket.IO — Real-time Events

**Ulanish:**
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token: 'JWT_ACCESS_TOKEN' }
});
```

### Xonalarga qo'shilish

```javascript
socket.emit('join:kitchen');   // Oshpaz
socket.emit('join:pos');       // Kassir
socket.emit('join:admin');     // Admin/Manager
socket.emit('join:waiter');    // Ofitsiant
```

### Tinglash (Events)

```javascript
// Yangi buyurtma — kitchen, admin, waiter
socket.on('order:new', (order) => { ... });

// Buyurtma statusi o'zgardi
socket.on('order:status', ({ orderId, status, order }) => { ... });

// Taom statusi o'zgardi — kitchen, waiter
socket.on('order:item:status', ({ orderId, itemId, status }) => { ... });

// Buyurtma yakunlandi
socket.on('order:completed', (order) => { ... });

// Stol statusi o'zgardi
socket.on('table:status', ({ tableId, status }) => { ... });

// Omborda kam qoldi
socket.on('inventory:low', ({ itemId, name, quantity, minQuantity }) => { ... });
```

---

## 16. HEALTH CHECKS

| Endpoint | Auth | Tavsif |
|----------|------|--------|
| `GET /health` | No | Umumiy holat |
| `GET /healthz` | No | Liveness probe (Kubernetes) |
| `GET /readyz` | No | Readiness probe (Kubernetes) |

```json
// GET /health
{
  "status": "ok",
  "timestamp": "2026-03-27T04:00:00Z",
  "uptime": 3600,
  "version": "3.0.0",
  "checks": {
    "database": { "status": "ok", "latencyMs": 12 },
    "memory": { "status": "ok", "usedMB": 45, "totalMB": 256 },
    "server": { "status": "ok", "shuttingDown": false }
  }
}
```

---

## 17. RATE LIMITING

| Endpoint | Limit |
|----------|-------|
| Global | 200 req/min |
| `/api/auth/login` | 5 req/min |
| `/api/auth/register` | 3 req/min |
| `/api/auth/login-pin` | 10 req/min |

Chegaradan o'tganda: `429 Too Many Requests`

```json
{
  "success": false,
  "message": "Juda ko'p urinish. 1 daqiqadan keyin qayta urinib ko'ring.",
  "retryAfter": 60
}
```

---

## 18. XATO KODLARI

| Status | Tavsif |
|--------|--------|
| `200` | Muvaffaqiyatli |
| `201` | Yaratildi |
| `400` | Noto'g'ri so'rov (validatsiya xatosi) |
| `401` | Autentifikatsiya kerak (token yo'q/noto'g'ri) |
| `403` | Ruxsat yo'q (rol yetarli emas) |
| `404` | Topilmadi |
| `409` | Konflikt (dublikat email, band stol) |
| `429` | Rate limit |
| `500` | Server xatosi |

---

## 19. Test ma'lumotlari

| Rol | Email | Parol | PIN |
|-----|-------|-------|-----|
| SUPER_ADMIN | admin@oshxona.uz | 1234 | 1234 |
| MANAGER | manager@oshxona.uz | manager123 | — |
| CASHIER | kassir@oshxona.uz | 5678 | 5678 |
| CHEF | oshpaz@oshxona.uz | 9012 | 9012 |
| WAITER | ofitsiant@oshxona.uz | 3456 | 3456 |

**Tenant ID:** `004f93b4-05d1-4abf-a165-aa6ff5c2a5b2`

---

## 20. CURL misollari

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"kassir@oshxona.uz","password":"5678"}'
```

### Mahsulotlar
```bash
curl http://localhost:3000/api/products \
  -H "Authorization: Bearer TOKEN"
```

### Buyurtma yaratish
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "DINE_IN",
    "tableId": "uuid",
    "items": [
      {"productId": "uuid", "quantity": 2}
    ]
  }'
```

### QR orqali menu
```bash
curl http://localhost:3000/api/qr-menu/TABLE-005-xxx
```

### QR buyurtma (auth kerak emas)
```bash
curl -X POST http://localhost:3000/api/qr-menu/order \
  -H "Content-Type: application/json" \
  -d '{
    "tableId": "uuid",
    "customerName": "Alisher",
    "items": [{"productId": "uuid", "quantity": 2}]
  }'
```
