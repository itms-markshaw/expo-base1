/**
 * Session-based WebSocket for Odoo Chat
 * Uses proper session authentication instead of API keys
 */

import { authService } from './auth';

class SessionWebSocketService {
  private websocket: WebSocket | null = null;
  private sessionId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventListeners = new Map<string, Function[]>();

  /**
   * Initialize WebSocket with session-based authentication
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔌 Initializing session-based WebSocket...');
      
      // Get session info from Odoo
      const client = authService.getClient();
      if (!client) {
        throw new Error('No authenticated client available');
      }

      // Get session information
      const sessionInfo = await client.callModel('ir.http', 'session_info', []);
      this.sessionId = sessionInfo.session_id;
      
      if (!this.sessionId) {
        throw new Error('No session ID available');
      }

      console.log('✅ Got session ID:', this.sessionId);

      // Connect WebSocket with session
      await this.connect();
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize session WebSocket:', error);
      return false;
    }
  }

  /**
   * Connect to WebSocket using session
   */
  private async connect(): Promise<void> {
    try {
      const wsUrl = `wss://itmsgroup.com.au/websocket?session_id=${this.sessionId}`;
      
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        console.log('✅ Session WebSocket connected');
        this.reconnectAttempts = 0;
        this.emit('connected');
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      };

      this.websocket.onclose = () => {
        console.log('🔌 Session WebSocket disconnected');
        this.emit('disconnected');
        this.attemptReconnect();
      };

      this.websocket.onerror = (error) => {
        console.error('❌ Session WebSocket error:', error);
        this.emit('error', error);
      };

    } catch (error) {
      console.error('❌ Failed to connect session WebSocket:', error);
      throw error;
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: any): void {
    if (data.type === 'mail.message') {
      // New chat message
      this.emit('newMessage', data.payload);
    } else if (data.type === 'discuss.channel') {
      // Channel update
      this.emit('channelUpdate', data.payload);
    }
  }

  /**
   * Subscribe to a channel for real-time updates
   */
  subscribeToChannel(channelId: number): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      const message = {
        event_name: 'subscribe',
        data: {
          channels: [`discuss.channel_${channelId}`]
        }
      };
      this.websocket.send(JSON.stringify(message));
      console.log(`📡 Subscribed to channel ${channelId}`);
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
      }
    }, this.reconnectDelay * this.reconnectAttempts);
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
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }
}

export const sessionWebSocketService = new SessionWebSocketService();
