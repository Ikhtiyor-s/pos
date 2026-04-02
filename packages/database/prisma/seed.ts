import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Seed parollar env dan olinadi, bo'lmasa random yaratiladi
function seedPass(envKey: string): string {
  return process.env[envKey] || Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
}

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Tenant yaratish
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'milliy-taomlar' },
    update: {},
    create: {
      name: 'Milliy Taomlar',
      slug: 'milliy-taomlar',
      phone: '+998 71 123 45 67',
      email: 'info@milliytaomlar.uz',
      address: 'Toshkent shahar, Amir Temur ko\'chasi, 100-uy',
      isActive: true,
    },
  });
  console.log('✅ Tenant created:', tenant.name);

  // 1.1 Tizim sozlamalarini yaratish
  await prisma.settings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Milliy Taomlar',
      nameRu: 'Национальные Блюда',
      nameEn: 'National Cuisine',
      address: 'Toshkent shahar, Amir Temur ko\'chasi, 100-uy',
      phone: '+998 71 123 45 67',
      email: 'info@milliytaomlar.uz',
      taxRate: 12,
      currency: 'UZS',
      timezone: 'Asia/Tashkent',
      orderPrefix: 'ORD',
      bonusPercent: 5,
    },
  });
  console.log('✅ Settings created');

  // 2. Admin foydalanuvchi yaratish
  const admin = await prisma.user.upsert({
    where: { email_tenantId: { email: 'admin@oshxona.uz', tenantId: tenant.id } },
    update: {},
    create: {
      email: 'admin@oshxona.uz',
      phone: '+998901234567',
      password: await bcrypt.hash(seedPass('SEED_ADMIN_PASSWORD'), 10),
      pinCode: await bcrypt.hash(seedPass('SEED_ADMIN_PIN'), 10),
      firstName: 'Admin',
      lastName: 'Superuser',
      role: Role.SUPER_ADMIN,
      isActive: true,
      tenantId: tenant.id,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // 3. Test foydalanuvchilar
  const cashier = await prisma.user.upsert({
    where: { email_tenantId: { email: 'kassir@oshxona.uz', tenantId: tenant.id } },
    update: {},
    create: {
      email: 'kassir@oshxona.uz',
      phone: '+998901234568',
      password: await bcrypt.hash(seedPass('SEED_CASHIER_PASSWORD'), 10),
      pinCode: await bcrypt.hash(seedPass('SEED_CASHIER_PIN'), 10),
      firstName: 'Kassir',
      lastName: 'Xodim',
      role: Role.CASHIER,
      isActive: true,
      tenantId: tenant.id,
    },
  });
  console.log('✅ Cashier created:', cashier.email);

  const chef = await prisma.user.upsert({
    where: { email_tenantId: { email: 'oshpaz@oshxona.uz', tenantId: tenant.id } },
    update: {},
    create: {
      email: 'oshpaz@oshxona.uz',
      phone: '+998901234569',
      password: await bcrypt.hash(seedPass('SEED_CHEF_PASSWORD'), 10),
      pinCode: await bcrypt.hash(seedPass('SEED_CHEF_PIN'), 10),
      firstName: 'Oshpaz',
      lastName: 'Bosh',
      role: Role.CHEF,
      isActive: true,
      tenantId: tenant.id,
    },
  });
  console.log('✅ Chef created:', chef.email);

  const waiter = await prisma.user.upsert({
    where: { email_tenantId: { email: 'ofitsiant@oshxona.uz', tenantId: tenant.id } },
    update: {},
    create: {
      email: 'ofitsiant@oshxona.uz',
      phone: '+998901234570',
      password: await bcrypt.hash(seedPass('SEED_WAITER_PASSWORD'), 10),
      pinCode: await bcrypt.hash(seedPass('SEED_WAITER_PIN'), 10),
      firstName: 'Ofitsiant',
      lastName: 'Xodim',
      role: Role.WAITER,
      isActive: true,
      tenantId: tenant.id,
    },
  });
  console.log('✅ Waiter created:', waiter.email);

  // 4. Kategoriyalar yaratish
  const t = tenant.id;
  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'Osh va taomlar', nameRu: 'Плов и блюда', nameEn: 'Pilaf and dishes', slug: 'osh-taomlar', sortOrder: 1, isActive: true, tenantId: t } }),
    prisma.category.create({ data: { name: 'Salatlar', nameRu: 'Салаты', nameEn: 'Salads', slug: 'salatlar', sortOrder: 2, isActive: true, tenantId: t } }),
    prisma.category.create({ data: { name: 'Suyuq taomlar', nameRu: 'Первые блюда', nameEn: 'Soups', slug: 'suyuq-taomlar', sortOrder: 3, isActive: true, tenantId: t } }),
    prisma.category.create({ data: { name: 'Ichimliklar', nameRu: 'Напитки', nameEn: 'Beverages', slug: 'ichimliklar', sortOrder: 4, isActive: true, tenantId: t } }),
    prisma.category.create({ data: { name: 'Desertlar', nameRu: 'Десерты', nameEn: 'Desserts', slug: 'desertlar', sortOrder: 5, isActive: true, tenantId: t } }),
    prisma.category.create({ data: { name: 'Non va tandir', nameRu: 'Хлеб и тандыр', nameEn: 'Bread and tandoor', slug: 'non-va-tandir', sortOrder: 6, isActive: true, tenantId: t } }),
  ]);
  console.log('✅ Categories created:', categories.length);

  // 5. Mahsulotlar (taomlar) yaratish
  const [oshCategory, salatCategory, suyuqCategory, ichimlikCategory] = categories;

  const products = await Promise.all([
    prisma.product.create({ data: { name: "O'zbek oshi", nameRu: 'Узбекский плов', nameEn: 'Uzbek pilaf', description: "An'anaviy o'zbek oshi, mol go'shti bilan", price: 45000, costPrice: 25000, categoryId: oshCategory.id, cookingTime: 30, calories: 650, sortOrder: 1, tenantId: t } }),
    prisma.product.create({ data: { name: 'Samarqand oshi', nameRu: 'Самаркандский плов', nameEn: 'Samarkand pilaf', description: "Samarqand uslubidagi osh, qo'y go'shti bilan", price: 50000, costPrice: 28000, categoryId: oshCategory.id, cookingTime: 40, calories: 700, sortOrder: 2, tenantId: t } }),
    prisma.product.create({ data: { name: 'Manti', nameRu: 'Манты', nameEn: 'Manti dumplings', description: "Go'shtli manti, qaymoq bilan", price: 35000, costPrice: 18000, categoryId: oshCategory.id, cookingTime: 25, calories: 450, sortOrder: 3, tenantId: t } }),
    prisma.product.create({ data: { name: 'Shashlik (1 shish)', nameRu: 'Шашлык (1 шампур)', nameEn: 'Shashlik (1 skewer)', description: "Mol go'shti shashlik", price: 25000, costPrice: 15000, categoryId: oshCategory.id, cookingTime: 20, calories: 350, sortOrder: 4, tenantId: t } }),
    prisma.product.create({ data: { name: "Lag'mon", nameRu: 'Лагман', nameEn: 'Lagman', description: "Qo'lda tayyorlangan lag'mon", price: 38000, costPrice: 20000, categoryId: oshCategory.id, cookingTime: 20, calories: 500, sortOrder: 5, tenantId: t } }),
    prisma.product.create({ data: { name: 'Achichuk', nameRu: 'Ачичук', nameEn: 'Achichuk salad', description: "Pomidor, piyoz, ko'k qalampirli salat", price: 15000, costPrice: 5000, categoryId: salatCategory.id, cookingTime: 5, calories: 80, sortOrder: 1, tenantId: t } }),
    prisma.product.create({ data: { name: 'Shakarob', nameRu: 'Шакароб', nameEn: 'Shakarob', description: 'Pomidor salatasi qatiq bilan', price: 18000, costPrice: 6000, categoryId: salatCategory.id, cookingTime: 5, calories: 120, sortOrder: 2, tenantId: t } }),
    prisma.product.create({ data: { name: "Sho'rva", nameRu: 'Шурпа', nameEn: 'Shurpa soup', description: "Go'shtli sho'rva", price: 30000, costPrice: 15000, categoryId: suyuqCategory.id, cookingTime: 15, calories: 350, sortOrder: 1, tenantId: t } }),
    prisma.product.create({ data: { name: 'Mastava', nameRu: 'Мастава', nameEn: 'Mastava soup', description: "Guruchli sho'rva", price: 28000, costPrice: 14000, categoryId: suyuqCategory.id, cookingTime: 15, calories: 320, sortOrder: 2, tenantId: t } }),
    prisma.product.create({ data: { name: "Ko'k choy (choynak)", nameRu: 'Зеленый чай (чайник)', nameEn: 'Green tea (pot)', description: "O'zbek ko'k choyi", price: 8000, costPrice: 2000, categoryId: ichimlikCategory.id, cookingTime: 5, calories: 0, sortOrder: 1, tenantId: t } }),
    prisma.product.create({ data: { name: 'Qora choy (choynak)', nameRu: 'Черный чай (чайник)', nameEn: 'Black tea (pot)', description: 'Qora choy', price: 8000, costPrice: 2000, categoryId: ichimlikCategory.id, cookingTime: 5, calories: 0, sortOrder: 2, tenantId: t } }),
    prisma.product.create({ data: { name: 'Kompot', nameRu: 'Компот', nameEn: 'Kompot', description: 'Mevali kompot (1 stakan)', price: 6000, costPrice: 1500, categoryId: ichimlikCategory.id, cookingTime: 1, calories: 50, sortOrder: 3, tenantId: t } }),
  ]);
  console.log('✅ Products created:', products.length);

  // 6. Stollar yaratish
  const tables = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      prisma.table.create({
        data: {
          number: i + 1,
          name: `Stol ${i + 1}`,
          capacity: i < 4 ? 2 : i < 7 ? 4 : 6,
          qrCode: `TABLE-${String(i + 1).padStart(3, '0')}-${Date.now()}`,
          positionX: (i % 5) * 150,
          positionY: Math.floor(i / 5) * 150,
          isActive: true,
          tenantId: t,
        },
      })
    )
  );
  console.log('✅ Tables created:', tables.length);

  // 7. Ombor mahsulotlari
  const inventoryItems = await Promise.all([
    prisma.inventoryItem.create({ data: { name: 'Guruch', nameRu: 'Рис', nameEn: 'Rice', sku: 'INV-001', unit: 'kg', quantity: 50, minQuantity: 10, costPrice: 12000, tenantId: t } }),
    prisma.inventoryItem.create({ data: { name: "Mol go'shti", nameRu: 'Говядина', nameEn: 'Beef', sku: 'INV-002', unit: 'kg', quantity: 30, minQuantity: 5, costPrice: 85000, tenantId: t } }),
    prisma.inventoryItem.create({ data: { name: 'Sabzi', nameRu: 'Морковь', nameEn: 'Carrot', sku: 'INV-003', unit: 'kg', quantity: 20, minQuantity: 5, costPrice: 5000, tenantId: t } }),
    prisma.inventoryItem.create({ data: { name: 'Piyoz', nameRu: 'Лук', nameEn: 'Onion', sku: 'INV-004', unit: 'kg', quantity: 25, minQuantity: 5, costPrice: 4000, tenantId: t } }),
    prisma.inventoryItem.create({ data: { name: "O'simlik yog'i", nameRu: 'Растительное масло', nameEn: 'Vegetable oil', sku: 'INV-005', unit: 'litr', quantity: 15, minQuantity: 3, costPrice: 22000, tenantId: t } }),
  ]);
  console.log('✅ Inventory items created:', inventoryItems.length);

  // 8. Test mijoz yaratish
  const customer = await prisma.customer.create({
    data: {
      phone: '+998901112233',
      firstName: 'Test',
      lastName: 'Mijoz',
      bonusPoints: 5000,
      tenantId: t,
    },
  });
  console.log('✅ Test customer created:', customer.phone);

  console.log('\n🎉 Database seeding completed!');
  console.log('\n📋 Login credentials:');
  console.log('   Admin:     admin@oshxona.uz     / 1234');
  console.log('   Kassir:    kassir@oshxona.uz    / 5678');
  console.log('   Oshpaz:    oshpaz@oshxona.uz    / 9012');
  console.log('   Ofitsiant: ofitsiant@oshxona.uz / 3456');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
