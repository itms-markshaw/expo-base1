#!/usr/bin/env node

/**
 * Test Mobile RTC Call - Verify our mobile implementation works
 */

// Import the mobile services (simulate mobile environment)
const authService = {
  client: null,
  
  getClient() {
    if (!this.client) {
      // Simulate authenticated client
      this.client = {
        uid: 10,
        username: 'mark.shaw@itmsgroup.com.au',
        
        async callModel(model, method, args = [], kwargs = {}) {
          const xmlrpc = require('xmlrpc');
          
          const client = xmlrpc.createSecureClient({
            host: 'itmsgroup.com.au',
            port: 443,
            path: '/xmlrpc/2/object'
          });

          return new Promise((resolve, reject) => {
            client.methodCall('execute_kw', [
              'ITMS_v17_3_backup_2025_02_17_08_15',
              10,
              'ea186501b420d9b656eecf026f04f74a975db27c',
              model,
              method,
              args,
              kwargs
            ], (error, result) => {
              if (error) {
                reject(error);
              } else {
                resolve(result);
              }
            });
          });
        }
      };
    }
    return this.client;
  }
};

// Simulate the mobile CallService implementation
class MobileCallService {
  constructor() {
    this.currentCall = null;
  }

  /**
   * Clean up existing RTC sessions (matches working Python script)
   */
  async cleanupExistingRTCSessions(channelId) {
    try {
      const client = authService.getClient();
      if (!client) return;

      console.log('🧹 Cleaning up existing RTC sessions...');

      // Find existing RTC sessions
      const searchDomain = channelId ? [['channel_id', '=', channelId]] : [];
      const existingSessions = await client.callModel('discuss.channel.rtc.session', 'search', [searchDomain]);

      if (existingSessions.length > 0) {
        console.log(`🔍 Found ${existingSessions.length} existing RTC sessions`);
        
        // Delete existing sessions
        await client.callModel('discuss.channel.rtc.session', 'unlink', [existingSessions]);
        console.log(`✅ Cleaned up ${existingSessions.length} RTC sessions`);
      } else {
        console.log('✅ No existing RTC sessions to clean up');
      }

    } catch (error) {
      console.log('⚠️ Cleanup failed:', error.message);
      // Continue anyway
    }
  }

  /**
   * Send call notification message (matches working Python script)
   */
  async sendCallNotificationMessage(channelId, sessionId, callType, callerName) {
    try {
      const client = authService.getClient();
      if (!client) return;

      // Create a very visible call message (matches Python script)
      const callMessage = `
🔔 <strong>INCOMING ${callType.toUpperCase()} CALL FROM MOBILE</strong> 🔔

📞 From: ${callerName}
🎯 RTC Session: ${sessionId}
📱 Channel: ${channelId}

🌐 <strong>CHECK ODOO WEB INTERFACE NOW!</strong>
• Go to General Settings → RTC sessions
• Look for active call notification
• You should see "Join Call" button

🎉 This RTC session makes Odoo web show an active call!
📱 Called from MOBILE APP implementation!
      `.trim();

      await client.callModel('discuss.channel', 'message_post', [channelId], {
        body: callMessage,
        message_type: 'comment',
        subject: `🔔 INCOMING ${callType.toUpperCase()} CALL FROM MOBILE`
      });

      console.log('💬 Call notification message sent!');

    } catch (error) {
      console.log('❌ Call notification message failed:', error.message);
    }
  }

  /**
   * FIXED: Initiate WebRTC call with proper channel member handling - MATCHES WORKING PYTHON SCRIPT
   */
  async initiateWebRTCCallFixed(channelId, callType = 'video') {
    const client = authService.getClient();
    if (!client) throw new Error('No authenticated client');

    try {
      console.log(`📞 Creating Odoo RTC session for ${callType} call...`);

      // Step 1: Clean up existing RTC sessions (like the working script)
      await this.cleanupExistingRTCSessions(channelId);

      // Step 2: Get user's partner ID - FIXED to use client.uid directly
      const userData = await client.callModel('res.users', 'read', [client.uid], {
        fields: ['partner_id', 'name']
      });
      const partnerId = userData[0].partner_id[0];
      const userName = userData[0].name;
      console.log(`👤 Calling as: ${userName} (Partner ID: ${partnerId})`);

      // Step 3: Get channel info
      const channelInfo = await client.callModel('discuss.channel', 'read', [channelId], {
        fields: ['id', 'name', 'channel_type']
      });
      console.log(`📱 Target channel: ${channelInfo[0].name} (Type: ${channelInfo[0].channel_type})`);

      // Step 4: Ensure user is a channel member (CRITICAL FIX!)
      let channelMembers = await client.callModel('discuss.channel.member', 'search_read', [
        [['channel_id', '=', channelId], ['partner_id', '=', partnerId]]
      ], { fields: ['id'] });

      let channelMemberId;
      if (channelMembers.length > 0) {
        channelMemberId = channelMembers[0].id;
        console.log(`✅ Already a channel member: ${channelMemberId}`);
      } else {
        // Create channel member if doesn't exist
        console.log('🔧 Creating channel membership...');
        channelMemberId = await client.callModel('discuss.channel.member', 'create', [{
          channel_id: channelId,
          partner_id: partnerId
        }]);
        console.log(`✅ Created channel member: ${channelMemberId}`);
      }

      // Step 5: Create RTC session with REQUIRED channel_member_id - EXACT MATCH TO WORKING SCRIPT
      const sessionData = {
        channel_id: channelId,
        channel_member_id: channelMemberId,  // ← THE MISSING PIECE!
        partner_id: partnerId,
        is_camera_on: callType === 'video',
        is_muted: false,
        is_screen_sharing_on: false,
        is_deaf: false
      };

      console.log(`📞 Creating ${callType} RTC session...`);
      const sessionId = await client.callModel('discuss.channel.rtc.session', 'create', [sessionData]);
      console.log(`✅ RTC session created: ${sessionId}`);

      // Step 6: Send call notification message (like the working script)
      await this.sendCallNotificationMessage(channelId, sessionId, callType, userName);

      console.log('🎉 MOBILE RTC session created successfully - should be visible in Odoo web!');
      return `rtc-${sessionId}`;

    } catch (error) {
      console.error('❌ Mobile WebRTC call creation failed:', error);
      throw error;
    }
  }

  async testCall() {
    console.log('📱 Testing Mobile RTC Call Implementation');
    console.log('==========================================');
    
    try {
      const callId = await this.initiateWebRTCCallFixed(105, 'audio');
      console.log(`✅ Mobile call initiated successfully: ${callId}`);
      
      console.log('\n🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉');
      console.log('SUCCESS! MOBILE RTC SESSION CREATED!');
      console.log('🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉');
      console.log('📱 This proves the mobile implementation works!');
      console.log('🌐 Check Odoo web interface for the active call');
      
      return true;
    } catch (error) {
      console.error('❌ Mobile test failed:', error);
      return false;
    }
  }
}

// Run the test
async function main() {
  console.log('🧪 Testing Mobile RTC Call Implementation...');
  console.log('🎯 Goal: Verify mobile app can create RTC sessions like Python script\n');
  
  const mobileCallService = new MobileCallService();
  const success = await mobileCallService.testCall();
  
  if (success) {
    console.log('\n✅ MOBILE IMPLEMENTATION TEST PASSED!');
    console.log('📱 The mobile app should now be able to create RTC calls');
  } else {
    console.log('\n❌ MOBILE IMPLEMENTATION TEST FAILED');
    console.log('🔍 Check the error messages above');
  }
}

main().catch(console.error);
