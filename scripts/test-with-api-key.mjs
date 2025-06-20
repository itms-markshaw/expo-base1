#!/usr/bin/env node
/**
 * XML-RPC Test with API Key Support
 * Run this after generating your API key
 */

import { OdooXMLRPCClient } from '../services/xmlrpc/OdooXMLRPCClient.js';

// CONFIGURATION - UPDATE WITH YOUR API KEY
const CONFIG = {
  baseURL: 'https://itmsgroup.com.au',
  database: '', // Auto-detect (found: ITMS_v17_3_backup_2025_02_17_08_15)
  username: 'mark.shaw@itmsgroup.com.au',
  
  // 🔑 REPLACE WITH YOUR API KEY FROM ODOO SETTINGS
  apiKey: 'ea186501b420d9b656eecf026f04f74a975db27c',
  
  // Comment out password when using API key
  // password: 'hTempTWxeCFYWVswzMcv',
};

async function testWithApiKey() {
  console.log('🔑 Testing XML-RPC with API Key...');
  console.log('=' .repeat(50));
  
  if (CONFIG.apiKey === 'PUT_YOUR_API_KEY_HERE') {
    console.error('❌ Please update CONFIG.apiKey with your actual API key');
    console.error('');
    console.error('🔑 To generate API key:');
    console.error('1. Login to https://itmsgroup.com.au');
    console.error('2. Go to Settings → My Profile → Account Security');
    console.error('3. Click "New API Key"');
    console.error('4. Copy the key and replace PUT_YOUR_API_KEY_HERE above');
    process.exit(1);
  }
  
  const client = new OdooXMLRPCClient(CONFIG);

  try {
    console.log('🔐 Authenticating with API Key...');
    const authResult = await client.authenticate();
    console.log('✅ SUCCESS! Authentication working');
    console.log(`📊 User ID: ${authResult.uid}`);
    console.log(`📊 Database: ${authResult.database}`);
    
    // Quick API test
    const userCount = await client.searchCount('res.users');
    console.log(`✅ Found ${userCount} users in system`);
    
    console.log('');
    console.log('🎉 XML-RPC INTEGRATION READY!');
    console.log('✅ You can now use this client in your React Native app');
    
  } catch (error) {
    console.error('❌ Still failing:', error.message);
    console.error('');
    console.error('🔧 Troubleshooting:');
    console.error('- Verify API key is copied correctly');
    console.error('- Check if key has proper permissions');
    console.error('- Try generating a new key');
  }
}

testWithApiKey();
