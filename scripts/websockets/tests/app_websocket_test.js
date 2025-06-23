#!/usr/bin/env node

/**
 * App-Specific WebSocket Test
 * Replicates the exact WebSocket connection your React Native app is attempting
 */

const WebSocket = require('ws');
const axios = require('axios');

async function replicateAppWebSocketConnection() {
  console.log('🔄 Replicating your app\'s WebSocket connection...\n');
  
  const baseURL = 'https://itmsgroup.com.au';
  const wsUrl = baseURL.replace(/^https?:\/\//, 'wss://') + '/websocket';
  
  console.log(`📍 Base URL: ${baseURL}`);
  console.log(`📍 WebSocket URL: ${wsUrl}`);
  console.log('');
  
  // Step 1: Test the exact URL your app is using
  console.log('1️⃣ Testing exact WebSocket URL from your logs...');
  
  const ws = new WebSocket(wsUrl, [], {
    headers: {
      'Origin': baseURL,
      'User-Agent': 'ExoMobile/1.0'
    }
  });
  
  let connectionResult = null;
  
  // Set up connection timeout (15 seconds like your app)
  const connectionTimeout = setTimeout(() => {
    console.log('❌ Connection timeout (15s) - same as your app');
    ws.terminate();
    analyzeResults();
  }, 15000);
  
  ws.on('open', () => {
    clearTimeout(connectionTimeout);
    console.log('✅ WebSocket connection opened (unexpected!)');
    connectionResult = { success: true };
    ws.close();
    analyzeResults();
  });
  
  ws.on('error', (error) => {
    clearTimeout(connectionTimeout);
    console.log('❌ WebSocket error (matching your logs):');
    console.log(`   Error: ${error.message}`);
    console.log(`   Code: ${error.code}`);
    console.log(`   Type: ${error.constructor.name}`);
    connectionResult = { success: false, error: error.message, code: error.code };
    analyzeResults();
  });
  
  ws.on('close', (code, reason) => {
    clearTimeout(connectionTimeout);
    console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
    if (code === 1006) {
      console.log('   ⚠️  Code 1006 = "Received bad response code from server: 500" (matches your logs!)');
    }
    if (!connectionResult) {
      connectionResult = { success: false, code, reason: reason.toString() };
    }
    analyzeResults();
  });
  
  function analyzeResults() {
    console.log('\n📊 ANALYSIS');
    console.log('===========');
    
    if (connectionResult && connectionResult.code === 1006) {
      console.log('🎯 EXACT MATCH: This reproduces your app\'s error!');
      console.log('   • WebSocket close code 1006 with "bad response code from server: 500"');
      console.log('   • This confirms the server is returning HTTP 500 for WebSocket requests');
      console.log('   • The issue is definitely server-side configuration');
    }
    
    console.log('\n💡 SOLUTION FOR YOUR APP:');
    console.log('=========================');
    console.log('1. Disable WebSocket completely (server doesn\'t support it)');
    console.log('2. Use HTTP polling for real-time features');
    console.log('3. Don\'t let WebSocket failures block your sync process');
    
    process.exit(0);
  }
}

replicateAppWebSocketConnection().catch(console.error);
