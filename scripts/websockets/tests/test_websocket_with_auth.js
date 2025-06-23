#!/usr/bin/env node

/**
 * Test WebSocket with proper authentication
 * Uses OAuth2 token or session authentication
 */

const WebSocket = require('ws');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  serverUrl: 'https://itmsgroup.com.au',
  wsUrl: 'wss://itmsgroup.com.au',
  database: 'ITMS_v17_3_backup_2025_02_17_08_15'
  username: 'mark.shaw@itmsgroup.com.au', // Replace with your username
  password: 'hTempTWxeCFYWVswzMcv', // Replace with your password
};

/**
 * Load authentication data from app storage simulation
 */
function loadAuthData() {
  try {
    // Try to load from a test auth file (you can create this manually)
    const authFile = path.join(__dirname, 'test_auth.json');
    if (fs.existsSync(authFile)) {
      const authData = JSON.parse(fs.readFileSync(authFile, 'utf8'));
      console.log('📱 Loaded auth data from test file');
      return authData;
    }
    
    // Fallback to manual auth data (replace with your actual tokens)
    return {
      access_token: 'your_access_token_here',
      sessionId: 'your_session_id_here',
      userId: 'your_user_id_here',
      database: config.database
    };
  } catch (error) {
    console.log('❌ Error loading auth data:', error.message);
    return null;
  }
}

/**
 * Test WebSocket with Bearer token authentication
 */
async function testWebSocketWithBearer(endpoint, authData) {
  return new Promise((resolve) => {
    const url = `${config.wsUrl}${endpoint}`;
    console.log(`🔌 Testing WebSocket with Bearer auth: ${url}`);
    
    const headers = {};
    
    if (authData.access_token) {
      headers.Authorization = `Bearer ${authData.access_token}`;
    }
    
    if (authData.sessionId) {
      headers.Cookie = `session_id=${authData.sessionId}`;
    }
    
    console.log('🔑 Using headers:', Object.keys(headers));
    
    const ws = new WebSocket(url, { headers });
    const startTime = Date.now();
    let resolved = false;
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        ws.terminate();
        resolve({
          endpoint,
          success: false,
          error: 'Connection timeout',
          duration: Date.now() - startTime
        });
      }
    }, 15000);
    
    ws.on('open', () => {
      console.log(`✅ WebSocket connected with auth: ${url}`);
      
      // Send Odoo 18 subscription message
      const subscribeMessage = {
        event_name: 'subscribe',
        data: {
          channels: ['mail.message', 'bus.bus'],
          last: 0,
          options: {
            uid: authData.userId,
            db: authData.database
          }
        }
      };
      
      try {
        ws.send(JSON.stringify(subscribeMessage));
        console.log('📤 Sent subscription message:', subscribeMessage);
      } catch (error) {
        console.log('❌ Error sending subscription:', error.message);
      }
      
      // Wait for response then close
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          ws.close();
          resolve({
            endpoint,
            success: true,
            duration: Date.now() - startTime,
            authenticated: true
          });
        }
      }, 5000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`📨 Received authenticated message:`, message);
      } catch (error) {
        console.log(`📨 Raw authenticated data:`, data.toString());
      }
    });
    
    ws.on('error', (error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.log(`❌ Authenticated WebSocket error: ${error.message}`);
        resolve({
          endpoint,
          success: false,
          error: error.message,
          duration: Date.now() - startTime,
          authenticated: true
        });
      }
    });
    
    ws.on('close', (code, reason) => {
      console.log(`🔌 Authenticated WebSocket closed: ${code} - ${reason}`);
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({
          endpoint,
          success: code === 1000,
          error: code !== 1000 ? `Closed with code ${code}` : null,
          duration: Date.now() - startTime,
          authenticated: true
        });
      }
    });
  });
}

/**
 * Test HTTP endpoints with authentication
 */
