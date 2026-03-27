// Demo data seed script
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const TENANT_ID = '0f17da38-bc59-4bd1-ab22-949f1696254c';

function id() {
  return require('crypto').randomUUID();
}

async function main() {
  console.log('🌱 Demo ma\'lumotlar yaratilmoqda...\n');

  // ─── Waiter PIN ───────────────────────────────────────────────
  const pin3456 = await bcrypt.hash('3456', 10);
  await prisma.user.updateMany({
    where: { email: 'ofitsiant@oshxona.uz' },
    data: { pinCode: pin3456 },
  });
  console.log('✅ Ofitsiant PIN: 3456');

  // ─── Cleanup (order matters due to FK) ───────────────────────
  await prisma.orderItem.deleteMany({ where: { order: { tenantId: TENANT_ID } } });
  await prisma.order.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.product.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.category.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.table.deleteMany({ where: { tenantId: TENANT_ID } });

  // ─── Tables ───────────────────────────────────────────────────

  const tableData = [
    { number: 1,  name: '1-stol',  capacity: 2, status: 'FREE',     posX: 1, posY: 1 },
    { number: 2,  name: '2-stol',  capacity: 4, status: 'OCCUPIED',  posX: 2, posY: 1 },
    { number: 3,  name: '3-stol',  capacity: 4, status: 'FREE',     posX: 3, posY: 1 },
    { number: 4,  name: '4-stol',  capacity: 6, status: 'OCCUPIED',  posX: 1, posY: 2 },
    { number: 5,  name: '5-stol',  capacity: 2, status: 'RESERVED', posX: 2, posY: 2 },
    { number: 6,  name: '6-stol',  capacity: 4, status: 'FREE',     posX: 3, posY: 2 },
    { number: 7,  name: '7-stol',  capacity: 6, status: 'OCCUPIED',  posX: 1, posY: 3 },
    { number: 8,  name: '8-stol',  capacity: 4, status: 'FREE',     posX: 2, posY: 3 },
    { number: 9,  name: '9-stol',  capacity: 2, status: 'FREE',     posX: 3, posY: 3 },
    { number: 10, name: '10-stol', capacity: 8, status: 'RESERVED', posX: 1, posY: 4 },
    { number: 11, name: 'VIP-1',   capacity: 6, status: 'FREE',     posX: 2, posY: 4 },
    { number: 12, name: 'VIP-2',   capacity: 8, status: 'OCCUPIED',  posX: 3, posY: 4 },
  ];

  const tables = [];
  for (const t of tableData) {
    const tbl = await prisma.table.create({
      data: {
        id: id(),
        number: t.number,
        name: t.name,
        capacity: t.capacity,
        status: t.status,
        qrCode: `qr-table-${t.number}-${TENANT_ID}`,
        positionX: t.posX,
        positionY: t.posY,
        isActive: true,
        tenantId: TENANT_ID,
      },
    });
    tables.push(tbl);
  }
  console.log(`✅ ${tables.length} ta stol yaratildi`);

  // ─── Categories ───────────────────────────────────────────────
  const catData = [
    { name: 'Issiq taomlar', nameRu: 'Горячие блюда', slug: 'hot-meals',    sort: 1 },
    { name: 'Salatlar',       nameRu: 'Салаты',        slug: 'salads',       sort: 2 },
    { name: 'Ichimliklar',    nameRu: 'Напитки',       slug: 'drinks',       sort: 3 },
    { name: 'Dessertlar',     nameRu: 'Десерты',       slug: 'desserts',     sort: 4 },
    { name: 'Non va gazaklar',nameRu: 'Хлеб и закуски',slug: 'bread-snacks', sort: 5 },
  ];

  const cats = {};
  for (const c of catData) {
    const cat = await prisma.category.create({
      data: {
        id: id(),
        name: c.name,
        nameRu: c.nameRu,
        slug: c.slug,
        sortOrder: c.sort,
        isActive: true,
        tenantId: TENANT_ID,
      },
    });
    cats[c.slug] = cat;
  }
  console.log(`✅ ${catData.length} ta kategoriya yaratildi`);

  // ─── Products ─────────────────────────────────────────────────
  const prodData = [
    // Issiq taomlar
    { name: 'Osh (Plov)',     nameRu: 'Плов',          price: 35000, cost: 18000, catSlug: 'hot-meals',   time: 30, cal: 450, sort: 1 },
    { name: 'Lag\'mon',       nameRu: 'Лагман',        price: 28000, cost: 14000, catSlug: 'hot-meals',   time: 20, cal: 380, sort: 2 },
    { name: 'Shurpa',         nameRu: 'Шурпа',         price: 25000, cost: 12000, catSlug: 'hot-meals',   time: 15, cal: 320, sort: 3 },
    { name: 'Manti',          nameRu: 'Манты',         price: 32000, cost: 15000, catSlug: 'hot-meals',   time: 25, cal: 420, sort: 4 },
    { name: 'Mastava',        nameRu: 'Мастава',       price: 22000, cost: 10000, catSlug: 'hot-meals',   time: 15, cal: 280, sort: 5 },
    { name: 'Kabob',          nameRu: 'Шашлык',        price: 45000, cost: 25000, catSlug: 'hot-meals',   time: 20, cal: 520, sort: 6 },
    { name: 'Norin',          nameRu: 'Норин',         price: 30000, cost: 14000, catSlug: 'hot-meals',   time: 20, cal: 400, sort: 7 },
    { name: 'Dimlama',        nameRu: 'Димляма',       price: 38000, cost: 20000, catSlug: 'hot-meals',   time: 35, cal: 480, sort: 8 },
    // Salatlar
    { name: 'Achichuk',       nameRu: 'Ачичук',        price: 12000, cost:  5000, catSlug: 'salads',      time:  5, cal: 80,  sort: 1 },
    { name: 'Toshkent salati',nameRu: 'Ташкентский салат', price: 18000, cost: 8000, catSlug: 'salads',  time:  8, cal: 160, sort: 2 },
    { name: 'Olivye',         nameRu: 'Оливье',        price: 20000, cost:  9000, catSlug: 'salads',      time: 10, cal: 220, sort: 3 },
    // Ichimliklar
    { name: 'Choy',           nameRu: 'Чай',           price:  6000, cost:  1000, catSlug: 'drinks',      time:  3, cal: 5,   sort: 1 },
    { name: 'Kofe',           nameRu: 'Кофе',          price: 15000, cost:  4000, catSlug: 'drinks',      time:  5, cal: 15,  sort: 2 },
    { name: 'Limonod',        nameRu: 'Лимонад',       price: 10000, cost:  3000, catSlug: 'drinks',      time:  3, cal: 120, sort: 3 },
    { name: 'Kompot',         nameRu: 'Компот',        price:  7000, cost:  2000, catSlug: 'drinks',      time:  3, cal: 90,  sort: 4 },
    { name: 'Coca-Cola 0.5L', nameRu: 'Кока-Кола',    price: 12000, cost:  5000, catSlug: 'drinks',      time:  1, cal: 210, sort: 5 },
    { name: 'Mineral suv',    nameRu: 'Минеральная вода', price: 6000, cost: 2000, catSlug: 'drinks',     time:  1, cal: 0,   sort: 6 },
    // Dessertlar
    { name: 'Halvo',          nameRu: 'Халва',         price: 15000, cost:  6000, catSlug: 'desserts',    time:  3, cal: 350, sort: 1 },
    { name: 'Chak-chak',      nameRu: 'Чак-чак',      price: 18000, cost:  8000, catSlug: 'desserts',    time:  3, cal: 420, sort: 2 },
    // Non va gazaklar
    { name: 'Non',            nameRu: 'Лепёшка',       price:  4000, cost:  1500, catSlug: 'bread-snacks',time:  5, cal: 200, sort: 1 },
    { name: 'Somsa',          nameRu: 'Самса',         price:  8000, cost:  3000, catSlug: 'bread-snacks',time: 15, cal: 280, sort: 2 },
  ];

  const prods = {};
  for (const p of prodData) {
    const prod = await prisma.product.create({
      data: {
        id: id(),
        name: p.name,
        nameRu: p.nameRu,
        price: p.price,
        costPrice: p.cost,
        categoryId: cats[p.catSlug].id,
        cookingTime: p.time,
        calories: p.cal,
        sortOrder: p.sort,
        isActive: true,
        isFeatured: p.sort === 1,
        isAvailableOnline: true,
        tenantId: TENANT_ID,
      },
    });
    prods[p.name] = prod;
  }
  console.log(`✅ ${prodData.length} ta mahsulot yaratildi`);

  // ─── Active orders on occupied tables ─────────────────────────

  const waiter = await prisma.user.findFirst({ where: { email: 'ofitsiant@oshxona.uz' } });
  const occupiedTables = tables.filter(t => t.status === 'OCCUPIED');

  const orderDefs = [
    {
      table: occupiedTables[0],
      num: 'ORD-001',
      items: [
        { prod: 'Osh (Plov)', qty: 2 },
        { prod: 'Shurpa',     qty: 1 },
        { prod: 'Choy',       qty: 3 },
        { prod: 'Non',        qty: 2 },
      ],
      status: 'PREPARING',
    },
    {
      table: occupiedTables[1],
      num: 'ORD-002',
      items: [
        { prod: 'Kabob',      qty: 3 },
        { prod: 'Achichuk',   qty: 2 },
        { prod: 'Coca-Cola 0.5L', qty: 3 },
        { prod: 'Non',        qty: 3 },
      ],
      status: 'NEW',
    },
    {
      table: occupiedTables[2],
      num: 'ORD-003',
      items: [
        { prod: 'Lag\'mon',   qty: 2 },
        { prod: 'Manti',      qty: 1 },
        { prod: 'Limonod',    qty: 2 },
        { prod: 'Chak-chak',  qty: 2 },
      ],
      status: 'READY',
    },
    {
      table: occupiedTables[3],
      num: 'ORD-004',
      items: [
        { prod: 'Dimlama',    qty: 2 },
        { prod: 'Olivye',     qty: 1 },
        { prod: 'Kofe',       qty: 2 },
        { prod: 'Somsa',      qty: 4 },
      ],
      status: 'PREPARING',
    },
  ];

  for (const od of orderDefs) {
    if (!od.table) continue;

    let subtotal = 0;
    const itemsData = od.items.map(i => {
      const p = prods[i.prod];
      const lineTotal = Number(p.price) * i.qty;
      subtotal += lineTotal;
      return {
        id: id(),
        productId: p.id,
        quantity: i.qty,
        price: p.price,
        total: lineTotal,
        status: od.status === 'READY' ? 'READY' : od.status === 'PREPARING' ? 'PREPARING' : 'PENDING',
      };
    });

    await prisma.order.create({
      data: {
        id: id(),
        orderNumber: od.num,
        source: 'POS_ORDER',
        type: 'DINE_IN',
        status: od.status,
        tableId: od.table.id,
        userId: waiter.id,
        subtotal,
        discount: 0,
        tax: 0,
        total: subtotal,
        tenantId: TENANT_ID,
        items: { create: itemsData },
      },
    });
  }

  console.log(`✅ ${orderDefs.length} ta aktiv buyurtma yaratildi`);
  console.log('\n🎉 Hammasi tayyor!\n');
  console.log('📱 Ofitsiant ilovasi PIN: 3456');
  console.log('🪑 Stollar: 12 ta (4 ta band, 2 ta bron, 6 ta bo\'sh)');
  console.log('🍽️  Mahsulotlar: 21 ta (5 kategoriya)');
  console.log('📋 Buyurtmalar: 4 ta faol (ORD-001..004)');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
