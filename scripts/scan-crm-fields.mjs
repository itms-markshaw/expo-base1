/**
 * Scan CRM Lead fields from Odoo
 * This will show us ALL available fields and their types
 */

import { OdooXMLRPCClient } from '../src/services/OdooXMLRPCClient.ts';
import { ODOO_CONFIG } from '../src/config/odoo.ts';

console.log('🔍 Scanning CRM Lead Fields from Odoo...');
console.log('==========================================');

async function scanCRMFields() {
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

    // Get ALL fields for crm.lead
    console.log('\n📋 Fetching ALL fields for crm.lead...');
    const fields = await client.getFields('crm.lead');
    
    console.log(`\n🎯 Found ${Object.keys(fields).length} fields for crm.lead:`);
    console.log('=' .repeat(60));

    // Categorize fields by type
    const fieldsByType = {};
    const importantFields = [];
    const relationFields = [];
    const computedFields = [];

    Object.entries(fields).forEach(([fieldName, fieldInfo]) => {
      const type = fieldInfo.type;
      
      if (!fieldsByType[type]) {
        fieldsByType[type] = [];
      }
      fieldsByType[type].push({
        name: fieldName,
        string: fieldInfo.string,
        required: fieldInfo.required,
        readonly: fieldInfo.readonly,
        help: fieldInfo.help
      });

      // Categorize important fields
      if (['name', 'partner_name', 'email_from', 'phone', 'stage_id', 'user_id', 'team_id'].includes(fieldName)) {
        importantFields.push(fieldName);
      }

      // Track relation fields
      if (type.includes('2one') || type.includes('2many')) {
        relationFields.push({
          name: fieldName,
          type: type,
          relation: fieldInfo.relation,
          string: fieldInfo.string
        });
      }

      // Track computed fields
      if (fieldInfo.readonly && !fieldInfo.store) {
        computedFields.push(fieldName);
      }
    });

    // Print field summary by type
    console.log('\n📊 Fields by Type:');
    Object.entries(fieldsByType).forEach(([type, typeFields]) => {
      console.log(`\n${type.toUpperCase()} (${typeFields.length} fields):`);
      typeFields.forEach(field => {
        const flags = [];
        if (field.required) flags.push('REQUIRED');
        if (field.readonly) flags.push('READONLY');
        const flagStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
        console.log(`  • ${field.name}: "${field.string}"${flagStr}`);
      });
    });

    // Print important fields for mobile app
    console.log('\n🎯 Recommended fields for mobile app:');
    console.log(JSON.stringify(importantFields, null, 2));

    // Print relation fields
    console.log('\n🔗 Relationship Fields:');
    relationFields.forEach(field => {
      console.log(`  • ${field.name} (${field.type}) -> ${field.relation}: "${field.string}"`);
    });

    // Get sample lead data
    console.log('\n📋 Sample Lead Data:');
    const sampleLeads = await client.searchRead('crm.lead', [], importantFields, { limit: 2 });
    console.log(JSON.stringify(sampleLeads, null, 2));

    // Check available methods/actions
    console.log('\n🔧 Checking available methods for crm.lead...');
    try {
      // Try to get model info
      const modelInfo = await client.callModel('ir.model', 'search_read', 
        [['model', '=', 'crm.lead']], 
        { fields: ['name', 'info'] }
      );
      console.log('Model info:', modelInfo);
    } catch (error) {
      console.log('Could not get model info:', error.message);
    }

    // Check for common CRM actions
    console.log('\n🎬 Testing CRM Lead Actions...');
    
    if (sampleLeads.length > 0) {
      const leadId = sampleLeads[0].id;
      console.log(`Testing with lead ID: ${leadId}`);

      // Test getting available actions
      try {
        // Check if we can call action methods
        const leadData = await client.read('crm.lead', leadId, ['stage_id', 'active']);
        console.log('Current lead state:', leadData[0]);
      } catch (error) {
        console.log('Could not read lead state:', error.message);
      }
    }

    console.log('\n✅ CRM Lead field scan completed!');
    console.log('\nNext steps:');
    console.log('1. Add crm.lead to your sync models');
    console.log('2. Create database table for leads');
    console.log('3. Test CRUD operations');
    console.log('4. Test action methods (convert, mark_won, etc.)');

  } catch (error) {
    console.error('❌ CRM field scan failed:', error.message);
    process.exit(1);
  }
}

// Run the scan
scanCRMFields();
