/**
 * ChatService - Chat Service for Odoo Integration
 * Model-specific service for discuss.channel
 *
 * MIGRATED: From src/services/chat.ts
 * Handles real-time messaging, typing indicators, and presence
 */

import longpollingService from '../../base/services/BaseLongpollingService';
import { authService } from '../../base/services/BaseAuthService';
import { syncService } from '../../base/services/BaseSyncService';

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

  // Polling for new messages
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastMessageIds: { [channelId: number]: number } = {};
  private POLLING_INTERVAL = 3000; // 3 seconds - reduced frequency
  private currentPollingChannelId: number | null = null;

  constructor() {
    this.setupLongpollingListeners();
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
      
      // 🎉 HTTP Longpolling for real-time updates!
      console.log('🔗 Starting HTTP longpolling for real-time updates');
      const longpollingStarted = await longpollingService.start();
      console.log(`🔗 Longpolling start result: ${longpollingStarted}`);
      
      if (!longpollingStarted) {
        console.warn('⚠️ Longpolling service failed to start, chat will use polling fallback');
      } else {
        console.log('✅ Longpolling service started successfully!');
      }

      // Set current user info
      const client = authService.getClient();
      if (client) {
        this.currentUserId = client.uid;
        console.log(`👤 Chat service user ID: ${this.currentUserId}`);

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

      // Trigger sync for chat data to ensure offline availability
      try {
        console.log('📱 Triggering sync for chat data...');
        await syncService.startSync(['discuss.channel', 'mail.message']);
        console.log('✅ Chat data sync completed');
      } catch (syncError) {
        console.warn('⚠️ Chat data sync failed, continuing with cached data:', syncError);
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
   * Setup HTTP Longpolling event listeners
   */
  private setupLongpollingListeners(): void {
    console.log('🔗 Setting up HTTP longpolling listeners for real-time updates');
    
    longpollingService.on('chatMessage', (message: any) => {
      this.handleNewMessage(message);
    });

    longpollingService.on('notification', (notification: any) => {
      this.handleBusNotification(notification);
    });

    longpollingService.on('presenceUpdate', (presence: any) => {
      this.emit('presenceUpdate', presence);
    });

    // Monitor longpolling status (reduced frequency)
    setInterval(() => {
      const status = longpollingService.getStatus();
      this.emit('connectionChanged', status.isActive ? 'connected' : 'disconnected');

      // Debug: Log status occasionally
      if (Math.random() < 0.1) { // Only 10% of the time
        console.log(`📡 Longpolling status: ${status.isActive ? 'Active' : 'Inactive'}, Channels: ${status.channelCount}`);
      }
    }, 10000); // Reduced to every 10 seconds
  }

  /**
   * Load chat channels from cache first, then from Odoo (sorted by last activity)
   */
  private async loadChannels(): Promise<void> {
    try {
      const client = authService.getClient();
      if (!client) {
        throw new Error('No authenticated client available');
      }

      console.log('📱 Loading chat channels (cache first, then live data)...');
      console.log(`👤 Current user ID: ${client.uid}`);

      let channels = [];

      // Try to load from cache first for faster loading
      try {
        const cachedChannels = await syncService.getCachedData('discuss.channel');
        if (cachedChannels && cachedChannels.length > 0) {
          console.log(`📱 Found ${cachedChannels.length} cached channels - using offline data`);
          channels = cachedChannels;

          // Process and emit cached channels immediately for fast UI
          const processedChannels = [];
          for (const channel of channels) {
            const processedChannel = await this.processChannel(channel);
            this.currentChannels.set(processedChannel.id, processedChannel);
            processedChannels.push(processedChannel);
          }

          // Sort and emit cached data immediately
          const sortedChannels = await this.sortChannelsByLastActivity(processedChannels);
          this.emit('channelsLoaded', sortedChannels);

          // Continue to load fresh data in background but don't block UI
          console.log('📱 Cached channels loaded, fetching fresh data in background...');
        }
      } catch (cacheError) {
        console.warn('⚠️ Failed to load cached channels:', cacheError);
      }

      // Always try to get fresh data (but don't block if we have cache)
      const shouldLoadFresh = true; // Always refresh for real-time chat
      if (shouldLoadFresh) {
        console.log('📱 Loading channels from server...');

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
      } // Close the if (channels.length === 0) block

      console.log(`📱 Loaded ${channels.length} chat channels`);

      // Process channels and detect direct messages (but don't auto-subscribe)
      const processedChannels = [];
      for (const channel of channels) {
        const processedChannel = await this.processChannel(channel);
        this.currentChannels.set(processedChannel.id, processedChannel);
        processedChannels.push(processedChannel);
        // Don't auto-subscribe to all channels - only subscribe when user opens a chat
      }

      // Sort channels by last activity (most recent first)
      const sortedChannels = await this.sortChannelsByLastActivity(processedChannels);

      this.emit('channelsLoaded', sortedChannels);

    } catch (error) {
      console.error('❌ Failed to load channels:', error);
      this.emit('error', { type: 'loadChannels', error });
    }
  }

  /**
   * Sort channels by last activity (most recent first)
   */
  private async sortChannelsByLastActivity(channels: ChatChannel[]): Promise<ChatChannel[]> {
    try {
      const client = authService.getClient();
      if (!client) return channels;

      // Get last message for each channel to sort by activity
      const channelsWithActivity = await Promise.all(
        channels.map(async (channel) => {
          try {
            // Try to get cached messages first
            let lastMessage = null;
            try {
              const cachedMessages = await syncService.getCachedData('mail.message', {
                model: 'discuss.channel',
                res_id: channel.id
              });
              if (cachedMessages && cachedMessages.length > 0) {
                lastMessage = cachedMessages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
              }
            } catch (cacheError) {
              // Fallback to live data
              const messages = await client.searchRead('mail.message',
                [
                  ['model', '=', 'discuss.channel'],
                  ['res_id', '=', channel.id]
                ],
                ['id', 'date'],
                { order: 'date desc', limit: 1 }
              );
              if (messages.length > 0) {
                lastMessage = messages[0];
              }
            }

            return {
              ...channel,
              lastActivity: lastMessage ? new Date(lastMessage.date) : new Date(channel.write_date || channel.create_date || 0),
              lastMessageId: lastMessage?.id || 0
            };
          } catch (error) {
            // If we can't get last message, use channel creation date
            return {
              ...channel,
              lastActivity: new Date(channel.write_date || channel.create_date || 0),
              lastMessageId: 0
            };
          }
        })
      );

      // Sort by last activity (most recent first)
      return channelsWithActivity.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
    } catch (error) {
      console.warn('⚠️ Failed to sort channels by activity:', error);
      return channels;
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
   * Load messages for a specific channel (cache first, then live data)
   * Limited to last 50 messages by default for performance
   */
  async loadChannelMessages(channelId: number, limit = 50, offset = 0): Promise<ChatMessage[]> {
    try {
      console.log(`📨 Loading messages for channel ${channelId} (cache first)...`);

      const client = authService.getClient();
      if (!client) {
        throw new Error('No authenticated client available');
      }

      let messages = [];

      // Try to load from cache first for instant loading
      try {
        const cachedMessages = await syncService.getCachedData('mail.message', {
          model: 'discuss.channel',
          res_id: channelId
        });
        if (cachedMessages && cachedMessages.length > 0) {
          console.log(`📨 Found ${cachedMessages.length} cached messages for channel ${channelId} - using offline data`);
          messages = cachedMessages
            .filter(msg => msg.model === 'discuss.channel' && msg.res_id === channelId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, limit);

          // Process and emit cached messages immediately
          if (messages.length > 0) {
            const processedMessages = messages.map(msg => {
              let authorName = 'Unknown User';
              if (msg.author_id && Array.isArray(msg.author_id) && msg.author_id.length > 1) {
                authorName = msg.author_id[1];
                if (authorName.includes(',')) {
                  const parts = authorName.split(',').map(part => part.trim());
                  if (parts.length > 1) {
                    authorName = parts[parts.length - 1];
                  }
                }
              }
              return { ...msg, authorName, cleanAuthorName: authorName };
            }).reverse(); // Chronological order

            this.channelMessages.set(channelId, processedMessages);
            this.emit('messagesLoaded', { channelId, messages: processedMessages });

            console.log(`📨 Cached messages loaded, fetching fresh data in background...`);
          }
        }
      } catch (cacheError) {
        console.warn('⚠️ Failed to load cached messages:', cacheError);
      }

      // Always try to get fresh data in background for real-time updates
      try {
        console.log(`📨 Loading fresh messages from server for channel ${channelId} (limit: ${limit}, offset: ${offset})...`);
        const freshMessages = await client.searchRead('mail.message',
          [
            ['model', '=', 'discuss.channel'],
            ['res_id', '=', channelId]
          ],
          ['id', 'body', 'author_id', 'date', 'message_type', 'attachment_ids', 'partner_ids', 'email_from'],
          { order: 'date desc', limit, offset }
        );

        // Only update if we got fresh data
        if (freshMessages.length > 0) {
          messages = freshMessages;
        }
      } catch (serverError) {
        console.warn('⚠️ Failed to load fresh messages, using cached data:', serverError);
        // If we have cached messages, that's fine - we already emitted them
        if (messages.length > 0) {
          return messages.map(msg => ({ ...msg, authorName: 'Cached User', cleanAuthorName: 'Cached User' }));
        }
        throw serverError; // Only throw if we have no cached data
      }

      console.log(`📨 Found ${messages.length} messages for channel ${channelId}`);

      // Debug: Log first few messages to see the data structure (reduced logging)
      // if (messages.length > 0) {
      //   console.log('📨 Sample message data:', JSON.stringify(messages[0], null, 2));
      // }

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
   * Send a message to a channel - Simple & Direct
   */
  async sendMessage(channelId: number, body: string): Promise<boolean> {
    try {
      const client = authService.getClient();
      if (!client) {
        throw new Error('No authenticated client available');
      }

      const cleanBody = String(body).trim();
      if (!cleanBody) {
        throw new Error('Message body cannot be empty');
      }

      console.log(`📤 Sending message to channel ${channelId}: "${cleanBody}"`);

      // FIXED: Use the correct Odoo XML-RPC method for message sending
      try {
        // Method 1: Try discuss.channel.message_post (Odoo 18)
        await client.callModel('discuss.channel', 'message_post', [channelId], {
          body: cleanBody,
          message_type: 'comment'
        });
        console.log('✅ Message sent via discuss.channel.message_post');
      } catch (discussError) {
        console.warn('⚠️ discuss.channel failed, trying mail.channel fallback:', discussError.message);
        
        // Method 2: Fallback to mail.channel.message_post
        await client.callModel('mail.channel', 'message_post', [channelId], {
          body: cleanBody,
          message_type: 'comment'
        });
        console.log('✅ Message sent via mail.channel.message_post');
      }

      // Stop typing indicator
      this.stopTyping(channelId);

      // Immediately add optimistic message to UI
      const optimisticMessage = {
        id: -Math.floor(Date.now() / 1000), // Negative timestamp to avoid conflicts with real IDs
        body: cleanBody,
        author_id: [this.currentUserId, 'You'],
        date: new Date().toISOString(),
        message_type: 'comment',
        model: 'discuss.channel',
        res_id: channelId,
        authorName: 'You',
        cleanAuthorName: 'You',
        isOptimistic: true // Flag to identify optimistic messages
      };

      // Add to local messages immediately
      const existingMessages = this.channelMessages.get(channelId) || [];
      const updatedMessages = [...existingMessages, optimisticMessage];
      this.channelMessages.set(channelId, updatedMessages);

      // Emit immediately for instant UI update
      this.emit('newMessages', { channelId, messages: [optimisticMessage] });
      this.emit('messagesUpdated', { channelId });

      // Trigger message refresh to get the real message and replace optimistic one
      setTimeout(() => {
        this.checkForNewMessages(channelId);
      }, 500);

      this.emit('messageSent', { channelId, body: cleanBody });
      return true;

    } catch (error) {
      console.error(`❌ Failed to send message:`, error);
      this.emit('error', { type: 'sendMessage', error, channelId });
      return false;
    }
  }

  /**
   * Load more messages for a channel (pagination)
   */
  async loadMoreMessages(channelId: number, limit = 50): Promise<ChatMessage[]> {
    try {
      const existingMessages = this.channelMessages.get(channelId) || [];
      const offset = existingMessages.length;

      console.log(`📨 Loading more messages for channel ${channelId} (offset: ${offset})...`);

      const olderMessages = await this.loadChannelMessages(channelId, limit, offset);

      if (olderMessages.length > 0) {
        // Prepend older messages to existing ones
        const allMessages = [...olderMessages, ...existingMessages];
        this.channelMessages.set(channelId, allMessages);
        this.emit('messagesLoaded', { channelId, messages: allMessages });

        console.log(`📨 Loaded ${olderMessages.length} more messages for channel ${channelId}`);
      }

      return olderMessages;
    } catch (error) {
      console.error(`❌ Failed to load more messages:`, error);
      return [];
    }
  }

  /**
   * Refresh messages for a channel (simple reload)
   */
  async refreshChannelMessages(channelId: number): Promise<void> {
    try {
      await this.loadChannelMessages(channelId, 50);
    } catch (error) {
      console.error(`❌ Failed to refresh messages:`, error);
    }
  }

  /**
   * Start aggressive polling for better real-time feel
   */
  startPolling(channelId: number): void {
    // Stop existing polling
    this.stopPolling();

    // Set current polling channel
    this.currentPollingChannelId = channelId;

    // Backup polling - every 3 seconds (reduced frequency)
    this.pollingInterval = setInterval(async () => {
      await this.checkForNewMessages(channelId);
    }, 3000);
  }

  /**
   * Check for new messages efficiently (only get newer messages)
   */
  private async checkForNewMessages(channelId: number): Promise<void> {
    try {
      const client = authService.getClient();
      if (!client) return;

      // Get the last message ID we know about
      const existingMessages = this.channelMessages.get(channelId) || [];
      const lastMessageId = existingMessages.length > 0 ?
        Math.max(...existingMessages.map(m => m.id)) : 0;

      // Only get messages newer than what we have
      const newMessages = await client.searchRead('mail.message',
        [
          ['model', '=', 'discuss.channel'],
          ['res_id', '=', channelId],
          ['id', '>', lastMessageId]
        ],
        ['id', 'body', 'author_id', 'date', 'message_type', 'attachment_ids', 'partner_ids', 'email_from'],
        { order: 'id asc' }
      );

      if (newMessages.length > 0) {
        // Process new messages
        const processedMessages = newMessages.map(msg => {
          let authorName = 'Unknown User';
          if (msg.author_id && Array.isArray(msg.author_id) && msg.author_id.length > 1) {
            authorName = msg.author_id[1];
            // Clean up company name
            if (authorName.includes(',')) {
              const parts = authorName.split(',').map(part => part.trim());
              if (parts.length > 1) {
                authorName = parts[parts.length - 1];
              }
            }
          }
          return {
            ...msg,
            authorName: authorName,
            cleanAuthorName: authorName
          };
        });

        // Remove optimistic messages and add real messages
        const filteredExisting = existingMessages.filter(msg => !msg.isOptimistic);
        const updatedMessages = [...filteredExisting, ...processedMessages];

        // Sort by date to maintain order
        updatedMessages.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        this.channelMessages.set(channelId, updatedMessages);

        // Emit event for UI update
        this.emit('newMessages', { channelId, messages: processedMessages });
        this.emit('messagesUpdated', { channelId });

        console.log(`📨 Added ${processedMessages.length} new messages, removed optimistic messages`);
      }
    } catch (error) {
      // Silent fail to avoid log spam
    }
  }

  /**
   * Stop polling for new messages
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.currentPollingChannelId = null;
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

    console.log(`⌨️ Started typing in channel ${channelId}`);

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

    console.log(`⌨️ Stopped typing in channel ${channelId}`);

    this.emit('typingStopped', { channelId });
  }

  /**
   * Subscribe to a channel for real-time updates via HTTP longpolling
   */
  subscribeToChannel(channelId: number): void {
    const channelName = `discuss.channel_${channelId}`;
    console.log(`📱 ChatService subscribing to channel: ${channelName}`);
    
    longpollingService.subscribeToChannel(channelName);
    console.log(`📱 Longpolling subscription completed for: ${channelName}`);
    
    // Also start regular polling as backup
    console.log(`🔄 Starting backup polling for channel ${channelId}`);
    this.startPolling(channelId);
    
    console.log(`✅ Full subscription setup completed for channel ${channelId}`);
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribeFromChannel(channelId: number): void {
    const channelName = `discuss.channel_${channelId}`;
    longpollingService.unsubscribeFromChannel(channelName);
    console.log(`👋 Unsubscribed from longpolling channel: ${channelName}`);
    
    // Stop regular polling
    if (this.currentPollingChannelId === channelId) {
      this.stopPolling();
    }
  }

  /**
   * Handle new message from longpolling
   */
  private handleNewMessage(message: any): void {
    console.log('📨 New message received via longpolling:', message);
    
    // Process the message based on the payload structure
    let channelId: number;
    let processedMessage: ChatMessage;
    
    if (message.model === 'discuss.channel' && message.res_id) {
      channelId = message.res_id;
      processedMessage = message as ChatMessage;
    } else if (message.channel_id) {
      channelId = message.channel_id;
      processedMessage = message as ChatMessage;
    } else {
      console.warn('⚠️ Could not determine channel ID from message:', message);
      return;
    }
    
    // Add to channel messages
    if (!this.channelMessages.has(channelId)) {
      this.channelMessages.set(channelId, []);
    }
    
    const messages = this.channelMessages.get(channelId)!;
    
    // Check if message already exists
    const exists = messages.some(m => m.id === processedMessage.id);
    if (!exists) {
      messages.push(processedMessage);
      this.channelMessages.set(channelId, messages);
      
      this.emit('newMessage', { channelId, message: processedMessage });
      this.emit('messagesUpdated', { channelId });
      
      // Also emit the format expected by UI components
      this.emit('newMessages', { channelId, messages: [processedMessage] });
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
      longpollingStatus: longpollingService.getStatus()
    };
  }

  /**
   * Cleanup
   */
  disconnect(): void {
    // Stop longpolling service
    longpollingService.stop();
    
    // Stop regular polling
    this.stopPolling();
    
    // Clear timers and data
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
