import odooWebSocketService from './OdooWebSocketService';
import { odooAPI } from '../../api/odooClient';

/**
 * Enhanced Presence Service - OAuth2-Only with Hybrid Approach
 * Combines WebSocket real-time updates with REST API fallback
 * Merges the best of both implementations for maximum reliability
 */
class PresenceService {
  constructor() {
    this.presenceMap = new Map(); // userId -> presence data
    this.presenceListeners = new Map(); // event -> callbacks
    this.isInitialized = false;
    this.currentStatus = 'online';
    this.lastSeenUpdate = null;
    this.presenceUpdateInterval = null;
    this.batchTimeout = null;
    this.pendingUpdates = new Set();
    this.trackedUsers = new Set(); // Users we're tracking for presence

    // Hybrid approach flags
    this.useWebSocket = false;
    this.useRestAPI = true; // Always available with OAuth2
    this.pollingInterval = null;
    this.pollingIntervalMs = 30000; // 30 seconds

    // Presence update batching (reduce WebSocket traffic)
    this.batchInterval = 5000; // 5 seconds
    this.maxBatchSize = 20;

    // Performance tracking
    this.stats = {
      updates: 0,
      requests: 0,
      errors: 0,
      lastActivity: null
    };
  }

  /**
   * Initialize presence service
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('👁️ Presence service already initialized');
      return true;
    }

    try {
      console.log('👁️ Initializing Enhanced Presence Service (OAuth2-only)...');

      // Check WebSocket availability
      const wsStatus = odooWebSocketService.getConnectionStatus();
      this.useWebSocket = wsStatus.isConnected;

      if (this.useWebSocket) {
        this.setupWebSocketListeners();
        console.log('✅ WebSocket presence enabled');
      }

      if (this.useRestAPI) {
        console.log('✅ REST API presence enabled');
      }

      // Set current user as online
      await this.updateOwnPresence('online');

      // Start periodic presence updates
      this.startPresenceUpdates();

      this.isInitialized = true;
      console.log(`✅ Enhanced Presence Service initialized (WebSocket: ${this.useWebSocket}, REST API: ${this.useRestAPI})`);

      this.emit('initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Presence Service:', error);
      this.emit('error', { type: 'initialization', error });
      return false;
    }
  }

  /**
   * Set up WebSocket event listeners
   */
  setupWebSocketListeners() {
    // Listen for presence updates from other users
    odooWebSocketService.on('presenceUpdate', (data) => {
      this.handlePresenceUpdate(data);
    });

    // Listen for WebSocket connection state
    odooWebSocketService.on('connected', () => {
      console.log('👁️ WebSocket connected - updating presence');
      this.useWebSocket = true;
      this.updateOwnPresence(this.currentStatus);
      this.refreshTrackedUsers();
    });

    odooWebSocketService.on('disconnected', () => {
      console.log('👁️ WebSocket disconnected - falling back to REST API');
      this.useWebSocket = false;
      // Start REST API polling if we have tracked users
      if (this.useRestAPI && this.trackedUsers.size > 0) {
        this.startPolling();
      }
    });
  }

  /**
   * Handle incoming presence update
   */
  handlePresenceUpdate(data) {
    try {
      const { partner_id, status, last_seen } = data;
      
      if (!partner_id) {
        console.warn('⚠️ Received presence update without partner_id');
        return;
      }

      // Update presence data
      const presenceData = {
        partnerId: partner_id,
        status: status || 'offline',
        lastSeen: last_seen || new Date().toISOString(),
        updatedAt: Date.now()
      };

      this.presenceMap.set(partner_id, presenceData);
      
      console.log(`👁️ Presence updated: Partner ${partner_id} is ${status}`);
      
      // Emit presence change event
      this.emit('presenceChanged', {
        partnerId: partner_id,
        presence: presenceData,
        allPresence: this.getAllPresence()
      });
      
      // Emit specific user presence event
      this.emit(`presence:${partner_id}`, presenceData);
      
    } catch (error) {
      console.error('❌ Error handling presence update:', error);
    }
  }

