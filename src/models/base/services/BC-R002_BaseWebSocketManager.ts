/**
 * BaseWebSocketManager (BC-R002) - Unified WebSocket Management Service
 * Component Reference: BC-R002
 * 
 * ENHANCED: Organizes existing WebSocket system with BC-CXXX naming convention
 * Integrates all existing WebSocket services under unified management
 */

import { sessionWebSocketService } from './BaseSessionWebSocketService';
import { BaseAuthService } from './BC-A001_BaseAuthService';

// Get auth service instance
const authService = BaseAuthService.getInstance();

// BC-R002 Interfaces
export interface WebSocketManagerConfig {
  enableAutoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  enableTypingIndicators?: boolean;
  enablePresenceTracking?: boolean;
  enableMessageQueue?: boolean;
  debugMode?: boolean;
}

export interface WebSocketStatus {
  isConnected: boolean;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastConnected?: string;
  reconnectAttempts: number;
  queuedMessages: number;
  activeChannels: string[];
  typingUsers: number;
  onlineUsers: number;
}

export interface WebSocketMetrics {
  connectionTime?: number;
  messagesReceived: number;
  messagesSent: number;
  reconnections: number;
  uptime: number;
  lastActivity?: string;
}

export interface ChannelSubscription {
  channelId: string;
  modelName?: string;
  recordId?: number;
  subscriptionTime: string;
  isActive: boolean;
}

/**
 * BC-R002: Unified WebSocket Manager
 * 
 * Features:
 * - Manages existing WebSocket services under BC-CXXX system
 * - Provides unified interface for all real-time features
 * - Handles connection lifecycle and error recovery
 * - Manages channel subscriptions and message routing
 * - Provides metrics and monitoring capabilities
 * - Integrates with existing Odoo WebSocket infrastructure
 */
class BaseWebSocketManager {
  private config: WebSocketManagerConfig;
  private status: WebSocketStatus;
  private metrics: WebSocketMetrics;
  private subscriptions: Map<string, ChannelSubscription>;
  private messageQueue: any[];
  private eventListeners: Map<string, Function[]>;
  private startTime: number;

  constructor(config: WebSocketManagerConfig = {}) {
    this.config = {
      enableAutoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      enableTypingIndicators: true,
      enablePresenceTracking: true,
      enableMessageQueue: true,
      debugMode: false,
      ...config
    };

    this.status = {
      isConnected: false,
      connectionState: 'disconnected',
      reconnectAttempts: 0,
      queuedMessages: 0,
      activeChannels: [],
      typingUsers: 0,
      onlineUsers: 0
    };

    this.metrics = {
      messagesReceived: 0,
      messagesSent: 0,
      reconnections: 0,
      uptime: 0
    };

    this.subscriptions = new Map();
    this.messageQueue = [];
    this.eventListeners = new Map();
    this.startTime = Date.now();

    this.log('🔧 BC-R002: WebSocket Manager initialized');
  }

  /**
   * Initialize WebSocket manager with existing services
   */
  async initialize(): Promise<boolean> {
    try {
      this.log('🚀 BC-R002: Initializing WebSocket Manager...');
      
      // Check authentication
      const user = authService.getCurrentUser();
      if (!user) {
        this.log('⚠️ BC-R002: No authenticated user - WebSocket will be limited');
        return false;
      }

      // Initialize existing session WebSocket service
      this.status.connectionState = 'connecting';
      const connected = await sessionWebSocketService.initialize();
      
      if (connected) {
        this.setupServiceListeners();
        this.status.isConnected = true;
        this.status.connectionState = 'connected';
        this.status.lastConnected = new Date().toISOString();
        this.metrics.connectionTime = Date.now() - this.startTime;
        
        this.emit('connected');
        this.log('✅ BC-R002: WebSocket Manager initialized successfully');
        return true;
      } else {
        this.status.connectionState = 'error';
        this.log('❌ BC-R002: Failed to initialize WebSocket connection');
        return false;
      }
    } catch (error) {
      this.status.connectionState = 'error';
      this.log('❌ BC-R002: WebSocket Manager initialization failed:', error);
      this.emit('error', error);
      return false;
    }
  }

  /**
   * Setup listeners for existing WebSocket service
   */
  private setupServiceListeners(): void {
    // Connection events
    sessionWebSocketService.on('connected', () => {
      this.status.isConnected = true;
      this.status.connectionState = 'connected';
      this.status.lastConnected = new Date().toISOString();
      this.emit('connected');
      this.log('✅ BC-R002: WebSocket connected');
    });

    sessionWebSocketService.on('disconnected', () => {
      this.status.isConnected = false;
      this.status.connectionState = 'disconnected';
      this.emit('disconnected');
      this.log('🔌 BC-R002: WebSocket disconnected');
      
      if (this.config.enableAutoReconnect) {
        this.handleReconnection();
      }
    });

    sessionWebSocketService.on('error', (error: any) => {
      this.status.connectionState = 'error';
      this.emit('error', error);
      this.log('❌ BC-R002: WebSocket error:', error);
    });

    // Message events
    sessionWebSocketService.on('newMessage', (message: any) => {
      this.metrics.messagesReceived++;
      this.metrics.lastActivity = new Date().toISOString();
      this.emit('message', message);
      this.log('💬 BC-R002: Message received:', message.id);
    });

    sessionWebSocketService.on('channelUpdate', (update: any) => {
      this.emit('channelUpdate', update);
      this.log('📡 BC-R002: Channel update:', update);
    });
  }

