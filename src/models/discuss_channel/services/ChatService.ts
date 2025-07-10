/**
 * ChatService - Chat Service for Odoo Integration (FIXED for Real-time)
 * Model-specific service for discuss.channel
 *
 * CRITICAL FIX: Handles race conditions between polling and longpolling
 */

import longpollingService from '../../base/services/BaseLongpollingService';
import { authService } from '../../base/services/BaseAuthService';
import { syncService } from '../../base/services/BaseSyncService';
import { databaseService } from '../../base/services/BaseDatabaseService';
import syncCoordinator from '../../sync_management/services/SyncCoordinator';
import { channelMemberService } from './ChannelMemberService';
import { useAppStore } from '../../../store';

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
  fold_state?: 'open' | 'folded' | 'closed';
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
  private lastRenderedMessages = new Map<number, ChatMessage[]>(); // Cache of last displayed messages
  private typingUsers = new Map<number, Map<number, TypingUser>>();
  private eventListeners = new Map<string, Function[]>();

  // Typing timeout
  private TYPING_TIMEOUT = 3000;
  private typingTimers = new Map<string, NodeJS.Timeout>();

  // Polling for new messages
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastMessageIds: { [channelId: number]: number } = {};
  private POLLING_INTERVAL = 10000; // Increased to 10 seconds to reduce race conditions with longpolling
  private currentPollingChannelId: number | null = null;

  // CRITICAL FIX: Track message sources to handle race conditions
  private messageProcessingLock = new Map<number, boolean>(); // channelId -> isProcessing
  private recentlyProcessedMessages = new Set<number>(); // Track recent message IDs
  private globalMessageCache = new Map<number, { timestamp: number, source: string }>(); // Global deduplication

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

      // Trigger sync for chat data to ensure offline availability (coordinated with fallback)
      try {
        console.log('📱 Requesting sync for chat data via coordinator...');
        try {
          await syncCoordinator.requestSync(['discuss.channel', 'discuss.channel.member', 'mail.message'], 'chat-service-init');
        } catch (coordinatorError: any) {
          console.log(`⚠️ Sync coordinator failed, using direct sync: ${coordinatorError.message}`);
          // Fallback to direct sync service
          await syncService.startSync(['discuss.channel', 'discuss.channel.member', 'mail.message']);
        }
        console.log('✅ Chat data sync completed');
      } catch (syncError: any) {
        console.warn('⚠️ Chat data sync failed, continuing with cached data:', syncError.message);
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
   * Setup HTTP Longpolling event listeners - FIXED FOR REAL-TIME RECEIVING
   */
  private setupLongpollingListeners(): void {
    console.log('🔗 Setting up HTTP longpolling listeners for real-time updates');
    
    // CRITICAL FIX: Properly handle incoming chat messages
    longpollingService.on('chatMessage', (message: any) => {
      // CHECK: Look for call-related messages
      if (message.body && message.body.includes('conference')) {
        console.log('📞 Call message via longpolling');
      }

      this.handleIncomingMessage(message, 'longpolling');
    });

    longpollingService.on('notification', (notification: any) => {
      console.log('🔔 INCOMING NOTIFICATION:', notification);
      this.handleBusNotification(notification);
    });

    // NEW: Listen for call invitations from longpolling
    longpollingService.on('callInvitation', (invitation: any) => {
      console.log('📞 CALL INVITATION received in ChatService from longpolling:', invitation);
      this.emit('callInvitation', invitation);
    });

    // REMOVED: This was causing infinite loops - CallService already listens to longpolling directly

    longpollingService.on('presenceUpdate', (presence: any) => {
      this.emit('presenceUpdate', presence);
    });

    // Monitor longpolling status
    setInterval(() => {
      const status = longpollingService.getStatus();
      this.emit('connectionChanged', status.isActive ? 'connected' : 'disconnected');

      // Debug: Log status occasionally
      if (Math.random() < 0.1) { // Only 10% of the time
        console.log(`📡 Longpolling status: ${status.isActive ? 'Active' : 'Inactive'}, Channels: ${status.channelCount}`);
      }
    }, 10000); // Every 10 seconds
  }

  /**
   * CRITICAL FIX: Handle incoming messages with proper deduplication
   */
  private async handleIncomingMessage(messageData: any, source: 'longpolling' | 'polling' = 'longpolling'): Promise<void> {
    // Only log message ID and source, not full content
    console.log(`📨 Processing msg ${messageData.id} from ${source}`);

    try {
      // GLOBAL DEDUPLICATION: Check if this exact message was recently processed
      const messageId = messageData.id;
      const now = Date.now();
      const recentMessage = this.globalMessageCache.get(messageId);

      if (recentMessage && (now - recentMessage.timestamp) < 5000) { // 5 second window
        console.log(`📨 Msg ${messageId} already processed, skipping ${source}`);
        return;
      }

      // Mark this message as being processed
      this.globalMessageCache.set(messageId, { timestamp: now, source });

      // Clean up old entries (older than 30 seconds)
      for (const [id, entry] of this.globalMessageCache.entries()) {
        if (now - entry.timestamp > 30000) {
          this.globalMessageCache.delete(id);
        }
      }

      // Determine the channel ID
      let channelId: number;
      if (messageData.res_id && messageData.model === 'discuss.channel') {
        channelId = messageData.res_id;
      } else if (messageData.channel_id) {
        channelId = messageData.channel_id;
      } else {
        console.warn('⚠️ Could not determine channel ID from message:', messageData);
        return;
      }

      // CRITICAL FIX: Use processing lock to prevent race conditions
      if (this.messageProcessingLock.get(channelId)) {
        console.log(`🔒 Channel ${channelId} is already processing messages, queuing...`);
        // Wait a bit and try again
        setTimeout(() => this.handleIncomingMessage(messageData, source), 100);
        return;
      }

      this.messageProcessingLock.set(channelId, true);

      try {
        // Parse author_id properly for XML-RPC format
        let authorId = messageData.author_id;
        let authorName = 'Unknown User';

        if (typeof authorId === 'string' && authorId.includes('<value><int>')) {
          // Parse XML-RPC format: "<array><data><value><int>844</int>"
          const idMatch = authorId.match(/<value><int>(\d+)<\/int>/);
          const nameMatch = authorId.match(/<value><string>([^<]+)<\/string>/);
          
          if (idMatch) {
            const parsedId = parseInt(idMatch[1]);
            const parsedName = nameMatch ? nameMatch[1] : 'Unknown User';
            authorId = [parsedId, parsedName];
            authorName = parsedName;
          }
        } else if (Array.isArray(authorId) && authorId.length > 1) {
          authorName = authorId[1];
        }

        // Clean up company name from author (e.g., "ITMS Group Pty Ltd, Mark Shaw" -> "Mark Shaw")
        if (authorName && authorName.includes(',')) {
          const parts = authorName.split(',').map(part => part.trim());
          if (parts.length > 1) {
            authorName = parts[parts.length - 1];
          }
        }

        // Convert server date (UTC) to local timezone
        let localDate = messageData.date || new Date().toISOString();
        if (messageData.date) {
          try {
            // Odoo sends dates in UTC format like "2025-07-08 00:35:58"
            // We need to treat this as UTC and convert to local time
            let serverDate: Date;

            if (messageData.date.includes('T')) {
              // Already in ISO format
              serverDate = new Date(messageData.date);
            } else {
              // Odoo format: "2025-07-08 00:35:58" - treat as UTC
              serverDate = new Date(messageData.date + 'Z'); // Add Z to indicate UTC
            }

            localDate = serverDate.toISOString();
            console.log(`🕐 Converted server time ${messageData.date} to local: ${localDate}`);
          } catch (error) {
            console.warn('⚠️ Failed to parse message date:', messageData.date);
            localDate = new Date().toISOString();
          }
        }

        // Process the message to match our ChatMessage interface
        const processedMessage: ChatMessage = {
          id: messageData.id,
          body: messageData.body || '',
          author_id: Array.isArray(authorId) ? authorId : [0, authorName],
          date: localDate,
          message_type: messageData.message_type || 'comment',
          model: messageData.model || 'discuss.channel',
          res_id: channelId,
          attachment_ids: messageData.attachment_ids || [],
          partner_ids: messageData.partner_ids || []
        };

        // Add processed fields
        (processedMessage as any).authorName = authorName;
        (processedMessage as any).cleanAuthorName = authorName;

        console.log(`📨 Processed msg ${processedMessage.id} for channel ${channelId} (${source})`);

        // Enrich message with attachment details if it has attachments
        let enrichedMessage = processedMessage;
        if (processedMessage.attachment_ids && processedMessage.attachment_ids.length > 0) {
          console.log(`🔗 Message ${processedMessage.id} has attachments, enriching...`);
          const enrichedMessages = await this.enrichMessagesWithAttachments([processedMessage]);
          enrichedMessage = enrichedMessages[0] || processedMessage;
        }

        // FIXED: Smart call invitation detection - only for RECENT calls from OTHER users
        if (enrichedMessage.body && (
          enrichedMessage.body.includes('started a live conference') ||
          enrichedMessage.body.includes('📞 Audio call started') ||
          enrichedMessage.body.includes('📹 Video call started') ||
          enrichedMessage.body.includes('call started') ||
          enrichedMessage.body.includes('started a video conference') ||
          enrichedMessage.body.includes('started an audio conference')
        )) {
          console.log('📞 Call START message detected:', enrichedMessage.body);

          // Only create call invitations for RECENT messages (within last 30 seconds)
          const messageTime = new Date(enrichedMessage.date).getTime();
          const now = Date.now();
          const timeDiff = now - messageTime;

          // Only process if message is recent (within 30 seconds) and from longpolling (real-time)
          if (timeDiff < 30000 && source === 'longpolling') {
            console.log('📞 Recent call START message from longpolling - creating invitation');

            // Extract caller info from message
            const callerName = enrichedMessage.email_from?.replace(/[<>]/g, '') || 'Unknown User';
            const isVideo = enrichedMessage.body.includes('Video') || enrichedMessage.body.includes('video') || enrichedMessage.body.includes('conference');

            // Create call invitation
            const callInvitation = {
              call_id: `web_call_${Date.now()}_${channelId}`,
              caller_id: enrichedMessage.author_id,
              caller_name: callerName,
              channel_id: channelId,
              channel_name: `Channel ${channelId}`,
              call_type: isVideo ? 'video' : 'audio',
              is_video: isVideo,
              timestamp: enrichedMessage.date,
              source: 'odoo_web'
            };

            console.log('📞 Emitting call invitation for Odoo web call:', callInvitation);

            // FIXED: Emit directly via longpolling service (CallService listens to this)
            // Don't emit on 'this' to avoid infinite loops
            longpollingService.emit('callInvitation', callInvitation);
          } else {
            console.log(`📞 Call message too old (${Math.round(timeDiff/1000)}s) or from polling - ignoring`);
          }
        }

        // SEPARATE: Handle call status messages (answered, ended, etc.) - don't create invitations for these
        if (enrichedMessage.body && (
          enrichedMessage.body.includes('📞 Call answered') ||
          enrichedMessage.body.includes('📞 Call ended') ||
          enrichedMessage.body.includes('📞 Call declined')
        )) {
          console.log('📞 Call STATUS message detected (not creating invitation):', enrichedMessage.body);
        }

        // Get existing messages for this channel
        const existingMessages = this.channelMessages.get(channelId) || [];

        // CRITICAL FIX: Better deduplication logic
        const messageExists = existingMessages.some(m => m.id === enrichedMessage.id);
        const wasRecentlyProcessed = this.recentlyProcessedMessages.has(enrichedMessage.id);

        // Check if there are any optimistic messages that might need removal
        const hasOptimisticMessages = existingMessages.some(m => (m as any).isOptimistic);

        if (!messageExists && (!wasRecentlyProcessed || hasOptimisticMessages)) {
          // Log why we're processing this message
          if (wasRecentlyProcessed && hasOptimisticMessages) {
            console.log(`🔄 Processing recently processed message ${enrichedMessage.id} to remove optimistic messages`);
          }

          // Add to recently processed to prevent duplicate processing
          this.recentlyProcessedMessages.add(enrichedMessage.id);

          // Clean up old recently processed messages (keep only last 50)
          if (this.recentlyProcessedMessages.size > 50) {
            const entries = Array.from(this.recentlyProcessedMessages);
            entries.slice(0, 25).forEach(id => this.recentlyProcessedMessages.delete(id));
          }

          // Remove any optimistic messages that match this real message
          const filteredMessages = existingMessages.filter(msg => {
            if (!(msg as any).isOptimistic) return true;

            // Remove optimistic message if:
            // 1. Exact same content (body)
            // 2. Same author and similar content
            // 3. Any optimistic message from same author within 30 seconds
            const messageTime = new Date(enrichedMessage.date).getTime();
            const msgTime = new Date(msg.date).getTime();
            const timeDiff = Math.abs(messageTime - msgTime);

            // Check for exact content match (with HTML decoding)
            const decodedEnrichedBodyFull = enrichedMessage.body
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&amp;/g, '&')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'");
            const sameContent = msg.body === enrichedMessage.body || msg.body === decodedEnrichedBodyFull;
            const sameAuthor = msg.author_id[0] === enrichedMessage.author_id[0];
            const withinTimeWindow = timeDiff < 30000; // 30 seconds

            // Clean and decode HTML content for comparison
            const cleanMsgBody = msg.body.replace(/<[^>]*>/g, '').trim();

            // Decode HTML entities in the incoming message
            const decodedEnrichedBody = enrichedMessage.body
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&amp;/g, '&')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'");
            const cleanEnrichedBody = decodedEnrichedBody.replace(/<[^>]*>/g, '').trim();

            const similarContent = cleanMsgBody === cleanEnrichedBody;

            console.log(`🔍 Comparing optimistic vs real message:
              Optimistic: "${cleanMsgBody}"
              Real: "${cleanEnrichedBody}"
              Similar: ${similarContent}`);

            if (sameContent || similarContent || (sameAuthor && withinTimeWindow)) {
              console.log(`🗑️ Removing optimistic message (exact: ${sameContent}, similar: ${similarContent}, same author within 30s: ${sameAuthor && withinTimeWindow})`);
              console.log(`🗑️ Removed optimistic message ID: ${msg.id}, body: "${msg.body}"`);
              return false;
            }

            // Debug: Log why we're keeping this optimistic message
            if ((msg as any).isOptimistic) {
              console.log(`🤔 Keeping optimistic message ID: ${msg.id} (no match found)`);
              console.log(`   - Same content: ${sameContent}`);
              console.log(`   - Similar content: ${similarContent}`);
              console.log(`   - Same author within 30s: ${sameAuthor && withinTimeWindow}`);
            }

            return true;
          });

          // Add to channel messages
          const updatedMessages = [...filteredMessages, enrichedMessage];

          // Sort by date to maintain order
          updatedMessages.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          this.channelMessages.set(channelId, updatedMessages);

          console.log(`✅ Added new message ${enrichedMessage.id} to channel ${channelId} from ${source}`);
          console.log(`📊 Channel ${channelId} now has ${updatedMessages.length} messages (${filteredMessages.length} after optimistic cleanup)`);

          // Emit only one event to prevent duplicates
          this.emit('newMessages', { channelId, messages: [enrichedMessage] });

          console.log(`📡 Emitted real-time message event for channel ${channelId}`);

          // If this is from longpolling, disable polling temporarily to avoid race conditions
          if (source === 'longpolling' && this.currentPollingChannelId === channelId) {
            console.log(`🔄 Temporarily pausing polling for channel ${channelId} due to longpolling update`);
            this.stopPolling();
            // Restart polling after a delay
            setTimeout(() => {
              if (this.currentPollingChannelId === channelId) {
                console.log(`🔄 Restarting polling for channel ${channelId}`);
                this.startPolling(channelId);
              }
            }, 3000);
          }

        } else {
          console.log(`📨 Msg ${enrichedMessage.id} already exists in channel ${channelId}, skipping`);
        }

      } finally {
        // Always release the lock
        this.messageProcessingLock.delete(channelId);
      }

    } catch (error) {
      console.error('❌ Error processing incoming message:', error);
      // Release lock on error
      this.messageProcessingLock.delete(channelId);
    }
  }





  /**
   * Load cached channels with membership filtering (SQL JOIN)
   */
  private async loadCachedChannelsWithMembership(): Promise<ChatChannel[]> {
    try {
      const db = databaseService.getDatabase();
      if (!db) {
        console.log('📁 No database available for cached channels');
        return [];
      }

      const partnerId = this.currentUserPartnerId;
      if (!partnerId) {
        throw new Error('Current user partner ID not available');
      }

      console.log(`📁 Loading cached channels for partner ID: ${partnerId}`);

      const query = `
        SELECT DISTINCT c.id, c.name, c.description, c.channel_type,
               c.uuid, c.member_count
        FROM discuss_channel c
        INNER JOIN discuss_channel_member m ON c.id = m.channel_id
        WHERE m.partner_id = ?
        GROUP BY c.id
      `;

      const channels = await db.getAllAsync(query, [partnerId]);
      console.log(`📁 Found ${channels.length} filtered cached channels`);

      return channels;
    } catch (error) {
      console.error('❌ Failed to load filtered cached channels:', error);
      return [];
    }
  }

  /**
   * Load channels with proper JOIN and fold_state filtering
   */
  private async loadChannelsWithMembership(): Promise<ChatChannel[]> {
    try {
      const client = authService.getClient();
      if (!client) {
        throw new Error('No authenticated client available');
      }

      // Get current user's partner ID using the existing method
      let currentPartnerId = await channelMemberService.getCurrentUserPartnerId();

      // If ChannelMemberService doesn't have it, try direct approach
      if (!currentPartnerId) {
        console.log('📱 ChannelMemberService partner ID not available, trying direct approach...');

        const currentUser = await client.searchRead('res.users',
          [['id', '=', client.uid]],
          ['partner_id']
        );

        if (currentUser.length > 0) {
          const partnerIdField = currentUser[0].partner_id;

          // Handle different partner_id formats
          if (Array.isArray(partnerIdField) && partnerIdField.length > 0) {
            currentPartnerId = partnerIdField[0];
          } else if (typeof partnerIdField === 'number') {
            currentPartnerId = partnerIdField;
          } else if (typeof partnerIdField === 'string') {
            // Try to parse XML-RPC format
            const match = partnerIdField.match(/<value><int>(\d+)<\/int>/);
            if (match) {
              currentPartnerId = parseInt(match[1]);
            } else {
              // Try direct string to number conversion
              const parsed = parseInt(partnerIdField);
              if (!isNaN(parsed)) {
                currentPartnerId = parsed;
              }
            }
          }
        }
      }

      if (!currentPartnerId) {
        throw new Error('Could not determine current user partner ID');
      }

      console.log(`👤 Loading channels for partner ID: ${currentPartnerId}`);

      // Load channel memberships first to get fold_state info
      const memberships = await client.searchRead('discuss.channel.member',
        [['partner_id', '=', currentPartnerId]],
        ['channel_id', 'fold_state']
      );

      console.log(`📁 Found ${memberships.length} channel memberships`);

      // Debug: Show all memberships with their fold_states
      memberships.forEach(member => {
        let channelId = member.channel_id;
        // Handle XML-RPC array format
        if (typeof channelId === 'string' && channelId.includes('<int>')) {
          const match = channelId.match(/<int>(\d+)<\/int>/);
          channelId = match ? parseInt(match[1], 10) : channelId;
        } else if (Array.isArray(channelId)) {
          channelId = channelId[0];
        }
        console.log(`📁 Membership: Channel ${channelId}, fold_state: "${member.fold_state}"`);
      });

      // Get channel IDs - be more lenient with fold_state filtering
      const visibleChannelIds = memberships
        .filter(member => {
          const foldState = member.fold_state;
          // Show all channels except explicitly hidden ones
          // In practice, most channels should be visible unless user explicitly hides them
          const isVisible = true; // Show all channels for now - let user filter in UI

          let channelId = member.channel_id;
          // Handle XML-RPC array format
          if (typeof channelId === 'string' && channelId.includes('<int>')) {
            const match = channelId.match(/<int>(\d+)<\/int>/);
            channelId = match ? parseInt(match[1], 10) : channelId;
          } else if (Array.isArray(channelId)) {
            channelId = channelId[0];
          }

          console.log(`📁 Channel ${channelId}: fold_state="${foldState}" → visible=${isVisible}`);
          return isVisible;
        })
        .map(member => {
          // Handle XML-RPC array format
          if (typeof member.channel_id === 'string' && member.channel_id.includes('<int>')) {
            const match = member.channel_id.match(/<int>(\d+)<\/int>/);
            return match ? parseInt(match[1], 10) : null;
          }
          return Array.isArray(member.channel_id) ? member.channel_id[0] : member.channel_id;
        })
        .filter(id => id !== null);

      console.log(`📁 Visible channel IDs (not closed): [${visibleChannelIds.join(', ')}]`);

      if (visibleChannelIds.length === 0) {
        console.log('📁 No visible channels found');
        return [];
      }

      // Load the actual channel data for visible channels only
      const channels = await client.searchRead('discuss.channel',
        [
          ['id', 'in', visibleChannelIds],
          ['active', '=', true]
        ],
        [
          'id', 'name', 'description', 'channel_type', 'channel_member_ids',
          'uuid', 'is_member', 'member_count', 'avatar_128'
        ],
        { order: 'id desc' }
      );

      console.log(`📱 ✅ MEMBERSHIP FILTER: Found ${channels.length} visible channels`);
      return channels;

    } catch (error) {
      console.error('❌ Failed to load channels with membership filtering:', error);
      throw error;
    }
  }

  /**
   * Load chat channels (filtered cache first, fallback to server)
   */
  private async loadChannels(): Promise<void> {
    try {
      const client = authService.getClient();
      if (!client) {
        throw new Error('No authenticated client available');
      }

      console.log('📱 Loading chat channels (filtered cache first)...');

      // Since initialize() awaits sync, use filtered cache as primary source
      let channels = await this.loadCachedChannelsWithMembership();

      // Fallback to server if cache is empty (e.g., first run or sync failure)
      if (channels.length === 0) {
        console.log('📱 Cache empty - falling back to server load');
        channels = await this.loadChannelsWithMembership();
      }

      // Process channels
      const processedChannels = [];
      for (const channel of channels) {
        const processedChannel = await this.processChannel(channel);
        this.currentChannels.set(processedChannel.id, processedChannel);
        processedChannels.push(processedChannel);
      }

      // Sort by last activity
      const sortedChannels = await this.sortChannelsByLastActivity(processedChannels);

      // Emit once with final data
      this.emit('channelsLoaded', sortedChannels);
      console.log(`📱 ✅ Emitted ${sortedChannels.length} filtered channels`);

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
            // Try to get cached messages first from BaseSyncService
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
   * Get last rendered messages instantly (no loading, no scrolling)
   */
  getLastRenderedMessages(channelId: number): ChatMessage[] {
    const lastRendered = this.lastRenderedMessages.get(channelId);
    if (lastRendered && lastRendered.length > 0) {
      console.log(`📨 ⚡ Returning ${lastRendered.length} cached messages for channel ${channelId}`);
      return lastRendered;
    }
    return [];
  }

  /**
   * Save the current rendered state for instant loading next time
   */
  saveLastRenderedMessages(channelId: number, messages: ChatMessage[]): void {
    this.lastRenderedMessages.set(channelId, [...messages]);
    console.log(`📨 💾 Cached ${messages.length} messages for channel ${channelId}`);
  }

  /**
   * Load messages for a specific channel (cache first, then live data)
   * Limited to last 50 messages by default for performance
   */
  async loadChannelMessages(channelId: number, limit = 50, offset = 0): Promise<ChatMessage[]> {
    try {
      console.log(`📨 Loading messages for channel ${channelId} (cache first)...`);

      const client = authService.getClient();
      const isAuth = await authService.isAuthenticated();

      let messages = [];

      // OFFLINE FIRST: Try to load from BaseSyncService (authoritative source)
      try {
        console.log(`📨 Loading cached messages for channel ${channelId}...`);

        const cachedMessages = await syncService.getCachedData('mail.message', {
          model: 'discuss.channel',
          res_id: channelId
        });

        if (cachedMessages && cachedMessages.length > 0) {
          console.log(`📨 ✅ Found ${cachedMessages.length} cached messages`);

          // Filter and sort messages properly
          messages = cachedMessages
            .filter(msg => msg.model === 'discuss.channel' && msg.res_id === channelId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(offset, offset + limit);

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
            this.saveLastRenderedMessages(channelId, processedMessages); // Save for instant loading
            this.emit('messagesLoaded', { channelId, messages: processedMessages });

            console.log(`📨 Cached messages loaded, fetching fresh data...`);
          }
        } else {
          console.log(`📨 ⚠️ No cached messages found for channel ${channelId}`);
        }
      } catch (cacheError) {
        console.warn('⚠️ Failed to load cached messages:', cacheError);
      }

      // Try to get fresh data only if we have network connectivity
      if (client && isAuth) {
        try {
          console.log(`📨 Loading fresh messages from server...`);
          const freshMessages = await client.searchRead('mail.message',
          [
            ['model', '=', 'discuss.channel'],
            ['res_id', '=', channelId]
          ],
          ['id', 'body', 'author_id', 'date', 'message_type', 'attachment_ids', 'partner_ids', 'email_from'],
          { order: 'date desc', limit, offset }
        );

        // Fetch attachment details for messages that have attachments
        const messagesWithAttachments = await this.enrichMessagesWithAttachments(freshMessages);

        // Only update if we got fresh data
        if (messagesWithAttachments.length > 0) {
          messages = messagesWithAttachments;
        }
        } catch (serverError) {
          console.warn('⚠️ Failed to load fresh messages, using cached data:', serverError);
          // If we have cached messages, that's fine - we already emitted them
          if (messages.length > 0) {
            console.log('📨 ✅ Using cached messages (network error)');
          } else {
            console.log('📨 ❌ No cached messages and network failed');
            throw serverError;
          }
        }
      } else {
        console.log('📨 ⚠️ Using cached messages only (offline)');
        if (messages.length === 0) {
          console.log('📨 ❌ No cached messages available');
          throw new Error('No cached messages available and no network connectivity');
        }
      }

      console.log(`📨 Found ${messages.length} messages for channel ${channelId}`);

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

      // Sort to get chronological order (oldest to newest for proper display)
      const sortedMessages = processedMessages.sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      this.channelMessages.set(channelId, sortedMessages);
      this.saveLastRenderedMessages(channelId, sortedMessages); // Save for instant loading

      // Emit all messages at once for instant UI loading (no scroll chaos)
      this.emit('messagesLoaded', { channelId, messages: sortedMessages });

      console.log(`✅ Loaded ${sortedMessages.length} messages for channel ${channelId} (instant load)`);
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
        body: `<p>${cleanBody}</p>`, // Match server HTML format
        author_id: [this.currentUserId, 'You'],
        date: new Date().toISOString(),
        message_type: 'comment',
        model: 'discuss.channel',
        res_id: channelId,
        authorName: 'You',
        cleanAuthorName: 'You',
        isOptimistic: true // Flag to identify optimistic messages
      };

      console.log(`📝 Creating optimistic message:`, {
        id: optimisticMessage.id,
        body: optimisticMessage.body,
        cleanBody: cleanBody,
        author_id: optimisticMessage.author_id
      });

      // Add to local messages immediately
      const existingMessages = this.channelMessages.get(channelId) || [];
      const updatedMessages = [...existingMessages, optimisticMessage];
      this.channelMessages.set(channelId, updatedMessages);

      // Emit immediately for instant UI update (single event to prevent duplicates)
      this.emit('newMessages', { channelId, messages: [optimisticMessage] });

      // Trigger message refresh to get the real message and replace optimistic one
      setTimeout(() => {
        this.checkForNewMessages(channelId);
      }, 500);

      // Also set up a cleanup timer to remove optimistic messages after 10 seconds
      setTimeout(() => {
        console.log(`🧹 Cleaning up optimistic messages for channel ${channelId} after 10 seconds`);
        const existingMessages = this.channelMessages.get(channelId) || [];
        const nonOptimisticMessages = existingMessages.filter(msg => !(msg as any).isOptimistic);

        if (nonOptimisticMessages.length !== existingMessages.length) {
          console.log(`🧹 Removed ${existingMessages.length - nonOptimisticMessages.length} stale optimistic messages`);
          this.channelMessages.set(channelId, nonOptimisticMessages);
          this.emit('newMessages', { channelId, messages: [] }); // Trigger UI refresh
        }
      }, 10000);

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

      console.log(`📨 Loading more messages (offset: ${offset})...`);

      const olderMessages = await this.loadChannelMessages(channelId, limit, offset);

      if (olderMessages.length > 0) {
        // Prepend older messages to existing ones
        const allMessages = [...olderMessages, ...existingMessages];
        this.channelMessages.set(channelId, allMessages);
        this.emit('messagesLoaded', { channelId, messages: allMessages });

        console.log(`📨 Loaded ${olderMessages.length} more messages`);
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
   * Start polling for new messages (REDUCED FREQUENCY to minimize race conditions)
   */
  startPolling(channelId: number): void {
    // Stop existing polling
    this.stopPolling();

    // Set current polling channel
    this.currentPollingChannelId = channelId;

    console.log(`🔄 Starting backup polling for channel ${channelId} (reduced frequency)`);

    // Backup polling - every 5 seconds (reduced to minimize race conditions with longpolling)
    this.pollingInterval = setInterval(async () => {
      await this.checkForNewMessages(channelId);
    }, this.POLLING_INTERVAL);
  }

  /**
   * Check for new messages efficiently (only get newer messages) - IMPROVED WITH SOURCE TRACKING
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
        console.log(`🔄 Polling found ${newMessages.length} new messages for channel ${channelId}`);

        // Enrich messages with attachment details
        const enrichedMessages = await this.enrichMessagesWithAttachments(newMessages);

        // Process each new message through the same handler
        for (const message of enrichedMessages) {
          await this.handleIncomingMessage({
            ...message,
            channel_id: channelId,
            res_id: channelId,
            model: 'discuss.channel'
          }, 'polling');
        }
      }
    } catch (error) {
      // Silent fail to avoid log spam
    }
  }

  /**
   * Enrich messages with attachment details
   */
  private async enrichMessagesWithAttachments(messages: any[]): Promise<any[]> {
    try {
      const client = authService.getClient();
      if (!client) return messages;

      // Find all unique attachment IDs
      const attachmentIds = new Set<number>();
      messages.forEach(msg => {
        let attachmentIdArray = msg.attachment_ids;

        // Handle XML-RPC format: "<array><data><value><int>53541</int>"
        if (typeof attachmentIdArray === 'string' && attachmentIdArray.includes('<value><int>')) {
          const matches = attachmentIdArray.match(/<value><int>(\d+)<\/int>/g);
          if (matches) {
            attachmentIdArray = matches.map((match: string) => {
              const idMatch = match.match(/<value><int>(\d+)<\/int>/);
              return idMatch ? parseInt(idMatch[1]) : null;
            }).filter(Boolean);
          }
        }

        if (attachmentIdArray && Array.isArray(attachmentIdArray)) {
          attachmentIdArray.forEach((id: number) => attachmentIds.add(id));
        }
      });

      if (attachmentIds.size === 0) {
        return messages;
      }

      console.log(`🔗 Fetching details for ${attachmentIds.size} attachments...`);

      // Fetch attachment details (using safe fields that exist in most Odoo versions)
      const attachments = await client.searchRead('ir.attachment',
        [['id', 'in', Array.from(attachmentIds)]],
        ['id', 'name', 'mimetype', 'file_size', 'url'],
        {}
      );

      console.log(`🔗 Found ${attachments.length} attachment details`);

      // Create attachment lookup map
      const attachmentMap = new Map();
      attachments.forEach(att => attachmentMap.set(att.id, att));

      // Enrich messages with attachment details
      return messages.map(msg => {
        let attachmentIdArray = msg.attachment_ids;

        // Handle XML-RPC format: "<array><data><value><int>53541</int>"
        if (typeof attachmentIdArray === 'string' && attachmentIdArray.includes('<value><int>')) {
          const matches = attachmentIdArray.match(/<value><int>(\d+)<\/int>/g);
          if (matches) {
            attachmentIdArray = matches.map((match: string) => {
              const idMatch = match.match(/<value><int>(\d+)<\/int>/);
              return idMatch ? parseInt(idMatch[1]) : null;
            }).filter(Boolean);
          }
        }

        const attachments = Array.isArray(attachmentIdArray)
          ? attachmentIdArray.map((id: number) => attachmentMap.get(id)).filter(Boolean)
          : [];

        return {
          ...msg,
          attachments
        };
      });

    } catch (error) {
      console.error('❌ Failed to enrich messages with attachments:', error);
      return messages;
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
      console.log(`🛑 Stopped polling`);
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
    
    // Start backup polling with reduced frequency to minimize race conditions
    console.log(`🔄 Starting backup polling for channel ${channelId} (reduced frequency)`);
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
   * Handle bus notification
   */
  private handleBusNotification(notification: any): void {
    console.log(`🚌 ${notification.type} notification`);
    
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
   * Remove a channel from internal state (for leave functionality)
   */
  removeChannel(channelId: number): void {
    this.currentChannels.delete(channelId);
    this.channelMessages.delete(channelId);
    this.lastRenderedMessages.delete(channelId);
    this.typingUsers.delete(channelId);
    
    // Unsubscribe from longpolling
    this.unsubscribeFromChannel(channelId);
    
    console.log(`🗑️ Removed channel ${channelId} from ChatService internal state`);
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
   * Unfold a channel (change fold_state from 'closed' to 'open')
   */
  async unfoldChannel(channelId: number): Promise<boolean> {
    try {
      console.log(`📱 🔧 Unfolding channel ${channelId}...`);

      const client = await xmlrpcService.getClient();

      // Update the channel's fold_state to 'open'
      await client.execute(
        'discuss.channel',
        'write',
        [channelId],
        { fold_state: 'open' }
      );

      console.log(`📱 ✅ Successfully unfolded channel ${channelId}`);
      return true;
    } catch (error) {
      console.error(`📱 ❌ Failed to unfold channel ${channelId}:`, error);
      return false;
    }
  }

  /**
   * Unfold all closed channels for the current user
   */
  async unfoldAllClosedChannels(): Promise<void> {
    try {
      console.log(`📱 🔧 Unfolding all closed channels...`);

      const channels = Array.from(this.currentChannels.values());
      const closedChannels = channels.filter(ch => ch.fold_state === 'closed');

      if (closedChannels.length === 0) {
        console.log(`📱 ℹ️ No closed channels to unfold`);
        return;
      }

      console.log(`📱 🔧 Found ${closedChannels.length} closed channels to unfold`);

      for (const channel of closedChannels) {
        await this.unfoldChannel(channel.id);
      }

      // Refresh channels after unfolding
      console.log(`📱 🔄 Refreshing channels after unfolding...`);
      await this.loadChannels();

    } catch (error) {
      console.error(`📱 ❌ Failed to unfold closed channels:`, error);
    }
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