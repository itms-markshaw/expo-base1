/**
 * Test script to check available fields in helpdesk.ticket model
 * Run this to verify what fields are actually available
 */

const OdooXMLRPCClient = require('../src/services/OdooXMLRPCClient').default;

async function testHelpdeskFields() {
  console.log('🔍 Testing Helpdesk Ticket Fields...\n');
  
  try {
    // Initialize client with your Odoo credentials
    const client = new OdooXMLRPCClient(
      'https://itms-markshaw.odoo.com',  // Replace with your Odoo URL
      'itms-markshaw',                   // Replace with your database name
      'mark.shaw@itmsgroup.com.au',      // Replace with your username
      'your-password'                    // Replace with your password
    );

    // Authenticate
    console.log('🔐 Authenticating...');
    await client.authenticate();
    console.log('✅ Authentication successful\n');

    // Get available fields for helpdesk.ticket
    console.log('📋 Getting available fields for helpdesk.ticket...');
    const fields = await client.getFields('helpdesk.ticket');
    
    console.log('Available fields:');
    Object.keys(fields).forEach(fieldName => {
      const field = fields[fieldName];
      console.log(`  - ${fieldName}: ${field.type} (${field.string})`);
    });

    console.log('\n🎯 Recommended field list for helpdesk.ticket:');
    const recommendedFields = [
      'id', 'name', 'description', 'partner_id', 'user_id', 'team_id', 
      'stage_id', 'priority', 'kanban_state', 'active', 'create_date', 
      'write_date', 'close_date'
    ];
    
    const validFields = recommendedFields.filter(field => fields[field]);
    const invalidFields = recommendedFields.filter(field => !fields[field]);
    
    console.log('Valid fields:', validFields);
    if (invalidFields.length > 0) {
      console.log('❌ Invalid fields:', invalidFields);
    }

    // Test a simple search
    console.log('\n🔍 Testing search with valid fields...');
    const tickets = await client.searchRead('helpdesk.ticket', [], validFields, { limit: 5 });
    console.log(`✅ Successfully loaded ${tickets.length} tickets`);
    
    if (tickets.length > 0) {
      console.log('Sample ticket:', JSON.stringify(tickets[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
testHelpdeskFields();
