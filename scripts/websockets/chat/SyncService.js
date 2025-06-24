import { AppState } from 'react-native';
import cacheManager from '../cache';
import { odooAPI } from '../../api/odooClient';
import { getConfig } from '../../config/cacheConfig';

/**
 * Sync Service - Background synchronization manager
 * Handles offline/online sync, conflict resolution, and data consistency
 */
class SyncService {
  constructor() {
    this.isInitialized = false;
    this.syncInProgress = false;
    this.syncQueue = new Map(); // channelId -> sync metadata
    this.conflictQueue = new Map(); // messageId -> conflict data
    this.lastSyncTime = new Map(); // channelId -> timestamp
    
    // Load configuration
    this.config = getConfig('sync');
    
    // Sync intervals
    this.syncInterval = null;
    this.conflictResolutionInterval = null;
    
    // App state tracking
    this.appState = AppState.currentState;
    
    // Performance tracking
    this.stats = {
      syncOperations: 0,
      conflictsResolved: 0,
      messagesUploaded: 0,
      messagesDownloaded: 0,
      errors: 0,
      lastSyncTime: null
    };
  }

  /**
   * Initialize sync service
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('🔄 Sync service already initialized');
      return true;
    }

    try {
      console.log('🔄 Initializing Sync Service...');
      
      // Set up app state listener
      this.setupAppStateListener();
      
      // Start sync intervals
      this.startSyncIntervals();
      
      // Perform initial sync
      await this.performInitialSync();
      
      this.isInitialized = true;
      console.log('✅ Sync Service initialized');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Sync Service:', error);
      throw error;
    }
  }

  /**
   * Set up app state listener for background sync
   */
  setupAppStateListener() {
    AppState.addEventListener('change', (nextAppState) => {
      if (this.appState === 'background' && nextAppState === 'active') {
        // App came to foreground, sync immediately
        console.log('🔄 App became active, triggering sync...');
        this.syncAllChannels();
      }
      this.appState = nextAppState;
    });
  }

  /**
   * Start background sync intervals
   */
  startSyncIntervals() {
    // Main sync interval
    this.syncInterval = setInterval(async () => {
      if (!this.syncInProgress) {
        await this.syncAllChannels();
      }
    }, this.config.syncInterval);

    // Conflict resolution interval (less frequent)
    this.conflictResolutionInterval = setInterval(async () => {
      if (this.conflictQueue.size > 0) {
        await this.resolveConflicts();
      }
    }, this.config.syncInterval * 2);
  }

  /**
   * Perform initial sync on startup
   */
  async performInitialSync() {
    try {
      console.log('🔄 Performing initial sync...');

      // Get all pending messages with error handling
      let pendingMessages = [];
      try {
        pendingMessages = await cacheManager.messages.getPendingMessages();
      } catch (error) {
        console.warn('⚠️ Failed to get pending messages during initial sync:', error.message);
        pendingMessages = []; // Continue with empty array
      }

      if (pendingMessages.length > 0) {
        console.log(`🔄 Found ${pendingMessages.length} pending messages to sync`);
        await this.uploadPendingMessages(pendingMessages);
      } else {
        console.log('💬 Syncing 0 pending messages...');
      }

      this.stats.lastSyncTime = Date.now();
      console.log('✅ Initial sync completed');
    } catch (error) {
      console.error('❌ Initial sync failed:', error);
      this.stats.errors++;
    }
  }

