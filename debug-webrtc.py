#!/usr/bin/env python3

"""
WebRTC Call Debug Script
Tests Odoo WebRTC call functionality from command line
"""

import xmlrpc.client
import json
import requests
import sys

# Configuration - Update these with your actual values
CONFIG = {
    'host': 'itmsgroup.com.au',
    'port': 443,
    'database': 'ITMS_v17_3_backup_2025_02_17_08_15',
    'username': 'mark.shaw@itmsgroup.com.au',
    'password': 'hTempTWxeCFYWVswzMcv',  # UPDATE THIS
    'api_key': 'ea186501b420d9b656eecf026f04f74a975db27c',  # API Key from your config
    'protocol': 'https'
}

class OdooWebRTCTester:
    def __init__(self, config):
        self.config = config
        self.uid = None
        self.url = f"{config['protocol']}://{config['host']}:{config['port']}"
        
    def authenticate(self):
        """Authenticate with Odoo"""
        print("🔐 Authenticating...")

        common = xmlrpc.client.ServerProxy(f"{self.url}/xmlrpc/2/common")

        # Try password authentication first
        try:
            print("🔑 Trying password authentication...")
            self.uid = common.authenticate(
                self.config['database'],
                self.config['username'],
                self.config['password'],
                {}
            )
            if self.uid:
                print(f"✅ Authenticated with password as user ID: {self.uid}")
                return True
        except Exception as e:
            print(f"❌ Password authentication error: {e}")

        # Try API key authentication
        try:
            print("🔑 Trying API key authentication...")
            self.uid = common.authenticate(
                self.config['database'],
                self.config['username'],
                self.config['api_key'],
                {}
            )
            if self.uid:
                print(f"✅ Authenticated with API key as user ID: {self.uid}")
                # Update password to API key for subsequent calls
                self.config['password'] = self.config['api_key']
                return True
        except Exception as e:
            print(f"❌ API key authentication error: {e}")

        print("❌ All authentication methods failed")
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
    
    def test_rtc_session_model(self):
        """Test 1: Check if discuss.channel.rtc.session model exists"""
        print("\n🔍 Test 1: Checking RTC Session Model...")
        try:
            fields = self.call_model('discuss.channel.rtc.session', 'fields_get')
            print("✅ discuss.channel.rtc.session model exists")
            print(f"📋 Available fields: {', '.join(list(fields.keys())[:10])}")
            return True
        except Exception as e:
            print(f"❌ discuss.channel.rtc.session model not found: {e}")
            return False
    
    def test_channel_methods(self):
        """Test 2: Check discuss.channel methods"""
        print("\n🔍 Test 2: Checking Channel Methods...")
        try:
            # Get a test channel
            channels = self.call_model('discuss.channel', 'search_read', [[]], {
                'fields': ['id', 'name', 'channel_type'],
                'limit': 1
            })
            
            if not channels:
                print("❌ No channels found")
                return False
            
            channel = channels[0]
            print(f"✅ Found test channel: {channel['name']} (ID: {channel['id']})")
            
            # Test different methods
            methods_to_test = [
                'rtc_join_call',
                'rtc_leave_call',
                'mobile_start_webrtc_call',
                'mobile_answer_webrtc_call'
            ]
            
            method_results = {}
            for method in methods_to_test:
                try:
                    # Just test if method exists (will fail but tell us if method exists)
                    self.call_model('discuss.channel', method, [channel['id']])
                    method_results[method] = True
                    print(f"✅ Method {method} exists")
                except Exception as e:
                    if 'does not exist' in str(e):
                        method_results[method] = False
                        print(f"❌ Method {method} does not exist")
                    else:
                        method_results[method] = True
                        print(f"✅ Method {method} exists (failed with: {str(e)[:50]}...)")
            
            return any(method_results.values())
            
        except Exception as e:
            print(f"❌ Channel methods test failed: {e}")
            return False
    
    def test_create_rtc_session(self):
        """Test 3: Try to create RTC session"""
        print("\n🔍 Test 3: Creating RTC Session...")
        try:
            # Get current user info
            users = self.call_model('res.users', 'read', [self.uid], {
                'fields': ['partner_id']
            })
            partner_id = users[0]['partner_id'][0]
            
            # Get a test channel
            channels = self.call_model('discuss.channel', 'search', [[]], {'limit': 1})
            if not channels:
                print("❌ No channels available for testing")
                return False
            
            channel_id = channels[0]
            
            # Try to create RTC session
            session_data = {
                'channel_id': channel_id,
                'partner_id': partner_id,
                'is_camera_on': False,
                'is_muted': False,
                'is_screen_sharing_on': False
            }
            
            session_id = self.call_model('discuss.channel.rtc.session', 'create', [session_data])
            print(f"✅ RTC session created with ID: {session_id}")
            
            # Clean up - delete the session
            self.call_model('discuss.channel.rtc.session', 'unlink', [session_id])
            print("✅ RTC session cleaned up")
            
            return True
            
        except Exception as e:
            print(f"❌ RTC session creation failed: {e}")
            return False
    
    def test_old_rtc_model(self):
        """Test 4: Check mail.rtc.session (older model)"""
        print("\n🔍 Test 4: Checking Old RTC Model...")
        try:
            fields = self.call_model('mail.rtc.session', 'fields_get')
            print("✅ mail.rtc.session model exists (older Odoo version)")
            return True
        except Exception as e:
            print(f"❌ mail.rtc.session model not found: {e}")
            return False
    
    def test_webrtc_endpoints(self):
        """Test 5: Test WebRTC HTTP endpoints"""
        print("\n🔍 Test 5: Testing WebRTC HTTP Endpoints...")
        
        endpoints = [
            '/mail/rtc/channel/join_call',
            '/mail/rtc/session/notify_call_members',
            '/mail/rtc/session/update_and_broadcast',
            '/mail/rtc/channel/leave_call'
        ]
        
        for endpoint in endpoints:
            try:
                response = requests.post(
                    f"{self.url}{endpoint}",
                    json={"jsonrpc": "2.0", "method": "call", "params": {}, "id": 1},
                    headers={"Content-Type": "application/json"},
                    timeout=5
                )
                
                if response.status_code == 200:
                    print(f"✅ Endpoint {endpoint} accessible")
                else:
                    print(f"❌ Endpoint {endpoint} returned {response.status_code}")
                    
            except Exception as e:
                print(f"❌ Endpoint {endpoint} error: {e}")
    
    def run_tests(self):
        """Run all tests"""
        print("🚀 Starting Odoo WebRTC Debug Tests...")
        print(f"📡 Connecting to: {self.url}")
        print(f"🗄️  Database: {self.config['database']}")
        print(f"👤 User: {self.config['username']}")
        
        if not self.authenticate():
            return
        
        # Run tests
        results = {
            'rtc_session_model': self.test_rtc_session_model(),
            'channel_methods': self.test_channel_methods(),
            'create_rtc_session': self.test_create_rtc_session(),
            'old_rtc_model': self.test_old_rtc_model()
        }
        
        self.test_webrtc_endpoints()
        
        # Summary
        print("\n📊 Test Results Summary:")
        print("========================")
        for test, passed in results.items():
            status = "✅ PASSED" if passed else "❌ FAILED"
            print(f"{status} {test}")
        
        passed_tests = sum(results.values())
        total_tests = len(results)
        print(f"\n🎯 Overall: {passed_tests}/{total_tests} tests passed")

def main():
    if CONFIG['password'] == 'your_password_here':
        print("❌ Please update the password in the CONFIG dictionary")
        sys.exit(1)
    
    tester = OdooWebRTCTester(CONFIG)
    tester.run_tests()

if __name__ == "__main__":
    main()
