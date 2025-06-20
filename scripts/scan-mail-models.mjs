/**
 * Scan Odoo Mail Models for Chatter Component
 * This will show us all mail-related models and their fields
 */

import { OdooXMLRPCClient } from '../src/services/OdooXMLRPCClient.ts';
import { ODOO_CONFIG } from '../src/config/odoo.ts';

console.log('📧 Scanning Odoo Mail Models for Chatter Component...');
console.log('===================================================');

async function scanMailModels() {
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

    // Scan mail-related models
    const mailModels = [
      'mail.message',
      'mail.thread',
      'mail.activity',
      'mail.activity.type',
      'mail.followers',
      'mail.notification',
      'mail.tracking.value',
      'mail.alias',
      'res.partner'
    ];

    console.log('\n📋 Scanning mail models...');

    for (const modelName of mailModels) {
      try {
        console.log(`\n🔍 Scanning ${modelName}...`);
        
        // Get fields
        const fields = await client.getFields(modelName);
        const fieldCount = Object.keys(fields).length;
        console.log(`   Found ${fieldCount} fields`);

        // Show important fields
        const importantFields = Object.entries(fields)
          .filter(([name, info]) => {
            return name.includes('message') || 
                   name.includes('mail') || 
                   name.includes('activity') || 
                   name.includes('tracking') ||
                   name.includes('follower') ||
                   name.includes('notification') ||
                   ['id', 'create_date', 'write_date', 'author_id', 'partner_id', 'user_id', 'res_model', 'res_id', 'subject', 'body', 'message_type', 'subtype_id'].includes(name);
          })
          .slice(0, 10); // Limit to first 10 important fields

        console.log('   Key fields:');
        importantFields.forEach(([name, info]) => {
          const required = info.required ? ' [REQUIRED]' : '';
          const readonly = info.readonly ? ' [READONLY]' : '';
          console.log(`     • ${name}: ${info.string} (${info.type})${required}${readonly}`);
        });

        // Get sample data
        try {
          const sampleData = await client.searchRead(modelName, [], 
            importantFields.map(([name]) => name).slice(0, 5), 
            { limit: 2 }
          );
          if (sampleData.length > 0) {
            console.log(`   Sample record:`, sampleData[0]);
          }
        } catch (sampleError) {
          console.log('   Could not fetch sample data');
        }

      } catch (error) {
        console.log(`   ❌ Could not scan ${modelName}: ${error.message}`);
      }
    }

    // Test chatter functionality on a CRM lead
    console.log('\n🧪 Testing Chatter on CRM Lead...');
    
    // Get a sample CRM lead
    const leads = await client.searchRead('crm.lead', [], ['id', 'name'], { limit: 1 });
    if (leads.length > 0) {
      const leadId = leads[0].id;
      console.log(`Using lead: ${leads[0].name} (ID: ${leadId})`);

      // Get messages for this lead
      try {
        const messages = await client.searchRead('mail.message', 
          [['res_model', '=', 'crm.lead'], ['res_id', '=', leadId]], 
          ['id', 'subject', 'body', 'message_type', 'subtype_id', 'author_id', 'create_date'], 
          { limit: 5, order: 'create_date desc' }
        );
        console.log(`📧 Found ${messages.length} messages for this lead`);
        messages.forEach(msg => {
          const author = msg.author_id ? msg.author_id[1] : 'System';
          const subject = msg.subject || 'No subject';
          console.log(`   • ${author}: ${subject} (${msg.message_type})`);
        });
      } catch (msgError) {
        console.log('   Could not fetch messages');
      }

      // Get activities for this lead
      try {
        const activities = await client.searchRead('mail.activity', 
          [['res_model', '=', 'crm.lead'], ['res_id', '=', leadId]], 
          ['id', 'summary', 'activity_type_id', 'user_id', 'date_deadline'], 
          { limit: 5 }
        );
        console.log(`📅 Found ${activities.length} activities for this lead`);
        activities.forEach(activity => {
          const user = activity.user_id ? activity.user_id[1] : 'Unassigned';
          const type = activity.activity_type_id ? activity.activity_type_id[1] : 'Unknown';
          console.log(`   • ${activity.summary} (${type}) - ${user} - Due: ${activity.date_deadline}`);
        });
      } catch (actError) {
        console.log('   Could not fetch activities');
      }

      // Get followers for this lead
      try {
        const followers = await client.searchRead('mail.followers', 
          [['res_model', '=', 'crm.lead'], ['res_id', '=', leadId]], 
          ['id', 'partner_id', 'subtype_ids'], 
          { limit: 10 }
        );
        console.log(`👥 Found ${followers.length} followers for this lead`);
        followers.forEach(follower => {
          const partner = follower.partner_id ? follower.partner_id[1] : 'Unknown';
          console.log(`   • ${partner}`);
        });
      } catch (followerError) {
        console.log('   Could not fetch followers');
      }
    }

    // Get activity types
    console.log('\n📋 Getting activity types...');
    try {
      const activityTypes = await client.searchRead('mail.activity.type', [], 
        ['id', 'name', 'icon', 'delay_count', 'delay_unit'], 
        { limit: 10 }
      );
      console.log(`Found ${activityTypes.length} activity types:`);
      activityTypes.forEach(type => {
        const delay = type.delay_count ? `${type.delay_count} ${type.delay_unit}` : 'No delay';
        console.log(`   • ${type.name} (${type.icon || 'no icon'}) - Default delay: ${delay}`);
      });
    } catch (typeError) {
      console.log('   Could not fetch activity types');
    }

    // Get message subtypes
    console.log('\n🏷️ Getting message subtypes...');
    try {
      const subtypes = await client.searchRead('mail.message.subtype', [], 
        ['id', 'name', 'description', 'internal', 'default'], 
        { limit: 10 }
      );
      console.log(`Found ${subtypes.length} message subtypes:`);
      subtypes.forEach(subtype => {
        const internal = subtype.internal ? '[INTERNAL]' : '[PUBLIC]';
        const defaultFlag = subtype.default ? '[DEFAULT]' : '';
        console.log(`   • ${subtype.name} ${internal} ${defaultFlag} - ${subtype.description || 'No description'}`);
      });
    } catch (subtypeError) {
      console.log('   Could not fetch message subtypes');
    }

    console.log('\n✅ Mail models scan completed!');
    console.log('\n📋 Chatter Component Requirements:');
    console.log('1. Messages (mail.message) - Comments, emails, notifications');
    console.log('2. Activities (mail.activity) - Tasks, calls, meetings');
    console.log('3. Followers (mail.followers) - Who gets notifications');
    console.log('4. Activity Types (mail.activity.type) - Call, Email, Meeting, etc.');
    console.log('5. Message Subtypes (mail.message.subtype) - Internal notes, comments');
    console.log('6. Tracking (mail.tracking.value) - Field change history');
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Create ChatterService for API calls');
    console.log('2. Create ChatterComponent for UI');
    console.log('3. Add message creation, activity scheduling');
    console.log('4. Add follower management');
    console.log('5. Add field tracking display');

  } catch (error) {
    console.error('❌ Mail models scan failed:', error.message);
    process.exit(1);
  }
}

// Run the scan
scanMailModels();
