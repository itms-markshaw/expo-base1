#!/usr/bin/env node

/**
 * WebSocket Diagnostic Script for Odoo
 * Comprehensive testing to identify WebSocket connection issues
 */

const WebSocket = require('ws');
const axios = require('axios');
const readline = require('readline');

class OdooWebSocketDiagnostic {
  constructor() {
    this.config = {
      baseURL: 'https://itmsgroup.com.au',
      database: 'ITMS_v17_3_backup_2025_02_17_08_15',
      username: null,
      password: null
    };
    
    this.authData = {
      uid: null,
      sessionId: null,
      cookies: null
    };
    
    this.testResults = {
      authentication: null,
      httpApi: null,
      websocketConnection: null,
      websocketAuth: null,
      websocketMessaging: null
    };
    
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
      websocket: '🔌'
    };
    console.log(`[${timestamp}] ${icons[type] || 'ℹ️'} ${message}`);
  }

  async prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }

  async getCredentials() {
    console.log('\n🔐 Odoo Authentication Setup');
    console.log('================================');
    
    this.config.username = await this.prompt('Username: ');
    this.config.password = await this.prompt('Password: ');
    
    console.log(`\n📊 Configuration:`);
    console.log(`   Server: ${this.config.baseURL}`);
    console.log(`   Database: ${this.config.database}`);
    console.log(`   Username: ${this.config.username}`);
    console.log('');
  }

  async testAuthentication() {
    this.log('Testing Odoo authentication...', 'debug');
    
    try {
      const authData = {
        jsonrpc: '2.0',
        method: 'call',
        params: {
          service: 'common',
          method: 'authenticate',
          args: [
            this.config.database,
            this.config.username,
            this.config.password,
            {}
          ]
        },
        id: Math.floor(Math.random() * 1000000)
      };

      const response = await axios.post(`${this.config.baseURL}/jsonrpc`, authData, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WebSocket-Diagnostic/1.0'
        }
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      if (!response.data.result) {
        throw new Error('Authentication failed - invalid credentials');
      }

      this.authData.uid = response.data.result;
      this.authData.cookies = response.headers['set-cookie'];
      
      // Extract session ID from cookies
      if (this.authData.cookies) {
        const sessionCookie = this.authData.cookies.find(cookie => 
          cookie.includes('session_id=')
        );
        if (sessionCookie) {
          this.authData.sessionId = sessionCookie.split('session_id=')[1].split(';')[0];
        }
      }

      this.testResults.authentication = {
        success: true,
        uid: this.authData.uid,
        hasSessionId: !!this.authData.sessionId,
        cookieCount: this.authData.cookies ? this.authData.cookies.length : 0
      };

      this.log(`Authentication successful - UID: ${this.authData.uid}`, 'success');
      this.log(`Session ID: ${this.authData.sessionId || 'Not found'}`, 'info');
      
      return true;
    } catch (error) {
      this.testResults.authentication = {
        success: false,
        error: error.message
      };
      this.log(`Authentication failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testHttpApi() {
    this.log('Testing HTTP API endpoints...', 'debug');
    
    try {
      // Test basic model access
      const response = await axios.get(`${this.config.baseURL}/api/v2/search_read/ir.model`, {
        params: {
          fields: JSON.stringify(['id', 'model']),
          limit: 5
        },
        headers: {
          'Content-Type': 'application/json',
          'Cookie': this.authData.sessionId ? `session_id=${this.authData.sessionId}` : '',
          'User-Agent': 'WebSocket-Diagnostic/1.0'
        },
        timeout: 10000
      });

      this.testResults.httpApi = {
        success: true,
        status: response.status,
        recordCount: Array.isArray(response.data) ? response.data.length : 0,
        headers: response.headers
      };

      this.log(`HTTP API test successful - ${this.testResults.httpApi.recordCount} records`, 'success');
      return true;
    } catch (error) {
      this.testResults.httpApi = {
        success: false,
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      };
      this.log(`HTTP API test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testWebSocketConnection() {
    this.log('Testing WebSocket connection...', 'websocket');
    
    return new Promise((resolve) => {
      try {
        // Try different WebSocket URL formats
        const wsUrls = [
          `${this.config.baseURL.replace('https://', 'wss://')}/websocket`,
          `${this.config.baseURL.replace('https://', 'wss://')}/longpolling/websocket`,
          `${this.config.baseURL.replace('https://', 'wss://')}/bus/websocket`,
          `${this.config.baseURL.replace('https://', 'wss://')}/web/websocket`
        ];

        let testIndex = 0;
        
        const testNextUrl = () => {
          if (testIndex >= wsUrls.length) {
            this.testResults.websocketConnection = {
              success: false,
              error: 'All WebSocket URLs failed',
              attemptedUrls: wsUrls,
              results: []
            };
            this.log('All WebSocket URLs failed', 'error');
            resolve(false);
            return;
          }

          const wsUrl = wsUrls[testIndex];
          this.log(`Attempting WebSocket connection to: ${wsUrl}`, 'debug');
          
          const ws = new WebSocket(wsUrl, {
            headers: {
              'Origin': this.config.baseURL,
              'User-Agent': 'WebSocket-Diagnostic/1.0',
              'Cookie': this.authData.sessionId ? `session_id=${this.authData.sessionId}` : '',
              'Authorization': `Bearer ${this.authData.sessionId || ''}`
            },
            timeout: 10000
          });

          const connectionTimeout = setTimeout(() => {
            this.log(`WebSocket connection timeout for ${wsUrl}`, 'warning');
            ws.terminate();
            testIndex++;
            testNextUrl();
          }, 10000);

          ws.on('open', () => {
            clearTimeout(connectionTimeout);
            this.log(`WebSocket connected successfully to: ${wsUrl}`, 'success');
            
            this.testResults.websocketConnection = {
              success: true,
              url: wsUrl,
              readyState: ws.readyState,
              protocol: ws.protocol
            };
            
            // Test sending a message
            this.testWebSocketMessaging(ws, wsUrl).then(() => {
              ws.close();
              resolve(true);
            });
          });

          ws.on('error', (error) => {
            clearTimeout(connectionTimeout);
            this.log(`WebSocket error for ${wsUrl}: ${error.message}`, 'error');
            testIndex++;
            testNextUrl();
          });

          ws.on('close', (code, reason) => {
            clearTimeout(connectionTimeout);
            this.log(`WebSocket closed for ${wsUrl}: ${code} - ${reason}`, 'warning');
            if (code !== 1000) { // Not normal closure
              testIndex++;
              testNextUrl();
            }
          });

          ws.on('message', (data) => {
            this.log(`WebSocket message received: ${data}`, 'debug');
          });
        };

        testNextUrl();
      } catch (error) {
        this.testResults.websocketConnection = {
          success: false,
          error: error.message
        };
        this.log(`WebSocket connection test failed: ${error.message}`, 'error');
        resolve(false);
      }
    });
  }

  async testWebSocketMessaging(ws, wsUrl) {
    this.log('Testing WebSocket messaging...', 'websocket');
    
    return new Promise((resolve) => {
      const messageTimeout = setTimeout(() => {
        this.log('WebSocket messaging test timeout', 'warning');
        this.testResults.websocketMessaging = {
          success: false,
          error: 'Message test timeout'
        };
        resolve(false);
      }, 5000);

      // Test different message formats that Odoo might expect
      const testMessages = [
        // Standard Odoo bus message
        {
          event_name: 'subscribe',
          data: {
            channels: ['mail.message'],
            last: 0
          }
        },
        // Simple ping
        {
          type: 'ping'
        },
        // Auth message
        {
          event_name: 'authenticate',
          data: {
            uid: this.authData.uid,
            session_id: this.authData.sessionId
          }
        }
      ];

      let messageIndex = 0;
      let receivedMessages = [];

      const messageHandler = (data) => {
        receivedMessages.push(data.toString());
        this.log(`Received: ${data}`, 'debug');
      };

      ws.on('message', messageHandler);

      const sendNextMessage = () => {
        if (messageIndex >= testMessages.length) {
          clearTimeout(messageTimeout);
          this.testResults.websocketMessaging = {
            success: receivedMessages.length > 0,
            sentMessages: testMessages.length,
            receivedMessages: receivedMessages.length,
            messages: receivedMessages
          };
          
          if (receivedMessages.length > 0) {
            this.log(`WebSocket messaging successful - ${receivedMessages.length} responses`, 'success');
          } else {
            this.log('WebSocket messaging failed - no responses received', 'warning');
          }
          
          resolve(receivedMessages.length > 0);
          return;
        }

        const message = testMessages[messageIndex];
        this.log(`Sending message ${messageIndex + 1}: ${JSON.stringify(message)}`, 'debug');
        
        try {
          ws.send(JSON.stringify(message));
          messageIndex++;
          setTimeout(sendNextMessage, 1000); // Wait 1 second between messages
        } catch (error) {
          this.log(`Failed to send message: ${error.message}`, 'error');
          messageIndex++;
          sendNextMessage();
        }
      };

      // Start sending messages
      setTimeout(sendNextMessage, 500); // Wait a bit after connection
    });
  }

  async checkServerWebSocketSupport() {
    this.log('Checking server WebSocket support...', 'debug');
    
    try {
      // Check if server responds to WebSocket upgrade request
      const response = await axios.get(`${this.config.baseURL}/websocket`, {
        headers: {
          'Connection': 'Upgrade',
          'Upgrade': 'websocket',
          'Sec-WebSocket-Version': '13',
          'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
          'User-Agent': 'WebSocket-Diagnostic/1.0'
        },
        validateStatus: () => true // Accept any status code
      });

      this.log(`WebSocket endpoint status: ${response.status} ${response.statusText}`, 'debug');
      this.log(`Response headers:`, 'debug');
      Object.entries(response.headers).forEach(([key, value]) => {
        this.log(`  ${key}: ${value}`, 'debug');
      });

      return {
        status: response.status,
        headers: response.headers,
        supportsWebSocket: response.status === 101 || response.headers.upgrade === 'websocket'
      };
    } catch (error) {
      this.log(`Server WebSocket check failed: ${error.message}`, 'error');
      return {
        error: error.message,
        supportsWebSocket: false
      };
    }
  }

  async runComprehensiveDiagnostic() {
    console.log('\n🔌 ODOO WEBSOCKET DIAGNOSTIC TOOL');
    console.log('==================================');
    
    try {
      // Get credentials
      await this.getCredentials();
      
      console.log('\n📋 Running comprehensive WebSocket diagnostic...\n');
      
      // Step 1: Test authentication
      console.log('1️⃣ Authentication Test');
      console.log('======================');
      const authSuccess = await this.testAuthentication();
      if (!authSuccess) {
        this.log('Cannot proceed without authentication', 'error');
        return;
      }
      
      // Step 2: Test HTTP API
      console.log('\n2️⃣ HTTP API Test');
      console.log('================');
      await this.testHttpApi();
      
      // Step 3: Check server WebSocket support
      console.log('\n3️⃣ Server WebSocket Support Check');
      console.log('==================================');
      const serverSupport = await this.checkServerWebSocketSupport();
      
      // Step 4: Test WebSocket connection
      console.log('\n4️⃣ WebSocket Connection Test');
      console.log('============================');
      await this.testWebSocketConnection();
      
      // Generate report
      console.log('\n📊 DIAGNOSTIC REPORT');
      console.log('===================');
      this.generateReport(serverSupport);
      
    } catch (error) {
      this.log(`Diagnostic failed: ${error.message}`, 'error');
    } finally {
      this.rl.close();
    }
  }

  generateReport(serverSupport) {
    console.log('\n📈 Test Results Summary:');
    console.log('========================');
    
    Object.entries(this.testResults).forEach(([test, result]) => {
      if (result) {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        console.log(`${test.padEnd(20)}: ${status}`);
        if (!result.success && result.error) {
          console.log(`${' '.repeat(22)}Error: ${result.error}`);
        }
      }
    });
    
    console.log('\n🔍 Detailed Analysis:');
    console.log('=====================');
    
    // Authentication analysis
    if (this.testResults.authentication?.success) {
      console.log('✅ Authentication: Working correctly');
      console.log(`   UID: ${this.testResults.authentication.uid}`);
      console.log(`   Session ID: ${this.testResults.authentication.hasSessionId ? 'Available' : 'Missing'}`);
    } else {
      console.log('❌ Authentication: Failed - Check credentials');
    }
    
    // HTTP API analysis
    if (this.testResults.httpApi?.success) {
      console.log('✅ HTTP API: Working correctly');
      console.log(`   Status: ${this.testResults.httpApi.status}`);
      console.log(`   Records: ${this.testResults.httpApi.recordCount}`);
    } else {
      console.log('❌ HTTP API: Failed');
      if (this.testResults.httpApi?.status) {
        console.log(`   Status: ${this.testResults.httpApi.status} ${this.testResults.httpApi.statusText}`);
      }
    }
    
    // Server WebSocket support analysis
    console.log('\n🔌 Server WebSocket Analysis:');
    if (serverSupport.supportsWebSocket) {
      console.log('✅ Server supports WebSocket protocol');
    } else {
      console.log('❌ Server does not support WebSocket protocol');
      console.log(`   Status: ${serverSupport.status || 'Unknown'}`);
    }
    
    // WebSocket connection analysis
    if (this.testResults.websocketConnection?.success) {
      console.log('✅ WebSocket Connection: Successful');
      console.log(`   URL: ${this.testResults.websocketConnection.url}`);
    } else {
      console.log('❌ WebSocket Connection: Failed');
      console.log('   This is likely the main issue causing your app problems');
    }
    
    // WebSocket messaging analysis
    if (this.testResults.websocketMessaging?.success) {
      console.log('✅ WebSocket Messaging: Working');
      console.log(`   Messages sent: ${this.testResults.websocketMessaging.sentMessages}`);
      console.log(`   Responses received: ${this.testResults.websocketMessaging.receivedMessages}`);
    } else if (this.testResults.websocketMessaging) {
      console.log('❌ WebSocket Messaging: Failed');
      console.log('   Connection established but messaging not working');
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    console.log('===================');
    
    if (!this.testResults.websocketConnection?.success) {
      console.log('🔧 Primary Issue: WebSocket connection failing');
      console.log('   • Server may not have WebSocket support enabled');
      console.log('   • Check Odoo configuration for WebSocket/longpolling');
      console.log('   • Verify firewall/proxy settings');
      console.log('   • Consider using HTTP-only mode in your app');
    }
    
    if (this.testResults.websocketConnection?.success && !this.testResults.websocketMessaging?.success) {
      console.log('🔧 Secondary Issue: WebSocket messaging protocol');
      console.log('   • Connection works but messaging format incorrect');
      console.log('   • Check Odoo version-specific WebSocket message format');
      console.log('   • Verify authentication in WebSocket messages');
    }
    
    console.log('\n📄 Full Results JSON:');
    console.log('=====================');
    console.log(JSON.stringify({
      config: this.config,
      authData: { ...this.authData, password: '[HIDDEN]' },
      testResults: this.testResults,
      serverSupport
    }, null, 2));
  }
}

// Run the diagnostic
if (require.main === module) {
  const diagnostic = new OdooWebSocketDiagnostic();
  diagnostic.runComprehensiveDiagnostic().catch(console.error);
}

module.exports = OdooWebSocketDiagnostic;
