#!/usr/bin/env node
/**
 * Simple test runner for XML-RPC
 */

import { OdooXMLRPCClient } from '../services/xmlrpc/OdooXMLRPCClient.js';

// Configuration
const CONFIG = {
  baseURL: 'https://itmsgroup.com.au',
  database: '', // Auto-detect
  username: 'mark.shaw@itmsgroup.com.au',
  password: 'hTempTWxeCFYWVswzMcv',
};

async function runTest() {
  console.log('🧪 Starting Odoo XML-RPC Connection Test');
  console.log('=' .repeat(50));
  
  const client = new OdooXMLRPCClient(CONFIG);

  try {
    // Test 1: Server Connectivity
    console.log('📡 TEST 1: Server Connectivity');
    const version = await client.callService('common', 'version', []);
    console.log('✅ Server version:', version);
    console.log('');

    // Test 2: Database Discovery
    console.log('🔍 TEST 2: Database Discovery');
    const databases = await client.listDatabases();
    console.log('✅ Available databases:', databases);
    console.log('');

    // Test 3: Authentication
    console.log('🔐 TEST 3: Authentication');
    const authResult = await client.authenticate();
    console.log('✅ Authentication successful!');
    console.log('📊 User ID:', authResult.uid);
    console.log('📊 Database:', authResult.database);
    console.log('');

    // Test 4: Basic API Call
    console.log('🔄 TEST 4: Basic API Call');
    const userCount = await client.searchCount('res.users');
    console.log(`✅ Found ${userCount} users in the system`);
    console.log('');

    // SUCCESS!
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ XML-RPC integration working correctly');
    console.log(`📊 Connected to: ${authResult.database} as UID ${authResult.uid}`);
    
    return true;

  } catch (error) {
    console.error('❌ TEST FAILED');
    console.error('Error:', error.message);
    
    if (error.message.includes('Authentication failed')) {
      console.error('🔧 Most likely 2FA issue - generate API key in Odoo settings');
    }
    
    return false;
  }
}

// Run the test
runTest().then(success => {
  process.exit(success ? 0 : 1);
});
