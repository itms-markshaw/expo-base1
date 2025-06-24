/**
 * Test HTTP Longpolling Implementation
 * Run this to test the new longpolling service
 */

import { longpollingService } from './src/services/odooLongpolling';
import { chatService } from './src/services/chat';
import { authService } from './src/services/auth';

async function testLongpolling() {
  console.log('🧪 Testing HTTP Longpolling Implementation...');
  
  try {
    // Initialize auth first
    console.log('1. Initializing authentication...');
    const authSuccess = await authService.initialize();
    if (!authSuccess) {
      console.error('❌ Authentication failed');
      return;
    }
    console.log('✅ Authentication successful');
    
    // Initialize chat service (which will start longpolling)
    console.log('2. Initializing chat service...');
    const chatSuccess = await chatService.initialize();
    if (!chatSuccess) {
      console.error('❌ Chat service initialization failed');
      return;
    }
    console.log('✅ Chat service initialized');
    
    // Check longpolling status
    console.log('3. Checking longpolling status...');
    const status = longpollingService.getStatus();
    console.log('📊 Longpolling status:', status);
    
    // Subscribe to a test channel
    console.log('4. Subscribing to test channel...');
    const testChannelId = 101; // Use channel from your logs
    chatService.subscribeToChannel(testChannelId);
    
    // Listen for real-time events
    chatService.on('newMessage', (data) => {
      console.log('🎉 REAL-TIME MESSAGE RECEIVED:', data);
    });
    
    chatService.on('connectionChanged', (status) => {
      console.log('🔄 Connection status changed:', status);
    });
    
    console.log('✅ Test setup complete!');
    console.log('📡 Now monitoring for real-time messages...');
    console.log('💬 Send a message in the web interface to test!');
    
    // Keep running for 2 minutes
    setTimeout(() => {
      console.log('⏰ Test completed');
      const finalStatus = longpollingService.getStatus();
      console.log('📊 Final status:', finalStatus);
      process.exit(0);
    }, 120000); // 2 minutes
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test
testLongpolling().catch(console.error);
