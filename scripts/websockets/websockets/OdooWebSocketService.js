// OdooWebSocketService.js - Correct implementation for Odoo 18
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

/**
 * Odoo 18 WebSocket Service - Based on actual Odoo WebSocket implementation
 * Follows the bus/workers/websocket_worker.js pattern from Odoo 18
 */
class Odoo18WebSocketService {
  constructor() {
    this.websocket = null;
    this.websocketURL = null;
    this.currentUID = null;
    this.currentDB = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.isReconnecting = false;
    this.connectionState = 'IDLE'; // IDLE, CONNECTING, CONNECTED, DISCONNECTED
    
    // Configuration matching Odoo 18 implementation
    this.INITIAL_RECONNECT_DELAY = 1000;
    this.RECONNECT_JITTER = 1000;
    this.MAXIMUM_RECONNECT_DELAY = 60000;
    this.connectRetryDelay = this.INITIAL_RECONNECT_DELAY;
    
    // WebSocket close codes from Odoo 18
    this.WEBSOCKET_CLOSE_CODES = {
      CLEAN: 1000,
      GOING_AWAY: 1001,
      PROTOCOL_ERROR: 1002,
      INCORRECT_DATA: 1003,
      ABNORMAL_CLOSURE: 1006,
      INCONSISTENT_DATA: 1007,
      MESSAGE_VIOLATING_POLICY: 1008,
      MESSAGE_TOO_BIG: 1009,
      EXTENSION_NEGOTIATION_FAILED: 1010,
      SERVER_ERROR: 1011,
      RESTART: 1012,
      TRY_LATER: 1013,
      BAD_GATEWAY: 1014,
      SESSION_EXPIRED: 4001,
      KEEP_ALIVE_TIMEOUT: 4002,
      RECONNECTING: 4003,
    };
    
    // Channels and subscriptions
    this.channels = [];
    this.lastNotificationId = 0;
    this.messageWaitQueue = [];
    this.subscriptions = new Set();
    
    // Event listeners
    this.eventListeners = new Map();
    
    // App state handling
    this.appStateSubscription = null;
    this.setupAppStateHandling();
  }

  /**
   * Initialize WebSocket service with Odoo 18 bus system
   */
  async initialize() {
    try {
      console.log('🔌 Initializing Odoo 18 WebSocket Service...');
      
      // Load authentication data
      const success = await this.loadAuthData();
      if (!success) {
        console.warn('⚠️ No valid authentication data - WebSocket will be limited');
      }
      
      // Build WebSocket URL - this is key for Odoo 18
      this.buildWebSocketURL();
      
      // Connect to WebSocket
      await this.connect();
      
      console.log('✅ Odoo 18 WebSocket Service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket service:', error);
      this.emit('error', { type: 'initialization', error });
      return false;
    }
  }

  /**
   * Load authentication data and build proper WebSocket URL
   */
  async loadAuthData() {
    try {
      // Try unified auth session first (current system)
      let tokenData = await AsyncStorage.getItem('unified_auth_session');
      let parsedData = null;

      if (tokenData) {
        parsedData = JSON.parse(tokenData);
        console.log('🔍 Using unified auth session data');

        // Extract data from unified auth format
        if (parsedData.user && parsedData.sessionData) {
          this.currentUID = parsedData.user.uid || parsedData.user.id;
          this.currentDB = parsedData.user.database;
          this.serverURL = parsedData.user.serverUrl;
          this.sessionId = parsedData.sessionData.session_id;

          console.log('✅ Loaded auth from unified session:', {
            uid: this.currentUID,
            database: this.currentDB,
            serverUrl: this.serverURL
          });

          return true;
        }
      }

      // Fallback to legacy OAuth token data
      tokenData = await AsyncStorage.getItem('odooTokenData');
      if (!tokenData) {
        console.warn('⚠️ No OAuth2 token data found');
        return false;
      }

      parsedData = JSON.parse(tokenData);
      console.log('🔍 Using legacy OAuth token data');

      // Extract user ID from multiple possible locations
      this.currentUID = parsedData.userId ||
                       parsedData.user_id ||
                       parsedData.sessionInfo?.userId ||
                       parsedData.sessionInfo?.user_id;

      // Extract database from multiple possible locations
      this.currentDB = parsedData.sessionInfo?.database ||
                      parsedData.sessionInfo?.db ||
                      parsedData.database ||
                      parsedData.db;

      // Store authentication tokens for WebSocket headers
      this.accessToken = parsedData.access_token || parsedData.accessToken;
      this.sessionId = parsedData.sessionInfo?.sessionId ||
                      parsedData.sessionId ||
                      parsedData.session_id;

      // Extract server URL
      this.serverURL = parsedData.sessionInfo?.serverUrl ||
                      parsedData.serverConfig?.baseURL ||
                      parsedData.serverUrl ||
                      parsedData.baseURL ||
                      process.env.EXPO_PUBLIC_API_URL;

      if (!this.serverURL) {
        console.error('❌ No server URL found in auth data');
        return false;
      }

      console.log(`🔑 Loaded auth data for user ${this.currentUID} on database ${this.currentDB}`);
      console.log(`🔐 Authentication tokens available: Bearer=${!!this.accessToken}, Session=${!!this.sessionId}`);
      console.log(`🌐 Server URL: ${this.serverURL}`);
      return true;
    } catch (error) {
      console.error('❌ Error loading auth data:', error);
      return false;
    }
  }

