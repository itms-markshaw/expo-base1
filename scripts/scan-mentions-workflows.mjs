/**
 * Scan Odoo for @mentions and Workflow capabilities
 * This will show us how to implement @mentions and trigger workflows
 */

import { OdooXMLRPCClient } from '../src/services/OdooXMLRPCClient.ts';
import { ODOO_CONFIG } from '../src/config/odoo.ts';

console.log('🔍 Scanning Odoo @mentions and Workflows...');
console.log('============================================');

async function scanMentionsAndWorkflows() {
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

    // Step 1: Scan @mentions related models
    console.log('\n📧 Scanning @mentions models...');
    
    const mentionModels = [
      'res.partner',      // Users/contacts that can be mentioned
      'res.users',        // System users
      'mail.notification', // Notifications sent to mentioned users
      'mail.channel',     // Channels for discussions
      'mail.channel.partner', // Channel members
    ];

    for (const modelName of mentionModels) {
      try {
        console.log(`\n🔍 Scanning ${modelName}...`);
        
        const fields = await client.getFields(modelName);
        const importantFields = Object.entries(fields)
          .filter(([name, info]) => {
            return name.includes('partner') || 
                   name.includes('user') || 
                   name.includes('notification') ||
                   name.includes('channel') ||
                   name.includes('mention') ||
                   ['id', 'name', 'email', 'login', 'active'].includes(name);
          })
          .slice(0, 8);

        console.log('   Key fields:');
        importantFields.forEach(([name, info]) => {
          console.log(`     • ${name}: ${info.string} (${info.type})`);
        });

        // Get sample data
        const sampleData = await client.searchRead(modelName, [], 
          importantFields.map(([name]) => name).slice(0, 4), 
          { limit: 3 }
        );
        if (sampleData.length > 0) {
          console.log(`   Sample records: ${sampleData.length} found`);
        }

      } catch (error) {
        console.log(`   ❌ Could not scan ${modelName}: ${error.message}`);
      }
    }

    // Step 2: Get users for @mentions
    console.log('\n👤 Getting users for @mentions...');
    const users = await client.searchRead('res.users', 
      [['active', '=', true]], 
      ['id', 'name', 'login', 'email', 'partner_id'], 
      { limit: 10 }
    );
    console.log(`Found ${users.length} active users for @mentions:`);
    users.forEach(user => {
      console.log(`   • @${user.login}: ${user.name} (${user.email || 'no email'})`);
    });

    // Step 3: Test @mention in message
    console.log('\n💬 Testing @mention functionality...');
    
    // Create a test lead for mention testing
    const leadData = {
      name: `Mention Test Lead ${Date.now()}`,
      partner_name: `Mention Test Company`,
      email_from: `mentiontest_${Date.now()}@example.com`,
      type: 'lead',
    };
    
    const leadId = await client.create('crm.lead', leadData);
    console.log(`✅ Created test lead with ID: ${leadId}`);

    // Try to post a message with @mention
    if (users.length > 0) {
      const mentionedUser = users[0];
      console.log(`📧 Posting message with @mention to ${mentionedUser.name}...`);
      
      try {
        const messageData = {
          model: 'crm.lead',
          res_id: leadId,
          body: `<p>Hello <a href="#" data-oe-model="res.partner" data-oe-id="${mentionedUser.partner_id[0]}">@${mentionedUser.name}</a>, please review this lead.</p>`,
          message_type: 'comment',
          author_id: connectionTest.uid,
          partner_ids: [mentionedUser.partner_id[0]], // This creates the notification
        };

        const messageId = await client.create('mail.message', messageData);
        console.log(`✅ Posted message with @mention, ID: ${messageId}`);
        
        // Check if notification was created
        const notifications = await client.searchRead('mail.notification', 
          [['mail_message_id', '=', messageId]], 
          ['id', 'res_partner_id', 'notification_type', 'notification_status']
        );
        console.log(`📬 Created ${notifications.length} notifications for the mention`);
        
      } catch (mentionError) {
        console.log(`⚠️ Could not post @mention message: ${mentionError.message}`);
      }
    }

    // Step 4: Scan workflow models
    console.log('\n🔄 Scanning workflow models...');
    
    const workflowModels = [
      'ir.actions.server',    // Server actions (workflows)
      'ir.actions.act_window', // Window actions
      'ir.model.data',        // External IDs for actions
      'workflow',             // Legacy workflows (if exists)
      'workflow.instance',    // Workflow instances
      'workflow.workitem',    // Workflow items
    ];

    for (const modelName of workflowModels) {
      try {
        console.log(`\n🔍 Scanning ${modelName}...`);
        
        const fields = await client.getFields(modelName);
        const workflowFields = Object.entries(fields)
          .filter(([name, info]) => {
            return name.includes('action') || 
                   name.includes('workflow') || 
                   name.includes('state') ||
                   name.includes('trigger') ||
                   ['id', 'name', 'model', 'code', 'sequence'].includes(name);
          })
          .slice(0, 6);

        console.log('   Key fields:');
        workflowFields.forEach(([name, info]) => {
          console.log(`     • ${name}: ${info.string} (${info.type})`);
        });

        // Get sample data
        const sampleData = await client.searchRead(modelName, [], 
          workflowFields.map(([name]) => name).slice(0, 3), 
          { limit: 2 }
        );
        console.log(`   Found ${sampleData.length} records`);

      } catch (error) {
        console.log(`   ❌ Could not scan ${modelName}: ${error.message}`);
      }
    }

    // Step 5: Test CRM workflow actions
    console.log('\n🎬 Testing CRM workflow actions...');
    
    // Get available actions for crm.lead
    try {
      const crmActions = await client.searchRead('ir.actions.server', 
        [['model_id.model', '=', 'crm.lead']], 
        ['id', 'name', 'code', 'state'], 
        { limit: 5 }
      );
      console.log(`🎯 Found ${crmActions.length} server actions for CRM leads:`);
      crmActions.forEach(action => {
        console.log(`   • ${action.name} (${action.state})`);
      });

      // Test triggering an action (if any exist)
      if (crmActions.length > 0) {
        console.log('🚀 Testing action execution...');
        // Note: Actually executing actions can be dangerous, so we'll just show how
        console.log('   (Action execution test skipped for safety)');
      }

    } catch (actionError) {
      console.log('⚠️ Could not fetch CRM actions');
    }

    // Step 6: Test state changes (workflow equivalent)
    console.log('\n📊 Testing state changes (modern workflow)...');
    
    // Get CRM stages (modern workflow)
    const stages = await client.searchRead('crm.stage', [], 
      ['id', 'name', 'sequence', 'is_won', 'probability'], 
      { order: 'sequence asc' }
    );
    console.log(`📍 Found ${stages.length} CRM stages (workflow states):`);
    stages.forEach(stage => {
      const wonFlag = stage.is_won ? '🏆' : '';
      console.log(`   ${stage.sequence}. ${stage.name} (${stage.probability}%) ${wonFlag}`);
    });

    // Test stage transition (workflow action)
    if (stages.length > 1) {
      console.log('🔄 Testing stage transition (workflow action)...');
      const initialStage = stages[0];
      const nextStage = stages[1];
      
      // Move lead to next stage
      await client.update('crm.lead', leadId, {
        stage_id: nextStage.id,
        probability: nextStage.probability,
      });
      
      console.log(`✅ Moved lead from "${initialStage.name}" to "${nextStage.name}"`);
      
      // This would trigger any automated actions associated with stage changes
      console.log('   (Any automated actions for this stage change would now execute)');
    }

    // Step 7: Test button actions (workflow triggers)
    console.log('\n🔘 Testing button actions (workflow triggers)...');
    
    // Common CRM button actions
    const buttonActions = [
      { name: 'Convert to Opportunity', field_updates: { type: 'opportunity' } },
      { name: 'Mark as Won', field_updates: { probability: 100 } },
      { name: 'Mark as Lost', field_updates: { probability: 0, active: false } },
      { name: 'Schedule Activity', creates: 'mail.activity' },
    ];

    console.log('🔘 Available button actions (workflow triggers):');
    buttonActions.forEach(action => {
      if (action.field_updates) {
        console.log(`   • ${action.name}: Updates ${Object.keys(action.field_updates).join(', ')}`);
      } else if (action.creates) {
        console.log(`   • ${action.name}: Creates ${action.creates} record`);
      }
    });

    // Step 8: Test automated actions
    console.log('\n🤖 Testing automated actions...');
    
    try {
      // Get automated actions (base.automation model in newer Odoo)
      const automatedActions = await client.searchRead('base.automation', 
        [['model_id.model', '=', 'crm.lead']], 
        ['id', 'name', 'trigger', 'state'], 
        { limit: 3 }
      );
      console.log(`🤖 Found ${automatedActions.length} automated actions for CRM leads:`);
      automatedActions.forEach(action => {
        console.log(`   • ${action.name} (trigger: ${action.trigger})`);
      });
    } catch (autoError) {
      console.log('⚠️ Could not fetch automated actions (may not exist in this Odoo version)');
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await client.delete('crm.lead', leadId);
    console.log(`✅ Deleted test lead ${leadId}`);

    console.log('\n🎉 @mentions and Workflows Scan Completed!');
    console.log('\n📋 @mentions Implementation:');
    console.log('✅ Use res.users to get mentionable users');
    console.log('✅ Format mentions as HTML links with data-oe-model and data-oe-id');
    console.log('✅ Add partner_ids to message to create notifications');
    console.log('✅ Notifications are automatically created in mail.notification');
    
    console.log('\n🔄 Workflow Implementation:');
    console.log('✅ Modern Odoo uses stages/states instead of legacy workflows');
    console.log('✅ Button actions are field updates that trigger business logic');
    console.log('✅ Automated actions (base.automation) handle complex workflows');
    console.log('✅ Server actions (ir.actions.server) can execute custom code');
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Add @mention picker to message composer');
    console.log('2. Add workflow buttons to chatter');
    console.log('3. Implement notification handling');
    console.log('4. Add automated action triggers');

  } catch (error) {
    console.error('❌ @mentions and workflows scan failed:', error.message);
    process.exit(1);
  }
}

// Run the scan
scanMentionsAndWorkflows();
