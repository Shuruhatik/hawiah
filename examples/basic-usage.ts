import { Hawiah, MemoryDriver } from '../src/index';

async function main() {
  const db = new Hawiah(new MemoryDriver());

  // Connect to the database
  await db.connect();

  console.log('🚀 HAWIAH Example\n');

  // === SET: Store data (super easy!) ===
  console.log('📝 Setting data...');
  const user1 = await db.set({
    name: 'Ahmed',
    email: 'ahmed@example.com',
    pass: 'password123',
    age: 25
  });
  console.log('User 1 created:', user1);

  const user2 = await db.set({
    name: 'Mohamed',
    email: 'mohamed@example.com',
    pass: 'securepass',
    age: 30
  });
  console.log('User 2 created:', user2);

  const user3 = await db.set({
    name: 'Sara',
    email: 'sara@example.com',
    pass: 'mypassword',
    age: 25
  });
  console.log('User 3 created:', user3);

  console.log('\n---\n');

  // === GET: Retrieve data by query ===
  console.log('🔍 Getting data...');
  const users = await db.get({ email: 'ahmed@example.com' });
  console.log('Found user by email:', users);

  const usersByAge = await db.get({ age: 25 });
  console.log('Found users with age 25:', usersByAge);

  console.log('\n---\n');

  // === GET ONE: Get a single record ===
  console.log('🎯 Getting one record...');
  const singleUser = await db.getOne({ name: 'Mohamed' });
  console.log('Single user:', singleUser);

  console.log('\n---\n');

  // === EXISTS: Check if record exists ===
  console.log('✅ Checking existence...');
  const exists = await db.exists({ email: 'ahmed@example.com' });
  console.log('Does email exist?', exists);

  const notExists = await db.exists({ email: 'nonexistent@example.com' });
  console.log('Does nonexistent email exist?', notExists);

  console.log('\n---\n');

  // === COUNT: Count records ===
  console.log('🔢 Counting records...');
  const totalUsers = await db.count({});
  console.log('Total users:', totalUsers);

  const usersAge25 = await db.count({ age: 25 });
  console.log('Users with age 25:', usersAge25);

  console.log('\n---\n');

  // === UPDATE: Modify data ===
  console.log('✏️ Updating data...');
  const updatedCount = await db.update(
    { email: 'ahmed@example.com' },
    { name: 'Ahmed Ali', age: 26 }
  );
  console.log('Updated records:', updatedCount);

  const updatedUser = await db.getOne({ email: 'ahmed@example.com' });
  console.log('Updated user:', updatedUser);

  console.log('\n---\n');

  // === DELETE: Remove data ===
  console.log('🗑️ Deleting data...');
  const deletedCount = await db.delete({ email: 'sara@example.com' });
  console.log('Deleted records:', deletedCount);

  const remainingUsers = await db.get({});
  console.log('Remaining users:', remainingUsers);

  console.log('\n---\n');

  // === GET ALL: Get all remaining data ===
  console.log('📋 All remaining data:');
  const allUsers = await db.get({});
  console.log(allUsers);

  // Disconnect
  await db.disconnect();
  console.log('\n✅ Done!');
}

// Run the example
main().catch(console.error);