  /**
   * Build WebSocket URL following Odoo 18 pattern
   */
  buildWebSocketURL() {
    if (!this.serverURL) {
      console.error('❌ Server URL not available for WebSocket connection');
      // Try to get from config as fallback
      this.serverURL = process.env.EXPO_PUBLIC_API_URL || 'https://itmsgroup.com.au';
      console.log('🔄 Using fallback server URL:', this.serverURL);
    }

    // Odoo 18 WebSocket URL pattern - try multiple potential endpoints
    const baseWsUrl = this.serverURL.replace(/^https?:\/\//, 'wss://');

    // Based on Odoo 18 source, these are the potential WebSocket endpoints
    this.potentialURLs = [
      `${baseWsUrl}/websocket`,           // Standard endpoint
      `${baseWsUrl}/longpolling/websocket`, // Longpolling endpoint
      `${baseWsUrl}/bus/websocket`,       // Bus endpoint
      `${baseWsUrl}/web/websocket`,       // Web endpoint
    ];

    // Start with the first URL
    this.websocketURL = this.potentialURLs[0];
    this.currentURLIndex = 0;

    console.log(`🌐 WebSocket URL built: ${this.websocketURL}`);
  }

  /**
   * Connect to WebSocket with Odoo 18 protocol
   */
  async connect() {
    if (this.isConnected || this.isConnecting) {
      console.log('🔌 Already connected or connecting');
      return;
    }

    if (!this.websocketURL) {
      throw new Error('WebSocket URL not built - call initialize() first');
    }

    try {
      this.isConnecting = true;
      this.connectionState = 'CONNECTING';
      this.emit('connectionStateChanged', 'CONNECTING');

      console.log(`🔌 Connecting to: ${this.websocketURL}`);

      // Prepare authentication headers for WebSocket connection
      const headers = {};

      // Add required Origin header (this was missing!)
      headers.Origin = this.serverURL;
      console.log(`🌐 Using Origin header: ${this.serverURL}`);

      if (this.accessToken) {
        headers.Authorization = `Bearer ${this.accessToken}`;
        console.log('🔐 Using Bearer token authentication');
      }

      if (this.sessionId) {
        headers.Cookie = `session_id=${this.sessionId}`;
        console.log('🍪 Using session cookie authentication');
      }

      // Add User-Agent for better compatibility
      headers['User-Agent'] = 'ExoMobile/1.0 (Odoo WebSocket Client)';

      // Create WebSocket connection with authentication headers
      this.websocket = new WebSocket(this.websocketURL, { headers });

      this.setupWebSocketHandlers();
      
      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (this.connectionState === 'CONNECTING') {
          console.error('❌ WebSocket connection timeout');
          this.handleConnectionError(new Error('Connection timeout'));
        }
      }, 15000);

      // Clear timeout on successful connection
      this.websocket.onopen = () => {
        clearTimeout(connectionTimeout);
        this.handleConnectionOpen();
      };

    } catch (error) {
      console.error('❌ WebSocket connection error:', error);
      this.handleConnectionError(error);
    }
  }

  /**
   * Setup WebSocket event handlers following Odoo 18 pattern
   */
  setupWebSocketHandlers() {
    this.websocket.onopen = () => this.handleConnectionOpen();
    this.websocket.onmessage = (event) => this.handleMessage(event);
    this.websocket.onclose = (event) => this.handleConnectionClose(event);
    this.websocket.onerror = (error) => this.handleConnectionError(error);
  }

  /**
   * Handle WebSocket connection open - Odoo 18 style
   */
  handleConnectionOpen() {
    console.log('🔗 WebSocket connected successfully');
    
    this.isConnected = true;
    this.isConnecting = false;
    this.connectionState = 'CONNECTED';
    this.connectRetryDelay = this.INITIAL_RECONNECT_DELAY;
    
    this.emit('connectionStateChanged', 'CONNECTED');
    this.emit(this.isReconnecting ? 'reconnect' : 'connect');
    
    // Subscribe to initial channels (following Odoo 18 pattern)
    this.subscribeToChannels();
    
    // Process queued messages
    this.processMessageQueue();
    
    this.isReconnecting = false;
  }

  /**
   * Handle incoming WebSocket messages - Odoo 18 notification format
   */
  handleMessage(messageEvent) {
    try {
      const notifications = JSON.parse(messageEvent.data);
      
      if (!Array.isArray(notifications)) {
        console.warn('⚠️ Received non-array notification:', notifications);
        return;
      }

      console.log(`📨 Received ${notifications.length} notifications`);
      
      // Update last notification ID (Odoo 18 pattern)
      if (notifications.length > 0) {
        this.lastNotificationId = notifications[notifications.length - 1].id;
      }
      
      // Process each notification
      notifications.forEach(notification => this.processNotification(notification));
      
      // Emit the notifications
      this.emit('notification', notifications);
      
    } catch (error) {
      console.error('❌ Error processing WebSocket message:', error);
    }
  }

  /**
   * Process individual notification following Odoo 18 pattern
   */
  processNotification(notification) {
    const { payload, type } = notification;
    
    console.log(`📬 Processing notification type: ${type}`);
    
    // Handle different notification types based on Odoo 18 patterns
    switch (type) {
      case 'mail.message':
        this.emit('newMessage', payload);
        break;
      case 'discuss.channel':
        this.emit('channelUpdate', payload);
        break;
      case 'bus.notification':
        this.emit('busNotification', payload);
        break;
      case 'res.partner':
        this.emit('partnerUpdate', payload);
        break;
      default:
        console.log(`🤔 Unknown notification type: ${type}`, payload);
        this.emit('unknownNotification', { type, payload });
    }
  }

  /**
   * Handle WebSocket connection close following Odoo 18 patterns
   */
  handleConnectionClose(event) {
    const { code, reason } = event;
    console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
    
    this.isConnected = false;
    this.isConnecting = false;
    this.connectionState = 'DISCONNECTED';
    
    this.emit('connectionStateChanged', 'DISCONNECTED');
    this.emit('disconnect', { code, reason });
    
    // Handle different close codes like Odoo 18
    if (code === this.WEBSOCKET_CLOSE_CODES.CLEAN) {
      if (reason === 'OUTDATED_VERSION') {
        console.warn('⚠️ WebSocket closed due to outdated version');
        this.emit('outdated');
        return;
      }
      return; // Clean close, don't reconnect
    }
    
    // Auto-reconnect for other close codes
    if (!this.isReconnecting) {
      this.emit('reconnecting', { closeCode: code });
      this.isReconnecting = true;
      
      // Special handling for specific codes
      if (code === this.WEBSOCKET_CLOSE_CODES.KEEP_ALIVE_TIMEOUT) {
        this.connectRetryDelay = 0; // Immediate reconnect
      }
      if (code === this.WEBSOCKET_CLOSE_CODES.SESSION_EXPIRED) {
        // Reload auth data
        this.loadAuthData();
      }
      
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket connection error
   */
  handleConnectionError(error) {
    console.error('❌ WebSocket error:', error);
    
    this.connectionState = 'DISCONNECTED';
    this.isConnecting = false;
    
    this.emit('connectionStateChanged', 'DISCONNECTED');
    this.emit('error', { type: 'connection', error });
    
    // Try next URL if available
    if (this.currentURLIndex < this.potentialURLs.length - 1) {
      this.currentURLIndex++;
      this.websocketURL = this.potentialURLs[this.currentURLIndex];
      console.log(`🔄 Trying next WebSocket URL: ${this.websocketURL}`);
      
      setTimeout(() => {
        if (!this.isConnected) {
          this.connect();
        }
      }, 1000);
    } else {
      // All URLs failed, use normal reconnection logic
      this.scheduleReconnect();
    }
  }

  /**
   * Subscribe to channels using Odoo 18 format
   */
  subscribeToChannels() {
    const allChannels = Array.from(this.subscriptions);

    console.log(`📱 Subscribing to ${allChannels.length} channels`);

    // Build subscription message with authentication data
    const subscriptionData = {
      channels: allChannels,
      last: this.lastNotificationId
    };

    // Include authentication context if available
    if (this.currentUID && this.currentDB) {
      subscriptionData.options = {
        uid: this.currentUID,
        db: this.currentDB
      };
    }

    this.sendMessage({
      event_name: 'subscribe',
      data: subscriptionData
    });
  }

  /**
   * Send message to WebSocket following Odoo 18 format
   */
  sendMessage(message) {
    const payload = JSON.stringify(message);
    
    if (!this.isConnected || this.websocket.readyState !== WebSocket.OPEN) {
      console.log('📫 Queueing message (not connected):', message);
      this.queueMessage(payload);
      return;
    }

    try {
      this.websocket.send(payload);
      console.log(`📤 Sent message: ${message.event_name}`, message.data);
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      this.queueMessage(payload);
    }
  }

  /**
   * Queue message for later delivery
   */
  queueMessage(payload) {
    // For subscribe messages, replace any existing subscribe in queue
    const message = JSON.parse(payload);
    if (message.event_name === 'subscribe') {
      this.messageWaitQueue = this.messageWaitQueue.filter(msg => 
        JSON.parse(msg).event_name !== 'subscribe'
      );
      this.messageWaitQueue.unshift(payload);
    } else {
      this.messageWaitQueue.push(payload);
    }
    
    // Limit queue size
    if (this.messageWaitQueue.length > 100) {
      this.messageWaitQueue.shift();
    }
  }

  /**
   * Process queued messages when connection restored
   */
  processMessageQueue() {
    if (this.messageWaitQueue.length === 0) return;
    
    console.log(`📬 Processing ${this.messageWaitQueue.length} queued messages`);
    
    this.messageWaitQueue.forEach(payload => {
      this.websocket.send(payload);
    });
    
    this.messageWaitQueue = [];
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnect() {
    this.connectRetryDelay = Math.min(
      this.connectRetryDelay * 1.5, 
      this.MAXIMUM_RECONNECT_DELAY
    ) + this.RECONNECT_JITTER * Math.random();
    
    console.log(`🔄 Scheduling reconnect in ${Math.round(this.connectRetryDelay)}ms`);
    
    setTimeout(() => {
      if (!this.isConnected) {
        this.connect();
      }
    }, this.connectRetryDelay);
  }

  /**
   * Subscribe to a channel (Odoo 18 format)
   */
  subscribeToChannel(channelName) {
    if (this.subscriptions.has(channelName)) {
      console.log(`📱 Already subscribed to ${channelName}`);
      return;
    }

    this.subscriptions.add(channelName);
    console.log(`📱 Subscribed to channel: ${channelName}`);
    
    // Update subscriptions
    this.subscribeToChannels();
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribeFromChannel(channelName) {
    if (!this.subscriptions.has(channelName)) {
      console.log(`📱 Not subscribed to ${channelName}`);
      return;
    }

    this.subscriptions.delete(channelName);
    console.log(`👋 Unsubscribed from channel: ${channelName}`);
    
    // Update subscriptions
    this.subscribeToChannels();
  }

  /**
   * Handle app state changes
   */
  setupAppStateHandling() {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') {
        console.log('📱 App going to background');
        // Keep connection but reduce activity
      } else if (nextAppState === 'active') {
        console.log('📱 App becoming active');
        // Reconnect if needed
        if (!this.isConnected && !this.isConnecting) {
          this.connect();
        }
      }
    });
  }

  /**
   * Add event listener
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to all listeners
   */
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      connectionState: this.connectionState,
      websocketURL: this.websocketURL,
      currentUID: this.currentUID,
      currentDB: this.currentDB,
      subscriptions: Array.from(this.subscriptions),
      queuedMessages: this.messageWaitQueue.length
    };
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    console.log('🔌 Disconnecting WebSocket...');
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    
    if (this.websocket) {
      this.websocket.close(this.WEBSOCKET_CLOSE_CODES.CLEAN);
      this.websocket = null;
    }
    
    this.isConnected = false;
    this.isConnecting = false;
    this.connectionState = 'DISCONNECTED';
    this.subscriptions.clear();
    this.messageWaitQueue = [];
    
    this.emit('disconnected', { intentional: true });
  }
}

// Create singleton instance
const odoo18WebSocketService = new Odoo18WebSocketService();

export default odoo18WebSocketService;