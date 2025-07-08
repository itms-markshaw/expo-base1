#!/usr/bin/env python3

"""
Odoo WebRTC Call Initiator - CLEAN & CALL VERSION
Cleans up existing RTC sessions and creates a new call to channel 105
"""

import xmlrpc.client
import sys
import time

# Configuration
CONFIG = {
    'host': 'itmsgroup.com.au',
    'port': 443,
    'database': 'ITMS_v17_3_backup_2025_02_17_08_15',
    'username': 'mark.shaw@itmsgroup.com.au',
    'api_key': 'ea186501b420d9b656eecf026f04f74a975db27c',
    'protocol': 'https',
    'target_channel_id': 105  # Channel to call
}

class OdooCallInitiator:
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
    
    def cleanup_existing_sessions(self, channel_id=None):
        """Clean up any existing RTC sessions"""
        try:
            print("🧹 Cleaning up existing RTC sessions...")
            
            # Find existing RTC sessions
            search_domain = []
            if channel_id:
                search_domain.append(['channel_id', '=', channel_id])
            
            existing_sessions = self.call_model('discuss.channel.rtc.session', 'search', [search_domain])
            
            if existing_sessions:
                print(f"🔍 Found {len(existing_sessions)} existing RTC sessions")
                
                # Delete existing sessions
                self.call_model('discuss.channel.rtc.session', 'unlink', [existing_sessions])
                print(f"✅ Cleaned up {len(existing_sessions)} RTC sessions")
            else:
                print("✅ No existing RTC sessions to clean up")
            
            return True
            
        except Exception as e:
            print(f"⚠️ Cleanup failed: {e}")
            return True  # Continue anyway
    
    def get_channel_info(self, channel_id):
        """Get channel information"""
        try:
            channels = self.call_model('discuss.channel', 'read', [channel_id], {
                'fields': ['id', 'name', 'channel_type', 'channel_member_ids']
            })
            if channels:
                return channels[0]
            return None
        except Exception as e:
            print(f"❌ Failed to get channel info: {e}")
            return None
    
    def ensure_channel_member(self, channel_id, partner_id):
        """Ensure user is a member of the channel"""
        try:
            # Check if already a member
            members = self.call_model('discuss.channel.member', 'search_read', [
                [['channel_id', '=', channel_id], ['partner_id', '=', partner_id]]
            ], {'fields': ['id']})
            
            if members:
                member_id = members[0]['id']
                print(f"✅ Already a channel member: {member_id}")
            else:
                # Create channel member
                print("🔧 Creating channel membership...")
                member_id = self.call_model('discuss.channel.member', 'create', [{
                    'channel_id': channel_id,
                    'partner_id': partner_id
                }])
                print(f"✅ Created channel member: {member_id}")
            
            return member_id
            
        except Exception as e:
            print(f"❌ Channel member creation failed: {e}")
            return None
    
    def create_rtc_session(self, channel_id, member_id, partner_id, call_type='audio'):
        """Create RTC session for the call"""
        try:
            session_data = {
                'channel_id': channel_id,
                'channel_member_id': member_id,
                'partner_id': partner_id,
                'is_camera_on': call_type == 'video',
                'is_muted': False,
                'is_screen_sharing_on': False,
                'is_deaf': False
            }
            
            print(f"📞 Creating {call_type} RTC session...")
            session_id = self.call_model('discuss.channel.rtc.session', 'create', [session_data])
            print(f"✅ RTC session created: {session_id}")
            
            return session_id
            
        except Exception as e:
            print(f"❌ RTC session creation failed: {e}")
            return None
    
    def send_call_notification_message(self, channel_id, session_id, call_type='audio'):
        """Send a prominent call notification via chat"""
        try:
            # Get user info
            user_data = self.call_model('res.users', 'read', [self.uid], {
                'fields': ['name']
            })
            caller_name = user_data[0]['name'] if user_data else 'CLI Caller'
            
            # Create a very visible call message
            call_message = f"""
🔔 <strong>INCOMING {call_type.upper()} CALL</strong> 🔔

📞 From: {caller_name}
🎯 RTC Session: {session_id}
📱 Channel: 105

🌐 <strong>CHECK ODOO WEB INTERFACE NOW!</strong>
• Go to General Settings → RTC sessions
• Look for active call notification
• You should see "Join Call" button

🎉 This RTC session makes Odoo web show an active call!
            """.strip()
            
            self.call_model('discuss.channel', 'message_post', [channel_id], {
                'body': call_message,
                'message_type': 'comment',
                'subject': f'🔔 INCOMING {call_type.upper()} CALL'
            })
            
            print("💬 Call notification message sent!")
            return True
            
        except Exception as e:
            print(f"❌ Call notification message failed: {e}")
            return False
    
    def show_success_info(self, session_id, channel_info, call_type):
        """Show success information"""
        print("\n" + "🎉" * 20)
        print("SUCCESS! RTC SESSION CREATED!")
        print("🎉" * 20)
        print(f"📞 Session ID: {session_id}")
        print(f"📱 Channel: {channel_info['name']}")
        print(f"🔊 Call Type: {call_type.upper()}")
        print(f"⏰ Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        print("\n" + "🌐" * 15 + " CHECK ODOO WEB " + "🌐" * 15)
        print("1. Open Odoo web interface")
        print("2. Go to General Settings → RTC sessions")
        print("3. You should see your active RTC session!")
        print("4. Or check the chat channel for call notification")
        print("5. Look for 'Join Call' buttons in the interface")
        print("🌐" * 50)
    
    def cleanup_session(self, session_id, delay_seconds=45):
        """Clean up the RTC session after a delay"""
        try:
            print(f"\n⏰ Call will auto-end in {delay_seconds} seconds...")
            print("   🌐 Go check Odoo web interface NOW!")
            print("   📞 Look for the active call/RTC session")
            
            # Countdown
            for i in range(delay_seconds, 0, -5):
                print(f"   ⏰ {i} seconds remaining...")
                time.sleep(5)
            
            print("\n🧹 Ending call and cleaning up...")
            self.call_model('discuss.channel.rtc.session', 'unlink', [session_id])
            print("✅ RTC session cleaned up")
            
        except Exception as e:
            print(f"⚠️ Cleanup failed: {e}")
    
    def initiate_call(self, channel_id, call_type='audio'):
        """Main method to initiate a call"""
        print(f"🚀 Initiating {call_type} call to channel {channel_id}...")
        
        # Step 1: Clean up existing sessions
        self.cleanup_existing_sessions(channel_id)
        
        # Step 2: Get user's partner ID
        try:
            user_data = self.call_model('res.users', 'read', [self.uid], {
                'fields': ['partner_id', 'name']
            })
            partner_id = user_data[0]['partner_id'][0]
            user_name = user_data[0]['name']
            print(f"👤 Calling as: {user_name} (Partner ID: {partner_id})")
        except Exception as e:
            print(f"❌ Failed to get user info: {e}")
            return False
        
        # Step 3: Get channel info
        channel_info = self.get_channel_info(channel_id)
        if not channel_info:
            print(f"❌ Channel {channel_id} not found")
            return False
        
        print(f"📱 Target channel: {channel_info['name']} (Type: {channel_info['channel_type']})")
        
        # Step 4: Ensure user is channel member
        member_id = self.ensure_channel_member(channel_id, partner_id)
        if not member_id:
            return False
        
        # Step 5: Create RTC session
        session_id = self.create_rtc_session(channel_id, member_id, partner_id, call_type)
        if not session_id:
            return False
        
        # Step 6: Send call notification
        self.send_call_notification_message(channel_id, session_id, call_type)
        
        # Step 7: Show success info
        self.show_success_info(session_id, channel_info, call_type)
        
        # Step 8: Keep session active for testing
        self.cleanup_session(session_id, 45)
        
        return True
    
    def run(self):
        """Run the call initiator"""
        print("🚀 Odoo WebRTC Call Initiator - CLEAN & CALL")
        print("="*60)
        print(f"📡 Target: {self.url}")
        print(f"🗄️  Database: {self.config['database']}")
        print(f"👤 User: {self.config['username']}")
        print(f"📱 Channel: {self.config['target_channel_id']}")
        print("="*60)
        
        if not self.authenticate():
            return False
        
        # Initiate audio call to channel 105
        return self.initiate_call(self.config['target_channel_id'], 'audio')

def main():
    print("📞 Starting CLEAN & CALL to Channel 105...")
    print("🎯 Goal: Clean up old sessions and create new RTC call")
    print("")
    
    initiator = OdooCallInitiator(CONFIG)
    success = initiator.run()
    
    if success:
        print("\n🎉 CALL COMPLETED SUCCESSFULLY!")
        print("🔔 RTC session was created and should be visible in Odoo web!")
    else:
        print("\n❌ Call initiation failed")
        print("🔍 Check the error messages above")
    
    return success

if __name__ == "__main__":
    main()
