import webSocketManager from '../websocket/WebSocketManager';
import cacheManager from '../cache';
import { odooAPI } from '../../api/odooClient';
import { getConfig } from '../../config/cacheConfig';

/**
 * Chat Service - Main orchestrator for real-time chat functionality
 * Combines WebSocket real-time updates with cache persistence and REST API sync
 */
class ChatService {
  constructor() {
    this.isInitialized = false;
    this.activeChannels = new Map(); // channelId -> channel data
    this.eventListeners = new Map(); // event -> callbacks
    this.syncQueue = new Set(); // Messages pending sync
    this.syncInProgress = false;
    
    // Load configuration
    this.config = getConfig('sync');
    
    // Circuit breaker for resilience
    this.circuitBreaker = {
      failures: 0,
      lastFailureTime: null,
      state: 'closed', // closed, open, half-open
      threshold: 3,
      cooldownMs: 30000 // 30 seconds
    };

    // Performance tracking
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      syncOperations: 0,
      cacheHits: 0,
      errors: 0,
      lastActivity: null,
      circuitBreakerTrips: 0
    };
  }

  /**
   * Initialize chat service
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('💬 Chat service already initialized');
      return true;
    }

    try {
      console.log('💬 Initializing Chat Service...');
      
      // Initialize dependencies in order
      await cacheManager.initialize();
      await webSocketManager.initialize();
      
      // Set up event listeners
      this.setupWebSocketListeners();
      this.setupCacheListeners();
      
      // Start background sync
      this.startBackgroundSync();
      
      this.isInitialized = true;
      console.log('✅ Chat Service initialized successfully');
      
      this.emit('initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Chat Service:', error);
      this.emit('error', { type: 'initialization', error });
      return false;
    }
  }

  /**
   * Set up WebSocket event listeners
   */
  setupWebSocketListeners() {
    // Handle incoming real-time messages
    webSocketManager.on('messageReceived', async (message) => {
      await this.handleIncomingMessage(message);
    });

    // Handle connection state changes
    webSocketManager.on('connectionChanged', (state) => {
      this.emit('connectionChanged', state);
      
      if (state === 'connected') {
        // Sync pending messages when reconnected
        this.syncPendingMessages();
      }
    });

    // Handle typing indicators
    webSocketManager.on('typingChanged', (data) => {
      this.emit('typingChanged', data);
    });

    // Handle presence updates
    webSocketManager.on('presenceChanged', (data) => {
      this.emit('presenceChanged', data);
    });
  }

  /**
   * Set up cache event listeners
   */
  setupCacheListeners() {
    // Check if cacheManager has event listener methods
    if (cacheManager && typeof cacheManager.on === 'function') {
      // Handle cache errors
      cacheManager.on('error', (error) => {
        console.error('💬 Cache error in Chat Service:', error);
        this.stats.errors++;
      });
    } else {
      console.log('💬 Cache manager does not support event listeners, skipping setup');
    }
  }

  /**
   * Join a chat channel
   */
  async joinChannel(channelId, channelData = {}) {
    try {
      console.log(`💬 Joining channel ${channelId}...`);
      
      // Subscribe to WebSocket updates
      webSocketManager.subscribeToChannel(channelId);
      
      // Store channel data
      this.activeChannels.set(channelId, {
        id: channelId,
        ...channelData,
        joinedAt: Date.now()
      });
      
      // Load recent messages from cache
      const cachedMessages = await cacheManager.messages.getMessages(channelId, {
        limit: this.config.batchSyncSize
      });
      
      // If cache is empty or stale, fetch from API
      if (cachedMessages.length === 0) {
        await this.syncChannelMessages(channelId);
      }
      
      console.log(`✅ Joined channel ${channelId}`);
      this.emit('channelJoined', { channelId, messages: cachedMessages });
      
      return cachedMessages;
    } catch (error) {
      console.error(`❌ Failed to join channel ${channelId}:`, error);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Leave a chat channel
   */
  async leaveChannel(channelId) {
    try {
      console.log(`💬 Leaving channel ${channelId}...`);
      
      // Unsubscribe from WebSocket updates
      webSocketManager.unsubscribeFromChannel(channelId);
      
      // Remove from active channels
      this.activeChannels.delete(channelId);
      
      console.log(`✅ Left channel ${channelId}`);
      this.emit('channelLeft', { channelId });
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to leave channel ${channelId}:`, error);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Check circuit breaker state
   */
  checkCircuitBreaker() {
    if (this.circuitBreaker.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.circuitBreaker.lastFailureTime;
      if (timeSinceLastFailure < this.circuitBreaker.cooldownMs) {
        throw new Error('Service temporarily unavailable - circuit breaker open');
      } else {
        this.circuitBreaker.state = 'half-open';
        console.log('🔄 Circuit breaker moved to half-open state');
      }
    }
  }

  /**
   * Handle circuit breaker success
   */
  handleCircuitBreakerSuccess() {
    if (this.circuitBreaker.failures > 0) {
      console.log('✅ Circuit breaker reset - service recovered');
    }
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.state = 'closed';
  }

  /**
   * Handle circuit breaker failure
   */
  handleCircuitBreakerFailure(error) {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
      this.circuitBreaker.state = 'open';
      this.stats.circuitBreakerTrips++;
      console.warn(`⚠️ Circuit breaker opened after ${this.circuitBreaker.failures} failures`);
    }
  }

  /**
   * Send a message with optimistic UI and circuit breaker protection
   */
  async sendMessage(channelId, content, options = {}) {
    try {
      // Check circuit breaker
      this.checkCircuitBreaker();
      const {
        messageType = 'text',
        attachments = null,
        replyToId = null
      } = options;

      // Create optimistic message
      const optimisticMessage = {
        local_id: `temp_${Date.now()}_${Math.random()}`,
        channel_id: channelId,
        content: content,
        author_id: webSocketManager.services.websocket.userId,
        author_name: 'You', // Will be updated with real user data
        created_at: new Date().toISOString(),
        message_type: messageType,
        attachment_ids: attachments,
        is_optimistic: true,
        sync_status: 'pending',
        reply_to_id: replyToId
      };

      // Store optimistic message in cache immediately
      await cacheManager.messages.storeMessage(optimisticMessage);
      
      // Emit optimistic message for immediate UI update
      this.emit('messageAdded', {
        channelId,
        message: optimisticMessage,
        isOptimistic: true
      });

      // Send via WebSocket if connected
      const wsStatus = webSocketManager.getStatus();
      if (wsStatus.websocket.isConnected) {
        try {
          // Send real-time message
          webSocketManager.sendMessage('send_message', {
            channel_id: channelId,
            content: content,
            message_type: messageType,
            reply_to_id: replyToId,
            local_id: optimisticMessage.local_id
          });
          
          console.log(`💬 Message sent via WebSocket: ${optimisticMessage.local_id}`);
        } catch (wsError) {
          console.warn('⚠️ WebSocket send failed, will sync via API:', wsError);
          this.syncQueue.add(optimisticMessage.local_id);
        }
      } else {
        // Add to sync queue for later
        this.syncQueue.add(optimisticMessage.local_id);
        console.log(`💬 Message queued for sync: ${optimisticMessage.local_id}`);
      }

      this.stats.messagesSent++;
      this.stats.lastActivity = Date.now();

      // Circuit breaker success
      this.handleCircuitBreakerSuccess();

      return optimisticMessage;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      this.stats.errors++;

      // Circuit breaker failure
      this.handleCircuitBreakerFailure(error);

      throw error;
    }
  }

  /**
   * Handle incoming real-time message
   */
  async handleIncomingMessage(message) {
    try {
      // Check if this is a confirmation of our own optimistic message
      if (message.local_id) {
        // Update optimistic message with server data
        await cacheManager.messages.updateMessageSyncStatus(
          message.local_id,
          'synced',
          message.id
        );
        
        // Remove from sync queue
        this.syncQueue.delete(message.local_id);
        
        console.log(`💬 Optimistic message confirmed: ${message.local_id} -> ${message.id}`);
        
        this.emit('messageConfirmed', {
          channelId: message.channel_id,
          localId: message.local_id,
          serverId: message.id,
          message: message
        });
      } else {
        // Store new incoming message
        await cacheManager.messages.storeMessage({
          ...message,
          sync_status: 'synced'
        });
        
        console.log(`💬 New message received: ${message.id} in channel ${message.channel_id}`);
        
        this.emit('messageAdded', {
          channelId: message.channel_id,
          message: message,
          isOptimistic: false
        });
      }

      this.stats.messagesReceived++;
      this.stats.lastActivity = Date.now();
    } catch (error) {
      console.error('❌ Failed to handle incoming message:', error);
      this.stats.errors++;
    }
  }

  /**
   * Load more messages for infinite scroll
   */
  async loadMoreMessages(channelId, options = {}) {
    try {
      const {
        beforeMessageId = null,
        limit = this.config.batchSyncSize
      } = options;

      // First try to load from cache
      const cachedMessages = await cacheManager.messages.getMessages(channelId, {
        beforeMessageId,
        limit,
        includeOptimistic: false
      });

      // If we got a full page from cache, return it
      if (cachedMessages.length === limit) {
        this.stats.cacheHits++;
        return cachedMessages;
      }

      // Otherwise, fetch more from API
      const apiMessages = await this.fetchMessagesFromAPI(channelId, {
        beforeMessageId,
        limit
      });

      // Store new messages in cache
      if (apiMessages.length > 0) {
        await cacheManager.messages.storeMessages(apiMessages);
      }

      // Return combined results
      const allMessages = [...cachedMessages];
      
      // Add API messages that aren't already in cache
      for (const apiMessage of apiMessages) {
        if (!allMessages.find(m => m.id === apiMessage.id)) {
          allMessages.push(apiMessage);
        }
      }

      console.log(`💬 Loaded ${allMessages.length} more messages for channel ${channelId}`);
      return allMessages;
    } catch (error) {
      console.error('❌ Failed to load more messages:', error);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Fetch messages from REST API
   */
  async fetchMessagesFromAPI(channelId, options = {}) {
    try {
      const {
        beforeMessageId = null,
        limit = this.config.batchSyncSize
      } = options;

      // Build API query - use correct mail.message fields
      const domain = [
        ['model', '=', 'discuss.channel'],
        ['res_id', '=', parseInt(channelId)]
      ];
      if (beforeMessageId) {
        domain.push(['id', '<', beforeMessageId]);
      }

      const messages = await odooAPI.searchRead(
        'mail.message',
        domain,
        ['id', 'body', 'author_id', 'date', 'message_type', 'attachment_ids'],
        {
          order: 'date desc',
          limit: limit
        }
      );

      // Transform API response to our format
      return messages.map(msg => ({
        id: msg.id,
        channel_id: channelId,
        content: msg.body,
        author_id: Array.isArray(msg.author_id) ? msg.author_id[0] : msg.author_id,
        author_name: Array.isArray(msg.author_id) ? msg.author_id[1] : 'Unknown',
        created_at: msg.date,
        message_type: msg.message_type || 'text',
        attachment_ids: msg.attachment_ids || null,
        sync_status: 'synced'
      }));
    } catch (error) {
      console.error('❌ Failed to fetch messages from API:', error);
      throw error;
    }
  }

  /**
   * Sync channel messages from API
   */
  async syncChannelMessages(channelId) {
    try {
      console.log(`💬 Syncing messages for channel ${channelId}...`);
      
      const messages = await this.fetchMessagesFromAPI(channelId, {
        limit: this.config.batchSyncSize * 2 // Get more for initial sync
      });

      if (messages.length > 0) {
        await cacheManager.messages.storeMessages(messages);
        console.log(`✅ Synced ${messages.length} messages for channel ${channelId}`);
      }

      this.stats.syncOperations++;
      return messages;
    } catch (error) {
      console.error(`❌ Failed to sync channel ${channelId}:`, error);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Start background sync for pending messages
   */
  startBackgroundSync() {
    // Clear any existing interval
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }

    // Use a safer approach with setTimeout recursion to avoid threading issues
    const scheduleNextSync = () => {
      this.syncTimeoutId = setTimeout(async () => {
        try {
          if (!this.syncInProgress && this.syncQueue.size > 0) {
            await this.syncPendingMessages();
          }
        } catch (error) {
          console.warn('Background sync error:', error);
        } finally {
          // Schedule next sync
          if (this.isInitialized) {
            scheduleNextSync();
          }
        }
      }, this.config.syncInterval);
    };

    scheduleNextSync();
  }

  /**
   * Sync pending messages to server
   */
  async syncPendingMessages() {
    if (this.syncInProgress) return;
    
    try {
      this.syncInProgress = true;
      console.log(`💬 Syncing ${this.syncQueue.size} pending messages...`);
      
      const pendingMessages = await cacheManager.messages.getPendingMessages();
      
      for (const message of pendingMessages) {
        try {
          // Send via REST API - use correct mail.message fields
          const result = await odooAPI.create('mail.message', {
            body: message.content,
            model: 'discuss.channel',
            res_id: parseInt(message.channel_id),
            message_type: message.message_type,
            reply_to_id: message.reply_to_id
          });

          // Update cache with server ID
          await cacheManager.messages.updateMessageSyncStatus(
            message.local_id || message.id,
            'synced',
            result.id
          );

          // Remove from sync queue
          this.syncQueue.delete(message.local_id || message.id);
          
          console.log(`✅ Synced message: ${message.local_id} -> ${result.id}`);
        } catch (error) {
          console.error(`❌ Failed to sync message ${message.local_id}:`, error);
          
          // Mark as failed
          await cacheManager.messages.updateMessageSyncStatus(
            message.local_id || message.id,
            'failed'
          );
        }
      }

      this.stats.syncOperations++;
    } catch (error) {
      console.error('❌ Background sync failed:', error);
      this.stats.errors++;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Start typing in channel
   */
  startTyping(channelId) {
    webSocketManager.startTyping(channelId);
  }

  /**
   * Stop typing in channel
   */
  stopTyping(channelId) {
    webSocketManager.stopTyping(channelId);
  }

  /**
   * Track users for presence
   */
  trackUsersPresence(userIds) {
    webSocketManager.trackUsersPresence(userIds);
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      activeChannels: this.activeChannels.size,
      syncQueueSize: this.syncQueue.size,
      syncInProgress: this.syncInProgress,
      webSocket: webSocketManager.getStatus(),
      cache: cacheManager.getStats(),
      stats: this.stats
    };
  }

  /**
   * Event listener management
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in chat listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Cleanup and disconnect
   */
  async cleanup() {
    try {
      console.log('💬 Cleaning up Chat Service...');
      
      // Leave all active channels
      for (const channelId of this.activeChannels.keys()) {
        await this.leaveChannel(channelId);
      }
      
      // Sync any remaining pending messages
      if (this.syncQueue.size > 0) {
        await this.syncPendingMessages();
      }
      
      // Cleanup dependencies
      await webSocketManager.disconnect();
      await cacheManager.cleanup();
      
      this.isInitialized = false;
      this.eventListeners.clear();
      
      console.log('✅ Chat Service cleaned up');
      this.emit('cleanup');
    } catch (error) {
      console.error('❌ Failed to cleanup Chat Service:', error);
    }
  }
}

// Create singleton instance
const chatService = new ChatService();

export default chatService;
