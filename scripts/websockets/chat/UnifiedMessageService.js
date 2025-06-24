import discussAPI from '../../api/models/discussApi';
import chatHistoryService from './ChatHistoryService';
import cacheManager from '../cache';

/**
 * Unified Message Service - Single abstraction layer for all message operations
 * Eliminates redundant code patterns and provides graceful fallback
 */
class UnifiedMessageService {
  constructor() {
    this.implementation = null;
    this.fallbackImplementation = null;
    this.isInitialized = false;
    this.initializationAttempted = false;
    
    // Service capabilities
    this.capabilities = {
      realTimeMessaging: false,
      optimisticUI: false,
      backgroundSync: false,
      smartCaching: false,
      typingIndicators: false
    };
    
    // Performance tracking
    this.stats = {
      messagesLoaded: 0,
      messagesSent: 0,
      cacheHits: 0,
      apiCalls: 0,
      fallbackUsed: 0,
      errors: 0
    };
  }

  /**
   * Initialize with graceful fallback strategy
   */
  async initialize() {
    if (this.initializationAttempted) {
      return this.isInitialized;
    }
    
    this.initializationAttempted = true;
    
    try {
      console.log('🔧 Initializing Unified Message Service...');
      
      // Try enhanced implementation first
      await this.initializeEnhancedService();
      
      // Always initialize fallback
      await this.initializeFallbackService();
      
      this.isInitialized = true;
      console.log('✅ Unified Message Service initialized');
      console.log('📊 Capabilities:', this.capabilities);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Unified Message Service:', error);
      
      // Try fallback only
      try {
        await this.initializeFallbackService();
        this.isInitialized = true;
        console.log('⚠️ Initialized with fallback only');
        return true;
      } catch (fallbackError) {
        console.error('❌ Fallback initialization also failed:', fallbackError);
        return false;
      }
    }
  }

  /**
   * Initialize enhanced chat services
   */
  async initializeEnhancedService() {
    try {
      console.log('🚀 Attempting enhanced service initialization...');

      // Initialize cache manager first (optional)
      try {
        await cacheManager.initialize();
        console.log('✅ Cache manager initialized');
      } catch (cacheError) {
        console.warn('⚠️ Cache manager failed, continuing without cache:', cacheError.message);
      }

      // Initialize chat history service (optional)
      try {
        await chatHistoryService.initialize();
        console.log('✅ Chat history service initialized');
      } catch (historyError) {
        console.warn('⚠️ Chat history service failed, continuing without history:', historyError.message);
      }

      // Note: WebSocket initialization is handled separately and is optional
      // We don't initialize WebSocket here to avoid the baseURL null error

      this.implementation = 'enhanced';
      this.capabilities = {
        realTimeMessaging: false, // Will be enabled when WebSocket is available
        optimisticUI: true,
        backgroundSync: true,
        smartCaching: true,
        typingIndicators: false // Will be enabled when WebSocket is available
      };

      console.log('✅ Enhanced service initialized successfully (WebSocket disabled)');
    } catch (error) {
      console.warn('⚠️ Enhanced service initialization failed:', error.message);
      this.implementation = null;
      throw error;
    }
  }

  /**
   * Initialize fallback service (always works)
   */
  async initializeFallbackService() {
    try {
      console.log('🔄 Initializing fallback service...');
      
      this.fallbackImplementation = 'legacy';
      
      // Test legacy API
      // await discussAPI.testConnection(); // Uncomment if you have this method
      
      console.log('✅ Fallback service ready');
    } catch (error) {
      console.error('❌ Fallback service failed:', error);
      throw error;
    }
  }

  /**
   * Get messages with intelligent routing
   */
  async getMessages(channelId, options = {}) {
    try {
      if (this.implementation === 'enhanced') {
        return await this.getMessagesEnhanced(channelId, options);
      } else {
        return await this.getMessagesLegacy(channelId, options);
      }
    } catch (error) {
      console.error('❌ Primary getMessages failed, trying fallback:', error);
      this.stats.fallbackUsed++;
      
      if (this.implementation === 'enhanced') {
        // Fallback to legacy
        return await this.getMessagesLegacy(channelId, options);
      } else {
        throw error;
      }
    }
  }

