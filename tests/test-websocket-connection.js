#!/usr/bin/env node

/**
 * WebSocket Connection Test
 * Quick test to see if WebSocket connects to your Odoo server
 */

console.log('🧪 Testing WebSocket connection to Odoo...\n');

// Test WebSocket connection directly
const WebSocket = require('ws');

const serverURL = 'wss://itmsgroup.com.au/websocket';

console.log(`🔌 Attempting to connect to: ${serverURL}`);

const ws = new WebSocket(serverURL);

ws.on('open', function open() {
  console.log('✅ WebSocket connected successfully!');
  console.log('🎉 Your Odoo server supports WebSocket connections');
  
  // Try to send a test message
  const testMessage = {
    event_name: 'subscribe',
    data: {
      channels: [],
      last: 0
    }
  };
  
  console.log('📤 Sending test subscription message...');
  ws.send(JSON.stringify(testMessage));
  
  // Close after 5 seconds
  setTimeout(() => {
    console.log('🔌 Closing test connection...');
    ws.close();
  }, 5000);
});

ws.on('message', function message(data) {
  console.log('📨 Received message from Odoo WebSocket:');
  console.log(data.toString());
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket connection failed:');
  console.error(err.message);
  
  if (err.message.includes('ENOTFOUND')) {
    console.log('\n🔍 Possible issues:');
    console.log('- Domain name not resolving');
    console.log('- Server is down');
  } else if (err.message.includes('ECONNREFUSED')) {
    console.log('\n🔍 Possible issues:');
    console.log('- WebSocket not enabled on Odoo server');
    console.log('- Firewall blocking connection');
    console.log('- Wrong port (should be 443 for wss://)');
  } else if (err.message.includes('certificate')) {
    console.log('\n🔍 SSL Certificate issue:');
    console.log('- Self-signed certificate');
    console.log('- Certificate expired');
  }
});

ws.on('close', function close(code, reason) {
  console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
  
  if (code === 1000) {
    console.log('✅ Clean close - test completed successfully');
  } else if (code === 1006) {
    console.log('❌ Abnormal close - connection failed');
  } else {
    console.log(`ℹ️ Close code ${code} - check Odoo WebSocket documentation`);
  }
  
  process.exit(0);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('⏰ Connection timeout - WebSocket not responding');
  console.log('\n🔍 This suggests:');
  console.log('- WebSocket endpoint not available');
  console.log('- Server not configured for WebSocket');
  console.log('- Network connectivity issues');
  
  ws.close();
  process.exit(1);
}, 10000);
