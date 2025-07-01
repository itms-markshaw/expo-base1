#!/usr/bin/env node

/**
 * WebSocket Authentication Debug Tool
 * Let's figure out exactly what headers/auth Odoo WebSocket expects
 */

const WebSocket = require('ws');

console.log('🔍 Debugging WebSocket Authentication for Odoo...\n');

// Test different authentication approaches
const tests = [
  {
    name: 'No Auth Headers',
    headers: {}
  },
  {
    name: 'With Origin Header',
    headers: {
      'Origin': 'https://itmsgroup.com.au'
    }
  },
  {
    name: 'With User-Agent',
    headers: {
      'Origin': 'https://itmsgroup.com.au',
      'User-Agent': 'Mozilla/5.0 (compatible; OdooMobile/1.0)'
    }
  },
  {
    name: 'With Cookie (empty session)',
    headers: {
      'Origin': 'https://itmsgroup.com.au',
      'Cookie': 'session_id=test'
    }
  },
  {
    name: 'Sec-WebSocket-Protocol',
    headers: {
      'Origin': 'https://itmsgroup.com.au',
      'Sec-WebSocket-Protocol': 'odoo-bus'
    }
  }
];

async function testWebSocketAuth(test, index) {
  return new Promise((resolve) => {
    console.log(`\n${index + 1}. Testing: ${test.name}`);
    console.log(`   Headers:`, test.headers);
    
    const ws = new WebSocket('wss://itmsgroup.com.au/websocket', {
      headers: test.headers
    });

    let resolved = false;

    ws.on('open', () => {
      if (!resolved) {
        resolved = true;
        console.log('   ✅ SUCCESS - WebSocket connected!');
        ws.close();
        resolve({ success: true, test: test.name });
      }
    });

    ws.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        console.log(`   ❌ FAILED - ${err.message}`);
        resolve({ success: false, error: err.message, test: test.name });
      }
    });

    ws.on('close', (code, reason) => {
      if (!resolved) {
        resolved = true;
        console.log(`   ❌ CLOSED - Code: ${code}, Reason: ${reason}`);
        resolve({ success: false, code, reason, test: test.name });
      }
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.log('   ⏰ TIMEOUT');
        ws.close();
        resolve({ success: false, error: 'timeout', test: test.name });
      }
    }, 5000);
  });
}

async function runAllTests() {
  console.log('🧪 Running WebSocket authentication tests...');
  
  const results = [];
  
  for (let i = 0; i < tests.length; i++) {
    const result = await testWebSocketAuth(tests[i], i);
    results.push(result);
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    console.log('\n✅ Successful configurations:');
    successful.forEach(r => console.log(`   - ${r.test}`));
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed configurations:');
    failed.forEach(r => {
      console.log(`   - ${r.test}: ${r.error || `Code ${r.code}`}`);
    });
  }
  
  console.log('\n🔍 Analysis:');
  if (successful.length === 0) {
    console.log('- All tests failed - WebSocket may require valid session authentication');
    console.log('- Need to investigate how browser WebSocket gets authenticated');
    console.log('- May need to extract session from authenticated HTTP request');
  } else {
    console.log('- Found working configuration!');
    console.log('- Use the successful header combination in your app');
  }
}

runAllTests().catch(console.error);
