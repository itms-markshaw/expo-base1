#!/usr/bin/env node

/**
 * Comprehensive WebSocket Testing Script for Cloudflare + Odoo
 * Tests WebSocket upgrades and helps verify server configuration changes
 */

const WebSocket = require('ws');
const https = require('https');
const readline = require('readline');

class WebSocketTester {
  constructor() {
    this.config = {
      baseURL: 'https://itmsgroup.com.au',
      testUrls: [
        '/websocket',
        '/longpolling/websocket', 
        '/bus/websocket',
        '/web/websocket',
        '/longpolling/poll',
        '/bus/poll'
      ]
    };
    
    this.testResults = [];
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  log(message, type = 'info') {
    const timestamp = new Date().toTimeString().split(' ')[0];
    const icons = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      debug: '🔍',
      websocket: '🔌',
      test: '🧪'
    };
    console.log(`[${timestamp}] ${icons[type] || 'ℹ️'} ${message}`);
  }

  async prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }

  // Test 1: HTTP Upgrade Request Test
  async testHttpUpgradeRequest(path) {
    this.log(`Testing HTTP Upgrade request to: ${this.config.baseURL}${path}`, 'test');
    
    return new Promise((resolve) => {
      const req = https.request(`${this.config.baseURL}${path}`, {
        method: 'GET',
        headers: {
          'Connection': 'Upgrade',
          'Upgrade': 'websocket',
          'Sec-WebSocket-Version': '13',
          'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
          'Sec-WebSocket-Protocol': 'chat',
          'Origin': this.config.baseURL,
          'User-Agent': 'WebSocket-Tester/1.0'
        }
      }, (res) => {
        this.log(`HTTP Response: ${res.statusCode} ${res.statusMessage}`, 
                 res.statusCode === 101 ? 'success' : 'error');
        
        // Log important headers
        const importantHeaders = ['upgrade', 'connection', 'sec-websocket-accept', 'server', 'cf-ray'];
        importantHeaders.forEach(header => {
          if (res.headers[header]) {
            this.log(`  ${header}: ${res.headers[header]}`, 'debug');
          }
        });
        
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          resolve({
            path,
            method: 'http_upgrade',
            success: res.statusCode === 101,
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            body: body.substring(0, 500),
            websocketSupported: res.statusCode === 101 && res.headers.upgrade === 'websocket'
          });
        });
      });
      
      req.on('error', (err) => {
        this.log(`HTTP Request Error: ${err.message}`, 'error');
        resolve({
          path,
          method: 'http_upgrade',
          success: false,
          error: err.message
        });
      });
      
      req.setTimeout(10000, () => {
        this.log('HTTP Request Timeout', 'warning');
        req.destroy();
        resolve({
          path,
          method: 'http_upgrade',
          success: false,
          error: 'timeout'
        });
      });
      
      req.end();
    });
  }

  // Test 2: Actual WebSocket Connection Test
  async testWebSocketConnection(path) {
    const wsUrl = `${this.config.baseURL.replace('https://', 'wss://')}${path}`;
    this.log(`Testing WebSocket connection to: ${wsUrl}`, 'websocket');
    
    return new Promise((resolve) => {
      const ws = new WebSocket(wsUrl, {
        headers: {
          'Origin': this.config.baseURL,
          'User-Agent': 'WebSocket-Tester/1.0'
        }
      });
      
      const timeout = setTimeout(() => {
        this.log(`WebSocket connection timeout for ${path}`, 'warning');
        ws.terminate();
        resolve({
          path,
          method: 'websocket',
          success: false,
          error: 'connection_timeout'
        });
      }, 10000);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        this.log(`WebSocket connection opened for ${path}!`, 'success');
        
        // Test sending a message
        const testMessage = JSON.stringify({
          type: 'ping',
          data: 'test',
          timestamp: Date.now()
        });
        
        try {
          ws.send(testMessage);
          this.log(`Test message sent: ${testMessage}`, 'debug');
        } catch (sendError) {
          this.log(`Failed to send test message: ${sendError.message}`, 'error');
        }
        
        // Wait for potential response, then close
        setTimeout(() => {
          ws.close();
          resolve({
            path,
            method: 'websocket',
            success: true,
            readyState: ws.readyState,
            protocol: ws.protocol
          });
        }, 2000);
      });
      
      ws.on('message', (data) => {
        this.log(`WebSocket message received: ${data}`, 'success');
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        this.log(`WebSocket error for ${path}: ${error.message}`, 'error');
        resolve({
          path,
          method: 'websocket',
          success: false,
          error: error.message,
          code: error.code
        });
      });
      
      ws.on('close', (code, reason) => {
        clearTimeout(timeout);
        this.log(`WebSocket closed for ${path}: ${code} - ${reason}`, 
                code === 1000 ? 'info' : 'warning');
        
        if (code !== 1000) {
          resolve({
            path,
            method: 'websocket',
            success: false,
            error: `Closed with code ${code}`,
            code,
            reason: reason.toString()
          });
        }
      });
    });
  }

  // Test 3: Cloudflare-specific tests
  async testCloudflareConfiguration() {
    this.log('Testing Cloudflare configuration...', 'test');
    
    return new Promise((resolve) => {
      const req = https.request(`${this.config.baseURL}/`, {
        method: 'HEAD'
      }, (res) => {
        const cfHeaders = {};
        Object.keys(res.headers).forEach(header => {
          if (header.startsWith('cf-')) {
            cfHeaders[header] = res.headers[header];
          }
        });
        
        resolve({
          cloudflareDetected: !!res.headers['cf-ray'],
          cloudflareHeaders: cfHeaders,
          server: res.headers.server
        });
      });
      
      req.on('error', () => resolve({ error: 'Failed to test Cloudflare' }));
      req.setTimeout(5000, () => {
        req.destroy();
        resolve({ error: 'Timeout testing Cloudflare' });
      });
      req.end();
    });
  }

  // Test 4: Alternative protocols test
  async testAlternativeProtocols(path) {
    const protocols = ['chat', 'echo-protocol', 'binary', 'base64'];
    const results = [];
    
    for (const protocol of protocols) {
      const wsUrl = `${this.config.baseURL.replace('https://', 'wss://')}${path}`;
      
      const result = await new Promise((resolve) => {
        const ws = new WebSocket(wsUrl, protocol, {
          headers: {
            'Origin': this.config.baseURL,
            'User-Agent': 'WebSocket-Tester/1.0'
          }
        });
        
        const timeout = setTimeout(() => {
          ws.terminate();
          resolve({ protocol, success: false, error: 'timeout' });
        }, 5000);
        
        ws.on('open', () => {
          clearTimeout(timeout);
          ws.close();
          resolve({ protocol, success: true });
        });
        
        ws.on('error', () => {
          clearTimeout(timeout);
          resolve({ protocol, success: false, error: 'connection_failed' });
        });
      });
      
      results.push(result);
    }
    
    return results;
  }

  // Comprehensive test runner
  async runComprehensiveTest() {
    console.log('\n🧪 COMPREHENSIVE WEBSOCKET TESTING TOOL');
    console.log('=======================================');
    console.log(`Target: ${this.config.baseURL}`);
    console.log(`Testing ${this.config.testUrls.length} potential WebSocket endpoints\n`);
    
    // Test Cloudflare configuration first
    console.log('1️⃣ CLOUDFLARE CONFIGURATION TEST');
    console.log('================================');
    const cfTest = await this.testCloudflareConfiguration();
    
    if (cfTest.cloudflareDetected) {
      this.log('Cloudflare detected', 'info');
      Object.entries(cfTest.cloudflareHeaders).forEach(([key, value]) => {
        this.log(`  ${key}: ${value}`, 'debug');
      });
    } else {
      this.log('Cloudflare not detected', 'info');
    }
    
    // Test each potential WebSocket endpoint
    console.log('\n2️⃣ WEBSOCKET ENDPOINT TESTS');
    console.log('===========================');
    
    for (const path of this.config.testUrls) {
      console.log(`\n📍 Testing endpoint: ${path}`);
      console.log('─'.repeat(50));
      
      // Test HTTP upgrade first
      const httpResult = await this.testHttpUpgradeRequest(path);
      this.testResults.push(httpResult);
      
      // If HTTP upgrade succeeds, test actual WebSocket
      if (httpResult.websocketSupported) {
        this.log('HTTP upgrade successful, testing WebSocket...', 'info');
        const wsResult = await this.testWebSocketConnection(path);
        this.testResults.push(wsResult);
        
        // Test alternative protocols if basic connection works
        if (wsResult.success) {
          this.log('Testing alternative protocols...', 'info');
          const protocolResults = await this.testAlternativeProtocols(path);
          this.testResults.push({ path, method: 'protocols', results: protocolResults });
        }
      } else {
        this.log(`Skipping WebSocket test (HTTP upgrade failed with ${httpResult.status})`, 'warning');
      }
    }
    
    // Generate comprehensive report
    this.generateReport(cfTest);
  }

  // Interactive testing mode
  async runInteractiveTest() {
    console.log('\n🔧 INTERACTIVE WEBSOCKET TESTING');
    console.log('================================');
    
    while (true) {
      console.log('\nOptions:');
      console.log('1. Test all endpoints comprehensively');
      console.log('2. Test specific endpoint');
      console.log('3. Test custom WebSocket URL');
      console.log('4. Monitor WebSocket connection continuously');
      console.log('5. Show previous test results');
      console.log('6. Exit');
      
      const choice = await this.prompt('\nSelect option (1-6): ');
      
      switch (choice) {
        case '1':
          await this.runComprehensiveTest();
          break;
        case '2':
          await this.testSpecificEndpoint();
          break;
        case '3':
          await this.testCustomURL();
          break;
        case '4':
          await this.monitorConnection();
          break;
        case '5':
          this.showResults();
          break;
        case '6':
          this.rl.close();
          return;
        default:
          this.log('Invalid option', 'error');
      }
    }
  }

  async testSpecificEndpoint() {
    console.log('\nAvailable endpoints:');
    this.config.testUrls.forEach((url, index) => {
      console.log(`${index + 1}. ${url}`);
    });
    
    const choice = await this.prompt('Select endpoint number: ');
    const index = parseInt(choice) - 1;
    
    if (index >= 0 && index < this.config.testUrls.length) {
      const path = this.config.testUrls[index];
      console.log(`\nTesting ${path}...`);
      
      const httpResult = await this.testHttpUpgradeRequest(path);
      const wsResult = await this.testWebSocketConnection(path);
      
      this.testResults.push(httpResult, wsResult);
      
      console.log('\nResults:');
      console.log(`HTTP Upgrade: ${httpResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      console.log(`WebSocket: ${wsResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    } else {
      this.log('Invalid endpoint number', 'error');
    }
  }

  async testCustomURL() {
    const customPath = await this.prompt('Enter WebSocket path (e.g., /websocket): ');
    console.log(`\nTesting custom path: ${customPath}`);
    
    const httpResult = await this.testHttpUpgradeRequest(customPath);
    const wsResult = await this.testWebSocketConnection(customPath);
    
    this.testResults.push(httpResult, wsResult);
    
    console.log('\nResults:');
    console.log(`HTTP Upgrade: ${httpResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`WebSocket: ${wsResult.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  }

  async monitorConnection() {
    const path = await this.prompt('Enter WebSocket path to monitor (e.g., /websocket): ');
    const wsUrl = `${this.config.baseURL.replace('https://', 'wss://')}${path}`;
    
    console.log(`\n🔍 Monitoring WebSocket connection to: ${wsUrl}`);
    console.log('Press Ctrl+C to stop monitoring\n');
    
    let connectionAttempt = 1;
    const maxAttempts = parseInt(await this.prompt('Max connection attempts (0 for infinite): ')) || 0;
    
    const monitor = () => {
      if (maxAttempts > 0 && connectionAttempt > maxAttempts) {
        console.log('\nMonitoring complete');
        return;
      }
      
      this.log(`Connection attempt ${connectionAttempt}`, 'test');
      
      const ws = new WebSocket(wsUrl);
      const startTime = Date.now();
      
      ws.on('open', () => {
        const connectTime = Date.now() - startTime;
        this.log(`Connected in ${connectTime}ms`, 'success');
        
        // Send periodic pings
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
            this.log('Ping sent', 'debug');
          }
        }, 5000);
        
        setTimeout(() => {
          clearInterval(pingInterval);
          ws.close();
        }, 10000);
      });
      
      ws.on('pong', () => {
        this.log('Pong received', 'debug');
      });
      
      ws.on('message', (data) => {
        this.log(`Message: ${data}`, 'info');
      });
      
      ws.on('error', (error) => {
        this.log(`Error: ${error.message}`, 'error');
      });
      
      ws.on('close', (code, reason) => {
        this.log(`Closed: ${code} - ${reason}`, 'warning');
        connectionAttempt++;
        
        // Retry after delay
        setTimeout(monitor, 5000);
      });
    };
    
    monitor();
  }

  showResults() {
    if (this.testResults.length === 0) {
      this.log('No test results available', 'warning');
      return;
    }
    
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('=======================');
    
    this.testResults.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.path} (${result.method})`);
      console.log(`   Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.status) {
        console.log(`   HTTP Status: ${result.status}`);
      }
    });
  }

  generateReport(cfTest) {
    console.log('\n📊 COMPREHENSIVE TEST REPORT');
    console.log('============================');
    
    const successfulEndpoints = this.testResults.filter(r => r.success && r.method === 'websocket');
    const httpUpgradeSuccess = this.testResults.filter(r => r.success && r.method === 'http_upgrade');
    
    console.log(`\n📈 Summary:`);
    console.log(`   Total endpoints tested: ${this.config.testUrls.length}`);
    console.log(`   HTTP upgrade successful: ${httpUpgradeSuccess.length}`);
    console.log(`   WebSocket connections successful: ${successfulEndpoints.length}`);
    console.log(`   Cloudflare detected: ${cfTest.cloudflareDetected ? 'Yes' : 'No'}`);
    
    if (successfulEndpoints.length > 0) {
      console.log('\n✅ WORKING WEBSOCKET ENDPOINTS:');
      successfulEndpoints.forEach(result => {
        console.log(`   • ${result.path}`);
      });
      
      console.log('\n🎉 SUCCESS! WebSocket is working on your server!');
      console.log('You can now update your React Native app to use WebSocket.');
      
    } else if (httpUpgradeSuccess.length > 0) {
      console.log('\n⚠️ PARTIAL SUCCESS:');
      console.log('HTTP upgrade requests are being accepted, but WebSocket connections fail.');
      console.log('This suggests WebSocket support is partially configured.');
      
    } else {
      console.log('\n❌ NO WORKING WEBSOCKET ENDPOINTS FOUND');
      console.log('\nPossible issues:');
      console.log('• Cloudflare WebSocket support not enabled');
      console.log('• Odoo server WebSocket/longpolling not configured');
      console.log('• Firewall blocking WebSocket connections');
      console.log('• Nginx/proxy configuration missing WebSocket support');
      
      console.log('\n🔧 Recommended actions:');
      console.log('1. Enable WebSocket support in Cloudflare dashboard');
      console.log('2. Configure Odoo with --gevent-port parameter');
      console.log('3. Install and configure nginx WebSocket proxy');
      console.log('4. Test locally without Cloudflare to isolate the issue');
    }
    
    console.log('\n📋 Detailed Results:');
    console.log('====================');
    console.log(JSON.stringify(this.testResults, null, 2));
  }
}

// Command line usage
if (require.main === module) {
  const tester = new WebSocketTester();
  
  if (process.argv.includes('--interactive') || process.argv.includes('-i')) {
    tester.runInteractiveTest().catch(console.error);
  } else {
    tester.runComprehensiveTest().then(() => {
      tester.rl.close();
    }).catch(console.error);
  }
}

module.exports = WebSocketTester;
