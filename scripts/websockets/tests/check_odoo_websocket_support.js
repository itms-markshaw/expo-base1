#!/usr/bin/env node

/**
 * Check Odoo WebSocket Support
 * Verifies if Odoo has WebSocket/bus modules installed and configured
 */

const https = require('https');

const config = {
  serverUrl: 'https://itmsgroup.com.au',
  database: 'itmsgroup_com_au'
};

/**
 * Make authenticated API call to Odoo
 */
async function makeOdooApiCall(endpoint, data = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: data,
      id: Math.floor(Math.random() * 1000)
    });

    const options = {
      hostname: 'itmsgroup.com.au',
      port: 443,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Check Odoo version and modules
 */
async function checkOdooVersion() {
  console.log('🔍 Checking Odoo version and configuration...');
  
  try {
    // Check version info
    const versionResponse = await makeOdooApiCall('/web/webclient/version_info');
    
    if (versionResponse.result) {
      const version = versionResponse.result;
      console.log(`✅ Odoo Version: ${version.server_version}`);
      console.log(`📦 Server Serie: ${version.server_serie}`);
      console.log(`🏗️ Protocol Version: ${version.protocol_version}`);
      
      // Check if it's Odoo 18
      const majorVersion = parseInt(version.server_serie);
      if (majorVersion >= 18) {
        console.log('✅ Odoo 18+ detected - WebSocket support should be available');
      } else {
        console.log('⚠️ Odoo version < 18 - WebSocket support may be limited');
      }
      
      return version;
    } else {
      console.log('❌ Could not get version info');
      return null;
    }
  } catch (error) {
    console.log('❌ Error checking version:', error.message);
    return null;
  }
}

/**
 * Check installed modules
 */
async function checkInstalledModules() {
  console.log('\n🔍 Checking installed modules...');
  
  try {
    // Check for bus and WebSocket related modules
    const modulesToCheck = [
      'bus',
      'web',
      'mail',
      'discuss',
      'im_livechat',
      'website_livechat'
    ];
    
    console.log('📦 Looking for WebSocket-related modules:');
    
    for (const moduleName of modulesToCheck) {
      try {
        const moduleResponse = await makeOdooApiCall('/web/dataset/call_kw', {
          model: 'ir.module.module',
          method: 'search_read',
          args: [[['name', '=', moduleName]]],
          kwargs: {
            fields: ['name', 'state', 'summary', 'version']
          }
        });
        
        if (moduleResponse.result && moduleResponse.result.length > 0) {
          const module = moduleResponse.result[0];
          const status = module.state === 'installed' ? '✅' : '❌';
          console.log(`   ${status} ${module.name}: ${module.state} (${module.summary || 'No description'})`);
        } else {
          console.log(`   ❓ ${moduleName}: Not found`);
        }
      } catch (error) {
        console.log(`   ❌ ${moduleName}: Error checking - ${error.message}`);
      }
    }
  } catch (error) {
    console.log('❌ Error checking modules:', error.message);
  }
}

/**
 * Check WebSocket endpoints
 */
async function checkWebSocketEndpoints() {
  console.log('\n🔍 Checking WebSocket endpoint availability...');
  
  const endpoints = [
    '/websocket',
    '/longpolling/websocket',
    '/bus/websocket',
    '/web/websocket',
    '/longpolling/poll',
    '/bus/poll'
  ];
  
  for (const endpoint of endpoints) {
    const url = `${config.serverUrl}${endpoint}`;
    
    try {
      const result = await new Promise((resolve) => {
        const req = https.get(url, (res) => {
          resolve({
            endpoint,
            status: res.statusCode,
            headers: res.headers,
            success: res.statusCode < 400
          });
        });
        
        req.on('error', (error) => {
          resolve({
            endpoint,
            status: 'error',
            error: error.message,
            success: false
          });
        });
        
        req.setTimeout(5000, () => {
          req.destroy();
          resolve({
            endpoint,
            status: 'timeout',
            success: false
          });
        });
      });
      
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} ${endpoint}: ${result.status}`);
      
      // Check for WebSocket upgrade headers
      if (result.headers && result.headers.upgrade) {
        console.log(`      🔄 Upgrade header: ${result.headers.upgrade}`);
      }
      
    } catch (error) {
      console.log(`   ❌ ${endpoint}: ${error.message}`);
    }
  }
}

/**
 * Check bus configuration
 */
async function checkBusConfiguration() {
  console.log('\n🔍 Checking bus configuration...');
  
  try {
    // Try to get bus configuration
    const busResponse = await makeOdooApiCall('/web/dataset/call_kw', {
      model: 'ir.config_parameter',
      method: 'search_read',
      args: [[['key', 'like', 'bus%']]],
      kwargs: {
        fields: ['key', 'value']
      }
    });
    
    if (busResponse.result && busResponse.result.length > 0) {
      console.log('📋 Bus configuration parameters:');
      busResponse.result.forEach(param => {
        console.log(`   ${param.key}: ${param.value}`);
      });
    } else {
      console.log('❓ No bus configuration parameters found');
    }
    
    // Check for WebSocket specific parameters
    const wsResponse = await makeOdooApiCall('/web/dataset/call_kw', {
      model: 'ir.config_parameter',
      method: 'search_read',
      args: [[['key', 'like', 'websocket%']]],
      kwargs: {
        fields: ['key', 'value']
      }
    });
    
    if (wsResponse.result && wsResponse.result.length > 0) {
      console.log('🔌 WebSocket configuration parameters:');
      wsResponse.result.forEach(param => {
        console.log(`   ${param.key}: ${param.value}`);
      });
    } else {
      console.log('❓ No WebSocket configuration parameters found');
    }
    
  } catch (error) {
    console.log('❌ Error checking bus configuration:', error.message);
  }
}

/**
 * Test longpolling (fallback for WebSocket)
 */
async function testLongpolling() {
  console.log('\n🔍 Testing longpolling (WebSocket fallback)...');
  
  try {
    const pollResponse = await makeOdooApiCall('/longpolling/poll', {
      channels: ['bus.bus'],
      last: 0,
      options: {}
    });
    
    if (pollResponse.result !== undefined) {
      console.log('✅ Longpolling is working');
      console.log('📨 Response:', pollResponse.result);
    } else if (pollResponse.error) {
      console.log('❌ Longpolling error:', pollResponse.error.message);
    } else {
      console.log('❓ Unexpected longpolling response');
    }
  } catch (error) {
    console.log('❌ Longpolling test failed:', error.message);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🎯 Odoo WebSocket Support Check');
  console.log('===============================\n');
  
  // Check Odoo version
  const version = await checkOdooVersion();
  
  // Check installed modules
  await checkInstalledModules();
  
  // Check WebSocket endpoints
  await checkWebSocketEndpoints();
  
  // Check bus configuration
  await checkBusConfiguration();
  
  // Test longpolling
  await testLongpolling();
  
  console.log('\n📋 Summary and Recommendations:');
  console.log('===============================');
  
  if (version) {
    const majorVersion = parseInt(version.server_serie);
    if (majorVersion >= 18) {
      console.log('✅ Odoo version supports WebSocket');
    } else {
      console.log('⚠️ Consider upgrading to Odoo 18+ for full WebSocket support');
    }
  }
  
  console.log('\n🔧 Next Steps:');
  console.log('1. Ensure the "bus" module is installed and enabled');
  console.log('2. Check nginx configuration for WebSocket proxy');
  console.log('3. Verify Odoo server is running with gevent worker');
  console.log('4. Test with authentication headers');
  
  console.log('\n🏁 Check complete!');
}

if (require.main === module) {
  main().catch(console.error);
}
