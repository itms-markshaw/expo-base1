#!/usr/bin/env python3

"""
WebRTC SDP Test Script - Check if Odoo can handle real WebRTC signaling
This tests the actual WebRTC infrastructure that the mobile app needs
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
    'target_channel_id': 105
}

class WebRTCSignalingTest:
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
    
    def check_rtc_session_model(self):
        """Check what fields are available in the RTC session model"""
        print("\n🔍 CHECKING RTC SESSION MODEL STRUCTURE...")
        print("-" * 60)
        
        try:
            # Get model fields
            fields_info = self.call_model('discuss.channel.rtc.session', 'fields_get', [], {})
            
            print("📋 Available fields in discuss.channel.rtc.session:")
            webrtc_fields = []
            
            for field_name, field_info in fields_info.items():
                field_type = field_info.get('type', 'unknown')
                field_string = field_info.get('string', 'No description')
                print(f"  📝 {field_name} ({field_type}): {field_string}")
                
                # Look for WebRTC-related fields
                if any(term in field_name.lower() for term in ['sdp', 'ice', 'webrtc', 'offer', 'answer']):
                    webrtc_fields.append(field_name)
            
            if webrtc_fields:
                print(f"\n🎯 WebRTC-related fields found: {webrtc_fields}")
            else:
                print(f"\n❌ No SDP/ICE fields found - this explains the audio issue!")
                print(f"   Odoo RTC sessions are just status tracking, not real WebRTC")
            
            return webrtc_fields
            
        except Exception as e:
            print(f"❌ Model structure check failed: {e}")
            return []
    
    def test_sdp_storage(self, session_id):
        """Test if we can store SDP data in RTC session"""
        print(f"\n🧪 TESTING SDP STORAGE IN SESSION {session_id}...")
        print("-" * 60)
        
        # Sample SDP offer (what a real WebRTC call would generate)
        sample_sdp_offer = {
            "type": "offer",
            "sdp": "v=0\\r\\no=- 123456789 2 IN IP4 127.0.0.1\\r\\ns=-\\r\\nt=0 0\\r\\na=group:BUNDLE 0\\r\\na=extmap-allow-mixed\\r\\na=msid-semantic: WMS\\r\\nm=audio 9 UDP/TLS/RTP/SAVPF 111\\r\\nc=IN IP4 0.0.0.0\\r\\na=rtcp:9 IN IP4 0.0.0.0\\r\\na=ice-ufrag:test\\r\\na=ice-pwd:testpassword\\r\\na=ice-options:trickle\\r\\na=fingerprint:sha-256 AA:BB:CC:DD\\r\\na=setup:actpass\\r\\na=mid:0\\r\\na=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\\r\\na=sendrecv\\r\\na=msid:stream track\\r\\na=rtcp-mux\\r\\na=rtpmap:111 opus/48000/2\\r\\na=ssrc:1001 cname:test\\r\\na=ssrc:1001 msid:stream track\\r\\na=ssrc:1001 mslabel:stream\\r\\na=ssrc:1001 label:track\\r\\n"
        }
        
        # Try different field names that might exist
        sdp_field_tests = [
            ('sdp_offer', json.dumps(sample_sdp_offer)),
            ('sdp_data', json.dumps(sample_sdp_offer)),
            ('webrtc_offer', json.dumps(sample_sdp_offer)),
            ('peer_data', json.dumps(sample_sdp_offer)),
            ('session_data', json.dumps(sample_sdp_offer))
        ]
        
        successful_fields = []
        
        for field_name, field_value in sdp_field_tests:
            try:
                print(f"  🧪 Testing field: {field_name}")
                
                # Try to update the session with SDP data
                self.call_model('discuss.channel.rtc.session', 'write', [
                    [session_id],
                    {field_name: field_value}
                ])
                
                print(f"  ✅ Successfully stored SDP in field: {field_name}")
                successful_fields.append(field_name)
                
                # Read it back to verify
                result = self.call_model('discuss.channel.rtc.session', 'read', [session_id], {
                    'fields': [field_name]
                })
                
                if result and result[0].get(field_name):
                    print(f"     📖 Verified: Data retrieved successfully")
                else:
                    print(f"     ⚠️ Warning: Data not found when reading back")
                
            except Exception as e:
                if "Invalid field" in str(e):
                    print(f"  ❌ Field {field_name} does not exist")
                else:
                    print(f"  ❌ Error testing {field_name}: {e}")
        
        if successful_fields:
            print(f"\n🎯 SDP storage possible using: {successful_fields}")
            return successful_fields[0]  # Return first working field
        else:
            print(f"\n❌ NO SDP STORAGE POSSIBLE - WebRTC signaling not supported!")
            print(f"   This confirms why there's no audio - no SDP exchange mechanism")
            return None
    
    def test_ice_candidate_exchange(self, channel_id):
        """Test ICE candidate exchange via messages"""
        print(f"\n🧊 TESTING ICE CANDIDATE EXCHANGE...")
        print("-" * 60)
        
        # Sample ICE candidate (what WebRTC would generate)
        sample_ice_candidate = {
            "type": "ice-candidate",
            "candidate": {
                "candidate": "candidate:1 1 UDP 2113667326 192.168.1.100 54400 typ host",
                "sdpMLineIndex": 0,
                "sdpMid": "0"
            }
        }
        
        try:
            # Send ICE candidate as a message
            message_id = self.call_model('discuss.channel', 'message_post', [channel_id], {
                'body': json.dumps(sample_ice_candidate),
                'message_type': 'notification',
                'subject': 'WebRTC ICE Candidate Test'
            })
            
            print(f"  ✅ ICE candidate message sent: {message_id}")
            
            # Check if the message was stored properly
            message_data = self.call_model('mail.message', 'read', [message_id], {
                'fields': ['body', 'message_type', 'subject']
            })
            
            if message_data:
                print(f"  📖 Message verified: {message_data[0]['subject']}")
                print(f"  📋 Body length: {len(message_data[0]['body'])} chars")
                return True
            else:
                print(f"  ❌ Could not verify ICE candidate message")
                return False
                
        except Exception as e:
            print(f"  ❌ ICE candidate test failed: {e}")
            return False
    
    def check_webrtc_web_integration(self):
        """Check if Odoo web has WebRTC integration"""
        print(f"\n🌐 CHECKING ODOO WEB WEBRTC INTEGRATION...")
        print("-" * 60)
        
        try:
            # Look for WebRTC-related configuration
            webrtc_configs = self.call_model('ir.config_parameter', 'search_read', [
                ['|', ['key', 'like', 'webrtc'], ['key', 'like', 'rtc']]
            ], {'fields': ['key', 'value']})
            
            if webrtc_configs:
                print("📋 WebRTC configuration found:")
                for config in webrtc_configs:
                    print(f"  🔧 {config['key']}: {config['value']}")
            else:
                print("❌ No WebRTC configuration parameters found")
            
            # Check for WebRTC assets/views
            webrtc_views = self.call_model('ir.ui.view', 'search_read', [
                ['|', ['name', 'like', 'webrtc'], ['name', 'like', 'rtc']]
            ], {'fields': ['name', 'model'], 'limit': 10})
            
            if webrtc_views:
                print(f"\n📱 Found {len(webrtc_views)} WebRTC-related views:")
                for view in webrtc_views:
                    print(f"  📄 {view['name']} (model: {view.get('model', 'N/A')})")
            else:
                print("\n❌ No WebRTC-related views found")
            
            return len(webrtc_configs) > 0 or len(webrtc_views) > 0
            
        except Exception as e:
            print(f"❌ WebRTC integration check failed: {e}")
            return False
    
    def create_test_rtc_session_with_webrtc(self, channel_id):
        """Create RTC session and test WebRTC capabilities"""
        print(f"\n🎯 CREATING TEST RTC SESSION WITH WEBRTC DATA...")
        print("-" * 60)
        
        try:
            # Get user info
            user_data = self.call_model('res.users', 'read', [self.uid], {
                'fields': ['partner_id', 'name']
            })
            partner_id = user_data[0]['partner_id'][0]
            user_name = user_data[0]['name']
            
            # Get channel member
            members = self.call_model('discuss.channel.member', 'search_read', [
                [['channel_id', '=', channel_id], ['partner_id', '=', partner_id]]
            ], {'fields': ['id']})
            
            if not members:
                print(f"❌ No channel membership found")
                return None
            
            member_id = members[0]['id']
            
            # Create RTC session
            session_data = {
                'channel_id': channel_id,
                'channel_member_id': member_id,
                'partner_id': partner_id,
                'is_camera_on': False,
                'is_muted': False,
                'is_screen_sharing_on': False,
                'is_deaf': False
            }
            
            session_id = self.call_model('discuss.channel.rtc.session', 'create', [session_data])
            print(f"✅ RTC session created: {session_id}")
            
            return session_id
            
        except Exception as e:
            print(f"❌ RTC session creation failed: {e}")
            return None
    
    def run_webrtc_diagnosis(self):
        """Run comprehensive WebRTC diagnosis"""
        print("🔍 COMPREHENSIVE WEBRTC DIAGNOSIS")
        print("="*70)
        print("🎯 Goal: Determine why there's no audio in calls")
        print("🔧 Testing: SDP exchange, ICE candidates, WebRTC integration")
        print("="*70)
        
        if not self.authenticate():
            return False
        
        # Step 1: Check RTC session model structure
        webrtc_fields = self.check_rtc_session_model()
        
        # Step 2: Check Odoo web WebRTC integration
        has_webrtc_integration = self.check_webrtc_web_integration()
        
        # Step 3: Create test RTC session
        session_id = self.create_test_rtc_session_with_webrtc(self.config['target_channel_id'])
        
        if session_id:
            # Step 4: Test SDP storage
            sdp_field = self.test_sdp_storage(session_id)
            
            # Step 5: Test ICE candidate exchange
            ice_exchange_works = self.test_ice_candidate_exchange(self.config['target_channel_id'])
            
            # Step 6: Generate diagnosis report
            self.generate_diagnosis_report(webrtc_fields, has_webrtc_integration, sdp_field, ice_exchange_works)
            
            # Cleanup
            try:
                self.call_model('discuss.channel.rtc.session', 'unlink', [session_id])
                print(f"\n🧹 Test session {session_id} cleaned up")
            except:
                pass
        
        return True
    
    def generate_diagnosis_report(self, webrtc_fields, has_webrtc_integration, sdp_field, ice_exchange_works):
        """Generate comprehensive diagnosis report"""
        print("\n" + "🔍" * 30)
        print("WEBRTC DIAGNOSIS REPORT")
        print("🔍" * 30)
        
        print(f"\n📊 FINDINGS:")
        print(f"  📋 WebRTC fields in RTC model: {'✅' if webrtc_fields else '❌'} ({len(webrtc_fields)} found)")
        print(f"  🌐 Odoo web WebRTC integration: {'✅' if has_webrtc_integration else '❌'}")
        print(f"  📡 SDP storage capability: {'✅' if sdp_field else '❌'}")
        print(f"  🧊 ICE candidate exchange: {'✅' if ice_exchange_works else '❌'}")
        
        print(f"\n🎯 ROOT CAUSE ANALYSIS:")
        
        if not webrtc_fields and not sdp_field:
            print("❌ CRITICAL: No SDP/ICE fields in RTC sessions")
            print("   💡 This explains the audio issue!")
            print("   📝 Odoo RTC sessions are just status tracking")
            print("   🔧 Need to extend the model or use message-based signaling")
        
        if not has_webrtc_integration:
            print("❌ WARNING: Limited WebRTC integration in Odoo web")
            print("   💡 Web interface may not handle WebRTC properly")
            print("   🔧 May need custom WebRTC implementation")
        
        if not ice_exchange_works:
            print("❌ CRITICAL: ICE candidate exchange not working")
            print("   💡 Peer connection establishment will fail")
            print("   🔧 Need reliable signaling mechanism")
        
        print(f"\n🚀 RECOMMENDED SOLUTIONS:")
        
        if sdp_field:
            print(f"✅ Use {sdp_field} field for SDP exchange")
            print(f"✅ Implement real WebRTC in mobile app")
            print(f"✅ Extend Odoo web to handle SDP/ICE from this field")
        else:
            print("🔧 Option 1: Extend discuss.channel.rtc.session model with SDP fields")
            print("🔧 Option 2: Use channel messages for WebRTC signaling")
            print("🔧 Option 3: Implement custom WebRTC signaling endpoint")
        
        if ice_exchange_works:
            print("✅ Use channel messages for ICE candidate exchange")
        else:
            print("🔧 Fix message-based ICE candidate exchange")
        
        print(f"\n🎵 AUDIO SOLUTION PRIORITY:")
        print("1. 🥇 Implement real WebRTC with react-native-webrtc")
        print("2. 🥈 Add SDP offer/answer exchange mechanism")
        print("3. 🥉 Add ICE candidate relay via messages")
        print("4. 🏆 Test peer-to-peer audio connection")
        
        print("\n" + "🔍" * 30)

def main():
    print("🔍 Starting WebRTC Diagnosis for Odoo Audio Issues...")
    print("🎯 This will identify why RTC sessions don't provide audio")
    print("")
    
    tester = WebRTCSignalingTest(CONFIG)
    success = tester.run_webrtc_diagnosis()
    
    if success:
        print("\n🎉 WEBRTC DIAGNOSIS COMPLETED!")
        print("📋 Review the findings above to fix audio issues")
        print("🚀 Implement the recommended solutions for working audio")
    else:
        print("\n❌ Diagnosis failed")
    
    return success

if __name__ == "__main__":
    main()
