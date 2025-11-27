const { Hawiah, FileDriver } = require('../dist/index');
const path = require('path');

async function main() {
  const dbPath = path.join(__dirname, 'data', 'users.json');
  const db = new Hawiah(new FileDriver(dbPath));

  await db.connect();

  console.log('🚀 Hawiah - FileDriver Example');
  console.log('📁 Database file:', dbPath);
  console.log('');

  const existingCount = await db.count({});
  console.log(`📊 Existing records: ${existingCount}\n`);

  console.log('➕ Adding new users...');
  await db.set({
    name: 'Ahmed',
    email: 'ahmed@example.com',
    role: 'admin',
    createdDate: new Date().toLocaleDateString('ar-EG')
  });

  await db.set({
    name: 'Mohamed',
    email: 'mohamed@example.com',
    role: 'user',
    createdDate: new Date().toLocaleDateString('ar-EG')
  });

  console.log('\n👥 All users:');
  const users = await db.get({});
  users.forEach(user => {
    console.log(`  - ${user.name} (${user.email}) - ${user.role}`);
  });

  console.log('\n👑 Admins only:');
  const admins = await db.get({ role: 'admin' });
  admins.forEach(admin => {
    console.log(`  - ${admin.name} (${admin.email})`);
  });

  console.log(`\n📊 Total users: ${await db.count({})}`);
  console.log(`📊 Admins: ${await db.count({ role: 'admin' })}`);

  await db.disconnect();
  console.log('\n✅ Data saved to file!');
  console.log(`💾 Check: ${dbPath}`);
}

main().catch(console.error);
