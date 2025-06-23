#!/usr/bin/env node

/**
 * Test Odoo WebSocket with authentication
 * Tests WebSocket connection with proper session/auth headers
 */

const WebSocket = require('ws');
const https = require('https');

// Configuration
const config = {
  serverUrl: 'https://itmsgroup.com.au',
  wsUrl: 'wss://itmsgroup.com.au',
  database: 'itmsgroup_com_au',
  username: 'mark@itmsgroup.com.au', // Replace with your username
  password: 'your_password', // Replace with your password
  endpoints: [
    '/websocket',
    '/longpolling/websocket',
    '/bus/websocket', 
    '/web/websocket',
    '/longpolling/poll',
    '/bus/poll'
  ]
};

/**
 * Get session ID by authenticating with Odoo
 */
async function authenticateWithOdoo() {
  console.log('🔐 Authenticating with Odoo...');
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'common',
        method: 'authenticate',
        args: [config.database, config.username, config.password, {}]
      },
      id: 1
    });

    const options = {
      hostname: 'itmsgroup.com.au',
      port: 443,
      path: '/web/session/authenticate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          const sessionId = res.headers['set-cookie']?.find(cookie => 
            cookie.startsWith('session_id=')
          )?.split(';')[0]?.split('=')[1];
          
          if (sessionId) {
            console.log('✅ Authentication successful');
            console.log('🍪 Session ID:', sessionId);
            resolve({ sessionId, cookies: res.headers['set-cookie'] });
          } else {
            console.log('❌ No session ID in response');
            resolve(null);
          }
        } catch (error) {
          console.log('❌ Error parsing auth response:', error.message);
          resolve(null);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Authentication error:', error.message);
      resolve(null);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Test WebSocket with authentication
 */
async function testAuthenticatedWebSocket(endpoint, sessionData) {
  return new Promise((resolve) => {
    const url = `${config.wsUrl}${endpoint}`;
    console.log(`🔌 Testing authenticated WebSocket: ${url}`);
    
    const headers = {};
    if (sessionData?.cookies) {
      headers.Cookie = sessionData.cookies.join('; ');
    }
    
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
    }, 10000);
    
    ws.on('open', () => {
      console.log(`✅ WebSocket connected: ${url}`);
      
      // Try different message formats
      const messages = [
        // Odoo 18 format
        {
          event_name: 'subscribe',
          data: {
            channels: ['mail.message'],
            last: 0
          }
        },
        // Legacy format
        {
          type: 'subscribe',
          channels: ['mail.message']
        },
        // Bus format
        {
          event_name: 'bus_subscribe',
          data: {
            channels: ['bus.bus']
          }
        }
      ];
      
      messages.forEach((msg, index) => {
        setTimeout(() => {
          try {
            ws.send(JSON.stringify(msg));
            console.log(`📤 Sent message ${index + 1}:`, msg);
          } catch (error) {
            console.log(`❌ Error sending message ${index + 1}:`, error.message);
          }
        }, index * 1000);
      });
      
      // Close after testing
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          ws.close();
          resolve({
            endpoint,
            success: true,
            duration: Date.now() - startTime
          });
        }
      }, 5000);
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`📨 Received:`, message);
      } catch (error) {
        console.log(`📨 Raw data:`, data.toString());
      }
    });
    
    ws.on('error', (error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        console.log(`❌ WebSocket error: ${error.message}`);
        resolve({
          endpoint,
          success: false,
          error: error.message,
          duration: Date.now() - startTime
        });
      }
    });
    
    ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({
          endpoint,
          success: code === 1000,
          error: code !== 1000 ? `Closed with code ${code}` : null,
          duration: Date.now() - startTime
        });
      }
    });
  });
}

/**
 * Check what endpoints are available
 */
async function checkAvailableEndpoints() {
  console.log('🔍 Checking available endpoints...');
  
  const testEndpoints = [
    '/web/webclient/version_info',
    '/web/session/get_session_info', 
    '/longpolling/poll',
    '/bus/poll',
    '/websocket',
    '/web/websocket'
  ];
  
  for (const endpoint of testEndpoints) {
    const url = `${config.serverUrl}${endpoint}`;
    
    try {
      const response = await new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
          resolve({
            endpoint,
            status: res.statusCode,
            headers: res.headers
          });
        });
        
        req.on('error', (error) => {
          resolve({
            endpoint,
            status: 'error',
            error: error.message
          });
        });
        
        req.setTimeout(5000, () => {
          req.destroy();
          resolve({
            endpoint,
            status: 'timeout'
          });
        });
      });
      
      console.log(`${response.status === 200 ? '✅' : '❌'} ${endpoint}: ${response.status}`);
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.message}`);
    }
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('🎯 Odoo WebSocket Authentication Test');
  console.log('=====================================\n');
  
  // Check available endpoints
  await checkAvailableEndpoints();
  console.log('');
  
  // Try to authenticate
  const sessionData = await authenticateWithOdoo();
  
  if (!sessionData) {
    console.log('❌ Authentication failed - testing without auth');
  }
  
  console.log('\n🚀 Testing WebSocket endpoints...\n');
  
  const results = [];
  for (const endpoint of config.endpoints) {
    const result = await testAuthenticatedWebSocket(endpoint, sessionData);
    results.push(result);
    console.log(''); // Spacing
  }
  
  // Summary
  console.log('📊 Results Summary:');
  console.log('==================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Working: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}\n`);
  
  if (successful.length > 0) {
    console.log('✅ Working endpoints:');
    successful.forEach(r => console.log(`   ${r.endpoint}`));
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed endpoints:');
    failed.forEach(r => console.log(`   ${r.endpoint} - ${r.error}`));
  }
  
  console.log('\n🏁 Test complete!');
}

if (require.main === module) {
  main().catch(console.error);
}