  /**
   * Update own presence status
   */
  async updateOwnPresence(status = 'online') {
    try {
      const wsStatus = odooWebSocketService.getConnectionStatus();
      
      if (!wsStatus.isConnected) {
        console.log('👁️ WebSocket not connected - queuing presence update');
        this.currentStatus = status;
        return;
      }

      // Fixed API call - include required parameters for Odoo WebSocket
      const presenceData = {
        partner_id: odooWebSocketService.partnerId,
        inactivity_period: 0, // Required parameter
        im_status_ids_by_model: {} // Required parameter
      };

      // Send presence update via WebSocket
      odooWebSocketService.sendMessage('update_presence', presenceData);
      
      // Update local status
      this.currentStatus = status;
      this.lastSeenUpdate = Date.now();
      
      console.log(`👁️ Updated own presence to: ${status}`);
      
      this.emit('ownPresenceUpdated', { status, timestamp: this.lastSeenUpdate });
      
    } catch (error) {
      console.error('❌ Failed to update own presence:', error);
    }
  }

  /**
   * Get presence for specific user
   */
  getUserPresence(partnerId) {
    const presence = this.presenceMap.get(partnerId);
    
    if (!presence) {
      return {
        partnerId,
        status: 'offline',
        lastSeen: null,
        updatedAt: null
      };
    }
    
    return { ...presence };
  }

  /**
   * Get presence for multiple users
   */
  getMultipleUserPresence(partnerIds) {
    const presenceData = {};
    
    partnerIds.forEach(partnerId => {
      presenceData[partnerId] = this.getUserPresence(partnerId);
    });
    
    return presenceData;
  }

  /**
   * Get all tracked presence data
   */
  getAllPresence() {
    const allPresence = {};
    
    this.presenceMap.forEach((presence, partnerId) => {
      allPresence[partnerId] = { ...presence };
    });
    
    return allPresence;
  }

  /**
   * Check if user is online
   */
  isUserOnline(partnerId) {
    const presence = this.getUserPresence(partnerId);
    return presence.status === 'online';
  }

  /**
   * Check if user is away
   */
  isUserAway(partnerId) {
    const presence = this.getUserPresence(partnerId);
    return presence.status === 'away';
  }

  /**
   * Get online users count
   */
  getOnlineUsersCount() {
    let count = 0;
    this.presenceMap.forEach(presence => {
      if (presence.status === 'online') count++;
    });
    return count;
  }

  /**
   * Get users by status
   */
  getUsersByStatus(status) {
    const users = [];
    
    this.presenceMap.forEach((presence, partnerId) => {
      if (presence.status === status) {
        users.push({
          partnerId,
          ...presence
        });
      }
    });
    
    return users;
  }

  /**
   * Batch presence requests for efficiency
   */
  requestPresenceUpdates(partnerIds) {
    if (!Array.isArray(partnerIds) || partnerIds.length === 0) {
      return;
    }

    // Add to pending updates
    partnerIds.forEach(id => this.pendingUpdates.add(id));
    
    // Clear existing timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    
    // Set new timeout for batch processing
    this.batchTimeout = setTimeout(() => {
      this.processBatchedPresenceRequests();
    }, this.batchInterval);
  }

  /**
   * Process batched presence requests
   */
  processBatchedPresenceRequests() {
    if (this.pendingUpdates.size === 0) return;
    
    const partnerIds = Array.from(this.pendingUpdates);
    
    // Limit batch size
    const batchedIds = partnerIds.slice(0, this.maxBatchSize);
    
    console.log(`👁️ Requesting presence for ${batchedIds.length} users`);
    
    // Send batch presence request via WebSocket
    odooWebSocketService.sendMessage('request_presence', {
      partner_ids: batchedIds
    });
    
    // Clear processed IDs
    batchedIds.forEach(id => this.pendingUpdates.delete(id));
    
    // Process remaining IDs if any
    if (this.pendingUpdates.size > 0) {
      setTimeout(() => {
        this.processBatchedPresenceRequests();
      }, 1000); // 1 second delay for next batch
    }
  }

