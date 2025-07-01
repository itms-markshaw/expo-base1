/**
 * Reset Database Script
 * Deletes the SQLite database file to force recreation with proper schema
 */

const fs = require('fs');
const path = require('path');

// Database file is typically stored in the app's documents directory
// For development, we can try to find and delete it

console.log('🗑️ Resetting database...');

// Common database file locations for Expo/React Native
const possiblePaths = [
  './odoo_sync.db',
  '../odoo_sync.db',
  '../../odoo_sync.db',
  './src/odoo_sync.db',
];

let deleted = false;

for (const dbPath of possiblePaths) {
  try {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log(`✅ Deleted database file: ${dbPath}`);
      deleted = true;
    }
  } catch (error) {
    console.warn(`⚠️ Could not delete ${dbPath}:`, error.message);
  }
}

if (!deleted) {
  console.log('📋 No database file found to delete (this is normal for mobile apps)');
  console.log('💡 The database will be recreated automatically when the app starts');
}

console.log('🔄 Database reset complete. Restart the app to recreate with proper schema.');
