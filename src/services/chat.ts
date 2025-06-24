/**
 * Chat Service for Odoo Integration
 * Handles real-time messaging, typing indicators, and presence
 */

import webSocketService from './websocket';
import { authService } from './auth';

export interface ChatMessage {
  id: number;
  body: string;
  author_id: [number, string];
  date: string;
  message_type: 'email' | 'comment' | 'notification';
  model: string;
  res_id: number;
  channel_ids?: number[];
  attachment_ids?: number[];
  partner_ids?: number[];
  is_discussion?: boolean;
  is_note?: boolean;
}

export interface ChatChannel {
  id: number;
  name: string;
  description?: string;
  channel_type: 'chat' | 'channel' | 'group' | 'livechat';
  channel_member_ids: number[];
  message_ids: number[];
  last_message_id?: number;
  is_pinned?: boolean;
  is_minimized?: boolean;
  state?: 'open' | 'folded' | 'closed';
  // Odoo 18 specific fields
  uuid?: string;
  is_member?: boolean;
  member_count?: number;
  avatar_128?: string;
  // For direct messages
  correspondent?: {
    id: number;
    name: string;
    avatar?: string;
    is_online?: boolean;
  };
}

export interface TypingUser {
  id: number;
  name: string;
  isTyping: boolean;
  lastTypingTime: number;
}

class ChatService {
  private isInitialized = false;
  private currentUserId: number | null = null;
  private currentUserPartnerId: number | null = null;
  private currentChannels = new Map<number, ChatChannel>();
  private channelMessages = new Map<number, ChatMessage[]>();
  private typingUsers = new Map<number, Map<number, TypingUser>>();
  private eventListeners = new Map<string, Function[]>();
  
  // Typing timeout
  private TYPING_TIMEOUT = 3000;
  private typingTimers = new Map<string, NodeJS.Timeout>();

  constructor() {
    this.setupWebSocketListeners();
  }

  /**
   * Initialize chat service
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      console.log('💬 Chat service already initialized');
      return true;
    }

    try {
      console.log('💬 Initializing Chat service...');
      
      // Ensure WebSocket connection
      const wsConnected = await webSocketService.ensureConnection();
      if (!wsConnected) {
        console.warn('⚠️ WebSocket service failed to connect, retrying...');
        // Try once more
        await webSocketService.reconnect();
      }

      // Set current user info
      const client = authService.getClient();
      if (client) {
        this.currentUserId = client.uid;

        // Get current user's partner ID
        try {
          const currentUser = await client.searchRead('res.users',
            [['id', '=', client.uid]],
            ['partner_id']
          );

          if (currentUser.length > 0 && currentUser[0].partner_id) {
            let partnerId = currentUser[0].partner_id;

            // Parse partner ID from different formats
            if (Array.isArray(partnerId) && partnerId.length > 0) {
              this.currentUserPartnerId = partnerId[0];
            } else if (typeof partnerId === 'string') {
              // Parse XML-RPC string format
              const match = partnerId.match(/<value><int>(\d+)<\/int>/);
              if (match) {
                this.currentUserPartnerId = parseInt(match[1]);
              }
            } else if (typeof partnerId === 'number') {
              this.currentUserPartnerId = partnerId;
            }

            console.log(`👤 Current user partner ID: ${this.currentUserPartnerId}`);
          }
        } catch (error) {
          console.warn('⚠️ Failed to get current user partner ID:', error);
        }
      }

      // Load initial chat data
      await this.loadChannels();

      this.isInitialized = true;
      console.log('✅ Chat service initialized successfully');
      this.emit('initialized');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Chat service:', error);
      this.emit('error', { type: 'initialization', error });
      return false;
    }
  }

  /**
   * Setup WebSocket event listeners
   */
  private setupWebSocketListeners(): void {
    webSocketService.on('newMessage', (message: ChatMessage) => {
      this.handleNewMessage(message);
    });

    webSocketService.on('channelUpdate', (channel: ChatChannel) => {
      this.handleChannelUpdate(channel);
    });

    webSocketService.on('busNotification', (notification: any) => {
      this.handleBusNotification(notification);
    });

    webSocketService.on('connect', () => {
      this.emit('connectionChanged', 'connected');
      // Don't auto-subscribe to all channels - only subscribe when user opens a chat
    });

    webSocketService.on('disconnect', () => {
      this.emit('connectionChanged', 'disconnected');
    });
  }

