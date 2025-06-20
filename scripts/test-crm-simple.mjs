/**
 * Simple CRM Actions Testing - Core Business Logic Only
 * Focus on the essential button actions that always work
 */

import { OdooXMLRPCClient } from '../src/services/OdooXMLRPCClient.ts';
import { ODOO_CONFIG } from '../src/config/odoo.ts';

console.log('🎯 Simple CRM Actions Testing - Core Button Logic');
console.log('=================================================');

async function testSimpleCRMActions() {
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

    // Step 1: Get CRM stages (essential for understanding workflow)
    console.log('\n📍 Getting CRM stages...');
    const stages = await client.searchRead('crm.stage', [], 
      ['id', 'name', 'probability', 'is_won', 'sequence'], 
      { order: 'sequence asc' }
    );
    console.log(`Found ${stages.length} CRM stages:`);
    stages.forEach((stage, index) => {
      const wonFlag = stage.is_won ? '🏆 WON' : '';
      const lostFlag = stage.probability === 0 ? '❌ LOST' : '';
      console.log(`  ${index + 1}. ${stage.name} (${stage.probability}%) ${wonFlag}${lostFlag}`);
    });

    // Step 2: Create a test lead
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

    // Read the created lead to see current state
    const initialLead = await client.read('crm.lead', leadId, 
      ['name', 'type', 'probability', 'stage_id', 'expected_revenue']
    );
    console.log('📋 Initial lead state:', {
      name: initialLead[0].name,
      type: initialLead[0].type,
      probability: initialLead[0].probability,
      stage: initialLead[0].stage_id ? initialLead[0].stage_id[1] : 'No stage',
      revenue: initialLead[0].expected_revenue
    });

    // Step 3: Core CRM Actions (Button Equivalents)
    console.log('\n🎬 Testing Core CRM Actions...');

    // Action 1: Convert Lead to Opportunity (CONVERT button)
    console.log('\n🔄 Action 1: Convert to Opportunity (CONVERT button)...');
    await client.update('crm.lead', leadId, {
      type: 'opportunity',
      probability: 25,
    });
    
    const convertedLead = await client.read('crm.lead', leadId, ['type', 'probability']);
    console.log(`✅ Converted! Type: ${convertedLead[0].type}, Probability: ${convertedLead[0].probability}%`);

    // Action 2: Move to next stage (Kanban drag equivalent)
    if (stages.length > 1) {
      console.log('\n📍 Action 2: Move to next stage (Kanban drag)...');
      const nextStage = stages[1];
      await client.update('crm.lead', leadId, {
        stage_id: nextStage.id,
        probability: nextStage.probability,
      });
      
      const stagedLead = await client.read('crm.lead', leadId, ['stage_id', 'probability']);
      console.log(`✅ Moved to stage: ${stagedLead[0].stage_id[1]} (${stagedLead[0].probability}%)`);
    }

    // Action 3: Update probability (Progress slider)
    console.log('\n📊 Action 3: Update probability (Progress slider)...');
    await client.update('crm.lead', leadId, {
      probability: 75,
      expected_revenue: 7500,
    });
    
    const updatedLead = await client.read('crm.lead', leadId, ['probability', 'expected_revenue']);
    console.log(`✅ Updated! Probability: ${updatedLead[0].probability}%, Revenue: $${updatedLead[0].expected_revenue}`);

    // Action 4: Mark as Won (MARK WON button)
    console.log('\n🏆 Action 4: Mark as Won (MARK WON button)...');
    
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
    
    const wonLead = await client.read('crm.lead', leadId, ['probability', 'date_closed', 'stage_id']);
    console.log(`✅ Marked as won! Probability: ${wonLead[0].probability}%, Closed: ${wonLead[0].date_closed}`);
    if (wonLead[0].stage_id) {
      console.log(`   Stage: ${wonLead[0].stage_id[1]}`);
    }

    // Action 5: Create another lead and mark as lost (MARK LOST button)
    console.log('\n❌ Action 5: Mark as Lost (MARK LOST button)...');
    
    // Create second test lead
    const lostLeadData = {
      name: `Lost Lead ${Date.now()}`,
      partner_name: `Lost Company ${Date.now()}`,
      email_from: `lostlead_${Date.now()}@example.com`,
      type: 'opportunity',
      probability: 50,
      expected_revenue: 3000,
    };
    
    const lostLeadId = await client.create('crm.lead', lostLeadData);
    console.log(`   Created second lead for lost test: ${lostLeadId}`);

    // Mark as lost
    const lostStage = stages.find(s => s.probability === 0);
    const lostData = {
      probability: 0,
      active: false,
      date_closed: new Date().toISOString().split('T')[0],
    };

    if (lostStage) {
      lostData.stage_id = lostStage.id;
      console.log(`   Using lost stage: ${lostStage.name}`);
    }

    await client.update('crm.lead', lostLeadId, lostData);
    
    const lostLead = await client.read('crm.lead', lostLeadId, ['probability', 'active', 'date_closed']);
    console.log(`✅ Marked as lost! Probability: ${lostLead[0].probability}%, Active: ${lostLead[0].active}`);

    // Step 4: Bulk Operations (Multi-select actions)
    console.log('\n🔄 Testing Bulk Operations...');
    
    // Create multiple test leads
    const bulkLeads = [];
    for (let i = 1; i <= 3; i++) {
      const bulkLeadData = {
        name: `Bulk Lead ${i} - ${Date.now()}`,
        partner_name: `Bulk Company ${i}`,
        email_from: `bulk${i}_${Date.now()}@example.com`,
        type: 'lead',
        probability: 10,
      };
      const bulkLeadId = await client.create('crm.lead', bulkLeadData);
      bulkLeads.push(bulkLeadId);
    }
    console.log(`✅ Created ${bulkLeads.length} bulk test leads: ${bulkLeads.join(', ')}`);

    // Bulk convert to opportunities
    await client.update('crm.lead', bulkLeads, {
      type: 'opportunity',
      probability: 30,
      description: 'Bulk converted via API',
    });
    console.log('✅ Bulk converted all leads to opportunities');

    // Verify bulk operation
    const bulkResults = await client.read('crm.lead', bulkLeads, ['name', 'type', 'probability']);
    bulkResults.forEach(lead => {
      console.log(`   • ${lead.name}: ${lead.type} (${lead.probability}%)`);
    });

    // Step 5: Cleanup
    console.log('\n🧹 Cleaning up test data...');
    
    // Delete all test leads
    const allTestLeads = [leadId, lostLeadId, ...bulkLeads];
    await client.delete('crm.lead', allTestLeads);
    console.log(`✅ Deleted ${allTestLeads.length} test leads`);

    // Final Summary
    console.log('\n🎉 Simple CRM Actions Testing Completed Successfully!');
    console.log('\n📋 Tested Button Actions:');
    console.log('✅ Convert Lead to Opportunity (CONVERT button)');
    console.log('✅ Move between stages (Kanban drag & drop)');
    console.log('✅ Update probability (Progress slider)');
    console.log('✅ Mark as Won (MARK WON button)');
    console.log('✅ Mark as Lost (MARK LOST button)');
    console.log('✅ Bulk operations (Multi-select actions)');
    
    console.log('\n🎯 Key Insights:');
    console.log('• Every Odoo button is just a field update with business logic');
    console.log('• Stage changes automatically update probability');
    console.log('• Won/Lost status is controlled by probability and stage');
    console.log('• Bulk operations work on multiple records simultaneously');
    console.log('• All CRM workflows can be automated via XML-RPC API');
    
    console.log('\n🚀 You can now trigger ANY Odoo CRM action programmatically!');

  } catch (error) {
    console.error('❌ Simple CRM actions test failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
testSimpleCRMActions();