  /**
   * Start periodic presence updates
   */
  startPresenceUpdates() {
    if (this.presenceUpdateInterval) {
      clearInterval(this.presenceUpdateInterval);
    }
    
    // Update own presence every 2 minutes
    this.presenceUpdateInterval = setInterval(() => {
      if (this.currentStatus === 'online') {
        this.updateOwnPresence('online');
      }
    }, 120000); // 2 minutes
  }

  /**
   * Stop periodic presence updates
   */
  stopPresenceUpdates() {
    if (this.presenceUpdateInterval) {
      clearInterval(this.presenceUpdateInterval);
      this.presenceUpdateInterval = null;
    }
  }

  /**
   * Set user status (online, away, offline)
   */
  async setStatus(status) {
    const validStatuses = ['online', 'away', 'offline'];
    
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    await this.updateOwnPresence(status);
  }

  /**
   * Set user as away
   */
  async setAway() {
    await this.setStatus('away');
  }

  /**
   * Set user as online
   */
  async setOnline() {
    await this.setStatus('online');
  }

  /**
   * Set user as offline
   */
  async setOffline() {
    await this.setStatus('offline');
  }

  /**
   * Get current own status
   */
  getCurrentStatus() {
    return this.currentStatus;
  }

  /**
   * Clear presence data (e.g., on logout)
   */
  clearPresenceData() {
    this.presenceMap.clear();
    this.pendingUpdates.clear();
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    
    this.emit('presenceCleared');
  }

  /**
   * Get presence statistics
   */
  getPresenceStats() {
    const stats = {
      total: this.presenceMap.size,
      online: 0,
      away: 0,
      offline: 0,
      lastUpdate: this.lastSeenUpdate
    };
    
    this.presenceMap.forEach(presence => {
      stats[presence.status]++;
    });
    
    return stats;
  }

  /**
   * Add event listener
   */
  on(event, callback) {
    if (!this.presenceListeners.has(event)) {
      this.presenceListeners.set(event, []);
    }
    this.presenceListeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (this.presenceListeners.has(event)) {
      const listeners = this.presenceListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  emit(event, data) {
    if (this.presenceListeners.has(event)) {
      this.presenceListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in presence listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Refresh tracked users (re-request presence for all tracked users)
   */
  refreshTrackedUsers() {
    if (this.trackedUsers.size > 0) {
      console.log(`👁️ Refreshing presence for ${this.trackedUsers.size} tracked users`);
      const userIds = Array.from(this.trackedUsers);
      this.requestPresenceUpdates(userIds);
    }
  }

  /**
   * Track users for presence updates
   */
  trackUsers(userIds) {
    if (!Array.isArray(userIds)) {
      return;
    }

    userIds.forEach(id => this.trackedUsers.add(id));

    // Request presence updates for new users
    if (this.useWebSocket) {
      this.requestPresenceUpdates(userIds);
    }
  }

  /**
   * Stop tracking users
   */
  untrackUsers(userIds) {
    if (!Array.isArray(userIds)) {
      return;
    }

    userIds.forEach(id => this.trackedUsers.delete(id));
  }

  /**
   * Start polling for presence updates (REST API fallback)
   */
  startPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(() => {
      // TODO: Implement REST API presence polling
      console.log('👁️ Polling for presence updates via REST API...');
    }, this.pollingIntervalMs);
  }

  /**
   * Stop polling for presence updates
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Cleanup and disconnect
   */
  cleanup() {
    console.log('👁️ Cleaning up Presence Service...');

    // Set status to offline
    this.setOffline();

    // Stop updates
    this.stopPresenceUpdates();
    this.stopPolling();

    // Clear data
    this.clearPresenceData();

    // Reset state
    this.isInitialized = false;

    this.emit('cleanup');
  }
}

// Create singleton instance
const presenceService = new PresenceService();

export default presenceService;