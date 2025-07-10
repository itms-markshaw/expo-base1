#!/usr/bin/env python3

"""
Refresh Channel Cache - Clear stale cache and test new user filtering
"""

import xmlrpc.client
import sys
import sqlite3
import os

# Configuration (copied from enhanced-clean-and-call-105.py)
CONFIG = {
    'host': 'itmsgroup.com.au',
    'port': 443,
    'database': 'ITMS_v17_3_backup_2025_02_17_08_15',
    'username': 'mark.shaw@itmsgroup.com.au',
    'api_key': 'ea186501b420d9b656eecf026f04f74a975db27c',
    'protocol': 'https'
}

class CacheRefresher:
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

    def clear_local_cache(self):
        """Clear local SQLite cache"""
        print("\n🧹 CLEARING LOCAL CACHE...")
        print("-" * 50)
        
        # Find the SQLite database file
        db_paths = [
            '/Users/markshaw/Desktop/git/expo-base1/odoo_sync.db',
            './odoo_sync.db',
            '../odoo_sync.db'
        ]
        
        db_path = None
        for path in db_paths:
            if os.path.exists(path):
                db_path = path
                break
        
        if not db_path:
            print("❌ Could not find SQLite database file")
            return False
        
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Check current cache
            cursor.execute("SELECT COUNT(*) FROM discuss_channel")
            count_before = cursor.fetchone()[0]
            print(f"📊 Channels in cache before: {count_before}")
            
            # Clear the cache
            cursor.execute("DELETE FROM discuss_channel")
            conn.commit()
            
            # Verify clearing
            cursor.execute("SELECT COUNT(*) FROM discuss_channel")
            count_after = cursor.fetchone()[0]
            print(f"📊 Channels in cache after: {count_after}")
            
            conn.close()
            
            if count_after == 0:
                print("✅ Cache cleared successfully")
                return True
            else:
                print("❌ Cache clearing failed")
                return False
                
        except Exception as e:
            print(f"❌ Error clearing cache: {e}")
            return False

    def test_server_filtering(self):
        """Test the server-side filtering"""
        print("\n🔍 TESTING SERVER FILTERING...")
        print("-" * 50)
        
        models = xmlrpc.client.ServerProxy(f"{self.url}/xmlrpc/2/object")
        
        try:
            # Test the new filtering approach
            channels = models.execute_kw(
                self.config['database'],
                self.uid,
                self.config['api_key'],
                'discuss.channel',
                'search_read',
                [[
                    ['active', '=', True],
                    ['is_member', '=', True]
                ]],
                {'fields': ['id', 'name', 'channel_type']}
            )
            
            print(f"✅ Server filtering works: {len(channels)} channels")
            for channel in channels:
                print(f"  {channel['id']}: {channel['name']} ({channel['channel_type']})")
            
            return len(channels)
            
        except Exception as e:
            print(f"❌ Server filtering failed: {e}")
            return 0

    def run_refresh(self):
        """Run the complete refresh process"""
        print("🔄 REFRESHING CHANNEL CACHE WITH USER FILTERING")
        print("=" * 60)
        
        if not self.authenticate():
            return False
        
        # Test server filtering first
        expected_count = self.test_server_filtering()
        if expected_count == 0:
            print("❌ Server filtering failed - aborting")
            return False
        
        # Clear local cache
        if not self.clear_local_cache():
            print("❌ Cache clearing failed - aborting")
            return False
        
        print(f"\n✅ CACHE REFRESH COMPLETE")
        print(f"📊 Expected channels after app restart: {expected_count}")
        print(f"📱 Next app launch should show {expected_count} channels instead of 16")
        
        return True

if __name__ == "__main__":
    refresher = CacheRefresher(CONFIG)
    success = refresher.run_refresh()
    sys.exit(0 if success else 1)