  /**
   * Sync all active channels
   */
  async syncAllChannels() {
    if (this.syncInProgress) {
      console.log('🔄 Sync already in progress, skipping...');
      return;
    }

    try {
      this.syncInProgress = true;
      console.log('🔄 Starting sync for all channels...');

      // Get channels that need syncing
      const channelsToSync = await this.getChannelsNeedingSync();
      
      for (const channelId of channelsToSync) {
        await this.syncChannel(channelId);
      }

      // Upload any pending messages with error handling
      let pendingMessages = [];
      try {
        pendingMessages = await cacheManager.messages.getPendingMessages();
      } catch (error) {
        console.warn('⚠️ Failed to get pending messages during sync:', error.message);
        pendingMessages = []; // Continue with empty array
      }

      if (pendingMessages.length > 0) {
        await this.uploadPendingMessages(pendingMessages);
      }

      this.stats.syncOperations++;
      this.stats.lastSyncTime = Date.now();
      console.log('✅ Sync completed for all channels');
    } catch (error) {
      console.error('❌ Sync failed:', error);
      this.stats.errors++;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync a specific channel
   */
  async syncChannel(channelId) {
    try {
      console.log(`🔄 Syncing channel ${channelId}...`);
      
      const lastSync = this.lastSyncTime.get(channelId) || 0;
      const now = Date.now();
      
      // Skip if synced recently (unless forced)
      if (now - lastSync < this.config.syncInterval / 2) {
        return;
      }

      // Get latest messages from server
      const serverMessages = await this.fetchLatestMessages(channelId, lastSync);
      
      if (serverMessages.length > 0) {
        // Check for conflicts with local messages
        const conflicts = await this.detectConflicts(channelId, serverMessages);
        
        if (conflicts.length > 0) {
          console.log(`⚠️ Found ${conflicts.length} conflicts in channel ${channelId}`);
          conflicts.forEach(conflict => {
            this.conflictQueue.set(conflict.messageId, conflict);
          });
        }

        // Store non-conflicting messages
        const nonConflictingMessages = serverMessages.filter(msg => 
          !conflicts.some(c => c.serverId === msg.id)
        );
        
        if (nonConflictingMessages.length > 0) {
          await cacheManager.messages.storeMessages(nonConflictingMessages);
          this.stats.messagesDownloaded += nonConflictingMessages.length;
        }
      }

      this.lastSyncTime.set(channelId, now);
      console.log(`✅ Channel ${channelId} synced`);
    } catch (error) {
      console.error(`❌ Failed to sync channel ${channelId}:`, error);
      this.stats.errors++;
    }
  }

  /**
   * Fetch latest messages from server
   */
  async fetchLatestMessages(channelId, since = 0) {
    try {
      const sinceDate = new Date(since).toISOString();
      
      // Use correct mail.message fields
      const domain = [
        ['model', '=', 'discuss.channel'],
        ['res_id', '=', parseInt(channelId)],
        ['date', '>', sinceDate]
      ];

      const messages = await odooAPI.searchRead(
        'mail.message',
        domain,
        ['id', 'body', 'author_id', 'date', 'message_type', 'attachment_ids'],
        {
          order: 'date desc',
          limit: this.config.batchSyncSize
        }
      );

      // Transform to our format
      return messages.map(msg => ({
        id: msg.id,
        channel_id: channelId,
        content: msg.body,
        author_id: Array.isArray(msg.author_id) ? msg.author_id[0] : msg.author_id,
        author_name: Array.isArray(msg.author_id) ? msg.author_id[1] : 'Unknown',
        created_at: msg.date,
        message_type: msg.message_type || 'text',
        attachment_ids: msg.attachment_ids || null,
        sync_status: 'synced'
      }));
    } catch (error) {
      console.error(`❌ Failed to fetch messages for channel ${channelId}:`, error);
      return [];
    }
  }

  /**
   * Detect conflicts between local and server messages
   */
  async detectConflicts(channelId, serverMessages) {
    const conflicts = [];

    for (const serverMessage of serverMessages) {
      // Check if we have a local message with the same timestamp
      const localMessages = await cacheManager.messages.getMessages(channelId, {
        limit: 100 // Check recent messages
      });

      const potentialConflict = localMessages.find(local => {
        const timeDiff = Math.abs(
          new Date(local.created_at) - new Date(serverMessage.created_at)
        );
        return timeDiff < 5000 && // Within 5 seconds
               local.author_id === serverMessage.author_id &&
               local.content === serverMessage.content;
      });

      if (potentialConflict) {
        conflicts.push({
          messageId: potentialConflict.id,
          localId: potentialConflict.local_id,
          serverId: serverMessage.id,
          type: 'duplicate',
          localMessage: potentialConflict,
          serverMessage: serverMessage,
          timestamp: Date.now() // Add timestamp for memory cleanup
        });
      }
    }

    return conflicts;
  }

  /**
   * Upload pending messages to server
   */
  async uploadPendingMessages(pendingMessages) {
    try {
      console.log(`🔄 Uploading ${pendingMessages.length} pending messages...`);
      
      for (const message of pendingMessages) {
        try {
          // Retry logic with exponential backoff
          let attempt = 0;
          let success = false;
          
          while (attempt < this.config.retryAttempts && !success) {
            try {
              // Use correct mail.message fields
              const result = await odooAPI.create('mail.message', {
                body: message.content,
                model: 'discuss.channel',
                res_id: parseInt(message.channel_id),
                message_type: message.message_type,
                reply_to_id: message.reply_to_id
              });

              // Update local message with server ID
              await cacheManager.messages.updateMessageSyncStatus(
                message.local_id || message.id,
                'synced',
                result.id
              );

              this.stats.messagesUploaded++;
              success = true;
              console.log(`✅ Uploaded message: ${message.local_id} -> ${result.id}`);
            } catch (uploadError) {
              attempt++;
              if (attempt < this.config.retryAttempts) {
                const delay = this.config.retryDelay * Math.pow(this.config.retryBackoff, attempt - 1);
                console.log(`⚠️ Upload attempt ${attempt} failed, retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
              } else {
                throw uploadError;
              }
            }
          }
        } catch (error) {
          console.error(`❌ Failed to upload message ${message.local_id}:`, error);
          
          // Mark as failed
          await cacheManager.messages.updateMessageSyncStatus(
            message.local_id || message.id,
            'failed'
          );
          
          this.stats.errors++;
        }
      }
    } catch (error) {
      console.error('❌ Failed to upload pending messages:', error);
      this.stats.errors++;
    }
  }

  /**
   * Resolve message conflicts with memory management
   */
  async resolveConflicts() {
    try {
      console.log(`🔄 Resolving ${this.conflictQueue.size} conflicts...`);

      // Memory cleanup for large conflict queues
      if (this.conflictQueue.size > 1000) {
        const now = Date.now();
        const oldConflicts = Array.from(this.conflictQueue.entries())
          .filter(([, conflict]) => {
            const age = now - (conflict.timestamp || 0);
            return age > 3600000; // 1 hour old
          })
          .map(([id]) => id);

        oldConflicts.forEach(id => this.conflictQueue.delete(id));
        console.log(`🧹 Cleaned up ${oldConflicts.length} old conflicts`);
      }

      for (const [messageId, conflict] of this.conflictQueue.entries()) {
        try {
          switch (conflict.type) {
            case 'duplicate':
              await this.resolveDuplicateConflict(conflict);
              break;

            case 'edit':
              await this.resolveEditConflict(conflict);
              break;

            default:
              console.warn(`⚠️ Unknown conflict type: ${conflict.type}`);
          }

          this.conflictQueue.delete(messageId);
          this.stats.conflictsResolved++;
        } catch (error) {
          console.error(`❌ Failed to resolve conflict for message ${messageId}:`, error);
        }
      }
    } catch (error) {
      console.error('❌ Conflict resolution failed:', error);
      this.stats.errors++;
    }
  }

  /**
   * Resolve duplicate message conflict
   */
  async resolveDuplicateConflict(conflict) {
    // Server message wins, update local message with server ID
    await cacheManager.messages.updateMessageSyncStatus(
      conflict.localId || conflict.messageId,
      'synced',
      conflict.serverId
    );
    
    console.log(`✅ Resolved duplicate: ${conflict.localId} -> ${conflict.serverId}`);
  }

  /**
   * Resolve edit conflict
   */
  async resolveEditConflict(conflict) {
    // For now, server version wins
    // In the future, could implement more sophisticated conflict resolution
    await cacheManager.messages.storeMessage({
      ...conflict.serverMessage,
      sync_status: 'synced'
    });
    
    console.log(`✅ Resolved edit conflict: ${conflict.messageId}`);
  }

  /**
   * Get channels that need syncing
   */
  async getChannelsNeedingSync() {
    // For now, return all channels with recent activity
    // In the future, could be more intelligent about which channels to sync
    const stats = await cacheManager.getStats();
    
    // Get unique channel IDs from recent messages
    const channelIds = new Set();
    
    // This is a simplified approach - in production you'd want to track
    // active channels more systematically
    return Array.from(channelIds);
  }

  /**
   * Force sync for specific channel
   */
  async forceSyncChannel(channelId) {
    console.log(`🔄 Force syncing channel ${channelId}...`);
    this.lastSyncTime.delete(channelId); // Reset last sync time
    await this.syncChannel(channelId);
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      isInitialized: this.isInitialized,
      syncInProgress: this.syncInProgress,
      pendingConflicts: this.conflictQueue.size,
      lastSyncTime: this.stats.lastSyncTime,
      stats: this.stats
    };
  }

  /**
   * Stop sync service
   */
  stop() {
    console.log('🔄 Stopping Sync Service...');
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    if (this.conflictResolutionInterval) {
      clearInterval(this.conflictResolutionInterval);
      this.conflictResolutionInterval = null;
    }
    
    this.isInitialized = false;
    console.log('✅ Sync Service stopped');
  }
}

// Create singleton instance
const syncService = new SyncService();

export default syncService;
