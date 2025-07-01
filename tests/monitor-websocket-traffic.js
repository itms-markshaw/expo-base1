#!/usr/bin/env node

/**
 * WebSocket Traffic Monitor
 * Monitor all WebSocket traffic to debug real-time chat issues
 */

const WebSocket = require('ws');

console.log('🔍 WebSocket Traffic Monitor - Debugging Real-time Chat Issues\n');

const serverURL = 'wss://itmsgroup.com.au/websocket';

console.log(`🔌 Connecting to: ${serverURL}`);
console.log('📊 This will show ALL WebSocket traffic...\n');

const ws = new WebSocket(serverURL, {
  headers: {
    'Origin': 'https://itmsgroup.com.au',
    'User-Agent': 'WebSocketMonitor/1.0 (Debug Tool)'
  }
});

let messageCount = 0;
let connected = false;

ws.on('open', function open() {
  connected = true;
  console.log('✅ WebSocket connected successfully!');
  console.log('📡 Monitoring traffic... (Press Ctrl+C to stop)\n');
  
  // Send a test subscription to see what happens
  const testSubscription = {
    event_name: 'subscribe',
    data: {
      channels: ['discuss.channel_52'], // Use your channel ID
      last: 0
    }
  };
  
  console.log('📤 OUTGOING: Sending test subscription...');
  console.log(JSON.stringify(testSubscription, null, 2));
  ws.send(JSON.stringify(testSubscription));
  
  // Also try subscribing to all common channels
  setTimeout(() => {
    const broadSubscription = {
      event_name: 'subscribe', 
      data: {
        channels: [
          'discuss.channel_52',
          'discuss.channel_51', 
          'discuss.channel_50',
          'res.partner_844',  // Your partner ID
          'res.partner_2139', // Other user's partner ID
          'bus.presence',
          'mail.activity'
        ],
        last: 0
      }
    };
    
    console.log('\n📤 OUTGOING: Sending broader subscription...');
    console.log(JSON.stringify(broadSubscription, null, 2));
    ws.send(JSON.stringify(broadSubscription));
  }, 2000);
});

ws.on('message', function message(data) {
  messageCount++;
  const timestamp = new Date().toISOString();
  
  console.log(`\n📨 INCOMING MESSAGE #${messageCount} [${timestamp}]`);
  console.log('Raw data length:', data.length, 'bytes');
  
  try {
    const parsed = JSON.parse(data.toString());
    console.log('📋 Parsed content:');
    console.log(JSON.stringify(parsed, null, 2));
    
    // Analyze the message type
    if (Array.isArray(parsed)) {
      console.log(`📊 Analysis: Array of ${parsed.length} notifications`);
      parsed.forEach((notification, index) => {
        console.log(`  Notification ${index + 1}:`);
        console.log(`    - ID: ${notification.id}`);
        console.log(`    - Type: ${notification.type || 'unknown'}`);
        console.log(`    - Payload keys: ${Object.keys(notification.payload || {}).join(', ')}`);
      });
    } else {
      console.log('📊 Analysis: Single object message');
      console.log(`    - Keys: ${Object.keys(parsed).join(', ')}`);
    }
    
  } catch (error) {
    console.log('❌ Failed to parse as JSON:', error.message);
    console.log('📄 Raw content:', data.toString());
  }
  
  console.log('─'.repeat(60));
});

ws.on('error', function error(err) {
  console.error('\n❌ WebSocket error:', err.message);
  
  if (err.message.includes('401') || err.message.includes('403')) {
    console.log('🔐 Authentication issue - WebSocket rejected connection');
  } else if (err.message.includes('404')) {
    console.log('🔍 Endpoint not found - WebSocket not available');
  } else {
    console.log('🔧 Network or server issue');
  }
});

ws.on('close', function close(code, reason) {
  console.log(`\n🔌 WebSocket closed: ${code} - ${reason}`);
  console.log(`📊 Total messages received: ${messageCount}`);
  
  if (code === 1000) {
    console.log('✅ Clean close');
  } else if (code === 1006) {
    console.log('❌ Abnormal close - connection issue');
  } else {
    console.log(`ℹ️ Close code ${code} - check WebSocket documentation`);
  }
  
  if (messageCount === 0 && connected) {
    console.log('\n🔍 DIAGNOSIS: WebSocket connected but received NO messages');
    console.log('This suggests:');
    console.log('- WebSocket is not receiving notifications for your channels');
    console.log('- Subscription format might be incorrect');
    console.log('- Odoo is not broadcasting to WebSocket clients');
    console.log('- Channel IDs might be wrong');
  } else if (messageCount > 0) {
    console.log('\n✅ DIAGNOSIS: WebSocket is working - received', messageCount, 'messages');
    console.log('Check the message content above to see if they contain chat data');
  }
  
  process.exit(0);
});

// Test for 30 seconds then close
setTimeout(() => {
  console.log('\n⏰ 30-second test completed');
  
  if (messageCount === 0) {
    console.log('\n❌ NO MESSAGES RECEIVED');
    console.log('🔍 Possible issues:');
    console.log('1. WebSocket endpoint exists but not configured for real-time updates');
    console.log('2. Subscription format is incorrect');
    console.log('3. Channel IDs are wrong');
    console.log('4. Odoo WebSocket module not properly enabled');
    console.log('5. Your user does not have permission to receive notifications');
    
    console.log('\n💡 Recommendations:');
    console.log('1. Check if WebSocket works in Odoo web interface');
    console.log('2. Verify channel IDs are correct');
    console.log('3. Test with different subscription formats');
    console.log('4. Check Odoo logs for WebSocket errors');
  } else {
    console.log('\n✅ WebSocket is receiving data');
    console.log('Check the message content above for chat notifications');
  }
  
  ws.close();
}, 30000);

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n⏹️ Monitor stopped by user');
  console.log(`📊 Total messages received: ${messageCount}`);
  ws.close();
  process.exit(0);
});
