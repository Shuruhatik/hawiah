const { Hawiah, MemoryDriver } = require('../dist/index');

/**
 * Advanced Example: User Management System
 * مثال متقدم: نظام إدارة المستخدمين
 */
class UserManager {
  constructor(db) {
    this.db = db;
  }

  /**
   * Register new user
   */
  async registerUser(name, email, password, role = 'user') {
    // Check if email already exists
    const exists = await this.db.exists({ email });
    if (exists) {
      throw new Error('Email already registered');
    }

    // Create user
    const user = await this.db.set({
      name,
      email,
      password, // في التطبيق الحقيقي، اعمل hash للباسورد
      role,
      status: 'active',
      registeredAt: new Date().toISOString()
    });

    console.log(`✅ User registered: ${user.name} (${user.email})`);
    return user;
  }

  /**
   * Login user
   */
  async loginUser(email, password) {
    const user = await this.db.getOne({ email, password, status: 'active' });

    if (!user) {
      throw new Error('Invalid credentials or account inactive');
    }

    // Update last login
    await this.db.update(
      { email },
      { lastLogin: new Date().toISOString() }
    );

    console.log(`🔐 User logged in: ${user.name}`);
    return user;
  }

  /**
   * Get user profile
   */
  async getProfile(email) {
    const user = await this.db.getOne({ email });
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(email, updates) {
    const count = await this.db.update({ email }, updates);

    if (count === 0) {
      throw new Error('User not found');
    }

    console.log(`✏️ Profile updated for: ${email}`);
    return await this.getProfile(email);
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(email) {
    const count = await this.db.update({ email }, { status: 'inactive' });

    if (count === 0) {
      throw new Error('User not found');
    }

    console.log(`🚫 User deactivated: ${email}`);
  }

  /**
   * Get all active users
   */
  async getActiveUsers() {
    return await this.db.get({ status: 'active' });
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role) {
    return await this.db.get({ role, status: 'active' });
  }

  /**
   * Get statistics
   */
  async getStats() {
    const totalUsers = await this.db.count({});
    const activeUsers = await this.db.count({ status: 'active' });
    const inactiveUsers = await this.db.count({ status: 'inactive' });
    const admins = await this.db.count({ role: 'admin', status: 'active' });

    return {
      total: totalUsers,
      active: activeUsers,
      inactive: inactiveUsers,
      admins
    };
  }
}

/**
 * Demo
 */
async function demo() {
  const db = new Hawiah(new MemoryDriver());
  await db.connect();

  const userManager = new UserManager(db);

  console.log('🚀 User Management System Demo\n');
  console.log('='.repeat(50));

  try {
    // Register users
    console.log('\n📝 Registering users...\n');
    await userManager.registerUser('Ahmed Ali', 'ahmed@test.com', 'pass123', 'admin');
    await userManager.registerUser('Mohamed Hassan', 'mohamed@test.com', 'pass456', 'user');
    await userManager.registerUser('Sara Ahmed', 'sara@test.com', 'pass789', 'user');

    // Try duplicate registration
    console.log('\n⚠️ Trying duplicate registration...');
    try {
      await userManager.registerUser('Ahmed', 'ahmed@test.com', 'pass', 'user');
    } catch (error) {
      console.log(`❌ ${error.message}`);
    }

    // Login
    console.log('\n🔐 User login...\n');
    const loggedInUser = await userManager.loginUser('ahmed@test.com', 'pass123');
    console.log(`Welcome back, ${loggedInUser.name}!`);

    // Get profile
    console.log('\n👤 Getting user profile...\n');
    const profile = await userManager.getProfile('mohamed@test.com');
    console.log('Profile:', {
      name: profile.name,
      email: profile.email,
      role: profile.role,
      status: profile.status
    });

    // Update profile
    console.log('\n✏️ Updating profile...\n');
    await userManager.updateProfile('mohamed@test.com', {
      name: 'Mohamed Hassan Ali',
      phone: '+20123456789'
    });

    // Get all active users
    console.log('\n👥 Active users:');
    const activeUsers = await userManager.getActiveUsers();
    activeUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.role}`);
    });

    // Get admins
    console.log('\n👑 Administrators:');
    const admins = await userManager.getUsersByRole('admin');
    admins.forEach(admin => {
      console.log(`  - ${admin.name} (${admin.email})`);
    });

    // Deactivate user
    console.log('\n🚫 Deactivating user...\n');
    await userManager.deactivateUser('sara@test.com');

    // Statistics
    console.log('\n📊 Statistics:');
    const stats = await userManager.getStats();
    console.log(`  Total users: ${stats.total}`);
    console.log(`  Active users: ${stats.active}`);
    console.log(`  Inactive users: ${stats.inactive}`);
    console.log(`  Admins: ${stats.admins}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  await db.disconnect();
  console.log('\n' + '='.repeat(50));
  console.log('✅ Demo completed!');
}

// Run demo
demo().catch(console.error);
