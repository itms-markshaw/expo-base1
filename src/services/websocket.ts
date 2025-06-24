/**
 * WebSocket Service for Odoo 18 Integration
 * Based on the working websocket implementation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

interface WebSocketMessage {
  event_name: string;
  data: any;
}

interface Notification {
  id: number;
  type: string;
  payload: any;
}

class OdooWebSocketService {
  private websocket: WebSocket | null = null;
  private websocketURL: string | null = null;
  private currentUID: number | null = null;
  private currentDB: string | null = null;
  private serverURL: string | null = null;
  private sessionId: string | null = null;
  private accessToken: string | null = null;
  
  private isConnected = false;
  private isConnecting = false;
  private isReconnecting = false;
  private connectionState: 'IDLE' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' = 'IDLE';
  
  private subscriptions = new Set<string>();
  private lastNotificationId = 0;
  private messageWaitQueue: string[] = [];
  
  private eventListeners = new Map<string, Function[]>();
  
  // Reconnection settings
  private INITIAL_RECONNECT_DELAY = 1000;
  private MAXIMUM_RECONNECT_DELAY = 60000;
  private connectRetryDelay = this.INITIAL_RECONNECT_DELAY;

  constructor() {
    this.setupAppStateHandling();
  }

  /**
   * Initialize WebSocket service
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔌 Initializing Odoo WebSocket Service...');
      
      const success = await this.loadAuthData();
      if (!success) {
        console.warn('⚠️ No valid authentication data');
        return false;
      }
      
      this.buildWebSocketURL();
      await this.connect();
      
      console.log('✅ WebSocket Service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket service:', error);
      this.emit('error', { type: 'initialization', error });
      return false;
    }
  }

  /**
   * Load authentication data from your existing auth service
   */
  private async loadAuthData(): Promise<boolean> {
    try {
      // Check if user is authenticated using your auth service pattern
      const isAuth = await AsyncStorage.getItem('odoo_authenticated');
      const userStr = await AsyncStorage.getItem('odoo_user');

      if (isAuth === 'true' && userStr) {
        const user = JSON.parse(userStr);

        // Use your ODOO_CONFIG for connection details
        this.currentUID = user.id;
        this.currentDB = process.env.EXPO_PUBLIC_ODOO_DB || 'ITMS_v17_3_backup_2025_02_17_08_15';
        this.serverURL = process.env.EXPO_PUBLIC_API_URL || 'https://itmsgroup.com.au';

        // For WebSocket, we'll use the same credentials as XML-RPC
        // Since you're using API key authentication, we'll pass that
        this.accessToken = process.env.EXPO_PUBLIC_ODOO_API_KEY;

        console.log('✅ Loaded auth from existing auth service');
        console.log(`🔑 User: ${user.name} (ID: ${this.currentUID})`);
        console.log(`🗄️ Database: ${this.currentDB}`);
        console.log(`🌐 Server: ${this.serverURL}`);

        return true;
      }

      console.warn('⚠️ No valid authentication data found');
      return false;
    } catch (error) {
      console.error('❌ Error loading auth data:', error);
      return false;
    }
  }

  /**
   * Build WebSocket URL
   */
  private buildWebSocketURL(): void {
    if (!this.serverURL) {
      this.serverURL = process.env.EXPO_PUBLIC_API_URL || 'https://itmsgroup.com.au';
    }
    
    const baseWsUrl = this.serverURL.replace(/^https?:\/\//, 'wss://');
    this.websocketURL = `${baseWsUrl}/websocket`;
    
    console.log(`🌐 WebSocket URL: ${this.websocketURL}`);
  }

  /**
   * Connect to WebSocket
   */
  private async connect(): Promise<void> {
    if (this.isConnected || this.isConnecting || !this.websocketURL) {
      return;
    }

    try {
      this.isConnecting = true;
      this.connectionState = 'CONNECTING';
      this.emit('connectionStateChanged', 'CONNECTING');

      const headers: Record<string, string> = {
        Origin: this.serverURL!,
        'User-Agent': 'ExpoMobile/1.0 (Odoo WebSocket Client)'
      };

      // For Odoo WebSocket with API key authentication
      if (this.accessToken) {
        headers['X-API-Key'] = this.accessToken;
        headers.Authorization = `Bearer ${this.accessToken}`;
      }

      // Add database and user info for Odoo WebSocket
      if (this.currentDB) {
        headers['X-Database'] = this.currentDB;
      }

      if (this.currentUID) {
        headers['X-User-ID'] = this.currentUID.toString();
      }

      console.log('🔌 Connecting to WebSocket with headers:', Object.keys(headers));
      this.websocket = new WebSocket(this.websocketURL, { headers });
      this.setupWebSocketHandlers();
      
    } catch (error) {
      console.error('❌ WebSocket connection error:', error);
      this.handleConnectionError(error);
    }
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(): void {
    if (!this.websocket) return;

    this.websocket.onopen = () => this.handleConnectionOpen();
    this.websocket.onmessage = (event) => this.handleMessage(event);
    this.websocket.onclose = (event) => this.handleConnectionClose(event);
    this.websocket.onerror = (error) => this.handleConnectionError(error);
  }

  /**
   * Handle connection open
   */
  private handleConnectionOpen(): void {
    console.log('🔗 WebSocket connected');
    
    this.isConnected = true;
    this.isConnecting = false;
    this.connectionState = 'CONNECTED';
    this.connectRetryDelay = this.INITIAL_RECONNECT_DELAY;
    
    this.emit('connectionStateChanged', 'CONNECTED');
    this.emit(this.isReconnecting ? 'reconnect' : 'connect');

    this.subscribeToInitialChannels();
    this.processMessageQueue();
    
    this.isReconnecting = false;
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(messageEvent: MessageEvent): void {
    try {
      const notifications = JSON.parse(messageEvent.data);
      
      if (!Array.isArray(notifications)) {
        console.warn('⚠️ Received non-array notification:', notifications);
        return;
      }

      console.log(`📨 Received ${notifications.length} notifications`);
      
      if (notifications.length > 0) {
        this.lastNotificationId = notifications[notifications.length - 1].id;
      }
      
      notifications.forEach((notification: Notification) => this.processNotification(notification));
      this.emit('notification', notifications);
      
    } catch (error) {
      console.error('❌ Error processing WebSocket message:', error);
    }
  }

  /**
   * Process individual notification
   */
  private processNotification(notification: Notification): void {
    const { payload, type } = notification;
    
    console.log(`📬 Processing notification type: ${type}`);
    
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
        this.emit('unknownNotification', { type, payload });
    }
  }

  /**
   * Handle connection close
   */
  private handleConnectionClose(event: CloseEvent): void {
    console.log(`🔌 WebSocket closed: ${event.code} - ${event.reason}`);
    
    this.isConnected = false;
    this.isConnecting = false;
    this.connectionState = 'DISCONNECTED';
    
    this.emit('connectionStateChanged', 'DISCONNECTED');
    this.emit('disconnect', { code: event.code, reason: event.reason });
    
    if (event.code !== 1000 && !this.isReconnecting) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(error: any): void {
    console.error('❌ WebSocket error:', error);
    
    this.connectionState = 'DISCONNECTED';
    this.isConnecting = false;
    
    this.emit('connectionStateChanged', 'DISCONNECTED');
    this.emit('error', { type: 'connection', error });
    
    this.scheduleReconnect();
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    if (this.isReconnecting) return;
    
    this.isReconnecting = true;
    this.emit('reconnecting', { delay: this.connectRetryDelay });
    
    setTimeout(() => {
      if (!this.isConnected) {
        this.connect();
      }
    }, this.connectRetryDelay);
    
    this.connectRetryDelay = Math.min(this.connectRetryDelay * 2, this.MAXIMUM_RECONNECT_DELAY);
  }

  /**
   * Subscribe to initial channels
   */
  private subscribeToInitialChannels(): void {
    if (this.subscriptions.size === 0) {
      console.log('📱 No channels to subscribe to yet');
      return;
    }
    this.subscribeToChannels();
  }

  /**
   * Subscribe to channels
   */
  private subscribeToChannels(): void {
    const allChannels = Array.from(this.subscriptions);

    if (allChannels.length === 0) return;

    console.log(`📱 Subscribing to ${allChannels.length} channels`);

    const subscriptionData: any = {
      channels: allChannels,
      last: this.lastNotificationId
    };

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
   * Send message to WebSocket
   */
  sendMessage(message: WebSocketMessage): void {
    const payload = JSON.stringify(message);
    
    if (!this.isConnected || !this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      console.log('📫 Queueing message (not connected)');
      this.queueMessage(payload);
      return;
    }

    try {
      this.websocket.send(payload);
      console.log(`📤 Sent message: ${message.event_name}`);
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      this.queueMessage(payload);
    }
  }

  /**
   * Queue message for later delivery
   */
  private queueMessage(payload: string): void {
    this.messageWaitQueue.push(payload);
    
    if (this.messageWaitQueue.length > 100) {
      this.messageWaitQueue.shift();
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
   * Subscribe to a channel
   */
  subscribeToChannel(channelId: string): void {
    this.subscriptions.add(channelId);
    
    if (this.isConnected) {
      this.subscribeToChannels();
    }
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribeFromChannel(channelId: string): void {
    this.subscriptions.delete(channelId);
    
    if (this.isConnected) {
      this.subscribeToChannels();
    }
  }

  /**
   * Setup app state handling
   */
  private setupAppStateHandling(): void {
    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && !this.isConnected) {
        this.connect();
      } else if (nextAppState === 'background') {
        // Keep connection alive in background
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
      isConnected: this.isConnected,
      connectionState: this.connectionState,
      subscriptions: Array.from(this.subscriptions),
      lastNotificationId: this.lastNotificationId
    };
  }

  /**
   * Force reconnection
   */
  async reconnect(): Promise<boolean> {
    console.log('🔄 Force reconnecting WebSocket...');

    // Disconnect first
    this.disconnect();

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Reinitialize
    return await this.initialize();
  }

  /**
   * Check and repair connection if needed
   */
  async ensureConnection(): Promise<boolean> {
    if (this.isConnected && this.websocket?.readyState === WebSocket.OPEN) {
      return true;
    }

    console.log('🔧 Connection needs repair, reconnecting...');
    return await this.reconnect();
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.websocket) {
      this.websocket.close(1000, 'Client disconnect');
      this.websocket = null;
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.isReconnecting = false;
    this.connectionState = 'DISCONNECTED';
    this.messageWaitQueue = [];
  }
}

// Create singleton instance
export const webSocketService = new OdooWebSocketService();
export default webSocketService;
