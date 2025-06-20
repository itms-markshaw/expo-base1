#!/usr/bin/env node

/**
 * Odoo Sync App Demo Script
 * Demonstrates the intelligent sync capabilities
 */

import { OdooXMLRPCClient } from '../src/services/OdooXMLRPCClient.js';
import { moduleManager } from '../src/services/moduleManager.js';
import { advancedSyncEngine } from '../src/services/AdvancedSyncEngine.js';

// Your Odoo configuration from the config file
const ODOO_CONFIG = {
  baseURL: 'https://itmsgroup.com.au',
  database: 'ITMS_v17_3_backup_2025_02_17_08_15',
  username: 'mark.shaw@itmsgroup.com.au',
  apiKey: 'ea186501b420d9b656eecf026f04f74a975db27c',
};

async function demonstrateIntelligentSync() {
  console.log('🚀 Odoo Intelligent Sync Demonstration');
  console.log('=====================================\n');

  try {
    // Step 1: Test Connection
    console.log('📡 Step 1: Testing Odoo Connection');
    const client = new OdooXMLRPCClient(ODOO_CONFIG);
    const connectionTest = await client.testConnection();
    
    if (connectionTest.success) {
      console.log('✅ Connected successfully!');
      console.log(`   Server Version: ${connectionTest.version?.server_serie || 'Unknown'}`);
      console.log(`   User ID: ${connectionTest.uid}`);
      console.log(`   Database: ${connectionTest.database}`);
    } else {
      throw new Error(connectionTest.error);
    }

    // Step 2: Discover Available Models
    console.log('\n🔍 Step 2: Discovering Available Models');
    const availableModels = await moduleManager.getAllModules();
    
    console.log(`📊 Model Discovery Results:`);
    console.log(`   Essential Models: ${availableModels.essential.length}`);
    console.log(`   Business Models: ${availableModels.business.length}`);
    console.log(`   Advanced Models: ${availableModels.advanced.length}`);

    // Show some example models
    console.log('\n📋 Essential Models (Always Required):');
    availableModels.essential.slice(0, 3).forEach(model => {
      console.log(`   • ${model.name} (${model.odoo})`);
      console.log(`     └─ ${model.description}`);
    });

    console.log('\n🏢 Business Models (User Selectable):');
    availableModels.business.slice(0, 5).forEach(model => {
      console.log(`   • ${model.name} (${model.odoo})`);
      console.log(`     └─ ${model.description}`);
    });

    // Step 3: Test Model Field Discovery
    console.log('\n🔬 Step 3: Testing Model Field Discovery');
    const testModel = 'res.partner'; // Contacts model
    console.log(`   Analyzing fields for: ${testModel}`);
    
    const fields = await client.getFields(testModel);
    const fieldCount = Object.keys(fields).length;
    console.log(`   ✅ Found ${fieldCount} fields`);
    
    // Show some interesting fields
    const interestingFields = ['name', 'email', 'phone', 'is_company', 'create_date'];
    console.log('   📝 Key Fields:');
    interestingFields.forEach(fieldName => {
      const field = fields[fieldName];
      if (field) {
        console.log(`     • ${fieldName}: ${field.string} (${field.type})`);
      }
    });

    // Step 4: Test Record Count
    console.log('\n📊 Step 4: Checking Data Volume');
    const contactCount = await client.searchCount('res.partner');
    console.log(`   📇 Total Contacts: ${contactCount.toLocaleString()}`);
    
    // Test with recent records filter
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7); // Last 7 days
    const recentContactCount = await client.searchCount('res.partner', [
      ['write_date', '>=', recentDate.toISOString()]
    ]);
    console.log(`   🕐 Recent Contacts (7 days): ${recentContactCount.toLocaleString()}`);

    // Step 5: Sample Data Fetch
    console.log('\n📦 Step 5: Fetching Sample Data');
    const sampleContacts = await client.searchRead('res.partner', [], [
      'name', 'email', 'phone', 'is_company', 'create_date'
    ], { limit: 3 });
    
    console.log('   👥 Sample Contacts:');
    sampleContacts.forEach((contact, index) => {
      console.log(`     ${index + 1}. ${contact.name}`);
      console.log(`        Email: ${contact.email || 'Not provided'}`);
      console.log(`        Phone: ${contact.phone || 'Not provided'}`);
      console.log(`        Type: ${contact.is_company ? 'Company' : 'Individual'}`);
      console.log(`        Created: ${contact.create_date}`);
    });

    // Step 6: Sync Time Estimation
    console.log('\n⏱️  Step 6: Sync Time Estimation');
    const essentialModels = availableModels.essential;
    const estimatedTime = await advancedSyncEngine.getEstimatedSyncTime(essentialModels);
    console.log(`   🕐 Estimated sync time for essential data: ${Math.round(estimatedTime / 60)} minutes`);

    // Step 7: Show Sync Configuration Options
    console.log('\n⚙️  Step 7: Intelligent Sync Configuration');
    const syncConfig = advancedSyncEngine.getSyncConfig();
    console.log('   🔧 Current Sync Settings:');
    console.log(`     • Sync Period: ${syncConfig.syncPeriod}`);
    console.log(`     • Batch Size: ${syncConfig.batchSize} records`);
    console.log(`     • Auto Sync: ${syncConfig.autoSync ? 'Enabled' : 'Disabled'}`);
    console.log(`     • Delta Sync: ${syncConfig.deltaSync ? 'Enabled' : 'Disabled'}`);
    console.log(`     • Conflict Resolution: ${syncConfig.conflictResolution}`);

    // Success Summary
    console.log('\n🎉 Demonstration Complete!');
    console.log('===============================');
    console.log('✅ Your Odoo server is ready for intelligent sync');
    console.log('✅ All essential services are working correctly');
    console.log('✅ The app can discover models and fields automatically');
    console.log('✅ Smart batch processing and conflict resolution ready');
    console.log('\n🚀 Ready to start your React Native app with:');
    console.log('   npx expo start');

  } catch (error) {
    console.error('\n❌ Demonstration failed:', error.message);
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('1. Check your Odoo server is accessible');
    console.log('2. Verify your API key is correct and active');
    console.log('3. Ensure XML-RPC is enabled on your Odoo server');
    console.log('4. Check your database name is correct');
    process.exit(1);
  }
}

// Run the demonstration
demonstrateIntelligentSync();
