import odooWebSocketService from './OdooWebSocketService';
import { odooAPI } from '../../api/odooClient';

/**
 * ============================================================================
 * ENHANCED PRESENCE SERVICE - TELEGRAM-STYLE IMPLEMENTATION
 * ============================================================================
 * 
 * This service provides comprehensive user presence tracking for a world-class
 * chat experience. It combines real-time WebSocket updates with REST API
 * fallback to ensure reliable presence information.
 * 
 * KEY FEATURES:
 * - Real-time presence updates via WebSocket
 * - REST API fallback for reliability
 * - Smart polling with adaptive intervals
 * - Presence caching with TTL
 * - Batch updates for performance
 * - Activity-based presence detection
 * - Cross-platform compatibility
 * 
 * PRESENCE STATES:
 * - online: User is actively using the app
 * - away: User is idle but app is open
 * - offline: User is not available
 * - last_seen: Timestamp of last activity
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Intelligent caching with expiration
 * - Batched presence requests
 * - Adaptive polling intervals
 * - Memory-efficient data structures
 * - Background/foreground awareness
 * 
 * RELIABILITY FEATURES:
 * - Hybrid WebSocket/REST approach
 * - Automatic fallback mechanisms
 * - State persistence across reconnections
 * - Graceful error handling
 * - Comprehensive monitoring
 */

class EnhancedPresenceService {
  constructor() {
    // =================================================================
    // CORE STATE MANAGEMENT
    // =================================================================
    
    /**
     * Primary presence data storage: partnerId -> presenceData
     * Structure: {
     *   partnerId: number,
     *   status: 'online' | 'away' | 'offline',
     *   lastSeen: ISO timestamp,
     *   lastActivity: ISO timestamp,
     *   updatedAt: timestamp,
     *   source: 'websocket' | 'api' | 'cache',
     *   reliability: number (0-1, confidence in data freshness)
     * }
     */
    this.presenceCache = new Map();
    
    /**
     * Event listeners registry: eventName -> callback[]
     */
    this.presenceListeners = new Map();
    
    /**
     * Service initialization state
     */
    this.isInitialized = false;
    
    /**
     * Currently tracked users for presence monitoring
     * Only users in this set will have their presence actively monitored
     */
    this.trackedUsers = new Set();
    
    // =================================================================
    // OWN PRESENCE MANAGEMENT
    // =================================================================
    
    /**
     * Current user's presence status
     */
    this.currentStatus = 'online';
    
    /**
     * Last time own presence was updated
     */
    this.lastPresenceUpdate = null;
    
    /**
     * User activity tracking for smart presence updates
     */
    this.activityTracker = {
      lastActivity: Date.now(),
      isActive: true,
      idleThreshold: 300000, // 5 minutes
      awayThreshold: 900000,  // 15 minutes
      checkInterval: null
    };
    
    // =================================================================
    // HYBRID CONNECTIVITY APPROACH
    // =================================================================
    
    /**
     * WebSocket availability and preference
     */
    this.useWebSocket = false;
    this.webSocketPreferred = true;
    
    /**
     * REST API configuration (always available with OAuth2)
     */
    this.useRestAPI = true;
    this.restAPIConfig = {
      baseEndpoint: '/api/v2/presence',
      batchEndpoint: '/api/v2/presence/batch',
      updateEndpoint: '/api/v2/presence/update'
    };
    
    /**
     * Polling configuration for REST API fallback
     */
    this.pollingConfig = {
      enabled: false,
      interval: null,
      normalInterval: 30000,    // 30 seconds normal polling
      activeInterval: 15000,    // 15 seconds when high activity
      backgroundInterval: 60000, // 1 minute when app backgrounded
      maxInterval: 300000,      // 5 minutes maximum
      adaptiveScaling: true
    };
    
    // =================================================================
    // BATCHING & PERFORMANCE
    // =================================================================
    
    /**
     * Batch processing configuration
     * Reduces network requests and improves performance
     */
    this.batchConfig = {
      enabled: true,
      interval: 3000,           // 3 seconds batching
      maxBatchSize: 25,         // Maximum users per batch
      timeout: null,
      pendingRequests: new Set()
    };
    
    /**
     * Presence update throttling
     * Prevents excessive own presence updates
     */
    this.updateThrottling = {
      enabled: true,
      minInterval: 30000,       // 30 seconds minimum between updates
      lastUpdate: 0,
      pendingUpdate: null
    };
    
    /**
     * Cache management configuration
     */
    this.cacheConfig = {
      defaultTTL: 300000,       // 5 minutes default TTL
      maxAge: 1800000,          // 30 minutes maximum age
      cleanupInterval: 300000,  // 5 minutes cleanup interval
      maxSize: 1000,            // Maximum cached users
      cleanupTimer: null
    };
    
    // =================================================================
    // MONITORING & STATISTICS
    // =================================================================
    
    /**
     * Service performance and usage statistics
     */
    this.stats = {
      // Request counters
      webSocketUpdates: 0,
      apiRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      
      // Error tracking
      errors: 0,
      websocketErrors: 0,
      apiErrors: 0,
      
      // Performance metrics
      averageResponseTime: 0,
      lastResponseTime: 0,
      
      // Activity tracking
      presenceUpdates: 0,
      batchRequests: 0,
      lastActivity: null,
      
      // User metrics
      uniqueUsersTracked: 0,
      currentOnlineUsers: 0,
      peakOnlineUsers: 0
    };
    
    /**
     * Response time tracking for performance monitoring
     */
    this.responseTimeTracker = {
      samples: [],
      maxSamples: 100,
      lastCalculated: 0
    };
  }

  // =================================================================
  // INITIALIZATION & SETUP
  // =================================================================

