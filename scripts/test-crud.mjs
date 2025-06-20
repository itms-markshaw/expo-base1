/**
 * Command-line CRUD testing script
 * Run with: node scripts/test-crud.mjs
 */

import { OdooXMLRPCClient } from '../src/services/OdooXMLRPCClient.ts';
import { ODOO_CONFIG } from '../src/config/odoo.ts';

console.log('🧪 CRUD Testing Script for Odoo');
console.log('================================');

async function runCRUDTests() {
  try {
    // Initialize client
    console.log('🔐 Connecting to Odoo...');
    const client = new OdooXMLRPCClient({
      baseURL: ODOO_CONFIG.baseURL,
      database: ODOO_CONFIG.db,
      username: ODOO_CONFIG.username,
      apiKey: ODOO_CONFIG.apiKey,
    });

    // Test connection
    const connectionTest = await client.testConnection();
    if (!connectionTest.success) {
      throw new Error(`Connection failed: ${connectionTest.error}`);
    }
    console.log('✅ Connected successfully!');

    // Test Users CRUD
    console.log('\n👤 Testing Users CRUD Operations...');
    await testUsersCRUD(client);

    // Test Contacts CRUD
    console.log('\n👥 Testing Contacts CRUD Operations...');
    await testContactsCRUD(client);

    console.log('\n🎉 All CRUD tests completed successfully!');
    console.log('Your Odoo integration is working perfectly.');

  } catch (error) {
    console.error('❌ CRUD tests failed:', error.message);
    process.exit(1);
  }
}

async function testUsersCRUD(client) {
  let testUserId = null;

  try {
    // 1. READ - Get existing users
    console.log('  📖 Reading existing users...');
    const users = await client.searchRead('res.users', [], ['name', 'login', 'email'], { limit: 3 });
    console.log(`  ✅ Found ${users.length} users`);

    // 2. CREATE - Create a test user
    console.log('  ✨ Creating test user...');
    const userData = {
      name: `Test User ${Date.now()}`,
      login: `testuser_${Date.now()}@example.com`,
      email: `testuser_${Date.now()}@example.com`,
      password: 'testpassword123',
    };
    
    testUserId = await client.create('res.users', userData);
    console.log(`  ✅ Created user with ID: ${testUserId}`);

    // 3. UPDATE - Update the test user
    console.log('  📝 Updating test user...');
    const updateData = {
      name: `Updated Test User ${Date.now()}`,
    };
    
    await client.update('res.users', testUserId, updateData);
    console.log(`  ✅ Updated user ${testUserId}`);

    // 4. READ - Read the updated user
    console.log('  📖 Reading updated user...');
    const updatedUser = await client.read('res.users', testUserId, ['name', 'login', 'email']);
    console.log(`  ✅ Read user: ${updatedUser[0].name}`);

    // 5. DELETE - Delete the test user
    console.log('  🗑️ Deleting test user...');
    await client.delete('res.users', testUserId);
    console.log(`  ✅ Deleted user ${testUserId}`);

  } catch (error) {
    console.error(`  ❌ Users CRUD failed: ${error.message}`);
    
    // Cleanup: try to delete test user if it was created
    if (testUserId) {
      try {
        await client.delete('res.users', testUserId);
        console.log(`  🧹 Cleaned up test user ${testUserId}`);
      } catch (cleanupError) {
        console.error(`  ⚠️ Failed to cleanup test user: ${cleanupError.message}`);
      }
    }
    throw error;
  }
}

async function testContactsCRUD(client) {
  let testContactId = null;

  try {
    // 1. READ - Get existing contacts
    console.log('  📖 Reading existing contacts...');
    const contacts = await client.searchRead('res.partner', [], ['name', 'email', 'phone'], { limit: 3 });
    console.log(`  ✅ Found ${contacts.length} contacts`);

    // 2. CREATE - Create a test contact
    console.log('  ✨ Creating test contact...');
    const contactData = {
      name: `Test Contact ${Date.now()}`,
      email: `testcontact_${Date.now()}@example.com`,
      phone: '+1234567890',
      is_company: false,
    };
    
    testContactId = await client.create('res.partner', contactData);
    console.log(`  ✅ Created contact with ID: ${testContactId}`);

    // 3. UPDATE - Update the test contact
    console.log('  📝 Updating test contact...');
    const updateData = {
      name: `Updated Test Contact ${Date.now()}`,
      phone: '+0987654321',
    };
    
    await client.update('res.partner', testContactId, updateData);
    console.log(`  ✅ Updated contact ${testContactId}`);

    // 4. READ - Read the updated contact
    console.log('  📖 Reading updated contact...');
    const updatedContact = await client.read('res.partner', testContactId, ['name', 'email', 'phone']);
    console.log(`  ✅ Read contact: ${updatedContact[0].name}`);

    // 5. DELETE - Delete the test contact
    console.log('  🗑️ Deleting test contact...');
    await client.delete('res.partner', testContactId);
    console.log(`  ✅ Deleted contact ${testContactId}`);

  } catch (error) {
    console.error(`  ❌ Contacts CRUD failed: ${error.message}`);
    
    // Cleanup: try to delete test contact if it was created
    if (testContactId) {
      try {
        await client.delete('res.partner', testContactId);
        console.log(`  🧹 Cleaned up test contact ${testContactId}`);
      } catch (cleanupError) {
        console.error(`  ⚠️ Failed to cleanup test contact: ${cleanupError.message}`);
      }
    }
    throw error;
  }
}

// Run the tests
runCRUDTests();
