/**
 * SQLite test example for Hawiah
 * Test SQLite driver with better-sqlite3
 */

const { Hawiah } = require('./dist/Hawiah');
const { SQLiteDriver } = require('./dist/drivers/SQLiteDriver');

async function runSQLiteTest() {
    console.log('💾 Starting SQLite Hawiah Test...\n');

    // Initialize SQLite driver
    const driver = new SQLiteDriver({
        filename: './test.db', // or use ':memory:' for in-memory database
        tableName: 'users'
    });

    // Create Hawiah instance
    const db = new Hawiah(driver);

    try {
        // Connect to SQLite
        console.log('📡 Connecting to SQLite...');
        await db.connect();
        console.log('✅ Connected successfully!\n');

        // Clear existing data
        console.log('🧹 Clearing existing data...');
        await db.clear();
        console.log('✅ Data cleared!\n');

        // Insert test data
        console.log('➕ Inserting test users...');
        const user1 = await db.insert({
            name: 'Ahmed Hassan',
            email: 'ahmed@example.com',
            age: 28,
            city: 'Cairo'
        });
        console.log('✅ Inserted user:', user1.name, '- ID:', user1._id.substring(0, 15) + '...');

        await db.insertMany([
            { name: 'Mohamed Ali', email: 'mohamed@example.com', age: 32, city: 'Alexandria' },
            { name: 'Fatma Youssef', email: 'fatma@example.com', age: 26, city: 'Cairo' },
            { name: 'Sara Ahmed', email: 'sara@example.com', age: 29, city: 'Giza' },
            { name: 'Omar Ibrahim', email: 'omar@example.com', age: 35, city: 'Cairo' }
        ]);
        console.log('✅ Inserted 4 more users\n');

        // Get operations
        console.log('📥 Getting all users...');
        const allUsers = await db.getAll();
        console.log('✅ Total users:', allUsers.length);
        allUsers.forEach(user => console.log(`   - ${user.name} (${user.city}, ${user.age} years)`));

        console.log('\n📥 Getting users from Cairo...');
        const cairoUsers = await db.get({ city: 'Cairo' });
        console.log('✅ Cairo users:', cairoUsers.length);
        cairoUsers.forEach(user => console.log(`   - ${user.name}`));

        console.log('\n📥 Getting one user by email...');
        const oneUser = await db.getOne({ email: 'ahmed@example.com' });
        console.log('✅ Found:', oneUser.name, '-', oneUser.email);

        console.log('\n📥 Getting user by ID...');
        const userById = await db.getById(user1._id);
        console.log('✅ Found by ID:', userById.name);

        // Count operations
        console.log('\n🔢 Counting operations...');
        const totalCount = await db.count();
        console.log('✅ Total count:', totalCount);

        const cairoCount = await db.countBy('city', 'Cairo');
        console.log('✅ Cairo count:', cairoCount);

        // Exists operations
        console.log('\n🔍 Checking existence...');
        const exists = await db.has({ email: 'ahmed@example.com' });
        console.log('✅ User exists:', exists);

        const idExists = await db.hasId(user1._id);
        console.log('✅ ID exists:', idExists);

        // Update operations
        console.log('\n✏️ Updating user...');
        await db.update({ email: 'ahmed@example.com' }, { age: 29, verified: true });
        const updatedUser = await db.getOne({ email: 'ahmed@example.com' });
        console.log('✅ Updated:', updatedUser.name, '- Age:', updatedUser.age, '- Verified:', updatedUser.verified);

        console.log('\n✏️ Updating by ID...');
        await db.updateById(user1._id, { city: 'Giza', country: 'Egypt' });
        const updatedById = await db.getById(user1._id);
        console.log('✅ Updated city to:', updatedById.city, '- Country:', updatedById.country);

        // Increment/Decrement
        console.log('\n➕ Incrementing age...');
        const newAge = await db.increment({ email: 'ahmed@example.com' }, 'age', 2);
        console.log('✅ New age after increment:', newAge);

        console.log('\n➖ Decrementing age...');
        const decrementedAge = await db.decrement({ email: 'ahmed@example.com' }, 'age', 1);
        console.log('✅ Age after decrement:', decrementedAge);

        // Array operations
        console.log('\n📝 Array operations...');
        await db.update({ email: 'ahmed@example.com' }, { skills: ['JavaScript', 'TypeScript'] });
        console.log('✅ Added skills array');

        await db.push({ email: 'ahmed@example.com' }, 'skills', 'React');
        await db.push({ email: 'ahmed@example.com' }, 'skills', 'Node.js');
        const userWithSkills = await db.getOne({ email: 'ahmed@example.com' });
        console.log('✅ Skills after push:', userWithSkills.skills.join(', '));

        await db.unshift({ email: 'ahmed@example.com' }, 'skills', 'HTML');
        const userAfterUnshift = await db.getOne({ email: 'ahmed@example.com' });
        console.log('✅ Skills after unshift:', userAfterUnshift.skills.join(', '));

        await db.pull({ email: 'ahmed@example.com' }, 'skills', 'TypeScript');
        const userAfterPull = await db.getOne({ email: 'ahmed@example.com' });
        console.log('✅ Skills after pull:', userAfterPull.skills.join(', '));

        // Utility operations
        console.log('\n📊 Utility operations...');
        const uniqueCities = await db.unique('city');
        console.log('✅ Unique cities:', uniqueCities.join(', '));

        const grouped = await db.group('city');
        console.log('✅ Grouped by city:');
        for (const [city, users] of Object.entries(grouped)) {
            console.log(`   ${city}: ${users.length} users`);
        }

        console.log('\n📊 Sum of ages...');
        const totalAge = await db.sum('age');
        console.log('✅ Total age:', totalAge);

        // Sort operations
        console.log('\n⬆️ Sorting by age (ascending)...');
        const sortedAsc = await db.sort({}, 'age', 'asc');
        console.log('✅ Youngest to oldest:');
        sortedAsc.forEach(user => console.log(`   ${user.name}: ${user.age} years`));

        console.log('\n⬇️ Sorting by age (descending)...');
        const sortedDesc = await db.sort({}, 'age', 'desc');
        console.log('✅ Oldest:', sortedDesc[0].name, '(', sortedDesc[0].age, 'years )');

        // Select specific fields
        console.log('\n📋 Selecting specific fields...');
        const selected = await db.select({}, ['name', 'email', 'city']);
        console.log('✅ Selected fields (first user):', selected[0]);

        // Pagination
        console.log('\n📄 Pagination test...');
        const page1 = await db.paginate({}, 1, 2);
        console.log('✅ Page 1 (2 per page):');
        page1.data.forEach(user => console.log(`   - ${user.name}`));
        console.log('   Total pages:', page1.totalPages);

        // Random
        console.log('\n🎲 Getting random users...');
        const randomUsers = await db.random(2);
        console.log('✅ Random users:', randomUsers.map(u => u.name).join(', '));

        // Save operation
        console.log('\n💾 Save operation (update existing)...');
        await db.save(
            { email: 'ahmed@example.com' },
            { name: 'Ahmed Hassan Updated', status: 'active' }
        );
        const savedUser = await db.getOne({ email: 'ahmed@example.com' });
        console.log('✅ Saved user:', savedUser.name, '- Status:', savedUser.status);

        console.log('\n💾 Save operation (insert new)...');
        await db.save(
            { email: 'new@example.com' },
            { name: 'New User', age: 25, city: 'Luxor' }
        );
        const newUser = await db.getOne({ email: 'new@example.com' });
        console.log('✅ New user created:', newUser.name);

        // Field operations
        console.log('\n🏷️ Field operations...');
        await db.rename({ email: 'ahmed@example.com' }, 'verified', 'isVerified');
        const renamedUser = await db.getOne({ email: 'ahmed@example.com' });
        console.log('✅ Field renamed. isVerified:', renamedUser.isVerified);

        await db.unset({ email: 'ahmed@example.com' }, 'country');
        const unsetUser = await db.getOne({ email: 'ahmed@example.com' });
        console.log('✅ Field removed. Has country:', 'country' in (unsetUser || {}));

        // First/Last
        console.log('\n🥇 First/Last operations...');
        const firstUser = await db.first();
        console.log('✅ First user:', firstUser.name);

        const lastUser = await db.last();
        console.log('✅ Last user:', lastUser.name);

        // Delete operations
        console.log('\n🗑️ Delete operations...');
        await db.removeOne({ email: 'new@example.com' });
        console.log('✅ Removed new user');

        const removedById = await db.removeById(user1._id);
        console.log('✅ Removed by ID:', removedById);

        await db.remove({ city: 'Giza' });
        console.log('✅ Removed all Giza users');

        // Final status
        console.log('\n📊 Final status...');
        const finalCount = await db.count();
        console.log('✅ Final count:', finalCount);

        const isEmpty = await db.isEmpty();
        console.log('✅ Database is empty:', isEmpty);

        // Show remaining users
        console.log('\n👥 Remaining users:');
        const remaining = await db.getAll();
        remaining.forEach(user => console.log(`   - ${user.name} (${user.city})`));

        // Cleanup
        // console.log('\n🧹 Final cleanup...');
        // await db.clear();
        console.log('✅ All data cleared!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        // Disconnect
        console.log('\n🔌 Disconnecting...');
        await db.disconnect();
        console.log('✅ Disconnected!');
        console.log('\n🎉 SQLite test completed!\n');
    }
}

// Run the test
runSQLiteTest().catch(console.error);