  /**
   * Initialize the enhanced presence service
   * 
   * INITIALIZATION PROCESS:
   * 1. Validate dependencies and configuration
   * 2. Set up WebSocket event listeners
   * 3. Initialize activity tracking
   * 4. Start cache management
   * 5. Configure adaptive polling
   * 6. Set own presence to online
   * 
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('👁️ Enhanced Presence Service already initialized');
      return true;
    }

    try {
      const startTime = Date.now();
      console.log('👁️ Initializing Enhanced Presence Service...');

      // VALIDATE DEPENDENCIES
      await this.validateDependencies();

      // SETUP WEBSOCKET INTEGRATION
      await this.setupWebSocketIntegration();

      // INITIALIZE ACTIVITY TRACKING
      this.initializeActivityTracking();

      // START CACHE MANAGEMENT
      this.startCacheManagement();

      // CONFIGURE ADAPTIVE SYSTEMS
      this.configureAdaptiveSystems();

      // SET INITIAL PRESENCE
      await this.setInitialPresence();

      // FINALIZE INITIALIZATION
      this.isInitialized = true;
      const initTime = Date.now() - startTime;

      console.log(`✅ Enhanced Presence Service initialized in ${initTime}ms`);
      console.log(`🔗 WebSocket: ${this.useWebSocket ? 'enabled' : 'disabled'}`);
      console.log(`🌐 REST API: ${this.useRestAPI ? 'enabled' : 'disabled'}`);

      this.emit('initialized', {
        initTime,
        capabilities: {
          websocket: this.useWebSocket,
          restAPI: this.useRestAPI,
          caching: this.cacheConfig.enabled,
          batching: this.batchConfig.enabled
        }
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced Presence Service:', error);
      this.emit('initializationError', { error });
      return false;
    }
  }

  /**
   * Validate service dependencies
   */
  async validateDependencies() {
    // Check WebSocket service availability
    if (odooWebSocketService) {
      const wsStatus = odooWebSocketService.getConnectionStatus();
      this.useWebSocket = wsStatus.isConnected;
    } else {
      console.warn('⚠️ WebSocket service not available - using REST API only');
      this.useWebSocket = false;
    }

    // Validate REST API access
    if (!odooAPI) {
      throw new Error('REST API client not available - cannot initialize presence service');
    }

    console.log('✅ Dependencies validated');
  }

  /**
   * Set up WebSocket integration
   */
  async setupWebSocketIntegration() {
    if (!this.useWebSocket) {
      console.log('📡 WebSocket not available - skipping WebSocket setup');
      return;
    }

    console.log('📡 Setting up WebSocket integration...');

    // PRESENCE UPDATE EVENTS
    odooWebSocketService.on('presenceUpdate', (data) => {
      this.handleWebSocketPresenceUpdate(data);
    });

    // BUS PRESENCE EVENTS (Odoo's presence system)
    odooWebSocketService.on('bus.presence', (data) => {
      this.handleBusPresenceUpdate(data);
    });

    // PARTNER UPDATE EVENTS (user profile changes)
    odooWebSocketService.on('res.partner', (data) => {
      this.handlePartnerUpdate(data);
    });

    // CONNECTION STATE MANAGEMENT
    odooWebSocketService.on('connected', () => {
      this.handleWebSocketConnected();
    });

    odooWebSocketService.on('disconnected', () => {
      this.handleWebSocketDisconnected();
    });

    odooWebSocketService.on('error', (error) => {
      this.handleWebSocketError(error);
    });

    console.log('✅ WebSocket integration configured');
  }

  /**
   * Initialize activity tracking for smart presence
   */
  initializeActivityTracking() {
    console.log('🎯 Initializing activity tracking...');

    // ACTIVITY DETECTION
    if (typeof document !== 'undefined') {
      // Browser environment - track user interaction
      ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
        document.addEventListener(event, () => {
          this.recordUserActivity();
        }, { passive: true });
      });

