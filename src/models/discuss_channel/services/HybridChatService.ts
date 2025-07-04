/**
 * Hybrid Chat Service - Combines WebSocket + Polling for best UX
 * Falls back gracefully when WebSocket fails
 */

import { authService } from '../../base/services/BaseAuthService';
import { sessionWebSocketService } from '../../base/services/BaseSessionWebSocketService';

class HybridChatService {
  private useWebSocket = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private currentChannelId: number | null = null;
  private eventListeners = new Map<string, Function[]>();
  private lastMessageIds = new Map<number, number>();

  /**
   * Initialize hybrid chat service
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🚀 Initializing hybrid chat service...');
      
      // Try WebSocket first
      const wsSuccess = await sessionWebSocketService.initialize();
      
      if (wsSuccess) {
        console.log('✅ Using WebSocket for real-time updates');
        this.useWebSocket = true;
        this.setupWebSocketListeners();
      } else {
        console.log('⚠️ WebSocket failed, using aggressive polling');
        this.useWebSocket = false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Hybrid chat initialization failed:', error);
      this.useWebSocket = false;
      return true; // Still return true to use polling fallback
    }
  }

  /**
   * Setup WebSocket event listeners
   */
  private setupWebSocketListeners(): void {
    sessionWebSocketService.on('newMessage', (message: any) => {
      this.emit('newMessage', message);
    });

    sessionWebSocketService.on('disconnected', () => {
      console.log('⚠️ WebSocket disconnected, falling back to polling');
      this.useWebSocket = false;
      if (this.currentChannelId) {
        this.startPollingFallback(this.currentChannelId);
      }
    });

    sessionWebSocketService.on('connected', () => {
      console.log('✅ WebSocket reconnected, stopping polling');
      this.useWebSocket = true;
      this.stopPolling();
      if (this.currentChannelId) {
        sessionWebSocketService.subscribeToChannel(this.currentChannelId);
      }
    });
  }

  /**
   * Start real-time updates for a channel
   */
  startRealTimeUpdates(channelId: number): void {
    this.currentChannelId = channelId;
    
    if (this.useWebSocket) {
      console.log(`📡 Starting WebSocket updates for channel ${channelId}`);
      sessionWebSocketService.subscribeToChannel(channelId);
    } else {
      console.log(`🔄 Starting polling updates for channel ${channelId}`);
      this.startPollingFallback(channelId);
    }
  }

  /**
   * Polling fallback when WebSocket is not available
   */
  private startPollingFallback(channelId: number): void {
    this.stopPolling();
    
    this.pollingInterval = setInterval(async () => {
      await this.checkForNewMessages(channelId);
    }, 1500); // 1.5 second polling
  }

  /**
   * Check for new messages (polling method)
   */
  private async checkForNewMessages(channelId: number): Promise<void> {
    try {
      const client = authService.getClient();
      if (!client) return;

      const lastMessageId = this.lastMessageIds.get(channelId) || 0;

      const newMessages = await client.searchRead('mail.message',
        [
          ['model', '=', 'discuss.channel'],
          ['res_id', '=', channelId],
          ['id', '>', lastMessageId]
        ],
        ['id', 'body', 'author_id', 'date', 'message_type'],
        { order: 'id asc', limit: 10 }
      );

      if (newMessages.length > 0) {
        // Update last message ID
        const maxId = Math.max(...newMessages.map(m => m.id));
        this.lastMessageIds.set(channelId, maxId);

        // Process and emit new messages
        const processedMessages = newMessages.map(msg => ({
          ...msg,
          authorName: this.extractAuthorName(msg.author_id),
          cleanAuthorName: this.extractAuthorName(msg.author_id)
        }));

        this.emit('newMessages', { channelId, messages: processedMessages });
      }
    } catch (error) {
      // Silent fail to avoid spam
    }
  }

  /**
   * Extract author name from author_id field
   */
  private extractAuthorName(authorId: any): string {
    if (authorId && Array.isArray(authorId) && authorId.length > 1) {
      let name = authorId[1];
      if (name.includes(',')) {
        const parts = name.split(',').map(part => part.trim());
        if (parts.length > 1) {
          name = parts[parts.length - 1];
        }
      }
      return name;
    }
    return 'Unknown User';
  }

  /**
   * Send message with immediate optimistic update
   */
  async sendMessage(channelId: number, body: string): Promise<boolean> {
    try {
      const client = authService.getClient();
      if (!client) return false;

      // Send message
      await client.callModel('discuss.channel', 'message_post', [channelId], {
        body: body.trim(),
        message_type: 'comment'
      });

      // If using polling, trigger immediate check
      if (!this.useWebSocket) {
        setTimeout(() => {
          this.checkForNewMessages(channelId);
        }, 200);
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      return false;
    }
  }

  /**
   * Stop all real-time updates
   */
  stopRealTimeUpdates(): void {
    this.currentChannelId = null;
    this.stopPolling();
  }

  /**
   * Stop polling
   */
  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Event emitter methods
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => callback(data));
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): 'websocket' | 'polling' | 'disconnected' {
    return this.useWebSocket ? 'websocket' : 'polling';
  }
}

export const hybridChatService = new HybridChatService();