  /**
   * Load chat channels from Odoo 18 (both direct messages and channels)
   */
  private async loadChannels(): Promise<void> {
    try {
      const client = authService.getClient();
      if (!client) {
        throw new Error('No authenticated client available');
      }

      // Load discuss channels for Odoo 18 - Try different approaches
      console.log('📱 Loading chat channels from discuss.channel...');
      console.log(`👤 Current user ID: ${client.uid}`);

      let channels = [];

      try {
        // First, try to get the current user's partner ID
        const currentUser = await client.searchRead('res.users',
          [['id', '=', client.uid]],
          ['partner_id']
        );

        if (currentUser.length > 0) {
          const currentPartnerId = currentUser[0].partner_id[0];
          console.log(`👤 Current user partner ID: ${currentPartnerId}`);

          // Try to load channels where the current user is a member
          channels = await client.searchRead('discuss.channel',
            [
              ['channel_member_ids.partner_id', '=', currentPartnerId],
              '|',
              ['channel_type', '=', 'chat'],      // Direct messages
              ['channel_type', '=', 'channel']    // Group channels
            ],
            [
              'id', 'name', 'description', 'channel_type', 'channel_member_ids',
              'uuid', 'is_member', 'member_count', 'avatar_128'
            ],
            { order: 'id desc' }
          );

          console.log(`📱 Found ${channels.length} channels with partner filter`);
        }
      } catch (error) {
        console.warn('❌ Partner-based filtering failed:', error);
      }

      // Fallback: If no channels found with partner filter, try simpler approach
      if (channels.length === 0) {
        console.log('📱 Trying fallback approach - loading channels with is_member filter...');

        try {
          channels = await client.searchRead('discuss.channel',
            [
              ['is_member', '=', true],
              '|',
              ['channel_type', '=', 'chat'],      // Direct messages
              ['channel_type', '=', 'channel']    // Group channels
            ],
            [
              'id', 'name', 'description', 'channel_type', 'channel_member_ids',
              'uuid', 'is_member', 'member_count', 'avatar_128'
            ],
            { order: 'id desc' }
          );

          console.log(`📱 Found ${channels.length} channels with is_member filter`);
        } catch (fallbackError) {
          console.warn('❌ is_member filtering also failed:', fallbackError);

          // Last resort: Load all channels and filter client-side
          console.log('📱 Last resort - loading all channels...');
          channels = await client.searchRead('discuss.channel',
            [
              '|',
              ['channel_type', '=', 'chat'],      // Direct messages
              ['channel_type', '=', 'channel']    // Group channels
            ],
            [
              'id', 'name', 'description', 'channel_type', 'channel_member_ids',
              'uuid', 'is_member', 'member_count', 'avatar_128'
            ],
            { order: 'id desc', limit: 50 } // Limit to prevent too many results
          );

          console.log(`📱 Found ${channels.length} total channels (unfiltered)`);
        }
      }

      console.log(`📱 Loaded ${channels.length} chat channels`);

      // Process channels and detect direct messages (but don't auto-subscribe)
      for (const channel of channels) {
        const processedChannel = await this.processChannel(channel);
        this.currentChannels.set(processedChannel.id, processedChannel);
        // Don't auto-subscribe to all channels - only subscribe when user opens a chat
      }

      this.emit('channelsLoaded', Array.from(this.currentChannels.values()));

    } catch (error) {
      console.error('❌ Failed to load channels:', error);
      this.emit('error', { type: 'loadChannels', error });
    }
  }

  /**
   * Process channel data to handle both direct messages and group channels
   */
  private async processChannel(channel: any): Promise<ChatChannel> {
    console.log(`📱 Processing channel: ${channel.name} (Type: ${channel.channel_type})`);

    if (channel.channel_type === 'chat') {
      // Direct message - try to get correspondent name but don't fail if it doesn't work
      return {
        ...channel,
        name: channel.name || 'Direct Message',
        channel_type: 'chat',
        correspondent: {
          id: 0,
          name: channel.name || 'Direct Message',
          avatar: null,
          is_online: false
        }
      };
    } else if (channel.channel_type === 'channel') {
      // Group channel
      return {
        ...channel,
        name: channel.name || 'Group Chat',
        channel_type: 'channel',
        member_count: channel.member_count || 0
      };
    }

    // Fallback for other channel types
    return {
      ...channel,
      name: channel.name || 'Unknown Channel',
      channel_type: channel.channel_type || 'unknown'
    };
  }

