#!/usr/bin/env node

/**
 * Test Database Migration Script
 * Tests the database migration for adding the name column to messages table
 */

import { databaseService } from '../src/services/database.js';

async function testDatabaseMigration() {
  console.log('🧪 Testing Database Migration...');
  
  try {
    // Initialize database (this will run migrations)
    await databaseService.init();
    console.log('✅ Database initialized');
    
    // Check if messages table has name column
    const db = databaseService.db;
    const tableInfo = await db.getAllAsync(`PRAGMA table_info(messages)`);
    
    console.log('📋 Messages table columns:');
    tableInfo.forEach(column => {
      console.log(`  - ${column.name}: ${column.type}`);
    });
    
    const hasNameColumn = tableInfo.some(column => column.name === 'name');
    
    if (hasNameColumn) {
      console.log('✅ SUCCESS: Messages table has name column');
      
      // Test inserting a record
      await db.runAsync(`
        INSERT OR REPLACE INTO messages (id, name, subject, body, date, synced_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [999999, 'Test Message', 'Test Subject', 'Test Body', '2024-01-01', Math.floor(Date.now() / 1000)]);
      
      console.log('✅ SUCCESS: Test record inserted successfully');
      
      // Clean up test record
      await db.runAsync(`DELETE FROM messages WHERE id = ?`, [999999]);
      console.log('🧹 Test record cleaned up');
      
    } else {
      console.log('❌ FAILED: Messages table missing name column');
    }
    
  } catch (error) {
    console.error('❌ Migration test failed:', error);
  }
}

testDatabaseMigration();
