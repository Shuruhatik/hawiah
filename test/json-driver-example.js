const { Hawiah, JsonDriver } = require('../dist/index');
const path = require('path');

async function main() {
  const dbPath = path.join(__dirname, 'data', 'products.json');
  const db = new Hawiah(new JsonDriver(dbPath, true));

  await db.connect();

  console.log('🚀 Hawiah - JsonDriver Example');
  console.log('📁 Database file:', dbPath);
  console.log('');

  const existingCount = await db.count({});
  console.log(`📊 Existing records: ${existingCount}\n`);

  console.log('➕ Adding products...');
  await db.set({
    name: 'Laptop',
    price: 15000,
    category: 'electronics',
    stock: 50
  });

  await db.set({
    name: 'Mouse',
    price: 200,
    category: 'electronics',
    stock: 100
  });

  await db.set({
    name: 'Desk',
    price: 3000,
    category: 'furniture',
    stock: 20
  });

  console.log('\n📦 All products:');
  const products = await db.getAll();
  products.forEach(product => {
    console.log(`  - ${product.name} (${product.price} EGP) - Stock: ${product.stock}`);
  });

  console.log('\n💻 Electronics only:');
  const electronics = await db.get({ category: 'electronics' });
  electronics.forEach(item => {
    console.log(`  - ${item.name} - ${item.price} EGP`);
  });

  console.log('\n🎯 Testing new Hawiah methods...');

  console.log('First product:', (await db.first())?.name);
  console.log('Last product:', (await db.last())?.name);
  console.log('Find by ID:', (await db.findById(1))?.name);

  console.log('\n📊 Using pagination:');
  const page1 = await db.paginate({}, 1, 2);
  console.log(`Page ${page1.page} of ${page1.totalPages} (Total: ${page1.total})`);
  page1.data.forEach(p => console.log(`  - ${p.name}`));

  console.log('\n💰 Increment stock for laptop:');
  const laptop = await db.getOne({ name: 'Laptop' });
  if (laptop) {
    const newStock = await db.increment({ name: 'Laptop' }, 'stock', 10);
    console.log(`New stock: ${newStock}`);
  }

  console.log('\n🔍 Search by field:');
  const cheapItems = await db.getByField('category', 'electronics');
  console.log(`Found ${cheapItems.length} electronics items`);

  console.log('\n🆕 Testing upsert:');
  await db.upsert(
    { name: 'Laptop' },
    { name: 'Laptop', price: 14500, category: 'electronics', stock: 60 }
  );
  console.log('Laptop upserted successfully');

  console.log(`\n📊 Total products: ${await db.count({})}`);
  console.log(`📊 Electronics: ${await db.countBy('category', 'electronics')}`);
  console.log(`📊 Furniture: ${await db.countBy('category', 'furniture')}`);

  await db.disconnect();
  console.log('\n✅ Data saved to file!');
  console.log(`💾 Check: ${dbPath}`);
}

main().catch(console.error);