      // PAGE VISIBILITY API
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.handleAppBackground();
        } else {
          this.handleAppForeground();
        }
      });
    }

    // PERIODIC ACTIVITY CHECK - Use safer timeout recursion
    const scheduleActivityCheck = () => {
      this.activityTracker.checkTimeout = setTimeout(() => {
        try {
          this.checkUserActivity();
        } catch (error) {
          console.warn('Activity check error:', error);
        } finally {
          if (this.isInitialized) {
            scheduleActivityCheck();
          }
        }
      }, 30000); // Check every 30 seconds
    };

    scheduleActivityCheck();

    console.log('✅ Activity tracking initialized');
  }

  /**
   * Start cache management routines
   */
  startCacheManagement() {
    console.log('💾 Starting cache management...');

    // PERIODIC CACHE CLEANUP
    this.cacheConfig.cleanupTimer = setInterval(() => {
      this.performCacheCleanup();
    }, this.cacheConfig.cleanupInterval);

    console.log('✅ Cache management started');
  }

  /**
   * Configure adaptive systems
   */
  configureAdaptiveSystems() {
    console.log('⚙️ Configuring adaptive systems...');

    // ADAPTIVE POLLING (starts disabled, enables when needed)
    if (!this.useWebSocket && this.useRestAPI) {
      this.startAdaptivePolling();
    }

    console.log('✅ Adaptive systems configured');
  }

  /**
   * Set initial presence status
   */
  async setInitialPresence() {
    console.log('🟢 Setting initial presence to online...');
    
    try {
      await this.updateOwnPresence('online');
      console.log('✅ Initial presence set successfully');
    } catch (error) {
      console.warn('⚠️ Failed to set initial presence:', error);
      // Non-fatal error - service can still function
    }
  }

  // =================================================================
  // WEBSOCKET EVENT HANDLERS
  // =================================================================

  /**
   * Handle incoming WebSocket presence updates
   * 
   * @param {Object} data - Presence update data
   */
  handleWebSocketPresenceUpdate(data) {
    try {
      const startTime = Date.now();
      
      const { partner_id, status, last_seen, last_activity } = data;
      
      if (!partner_id) {
        console.warn('⚠️ Received presence update without partner_id');
        return;
      }

      // CREATE PRESENCE DATA OBJECT
      const presenceData = {
        partnerId: partner_id,
        status: this.normalizePresenceStatus(status),
        lastSeen: last_seen || new Date().toISOString(),
        lastActivity: last_activity || last_seen || new Date().toISOString(),
        updatedAt: Date.now(),
        source: 'websocket',
        reliability: 0.95 // High reliability for real-time updates
      };

      // UPDATE CACHE
      this.updatePresenceCache(partner_id, presenceData);
      
      // UPDATE STATISTICS
      this.stats.webSocketUpdates++;
      this.stats.lastActivity = Date.now();
      this.updateResponseTime(Date.now() - startTime);
      
      console.log(`👁️ WebSocket presence update: Partner ${partner_id} is ${status}`);
      
      // EMIT EVENTS
      this.emitPresenceChangeEvents(partner_id, presenceData);
      
    } catch (error) {
      console.error('❌ Error handling WebSocket presence update:', error);
      this.stats.websocketErrors++;
      this.stats.errors++;
    }
  }

  /**
   * Handle bus presence updates (Odoo's internal presence system)
   * 
   * @param {Object} data - Bus presence data
   */
  handleBusPresenceUpdate(data) {
    try {
      // Bus presence updates have different structure
      const { partner_ids, status } = data;
      
      if (!partner_ids || !Array.isArray(partner_ids)) {
        return;
      }

      // Process each partner in the update
      partner_ids.forEach(partnerId => {
        if (this.trackedUsers.has(partnerId)) {
          const presenceData = {
            partnerId,
            status: this.normalizePresenceStatus(status),
            lastSeen: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            updatedAt: Date.now(),
            source: 'websocket',
            reliability: 0.9
          };
          
          this.updatePresenceCache(partnerId, presenceData);
          this.emitPresenceChangeEvents(partnerId, presenceData);
        }
      });
      
      this.stats.webSocketUpdates++;
      
    } catch (error) {
      console.error('❌ Error handling bus presence update:', error);
      this.stats.websocketErrors++;
    }
  }

  /**
   * Handle partner updates (user profile changes)
   * 
   * @param {Object} data - Partner update data
   */
  handlePartnerUpdate(data) {
    try {
      const { id, name, email, is_online } = data;
      
      if (!id || !this.trackedUsers.has(id)) {
        return;
      }

      // Update presence based on partner data
      if (typeof is_online === 'boolean') {
        const presenceData = {
          partnerId: id,
          status: is_online ? 'online' : 'offline',
          lastSeen: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          updatedAt: Date.now(),
          source: 'websocket',
          reliability: 0.8,
          // Additional user info
          userName: name,
          userEmail: email
        };
        
        this.updatePresenceCache(id, presenceData);
        this.emitPresenceChangeEvents(id, presenceData);
      }
      
    } catch (error) {
      console.error('❌ Error handling partner update:', error);
      this.stats.websocketErrors++;
    }
  }

  /**
   * Handle WebSocket connection established
   */
  handleWebSocketConnected() {
    console.log('👁️ WebSocket connected - enabling real-time presence');
    
    this.useWebSocket = true;
    
    // Disable polling if it was running
    if (this.pollingConfig.enabled) {
      this.stopPolling();
    }
    
    // Request presence for all tracked users
    this.refreshAllTrackedPresence();
    
    // Update own presence
    this.updateOwnPresence(this.currentStatus);
    
    this.emit('websocketConnected');
  }

  /**
   * Handle WebSocket disconnection
   */
  handleWebSocketDisconnected() {
    console.log('👁️ WebSocket disconnected - falling back to REST API');
    
    this.useWebSocket = false;
    
    // Start polling if we have tracked users
    if (this.trackedUsers.size > 0 && this.useRestAPI) {
      this.startAdaptivePolling();
    }
    
    // Mark cached data as less reliable
    this.degradeCacheReliability();
    
    this.emit('websocketDisconnected');
  }

  /**
   * Handle WebSocket errors
   * 
   * @param {Error} error - WebSocket error
   */
  handleWebSocketError(error) {
    console.error('👁️ WebSocket error affecting presence:', error);
    
    this.stats.websocketErrors++;
    this.stats.errors++;
    
    this.emit('websocketError', { error });
  }

  // =================================================================
  // PRESENCE MANAGEMENT
  // =================================================================

  /**
   * Update own presence status
   * 
   * FEATURES:
   * - Throttled updates to prevent spam
   * - Multi-channel delivery (WebSocket + API)
   * - Optimistic local updates
   * - Error recovery
   * 
   * @param {string} status - Presence status ('online', 'away', 'offline')
   * @returns {Promise<boolean>} Success status
   */
  async updateOwnPresence(status = 'online') {
    try {
      // VALIDATE STATUS
      if (!this.isValidPresenceStatus(status)) {
        throw new Error(`Invalid presence status: ${status}`);
      }

      // CHECK THROTTLING
      const now = Date.now();
      if (this.updateThrottling.enabled) {
        const timeSinceLastUpdate = now - this.updateThrottling.lastUpdate;
        if (timeSinceLastUpdate < this.updateThrottling.minInterval) {
          console.log(`👁️ Presence update throttled (${timeSinceLastUpdate}ms < ${this.updateThrottling.minInterval}ms)`);
          
          // Schedule delayed update
          if (this.updateThrottling.pendingUpdate) {
            clearTimeout(this.updateThrottling.pendingUpdate);
          }
          
          this.updateThrottling.pendingUpdate = setTimeout(() => {
            this.updateOwnPresence(status);
          }, this.updateThrottling.minInterval - timeSinceLastUpdate);
          
          return true;
        }
      }

      console.log(`👁️ Updating own presence to: ${status}`);

      // PREPARE PRESENCE DATA
      const presenceData = {
        status,
        last_seen: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        platform: this.getPlatformInfo(),
        timestamp: now
      };

      // TRY WEBSOCKET FIRST
      let success = false;
      if (this.useWebSocket) {
        success = await this.sendWebSocketPresenceUpdate(presenceData);
      }

      // FALLBACK TO REST API
      if (!success && this.useRestAPI) {
        success = await this.sendRestAPIPresenceUpdate(presenceData);
      }

      if (success) {
        // UPDATE LOCAL STATE
        this.currentStatus = status;
        this.lastPresenceUpdate = now;
        this.updateThrottling.lastUpdate = now;
        
        // CLEAR PENDING UPDATE
        if (this.updateThrottling.pendingUpdate) {
          clearTimeout(this.updateThrottling.pendingUpdate);
          this.updateThrottling.pendingUpdate = null;
        }
        
        this.stats.presenceUpdates++;
        
        console.log(`✅ Own presence updated to: ${status}`);
        
        this.emit('ownPresenceUpdated', {
          status,
          timestamp: now,
          method: this.useWebSocket ? 'websocket' : 'api'
        });
      } else {
        throw new Error('Failed to update presence via any available method');
      }

      return success;
    } catch (error) {
      console.error('❌ Failed to update own presence:', error);
      this.stats.errors++;
      this.emit('presenceUpdateError', { status, error });
      return false;
    }
  }

  /**
   * Send presence update via WebSocket
   * 
   * @param {Object} presenceData - Presence data to send
   * @returns {Promise<boolean>} Success status
   */
  async sendWebSocketPresenceUpdate(presenceData) {
    try {
      const wsStatus = odooWebSocketService.getConnectionStatus();
      if (!wsStatus.isConnected) {
        return false;
      }

      // Send presence update message with required parameters
      odooWebSocketService.sendMessage('update_presence', {
        partner_id: odooWebSocketService.partnerId,
        inactivity_period: 0,
        im_status_ids_by_model: {},
        ...presenceData
      });

      return true;
    } catch (error) {
      console.error('❌ WebSocket presence update failed:', error);
      return false;
    }
  }

  /**
   * Send presence update via REST API
   * 
   * @param {Object} presenceData - Presence data to send
   * @returns {Promise<boolean>} Success status
   */
  async sendRestAPIPresenceUpdate(presenceData) {
    try {
      const startTime = Date.now();
      
      const response = await odooAPI.put(this.restAPIConfig.updateEndpoint, presenceData);
      
      this.updateResponseTime(Date.now() - startTime);
      this.stats.apiRequests++;
      
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      console.error('❌ REST API presence update failed:', error);
      this.stats.apiErrors++;
      return false;
    }
  }

  /**
   * Track users for presence monitoring
   * 
   * @param {Array<number>} userIds - Array of user IDs to track
   */
  trackUsers(userIds) {
    if (!Array.isArray(userIds)) {
      console.warn('⚠️ trackUsers called with non-array:', userIds);
      return;
    }

    console.log(`👁️ Tracking presence for ${userIds.length} users`);

    // Add to tracked users set
    userIds.forEach(userId => {
      this.trackedUsers.add(userId);
    });

    // Update statistics
    this.stats.uniqueUsersTracked = this.trackedUsers.size;

    // Request immediate presence update for new users
    const newUsers = userIds.filter(id => !this.presenceCache.has(id));
    if (newUsers.length > 0) {
      this.requestPresenceForUsers(newUsers);
    }

    // Start polling if WebSocket not available
    if (!this.useWebSocket && this.useRestAPI && !this.pollingConfig.enabled) {
      this.startAdaptivePolling();
    }
  }

  /**
   * Stop tracking specific users
   * 
   * @param {Array<number>} userIds - Array of user IDs to stop tracking
   */
  untrackUsers(userIds) {
    if (!Array.isArray(userIds)) {
      console.warn('⚠️ untrackUsers called with non-array:', userIds);
      return;
    }

    console.log(`👁️ Stopping tracking for ${userIds.length} users`);

    // Remove from tracked users
    userIds.forEach(userId => {
      this.trackedUsers.delete(userId);
    });

    // Update statistics
    this.stats.uniqueUsersTracked = this.trackedUsers.size;

    // Stop polling if no users being tracked
    if (this.trackedUsers.size === 0 && this.pollingConfig.enabled) {
      this.stopPolling();
    }
  }

  /**
   * Request presence information for specific users
   * 
   * @param {Array<number>} userIds - Array of user IDs
   */
  requestPresenceForUsers(userIds) {
    if (!userIds || userIds.length === 0) return;

    if (this.batchConfig.enabled) {
      // Add to batch queue
      userIds.forEach(id => this.batchConfig.pendingRequests.add(id));
      this.scheduleBatchPresenceRequest();
    } else {
      // Immediate request
      this.fetchPresenceData(userIds);
    }
  }

  /**
   * Schedule batched presence request
   */
  scheduleBatchPresenceRequest() {
    if (this.batchConfig.timeout) {
      clearTimeout(this.batchConfig.timeout);
    }

    this.batchConfig.timeout = setTimeout(() => {
      this.processBatchedPresenceRequests();
    }, this.batchConfig.interval);
  }

  /**
   * Process batched presence requests
   */
  async processBatchedPresenceRequests() {
    if (this.batchConfig.pendingRequests.size === 0) return;

    const userIds = Array.from(this.batchConfig.pendingRequests);
    
    // Process in chunks if batch is too large
    const chunks = this.chunkArray(userIds, this.batchConfig.maxBatchSize);
    
    console.log(`👁️ Processing ${chunks.length} batched presence requests for ${userIds.length} users`);

    this.batchConfig.pendingRequests.clear();
    this.batchConfig.timeout = null;

    // Process each chunk
    for (const chunk of chunks) {
      try {
        await this.fetchPresenceData(chunk);
        this.stats.batchRequests++;
      } catch (error) {
        console.error('❌ Batch presence request failed:', error);
        // Re-queue failed requests for retry
        chunk.forEach(id => this.batchConfig.pendingRequests.add(id));
      }
    }

    // Schedule retry for any failed requests
    if (this.batchConfig.pendingRequests.size > 0) {
      setTimeout(() => {
        this.scheduleBatchPresenceRequest();
      }, 5000); // 5 second retry delay
    }
  }

  /**
   * Fetch presence data from API
   * 
   * @param {Array<number>} userIds - Array of user IDs
   */
  async fetchPresenceData(userIds) {
    try {
      const startTime = Date.now();
      
      let presenceData;
      
      if (this.useWebSocket) {
        // Request via WebSocket
        presenceData = await this.requestWebSocketPresence(userIds);
      } else if (this.useRestAPI) {
        // Request via REST API
        presenceData = await this.requestRestAPIPresence(userIds);
      } else {
        throw new Error('No available method to fetch presence data');
      }

      // Update cache with received data
      if (presenceData && Array.isArray(presenceData)) {
        presenceData.forEach(presence => {
          this.updatePresenceCache(presence.partnerId, {
            ...presence,
            source: this.useWebSocket ? 'websocket' : 'api',
            reliability: this.useWebSocket ? 0.95 : 0.85
          });
        });
      }

      this.updateResponseTime(Date.now() - startTime);
      console.log(`✅ Fetched presence data for ${userIds.length} users`);

    } catch (error) {
      console.error('❌ Failed to fetch presence data:', error);
      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Request presence via WebSocket
   * 
   * @param {Array<number>} userIds - Array of user IDs
   * @returns {Promise<Array>} Presence data array
   */
  async requestWebSocketPresence(userIds) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket presence request timeout'));
      }, 10000); // 10 second timeout

      // Send request
      odooWebSocketService.sendMessage('request_presence', {
        partner_ids: userIds
      });

      // Note: In a real implementation, you'd listen for a response
      // For now, we'll resolve immediately as the data will come via events
      clearTimeout(timeout);
      resolve([]);
    });
  }

  /**
   * Request presence via REST API
   * 
   * @param {Array<number>} userIds - Array of user IDs
   * @returns {Promise<Array>} Presence data array
   */
  async requestRestAPIPresence(userIds) {
    const response = await odooAPI.post(this.restAPIConfig.batchEndpoint, {
      partner_ids: userIds
    });

    this.stats.apiRequests++;

    if (response.status >= 200 && response.status < 300) {
      return response.data.presence || [];
    } else {
      throw new Error(`API request failed with status ${response.status}`);
    }
  }

  // =================================================================
  // CACHE MANAGEMENT
  // =================================================================

  /**
   * Update presence cache with new data
   * 
   * @param {number} partnerId - User partner ID
   * @param {Object} presenceData - Presence data to cache
   */
  updatePresenceCache(partnerId, presenceData) {
    const now = Date.now();
    
    // Enhance presence data with cache metadata
    const cacheEntry = {
      ...presenceData,
      cachedAt: now,
      expiresAt: now + this.cacheConfig.defaultTTL,
      hits: (this.presenceCache.get(partnerId)?.hits || 0) + 1
    };

    // Update cache
    this.presenceCache.set(partnerId, cacheEntry);

    // Update statistics
    this.updateOnlineUserCount();

    console.log(`💾 Cached presence for partner ${partnerId}: ${presenceData.status}`);
  }

  /**
   * Get presence from cache with freshness check
   * 
   * @param {number} partnerId - User partner ID
   * @returns {Object|null} Cached presence data or null if not found/expired
   */
  getPresenceFromCache(partnerId) {
    const cacheEntry = this.presenceCache.get(partnerId);
    
    if (!cacheEntry) {
      this.stats.cacheMisses++;
      return null;
    }

    const now = Date.now();
    
    // Check if cache entry is expired
    if (cacheEntry.expiresAt < now) {
      console.log(`💾 Cache entry expired for partner ${partnerId}`);
      this.presenceCache.delete(partnerId);
      this.stats.cacheMisses++;
      return null;
    }

    // Check reliability threshold
    if (cacheEntry.reliability < 0.5) {
      console.log(`💾 Cache entry unreliable for partner ${partnerId}`);
      this.stats.cacheMisses++;
      return null;
    }

    // Update hit count
    cacheEntry.hits++;
    this.stats.cacheHits++;
    
    return cacheEntry;
  }

  /**
   * Perform cache cleanup
   */
  performCacheCleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    console.log('💾 Performing cache cleanup...');

    // Remove expired entries
    this.presenceCache.forEach((entry, partnerId) => {
      if (entry.expiresAt < now || entry.cachedAt < now - this.cacheConfig.maxAge) {
        this.presenceCache.delete(partnerId);
        cleaned++;
      }
    });

    // Enforce cache size limit (remove least recently used)
    if (this.presenceCache.size > this.cacheConfig.maxSize) {
      const sortedEntries = Array.from(this.presenceCache.entries())
        .sort(([,a], [,b]) => a.hits - b.hits); // Sort by hit count (LRU approximation)
      
      const toRemove = this.presenceCache.size - this.cacheConfig.maxSize;
      for (let i = 0; i < toRemove; i++) {
        this.presenceCache.delete(sortedEntries[i][0]);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`💾 Cache cleanup completed - removed ${cleaned} entries`);
    }

    // Update statistics
    this.updateOnlineUserCount();
  }

  /**
   * Degrade cache reliability after connection issues
   */
  degradeCacheReliability() {
    console.log('💾 Degrading cache reliability due to connection issues...');
    
    this.presenceCache.forEach((entry, partnerId) => {
      entry.reliability *= 0.8; // Reduce reliability by 20%
      
      // Remove entries that become too unreliable
      if (entry.reliability < 0.3) {
        this.presenceCache.delete(partnerId);
      }
    });
  }

  // =================================================================
  // ADAPTIVE POLLING
  // =================================================================

  /**
   * Start adaptive polling system
   */
  startAdaptivePolling() {
    if (this.pollingConfig.enabled) {
      console.log('🔄 Adaptive polling already running');
      return;
    }

    console.log('🔄 Starting adaptive polling...');
    
    this.pollingConfig.enabled = true;
    this.scheduleNextPoll();
  }

  /**
   * Stop adaptive polling
   */
  stopPolling() {
    if (!this.pollingConfig.enabled) return;

    console.log('🔄 Stopping adaptive polling...');
    
    this.pollingConfig.enabled = false;
    
    if (this.pollingConfig.interval) {
      clearTimeout(this.pollingConfig.interval);
      this.pollingConfig.interval = null;
    }
  }

  /**
   * Schedule next polling cycle
   */
  scheduleNextPoll() {
    if (!this.pollingConfig.enabled) return;

    const interval = this.calculateOptimalPollingInterval();
    
    this.pollingConfig.interval = setTimeout(() => {
      this.performPollingCycle();
    }, interval);
  }

  /**
   * Calculate optimal polling interval based on activity
   * 
   * @returns {number} Polling interval in milliseconds
   */
  calculateOptimalPollingInterval() {
    const now = Date.now();
    const timeSinceActivity = now - (this.activityTracker.lastActivity || now);
    
    let interval = this.pollingConfig.normalInterval;
    
    // Increase frequency if recent activity
    if (timeSinceActivity < 60000) { // 1 minute
      interval = this.pollingConfig.activeInterval;
    } else if (timeSinceActivity > 600000) { // 10 minutes
      interval = this.pollingConfig.backgroundInterval;
    }
    
    // Apply adaptive scaling based on error rate
    if (this.pollingConfig.adaptiveScaling) {
      const errorRate = this.stats.errors / Math.max(this.stats.apiRequests, 1);
      if (errorRate > 0.1) { // 10% error rate
        interval *= 2; // Double interval on high errors
      }
    }
    
    return Math.min(interval, this.pollingConfig.maxInterval);
  }

  /**
   * Perform polling cycle
   */
  async performPollingCycle() {
    if (!this.pollingConfig.enabled) return;

    try {
      console.log('🔄 Performing polling cycle...');
      
      // Get list of tracked users that need updates
      const usersToUpdate = Array.from(this.trackedUsers).filter(userId => {
        const cached = this.presenceCache.get(userId);
        if (!cached) return true;
        
        const age = Date.now() - cached.cachedAt;
        return age > this.cacheConfig.defaultTTL / 2; // Update if older than half TTL
      });

      if (usersToUpdate.length > 0) {
        await this.fetchPresenceData(usersToUpdate);
        console.log(`🔄 Polling updated ${usersToUpdate.length} users`);
      }

    } catch (error) {
      console.error('❌ Polling cycle failed:', error);
      this.stats.errors++;
    } finally {
      // Schedule next poll
      this.scheduleNextPoll();
    }
  }

  // =================================================================
  // ACTIVITY TRACKING
  // =================================================================

  /**
   * Record user activity for smart presence
   */
  recordUserActivity() {
    const now = Date.now();
    this.activityTracker.lastActivity = now;
    this.activityTracker.isActive = true;
    
    // Update own presence if we were away
    if (this.currentStatus === 'away') {
      this.updateOwnPresence('online');
    }
  }

  /**
   * Check user activity and update presence accordingly
   */
  checkUserActivity() {
    const now = Date.now();
    const timeSinceActivity = now - this.activityTracker.lastActivity;
    
    let newStatus = this.currentStatus;
    
    // Determine status based on activity
    if (timeSinceActivity > this.activityTracker.awayThreshold) {
      newStatus = 'away';
      this.activityTracker.isActive = false;
    } else if (timeSinceActivity > this.activityTracker.idleThreshold) {
      if (this.currentStatus === 'online') {
        newStatus = 'away';
      }
      this.activityTracker.isActive = false;
    } else {
      this.activityTracker.isActive = true;
      if (this.currentStatus === 'away') {
        newStatus = 'online';
      }
    }
    
    // Update presence if status changed
    if (newStatus !== this.currentStatus) {
      console.log(`🎯 Activity-based presence change: ${this.currentStatus} -> ${newStatus}`);
      this.updateOwnPresence(newStatus);
    }
  }

  /**
   * Handle app going to background
   */
  handleAppBackground() {
    console.log('🎯 App backgrounded - adjusting presence behavior');
    
    // Set status to away if online
    if (this.currentStatus === 'online') {
      this.updateOwnPresence('away');
    }
    
    // Reduce polling frequency
    if (this.pollingConfig.enabled) {
      this.pollingConfig.normalInterval = this.pollingConfig.backgroundInterval;
    }
    
    this.emit('appBackgrounded');
  }

  /**
   * Handle app coming to foreground
   */
  handleAppForeground() {
    console.log('🎯 App foregrounded - resuming normal presence behavior');
    
    // Record activity
    this.recordUserActivity();
    
    // Set status to online
    this.updateOwnPresence('online');
    
    // Restore normal polling frequency
    if (this.pollingConfig.enabled) {
      this.pollingConfig.normalInterval = 30000; // Reset to default
    }
    
    // Refresh all tracked presence
    this.refreshAllTrackedPresence();
    
    this.emit('appForegrounded');
  }

  // =================================================================
  // UTILITY METHODS
  // =================================================================

  /**
   * Normalize presence status to standard values
   * 
   * @param {string} status - Raw status value
   * @returns {string} Normalized status
   */
  normalizePresenceStatus(status) {
    if (!status) return 'offline';
    
    const normalized = status.toLowerCase();
    
    switch (normalized) {
      case 'online':
      case 'active':
      case 'available':
        return 'online';
      case 'away':
      case 'idle':
      case 'inactive':
        return 'away';
      case 'offline':
      case 'unavailable':
      case 'invisible':
        return 'offline';
      default:
        return 'offline';
    }
  }

  /**
   * Validate presence status
   * 
   * @param {string} status - Status to validate
   * @returns {boolean} Whether status is valid
   */
  isValidPresenceStatus(status) {
    return ['online', 'away', 'offline'].includes(status);
  }

  /**
   * Get platform information for presence context
   * 
   * @returns {Object} Platform information
   */
  getPlatformInfo() {
    return {
      type: 'mobile', // or 'web', 'desktop'
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Update response time tracking
   * 
   * @param {number} responseTime - Response time in milliseconds
   */
  updateResponseTime(responseTime) {
    this.stats.lastResponseTime = responseTime;
    
    // Track samples for average calculation
    this.responseTimeTracker.samples.push(responseTime);
    
    if (this.responseTimeTracker.samples.length > this.responseTimeTracker.maxSamples) {
      this.responseTimeTracker.samples.shift(); // Remove oldest sample
    }
    
    // Recalculate average periodically
    const now = Date.now();
    if (now - this.responseTimeTracker.lastCalculated > 60000) { // Every minute
      this.stats.averageResponseTime = this.responseTimeTracker.samples.reduce((a, b) => a + b, 0) / this.responseTimeTracker.samples.length;
      this.responseTimeTracker.lastCalculated = now;
    }
  }

  /**
   * Update online user count statistic
   */
  updateOnlineUserCount() {
    let onlineCount = 0;
    
    this.presenceCache.forEach(presence => {
      if (presence.status === 'online') {
        onlineCount++;
      }
    });
    
    this.stats.currentOnlineUsers = onlineCount;
    
    if (onlineCount > this.stats.peakOnlineUsers) {
      this.stats.peakOnlineUsers = onlineCount;
    }
  }

  /**
   * Chunk array into smaller arrays
   * 
   * @param {Array} array - Array to chunk
   * @param {number} size - Chunk size
   * @returns {Array} Array of chunks
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Refresh presence for all tracked users
   */
  refreshAllTrackedPresence() {
    if (this.trackedUsers.size === 0) return;
    
    console.log(`👁️ Refreshing presence for ${this.trackedUsers.size} tracked users`);
    this.requestPresenceForUsers(Array.from(this.trackedUsers));
  }

  // =================================================================
  // PUBLIC API METHODS
  // =================================================================

  /**
   * Get presence information for a specific user
   * 
   * @param {number} partnerId - User partner ID
   * @returns {Object} Presence information
   */
  getUserPresence(partnerId) {
    // Try cache first
    const cached = this.getPresenceFromCache(partnerId);
    if (cached) {
      return {
        partnerId,
        status: cached.status,
        lastSeen: cached.lastSeen,
        lastActivity: cached.lastActivity,
        isOnline: cached.status === 'online',
        isAway: cached.status === 'away',
        isOffline: cached.status === 'offline',
        reliability: cached.reliability,
        source: cached.source,
        cacheAge: Date.now() - cached.cachedAt
      };
    }

    // Return default if not found
    return {
      partnerId,
      status: 'offline',
      lastSeen: null,
      lastActivity: null,
      isOnline: false,
      isAway: false,
      isOffline: true,
      reliability: 0,
      source: 'default',
      cacheAge: null
    };
  }

  /**
   * Get presence for multiple users
   * 
   * @param {Array<number>} partnerIds - Array of user partner IDs
   * @returns {Object} Object with partnerId as key and presence as value
   */
  getMultipleUserPresence(partnerIds) {
    const presenceData = {};
    
    partnerIds.forEach(partnerId => {
      presenceData[partnerId] = this.getUserPresence(partnerId);
    });
    
    return presenceData;
  }

  /**
   * Get all cached presence data
   * 
   * @returns {Object} All presence data
   */
  getAllPresence() {
    const allPresence = {};
    
    this.presenceCache.forEach((presence, partnerId) => {
      allPresence[partnerId] = this.getUserPresence(partnerId);
    });
    
    return allPresence;
  }

  /**
   * Check if user is online
   * 
   * @param {number} partnerId - User partner ID
   * @returns {boolean} Whether user is online
   */
  isUserOnline(partnerId) {
    const presence = this.getUserPresence(partnerId);
    return presence.isOnline;
  }

  /**
   * Check if user is away
   * 
   * @param {number} partnerId - User partner ID
   * @returns {boolean} Whether user is away
   */
  isUserAway(partnerId) {
    const presence = this.getUserPresence(partnerId);
    return presence.isAway;
  }

  /**
   * Check if user is offline
   * 
   * @param {number} partnerId - User partner ID
   * @returns {boolean} Whether user is offline
   */
  isUserOffline(partnerId) {
    const presence = this.getUserPresence(partnerId);
    return presence.isOffline;
  }

  /**
   * Get users by status
   * 
   * @param {string} status - Status to filter by ('online', 'away', 'offline')
   * @returns {Array} Array of user presence objects with specified status
   */
  getUsersByStatus(status) {
    const users = [];
    
    this.presenceCache.forEach((presence, partnerId) => {
      if (presence.status === status) {
        users.push(this.getUserPresence(partnerId));
      }
    });
    
    return users;
  }

  /**
   * Get online users count
   * 
   * @returns {number} Number of online users
   */
  getOnlineUsersCount() {
    return this.stats.currentOnlineUsers;
  }

  /**
   * Get formatted presence text (Telegram-style)
   * 
   * @param {number} partnerId - User partner ID
   * @param {Object} options - Formatting options
   * @returns {string} Formatted presence text
   */
  getPresenceText(partnerId, options = {}) {
    const {
      showLastSeen = true,
      shortFormat = false,
      relativeTime = true
    } = options;
    
    const presence = this.getUserPresence(partnerId);
    
    if (presence.isOnline) {
      return shortFormat ? 'online' : 'online';
    }
    
    if (presence.isAway) {
      return shortFormat ? 'away' : 'away';
    }
    
    // Offline - show last seen if available
    if (showLastSeen && presence.lastSeen) {
      const lastSeenTime = new Date(presence.lastSeen);
      const now = new Date();
      const diffMs = now - lastSeenTime;
      
      if (relativeTime) {
        return this.formatRelativeTime(diffMs, shortFormat);
      } else {
        return shortFormat 
          ? lastSeenTime.toLocaleDateString()
          : `last seen ${lastSeenTime.toLocaleString()}`;
      }
    }
    
    return shortFormat ? 'offline' : 'last seen recently';
  }

  /**
   * Format relative time for last seen
   * 
   * @param {number} diffMs - Time difference in milliseconds
   * @param {boolean} shortFormat - Whether to use short format
   * @returns {string} Formatted relative time
   */
  formatRelativeTime(diffMs, shortFormat = false) {
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (seconds < 60) {
      return shortFormat ? 'now' : 'last seen just now';
    }
    
    if (minutes < 60) {
      return shortFormat 
        ? `${minutes}m ago`
        : `last seen ${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
    
    if (hours < 24) {
      return shortFormat
        ? `${hours}h ago`
        : `last seen ${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
    
    if (days < 7) {
      return shortFormat
        ? `${days}d ago`
        : `last seen ${days} day${days !== 1 ? 's' : ''} ago`;
    }
    
    return shortFormat ? 'long ago' : 'last seen a long time ago';
  }

  // =================================================================
  // STATUS CONTROL METHODS
  // =================================================================

  /**
   * Set user status to online
   * 
   * @returns {Promise<boolean>} Success status
   */
  async setOnline() {
    return await this.updateOwnPresence('online');
  }

  /**
   * Set user status to away
   * 
   * @returns {Promise<boolean>} Success status
   */
  async setAway() {
    return await this.updateOwnPresence('away');
  }

  /**
   * Set user status to offline
   * 
   * @returns {Promise<boolean>} Success status
   */
  async setOffline() {
    return await this.updateOwnPresence('offline');
  }

  /**
   * Set custom presence status
   * 
   * @param {string} status - Presence status
   * @returns {Promise<boolean>} Success status
   */
  async setStatus(status) {
    return await this.updateOwnPresence(status);
  }

  /**
   * Get current user's status
   * 
   * @returns {string} Current presence status
   */
  getCurrentStatus() {
    return this.currentStatus;
  }

  /**
   * Check if current user is online
   * 
   * @returns {boolean} Whether current user is online
   */
  isCurrentUserOnline() {
    return this.currentStatus === 'online';
  }

  // =================================================================
  // EVENT SYSTEM
  // =================================================================

  /**
   * Emit presence change events
   * 
   * @param {number} partnerId - User partner ID
   * @param {Object} presenceData - Presence data
   */
  emitPresenceChangeEvents(partnerId, presenceData) {
    const eventData = {
      partnerId,
      presence: presenceData,
      timestamp: Date.now()
    };

    // Emit general presence change event
    this.emit('presenceChanged', eventData);

    // Emit user-specific event
    this.emit(`presence:${partnerId}`, presenceData);

    // Emit status-specific events
    this.emit(`presence:${presenceData.status}`, eventData);

    // Emit online/offline transitions
    const previousPresence = this.presenceCache.get(partnerId);
    if (previousPresence && previousPresence.status !== presenceData.status) {
      if (presenceData.status === 'online' && previousPresence.status !== 'online') {
        this.emit('userCameOnline', eventData);
      } else if (presenceData.status !== 'online' && previousPresence.status === 'online') {
        this.emit('userWentOffline', eventData);
      }
    }
  }

  /**
   * Add event listener
   * 
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   */
  on(event, callback) {
    if (!this.presenceListeners.has(event)) {
      this.presenceListeners.set(event, []);
    }
    this.presenceListeners.get(event).push(callback);
    
    console.log(`👁️ Added presence listener for event: ${event}`);
  }

  /**
   * Remove event listener
   * 
   * @param {string} event - Event name
   * @param {Function} callback - Event callback to remove
   */
  off(event, callback) {
    if (this.presenceListeners.has(event)) {
      const listeners = this.presenceListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
        console.log(`👁️ Removed presence listener for event: ${event}`);
      }
    }
  }

  /**
   * Emit event to all listeners
   * 
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.presenceListeners.has(event)) {
      const listeners = this.presenceListeners.get(event);
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in presence listener for ${event}:`, error);
          this.stats.errors++;
        }
      });
    }
  }

  // =================================================================
  // STATISTICS & MONITORING
  // =================================================================

  /**
   * Get comprehensive service statistics
   * 
   * @returns {Object} Detailed statistics
   */
  getPresenceStats() {
    const now = Date.now();
    
    return {
      // Basic metrics
      ...this.stats,
      
      // Current state
      trackedUsers: this.trackedUsers.size,
      cachedUsers: this.presenceCache.size,
      currentStatus: this.currentStatus,
      
      // Performance metrics
      cacheHitRate: this.stats.cacheHits / Math.max(this.stats.cacheHits + this.stats.cacheMisses, 1),
      errorRate: this.stats.errors / Math.max(this.stats.apiRequests + this.stats.webSocketUpdates, 1),
      
      // System health
      isHealthy: this.isInitialized && this.stats.errors < 50,
      capabilities: {
        websocket: this.useWebSocket,
        restAPI: this.useRestAPI,
        polling: this.pollingConfig.enabled,
        caching: true,
        batching: this.batchConfig.enabled
      },
      
      // Timing information
      lastPresenceUpdate: this.lastPresenceUpdate,
      timeSinceLastUpdate: this.lastPresenceUpdate ? now - this.lastPresenceUpdate : null,
      
      // Configuration
      config: {
        cacheSize: this.presenceCache.size,
        maxCacheSize: this.cacheConfig.maxSize,
        cacheTTL: this.cacheConfig.defaultTTL,
        pollingInterval: this.pollingConfig.enabled ? this.pollingConfig.normalInterval : null,
        batchSize: this.batchConfig.maxBatchSize
      }
    };
  }

  /**
   * Get real-time performance metrics
   * 
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    const stats = this.getPresenceStats();
    
    return {
      responseTime: {
        average: this.stats.averageResponseTime,
        last: this.stats.lastResponseTime,
        samples: this.responseTimeTracker.samples.length
      },
      
      throughput: {
        requestsPerMinute: this.stats.apiRequests + this.stats.webSocketUpdates,
        cacheEfficiency: stats.cacheHitRate,
        errorPercentage: stats.errorRate * 100
      },
      
      memory: {
        cacheEntries: this.presenceCache.size,
        eventListeners: Array.from(this.presenceListeners.values())
          .reduce((total, listeners) => total + listeners.length, 0),
        trackedUsers: this.trackedUsers.size
      },
      
      network: {
        websocketActive: this.useWebSocket,
        pollingActive: this.pollingConfig.enabled,
        batchingEnabled: this.batchConfig.enabled,
        pendingRequests: this.batchConfig.pendingRequests.size
      }
    };
  }

  /**
   * Clear all presence data
   */
  clearPresenceData() {
    console.log('👁️ Clearing all presence data...');
    
    this.presenceCache.clear();
    this.trackedUsers.clear();
    this.batchConfig.pendingRequests.clear();
    
    // Clear pending timeouts
    if (this.batchConfig.timeout) {
      clearTimeout(this.batchConfig.timeout);
      this.batchConfig.timeout = null;
    }
    
    if (this.updateThrottling.pendingUpdate) {
      clearTimeout(this.updateThrottling.pendingUpdate);
      this.updateThrottling.pendingUpdate = null;
    }
    
    // Reset statistics
    this.stats.currentOnlineUsers = 0;
    this.stats.uniqueUsersTracked = 0;
    
    this.emit('presenceDataCleared');
  }

  // =================================================================
  // SERVICE LIFECYCLE
  // =================================================================

  /**
   * Graceful shutdown and cleanup
   */
  async cleanup() {
    console.log('👁️ Starting Enhanced Presence Service cleanup...');
    
    try {
      // Set status to offline
      if (this.isInitialized) {
        await this.setOffline();
      }
      
      // Stop polling
      this.stopPolling();
      
      // Clear all timers
      if (this.cacheConfig.cleanupTimer) {
        clearInterval(this.cacheConfig.cleanupTimer);
        this.cacheConfig.cleanupTimer = null;
      }
      
      if (this.activityTracker.checkInterval) {
        clearInterval(this.activityTracker.checkInterval);
        this.activityTracker.checkInterval = null;
      }
      
      // Clear all data
      this.clearPresenceData();
      
      // Clear event listeners
      this.presenceListeners.clear();
      
      // Reset state
      this.isInitialized = false;
      
      console.log('✅ Enhanced Presence Service cleanup completed');
      
      this.emit('cleanup', {
        timestamp: Date.now(),
        finalStats: this.getPresenceStats()
      });
      
    } catch (error) {
      console.error('❌ Error during presence service cleanup:', error);
    }
  }

  /**
   * Health check for service monitoring
   * 
   * @returns {Object} Health check results
   */
  healthCheck() {
    const stats = this.getPresenceStats();
    const performance = this.getPerformanceMetrics();
    
    const health = {
      status: 'healthy',
      timestamp: Date.now(),
      uptime: this.isInitialized ? Date.now() - (this.stats.lastActivity || Date.now()) : 0,
      checks: {
        initialized: this.isInitialized,
        websocketAvailable: this.useWebSocket,
        apiAvailable: this.useRestAPI,
        cacheHealthy: this.presenceCache.size <= this.cacheConfig.maxSize,
        lowErrorRate: stats.errorRate < 0.1,
        responsiveAPI: performance.responseTime.average < 5000
      }
    };
    
    // Determine overall health status
    const failedChecks = Object.values(health.checks).filter(check => !check).length;
    
    if (failedChecks === 0) {
      health.status = 'healthy';
    } else if (failedChecks <= 2) {
      health.status = 'degraded';
    } else {
      health.status = 'unhealthy';
    }
    
    health.failedChecks = failedChecks;
    health.totalChecks = Object.keys(health.checks).length;
    
    return health;
  }
}

// =================================================================
// SINGLETON EXPORT
// =================================================================

/**
 * Create and export singleton instance
 * Ensures consistent presence state across the application
 */
const enhancedPresenceService = new EnhancedPresenceService();

export default enhancedPresenceService;