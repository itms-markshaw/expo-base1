#!/usr/bin/env python3

"""
Test Channel Filtering Logic
Tests what channels should be visible based on Odoo's actual filtering logic
"""

import xmlrpc.client
import sys
import json
from collections import defaultdict

# Configuration (copied from enhanced-clean-and-call-105.py)
CONFIG = {
    'host': 'itmsgroup.com.au',
    'port': 443,
    'database': 'ITMS_v17_3_backup_2025_02_17_08_15',
    'username': 'mark.shaw@itmsgroup.com.au',
    'api_key': 'ea186501b420d9b656eecf026f04f74a975db27c',
    'protocol': 'https'
}

class ChannelFilterTester:
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

    def get_current_user_info(self):
        """Get current user and partner info"""
        print("\n👤 GETTING CURRENT USER INFO...")
        print("-" * 50)
        
        user_info = self.call_model('res.users', 'read', [self.uid], {
            'fields': ['id', 'name', 'login', 'partner_id']
        })
        
        if user_info:
            user = user_info[0]
            partner_id = user['partner_id'][0] if isinstance(user['partner_id'], list) else user['partner_id']
            
            print(f"User ID: {user['id']}")
            print(f"User Name: {user['name']}")
            print(f"User Login: {user['login']}")
            print(f"Partner ID: {partner_id}")
            
            return partner_id
        return None

    def test_channel_memberships(self, partner_id):
        """Test channel membership filtering"""
        print(f"\n📁 TESTING CHANNEL MEMBERSHIPS FOR PARTNER {partner_id}...")
        print("-" * 50)
        
        # Get all memberships for current user
        memberships = self.call_model('discuss.channel.member', 'search_read',
            [[['partner_id', '=', partner_id]]],
            {'fields': ['id', 'channel_id', 'partner_id', 'fold_state', 'unpin_dt']}
        )
        
        print(f"Found {len(memberships)} channel memberships:")
        
        fold_state_counts = defaultdict(int)
        visible_channels = []
        
        for member in memberships:
            channel_id = member['channel_id'][0] if isinstance(member['channel_id'], list) else member['channel_id']
            fold_state = member['fold_state'] or 'open'  # Default to 'open' if None
            
            fold_state_counts[fold_state] += 1
            
            # Determine if channel should be visible
            is_visible = fold_state != 'closed'
            
            print(f"  Channel {channel_id}: fold_state='{fold_state}' → visible={is_visible}")
            
            if is_visible:
                visible_channels.append(channel_id)
        
        print(f"\nFold state summary:")
        for state, count in fold_state_counts.items():
            print(f"  {state}: {count} channels")
        
        print(f"\nVisible channel IDs: {visible_channels}")
        print(f"Total visible channels: {len(visible_channels)}")
        
        return visible_channels

    def test_channel_details(self, visible_channel_ids):
        """Get details of visible channels"""
        print(f"\n📱 GETTING CHANNEL DETAILS...")
        print("-" * 50)
        
        if not visible_channel_ids:
            print("No visible channels to check")
            return
        
        channels = self.call_model('discuss.channel', 'search_read',
            [[['id', 'in', visible_channel_ids], ['active', '=', True]]],
            {'fields': ['id', 'name', 'channel_type', 'is_member', 'member_count']}
        )
        
        print(f"Found {len(channels)} active channels:")
        
        channel_types = defaultdict(int)
        
        for channel in channels:
            channel_types[channel['channel_type']] += 1
            print(f"  {channel['id']}: {channel['name']} (type: {channel['channel_type']}, members: {channel.get('member_count', 'N/A')})")
        
        print(f"\nChannel type summary:")
        for ch_type, count in channel_types.items():
            print(f"  {ch_type}: {count} channels")
        
        return channels

    def compare_with_is_member_filter(self):
        """Compare with the is_member filter approach"""
        print(f"\n🔄 COMPARING WITH is_member FILTER...")
        print("-" * 50)
        
        channels = self.call_model('discuss.channel', 'search_read',
            [[['is_member', '=', True], ['active', '=', True]]],
            {'fields': ['id', 'name', 'channel_type', 'is_member']}
        )
        
        print(f"is_member filter found {len(channels)} channels:")
        for channel in channels:
            print(f"  {channel['id']}: {channel['name']} (type: {channel['channel_type']})")
        
        return [ch['id'] for ch in channels]

    def run_test(self):
        """Run the complete test"""
        print("🧪 TESTING CHANNEL FILTERING LOGIC")
        print("=" * 60)
        
        if not self.authenticate():
            return False
        
        # Get current user info
        partner_id = self.get_current_user_info()
        if not partner_id:
            print("❌ Could not get partner ID")
            return False
        
        # Test membership-based filtering
        visible_from_memberships = self.test_channel_memberships(partner_id)
        
        # Get channel details
        membership_channels = self.test_channel_details(visible_from_memberships)
        
        # Compare with is_member filter
        is_member_channel_ids = self.compare_with_is_member_filter()
        
        # Summary comparison
        print(f"\n📊 SUMMARY COMPARISON")
        print("-" * 50)
        print(f"Membership-based filtering: {len(visible_from_memberships)} channels")
        print(f"is_member filter: {len(is_member_channel_ids)} channels")
        
        # Find differences
        membership_set = set(visible_from_memberships)
        is_member_set = set(is_member_channel_ids)
        
        only_in_membership = membership_set - is_member_set
        only_in_is_member = is_member_set - membership_set
        
        if only_in_membership:
            print(f"Only in membership filter: {list(only_in_membership)}")
        if only_in_is_member:
            print(f"Only in is_member filter: {list(only_in_is_member)}")
        
        if membership_set == is_member_set:
            print("✅ Both filters return the same channels")
        else:
            print("⚠️ Filters return different results")
        
        return True

if __name__ == "__main__":
    tester = ChannelFilterTester(CONFIG)
    success = tester.run_test()
    sys.exit(0 if success else 1)