async function testHttpEndpointsWithAuth(authData) {
  console.log('🔍 Testing HTTP endpoints with authentication...');
  
  const endpoints = [
    '/longpolling/poll',
    '/bus/poll',
    '/web/webclient/version_info'
  ];
  
  for (const endpoint of endpoints) {
    const url = `${config.serverUrl}${endpoint}`;
    
    try {
      const result = await new Promise((resolve) => {
        const options = {
          hostname: 'itmsgroup.com.au',
          port: 443,
          path: endpoint,
          method: 'GET',
          headers: {}
        };
        
        if (authData.access_token) {
          options.headers.Authorization = `Bearer ${authData.access_token}`;
        }
        
        if (authData.sessionId) {
          options.headers.Cookie = `session_id=${authData.sessionId}`;
        }
        
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            resolve({
              endpoint,
              status: res.statusCode,
              headers: res.headers,
              data: data.substring(0, 200) // First 200 chars
            });
          });
        });
        
        req.on('error', (error) => {
          resolve({
            endpoint,
            status: 'error',
            error: error.message
          });
        });
        
        req.setTimeout(10000, () => {
          req.destroy();
          resolve({
            endpoint,
            status: 'timeout'
          });
        });
        
        req.end();
      });
      
      const status = result.status === 200 ? '✅' : '❌';
      console.log(`   ${status} ${endpoint}: ${result.status}`);
      
      if (result.data && result.status === 200) {
        console.log(`      📄 Response preview: ${result.data.substring(0, 100)}...`);
      }
      
    } catch (error) {
      console.log(`   ❌ ${endpoint}: ${error.message}`);
    }
  }
}

/**
 * Test longpolling with authentication
 */
async function testLongpollingWithAuth(authData) {
  console.log('\n🔍 Testing longpolling with authentication...');
  
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      channels: ['bus.bus', 'mail.message'],
      last: 0,
      options: {
        uid: authData.userId,
        db: authData.database
      }
    });
    
    const options = {
      hostname: 'itmsgroup.com.au',
      port: 443,
      path: '/longpolling/poll',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    if (authData.access_token) {
      options.headers.Authorization = `Bearer ${authData.access_token}`;
    }
    
    if (authData.sessionId) {
      options.headers.Cookie = `session_id=${authData.sessionId}`;
    }
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('✅ Longpolling with auth successful');
          console.log('📨 Response:', response);
          resolve(true);
        } catch (error) {
          console.log('❌ Longpolling response parse error:', error.message);
          console.log('📄 Raw response:', data.substring(0, 200));
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Longpolling request error:', error.message);
      resolve(false);
    });
    
    req.setTimeout(10000, () => {
      console.log('❌ Longpolling timeout');
      req.destroy();
      resolve(false);
    });
    
    req.write(postData);
    req.end();
  });
}

/**
 * Main test function
 */
async function main() {
  console.log('🎯 WebSocket Authentication Test');
  console.log('================================\n');
  
  // Load authentication data
  const authData = loadAuthData();
  if (!authData) {
    console.log('❌ No authentication data available');
    console.log('\n💡 To test with authentication:');
    console.log('1. Create scripts/test_auth.json with your tokens');
    console.log('2. Or update the loadAuthData() function with your credentials');
    return;
  }
  
  console.log('🔑 Using authentication data:');
  console.log(`   User ID: ${authData.userId || 'Not set'}`);
  console.log(`   Database: ${authData.database || 'Not set'}`);
  console.log(`   Has Access Token: ${!!authData.access_token}`);
  console.log(`   Has Session ID: ${!!authData.sessionId}\n`);
  
  // Test HTTP endpoints with auth
  await testHttpEndpointsWithAuth(authData);
  
  // Test longpolling with auth
  await testLongpollingWithAuth(authData);
  
  // Test WebSocket endpoints with auth
  console.log('\n🚀 Testing WebSocket endpoints with authentication...\n');
  
  const wsEndpoints = [
    '/websocket',
    '/longpolling/websocket',
    '/bus/websocket',
    '/web/websocket'
  ];
  
  const results = [];
  for (const endpoint of wsEndpoints) {
    const result = await testWebSocketWithBearer(endpoint, authData);
    results.push(result);
    console.log(''); // Spacing
  }
  
  // Summary
  console.log('📊 WebSocket Results Summary:');
  console.log('============================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Working: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}\n`);
  
  if (successful.length > 0) {
    console.log('✅ Working authenticated endpoints:');
    successful.forEach(r => console.log(`   ${r.endpoint} (${r.duration}ms)`));
    
    const fastest = successful.reduce((prev, current) => 
      prev.duration < current.duration ? prev : current
    );
    console.log(`\n🎯 Recommended: ${fastest.endpoint} (${fastest.duration}ms)`);
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed authenticated endpoints:');
    failed.forEach(r => console.log(`   ${r.endpoint} - ${r.error}`));
  }
  
  console.log('\n🏁 Authentication test complete!');
}

if (require.main === module) {
  main().catch(console.error);
}