  /**
   * Load messages for a specific channel
   */
  async loadChannelMessages(channelId: number, limit = 50): Promise<ChatMessage[]> {
    try {
      console.log(`📨 Loading messages for channel ${channelId} with limit ${limit}...`);

      const client = authService.getClient();
      if (!client) {
        throw new Error('No authenticated client available');
      }

      const messages = await client.searchRead('mail.message',
        [
          ['model', '=', 'discuss.channel'],
          ['res_id', '=', channelId]
        ],
        ['id', 'body', 'author_id', 'date', 'message_type', 'attachment_ids', 'partner_ids', 'email_from'],
        { order: 'date desc', limit }
      );

      console.log(`📨 Found ${messages.length} messages for channel ${channelId}`);

      // Debug: Log first few messages to see the data structure
      if (messages.length > 0) {
        console.log('📨 Sample message data:', JSON.stringify(messages[0], null, 2));
      }

      // Process messages to ensure proper author names
      const processedMessages = messages.map(msg => {
        let authorName = 'Unknown User';

        // Handle different author_id formats from Odoo XML-RPC
        if (msg.author_id) {
          if (Array.isArray(msg.author_id) && msg.author_id.length > 1) {
            authorName = msg.author_id[1];
          } else if (typeof msg.author_id === 'string') {
            // Parse XML-RPC array string format
            const match = msg.author_id.match(/<value><int>(\d+)<\/int><\/value>\s*<value><string>([^<]+)<\/string>/);
            if (match) {
              authorName = match[2];
            }
          }

          // Clean up company name from author (e.g., "ITMS Group Pty Ltd, Mark Shaw" -> "Mark Shaw")
          if (authorName && authorName.includes(',')) {
            const parts = authorName.split(',').map(part => part.trim());
            if (parts.length > 1) {
              authorName = parts[parts.length - 1];
            }
          }
        }

        // Also try email_from as fallback
        if (authorName === 'Unknown User' && msg.email_from) {
          const emailMatch = msg.email_from.match(/"([^"]+)"/);
          if (emailMatch) {
            authorName = emailMatch[1];
          }
        }

        // Add cleaned author name to message
        return {
          ...msg,
          authorName: authorName,
          cleanAuthorName: authorName
        };
      });

      // Reverse to get chronological order
      const sortedMessages = processedMessages.reverse();

      this.channelMessages.set(channelId, sortedMessages);
      this.emit('messagesLoaded', { channelId, messages: sortedMessages });

      return sortedMessages;
    } catch (error) {
      console.error(`❌ Failed to load messages for channel ${channelId}:`, error);
      this.emit('error', { type: 'loadMessages', error });
      return [];
    }
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(channelId: number, body: string, messageType: 'comment' | 'notification' = 'comment'): Promise<boolean> {
    try {
      const client = authService.getClient();
      if (!client) {
        throw new Error('No authenticated client available');
      }

      // Ensure body is clean string (no HTML encoding)
      const cleanBody = String(body).trim();
      if (!cleanBody) {
        throw new Error('Message body cannot be empty');
      }

      // Ensure channelId is a proper number
      const numericChannelId = Number(channelId);
      if (!numericChannelId || isNaN(numericChannelId)) {
        throw new Error(`Invalid channel ID: ${channelId}`);
      }

      // Verify the user exists before sending (for debugging)
      const userId = Number(client.uid);
      console.log(`📤 Sending message as user ID ${userId} (Odoo will set author automatically)`);

      try {
        const userExists = await client.searchRead('res.users',
          [['id', '=', userId]],
          ['id', 'name'],
          { limit: 1 }
        );

        if (userExists.length === 0) {
          throw new Error(`User ID ${userId} does not exist`);
        }

        console.log(`✅ Verified user exists: ${userExists[0].name} (ID: ${userId})`);
      } catch (verifyError) {
        console.error(`❌ User verification failed for ID ${userId}:`, verifyError);
        throw new Error(`Cannot send message: User ID ${userId} is invalid`);
      }

      // Create the message data for Odoo
      const messageData = {
        body: cleanBody,
        message_type: messageType,
        model: 'discuss.channel',
        res_id: numericChannelId
      };

      console.log(`📤 Sending message to channel ${numericChannelId}:`, messageData);

      // Use the create method to add the message
      const messageId = await client.call('create', 'mail.message', messageData);

      console.log(`📤 Message sent to channel ${numericChannelId}: ${messageId}`);

      // Stop typing indicator
      this.stopTyping(numericChannelId);

      this.emit('messageSent', { channelId: numericChannelId, messageId, body: cleanBody });
      return true;

    } catch (error) {
      console.error(`❌ Failed to send message to channel ${channelId}:`, error);
      this.emit('error', { type: 'sendMessage', error });
      return false;
    }
  }

  /**
   * Start typing indicator
   */
  startTyping(channelId: number): void {
    const key = `${channelId}`;
    
    // Clear existing timer
    if (this.typingTimers.has(key)) {
      clearTimeout(this.typingTimers.get(key)!);
    }

    // Send typing notification via WebSocket
    webSocketService.sendMessage({
      event_name: 'typing_start',
      data: {
        channel_id: channelId,
        is_typing: true
      }
    });

    // Set timer to auto-stop typing
    const timer = setTimeout(() => {
      this.stopTyping(channelId);
    }, this.TYPING_TIMEOUT);
    
    this.typingTimers.set(key, timer);
    
    this.emit('typingStarted', { channelId });
  }

