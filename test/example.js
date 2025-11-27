const { Hawiah, MemoryDriver } = require('../dist/index');

async function main() {
  const db = new Hawiah(new MemoryDriver());
  await db.connect();

  console.log('🚀 Hawiah - Simple Example\n');

  console.log('Adding users...');
  await db.set({ name: 'Ahmed', email: 'ahmed@test.com', pass: '12345' });
  await db.set({ name: 'Mohamed', email: 'mohamed@test.com', pass: 'pass123' });
  await db.set({ name: 'Sara', email: 'sara@test.com', pass: 'secret' });

  console.log('\n📧 Getting user by email:');
  const user = await db.getOne({ email: 'ahmed@test.com' });
  console.log(user);

  console.log('\n👥 All users:');
  const allUsers = await db.get({});
  console.log(allUsers);

  console.log('\n✏️ Updating user...');
  await db.update({ email: 'ahmed@test.com' }, { name: 'Ahmed Ali' });
  const updated = await db.getOne({ email: 'ahmed@test.com' });
  console.log('Updated:', updated);

  console.log('\n🔢 Total users:', await db.count({}));

  console.log('\n🗑️ Deleting user...');
  await db.delete({ email: 'sara@test.com' });
  console.log('Remaining users:', await db.count({})); 

  console.log('\n🎯 Testing new methods...');
  console.log('First user:', await db.first());
  console.log('Last user:', await db.last());
  console.log('Is empty?', await db.isEmpty());
  console.log('Find by ID:', await db.findById(1));

  await db.disconnect();
  console.log('\n✅ Done!');
}

main().catch(console.error);
