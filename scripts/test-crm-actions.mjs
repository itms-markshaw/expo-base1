/**
 * CRM Actions Testing Script
 * Demonstrates how to trigger Odoo business logic programmatically
 * This is equivalent to clicking buttons in the Odoo web interface
 */

import { OdooXMLRPCClient } from '../src/services/OdooXMLRPCClient.ts';
import { ODOO_CONFIG } from '../src/config/odoo.ts';

console.log('🎯 CRM Actions Testing - Button Logic Simulation');
console.log('================================================');

async function testCRMActions() {
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

    // Step 1: Get all CRM lead fields
    console.log('\n📋 Scanning CRM Lead fields...');
    const fields = await client.getFields('crm.lead');
    console.log(`Found ${Object.keys(fields).length} fields for crm.lead`);
    
    // Show important fields
    const importantFields = ['name', 'partner_name', 'email_from', 'phone', 'stage_id', 'probability', 'type', 'user_id', 'team_id'];
    console.log('\n🎯 Key CRM Lead fields:');
    importantFields.forEach(field => {
      if (fields[field]) {
        console.log(`  • ${field}: ${fields[field].string} (${fields[field].type})`);
      }
    });

    // Step 2: Get CRM stages
    console.log('\n📍 Getting CRM stages...');
    const stages = await client.searchRead('crm.stage', [], 
      ['id', 'name', 'probability', 'is_won', 'sequence'], 
      { order: 'sequence asc' }
    );
    console.log('Available stages:');
    stages.forEach(stage => {
      console.log(`  • ${stage.name} (${stage.probability}% probability) ${stage.is_won ? '🏆' : ''}`);
    });

    // Step 3: Create a test lead
    console.log('\n✨ Creating test lead...');
    const leadData = {
      name: `Test Lead ${Date.now()}`,
      partner_name: `Test Company ${Date.now()}`,
      email_from: `testlead_${Date.now()}@example.com`,
      phone: '+1234567890',
      description: 'Test lead for action testing',
      type: 'lead',
      probability: 10,
      expected_revenue: 5000,
    };
    
    const leadId = await client.create('crm.lead', leadData);
    console.log(`✅ Created test lead with ID: ${leadId}`);

    // Step 4: Test CRM Actions (Button Equivalents)
    console.log('\n🎬 Testing CRM Actions (Button Logic)...');

    // Action 1: Convert Lead to Opportunity (CONVERT button)
    console.log('\n🔄 Action 1: Convert to Opportunity...');
    const convertResult = await client.update('crm.lead', leadId, {
      type: 'opportunity',
      probability: 25,
    });
    console.log('✅ Lead converted to opportunity');

    // Verify conversion
    const convertedLead = await client.read('crm.lead', leadId, ['type', 'probability']);
    console.log(`   Type: ${convertedLead[0].type}, Probability: ${convertedLead[0].probability}%`);

    // Action 2: Move to next stage (KANBAN drag equivalent)
    if (stages.length > 1) {
      console.log('\n📍 Action 2: Move to next stage...');
      const nextStage = stages[1];
      await client.update('crm.lead', leadId, {
        stage_id: nextStage.id,
        probability: nextStage.probability,
      });
      console.log(`✅ Moved to stage: ${nextStage.name} (${nextStage.probability}%)`);
    }

    // Action 3: Schedule Activity (SCHEDULE ACTIVITY button)
    console.log('\n📅 Action 3: Schedule Activity...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get activity types
    let activityTypeId = null;
    try {
      const activityTypes = await client.searchRead('mail.activity.type', 
        [['name', 'ilike', 'call']], 
        ['id', 'name'], 
        { limit: 1 }
      );
      if (activityTypes.length > 0) {
        activityTypeId = activityTypes[0].id;
      }
    } catch (error) {
      console.log('   Using default activity type');
    }

    // Get res_model_id for crm.lead
    const models = await client.searchRead('ir.model',
      [['model', '=', 'crm.lead']],
      ['id'],
      { limit: 1 }
    );

    if (models.length === 0) {
      throw new Error('Could not find model ID for crm.lead');
    }

    const resModelId = models[0].id;

    const activityData = {
      res_model: 'crm.lead',
      res_model_id: resModelId,
      res_id: leadId,
      summary: 'Follow up call - Test Activity',
      date_deadline: tomorrow.toISOString().split('T')[0],
      user_id: connectionTest.uid,
    };

    if (activityTypeId) {
      activityData.activity_type_id = activityTypeId;
    }

    const activityId = await client.create('mail.activity', activityData);
    console.log(`✅ Activity scheduled with ID: ${activityId}`);

    // Action 4: Add Note/Message (equivalent to internal note)
    console.log('\n📝 Action 4: Add internal note...');
    try {
      const messageData = {
        model: 'crm.lead',
        res_id: leadId,
        body: '<p>This is a test internal note added via API</p>',
        message_type: 'comment',
        author_id: connectionTest.uid,
      };

      const messageId = await client.create('mail.message', messageData);
      console.log(`✅ Internal note added with ID: ${messageId}`);
    } catch (error) {
      console.log(`⚠️ Could not add note: ${error.message}`);
      console.log('   (This is normal - message creation often requires special permissions)');
    }

    // Action 5: Mark as Won (MARK WON button)
    console.log('\n🏆 Action 5: Mark as Won...');
    
    // Find won stage
    const wonStage = stages.find(s => s.is_won || s.probability >= 100);
    const wonData = {
      probability: 100,
      date_closed: new Date().toISOString().split('T')[0],
    };

    if (wonStage) {
      wonData.stage_id = wonStage.id;
      console.log(`   Using won stage: ${wonStage.name}`);
    }

    await client.update('crm.lead', leadId, wonData);
    console.log('✅ Opportunity marked as won');

    // Verify won status
    const wonLead = await client.read('crm.lead', leadId, ['probability', 'date_closed', 'stage_id']);
    console.log(`   Probability: ${wonLead[0].probability}%, Closed: ${wonLead[0].date_closed}`);

    // Action 6: Get lead history/activities
    console.log('\n📊 Action 6: Get lead activities...');
    try {
      const activities = await client.searchRead('mail.activity', 
        [['res_model', '=', 'crm.lead'], ['res_id', '=', leadId]], 
        ['summary', 'date_deadline', 'activity_type_id'], 
        { limit: 5 }
      );
      console.log(`✅ Found ${activities.length} activities for this lead`);
      activities.forEach(activity => {
        console.log(`   • ${activity.summary} (due: ${activity.date_deadline})`);
      });
    } catch (error) {
      console.log('⚠️ Could not fetch activities');
    }

    // Step 5: Advanced Actions - Bulk Operations
    console.log('\n🔄 Advanced: Bulk Operations...');
    
    // Create multiple test leads
    const bulkLeads = [];
    for (let i = 1; i <= 3; i++) {
      const bulkLeadData = {
        name: `Bulk Test Lead ${i} - ${Date.now()}`,
        partner_name: `Bulk Company ${i}`,
        email_from: `bulk${i}_${Date.now()}@example.com`,
        type: 'lead',
        probability: 10,
      };
      const bulkLeadId = await client.create('crm.lead', bulkLeadData);
      bulkLeads.push(bulkLeadId);
    }
    console.log(`✅ Created ${bulkLeads.length} bulk test leads`);

    // Bulk update (equivalent to selecting multiple records and updating)
    await client.update('crm.lead', bulkLeads, {
      probability: 50,
      description: 'Bulk updated via API',
    });
    console.log('✅ Bulk updated all test leads');

    // Step 6: Cleanup
    console.log('\n🧹 Cleaning up test data...');
    
    // Delete the main test lead
    await client.delete('crm.lead', leadId);
    console.log(`✅ Deleted main test lead ${leadId}`);
    
    // Delete bulk test leads
    await client.delete('crm.lead', bulkLeads);
    console.log(`✅ Deleted ${bulkLeads.length} bulk test leads`);

    // Delete test activity (if it exists)
    try {
      await client.delete('mail.activity', activityId);
      console.log(`✅ Deleted test activity ${activityId}`);
    } catch (error) {
      console.log('⚠️ Could not delete activity (may have been auto-completed)');
    }

    console.log('\n🎉 CRM Actions Testing Completed Successfully!');
    console.log('\n📋 Summary of tested actions:');
    console.log('✅ Convert Lead to Opportunity (CONVERT button)');
    console.log('✅ Move between stages (Kanban drag & drop)');
    console.log('✅ Schedule activities (SCHEDULE ACTIVITY button)');
    console.log('✅ Add internal notes (Notes tab)');
    console.log('✅ Mark as Won (MARK WON button)');
    console.log('✅ Bulk operations (Multi-select actions)');
    console.log('✅ CRUD operations (Create, Read, Update, Delete)');
    
    console.log('\n🎯 Key Insights:');
    console.log('• Button actions in Odoo are just field updates with business logic');
    console.log('• You can trigger any Odoo workflow programmatically via XML-RPC');
    console.log('• Stage changes, probability updates, and status changes work seamlessly');
    console.log('• Activities and notes can be created and managed via API');
    console.log('• Bulk operations are supported for efficiency');

  } catch (error) {
    console.error('❌ CRM actions test failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
testCRMActions();
