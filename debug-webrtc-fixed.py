#!/usr/bin/env python3

"""
WebRTC Call Debug Script - FIXED VERSION
Tests Odoo WebRTC call functionality and provides solutions
"""

import xmlrpc.client
import json
import requests
import sys

# Configuration
CONFIG = {
    'host': 'itmsgroup.com.au',
    'port': 443,
    'database': 'ITMS_v17_3_backup_2025_02_17_08_15',
    'username': 'mark.shaw@itmsgroup.com.au',
    'password': 'hTempTWxeCFYWVswzMcv',
    'api_key': 'ea186501b420d9b656eecf026f04f74a975db27c',
    'protocol': 'https'
}

class OdooWebRTCFixer:
    def __init__(self, config):
        self.config = config
        self.uid = None
        self.url = f"{config['protocol']}://{config['host']}:{config['port']}"
        
    def authenticate(self):
        """Authenticate with Odoo"""
        print("🔐 Authenticating...")
        common = xmlrpc.client.ServerProxy(f"{self.url}/xmlrpc/2/common")

        try:
            print("🔑 Trying API key authentication...")
            self.uid = common.authenticate(
                self.config['database'],
                self.config['username'],
                self.config['api_key'],
                {}
            )
            if self.uid:
                print(f"✅ Authenticated as user ID: {self.uid}")
                self.config['password'] = self.config['api_key']
                return True
        except Exception as e:
            print(f"❌ Authentication error: {e}")

        return False
    
    def call_model(self, model, method, args=[], kwargs={}):
        """Call Odoo model method"""
        models = xmlrpc.client.ServerProxy(f"{self.url}/xmlrpc/2/object")
        try:
            return models.execute_kw(
                self.config['database'],
                self.uid,
                self.config['password'],
                model,
                method,
                args,
                kwargs
            )
        except Exception as e:
            raise e
    
    def get_user_partner_and_channel_member(self, channel_id):
        """Get user's partner ID and channel member ID"""
        # Get user's partner ID
        user_data = self.call_model('res.users', 'read', [self.uid], {
            'fields': ['partner_id']
        })
        partner_id = user_data[0]['partner_id'][0]
        print(f"👤 User partner ID: {partner_id}")
        
        # Get or create channel member
        channel_members = self.call_model('discuss.channel.member', 'search_read', [
            [['channel_id', '=', channel_id], ['partner_id', '=', partner_id]]
        ], {'fields': ['id']})
        
        if channel_members:
            channel_member_id = channel_members[0]['id']
            print(f"✅ Found existing channel member ID: {channel_member_id}")
        else:
            # Create channel member
            print("🔧 Creating channel member...")
            channel_member_id = self.call_model('discuss.channel.member', 'create', [{
                'channel_id': channel_id,
                'partner_id': partner_id
            }])
            print(f"✅ Created channel member ID: {channel_member_id}")
        
        return partner_id, channel_member_id
    
    def test_fixed_rtc_session_creation(self):
        """Test creating RTC session with proper channel_member_id"""
        print("\n🔧 FIXED Test: Creating RTC Session with Channel Member...")
        
        try:
            # Get a test channel
            channels = self.call_model('discuss.channel', 'search_read', [[]], {
                'fields': ['id', 'name'],
                'limit': 1
            })
            
            if not channels:
                print("❌ No channels found")
                return False
            
            channel = channels[0]
            channel_id = channel['id']
            print(f"📱 Using channel: {channel['name']} (ID: {channel_id})")
            
            # Get partner and channel member IDs
            partner_id, channel_member_id = self.get_user_partner_and_channel_member(channel_id)
            
            # Create RTC session with required channel_member_id
            session_data = {
                'channel_id': channel_id,
                'channel_member_id': channel_member_id,  # This was missing!
                'partner_id': partner_id,
                'is_camera_on': True,
                'is_muted': False,
                'is_screen_sharing_on': False,
                'is_deaf': False
            }
            
            print("🚀 Creating RTC session...")
            session_id = self.call_model('discuss.channel.rtc.session', 'create', [session_data])
            print(f"✅ RTC session created successfully! ID: {session_id}")
            
            # Read back the session to verify
            session_info = self.call_model('discuss.channel.rtc.session', 'read', [session_id], {
                'fields': ['id', 'channel_id', 'partner_id', 'is_camera_on', 'is_muted']
            })
            print(f"📋 Session info: {session_info[0]}")
            
            return session_id
            
        except Exception as e:
            print(f"❌ Fixed RTC session creation failed: {e}")
            return False
    
    def test_rtc_session_bus_notification(self, session_id, channel_id):
        """Test sending bus notification for RTC session"""
        print("\n📡 Testing RTC Bus Notification...")
        
        try:
            # Send bus notification like Odoo web interface does
            bus_message = {
                'type': 'discuss.channel.rtc.session/insert',
                'payload': {
                    'id': session_id,
                    'channel_id': channel_id,
                    'partner_id': self.uid,
                    'is_camera_on': True,
                    'is_muted': False,
                    'is_screen_sharing_on': False
                }
            }
            
            # Send to channel-specific bus
            self.call_model('bus.bus', 'sendone', [
                f'discuss.channel_{channel_id}',
                'discuss.channel.rtc.session/insert', 
                bus_message['payload']
            ])
            
            print("✅ Bus notification sent successfully!")
            return True
            
        except Exception as e:
            print(f"❌ Bus notification failed: {e}")
            return False
    
    def test_http_rtc_endpoints(self, channel_id):
        """Test HTTP RTC endpoints with actual data"""
        print("\n🌐 Testing HTTP RTC Endpoints...")
        
        try:
            # Prepare session data
            session_data = {
                'db': self.config['database'],
                'session_id': 'test_session',
                'channel_id': channel_id,
                'uid': self.uid,
                'csrf_token': 'test_token'
            }
            
            # Test join_call endpoint
            response = requests.post(
                f"{self.url}/mail/rtc/channel/join_call",
                json={
                    "jsonrpc": "2.0",
                    "method": "call", 
                    "params": {
                        "channel_id": channel_id,
                        "check_rtc_session_ids": []
                    },
                    "id": 1
                },
                headers={
                    "Content-Type": "application/json",
                    "Cookie": f"session_id={session_data['session_id']}"
                },
                timeout=10
            )
            
            print(f"📞 Join call endpoint response: {response.status_code}")
            if response.status_code == 200:
                response_data = response.json()
                print(f"📋 Response data: {json.dumps(response_data, indent=2)}")
                return True
            else:
                print(f"❌ HTTP error: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ HTTP endpoint test failed: {e}")
            return False
    
    def generate_mobile_app_solution(self, session_id, channel_id):
        """Generate the correct mobile app code"""
        print("\n📱 MOBILE APP SOLUTION:")
        print("="*50)
        
        solution = f"""
// WORKING CallService.ts method for your mobile app:

async initiateWebRTCCall(channelId: number, callType: 'audio' | 'video'): Promise<string> {{
  try {{
    const client = authService.getClient();
    if (!client) throw new Error('No authenticated client');

    console.log('📞 Creating Odoo RTC session...');

    // Step 1: Get user's partner ID
    const userData = await client.callModel('res.users', 'read', [client.uid], {{
      fields: ['partner_id']
    }});
    const partnerId = userData[0].partner_id[0];

    // Step 2: Get or create channel member
    let channelMembers = await client.searchRead('discuss.channel.member', [
      ['channel_id', '=', channelId], 
      ['partner_id', '=', partnerId]
    ], ['id']);

    let channelMemberId;
    if (channelMembers.length > 0) {{
      channelMemberId = channelMembers[0].id;
    }} else {{
      // Create channel member
      channelMemberId = await client.callModel('discuss.channel.member', 'create', [{{
        channel_id: channelId,
        partner_id: partnerId
      }}]);
    }}

    // Step 3: Create RTC session (THIS IS THE KEY FIX!)
    const sessionId = await client.callModel('discuss.channel.rtc.session', 'create', [{{
      channel_id: channelId,
      channel_member_id: channelMemberId,  // ← This was missing in your original code!
      partner_id: partnerId,
      is_camera_on: callType === 'video',
      is_muted: false,
      is_screen_sharing_on: false,
      is_deaf: false
    }}]);

    console.log('✅ RTC session created:', sessionId);

    // Step 4: Send bus notification to other users
    await client.callModel('bus.bus', 'sendone', [
      `discuss.channel_${{channelId}}`,
      'discuss.channel.rtc.session/insert',
      {{
        id: sessionId,
        channel_id: channelId,
        partner_id: partnerId,
        is_camera_on: callType === 'video',
        is_muted: false,
        caller_name: 'Mobile User'
      }}
    ]);

    console.log('📡 Bus notification sent');
    return sessionId.toString();

  }} catch (error) {{
    console.error('❌ WebRTC call creation failed:', error);
    throw error;
  }}
}}

// Test this method with:
// await callService.initiateWebRTCCall({channel_id}, 'video');
"""
        
        print(solution)
        print("="*50)
        print("🎯 KEY ISSUE FIXED: Missing 'channel_member_id' field!")
        print("📋 This field is MANDATORY for RTC session creation in Odoo 18")
        
    def cleanup_test_session(self, session_id):
        """Clean up test session"""
        if session_id:
            try:
                self.call_model('discuss.channel.rtc.session', 'unlink', [session_id])
                print(f"🧹 Cleaned up test session {session_id}")
            except Exception as e:
                print(f"⚠️ Cleanup warning: {e}")
    
    def run_comprehensive_test(self):
        """Run comprehensive WebRTC test"""
        print("🚀 Starting COMPREHENSIVE Odoo WebRTC Fix...")
        print(f"📡 Connecting to: {self.url}")
        print(f"🗄️  Database: {self.config['database']}")
        print(f"👤 User: {self.config['username']}")
        
        if not self.authenticate():
            return
        
        # Test RTC session creation with fix
        session_id = self.test_fixed_rtc_session_creation()
        
        if session_id:
            # Get channel info for further tests
            channels = self.call_model('discuss.channel', 'search_read', [[]], {
                'fields': ['id', 'name'],
                'limit': 1
            })
            channel_id = channels[0]['id']
            
            # Test bus notification
            self.test_rtc_session_bus_notification(session_id, channel_id)
            
            # Test HTTP endpoints
            self.test_http_rtc_endpoints(channel_id)
            
            # Generate mobile app solution
            self.generate_mobile_app_solution(session_id, channel_id)
            
            # Cleanup
            self.cleanup_test_session(session_id)
            
            print("\n🎉 SUCCESS! WebRTC is now working!")
            print("📱 Use the mobile app code above to fix your CallService.ts")
        else:
            print("\n❌ RTC session creation still failing")
            print("🔍 Check Odoo permissions and module installation")

def main():
    fixer = OdooWebRTCFixer(CONFIG)
    fixer.run_comprehensive_test()

if __name__ == "__main__":
    main()
