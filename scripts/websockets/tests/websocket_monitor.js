#!/usr/bin/env node

/**
 * WebSocket Configuration Monitor
 * Continuously monitors WebSocket endpoint and alerts when configuration changes
 */

const WebSocket = require('ws');
const https = require('https');

class WebSocketMonitor {
  constructor() {
    this.url = 'https://itmsgroup.com.au/websocket';
    this.wsUrl = 'wss://itmsgroup.com.au/websocket';
    this.interval = 30000; // 30 seconds
    this.running = false;
    this.lastStatus = null;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const icons = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      change: '🔄',
      monitor: '👀'
    };
    console.log(`[${timestamp}] ${icons[type]} ${message}`);
  }

  async testWebSocketUpgrade() {
    return new Promise((resolve) => {
      const req = https.request(this.url, {
        method: 'GET',
        headers: {
          'Connection': 'Upgrade',
          'Upgrade': 'websocket',
          'Sec-WebSocket-Version': '13',
          'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
          'Origin': 'https://itmsgroup.com.au',
          'User-Agent': 'WebSocket-Monitor/1.0'
        }
      }, (res) => {
        resolve({
          success: res.statusCode === 101,
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          websocketSupported: res.statusCode === 101
        });
      });
      
      req.on('error', (err) => {
        resolve({
          success: false,
          error: err.message
        });
      });
      
      req.setTimeout(5000, () => {
        req.destroy();
        resolve({
          success: false,
          error: 'timeout'
        });
      });
      
      req.end();
    });
  }

  async testWebSocketConnection() {
    if (!this.lastStatus?.websocketSupported) {
      return { success: false, reason: 'http_upgrade_not_supported' };
    }

    return new Promise((resolve) => {
      const ws = new WebSocket(this.wsUrl);
      
      const timeout = setTimeout(() => {
        ws.terminate();
        resolve({ success: false, error: 'connection_timeout' });
      }, 5000);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        ws.close();
        resolve({ success: true });
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        resolve({ success: false, error: error.message });
      });
    });
  }

  detectStatusChange(newStatus) {
    if (!this.lastStatus) {
      this.log(`Initial status: ${newStatus.success ? 'WebSocket Working' : 'WebSocket Not Working'}`, 'monitor');
      return false;
    }

    const wasWorking = this.lastStatus.success;
    const isWorking = newStatus.success;
    
    if (wasWorking !== isWorking) {
      if (isWorking) {
        this.log('🎉 WEBSOCKET NOW WORKING! Configuration change detected!', 'success');
        this.log('Your Cloudflare/server configuration change was successful!', 'success');
        
        // Alert with sound (if possible)
        process.stdout.write('\x07'); // Bell character
        
        return true;
      } else {
        this.log('⚠️ WebSocket stopped working - configuration may have been reverted', 'warning');
        return true;
      }
    }

    // Check for status code changes
    if (this.lastStatus.status !== newStatus.status) {
      this.log(`Status code changed: ${this.lastStatus.status} → ${newStatus.status}`, 'change');
      return true;
    }

    return false;
  }

  updateCounters(status) {
    if (status.success) {
      this.consecutiveSuccesses++;
      this.consecutiveFailures = 0;
    } else {
      this.consecutiveFailures++;
      this.consecutiveSuccesses = 0;
    }
  }

  async performCheck() {
    try {
      // Test HTTP upgrade
      const httpStatus = await this.testWebSocketUpgrade();
      
      // Test actual WebSocket connection if HTTP upgrade succeeds
      let wsStatus = { success: false, reason: 'http_upgrade_failed' };
      if (httpStatus.websocketSupported) {
        wsStatus = await this.testWebSocketConnection();
      }

      const overallStatus = {
        timestamp: new Date().toISOString(),
        success: httpStatus.websocketSupported && wsStatus.success,
        http: httpStatus,
        websocket: wsStatus
      };

      // Detect and log changes
      const hasChanged = this.detectStatusChange(overallStatus);
      
      if (hasChanged) {
        this.log('📊 Status Details:', 'info');
        this.log(`  HTTP Status: ${httpStatus.status} ${httpStatus.statusText}`, 'info');
        if (httpStatus.headers['cf-ray']) {
          this.log(`  Cloudflare Ray: ${httpStatus.headers['cf-ray']}`, 'info');
        }
        if (wsStatus.error) {
          this.log(`  WebSocket Error: ${wsStatus.error}`, 'info');
        }
      }

      this.updateCounters(overallStatus);
      this.lastStatus = overallStatus;

      // Log periodic status (every 10 checks if no changes)
      if (!hasChanged && (this.consecutiveFailures + this.consecutiveSuccesses) % 10 === 0) {
        this.log(`Still monitoring... (${this.consecutiveFailures + this.consecutiveSuccesses} checks, status: ${overallStatus.success ? 'working' : 'not working'})`, 'monitor');
      }

    } catch (error) {
      this.log(`Monitor error: ${error.message}`, 'error');
    }
  }

  start() {
    if (this.running) {
      this.log('Monitor already running', 'warning');
      return;
    }

    this.running = true;
    this.log('🚀 Starting WebSocket monitor...', 'monitor');
    this.log(`Monitoring: ${this.url}`, 'info');
    this.log(`Check interval: ${this.interval / 1000} seconds`, 'info');
    this.log('Press Ctrl+C to stop\n', 'info');

    // Initial check
    this.performCheck();

    // Set up interval
    this.intervalId = setInterval(() => {
      this.performCheck();
    }, this.interval);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.stop();
    });
  }

  stop() {
    if (!this.running) return;

    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.log('\n🛑 Monitor stopped', 'monitor');
    this.log(`Total checks performed: ${this.consecutiveFailures + this.consecutiveSuccesses}`, 'info');
    
    if (this.lastStatus?.success) {
      this.log('Final status: ✅ WebSocket working', 'success');
    } else {
      this.log('Final status: ❌ WebSocket not working', 'error');
    }

    process.exit(0);
  }

  async runSingleCheck() {
    this.log('🔍 Running single WebSocket check...', 'monitor');
    await this.performCheck();
    
    if (this.lastStatus?.success) {
      this.log('\n✅ RESULT: WebSocket is working!', 'success');
      this.log('Your app can use real-time WebSocket features.', 'success');
    } else {
      this.log('\n❌ RESULT: WebSocket is not working', 'error');
      this.log('Continue using HTTP polling for real-time features.', 'error');
      
      if (this.lastStatus?.http?.status === 400) {
        this.log('\n💡 TO FIX: Enable WebSocket in Cloudflare dashboard', 'info');
      } else if (this.lastStatus?.http?.status === 500) {
        this.log('\n💡 TO FIX: Configure Odoo server WebSocket support', 'info');
      }
    }
  }
}

// Command line interface
const args = process.argv.slice(2);
const monitor = new WebSocketMonitor();

if (args.includes('--help') || args.includes('-h')) {
  console.log('\n📖 WebSocket Monitor Usage:');
  console.log('===========================');
  console.log('node websocket_monitor.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --monitor, -m    Start continuous monitoring (default)');
  console.log('  --check, -c      Run single check and exit');
  console.log('  --interval, -i   Set check interval in seconds (default: 30)');
  console.log('  --help, -h       Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node websocket_monitor.js --check          # Single check');
  console.log('  node websocket_monitor.js --monitor        # Continuous monitoring');
  console.log('  node websocket_monitor.js -i 10           # Monitor every 10 seconds');
  console.log('');
  process.exit(0);
}

// Parse interval option
const intervalIndex = args.findIndex(arg => arg === '--interval' || arg === '-i');
if (intervalIndex !== -1 && args[intervalIndex + 1]) {
  const interval = parseInt(args[intervalIndex + 1]);
  if (interval > 0) {
    monitor.interval = interval * 1000;
  }
}

// Determine mode
if (args.includes('--check') || args.includes('-c')) {
  monitor.runSingleCheck();
} else {
  monitor.start();
}

module.exports = WebSocketMonitor;
