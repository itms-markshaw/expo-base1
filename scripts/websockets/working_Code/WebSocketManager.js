import odooWebSocketService from './OdooWebSocketService';
import typingService from './TypingService';
import presenceService from './PresenceService';

/**
 * WebSocket Manager - Orchestrates all real-time services
 * Provides a unified interface for chat, presence, and typing features
 */
class WebSocketManager {
  constructor() {
    this.isInitialized = false;
    this.services = {
      websocket: odooWebSocketService,
      typing: typingService,
      presence: presenceService
    };
    
    // Service status tracking
    this.serviceStatus = {
      websocket: 'disconnected',
      typing: 'inactive',
      presence: 'inactive'
    };
    
    // Event listeners
    this.eventListeners = new Map();
    
    // Performance metrics
    this.metrics = {
      initTime: null,
      connectionTime: null,
      messagesReceived: 0,
      messagesSent: 0,
      reconnections: 0
    };
  }

  /**
   * Initialize all WebSocket services in the correct order
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('🔌 WebSocket Manager already initialized');
      return true;
    }

    try {
      const startTime = Date.now();
      console.log('🚀 Initializing WebSocket Manager...');

      // Step 1: Initialize core WebSocket service
      console.log('📡 Initializing WebSocket service...');
      const wsSuccess = await this.services.websocket.initialize();
      if (!wsSuccess) {
        throw new Error('Failed to initialize WebSocket service');
      }
      this.serviceStatus.websocket = 'connected';

      // Step 2: Initialize typing service (depends on WebSocket)
      console.log('⌨️ Initializing typing service...');
      await this.services.typing.initialize();
      this.serviceStatus.typing = 'active';

      // Step 3: Initialize presence service (depends on WebSocket)
      console.log('👁️ Initializing presence service...');
      await this.services.presence.initialize();
      this.serviceStatus.presence = 'active';

      // Set up cross-service event handling
      this.setupServiceEventHandlers();

      this.isInitialized = true;
      this.metrics.initTime = Date.now() - startTime;
      
      console.log(`✅ WebSocket Manager initialized successfully in ${this.metrics.initTime}ms`);
      this.emit('initialized', { 
        services: this.serviceStatus,
        initTime: this.metrics.initTime
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket Manager:', error);
      this.emit('error', { type: 'initialization', error });
      return false;
    }
  }

  /**
   * Set up event handlers between services
   */
  setupServiceEventHandlers() {
    // WebSocket connection events
    this.services.websocket.on('connected', () => {
      this.serviceStatus.websocket = 'connected';
      this.metrics.connectionTime = Date.now();
      this.emit('connectionChanged', 'connected');
    });

    this.services.websocket.on('disconnected', () => {
      this.serviceStatus.websocket = 'disconnected';
      this.emit('connectionChanged', 'disconnected');
    });

    this.services.websocket.on('error', (error) => {
      this.serviceStatus.websocket = 'error';
      this.emit('connectionChanged', 'error');
      this.emit('error', error);
    });

    // Message tracking for metrics
    this.services.websocket.on('newMessage', (message) => {
      this.metrics.messagesReceived++;
      this.emit('messageReceived', message);
    });

    // Typing events
    this.services.typing.on('typingChanged', (data) => {
      this.emit('typingChanged', data);
    });

    // Presence events
    this.services.presence.on('presence_updated', (data) => {
      this.emit('presenceChanged', data);
    });
  }

  /**
   * Subscribe to a chat channel
   */
  subscribeToChannel(channelId) {
    if (!this.isInitialized) {
      console.warn('⚠️ WebSocket Manager not initialized');
      return false;
    }

    try {
      // Subscribe to WebSocket channel
      this.services.websocket.subscribeToChannel(channelId);
      
      console.log(`📱 Subscribed to channel ${channelId}`);
      this.emit('channelSubscribed', { channelId });
      return true;
    } catch (error) {
      console.error(`❌ Failed to subscribe to channel ${channelId}:`, error);
      return false;
    }
  }

  /**
   * Unsubscribe from a chat channel
   */
  unsubscribeFromChannel(channelId) {
    if (!this.isInitialized) {
      console.warn('⚠️ WebSocket Manager not initialized');
      return false;
    }

    try {
      // Unsubscribe from WebSocket channel
      this.services.websocket.unsubscribeFromChannel(channelId);
      
      // Clear typing state for this channel
      this.services.typing.clearChannelTypingState(channelId);
      
      console.log(`👋 Unsubscribed from channel ${channelId}`);
      this.emit('channelUnsubscribed', { channelId });
      return true;
    } catch (error) {
      console.error(`❌ Failed to unsubscribe from channel ${channelId}:`, error);
      return false;
    }
  }

  /**
   * Start typing in a channel
   */
  startTyping(channelId) {
    if (!this.isInitialized) return false;
    
    this.services.typing.startTyping(channelId);
    return true;
  }

  /**
   * Stop typing in a channel
   */
  stopTyping(channelId) {
    if (!this.isInitialized) return false;
    
    this.services.typing.stopTyping(channelId);
    return true;
  }

  /**
   * Track users for presence updates
   */
  trackUsersPresence(userIds) {
    if (!this.isInitialized) return false;
    
    this.services.presence.trackUsers(userIds);
    return true;
  }

  /**
   * Update own presence status
   */
  async updatePresence(status = 'online') {
    if (!this.isInitialized) return false;
    
    return await this.services.presence.updatePresence(status);
  }

  /**
   * Get comprehensive status of all services
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      services: this.serviceStatus,
      websocket: this.services.websocket?.getConnectionStatus() || { isConnected: false },
      typing: this.services.typing?.getTypingStats() || { sent: 0, received: 0 },
      presence: {
        trackedUsers: this.services.presence?.trackedUsers?.size || 0,
        cacheSize: this.services.presence?.presenceMap?.size || 0
      },
      metrics: this.metrics
    };
  }

  /**
   * Send a message via WebSocket
   */
  sendMessage(eventName, data) {
    if (!this.isInitialized) return false;
    
    this.services.websocket.sendMessage(eventName, data);
    this.metrics.messagesSent++;
    return true;
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
          console.error(`Error in WebSocket Manager listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Cleanup and disconnect all services
   */
  async disconnect() {
    console.log('🔌 Disconnecting WebSocket Manager...');
    
    try {
      // Cleanup services in reverse order
      if (this.services.presence) {
        this.services.presence.disconnect();
        this.serviceStatus.presence = 'inactive';
      }
      
      if (this.services.typing) {
        this.services.typing.cleanup();
        this.serviceStatus.typing = 'inactive';
      }
      
      if (this.services.websocket) {
        this.services.websocket.disconnect();
        this.serviceStatus.websocket = 'disconnected';
      }
      
      this.isInitialized = false;
      this.eventListeners.clear();
      
      console.log('✅ WebSocket Manager disconnected');
      this.emit('disconnected');
      
    } catch (error) {
      console.error('❌ Error during WebSocket Manager disconnect:', error);
    }
  }
}

// Create singleton instance
const webSocketManager = new WebSocketManager();

export default webSocketManager;
