#!/usr/bin/env node

/**
 * Test script for Odoo 18 WebSocket connection
 * Tests the new WebSocket implementation with proper Odoo 18 protocol
 */

const WebSocket = require('ws');

// Configuration
const config = {
  serverUrl: 'wss://itmsgroup.com.au',
  endpoints: [
    '/websocket',
    '/longpolling/websocket', 
    '/bus/websocket',
    '/web/websocket'
  ],
  timeout: 15000
};

/**
 * Test WebSocket connection to a specific endpoint
 */
async function testWebSocketEndpoint(url) {
  return new Promise((resolve) => {
    console.log(`🔌 Testing WebSocket connection to: ${url}`);
    
    const ws = new WebSocket(url);
    const startTime = Date.now();
    let resolved = false;
    
    // Connection timeout
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        ws.terminate();
        resolve({
          url,
          success: false,
          error: 'Connection timeout',
          duration: Date.now() - startTime
        });
      }
    }, config.timeout);
    
    ws.on('open', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        
        console.log(`✅ WebSocket connected successfully to: ${url}`);
        
        // Test Odoo 18 subscription message
        const subscribeMessage = {
          event_name: 'subscribe',
          data: {
            channels: ['mail.message'],
            last: 0
          }
        };
        
        ws.send(JSON.stringify(subscribeMessage));
        console.log(`📤 Sent Odoo 18 subscribe message`);
        
        // Wait a bit for response
        setTimeout(() => {
          ws.close();
          resolve({
            url,
            success: true,
            duration: Date.now() - startTime,
            protocol: 'Odoo 18 WebSocket'
          });
        }, 2000);
      }
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`📨 Received message:`, message);
      } catch (error) {
        console.log(`📨 Received raw data:`, data.toString());
      }
    });
    
    ws.on('error', (error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.log(`❌ WebSocket error for ${url}:`, error.message);
        resolve({
          url,
          success: false,
          error: error.message,
          duration: Date.now() - startTime
        });
      }
    });
    
    ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket closed for ${url}: ${code} - ${reason}`);
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({
          url,
          success: code === 1000,
          error: code !== 1000 ? `Closed with code ${code}: ${reason}` : null,
          duration: Date.now() - startTime
        });
      }
    });
  });
}

/**
 * Test all WebSocket endpoints
 */
async function testAllEndpoints() {
  console.log('🚀 Starting Odoo 18 WebSocket connection tests...\n');
  
  const results = [];
  
  for (const endpoint of config.endpoints) {
    const url = `${config.serverUrl}${endpoint}`;
    const result = await testWebSocketEndpoint(url);
    results.push(result);
    console.log(''); // Add spacing between tests
  }
  
  // Summary
  console.log('📊 Test Results Summary:');
  console.log('========================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful connections: ${successful.length}/${results.length}`);
  console.log(`❌ Failed connections: ${failed.length}/${results.length}\n`);
  
  if (successful.length > 0) {
    console.log('✅ Working endpoints:');
    successful.forEach(result => {
      console.log(`   ${result.url} (${result.duration}ms)`);
    });
    console.log('');
  }
  
  if (failed.length > 0) {
    console.log('❌ Failed endpoints:');
    failed.forEach(result => {
      console.log(`   ${result.url} - ${result.error} (${result.duration}ms)`);
    });
    console.log('');
  }
  
  // Recommendations
  if (successful.length > 0) {
    const fastest = successful.reduce((prev, current) => 
      prev.duration < current.duration ? prev : current
    );
    console.log(`🎯 Recommended endpoint: ${fastest.url}`);
    console.log(`   Connection time: ${fastest.duration}ms`);
    console.log(`   Protocol: Odoo 18 WebSocket`);
  } else {
    console.log('🚫 No working WebSocket endpoints found');
    console.log('   Check your nginx configuration and Odoo server status');
  }
}

/**
 * Test HTTP upgrade headers
 */
async function testHttpUpgrade() {
  console.log('\n🔍 Testing HTTP WebSocket upgrade headers...');
  
  const https = require('https');
  const url = require('url');
  
  const testUrl = `${config.serverUrl}/websocket`;
  const parsedUrl = url.parse(testUrl.replace('wss://', 'https://'));
  
  const options = {
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || 443,
    path: parsedUrl.path,
    method: 'GET',
    headers: {
      'Connection': 'Upgrade',
      'Upgrade': 'websocket',
      'Sec-WebSocket-Version': '13',
      'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ=='
    }
  };
  
  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      console.log(`📡 HTTP Response Status: ${res.statusCode}`);
      console.log(`📡 HTTP Response Headers:`, res.headers);
      
      if (res.statusCode === 101) {
        console.log('✅ HTTP WebSocket upgrade successful');
        resolve(true);
      } else {
        console.log('❌ HTTP WebSocket upgrade failed');
        resolve(false);
      }
    });
    
    req.on('error', (error) => {
      console.log('❌ HTTP request error:', error.message);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log('❌ HTTP request timeout');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Run tests
async function main() {
  console.log('🎯 Odoo 18 WebSocket Connection Test');
  console.log('====================================\n');
  
  // Test HTTP upgrade first
  await testHttpUpgrade();
  
  // Test WebSocket endpoints
  await testAllEndpoints();
  
  console.log('\n🏁 Testing complete!');
}

// Handle command line execution
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testWebSocketEndpoint, testAllEndpoints, testHttpUpgrade };
