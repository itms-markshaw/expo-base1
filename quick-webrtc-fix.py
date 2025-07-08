#!/usr/bin/env python3

"""
Quick WebRTC Fix - Identifies the exact issue and provides solution
"""

import xmlrpc.client
import sys

# Configuration
CONFIG = {
    'host': 'itmsgroup.com.au',
    'port': 443,
    'database': 'ITMS_v17_3_backup_2025_02_17_08_15',
    'username': 'mark.shaw@itmsgroup.com.au',
    'api_key': 'ea186501b420d9b656eecf026f04f74a975db27c',
    'protocol': 'https'
}

class QuickWebRTCFix:
    def __init__(self, config):
        self.config = config
        self.uid = None
        self.url = f"{config['protocol']}://{config['host']}:{config['port']}"
        
    def authenticate(self):
        """Authenticate with Odoo"""
        print("🔐 Authenticating...")
        common = xmlrpc.client.ServerProxy(f"{self.url}/xmlrpc/2/common")
        
        try:
            self.uid = common.authenticate(
                self.config['database'],
                self.config['username'],
                self.config['api_key'],
                {}
            )
            if self.uid:
                print(f"✅ Authenticated as user ID: {self.uid}")
                return True
        except Exception as e:
            print(f"❌ Authentication error: {e}")
        return False
    
    def call_model(self, model, method, args=[], kwargs={}):
        """Call Odoo model method"""
        models = xmlrpc.client.ServerProxy(f"{self.url}/xmlrpc/2/object")
        return models.execute_kw(
            self.config['database'],
            self.uid,
            self.config['api_key'],
            model,
            method,
            args,
            kwargs
        )
    
    def analyze_rtc_issue(self):
        """Analyze the RTC session creation issue"""
        print("\n🔍 ANALYZING WebRTC Issue...")
        
        try:
            # Get RTC session model fields
            fields = self.call_model('discuss.channel.rtc.session', 'fields_get')
            required_fields = [name for name, info in fields.items() if info.get('required')]
            
            print(f"📋 Required fields for RTC session: {required_fields}")
            
            # The error shows channel_member_id is required but missing
            if 'channel_member_id' in required_fields:
                print("🎯 FOUND THE ISSUE: channel_member_id is REQUIRED!")
                print("   Your original code was missing this mandatory field.")
                
            return required_fields
            
        except Exception as e:
            print(f"❌ Analysis failed: {e}")
            return []
    
    def test_channel_member_creation(self):
        """Test creating channel member"""
        print("\n🔧 Testing Channel Member Creation...")
        
        try:
            # Get user's partner ID
            user_data = self.call_model('res.users', 'read', [self.uid], {'fields': ['partner_id']})
            partner_id = user_data[0]['partner_id'][0]
            print(f"👤 Partner ID: {partner_id}")
            
            # Get a test channel
            channels = self.call_model('discuss.channel', 'search', [[]], {'limit': 1})
            if not channels:
                print("❌ No channels found")
                return None, None
                
            channel_id = channels[0]
            print(f"📱 Using channel ID: {channel_id}")
            
            # Check if channel member exists
            members = self.call_model('discuss.channel.member', 'search_read', [
                [['channel_id', '=', channel_id], ['partner_id', '=', partner_id]]
            ], {'fields': ['id']})
            
            if members:
                member_id = members[0]['id']
                print(f"✅ Found existing channel member: {member_id}")
            else:
                print("🔧 Creating channel member...")
                member_id = self.call_model('discuss.channel.member', 'create', [{
                    'channel_id': channel_id,
                    'partner_id': partner_id
                }])
                print(f"✅ Created channel member: {member_id}")
            
            return channel_id, member_id, partner_id
            
        except Exception as e:
            print(f"❌ Channel member test failed: {e}")
            return None, None, None
    
    def test_rtc_session_with_member(self, channel_id, member_id, partner_id):
        """Test RTC session creation with proper member ID"""
        print("\n🚀 Testing RTC Session with Channel Member...")
        
        try:
            session_data = {
                'channel_id': channel_id,
                'channel_member_id': member_id,  # This is the fix!
                'partner_id': partner_id,
                'is_camera_on': True,
                'is_muted': False,
                'is_screen_sharing_on': False,
                'is_deaf': False
            }
            
            print("📞 Creating RTC session...")
            session_id = self.call_model('discuss.channel.rtc.session', 'create', [session_data])
            print(f"🎉 SUCCESS! RTC session created: {session_id}")
            
            # Clean up
            self.call_model('discuss.channel.rtc.session', 'unlink', [session_id])
            print("🧹 Session cleaned up")
            
            return True
            
        except Exception as e:
            print(f"❌ RTC session creation failed: {e}")
            return False
    
    def generate_mobile_solution(self):
        """Generate the mobile app solution"""
        print("\n📱 MOBILE APP SOLUTION:")
        print("="*60)
        
        solution = """
// FIXED CallService.ts method:

async initiateWebRTCCall(channelId: number, callType: 'audio' | 'video'): Promise<string> {
  const client = authService.getClient();
  if (!client) throw new Error('No authenticated client');

  try {
    console.log('📞 Creating Odoo RTC session...');

    // Step 1: Get user's partner ID
    const userData = await client.callModel('res.users', 'read', [client.uid], {
      fields: ['partner_id']
    });
    const partnerId = userData[0].partner_id[0];

    // Step 2: Ensure user is a channel member (CRITICAL FIX!)
    let channelMembers = await client.searchRead('discuss.channel.member', [
      ['channel_id', '=', channelId], 
      ['partner_id', '=', partnerId]
    ], ['id']);

    let channelMemberId;
    if (channelMembers.length > 0) {
      channelMemberId = channelMembers[0].id;
    } else {
      // Create channel member if doesn't exist
      channelMemberId = await client.callModel('discuss.channel.member', 'create', [{
        channel_id: channelId,
        partner_id: partnerId
      }]);
    }

    // Step 3: Create RTC session with REQUIRED channel_member_id
    const sessionId = await client.callModel('discuss.channel.rtc.session', 'create', [{
      channel_id: channelId,
      channel_member_id: channelMemberId,  // ← THE MISSING PIECE!
      partner_id: partnerId,
      is_camera_on: callType === 'video',
      is_muted: false,
      is_screen_sharing_on: false,
      is_deaf: false
    }]);

    console.log('✅ RTC session created:', sessionId);

    // Step 4: Send bus notification
    await client.callModel('bus.bus', 'sendone', [
      `discuss.channel_${channelId}`,
      'discuss.channel.rtc.session/insert',
      {
        id: sessionId,
        channel_id: channelId,
        partner_id: partnerId,
        is_camera_on: callType === 'video',
        is_muted: false
      }
    ]);

    return sessionId.toString();

  } catch (error) {
    console.error('❌ WebRTC call failed:', error);
    throw error;
  }
}

// Update your call button to use this:
// await callService.initiateWebRTCCall(selectedChannel.id, 'video');
"""
        
        print(solution)
        print("="*60)
        print("🎯 KEY ISSUE: Missing 'channel_member_id' field")
        print("📋 Odoo requires users to be channel members before creating RTC sessions")
        print("✅ This fix ensures the user is a member and provides the required field")
    
    def run_analysis(self):
        """Run quick analysis and provide solution"""
        print("🚀 Quick WebRTC Issue Analysis...")
        
        if not self.authenticate():
            return
        
        # Analyze the issue
        required_fields = self.analyze_rtc_issue()
        
        if 'channel_member_id' in required_fields:
            # Test the fix
            channel_id, member_id, partner_id = self.test_channel_member_creation()
            
            if channel_id and member_id and partner_id:
                success = self.test_rtc_session_with_member(channel_id, member_id, partner_id)
                
                if success:
                    self.generate_mobile_solution()
                    print("\n🎉 SOLUTION CONFIRMED! Use the mobile app code above.")
                else:
                    print("\n❌ Fix didn't work. Check Odoo permissions.")
            else:
                print("\n❌ Channel member creation failed.")
        else:
            print("\n❓ Different issue - channel_member_id not required.")

def main():
    fixer = QuickWebRTCFix(CONFIG)
    fixer.run_analysis()

if __name__ == "__main__":
    main()