  /**
   * Enhanced message loading
   */
  async getMessagesEnhanced(channelId, options = {}) {
    const { 
      forceRefresh = false, 
      loadMore = false,
      limit = 50 
    } = options;

    try {
      if (loadMore) {
        const messages = await chatHistoryService.loadMoreHistory(channelId, {
          loadSize: limit,
          beforeMessageId: options.beforeMessageId
        });
        this.stats.messagesLoaded += messages.length;
        this.stats.cacheHits++;
        return messages;
      } else {
        const messages = await chatHistoryService.loadInitialHistory(channelId, {
          loadSize: limit,
          forceRefresh
        });
        this.stats.messagesLoaded += messages.length;
        this.stats.apiCalls++;
        return messages;
      }
    } catch (error) {
      console.error('❌ Enhanced getMessages failed:', error);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Legacy message loading
   */
  async getMessagesLegacy(channelId, options = {}) {
    const { 
      forceRefresh = false, 
      loadMore = false,
      limit = 50,
      offset = 0 
    } = options;

    try {
      const messages = await discussAPI.getChannelMessages(channelId, forceRefresh, {
        limit,
        offset: loadMore ? offset : 0
      });
      
      this.stats.messagesLoaded += messages.length;
      this.stats.apiCalls++;
      return messages || [];
    } catch (error) {
      console.error('❌ Legacy getMessages failed:', error);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Send message with intelligent routing
   */
  async sendMessage(channelId, content, options = {}) {
    try {
      if (this.implementation === 'enhanced') {
        return await this.sendMessageEnhanced(channelId, content, options);
      } else {
        return await this.sendMessageLegacy(channelId, content, options);
      }
    } catch (error) {
      console.error('❌ Primary sendMessage failed, trying fallback:', error);
      this.stats.fallbackUsed++;
      
      if (this.implementation === 'enhanced') {
        // Fallback to legacy
        return await this.sendMessageLegacy(channelId, content, options);
      } else {
        throw error;
      }
    }
  }

  /**
   * Enhanced message sending (placeholder for future implementation)
   */
  async sendMessageEnhanced(channelId, content, options = {}) {
    try {
      // For now, use legacy API but with enhanced error handling
      const result = await discussAPI.sendChannelMessage(channelId, content);
      this.stats.messagesSent++;
      return result;
    } catch (error) {
      console.error('❌ Enhanced sendMessage failed:', error);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Legacy message sending
   */
  async sendMessageLegacy(channelId, content, options = {}) {
    try {
      const result = await discussAPI.sendChannelMessage(channelId, content);
      this.stats.messagesSent++;
      return result;
    } catch (error) {
      console.error('❌ Legacy sendMessage failed:', error);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Cache messages (enhanced only)
   */
  async cacheMessages(messages) {
    if (this.implementation === 'enhanced') {
      try {
        await cacheManager.messages.storeMessages(messages);
        return true;
      } catch (error) {
        console.warn('⚠️ Failed to cache messages:', error);
        return false;
      }
    }
    return false; // Legacy doesn't support caching
  }

  /**
   * Get service capabilities
   */
  getCapabilities() {
    return { ...this.capabilities };
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      ...this.stats,
      implementation: this.implementation,
      fallbackAvailable: !!this.fallbackImplementation,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.isInitialized && (this.implementation || this.fallbackImplementation);
  }

  /**
   * Get current implementation type
   */
  getImplementationType() {
    return this.implementation || this.fallbackImplementation || 'none';
  }

  /**
   * Force fallback to legacy (for testing)
   */
  forceFallback() {
    console.log('🔄 Forcing fallback to legacy implementation');
    this.implementation = null;
    this.capabilities = {
      realTimeMessaging: false,
      optimisticUI: false,
      backgroundSync: false,
      smartCaching: false,
      typingIndicators: false
    };
  }

  /**
   * Enable WebSocket features for real-time functionality
   */
  enableWebSocketFeatures(webSocketManager) {
    try {
      console.log('🔌 Enabling WebSocket features in UnifiedMessageService...');

      this.webSocketManager = webSocketManager;

      // Enable real-time capabilities
      this.capabilities.realTimeMessaging = true;
      this.capabilities.typingIndicators = true;

      console.log('✅ WebSocket features enabled successfully');
      console.log('🎯 Available capabilities:', this.capabilities);

      return true;
    } catch (error) {
      console.error('❌ Failed to enable WebSocket features:', error);
      return false;
    }
  }

  /**
   * Reset service (for testing)
   */
  reset() {
    this.implementation = null;
    this.fallbackImplementation = null;
    this.isInitialized = false;
    this.initializationAttempted = false;
    this.webSocketManager = null; // Reset WebSocket manager
    this.stats = {
      messagesLoaded: 0,
      messagesSent: 0,
      cacheHits: 0,
      apiCalls: 0,
      fallbackUsed: 0,
      errors: 0
    };
  }
}

// Create singleton instance
const unifiedMessageService = new UnifiedMessageService();

export default unifiedMessageService;
