/**
 * BaseWebSocketService - Odoo 18 WebSocket Service
 * Base service for all WebSocket communication
 *
 * MIGRATED: From src/services/websocket.ts
 * Based on ACTUAL Odoo Implementation - follows exact patterns from Odoo's websocket_worker.js
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { authService } from './BaseAuthService';

interface WebSocketMessage {
  event_name: string;
  data: any;
}

interface Notification {
  id: number;
  type: string;
  payload: any;
}

// Odoo's exact WebSocket close codes
const WEBSOCKET_CLOSE_CODES = Object.freeze({
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
});

// Odoo's worker states
const WORKER_STATE = Object.freeze({
  CONNECTED: "CONNECTED",
  DISCONNECTED: "DISCONNECTED", 
  IDLE: "IDLE",
  CONNECTING: "CONNECTING",
});

class OdooWebSocketService {
  // Configuration matching Odoo's implementation
  private INITIAL_RECONNECT_DELAY = 1000;
  private RECONNECT_JITTER = 1000;
  private MAXIMUM_RECONNECT_DELAY = 60000;

  // Connection state
  private websocket: WebSocket | null = null;
  private websocketURL: string | null = null;
  private currentUID: number | null = null;
  private currentDB: string | null = null;
  private serverURL: string | null = null;
  private sessionId: string | null = null;
  
  // State management (following Odoo's pattern)
  private state: string = WORKER_STATE.IDLE;
  private isReconnecting = false;
  private connectRetryDelay = this.INITIAL_RECONNECT_DELAY;
  private connectTimeout: NodeJS.Timeout | null = null;
  private active = true;
  
  // Channel management (following Odoo's pattern)
  private channelsByClient = new Map<string, string[]>();
  private lastChannelSubscription: string | null = null;
  private lastNotificationId = 0;
  private messageWaitQueue: string[] = [];
  
  // Event listeners
  private eventListeners = new Map<string, Function[]>();
  private appStateSubscription: any = null;

  constructor() {
    this.setupAppStateHandling();
  }

  /**
   * Initialize WebSocket service using Odoo's exact patterns
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔌 Initializing Odoo WebSocket Service (Following Odoo 18 patterns)...');
      
      const success = await this.loadAuthDataFromOdoo();
      if (!success) {
        console.warn('⚠️ No valid authentication data - WebSocket will be limited');
        return false;
      }
      
      // Build WebSocket URL using Odoo's pattern
      this.buildOdooWebSocketURL();
      
      // Connect using Odoo's connection pattern
      await this.startConnection();
      
      console.log('✅ Odoo WebSocket Service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket service:', error);
      this.emit('error', { type: 'initialization', error });
      return false;
    }
  }

  /**
   * Load authentication data and get session info (Odoo's way)
   */
  private async loadAuthDataFromOdoo(): Promise<boolean> {
    try {
      const user = authService.getCurrentUser();
      const client = authService.getClient();

      if (!user || !client) {
        console.warn('⚠️ No authenticated user or client available');
        return false;
      }

      // Set basic auth data
      this.currentUID = user.id;
      this.currentDB = client.config?.database || process.env.EXPO_PUBLIC_ODOO_DB;
      this.serverURL = client.config?.baseURL || process.env.EXPO_PUBLIC_API_URL;

      console.log('✅ Loaded basic auth data:', {
        uid: this.currentUID,
        database: this.currentDB,
        serverUrl: this.serverURL
      });

      // For XML-RPC, we don't need session_info - WebSocket auth works differently
      // The WebSocket connection will work with the existing XML-RPC authentication
      console.log('🔐 Using XML-RPC authentication for WebSocket (no session needed)');
      
      // Set a fallback session identifier for debugging
      this.sessionId = `xmlrpc_${this.currentUID}_${Date.now()}`;

      return true;
    } catch (error) {
      console.error('❌ Error loading auth data:', error);
      return false;
    }
  }

  /**
   * Build WebSocket URL following Odoo's exact pattern
   */
  private buildOdooWebSocketURL(): void {
    if (!this.serverURL) {
      this.serverURL = process.env.EXPO_PUBLIC_API_URL || 'https://itmsgroup.com.au';
    }

    // Use Odoo's exact WebSocket URL pattern (based on your browser inspection)
    const baseWsUrl = this.serverURL.replace(/^https?:\/\//, 'wss://');
    this.websocketURL = `${baseWsUrl}/websocket`;  // Odoo 18 standard endpoint
    
    console.log(`🌐 WebSocket URL (Odoo pattern): ${this.websocketURL}`);
    console.log(`🔑 Auth context: UID=${this.currentUID}, DB=${this.currentDB}`);
  }

  /**
   * Start connection following Odoo's _start() method
   */
  private async startConnection(): Promise<void> {
    if (!this.active || this.isWebsocketConnected() || this.isWebsocketConnecting()) {
      console.log('🔌 Already connected/connecting or not active');
      return;
    }

    try {
      this.removeWebsocketListeners();
      
      if (this.isWebsocketClosing()) {
        this.lastChannelSubscription = null;
        this.emit('disconnect', { code: WEBSOCKET_CLOSE_CODES.ABNORMAL_CLOSURE });
      }

      this.updateState(WORKER_STATE.CONNECTING);
      
      console.log(`🔌 Connecting to WebSocket: ${this.websocketURL}`);
      
      // 🎉 FIXED: Add required Origin header for Odoo WebSocket
      const headers = {
        'Origin': this.serverURL!,
        'User-Agent': 'ExpoMobile/1.0 (Odoo WebSocket Client)'
      };
      
      console.log('🔑 Using headers:', Object.keys(headers));
      
      // Create WebSocket connection with proper headers
      this.websocket = new WebSocket(this.websocketURL, { headers });
      
      // Add event listeners (Odoo's way)
      this.websocket.addEventListener('open', this.onWebsocketOpen.bind(this));
      this.websocket.addEventListener('error', this.onWebsocketError.bind(this));
      this.websocket.addEventListener('message', this.onWebsocketMessage.bind(this));
      this.websocket.addEventListener('close', this.onWebsocketClose.bind(this));

    } catch (error) {
      console.error('❌ WebSocket connection error:', error);
      this.onWebsocketError();
    }
  }

  /**
   * Handle WebSocket open (Odoo's _onWebsocketOpen)
   */
  private onWebsocketOpen(): void {
    console.log('🔗 WebSocket connected successfully to Odoo!');
    console.log(`✅ Connected to: ${this.websocketURL}`);
    console.log(`🔑 User: ${this.currentUID}, Database: ${this.currentDB}`);
    
    this.updateState(WORKER_STATE.CONNECTED);
    this.emit(this.isReconnecting ? 'reconnect' : 'connect');
    
    // Update channels subscription
    this.updateChannels();
    
    // Reset reconnection settings
    this.connectRetryDelay = this.INITIAL_RECONNECT_DELAY;
    this.connectTimeout = null;
    this.isReconnecting = false;

    // Process queued messages
    this.processMessageQueue();
  }

  /**
   * Handle WebSocket message (Odoo's _onWebsocketMessage)
   */
  private onWebsocketMessage(messageEv: MessageEvent): void {
    try {
      const notifications = JSON.parse(messageEv.data);
      
      console.log(`📨 Received ${notifications.length} notifications (Odoo format)`);
      
      // Update last notification ID (Odoo's way)
      if (notifications.length > 0) {
        this.lastNotificationId = notifications[notifications.length - 1].id;
      }
      
      // Broadcast notifications
      this.emit('notification', notifications);
      
      // Process each notification
      notifications.forEach((notification: Notification) => this.processNotification(notification));
      
    } catch (error) {
      console.error('❌ Error processing WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket close (Odoo's _onWebsocketClose)
   */
  private onWebsocketClose(event: CloseEvent): void {
    const { code, reason } = event;
    console.log(`🔌 WebSocket closed (Odoo style): ${code} - ${reason}`);
    
    this.updateState(WORKER_STATE.DISCONNECTED);
    this.lastChannelSubscription = null;
    
    if (this.isReconnecting) {
      return;
    }

    this.emit('disconnect', { code, reason });

    // Handle clean close
    if (code === WEBSOCKET_CLOSE_CODES.CLEAN) {
      if (reason === 'OUTDATED_VERSION') {
        console.warn('⚠️ Worker deactivated due to outdated version');
        this.active = false;
        this.emit('outdated');
      }
      return;
    }

    // Auto-reconnect for other cases
    this.emit('reconnecting', { closeCode: code });
    this.isReconnecting = true;

    // Special handling for specific codes (Odoo's way)
    if (code === WEBSOCKET_CLOSE_CODES.KEEP_ALIVE_TIMEOUT) {
      this.connectRetryDelay = 0; // Immediate reconnect
    }
    if (code === WEBSOCKET_CLOSE_CODES.SESSION_EXPIRED) {
      // Reload auth data
      this.loadAuthDataFromOdoo();
    }

    this.retryConnectionWithDelay();
  }

  /**
   * Handle WebSocket error (Odoo's _onWebsocketError)
   */
  private onWebsocketError(event?: Event): void {
    console.error('❌ WebSocket error:', event);
    console.error(`❌ Failed connecting to: ${this.websocketURL}`);
    console.error(`🔍 Check if WebSocket is enabled on Odoo server`);
    this.retryConnectionWithDelay();
  }

  /**
   * Retry connection with delay (Odoo's _retryConnectionWithDelay)
   */
  private retryConnectionWithDelay(): void {
    this.connectRetryDelay = Math.min(
      this.connectRetryDelay * 1.5, 
      this.MAXIMUM_RECONNECT_DELAY
    ) + this.RECONNECT_JITTER * Math.random();
    
    console.log(`🔄 Retrying connection in ${Math.round(this.connectRetryDelay)}ms`);
    
    this.connectTimeout = setTimeout(() => {
      this.startConnection();
    }, this.connectRetryDelay);
  }

  /**
   * Update channels subscription (Odoo's _updateChannels)
   */
  private updateChannels(force = false): void {
    // Get all channels from all clients (in our case, just one client)
    const allChannels = Array.from(new Set(
      [].concat(...Array.from(this.channelsByClient.values()))
    )).sort();
    
    const allChannelsString = JSON.stringify(allChannels);
    const shouldUpdate = allChannelsString !== this.lastChannelSubscription;

    if (force || shouldUpdate) {
      console.log(`📱 Updating channel subscription: ${allChannels.length} channels`);
      
      this.lastChannelSubscription = allChannelsString;
      
      // Send subscription message (Odoo's exact format)
      this.sendToServer({
        event_name: 'subscribe',
        data: {
          channels: allChannels,
          last: this.lastNotificationId
        }
      });
    }
  }

  /**
   * Send message to server (Odoo's _sendToServer)
   */
  private sendToServer(message: WebSocketMessage): void {
    const payload = JSON.stringify(message);
    
    if (!this.isWebsocketConnected()) {
      console.log('📫 Queueing message (not connected):', message.event_name);
      
      // Special handling for subscribe messages (Odoo's way)
      if (message.event_name === 'subscribe') {
        this.messageWaitQueue = this.messageWaitQueue.filter(
          msg => JSON.parse(msg).event_name !== 'subscribe'
        );
        this.messageWaitQueue.unshift(payload);
      } else {
        this.messageWaitQueue.push(payload);
      }
    } else {
      try {
        this.websocket!.send(payload);
        console.log(`📤 Sent message: ${message.event_name}`);
      } catch (error) {
        console.error('❌ Failed to send message:', error);
        this.messageWaitQueue.push(payload);
      }
    }
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(): void {
    if (this.messageWaitQueue.length === 0) return;
    
    console.log(`📬 Processing ${this.messageWaitQueue.length} queued messages`);
    
    this.messageWaitQueue.forEach(payload => {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send(payload);
      }
    });
    
    this.messageWaitQueue = [];
  }

  /**
   * Process individual notification
   */
  private processNotification(notification: Notification): void {
    const { payload, type } = notification;
    
    console.log(`📬 Processing notification type: ${type}`);
    
    // Handle different notification types
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
      default:
        this.emit('unknownNotification', { type, payload });
    }
  }

  /**
   * Subscribe to a channel (Odoo style)
   */
  subscribeToChannel(channelId: string): void {
    const clientId = 'main'; // Single client for mobile app
    
    if (!this.channelsByClient.has(clientId)) {
      this.channelsByClient.set(clientId, []);
    }
    
    const clientChannels = this.channelsByClient.get(clientId)!;
    if (!clientChannels.includes(channelId)) {
      clientChannels.push(channelId);
      this.channelsByClient.set(clientId, clientChannels);
      this.updateChannels();
      console.log(`📱 Subscribed to channel: ${channelId}`);
    }
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribeFromChannel(channelId: string): void {
    const clientId = 'main';
    const clientChannels = this.channelsByClient.get(clientId);
    
    if (!clientChannels) return;
    
    const index = clientChannels.indexOf(channelId);
    if (index !== -1) {
      clientChannels.splice(index, 1);
      this.updateChannels();
      console.log(`👋 Unsubscribed from channel: ${channelId}`);
    }
  }

  /**
   * Send message (public interface)
   */
  sendMessage(message: WebSocketMessage): void {
    this.sendToServer(message);
  }

  /**
   * Helper methods for WebSocket state
   */
  private isWebsocketConnected(): boolean {
    return this.websocket?.readyState === WebSocket.OPEN;
  }

  private isWebsocketConnecting(): boolean {
    return this.websocket?.readyState === WebSocket.CONNECTING;
  }

  private isWebsocketClosing(): boolean {
    return this.websocket?.readyState === WebSocket.CLOSING;
  }

  /**
   * Remove WebSocket listeners
   */
  private removeWebsocketListeners(): void {
    this.websocket?.removeEventListener('open', this.onWebsocketOpen);
    this.websocket?.removeEventListener('message', this.onWebsocketMessage);
    this.websocket?.removeEventListener('error', this.onWebsocketError);
    this.websocket?.removeEventListener('close', this.onWebsocketClose);
  }

  /**
   * Update state and broadcast
   */
  private updateState(newState: string): void {
    this.state = newState;
    this.emit('worker_state_updated', newState);
  }

  /**
   * Setup app state handling
   */
  private setupAppStateHandling(): void {
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') {
        console.log('📱 App going to background');
      } else if (nextAppState === 'active') {
        console.log('📱 App becoming active');
        if (!this.isWebsocketConnected() && !this.isWebsocketConnecting()) {
          this.startConnection();
        }
      }
    });
  }

  /**
   * Event listener management
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event)!;
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event)!.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isWebsocketConnected(),
      state: this.state,
      websocketURL: this.websocketURL,
      currentUID: this.currentUID,
      currentDB: this.currentDB,
      subscriptions: Array.from(this.channelsByClient.get('main') || []),
      queuedMessages: this.messageWaitQueue.length
    };
  }

  /**
   * Force reconnection
   */
  async reconnect(): Promise<boolean> {
    console.log('🔄 Force reconnecting WebSocket...');
    
    this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.loadAuthDataFromOdoo();
    
    return await this.initialize();
  }

  /**
   * Ensure connection
   */
  async ensureConnection(): Promise<boolean> {
    if (this.isWebsocketConnected()) {
      return true;
    }
    
    console.log('🔧 Connection needs repair, reconnecting...');
    return await this.reconnect();
  }

  /**
   * Stop WebSocket (Odoo's _stop method)
   */
  private stop(): void {
    console.log('🔌 Stopping WebSocket...');
    
    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
    
    this.connectRetryDelay = this.INITIAL_RECONNECT_DELAY;
    this.isReconnecting = false;
    this.lastChannelSubscription = null;
    
    this.websocket?.close();
    this.removeWebsocketListeners();
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.stop();
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    this.channelsByClient.clear();
    this.messageWaitQueue = [];
    this.active = false;
    
    this.emit('disconnected', { intentional: true });
  }
}

// Create singleton instance
export const webSocketService = new OdooWebSocketService();
export default webSocketService;
