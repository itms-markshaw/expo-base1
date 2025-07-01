/**
 * Quick Debug Test for Real-time Chat Updates
 * Run this to test if the polling is finding new messages
 */

import { chatService } from '../src/services/chat';
import { longpollingService } from '../src/services/odooLongpolling';

async function testRealTimeUpdates() {
  console.log('🧪 Testing Real-time Chat Updates...');
  
  try {
    // Initialize chat
    console.log('1. Initializing chat service...');
    const chatSuccess = await chatService.initialize();
    if (!chatSuccess) {
      console.error('❌ Chat initialization failed');
      return;
    }
    
    // Get current status
    console.log('2. Checking service status...');
    const chatStatus = chatService.getStatus();
    const pollingStatus = longpollingService.getStatus();
    
    console.log('📊 Chat Service Status:', chatStatus);
    console.log('📊 Polling Service Status:', pollingStatus);
    
    // Subscribe to test channel
    const testChannelId = 101; // From your logs
    console.log(`3. Subscribing to channel ${testChannelId}...`);
    
    chatService.subscribeToChannel(testChannelId);
    
    // Listen for events
    let messageCount = 0;
    chatService.on('newMessages', (data) => {
      messageCount += data.messages.length;
      console.log(`🎉 REAL-TIME EVENT: Received ${data.messages.length} new messages (total: ${messageCount})`);
      console.log('📨 Message data:', data.messages.map(m => ({ id: m.id, body: m.body.substring(0, 50) })));
    });
    
    chatService.on('messagesUpdated', (data) => {
      console.log(`🔄 MESSAGES UPDATED EVENT: Channel ${data.channelId}`);
    });
    
    // Get current messages
    const currentMessages = chatService.getChannelMessages(testChannelId);
    console.log(`📨 Current messages in channel ${testChannelId}: ${currentMessages.length}`);
    
    console.log('✅ Test setup complete!');
    console.log('💬 Now send a message from the web interface to test real-time updates...');
    
    // Monitor for 30 seconds
    setTimeout(() => {
      console.log(`⏰ Test completed. Total messages received: ${messageCount}`);
      const finalMessages = chatService.getChannelMessages(testChannelId);
      console.log(`📊 Final message count in service: ${finalMessages.length}`);
    }, 30000);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export for manual testing
if (typeof window !== 'undefined') {
  window.testRealTimeUpdates = testRealTimeUpdates;
}

export { testRealTimeUpdates };
