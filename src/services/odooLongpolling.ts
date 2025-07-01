/**
 * Odoo 18 HTTP Polling Service  
 * Implements rapid HTTP polling like the web interface for real-time updates
 * (Replaces longpolling since port 8072 is not accessible)
 */

import { authService } from './auth';

interface LongpollingMessage {
  id: number;
  type: string;
  payload: any;
}

interface LongpollingResponse {
  channels: string[];
  messages: LongpollingMessage[];
}

class OdooPollingService {
  private isActive = false;
  private pollingController: AbortController | null = null;
  private baseURL: string;
  private channels: Set<string> = new Set();
  private lastNotificationId = 0;
  private lastMessageIds: { [channelId: number]: number } = {};
  private eventListeners = new Map<string, Function[]>();
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private pollingTimeout = 25000; // 25 seconds like Odoo web interface

  constructor() {
    this.baseURL = process.env.EXPO_PUBLIC_API_URL || 'https://itmsgroup.com.au';
  }

  /**
   * Start HTTP polling service
   */
  async start(): Promise<boolean> {
    try {
      console.log('🚀 Starting HTTP polling service (not port 8072)...');
      
      const user = authService.getCurrentUser();
      const client = authService.getClient();
      
      if (!user || !client) {
        console.error('❌ No authentication available for polling');
        return false;
      }

      this.isActive = true;
      console.log('✅ Polling service marked as active, starting polling loop...');
      this.startPollingLoop();
      
      console.log('✅ HTTP polling service started successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to start polling service:', error);
      return false;
    }
  }

  /**
   * Subscribe to a channel for real-time updates
   */
  subscribeToChannel(channelName: string): void {
    console.log(`📡 Subscribed to: ${channelName}`);
    this.channels.add(channelName);

    // If already polling, restart to include new channel
    if (this.isActive) {
      this.restartPolling();
    }
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribeFromChannel(channelName: string): void {
    console.log(`📡 Unsubscribed from: ${channelName}`);
    this.channels.delete(channelName);
  }

  /**
   * Main polling loop - keeps polling active
   */
  private async startPollingLoop(): Promise<void> {
    while (this.isActive) {
      try {
        await this.performLongpoll();
        this.reconnectDelay = 1000; // Reset delay on success
      } catch (error) {
        console.error('❌ Polling error:', error);

        if (this.isActive) {
          await this.sleep(this.reconnectDelay);
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
        }
      }
    }
  }

  /**
   * Perform rapid HTTP polling like the web interface
   * This matches exactly what we see in the server logs
   */
  private async performLongpoll(): Promise<void> {
    if (!this.isActive) return;

    const client = authService.getClient();
    if (!client) {
      throw new Error('No authenticated client available');
    }

    try {
      // If we have subscribed channels, poll for new messages
      if (this.channels.size > 0) {
        for (const channelName of this.channels) {
          // Extract channel ID from channel name (e.g., "discuss.channel_101" -> 101)
          const channelIdMatch = channelName.match(/discuss\.channel_(\d+)/);
          if (channelIdMatch) {
            const channelId = parseInt(channelIdMatch[1]);
            await this.pollForChannelMessages(client, channelId);
          }
        }
      }
      
      // Wait before next poll (like web interface)
      await this.sleep(1000); // 1 second interval like server logs show
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🛑 Polling request aborted');
        return;
      }
      throw error;
    }
  }

  /**
   * Poll for new messages in a specific channel (exactly like web interface)
   */
  private async pollForChannelMessages(client: any, channelId: number): Promise<void> {
    try {
      const lastId = this.lastMessageIds[channelId] || 0;
      
      // Use the EXACT same call as the web interface (from server logs)
      const messages = await client.callModel('mail.message', 'search_read', [
        [
          ['model', '=', 'discuss.channel'],
          ['res_id', '=', channelId],
          ['id', '>', lastId]
        ]
      ], {
        fields: ['id', 'body', 'author_id', 'date', 'message_type', 'attachment_ids', 'partner_ids', 'email_from'],
        limit: 100,
        offset: 0,
        order: 'id asc'
      });

      if (messages && messages.length > 0) {
        console.log(`📨 ${messages.length} new messages in channel ${channelId}`);

        // Update last message ID for this channel
        const maxId = Math.max(...messages.map(m => m.id));
        this.lastMessageIds[channelId] = maxId;

        // Process each new message
        for (const message of messages) {
          this.processMessage({
            id: Date.now() + Math.random(), // Unique notification ID
            type: 'mail.message',
            payload: {
              ...message,
              channel_id: channelId,
              model: 'discuss.channel',
              res_id: channelId
            }
          });
        }
      }
      
    } catch (error) {
      console.error(`❌ Error polling channel ${channelId}:`, error);
    }
  }

  /**
   * Process incoming message notification
   */
  private processMessage(message: LongpollingMessage): void {
    // Emit generic message event
    this.emit('message', message);

    // Handle specific message types
    switch (message.type) {
      case 'mail.message':
      case 'discuss.channel':
        this.emit('chatMessage', message.payload);
        break;
      case 'bus.presence':
        this.emit('presenceUpdate', message.payload);
        break;
      case 'mail.activity':
        this.emit('activityUpdate', message.payload);
        break;
      default:
        this.emit('notification', message);
    }
  }

  /**
   * Restart polling (used when channels change)
   */
  private restartPolling(): void {
    // Just continue the polling loop - it will pick up new channels
  }

  /**
   * Stop HTTP polling service
   */
  stop(): void {
    console.log('🛑 Stopping HTTP polling service...');
    this.isActive = false;
    
    this.channels.clear();
    this.eventListeners.clear();
    this.lastNotificationId = 0;
    this.lastMessageIds = {};
    this.reconnectDelay = 1000;
  }

  /**
   * Add event listener
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in polling listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Sleep utility for reconnection delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current connection status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      channelCount: this.channels.size,
      lastNotificationId: this.lastNotificationId,
      channels: Array.from(this.channels),
      baseURL: this.baseURL,
      longpollingUrl: `${this.baseURL}:8072/longpolling/poll`
    };
  }

  /**
   * Get current channels
   */
  getChannels(): string[] {
    return Array.from(this.channels);
  }

  /**
   * Force reconnection
   */
  reconnect(): void {
    this.restartPolling();
  }
}

// Create singleton instance
export const longpollingService = new OdooPollingService();
export default longpollingService;
