import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// =====================================================================
// TEST AKKAUNTLAR — barcha rollar uchun (development / staging uchun)
// =====================================================================
//
// ENV ORQALI O'ZGARTIRISH:
//   SEED_ADMIN_PASSWORD=...    SEED_ADMIN_PIN=...
//   SEED_MANAGER_PASSWORD=...  SEED_MANAGER_PIN=...
//   SEED_CASHIER_PASSWORD=...  SEED_CASHIER_PIN=...
//   SEED_CHEF_PASSWORD=...     SEED_CHEF_PIN=...
//   SEED_WAITER_PASSWORD=...   SEED_WAITER_PIN=...
//   SEED_WAREHOUSE_PASSWORD=...SEED_WAREHOUSE_PIN=...
//   SEED_ACCOUNTANT_PASSWORD=...SEED_ACCOUNTANT_PIN=...
// =====================================================================

const USERS: Array<{
  email:      string;
  phone:      string;
  firstName:  string;
  lastName:   string;
  role:       Role;
  passwordEnv: string;
  defaultPassword: string;
  pinEnv:     string;
  defaultPin: string;
  appHint:    string;
}> = [
  {
    email:     'admin@oshxona.uz',
    phone:     '+998901000001',
    firstName: 'Super',
    lastName:  'Admin',
    role:      Role.SUPER_ADMIN,
    passwordEnv:     'SEED_ADMIN_PASSWORD',
    defaultPassword: 'Admin1234!',
    pinEnv:          'SEED_ADMIN_PIN',
    defaultPin:      '0000',
    appHint:         'Web Admin Panel',
  },
  {
    email:     'manager@oshxona.uz',
    phone:     '+998901000002',
    firstName: 'Menejer',
    lastName:  'Rahimov',
    role:      Role.MANAGER,
    passwordEnv:     'SEED_MANAGER_PASSWORD',
    defaultPassword: 'Manager1234!',
    pinEnv:          'SEED_MANAGER_PIN',
    defaultPin:      '1111',
    appHint:         'POS Kassa + Web Admin',
  },
  {
    email:     'kassir@oshxona.uz',
    phone:     '+998901000003',
    firstName: 'Kassir',
    lastName:  'Toshmatov',
    role:      Role.CASHIER,
    passwordEnv:     'SEED_CASHIER_PASSWORD',
    defaultPassword: 'Kassir1234!',
    pinEnv:          'SEED_CASHIER_PIN',
    defaultPin:      '1234',
    appHint:         'POS Kassa (EXE / APK)',
  },
  {
    email:     'oshpaz@oshxona.uz',
    phone:     '+998901000004',
    firstName: 'Oshpaz',
    lastName:  'Yusupov',
    role:      Role.CHEF,
    passwordEnv:     'SEED_CHEF_PASSWORD',
    defaultPassword: 'Oshpaz1234!',
    pinEnv:          'SEED_CHEF_PIN',
    defaultPin:      '2222',
    appHint:         'Oshxona Ekrani (Kitchen EXE)',
  },
  {
    email:     'ofitsiant@oshxona.uz',
    phone:     '+998901000005',
    firstName: 'Ofitsiant',
    lastName:  'Karimov',
    role:      Role.WAITER,
    passwordEnv:     'SEED_WAITER_PASSWORD',
    defaultPassword: 'Waiter1234!',
    pinEnv:          'SEED_WAITER_PIN',
    defaultPin:      '3333',
    appHint:         'Ofitsiant (Waiter EXE / APK)',
  },
  {
    email:     'ombor@oshxona.uz',
    phone:     '+998901000006',
    firstName: 'Omborchi',
    lastName:  'Mirzayev',
    role:      Role.WAREHOUSE,
    passwordEnv:     'SEED_WAREHOUSE_PASSWORD',
    defaultPassword: 'Ombor1234!',
    pinEnv:          'SEED_WAREHOUSE_PIN',
    defaultPin:      '4444',
    appHint:         'Inventory App',
  },
  {
    email:     'buxgalter@oshxona.uz',
    phone:     '+998901000007',
    firstName: 'Buxgalter',
    lastName:  'Nazarov',
    role:      Role.ACCOUNTANT,
    passwordEnv:     'SEED_ACCOUNTANT_PASSWORD',
    defaultPassword: 'Buxgalter1234!',
    pinEnv:          'SEED_ACCOUNTANT_PIN',
    defaultPin:      '5555',
    appHint:         'Web Admin → Hisobotlar',
  },
];

