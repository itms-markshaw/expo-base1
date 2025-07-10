#!/usr/bin/env python3

"""
Test Cache Cleanup - Verify the new cache cleanup logic is working
"""

import sqlite3
import os

def check_cache_state():
    """Check the current state of the SQLite cache"""
    print("🔍 CHECKING CACHE STATE")
    print("=" * 50)
    
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
    
    print(f"📁 Database found: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check discuss_channel table
        print("\n📋 DISCUSS_CHANNEL TABLE:")
        cursor.execute("SELECT COUNT(*) FROM discuss_channel")
        channel_count = cursor.fetchone()[0]
        print(f"  Total channels: {channel_count}")
        
        if channel_count > 0:
            cursor.execute("SELECT id, name, channel_type FROM discuss_channel ORDER BY id")
            channels = cursor.fetchall()
            print("  Channels:")
            for channel_id, name, channel_type in channels:
                print(f"    {channel_id}: {name} ({channel_type})")
        
        # Check discuss_channel_member table
        print("\n👥 DISCUSS_CHANNEL_MEMBER TABLE:")
        cursor.execute("SELECT COUNT(*) FROM discuss_channel_member")
        member_count = cursor.fetchone()[0]
        print(f"  Total members: {member_count}")
        
        if member_count > 0:
            cursor.execute("""
                SELECT m.id, m.channel_id, m.partner_id, m.fold_state, c.name 
                FROM discuss_channel_member m 
                LEFT JOIN discuss_channel c ON m.channel_id = c.id 
                ORDER BY m.channel_id
            """)
            members = cursor.fetchall()
            print("  Members:")
            for member_id, channel_id, partner_id, fold_state, channel_name in members:
                print(f"    {member_id}: Channel {channel_id} ({channel_name}), Partner {partner_id}, Fold: {fold_state}")
        
        # Check for stale data (channels without members)
        print("\n🧹 STALE DATA CHECK:")
        cursor.execute("""
            SELECT c.id, c.name 
            FROM discuss_channel c 
            LEFT JOIN discuss_channel_member m ON c.id = m.channel_id 
            WHERE m.channel_id IS NULL
        """)
        stale_channels = cursor.fetchall()
        
        if stale_channels:
            print(f"  ⚠️ Found {len(stale_channels)} channels without members (potentially stale):")
            for channel_id, name in stale_channels:
                print(f"    {channel_id}: {name}")
        else:
            print("  ✅ No stale channels found")
        
        conn.close()
        
        # Summary
        print(f"\n📊 SUMMARY:")
        print(f"  Channels: {channel_count}")
        print(f"  Members: {member_count}")
        print(f"  Stale channels: {len(stale_channels)}")
        
        # Expected state after cleanup
        print(f"\n🎯 EXPECTED STATE (after cleanup):")
        print(f"  Should have ~10-11 channels (user-specific)")
        print(f"  Should have ~10-11 members (one per channel)")
        print(f"  Should have 0 stale channels")
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking cache: {e}")
        return False

if __name__ == "__main__":
    check_cache_state()
