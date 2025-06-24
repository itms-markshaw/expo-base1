import cacheManager from '../cache';
import odooClient from '../../api/odooClient';
import { getConfig } from '../../config/cacheConfig';

/**
 * Chat History Service - Intelligent message history management
 * Handles progressive loading, smart caching, and seamless infinite scroll
 */
class ChatHistoryService {
  constructor() {
    this.isInitialized = false;
    this.loadingStates = new Map(); // channelId -> loading state
    this.historyState = new Map(); // channelId -> history metadata
    this.batchSizes = {
      initial: 100,       // Enhanced: 100 messages for rich history
      incremental: 30,    // Load more batches
      prefetch: 20        // Background prefetch
    };
    
    // Configuration
    this.config = getConfig('message');
    
    // Performance tracking
    this.stats = {
      totalLoaded: 0,
      cacheHits: 0,
      apiCalls: 0,
      backgroundPrefetches: 0,
      errors: 0
    };
  }

  /**
   * Initialize history service
   */
  async initialize() {
    if (this.isInitialized) return true;

    try {
      console.log('📚 Initializing Chat History Service...');
      this.isInitialized = true;
      console.log('✅ Chat History Service initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Chat History Service:', error);
      return false;
    }
  }

  /**
   * Load initial message history for a channel
   */
  async loadInitialHistory(channelId, options = {}) {
    const {
      loadSize = this.batchSizes.initial,
      forceRefresh = false
    } = options;

    try {
      console.log(`📚 Loading initial history for channel ${channelId}...`);
      
      // Set loading state
      this.setLoadingState(channelId, 'initial', true);
      
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedMessages = await this.getCachedHistory(channelId, loadSize);
        if (cachedMessages.length >= Math.min(loadSize, 20)) {
          console.log(`📚 Found ${cachedMessages.length} cached messages`);
          this.setLoadingState(channelId, 'initial', false);
          
          // Update history state
          this.updateHistoryState(channelId, {
            hasMore: cachedMessages.length === loadSize,
            oldestMessageId: cachedMessages[cachedMessages.length - 1]?.id,
            lastLoadTime: Date.now()
          });

          // Background prefetch if needed
          this.backgroundPrefetch(channelId);
          
          this.stats.cacheHits++;
          return cachedMessages;
        }
      }

      // Load from API
      const messages = await this.fetchMessagesFromAPI(channelId, {
        limit: loadSize,
        order: 'desc'
      });

      // Cache the messages (optional - don't fail if cache is unavailable)
      if (messages.length > 0) {
        try {
          await cacheManager.messages.storeMessages(messages);
          console.log(`📦 Cached ${messages.length} messages`);
        } catch (cacheError) {
          console.warn('⚠️ Failed to cache messages, continuing without cache:', cacheError.message);
        }
      }

      // Update history state
      this.updateHistoryState(channelId, {
        hasMore: messages.length === loadSize,
        oldestMessageId: messages[messages.length - 1]?.id,
        lastLoadTime: Date.now(),
        totalLoaded: messages.length
      });

      this.stats.totalLoaded += messages.length;
      this.stats.apiCalls++;
      
      console.log(`✅ Loaded ${messages.length} initial messages for channel ${channelId}`);
      return messages;

    } catch (error) {
      console.error(`❌ Failed to load initial history for channel ${channelId}:`, error);
      this.stats.errors++;
      throw error;
    } finally {
      this.setLoadingState(channelId, 'initial', false);
    }
  }

  /**
   * Load more historical messages (infinite scroll)
   */
  async loadMoreHistory(channelId, options = {}) {
    const {
      beforeMessageId,
      loadSize = this.batchSizes.incremental
    } = options;

    const historyState = this.historyState.get(channelId);
    
    // Check if we have more to load
    if (historyState && !historyState.hasMore) {
      console.log(`📚 No more history to load for channel ${channelId}`);
      return [];
    }

    // Prevent duplicate loading
    if (this.getLoadingState(channelId, 'incremental')) {
      console.log(`📚 Already loading more history for channel ${channelId}`);
      return [];
    }

    try {
      console.log(`📚 Loading more history for channel ${channelId}...`);
      this.setLoadingState(channelId, 'incremental', true);

      // Determine the oldest message ID
      const oldestId = beforeMessageId || historyState?.oldestMessageId;
      
      if (!oldestId) {
        console.log(`📚 No reference point for loading more history in channel ${channelId}`);
        return [];
      }

      // Check for recent duplicate requests
      if (this.isRecentRequest(channelId, oldestId)) {
        console.log(`📚 Skipping duplicate request for channel ${channelId}`);
        return [];
      }

      // Load from API
      const messages = await this.fetchMessagesFromAPI(channelId, {
        beforeId: oldestId,
        limit: loadSize,
        order: 'desc'
      });

      // Cache the new messages (optional - don't fail if cache is unavailable)
      if (messages.length > 0) {
        try {
          await cacheManager.messages.storeMessages(messages);
          console.log(`📦 Cached ${messages.length} more messages`);
        } catch (cacheError) {
          console.warn('⚠️ Failed to cache more messages, continuing without cache:', cacheError.message);
        }
      }

      // Update history state
      this.updateHistoryState(channelId, {
        hasMore: messages.length === loadSize,
        oldestMessageId: messages[messages.length - 1]?.id,
        totalLoaded: (historyState?.totalLoaded || 0) + messages.length,
        lastLoadTime: Date.now()
      });

      this.stats.totalLoaded += messages.length;
      this.stats.apiCalls++;
      
      console.log(`✅ Loaded ${messages.length} more messages for channel ${channelId}`);
      return messages;

    } catch (error) {
      console.error(`❌ Failed to load more history for channel ${channelId}:`, error);
      this.stats.errors++;
      throw error;
    } finally {
      this.setLoadingState(channelId, 'incremental', false);
    }
  }

  /**
   * Background prefetch for smooth scrolling
   */
  async backgroundPrefetch(channelId) {
    const historyState = this.historyState.get(channelId);
    
    if (!historyState || !historyState.hasMore || 
        this.getLoadingState(channelId, 'prefetch')) {
      return;
    }

    try {
      console.log(`📚 Background prefetching for channel ${channelId}...`);
      this.setLoadingState(channelId, 'prefetch', true);

      const messages = await this.fetchMessagesFromAPI(channelId, {
        beforeId: historyState.oldestMessageId,
        limit: this.batchSizes.prefetch,
        order: 'desc'
      });

      if (messages.length > 0) {
        try {
          await cacheManager.messages.storeMessages(messages);
          console.log(`📦 Cached ${messages.length} prefetched messages`);
        } catch (cacheError) {
          console.warn('⚠️ Failed to cache prefetched messages, continuing without cache:', cacheError.message);
        }

        // Update state quietly
        this.updateHistoryState(channelId, {
          hasMore: messages.length === this.batchSizes.prefetch,
          oldestMessageId: messages[messages.length - 1]?.id
        });

        this.stats.backgroundPrefetches++;
        console.log(`✅ Prefetched ${messages.length} messages for channel ${channelId}`);
      }

    } catch (error) {
      console.log(`⚠️ Background prefetch failed for channel ${channelId}:`, error.message);
      // Don't throw - this is background operation
    } finally {
      this.setLoadingState(channelId, 'prefetch', false);
    }
  }

  /**
   * Fetch messages from API with intelligent pagination
   */
  async fetchMessagesFromAPI(channelId, options = {}) {
    const {
      beforeId = null,
      afterId = null,
      limit = this.batchSizes.initial,
      order = 'desc'
    } = options;

    try {
      // Build domain for API query
      const domain = [['res_id', '=', channelId], ['model', '=', 'discuss.channel']];
      
      if (beforeId) {
        domain.push(['id', '<', beforeId]);
      }
      if (afterId) {
        domain.push(['id', '>', afterId]);
      }

      // Use OAuth2 client for API call
      const response = await odooClient.client.post('/api/v2/search_read', {
        model: 'mail.message',
        domain: domain,
        fields: [
          'id', 'body', 'author_id', 'date', 'message_type', 
          'attachment_ids', 'subject', 'reply_to', 'subtype_id'
        ],
        order: `date ${order}, id ${order}`,
        limit: limit
      });

      const messages = response.data || [];

      // Transform to our format with safe attachment handling
      return messages.map(msg => ({
        id: msg.id,
        channel_id: channelId,
        content: this.cleanMessageContent(msg.body),
        author_id: Array.isArray(msg.author_id) ? msg.author_id[0] : msg.author_id,
        author_name: Array.isArray(msg.author_id) ? msg.author_id[1] : 'Unknown',
        created_at: msg.date,
        message_type: msg.message_type || 'text',
        attachment_ids: this.safeAttachmentIds(msg.attachment_ids),
        reply_to_id: msg.reply_to,
        sync_status: 'synced'
      }));

    } catch (error) {
      console.error('❌ Failed to fetch messages from API:', error);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Get cached history with intelligent ordering
   */
  async getCachedHistory(channelId, limit) {
    try {
      // Check if cache manager is available
      if (!cacheManager.messages.isInitialized) {
        console.warn('⚠️ Message cache service not initialized, returning empty array');
        return [];
      }

      const messages = await cacheManager.messages.getMessages(channelId, {
        limit,
        includeOptimistic: false
      });

      // Ensure proper ordering (newest first for display)
      return messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch (error) {
      console.warn('⚠️ Failed to get cached history, returning empty array:', error.message);
      return [];
    }
  }

  /**
   * Clean message content safely
   */
  cleanMessageContent(content) {
    if (!content) return '';

    return content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Safe attachment ID handling
   */
  safeAttachmentIds(attachmentIds) {
    if (!attachmentIds) return null;
    if (Array.isArray(attachmentIds)) {
      return attachmentIds.length > 0 ? attachmentIds : null;
    }
    return null;
  }

  /**
   * Loading state management
   */
  setLoadingState(channelId, type, isLoading) {
    if (!this.loadingStates.has(channelId)) {
      this.loadingStates.set(channelId, {});
    }
    this.loadingStates.get(channelId)[type] = isLoading;
  }

  getLoadingState(channelId, type) {
    return this.loadingStates.get(channelId)?.[type] || false;
  }

  /**
   * History state management
   */
  updateHistoryState(channelId, updates) {
    const current = this.historyState.get(channelId) || {};
    this.historyState.set(channelId, { ...current, ...updates });
  }

  getHistoryState(channelId) {
    return this.historyState.get(channelId);
  }

  /**
   * Check if this is a recent duplicate request
   */
  isRecentRequest(channelId, beforeId) {
    const state = this.historyState.get(channelId);
    if (!state || !state.lastLoadTime) return false;

    const timeSinceLastLoad = Date.now() - state.lastLoadTime;
    return timeSinceLastLoad < 2000 && state.oldestMessageId === beforeId;
  }

  /**
   * Get loading states for UI
   */
  getLoadingStates(channelId) {
    const states = this.loadingStates.get(channelId) || {};
    return {
      isLoadingInitial: states.initial || false,
      isLoadingMore: states.incremental || false,
      isPrefetching: states.prefetch || false
    };
  }

  /**
   * Check if channel has more history
   */
  hasMoreHistory(channelId) {
    const state = this.historyState.get(channelId);
    return state ? state.hasMore : true;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeChannels: this.historyState.size,
      loadingChannels: Array.from(this.loadingStates.entries())
        .filter(([_, states]) => Object.values(states).some(loading => loading)).length
    };
  }

  /**
   * Cleanup for channel
   */
  cleanup(channelId) {
    this.loadingStates.delete(channelId);
    this.historyState.delete(channelId);
  }

  /**
   * Clear all state
   */
  clearAll() {
    this.loadingStates.clear();
    this.historyState.clear();
  }
}

// Create singleton instance
const chatHistoryService = new ChatHistoryService();

export default chatHistoryService;
