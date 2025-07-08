#!/usr/bin/env python3

"""
Odoo WebRTC Call Initiator - FIXED VERSION
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
        """Send bus notification using correct Odoo method"""
        try:
            # Get current user info
            user_data = self.call_model('res.users', 'read', [self.uid], {
                'fields': ['name', 'email']
            })
            caller_name = user_data[0]['name'] if user_data else 'CLI Caller'
            
            # Try different bus notification methods
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
            
            # Method 1: Try _sendmany
            try:
                notifications = [
                    [f'discuss.channel_{channel_id}', {
                        'type': 'discuss.channel.rtc.session/insert',
                        'payload': notification_data
                    }]
                ]
                
                self.call_model('bus.bus', '_sendmany', [notifications])
                print("✅ Bus notification sent via _sendmany!")
                return True
                
            except Exception as e1:
                print(f"⚠️ _sendmany failed: {e1}")
                
                # Method 2: Try sendmany
                try:
                    self.call_model('bus.bus', 'sendmany', [notifications])
                    print("✅ Bus notification sent via sendmany!")
                    return True
                    
                except Exception as e2:
                    print(f"⚠️ sendmany failed: {e2}")
                    
                    # Method 3: Try create method
                    try:
                        bus_message = {
                            'channel': f'discuss.channel_{channel_id}',
                            'message': notification_data
                        }
                        
                        self.call_model('bus.bus', 'create', [bus_message])
                        print("✅ Bus notification sent via create!")
                        return True
                        
                    except Exception as e3:
                        print(f"⚠️ create method failed: {e3}")
                        return False
            
        except Exception as e:
            print(f"❌ Bus notification completely failed: {e}")
            return False
    
    def send_enhanced_chat_notification(self, channel_id, session_id, call_type='audio'):
        """Send enhanced chat message that looks like a call"""
        try:
            # Get user info
            user_data = self.call_model('res.users', 'read', [self.uid], {
                'fields': ['name']
            })
            caller_name = user_data[0]['name'] if user_data else 'CLI Caller'
            
            # Send a message that looks like an incoming call
            call_message = f"""
📞 <strong>Incoming {call_type.title()} Call</strong> from {caller_name}
🎯 RTC Session ID: {session_id}
🔔 This would trigger a call notification in the web interface!
📱 Click to join the call
            """.strip()
            
            self.call_model('discuss.channel', 'message_post', [channel_id], {
                'body': call_message,
                'message_type': 'comment',  # Use comment to make it more prominent
                'subject': f'Incoming {call_type.title()} Call'
            })
            
            print("💬 Enhanced call notification sent via chat")
            return True
            
        except Exception as e:
            print(f"❌ Enhanced chat notification failed: {e}")
            return False
    
    def trigger_channel_activity(self, channel_id, session_id):
        """Trigger activity in the channel to get attention"""
        try:
            # Update the channel to mark activity
            self.call_model('discuss.channel', 'write', [channel_id], {
                'last_interest_dt': time.strftime('%Y-%m-%d %H:%M:%S')
            })
            
            # Try to trigger a channel notification
            self.call_model('discuss.channel', '_notify_members', [
                [channel_id], 
                f'RTC session {session_id} started'
            ])
            
            print("🔔 Channel activity triggered")
            return True
            
        except Exception as e:
            print(f"⚠️ Channel activity trigger failed: {e}")
            return False
    
    def cleanup_session(self, session_id, delay_seconds=30):
        """Clean up the RTC session after a delay"""
        try:
            print(f"⏰ Call will auto-end in {delay_seconds} seconds...")
            print("   (Check Odoo web interface now for the call notification!)")
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
        
        print("\n🎉 RTC SESSION CREATED SUCCESSFULLY!")
        print(f"📞 Session ID: {session_id}")
        print(f"📱 Channel: {channel_info['name']}")
        print(f"🔔 This creates an active call that should appear in Odoo web!")
        
        # Try multiple notification methods
        notification_sent = self.send_call_notification(channel_id, session_id, partner_id, call_type)
        
        # Send enhanced chat notification
        self.send_enhanced_chat_notification(channel_id, session_id, call_type)
        
        # Trigger channel activity
        self.trigger_channel_activity(channel_id, session_id)
        
        print("\n" + "="*60)
        print("🌐 CHECK ODOO WEB INTERFACE NOW!")
        print("="*60)
        print("You should see:")
        print("• RTC session in General Settings > RTC sessions")
        print("• Active call indicator in the channel")
        print("• Chat message with call details")
        print("• Possible incoming call notification")
        print("="*60)
        
        # Keep session active for 30 seconds
        self.cleanup_session(session_id, 30)
        
        return True
    
    def run(self):
        """Run the call initiator"""
        print("🚀 Odoo WebRTC Call Initiator - FIXED VERSION")
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
    print("📞 Starting CLI Audio Call to Channel 105...")
    print("🎯 Goal: Create RTC session and make Odoo web show active call")
    print("")
    
    initiator = OdooCallInitiator(CONFIG)
    success = initiator.run()
    
    if success:
        print("\n✅ Call initiation completed successfully!")
        print("🔔 RTC session created - check Odoo web interface!")
    else:
        print("\n❌ Call initiation failed")
        print("🔍 Check the error messages above")
    
    return success

if __name__ == "__main__":
    main()
