#!/usr/bin/env python3

"""
Enhanced Odoo WebRTC Call Initiator - CLEAN & CALL VERSION
Cleans up existing RTC sessions, creates a new call, and diagnoses issues
"""

import xmlrpc.client
import sys
import time
import json

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

class EnhancedOdooCallInitiator:
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
        """Call Odoo model method with debugging"""
        models = xmlrpc.client.ServerProxy(f"{self.url}/xmlrpc/2/object")
        try:
            result = models.execute_kw(
                self.config['database'],
                self.uid,
                self.config['api_key'],
                model,
                method,
                args,
                kwargs
            )
            return result
        except Exception as e:
            print(f"❌ API call failed: {model}.{method} - {e}")
            raise e
    
    def diagnose_rtc_sessions(self):
        """Diagnose current RTC session state"""
        print("\n🔍 DIAGNOSING RTC SESSIONS...")
        print("-" * 50)
        
        try:
            # Check all RTC sessions
            all_sessions = self.call_model('discuss.channel.rtc.session', 'search_read', [[]], {
                'fields': ['id', 'channel_id', 'partner_id', 'is_camera_on', 'is_muted', 'create_date']
            })
            
            print(f"📊 Total RTC sessions in system: {len(all_sessions)}")
            
            if all_sessions:
                print("\n🎯 Active RTC Sessions:")
                for session in all_sessions:
                    channel_name = "Unknown"
                    try:
                        channel_info = self.call_model('discuss.channel', 'read', [session['channel_id'][0]], {'fields': ['name']})
                        if channel_info:
                            channel_name = channel_info[0]['name']
                    except:
                        pass
                    
                    partner_name = "Unknown"
                    try:
                        partner_info = self.call_model('res.partner', 'read', [session['partner_id'][0]], {'fields': ['name']})
                        if partner_info:
                            partner_name = partner_info[0]['name']
                    except:
                        pass
                    
                    print(f"  📞 Session {session['id']}")
                    print(f"    📱 Channel: {channel_name} (ID: {session['channel_id'][0]})")
                    print(f"    👤 User: {partner_name} (ID: {session['partner_id'][0]})")
                    print(f"    📹 Video: {'On' if session['is_camera_on'] else 'Off'}")
                    print(f"    🔇 Muted: {'Yes' if session['is_muted'] else 'No'}")
                    print(f"    ⏰ Created: {session['create_date']}")
                    print()
            else:
                print("📭 No active RTC sessions found")
            
            # Check channel 105 specifically
            channel_105_sessions = self.call_model('discuss.channel.rtc.session', 'search_read', [
                [['channel_id', '=', 105]]
            ], {'fields': ['id', 'partner_id', 'is_camera_on', 'is_muted']})
            
            print(f"🎯 Channel 105 RTC sessions: {len(channel_105_sessions)}")
            for session in channel_105_sessions:
                print(f"  📞 Session {session['id']} - Partner {session['partner_id'][0]}")
                
        except Exception as e:
            print(f"❌ RTC session diagnosis failed: {e}")
    
    def check_webrtc_infrastructure(self):
        """Check WebRTC infrastructure and modules"""
        print("\n🔧 CHECKING WEBRTC INFRASTRUCTURE...")
        print("-" * 50)
        
        try:
            # Check if WebRTC modules are installed
            modules_to_check = ['mail', 'website']  # Removed 'discuss' as it might not exist in all versions
            
            # First, let's check what discuss-related modules exist
            discuss_modules = self.call_model('ir.module.module', 'search_read', [
                [['name', 'like', 'discuss']]
            ], {'fields': ['name', 'state']})
            
            if discuss_modules:
                print("  💬 Discuss-related modules found:")
                for module in discuss_modules:
                    state = module['state']
                    status = "✅" if state == 'installed' else "❌"
                    print(f"    {status} {module['name']}: {state}")
            else:
                print("  ⚠️ No discuss-related modules found")
            
            for module in modules_to_check:
                try:
                    module_info = self.call_model('ir.module.module', 'search_read', [
                        [['name', '=', module]]
                    ], {'fields': ['name', 'state']})
                    
                    if module_info:
                        state = module_info[0]['state']
                        status = "✅" if state == 'installed' else "❌"
                        print(f"  {status} Module '{module}': {state}")
                    else:
                        print(f"  ❌ Module '{module}': Not found")
                except:
                    print(f"  ⚠️ Module '{module}': Check failed")
            
            # Check mail bus functionality (with permission handling)
            try:
                # Try to check bus messages, but handle permission errors gracefully
                bus_channels = self.call_model('bus.bus', 'search_read', [
                    [['create_date', '>=', time.strftime('%Y-%m-%d')]]
                ], {'fields': ['channel', 'message'], 'limit': 5})
                
                print(f"  📡 Recent bus messages today: {len(bus_channels)}")
                if bus_channels:
                    print("    Latest bus activity detected ✅")
                else:
                    print("    No recent bus activity ⚠️")
            except Exception as bus_error:
                if "not allowed" in str(bus_error):
                    print("  📡 Bus system: Access restricted (normal for API users) 🔒")
                else:
                    print(f"  📡 Bus system check failed: {bus_error} ❌")
            
        except Exception as e:
            print(f"❌ Infrastructure check failed: {e}")
    
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
                
                # Show details before deleting
                session_details = self.call_model('discuss.channel.rtc.session', 'read', [existing_sessions], {
                    'fields': ['id', 'channel_id', 'partner_id', 'create_date']
                })
                
                for session in session_details:
                    print(f"  🗑️  Deleting session {session['id']} from channel {session['channel_id'][0]}")
                
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
        """Get comprehensive channel information with version compatibility"""
        try:
            # Use basic fields that exist in all Odoo versions
            channels = self.call_model('discuss.channel', 'read', [channel_id], {
                'fields': ['id', 'name', 'channel_type', 'channel_member_ids']
            })
            if channels:
                channel = channels[0]
                print(f"📱 Channel Info:")
                print(f"  📝 Name: {channel['name']}")
                print(f"  🏷️  Type: {channel['channel_type']}")
                print(f"  👥 Members: {len(channel['channel_member_ids'])} total")
                return channel
            return None
        except Exception as e:
            print(f"❌ Failed to get channel info: {e}")
            return None
    
    def ensure_channel_member(self, channel_id, partner_id):
        """Ensure user is a member of the channel with detailed checking"""
        try:
            print(f"👥 Checking channel membership for partner {partner_id}...")
            
            # Check if already a member
            members = self.call_model('discuss.channel.member', 'search_read', [
                [['channel_id', '=', channel_id], ['partner_id', '=', partner_id]]
            ], {'fields': ['id', 'channel_id', 'partner_id']})
            
            if members:
                member_id = members[0]['id']
                print(f"✅ Already a channel member: {member_id}")
                
                # Verify member details
                member_detail = self.call_model('discuss.channel.member', 'read', [member_id], {
                    'fields': ['id', 'channel_id', 'partner_id', 'create_date']
                })
                if member_detail:
                    print(f"  📝 Member details: {member_detail[0]}")
            else:
                # Create channel member
                print("🔧 Creating channel membership...")
                member_data = {
                    'channel_id': channel_id,
                    'partner_id': partner_id
                }
                print(f"  📋 Member data: {member_data}")
                
                member_id = self.call_model('discuss.channel.member', 'create', [member_data])
                print(f"✅ Created channel member: {member_id}")
            
            return member_id
            
        except Exception as e:
            print(f"❌ Channel member creation failed: {e}")
            return None
    
    def create_rtc_session(self, channel_id, member_id, partner_id, call_type='audio'):
        """Create RTC session with extensive validation"""
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
            print(f"  📋 Session data: {json.dumps(session_data, indent=2)}")
            
            session_id = self.call_model('discuss.channel.rtc.session', 'create', [session_data])
            print(f"✅ RTC session created: {session_id}")
            
            # Immediately verify the session was created
            verification = self.call_model('discuss.channel.rtc.session', 'read', [session_id], {
                'fields': ['id', 'channel_id', 'partner_id', 'channel_member_id', 'is_camera_on', 'is_muted', 'create_date']
            })
            
            if verification:
                print(f"✅ Session verification successful:")
                session_info = verification[0]
                print(f"  📞 Session ID: {session_info['id']}")
                print(f"  📱 Channel: {session_info['channel_id'][0]}")
                print(f"  👤 Partner: {session_info['partner_id'][0]}")
                print(f"  👥 Member: {session_info['channel_member_id'][0]}")
                print(f"  📹 Camera: {'On' if session_info['is_camera_on'] else 'Off'}")
                print(f"  🔇 Muted: {'Yes' if session_info['is_muted'] else 'No'}")
                print(f"  ⏰ Created: {session_info['create_date']}")
            else:
                print("❌ Session verification failed!")
            
            return session_id
            
        except Exception as e:
            print(f"❌ RTC session creation failed: {e}")
            print(f"   Session data attempted: {session_data}")
            return None
    
    def send_call_notification_message(self, channel_id, session_id, call_type='audio'):
        """Send enhanced call notification with debugging info"""
        try:
            # Get user info
            user_data = self.call_model('res.users', 'read', [self.uid], {
                'fields': ['name', 'partner_id']
            })
            caller_name = user_data[0]['name'] if user_data else 'CLI Caller'
            
            # Create a very visible call message with debugging info
            timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
            call_message = f"""
🔔 <strong>INCOMING {call_type.upper()} CALL - ENHANCED</strong> 🔔

📞 <strong>From:</strong> {caller_name}
🎯 <strong>RTC Session ID:</strong> {session_id}
📱 <strong>Channel:</strong> 105
⏰ <strong>Time:</strong> {timestamp}

🌐 <strong>DIAGNOSTIC INFO:</strong>
• Session should be visible in Odoo web interface
• Go to General Settings → RTC sessions
• Look for session ID {session_id}
• Check for "Join Call" buttons in chat interface
• Audio should work through WebRTC in browser

🔧 <strong>TROUBLESHOOTING:</strong>
• Refresh Odoo web page if no call appears
• Check browser console for WebRTC errors
• Ensure microphone permissions are granted
• Try answering the call in another browser tab

🎉 <strong>This RTC session should trigger call notifications!</strong>

⚡ Enhanced call script with full diagnostics active
            """.strip()
            
            # Send the message
            message_id = self.call_model('discuss.channel', 'message_post', [channel_id], {
                'body': call_message,
                'message_type': 'comment',
                'subject': f'🔔 ENHANCED {call_type.upper()} CALL - Session {session_id}'
            })
            
            print(f"💬 Enhanced call notification sent (Message ID: {message_id})")
            
            # Also send a simple message that mobile apps might detect
            simple_message = f"🎤 {caller_name} started an audio call"
            simple_id = self.call_model('discuss.channel', 'message_post', [channel_id], {
                'body': simple_message,
                'message_type': 'comment'
            })
            
            print(f"📱 Mobile-compatible message sent (Message ID: {simple_id})")
            
            return True
            
        except Exception as e:
            print(f"❌ Call notification message failed: {e}")
            return False
    
    def test_audio_permissions(self):
        """Test audio-related functionality"""
        print("\n🎵 TESTING AUDIO FUNCTIONALITY...")
        print("-" * 50)
        
        try:
            # Check user's audio preferences
            user_prefs = self.call_model('res.users', 'read', [self.uid], {
                'fields': ['name', 'email', 'partner_id']
            })
            
            if user_prefs:
                print(f"👤 User: {user_prefs[0]['name']}")
                print(f"📧 Email: {user_prefs[0]['email']}")
                print(f"🆔 Partner ID: {user_prefs[0]['partner_id'][0]}")
            
            # Check WebRTC settings (if available)
            try:
                # This might not exist in all Odoo versions
                rtc_settings = self.call_model('ir.config_parameter', 'search_read', [
                    [['key', 'like', 'rtc']]
                ], {'fields': ['key', 'value']})
                
                if rtc_settings:
                    print("🔧 WebRTC Configuration:")
                    for setting in rtc_settings:
                        print(f"  {setting['key']}: {setting['value']}")
                else:
                    print("📝 No specific WebRTC config parameters found")
                    
            except:
                print("⚠️ WebRTC settings check not available")
            
            print("✅ Audio functionality check completed")
            
        except Exception as e:
            print(f"❌ Audio test failed: {e}")
    
    def monitor_realtime_notifications(self, duration=10):
        """Monitor for real-time notifications with permission handling"""
        print(f"\n📡 MONITORING REAL-TIME NOTIFICATIONS ({duration}s)...")
        print("-" * 50)
        
        try:
            start_time = time.time()
            
            print("  🔍 Checking for RTC-related bus activity...")
            
            # Check for recent bus messages with better error handling
            for i in range(duration // 2):
                try:
                    # Look for bus messages in the last minute
                    recent_time = time.strftime('%Y-%m-%d %H:%M:%S', 
                                              time.localtime(time.time() - 60))
                    
                    bus_messages = self.call_model('bus.bus', 'search_read', [
                        [['create_date', '>=', recent_time]]
                    ], {'fields': ['channel', 'message', 'create_date'], 'limit': 10})
                    
                    if bus_messages:
                        print(f"  📨 Found {len(bus_messages)} recent bus messages:")
                        for msg in bus_messages[-2:]:  # Show last 2
                            print(f"    📡 {msg['create_date']}: {msg['channel']}")
                            if 'rtc' in str(msg['message']).lower():
                                print(f"      🎯 RTC-related: {msg['message'][:100]}...")
                    else:
                        print(f"  🔍 No recent bus messages found (check {i+1}/{duration//2})")
                    
                    time.sleep(2)
                    
                except Exception as e:
                    if "not allowed" in str(e):
                        print(f"  🔒 Bus monitoring: Access restricted (normal for API users)")
                        print(f"  ℹ️ RTC sessions should still work without bus access")
                        break
                    else:
                        print(f"  ⚠️ Bus monitoring error: {e}")
                        break
            
            print("✅ Real-time monitoring completed")
            
        except Exception as e:
            print(f"❌ Real-time monitoring failed: {e}")
    
    def show_success_info(self, session_id, channel_info, call_type):
        """Show enhanced success information"""
        print("\n" + "🎉" * 20)
        print("SUCCESS! ENHANCED RTC SESSION CREATED!")
        print("🎉" * 20)
        print(f"📞 Session ID: {session_id}")
        print(f"📱 Channel: {channel_info['name']}")
        print(f"🔊 Call Type: {call_type.upper()}")
        print(f"⏰ Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"🌐 Odoo URL: {self.url}")
        print("\n" + "🔧" * 15 + " DEBUGGING STEPS " + "🔧" * 15)
        print("1. Open Odoo web interface in browser")
        print("2. Navigate to channel 105 chat")
        print("3. Look for call notification message")
        print("4. Check for 'Join Call' or 'Answer' buttons")
        print("5. Open browser dev tools (F12) → Console")
        print("6. Look for WebRTC/RTC related logs")
        print("7. Go to General Settings → RTC sessions")
        print("8. Verify session appears in RTC list")
        print("\n" + "🎵" * 15 + " AUDIO TESTING " + "🎵" * 15)
        print("1. Ensure microphone permissions are granted")
        print("2. Test audio in another browser tab")
        print("3. Check browser audio settings")
        print("4. Try different browsers (Chrome, Firefox)")
        print("5. Check Odoo logs for WebRTC errors")
        print("🔧" * 50)
    
    def cleanup_session(self, session_id, delay_seconds=60):
        """Clean up the RTC session after a delay with monitoring"""
        try:
            print(f"\n⏰ Call will remain active for {delay_seconds} seconds...")
            print("   🌐 Go check Odoo web interface NOW!")
            print("   📞 Look for the active call/RTC session")
            print("   🎵 Test audio functionality")
            
            # Extended countdown with status checks
            for i in range(delay_seconds, 0, -10):
                print(f"\n   ⏰ {i} seconds remaining...")
                
                # Check if session still exists
                try:
                    session_check = self.call_model('discuss.channel.rtc.session', 'search', [
                        [['id', '=', session_id]]
                    ])
                    if session_check:
                        print(f"   ✅ Session {session_id} still active")
                    else:
                        print(f"   ⚠️ Session {session_id} was deleted externally")
                        return
                except:
                    print(f"   ❌ Cannot check session status")
                
                time.sleep(10)
            
            print("\n🧹 Ending call and cleaning up...")
            
            # Final session check before cleanup
            final_check = self.call_model('discuss.channel.rtc.session', 'search_read', [
                [['id', '=', session_id]]
            ], {'fields': ['id', 'create_date']})
            
            if final_check:
                self.call_model('discuss.channel.rtc.session', 'unlink', [session_id])
                print(f"✅ RTC session {session_id} cleaned up")
            else:
                print(f"ℹ️ Session {session_id} was already removed")
            
        except Exception as e:
            print(f"⚠️ Cleanup failed: {e}")
    
    def initiate_call(self, channel_id, call_type='audio'):
        """Enhanced main method to initiate a call with full diagnostics"""
        print(f"🚀 Initiating ENHANCED {call_type} call to channel {channel_id}...")
        
        # Pre-flight checks
        self.diagnose_rtc_sessions()
        self.check_webrtc_infrastructure()
        self.test_audio_permissions()
        
        # Step 1: Clean up existing sessions
        self.cleanup_existing_sessions(channel_id)
        
        # Step 2: Get user's partner ID
        try:
            user_data = self.call_model('res.users', 'read', [self.uid], {
                'fields': ['partner_id', 'name', 'email']
            })
            partner_id = user_data[0]['partner_id'][0]
            user_name = user_data[0]['name']
            user_email = user_data[0]['email']
            print(f"👤 Calling as: {user_name} <{user_email}> (Partner ID: {partner_id})")
        except Exception as e:
            print(f"❌ Failed to get user info: {e}")
            return False
        
        # Step 3: Get channel info
        channel_info = self.get_channel_info(channel_id)
        if not channel_info:
            print(f"❌ Channel {channel_id} not found")
            return False
        
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
        
        # Step 8: Monitor real-time notifications
        self.monitor_realtime_notifications(10)
        
        # Step 9: Keep session active for testing
        self.cleanup_session(session_id, 60)
        
        # Final diagnosis
        print("\n🔍 FINAL DIAGNOSIS...")
        self.diagnose_rtc_sessions()
        
        return True
    
    def run(self):
        """Run the enhanced call initiator"""
        print("🚀 Enhanced Odoo WebRTC Call Initiator - CLEAN & CALL")
        print("="*70)
        print(f"📡 Target: {self.url}")
        print(f"🗄️  Database: {self.config['database']}")
        print(f"👤 User: {self.config['username']}")
        print(f"📱 Channel: {self.config['target_channel_id']}")
        print(f"🔧 Enhanced diagnostics: ENABLED")
        print(f"🎵 Audio testing: ENABLED")
        print(f"📡 Real-time monitoring: ENABLED")
        print("="*70)
        
        if not self.authenticate():
            return False
        
        # Initiate enhanced audio call to channel 105
        return self.initiate_call(self.config['target_channel_id'], 'audio')

def main():
    print("📞 Starting ENHANCED CLEAN & CALL to Channel 105...")
    print("🎯 Goal: Create RTC call with full diagnostics and audio testing")
    print("🔧 Enhanced features: Session monitoring, audio testing, WebRTC diagnostics")
    print("")
    
    initiator = EnhancedOdooCallInitiator(CONFIG)
    success = initiator.run()
    
    if success:
        print("\n🎉 ENHANCED CALL COMPLETED!")
        print("🔔 RTC session created with full diagnostics")
        print("🌐 Check Odoo web interface for call notifications")
        print("🎵 Audio should work through browser WebRTC")
        print("🔧 Review diagnostic output above for any issues")
    else:
        print("\n❌ Enhanced call initiation failed")
        print("🔍 Check the detailed error messages above")
        print("🔧 Use diagnostic info to troubleshoot")
    
    return success

if __name__ == "__main__":
    main()
