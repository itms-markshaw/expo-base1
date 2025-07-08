#!/usr/bin/env python3

"""
Odoo WebRTC Call Initiator - CLI Script
Initiates an audio call to channel 105 to test Odoo web ringing
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
    
    def send_call_notification(self, channel_id, session_id, partner_id, call_type='audio'):
        """Send bus notification to make Odoo web ring"""
        try:
            # Get current user info
            user_data = self.call_model('res.users', 'read', [self.uid], {
                'fields': ['name', 'email']
            })
            caller_name = user_data[0]['name'] if user_data else 'CLI Caller'
            
            # Send bus notification
            notification_data = {
                'id': session_id,
                'channel_id': channel_id,
                'partner_id': partner_id,
                'is_camera_on': call_type == 'video',
                'is_muted': False,
                'is_screen_sharing_on': False,
                'caller_name': caller_name,
                'action': 'join',
                'call_type': call_type
            }
            
            print("📡 Sending bus notification to make Odoo web ring...")
            
            # Send to specific channel
            self.call_model('bus.bus', 'sendone', [
                f'discuss.channel_{channel_id}',
                'discuss.channel.rtc.session/insert',
                notification_data
            ])
            
            # Also send a general RTC notification
            self.call_model('bus.bus', 'sendone', [
                f'rtc_session_{session_id}',
                'rtc_session_update',
                notification_data
            ])
            
            print("✅ Bus notifications sent!")
            print(f"🔔 Odoo web should now show incoming {call_type} call notification!")
            
            return True
            
        except Exception as e:
            print(f"❌ Bus notification failed: {e}")
            return False
    
    def send_chat_message_notification(self, channel_id, call_type='audio'):
        """Send chat message as backup notification"""
        try:
            message = f"📞 {call_type.title()} call started from CLI - Check for incoming call!"
            
            self.call_model('discuss.channel', 'message_post', [channel_id], {
                'body': message,
                'message_type': 'notification'
            })
            
            print("💬 Chat notification sent as backup")
            return True
            
        except Exception as e:
            print(f"❌ Chat notification failed: {e}")
            return False
    
    def cleanup_session(self, session_id, delay_seconds=30):
        """Clean up the RTC session after a delay"""
        try:
            print(f"⏰ Call will auto-end in {delay_seconds} seconds...")
            time.sleep(delay_seconds)
            
            self.call_model('discuss.channel.rtc.session', 'unlink', [session_id])
            print("🧹 RTC session cleaned up")
            
        except Exception as e:
            print(f"⚠️ Cleanup failed: {e}")
    
    def initiate_call(self, channel_id, call_type='audio'):
        """Main method to initiate a call"""
        print(f"🚀 Initiating {call_type} call to channel {channel_id}...")
        
        # Get user's partner ID
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
        
        # Get channel info
        channel_info = self.get_channel_info(channel_id)
        if not channel_info:
            print(f"❌ Channel {channel_id} not found")
            return False
        
        print(f"📱 Target channel: {channel_info['name']} (Type: {channel_info['channel_type']})")
        
        # Ensure user is channel member
        member_id = self.ensure_channel_member(channel_id, partner_id)
        if not member_id:
            return False
        
        # Create RTC session
        session_id = self.create_rtc_session(channel_id, member_id, partner_id, call_type)
        if not session_id:
            return False
        
        # Send notifications to make Odoo web ring
        success = self.send_call_notification(channel_id, session_id, partner_id, call_type)
        
        # Send backup chat notification
        self.send_chat_message_notification(channel_id, call_type)
        
        if success:
            print("\n🎉 SUCCESS!")
            print("📞 Call initiated successfully!")
            print("🌐 Check Odoo web interface - you should see:")
            print("   • Incoming call notification popup")
            print("   • 'Join Call' button in the channel")
            print("   • Active RTC session indicator")
            print("")
            print("🔔 The call should be RINGING in Odoo web now!")
            
            # Keep session active for 30 seconds
            self.cleanup_session(session_id, 30)
            
            return True
        else:
            print("❌ Call initiation failed")
            return False
    
    def run(self):
        """Run the call initiator"""
        print("🚀 Odoo WebRTC Call Initiator")
        print("="*50)
        print(f"📡 Target: {self.url}")
        print(f"🗄️  Database: {self.config['database']}")
        print(f"👤 User: {self.config['username']}")
        print(f"📱 Channel: {self.config['target_channel_id']}")
        print("="*50)
        
        if not self.authenticate():
            return False
        
        # Initiate audio call to channel 105
        return self.initiate_call(self.config['target_channel_id'], 'audio')

def main():
    print("📞 Starting CLI Audio Call to Channel 105...")
    print("🎯 Goal: Make Odoo web interface ring with incoming call")
    print("")
    
    initiator = OdooCallInitiator(CONFIG)
    success = initiator.run()
    
    if success:
        print("\n✅ Call initiation completed successfully!")
        print("🔔 Check Odoo web - it should be ringing!")
    else:
        print("\n❌ Call initiation failed")
        print("🔍 Check the error messages above")
    
    return success

if __name__ == "__main__":
    main()