  /**
   * Subscribe to a channel for real-time updates
   */
  subscribeToChannel(channelId: string, modelName?: string, recordId?: number): boolean {
    try {
      const subscription: ChannelSubscription = {
        channelId,
        modelName,
        recordId,
        subscriptionTime: new Date().toISOString(),
        isActive: true
      };

      this.subscriptions.set(channelId, subscription);
      this.status.activeChannels = Array.from(this.subscriptions.keys());

      // Use existing WebSocket service
      sessionWebSocketService.subscribeToChannel(channelId);
      
      this.log(`📡 BC-R002: Subscribed to channel: ${channelId}`);
      this.emit('channelSubscribed', subscription);
      return true;
    } catch (error) {
      this.log('❌ BC-R002: Failed to subscribe to channel:', error);
      return false;
    }
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribeFromChannel(channelId: string): boolean {
    try {
      const subscription = this.subscriptions.get(channelId);
      if (subscription) {
        subscription.isActive = false;
        this.subscriptions.delete(channelId);
        this.status.activeChannels = Array.from(this.subscriptions.keys());
        
        // Use existing WebSocket service
        sessionWebSocketService.unsubscribeFromChannel?.(channelId);
        
        this.log(`📡 BC-R002: Unsubscribed from channel: ${channelId}`);
        this.emit('channelUnsubscribed', { channelId });
        return true;
      }
      return false;
    } catch (error) {
      this.log('❌ BC-R002: Failed to unsubscribe from channel:', error);
      return false;
    }
  }

  /**
   * Send message via WebSocket
   */
  sendMessage(eventName: string, data: any): boolean {
    try {
      if (!this.status.isConnected) {
        if (this.config.enableMessageQueue) {
          this.queueMessage(eventName, data);
          return true;
        }
        return false;
      }

      sessionWebSocketService.sendMessage(eventName, data);
      this.metrics.messagesSent++;
      this.metrics.lastActivity = new Date().toISOString();
      
      this.log(`📤 BC-R002: Message sent: ${eventName}`);
      return true;
    } catch (error) {
      this.log('❌ BC-R002: Failed to send message:', error);
      return false;
    }
  }

  /**
   * Queue message for later delivery
   */
  private queueMessage(eventName: string, data: any): void {
    this.messageQueue.push({
      eventName,
      data,
      timestamp: new Date().toISOString()
    });
    this.status.queuedMessages = this.messageQueue.length;
    this.log(`📫 BC-R002: Message queued: ${eventName}`);
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    this.log(`📬 BC-R002: Processing ${this.messageQueue.length} queued messages`);
    
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    this.status.queuedMessages = 0;

    messages.forEach(({ eventName, data }) => {
      this.sendMessage(eventName, data);
    });
  }

  /**
   * Handle reconnection logic
   */
  private async handleReconnection(): Promise<void> {
    if (this.status.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      this.log('❌ BC-R002: Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.status.reconnectAttempts++;
    this.metrics.reconnections++;
    
    this.log(`🔄 BC-R002: Attempting reconnection ${this.status.reconnectAttempts}/${this.config.maxReconnectAttempts}`);
    
    await new Promise(resolve => setTimeout(resolve, this.config.reconnectDelay!));
    
    const connected = await this.initialize();
    if (connected) {
      this.status.reconnectAttempts = 0;
      this.processMessageQueue();
    }
  }

  /**
   * Get current WebSocket status
   */
  getStatus(): WebSocketStatus {
    this.metrics.uptime = Date.now() - this.startTime;
    return { ...this.status };
  }

  /**
   * Get WebSocket metrics
   */
  getMetrics(): WebSocketMetrics {
    this.metrics.uptime = Date.now() - this.startTime;
    return { ...this.metrics };
  }

  /**
   * Get active subscriptions
   */
  getSubscriptions(): ChannelSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Force reconnection
   */
  async reconnect(): Promise<boolean> {
    this.log('🔄 BC-R002: Force reconnecting...');
    this.status.reconnectAttempts = 0;
    return await this.initialize();
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    this.log('🔌 BC-R002: Disconnecting WebSocket...');
    this.status.isConnected = false;
    this.status.connectionState = 'disconnected';
    sessionWebSocketService.disconnect?.();
    this.emit('disconnected');
  }

  /**
   * Event listener management
   */
  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }

  /**
   * Logging utility
   */
  private log(message: string, ...args: any[]): void {
    if (this.config.debugMode) {
      console.log(message, ...args);
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.log('🧹 BC-R002: Destroying WebSocket Manager...');
    this.disconnect();
    this.eventListeners.clear();
    this.subscriptions.clear();
    this.messageQueue = [];
  }
}

// Export singleton instance
export const baseWebSocketManager = new BaseWebSocketManager({
  debugMode: __DEV__,
  enableAutoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
  enableTypingIndicators: true,
  enablePresenceTracking: true,
  enableMessageQueue: true
});

export default BaseWebSocketManager;
