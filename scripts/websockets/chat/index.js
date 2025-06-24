/**
 * Chat Services - Centralized export for all chat functionality
 * Provides real-time messaging, message processing, and background sync
 */

import chatService from './ChatService';
import messageProcessor from './MessageProcessor';
import syncService from './SyncService';

/**
 * Initialize all chat services
 */
export const initializeChatServices = async () => {
  try {
    console.log('🚀 Initializing all chat services...');
    
    // Initialize in order: Chat Service (includes cache & websocket) -> Sync Service
    await chatService.initialize();
    await syncService.initialize();
    
    console.log('✅ All chat services initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize chat services:', error);
    throw error;
  }
};

/**
 * Get comprehensive chat status
 */
export const getChatStatus = () => {
  try {
    return {
      chat: chatService.getStatus(),
      sync: syncService.getSyncStatus(),
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('❌ Failed to get chat status:', error);
    return null;
  }
};

/**
 * Cleanup all chat services
 */
export const cleanupChatServices = async () => {
  try {
    console.log('🧹 Cleaning up all chat services...');
    
    await Promise.all([
      syncService.stop(),
      chatService.cleanup()
    ]);
    
    console.log('✅ All chat services cleaned up');
    return true;
  } catch (error) {
    console.error('❌ Failed to cleanup chat services:', error);
    throw error;
  }
};

// Export individual services
export {
  chatService,
  messageProcessor,
  syncService
};

// Export default as main chat manager
export default {
  initialize: initializeChatServices,
  getStatus: getChatStatus,
  cleanup: cleanupChatServices,
  chat: chatService,
  processor: messageProcessor,
  sync: syncService
};