async function main() {
  console.log('🌱 Database seeding boshlandi...\n');

  // ── 1. Tenant ────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'milliy-taomlar' },
    update: {
      name:     'Milliy Taomlar',
      phone:    '+998 71 123 45 67',
      email:    'info@milliytaomlar.uz',
      address:  "Toshkent shahar, Amir Temur ko'chasi, 100-uy",
      isActive: true,
    },
    create: {
      name:     'Milliy Taomlar',
      slug:     'milliy-taomlar',
      phone:    '+998 71 123 45 67',
      email:    'info@milliytaomlar.uz',
      address:  "Toshkent shahar, Amir Temur ko'chasi, 100-uy",
      isActive: true,
    },
  });
  console.log('✅ Tenant:', tenant.name, '(id:', tenant.id.slice(0, 8) + '...)');

  // ── 2. Settings ───────────────────────────────────────────────────────
  await prisma.settings.upsert({
    where:  { tenantId: tenant.id },
    update: {},
    create: {
      tenantId:     tenant.id,
      name:         'Milliy Taomlar',
      nameRu:       'Национальные Блюда',
      nameEn:       'National Cuisine',
      address:      "Toshkent shahar, Amir Temur ko'chasi, 100-uy",
      phone:        '+998 71 123 45 67',
      email:        'info@milliytaomlar.uz',
      taxRate:      12,
      currency:     'UZS',
      timezone:     'Asia/Tashkent',
      orderPrefix:  'ORD',
      bonusPercent: 5,
    },
  });
  console.log('✅ Settings yaratildi\n');

  // ── 3. Foydalanuvchilar (barcha rollar) ───────────────────────────────
  console.log('👥 Foydalanuvchilar yaratilmoqda...');

  const createdUsers: Array<{ email: string; password: string; pin: string; role: Role; appHint: string }> = [];

  for (const u of USERS) {
    const password = process.env[u.passwordEnv] ?? u.defaultPassword;
    const pin      = process.env[u.pinEnv]      ?? u.defaultPin;

    const hashed    = await bcrypt.hash(password, 10);
    const hashedPin = await bcrypt.hash(pin, 10);

    // PIN tezkor qidirish uchun hash (PIN ning oxirgi 4 raqami)
    const pinQuickLookup = require('crypto')
      .createHash('sha256')
      .update(pin + tenant.id)
      .digest('hex')
      .slice(0, 16);

    await prisma.user.upsert({
      where: { email_tenantId: { email: u.email, tenantId: tenant.id } },
      update: {
        password:       hashed,
        pinCode:        hashedPin,
        pinQuickLookup,
        firstName:      u.firstName,
        lastName:       u.lastName,
        phone:          u.phone,
        isActive:       true,
      },
      create: {
        email:          u.email,
        phone:          u.phone,
        password:       hashed,
        pinCode:        hashedPin,
        pinQuickLookup,
        firstName:      u.firstName,
        lastName:       u.lastName,
        role:           u.role,
        isActive:       true,
        tenantId:       tenant.id,
      },
    });

    createdUsers.push({ email: u.email, password, pin, role: u.role, appHint: u.appHint });
    console.log(`   ✅ ${u.role.padEnd(12)} ${u.email}`);
  }

  // ── 4. Kategoriyalar ─────────────────────────────────────────────────
  console.log('\n📂 Kategoriyalar...');
  const t = tenant.id;

  const catData = [
    { name: 'Osh va taomlar',  nameRu: 'Плов и блюда',      nameEn: 'Pilaf & dishes',  slug: 'osh-taomlar',    sortOrder: 1 },
    { name: 'Salatlar',        nameRu: 'Салаты',             nameEn: 'Salads',          slug: 'salatlar',       sortOrder: 2 },
    { name: 'Suyuq taomlar',   nameRu: 'Первые блюда',       nameEn: 'Soups',           slug: 'suyuq-taomlar',  sortOrder: 3 },
    { name: 'Ichimliklar',     nameRu: 'Напитки',            nameEn: 'Beverages',       slug: 'ichimliklar',    sortOrder: 4 },
    { name: 'Desertlar',       nameRu: 'Десерты',            nameEn: 'Desserts',        slug: 'desertlar',      sortOrder: 5 },
    { name: 'Non va tandir',   nameRu: 'Хлеб и тандыр',     nameEn: 'Bread & tandoor', slug: 'non-va-tandir',  sortOrder: 6 },
  ];

  const categories: Record<string, string> = {};
  for (const c of catData) {
    const cat = await prisma.category.upsert({
      where:  { slug_tenantId: { slug: c.slug, tenantId: t } },
      update: {},
      create: { ...c, isActive: true, tenantId: t },
    });
    categories[c.slug] = cat.id;
  }
  console.log(`   ✅ ${catData.length} ta kategoriya`);

  // ── 5. Mahsulotlar ───────────────────────────────────────────────────
  console.log('\n🍽️  Mahsulotlar...');
  const products = [
    { name: "O'zbek oshi",        nameRu: 'Узбекский плов',    price: 45000, cost: 25000, cat: 'osh-taomlar',    min: 30, cal: 650 },
    { name: 'Samarqand oshi',     nameRu: 'Самаркандский плов', price: 50000, cost: 28000, cat: 'osh-taomlar',    min: 40, cal: 700 },
    { name: 'Manti (6 dona)',     nameRu: 'Манты (6 шт)',      price: 35000, cost: 18000, cat: 'osh-taomlar',    min: 25, cal: 450 },
    { name: 'Shashlik (1 shish)', nameRu: 'Шашлык (1 шт)',     price: 25000, cost: 15000, cat: 'osh-taomlar',    min: 20, cal: 350 },
    { name: "Lag'mon",            nameRu: 'Лагман',            price: 38000, cost: 20000, cat: 'osh-taomlar',    min: 20, cal: 500 },
    { name: 'Dimlama',            nameRu: 'Димлама',           price: 42000, cost: 22000, cat: 'osh-taomlar',    min: 35, cal: 520 },
    { name: 'Achichuk',           nameRu: 'Ачичук',            price: 15000, cost:  5000, cat: 'salatlar',       min:  5, cal:  80 },
    { name: 'Shakarob',           nameRu: 'Шакароб',           price: 18000, cost:  6000, cat: 'salatlar',       min:  5, cal: 120 },
    { name: 'Toshkent salati',    nameRu: 'Ташкентский салат', price: 22000, cost:  8000, cat: 'salatlar',       min:  5, cal: 150 },
    { name: "Sho'rva",            nameRu: 'Шурпа',             price: 30000, cost: 15000, cat: 'suyuq-taomlar',  min: 15, cal: 350 },
    { name: 'Mastava',            nameRu: 'Мастава',           price: 28000, cost: 14000, cat: 'suyuq-taomlar',  min: 15, cal: 320 },
    { name: 'Mohora',             nameRu: 'Мухора',            price: 26000, cost: 12000, cat: 'suyuq-taomlar',  min: 15, cal: 280 },
    { name: "Ko'k choy (choynak)",nameRu: 'Зелёный чай',      price:  8000, cost:  2000, cat: 'ichimliklar',    min:  3, cal:   0 },
    { name: 'Qora choy (choynak)',nameRu: 'Чёрный чай',        price:  8000, cost:  2000, cat: 'ichimliklar',    min:  3, cal:   0 },
    { name: 'Kompot (1 stakan)',  nameRu: 'Компот (1 стакан)', price:  6000, cost:  1500, cat: 'ichimliklar',    min:  1, cal:  50 },
    { name: 'Ayron (1 stakan)',   nameRu: 'Айран (1 стакан)',  price:  7000, cost:  2000, cat: 'ichimliklar',    min:  1, cal: 60  },
    { name: "Non (g'ird)",        nameRu: 'Лепёшка',           price:  5000, cost:  2000, cat: 'non-va-tandir',  min:  5, cal: 300 },
    { name: 'Somsa (2 dona)',     nameRu: 'Самса (2 шт)',      price: 12000, cost:  5000, cat: 'non-va-tandir',  min: 15, cal: 400 },
  ];

  let prodCount = 0;
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const catId = categories[p.cat];
    if (!catId) continue;
    await prisma.product.upsert({
      where:  { barcode_tenantId: { barcode: `TEST-PROD-${String(i+1).padStart(3,'0')}`, tenantId: t } },
      update: {},
      create: {
        name:        p.name,
        nameRu:      p.nameRu,
        price:       p.price,
        costPrice:   p.cost,
        categoryId:  catId,
        cookingTime: p.min,
        calories:    p.cal,
        barcode:     `TEST-PROD-${String(i+1).padStart(3,'0')}`,
        isActive:    true,
        isFeatured:  i < 6,
        sortOrder:   i + 1,
        tenantId:    t,
      },
    }).catch(() => null);
    prodCount++;
  }
  console.log(`   ✅ ${prodCount} ta mahsulot`);

  // ── 6. Stollar ────────────────────────────────────────────────────────
  console.log('\n🪑 Stollar...');
  let tblCount = 0;
  for (let i = 1; i <= 12; i++) {
    await prisma.table.upsert({
      where:  { number_tenantId: { number: i, tenantId: t } },
      update: {},
      create: {
        number:    i,
        name:      `Stol ${i}`,
        capacity:  i <= 4 ? 2 : i <= 8 ? 4 : 6,
        qrCode:    `TABLE-${String(i).padStart(3,'0')}-TEST`,
        positionX: ((i - 1) % 4) * 160,
        positionY: Math.floor((i - 1) / 4) * 160,
        isActive:  true,
        tenantId:  t,
      },
    }).catch(() => null);
    tblCount++;
  }
  console.log(`   ✅ ${tblCount} ta stol`);

  // ── 7. Ombor ─────────────────────────────────────────────────────────
  console.log('\n📦 Ombor...');
  const invItems = [
    { name: 'Guruch',              sku: 'INV-001', unit: 'kg',   qty: 50,  min: 10, cost: 12000 },
    { name: "Mol go'shti",         sku: 'INV-002', unit: 'kg',   qty: 30,  min:  5, cost: 85000 },
    { name: "Qo'y go'shti",        sku: 'INV-003', unit: 'kg',   qty: 20,  min:  5, cost: 90000 },
    { name: 'Sabzi',               sku: 'INV-004', unit: 'kg',   qty: 25,  min:  5, cost:  5000 },
    { name: 'Piyoz',               sku: 'INV-005', unit: 'kg',   qty: 30,  min:  5, cost:  4000 },
    { name: "O'simlik yog'i",      sku: 'INV-006', unit: 'litr', qty: 15,  min:  3, cost: 22000 },
    { name: 'Un',                  sku: 'INV-007', unit: 'kg',   qty: 40,  min: 10, cost:  7000 },
    { name: 'Pomidor',             sku: 'INV-008', unit: 'kg',   qty: 20,  min:  5, cost:  8000 },
    { name: "Ko'k choy (1kg)",     sku: 'INV-009', unit: 'kg',   qty:  5,  min:  1, cost: 45000 },
    { name: 'Tuz',                 sku: 'INV-010', unit: 'kg',   qty: 10,  min:  2, cost:  2000 },
  ];
  let invCount = 0;
  for (const item of invItems) {
    await prisma.inventoryItem.upsert({
      where:  { sku_tenantId: { sku: item.sku, tenantId: t } },
      update: {},
      create: {
        name:        item.name,
        sku:         item.sku,
        unit:        item.unit,
        quantity:    item.qty,
        minQuantity: item.min,
        costPrice:   item.cost,
        isActive:    true,
        tenantId:    t,
      },
    }).catch(() => null);
    invCount++;
  }
  console.log(`   ✅ ${invCount} ta ombor mahsuloti`);

  // ── 8. Test mijoz ────────────────────────────────────────────────────
  console.log('\n👤 Test mijoz...');
  await prisma.customer.upsert({
    where:  { phone_tenantId: { phone: '+998901112233', tenantId: t } },
    update: {},
    create: {
      phone:       '+998901112233',
      firstName:   'Sardor',
      lastName:    'Testov',
      bonusPoints: 5000,
      tenantId:    t,
    },
  }).catch(() => null);
  console.log('   ✅ Test mijoz: +998901112233');

  // ── YAKUNIY HISOBOT ───────────────────────────────────────────────────
  console.log('\n');
  console.log('='.repeat(66));
  console.log('  SEED MUVAFFAQIYATLI YAKUNLANDI');
  console.log('='.repeat(66));
  console.log('\n📋 LOGIN MA\'LUMOTLARI:\n');
  console.log('  Tenant slug: milliy-taomlar');
  console.log('  API URL    : http://localhost:3000\n');

  const lines: string[][] = [
    ['ROL',         'EMAIL',                'PAROL',          'PIN',  'ILOVA'],
    ['-'.repeat(12),'-'.repeat(26),         '-'.repeat(16),   '----', '-'.repeat(28)],
  ];
  for (const u of createdUsers) {
    lines.push([u.role, u.email, u.password, u.pin, u.appHint]);
  }

  for (const cols of lines) {
    console.log(
      '  ' +
      cols[0].padEnd(14) +
      cols[1].padEnd(28) +
      cols[2].padEnd(18) +
      cols[3].padEnd(6) +
      cols[4],
    );
  }

  console.log('\n💡 PIN bilan login: POST /api/auth/login-pin');
  console.log('   Body: { "pin": "1234", "tenantId": "' + tenant.id + '" }\n');
  console.log('⚠️  Bu parollar faqat test uchun! Productda o\'zgartiring!\n');
  console.log('='.repeat(66));
}

main()
  .catch((e) => {
    console.error('\n❌ Seed xatosi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