  /**
   * Stop typing indicator
   */
  stopTyping(channelId: number): void {
    const key = `${channelId}`;
    
    // Clear timer
    if (this.typingTimers.has(key)) {
      clearTimeout(this.typingTimers.get(key)!);
      this.typingTimers.delete(key);
    }

    // Send stop typing notification
    webSocketService.sendMessage({
      event_name: 'typing_stop',
      data: {
        channel_id: channelId,
        is_typing: false
      }
    });

    this.emit('typingStopped', { channelId });
  }

  /**
   * Subscribe to a channel for real-time updates (Odoo 18)
   */
  subscribeToChannel(channelId: number): void {
    const channelName = `discuss.channel_${channelId}`;
    webSocketService.subscribeToChannel(channelName);
    console.log(`📱 Subscribed to channel: ${channelName}`);
  }

  /**
   * Unsubscribe from a channel (Odoo 18)
   */
  unsubscribeFromChannel(channelId: number): void {
    const channelName = `discuss.channel_${channelId}`;
    webSocketService.unsubscribeFromChannel(channelName);
    console.log(`👋 Unsubscribed from channel: ${channelName}`);
  }

  /**
   * Handle new message from WebSocket
   */
  private handleNewMessage(message: ChatMessage): void {
    console.log('📨 New message received:', message);
    
    if (message.model === 'discuss.channel' && message.res_id) {
      const channelId = message.res_id;
      
      // Add to channel messages
      if (!this.channelMessages.has(channelId)) {
        this.channelMessages.set(channelId, []);
      }
      
      const messages = this.channelMessages.get(channelId)!;
      
      // Check if message already exists
      const exists = messages.some(m => m.id === message.id);
      if (!exists) {
        messages.push(message);
        this.channelMessages.set(channelId, messages);
        
        this.emit('newMessage', { channelId, message });
      }
    }
  }

  /**
   * Handle channel update from WebSocket
   */
  private handleChannelUpdate(channel: ChatChannel): void {
    console.log('📱 Channel updated:', channel);
    
    this.currentChannels.set(channel.id, channel);
    this.emit('channelUpdated', channel);
  }

  /**
   * Handle bus notification
   */
  private handleBusNotification(notification: any): void {
    console.log('🚌 Bus notification:', notification);
    
    // Handle typing notifications
    if (notification.type === 'typing') {
      this.handleTypingNotification(notification);
    }
    
    this.emit('busNotification', notification);
  }

  /**
   * Handle typing notification
   */
  private handleTypingNotification(notification: any): void {
    const { channel_id, user_id, user_name, is_typing } = notification;
    
    if (!this.typingUsers.has(channel_id)) {
      this.typingUsers.set(channel_id, new Map());
    }
    
    const channelTyping = this.typingUsers.get(channel_id)!;
    
    if (is_typing) {
      channelTyping.set(user_id, {
        id: user_id,
        name: user_name,
        isTyping: true,
        lastTypingTime: Date.now()
      });
    } else {
      channelTyping.delete(user_id);
    }
    
    this.emit('typingChanged', {
      channelId: channel_id,
      typingUsers: Array.from(channelTyping.values())
    });
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): number | null {
    return this.currentUserId;
  }

  /**
   * Get current user partner ID
   */
  getCurrentUserPartnerId(): number | null {
    return this.currentUserPartnerId;
  }

  /**
   * Get channels
   */
  getChannels(): ChatChannel[] {
    return Array.from(this.currentChannels.values());
  }

  /**
   * Get messages for a channel
   */
  getChannelMessages(channelId: number): ChatMessage[] {
    return this.channelMessages.get(channelId) || [];
  }

  /**
   * Get typing users for a channel
   */
  getTypingUsers(channelId: number): TypingUser[] {
    const channelTyping = this.typingUsers.get(channelId);
    return channelTyping ? Array.from(channelTyping.values()) : [];
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
          console.error(`Error in Chat service listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get authenticated client
   */
  getAuthenticatedClient() {
    return authService.getClient();
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      channelCount: this.currentChannels.size,
      websocketStatus: webSocketService.getConnectionStatus()
    };
  }

  /**
   * Cleanup
   */
  disconnect(): void {
    this.typingTimers.forEach(timer => clearTimeout(timer));
    this.typingTimers.clear();
    this.currentChannels.clear();
    this.channelMessages.clear();
    this.typingUsers.clear();
    this.eventListeners.clear();
    this.isInitialized = false;
  }
}

// Create singleton instance
export const chatService = new ChatService();
export default chatService;
