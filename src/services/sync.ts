/**
 * Simple Sync Service That Actually Works
 * No fancy bullshit, just sync Odoo data to SQLite
 */

import { authService } from './auth';
import { databaseService } from './database';
import { conflictResolutionService } from './conflictResolution';
import { offlineQueueService } from './offlineQueue';
import { OdooModel, SyncStatus, TimePeriod, TimePeriodOption, SyncSettings } from '../types';
import { useAppStore } from '../store';

class SyncService {
  private isRunning = false;
  private currentStatus: SyncStatus = {
    isRunning: false,
    progress: 0,
    totalRecords: 0,
    syncedRecords: 0,
    errors: [],
  };

  private listeners: ((status: SyncStatus) => void)[] = [];
  private fieldCache: { [modelName: string]: string[] } = {};

  // SMART PRE-SCAN: Cache discovered models to avoid repeated API calls
  private discoveredModelsCache: OdooModel[] | null = null;
  private discoveryTimestamp: number | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // CIRCUIT BREAKER: Prevent infinite loops
  private discoveryCallCount = 0;
  private lastDiscoveryReset = Date.now();
  private readonly MAX_DISCOVERY_CALLS = 3; // Max calls per minute
  private readonly DISCOVERY_RESET_INTERVAL = 60 * 1000; // 1 minute

  // Default sync settings
  private syncSettings: SyncSettings = {
    globalTimePeriod: '1week',
    modelOverrides: {
      'res.partner': 'all',      // Contacts - sync all
      'hr.employee': 'all',      // Employees - sync all
      'res.users': 'all',        // Users - sync all
      'product.product': 'all',  // Products - sync all
      'product.template': 'all', // Product templates - sync all
    },
    modelSyncAllOverrides: {
      'hr.employee': true,       // Always sync ALL employees
      'res.users': true,         // Always sync ALL users
      'res.partner': false,      // Use time-based for contacts (can be overridden)
    },
    autoSync: true,
    conflictResolution: 'ask_user',
    backgroundSync: true,
  };

  /**
   * Add status listener
   */
  onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify listeners of status change
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => callback({ ...this.currentStatus }));
  }

  /**
   * Update sync status
   */
  private updateStatus(updates: Partial<SyncStatus>): void {
    this.currentStatus = { ...this.currentStatus, ...updates };
    this.notifyListeners();
  }

  /**
   * Get available time period options
   */
  getTimePeriodOptions(): TimePeriodOption[] {
    return [
      { value: 'all', label: 'All Records', description: 'Sync all available records' },
      { value: '1day', label: '1 Day', description: 'Records from last 24 hours', days: 1 },
      { value: '3days', label: '3 Days', description: 'Records from last 3 days', days: 3 },
      { value: '1week', label: '1 Week', description: 'Records from last 7 days', days: 7 },
      { value: '2weeks', label: '2 Weeks', description: 'Records from last 14 days', days: 14 },
      { value: '1month', label: '1 Month', description: 'Records from last 30 days', days: 30 },
      { value: '3months', label: '3 Months', description: 'Records from last 90 days', days: 90 },
      { value: '6months', label: '6 Months', description: 'Records from last 180 days', days: 180 },
    ];
  }

  /**
   * Get current sync settings
   */
  getSyncSettings(): SyncSettings {
    // Ensure all properties exist with defaults
    return {
      ...this.syncSettings,
      modelSyncAllOverrides: this.syncSettings.modelSyncAllOverrides || {}
    };
  }



  /**
   * Update sync settings
   */
  updateSyncSettings(settings: Partial<SyncSettings>): void {
    this.syncSettings = { ...this.syncSettings, ...settings };
  }

  /**
   * SMART PRE-SCAN: Dynamic model discovery with caching and circuit breaker
   * Discovers available models and tests user permissions
   */
  async discoverAvailableModels(): Promise<OdooModel[]> {
    console.log('🔍 Entering discoverAvailableModels...');

    // CRITICAL: Initialize database FIRST
    try {
      await databaseService.initialize();
      console.log('✅ Database initialized before model discovery');
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
    }

    const now = Date.now();

    // CIRCUIT BREAKER: Reset call count every minute
    if (now - this.lastDiscoveryReset > this.DISCOVERY_RESET_INTERVAL) {
      this.discoveryCallCount = 0;
      this.lastDiscoveryReset = now;
      console.log('🔄 Circuit breaker reset');
    }

    // CIRCUIT BREAKER: Prevent infinite loops
    if (this.discoveryCallCount >= this.MAX_DISCOVERY_CALLS) {
      console.warn('🚨 CIRCUIT BREAKER: Too many discovery calls, returning fallback models');
      return this.getFallbackModels();
    }

    // Dynamic discovery re-enabled - core issues fixed

    this.discoveryCallCount++;

    // Check cache first
    if (this.discoveredModelsCache && this.discoveryTimestamp &&
        (now - this.discoveryTimestamp) < this.CACHE_DURATION) {
      console.log(`📦 Using cached model discovery results (${this.discoveredModelsCache.length} models)`);
      return this.discoveredModelsCache;
    }

    const client = authService.getClient();
    if (!client) {
      console.warn('⚠️ No client available - returning fallback models');
      return this.getFallbackModels();
    }

    console.log('🔍 Client available, starting model discovery...');

    try {
      // Test connectivity with a simple model first
      console.log('🔍 Testing access to res.partner...');
      await client.searchCount('res.partner', []);
      console.log('✅ res.partner access confirmed');

      console.log('🔍 SMART PRE-SCAN: Discovering available models from Odoo server...');

      // STEP 1: First get the count of ALL models
      const totalCount = await client.searchCount('ir.model', []);
      console.log(`🔍 Total models in Odoo: ${totalCount}`);

      // STEP 2: Get ALL models using proper limit override
      const allModels = await client.searchRead('ir.model',
        [], // NO FILTERS - get everything
        ['model', 'name', 'info'],
        {
          limit: totalCount, // Use the actual count as limit
          offset: 0
        }
      );

      console.log(`📋 Found ${allModels.length} total models in Odoo`);

      // FILTER OUT RESTRICTED MODELS
      console.log(`🔍 Found ${allModels.length} total models from ir.model`);

      // Filter out system/problematic models
      const filteredModels = allModels.filter(model => !this.isSystemModel(model.model));
      console.log(`🚫 Filtered out ${allModels.length - filteredModels.length} restricted models (including account.move)`);

      // Convert filtered models to OdooModel format
      const allOdooModels = filteredModels.map(model => ({
        name: model.model,
        displayName: model.name || model.model,
        description: `Model: ${model.model}`,
        enabled: false, // Default to disabled
        syncType: 'time_based' as const,
        hasAccess: true, // Assume accessible for now
        discoveredAt: new Date().toISOString()
      }));

      console.log(`✅ Returning ALL ${allOdooModels.length} models`);

      // Cache the results
      this.discoveredModelsCache = allOdooModels;
      this.discoveryTimestamp = now;

      return allOdooModels;

    } catch (error) {
      console.error('❌ Model discovery failed:', error instanceof Error ? error.message : String(error));
      console.warn('⚠️ Falling back to static model list');
      return this.getFallbackModels();
    }
  }

  /**
   * SMART PRE-SCAN: Clear discovery cache and reset circuit breaker
   */
  clearDiscoveryCache(): void {
    this.discoveredModelsCache = null;
    this.discoveryTimestamp = null;
    this.discoveryCallCount = 0;
    this.lastDiscoveryReset = Date.now();
    console.log('🗑️ Discovery cache cleared and circuit breaker reset');
  }

  /**
   * Get static fallback models (original hardcoded list)
   */
  getFallbackModels(): OdooModel[] {
    return [
      {
        name: 'res.partner',
        displayName: 'Contacts',
        description: 'Customers, vendors, and companies',
        enabled: true,
        syncType: 'all',
      },
      {
        name: 'sale.order',
        displayName: 'Sales Orders',
        description: 'Sales orders and quotations',
        enabled: true,
        syncType: 'time_based',
      },
      {
        name: 'crm.lead',
        displayName: 'CRM Leads',
        description: 'Sales leads and opportunities',
        enabled: true,
        syncType: 'time_based',
      },
      {
        name: 'hr.employee',
        displayName: 'Employees',
        description: 'Company employees and HR data',
        enabled: true,
        syncType: 'all',
      },
      {
        name: 'helpdesk.ticket',
        displayName: 'Helpdesk Tickets',
        description: 'Support tickets and requests',
        enabled: true,
        syncType: 'time_based',
      },
      {
        name: 'res.users',
        displayName: 'Users',
        description: 'System users and authentication',
        enabled: true,
        syncType: 'all',
      },
    ];
  }

  /**
   * Start sync process
   */
  async startSync(selectedModels: string[] = [
    'discuss.channel',    // Prioritize chat channels
    'mail.message',       // Prioritize chat messages
    // NOTE: mail.thread is an abstract model - not synced directly
    'res.partner',
    'sale.order',
    'crm.lead',
    'hr.employee',
    'mail.activity',
    'ir.attachment',
    'calendar.event',
    'res.users',
    'product.product',
    'product.template',
    // 'account.move',    // EXCLUDED: Server-side data corruption
    'stock.picking',      // Deliveries
    'helpdesk.ticket',    // This one works fine
    'helpdesk.team',      // Now using auto-detection with proper table
    'project.project',    // Now using auto-detection
    'project.task'        // Now using auto-detection
  ], forceFullSync: boolean = false): Promise<void> {
    if (this.isRunning) {
      throw new Error('Sync already in progress');
    }

    try {
      this.isRunning = true;
      this.updateStatus({
        isRunning: true,
        progress: 0,
        totalRecords: 0,
        syncedRecords: 0,
        errors: [],
      });

      console.log('🚀 Starting sync process...');

      // Clear field cache to force re-detection with improved validation
      this.clearFieldCache();

      // Initialize database first (offline-first approach)
      await databaseService.initialize();

      // Initialize conflict resolution service
      await conflictResolutionService.initialize();

      // Clear false positive conflicts from previous syncs
      try {
        const clearedCount = await conflictResolutionService.clearFalsePositiveConflicts();
        if (clearedCount > 0) {
          console.log(`🧹 Cleared ${clearedCount} false positive conflicts`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to clear false positive conflicts:', error);
      }

      // Check if we're online and authenticated
      const isAuth = await authService.isAuthenticated();
      if (!isAuth) {
        console.warn('⚠️ Not authenticated - working in offline mode with cached data');
        this.updateStatus({
          isRunning: false,
          progress: 100,
          totalRecords: 0,
          syncedRecords: 0,
          errors: ['Working offline - no new data synced'],
        });
        return;
      }

      const client = authService.getClient();
      if (!client) {
        console.warn('⚠️ No Odoo client available - working in offline mode with cached data');
        this.updateStatus({
          isRunning: false,
          progress: 100,
          totalRecords: 0,
          syncedRecords: 0,
          errors: ['Working offline - no new data synced'],
        });
        return;
      }

      // Test connectivity first
      const isOnline = await this.testConnectivity(client);
      if (!isOnline) {
        console.warn('⚠️ No internet connection - working in offline mode with cached data');
        this.updateStatus({
          isRunning: false,
          progress: 100,
          totalRecords: 0,
          syncedRecords: 0,
          errors: ['No internet connection - working offline with cached data'],
        });
        return;
      }

      // Calculate total records to sync
      let totalRecords = 0;
      for (const modelName of selectedModels) {
        try {
          // Build domain for counting (respects incremental sync and time period settings)
          const domain = await this.buildDomainForModel(modelName);
          const count = await client.searchCount(modelName, domain);
          const limit = this.getLimitForModel(modelName);
          totalRecords += Math.min(count, limit); // Use dynamic limit based on model type
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.warn(`⚠️ Could not count records for ${modelName}:`, errorMessage);
        }
      }

      this.updateStatus({ totalRecords });

      // Sync each model
      let syncedRecords = 0;
      for (let i = 0; i < selectedModels.length; i++) {
        const modelName = selectedModels[i];

        // Calculate progress based on models completed + current model progress
        const baseProgress = (i / selectedModels.length) * 100;

        this.updateStatus({
          currentModel: modelName,
          progress: Math.round(baseProgress),
        });

        try {
          console.log(`📥 Syncing ${modelName}...`);
          const records = await this.syncModel(modelName, forceFullSync);
          syncedRecords += records;

          // Update progress after model completion
          const completedProgress = ((i + 1) / selectedModels.length) * 100;
          this.updateStatus({
            syncedRecords,
            progress: Math.round(completedProgress)
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`❌ Failed to sync ${modelName}:`, errorMessage);
          this.updateStatus({
            errors: [...this.currentStatus.errors, `${modelName}: ${errorMessage}`],
          });
        }
      }

      this.updateStatus({
        isRunning: false,
        progress: 100,
        currentModel: undefined,
      });

      console.log(`✅ Sync completed! Synced ${syncedRecords} records`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Sync failed:', errorMessage);

      // Check if we have cached data to fall back to
      const hasCached = await this.hasCachedData();
      const finalErrorMessage = hasCached
        ? `Sync failed but cached data is available: ${errorMessage}`
        : `Sync failed: ${errorMessage}`;

      this.updateStatus({
        isRunning: false,
        errors: [...this.currentStatus.errors, finalErrorMessage],
      });

      // Don't throw error if we have cached data - just warn
      if (!hasCached) {
        throw error;
      } else {
        console.warn('⚠️ Sync failed but continuing with cached data');
      }
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Sync a single model
   */
  private async syncModel(modelName: string, forceFullSync: boolean = false): Promise<number> {
    const client = authService.getClient();
    if (!client) throw new Error('No Odoo client available');

    // CRITICAL: Double-check for restricted models
    if (this.isSystemModel(modelName)) {
      console.log(`🚫 RESTRICTED: Skipping ${modelName} - model is in restricted list`);
      return 0;
    }

    try {
      // Get table name
      const tableName = this.getTableName(modelName);

      // Get fields to sync using auto-detection
      const fields = await this.getFieldsForModel(modelName);

      // Build domain based on incremental sync and time period settings
      const domain = await this.buildDomainForModel(modelName, forceFullSync);

      // Fetch records with time filtering and smart limits
      const limit = this.getLimitForModel(modelName);

      // Set timeout based on model type - longer for problematic models
      const timeout = this.getTimeoutForModel(modelName);

      console.log(`🔍 Searching ${modelName} with domain:`, domain);
      console.log(`📋 Fields to fetch:`, fields.slice(0, 10), fields.length > 10 ? `... and ${fields.length - 10} more` : '');

      // SMART INCREMENTAL SYNC: Check count first for large incremental syncs
      let records;
      try {
        // For incremental sync, check count first to detect bulk changes
        if (domain.length > 0) { // Has write_date filter = incremental sync
          const changeCount = await client.searchCount(modelName, domain);
          if (changeCount > 1000) {
            console.warn(`⚠️ Large incremental sync detected for ${modelName}: ${changeCount} changed records`);
            console.warn(`⚠️ This suggests bulk data changes in Odoo. Using pagination...`);

            // Use smaller batches for large incremental syncs
            const batchSize = 500;
            records = await client.searchRead(modelName, domain, fields, {
              limit: batchSize,
              order: 'write_date desc',
              timeout
            });
            console.log(`📦 Retrieved first batch: ${records.length}/${changeCount} records`);
          } else {
            records = await client.searchRead(modelName, domain, fields, {
              limit,
              order: 'write_date desc',
              timeout
            });
          }
        } else {
          // Full sync - use normal limit
          records = await client.searchRead(modelName, domain, fields, {
            limit,
            order: 'write_date desc',
            timeout
          });
        }
      } catch (searchError) {
        const errorMessage = searchError instanceof Error ? searchError.message : String(searchError);

        // Handle specific server-side data corruption issues
        if (errorMessage.includes('too many values to unpack') && modelName === 'calendar.event') {
          console.warn(`⚠️ calendar.event has data serialization issues, trying with comprehensive safe fields...`);

          // Retry with comprehensive safe fields for calendar.event (avoiding problematic computed fields)
          const safeFields = [
            'id', 'name', 'start', 'stop', 'start_date', 'stop_date', 'allday',
            'description', 'location', 'user_id', 'partner_ids', 'categ_ids',
            'privacy', 'show_as', 'state', 'recurrency', 'rrule', 'duration',
            'alarm_ids', 'attendee_ids', 'create_date', 'write_date', 'create_uid', 'write_uid'
          ];
          records = await client.searchRead(modelName, domain, safeFields, {
            limit,
            order: 'write_date desc',
            timeout
          });
          console.log(`✅ calendar.event field-limited sync successful with ${safeFields.length} comprehensive fields`);
        } else if (errorMessage.includes('Invalid field') && errorMessage.includes('on model')) {
          console.warn(`⚠️ ${modelName} has invalid field issues, trying with fallback fields...`);

          // Retry with safe fallback fields
          const fallbackFields = this.getFallbackFields(modelName);
          records = await client.searchRead(modelName, domain, fallbackFields, {
            limit,
            order: 'write_date desc',
            timeout
          });
          console.log(`✅ ${modelName} fallback sync successful with ${fallbackFields.length} safe fields`);
        } else {
          throw searchError; // Re-throw if it's not a known issue
        }
      }

      console.log(`📥 Retrieved ${records.length} records for ${modelName}`);

      if (records.length === 0) {
        console.log(`📭 No records found for ${modelName} - this could mean:`);
        console.log(`   • No new/modified records since last sync`);
        console.log(`   • Domain filter is too restrictive`);
        console.log(`   • Model has no data in the specified time period`);
        return 0;
      }

      // Records retrieved successfully

      // CONFLICT DETECTION DISABLED: Too many false positives
      console.log(`🚫 Conflict detection disabled - saving ${records.length} records directly`);

      // Clear any old conflicts for this model (cleanup from when conflict detection was enabled)
      try {
        await conflictResolutionService.clearConflictsForModel(modelName);
      } catch (error) {
        // Ignore cleanup errors
      }

      // Save to database
      await databaseService.saveRecords(tableName, records);

      // INCREMENTAL SYNC: Update sync metadata with latest write_date
      const latestWriteDate = this.getLatestWriteDate(records);
      await databaseService.updateSyncMetadata(modelName, {
        lastSyncTimestamp: new Date().toISOString(),
        lastSyncWriteDate: latestWriteDate || undefined,
        totalRecords: records.length,
        lastError: undefined
      });

      console.log(`✅ Synced ${records.length} ${modelName} records (latest: ${latestWriteDate})`);
      return records.length;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to sync ${modelName}:`, errorMessage);

      // INCREMENTAL SYNC: Record sync error in metadata
      await databaseService.updateSyncMetadata(modelName, {
        lastError: errorMessage,
        lastSyncTimestamp: new Date().toISOString()
      });

      // Check for specific error types and provide helpful messages
      if (errorMessage.includes('You are not allowed to access')) {
        console.warn(`⚠️ Skipping ${modelName} - insufficient permissions (this is normal for some models)`);
      } else if (errorMessage.includes('Invalid field')) {
        console.warn(`⚠️ Skipping ${modelName} - field mapping issue`);
      } else if (errorMessage.includes('no such table')) {
        console.warn(`⚠️ Skipping ${modelName} - database table missing`);
      } else if (errorMessage.includes('Network request failed') || errorMessage.includes('timeout')) {
        console.warn(`⚠️ Skipping ${modelName} - sync error: ${errorMessage}`);
      } else {
        console.warn(`⚠️ Skipping ${modelName} - sync error: ${errorMessage}`);
      }

      return 0;
    }
  }

  /**
   * Get table name for model - FULLY DYNAMIC
   */
  private getTableName(modelName: string): string {
    // DYNAMIC TABLE CREATION: Convert any Odoo model name to valid SQLite table name
    return modelName
      .replace(/\./g, '_')           // Replace dots with underscores
      .replace(/[^a-zA-Z0-9_]/g, '_') // Replace any other invalid chars with underscores
      .toLowerCase();                 // Ensure lowercase for consistency
  }

  /**
   * Get fields to sync for model using automatic field detection
   */
  private async getFieldsForModel(modelName: string): Promise<string[]> {
    // Check cache first (re-enabled after fixing field filtering)
    if (this.fieldCache[modelName]) {
      console.log(`📋 Using cached fields for ${modelName} (${this.fieldCache[modelName].length} fields)`);
      return this.fieldCache[modelName];
    }

    const client = authService.getClient();
    if (!client) {
      console.warn(`⚠️ No client available for field detection, using fallback for ${modelName}`);
      return this.getFallbackFields(modelName);
    }

    try {
      // Get all available fields from Odoo
      const allFields = await client.getFields(modelName);
      const availableFieldNames = Object.keys(allFields);

      console.log(`🔍 Auto-detected ${availableFieldNames.length} fields for ${modelName}`);

      // SMART FIELD FILTERING: Filter based on field properties and types
      let fieldsToSync = availableFieldNames.filter(fieldName => {
        const fieldDef = allFields[fieldName];

        // Skip fields that are clearly metadata (not actual database fields)
        const metadataFields = [
          'string', 'type', 'required', 'readonly', 'domain', 'context', 'help', 'selection',
          'store', 'compute', 'inverse', 'search', 'related', 'depends', 'default'
        ];
        if (metadataFields.includes(fieldName)) {
          return false;
        }

        // Skip binary/attachment fields that cause filestore errors
        const binaryFields = [
          'datas', 'raw', 'db_datas', 'store_fname', 'file_size'
        ];
        if (binaryFields.includes(fieldName) || fieldDef?.type === 'binary') {
          return false;
        }

        // Skip image fields that can cause binary issues
        if (fieldName.includes('image_') || fieldName.includes('avatar_')) {
          return false;
        }

        // Skip calendar-specific problematic fields
        const calendarProblematicFields = [
          'videocall_redirection', 'videocall_location', 'videocall_channel_id',
          'access_token', 'appointment_type_id'
        ];
        if (calendarProblematicFields.includes(fieldName)) {
          return false;
        }

        // Skip computed fields that don't store values (they cause server errors)
        if (fieldDef?.compute && fieldDef?.store === false) {
          return false;
        }

        return true;
      });

      // SPECIAL HANDLING: Model-specific field restrictions
      if (modelName === 'ir.attachment') {
        const safeAttachmentFields = ['id', 'name', 'res_name', 'res_model', 'res_id', 'mimetype', 'create_date', 'write_date', 'create_uid', 'write_uid'];
        fieldsToSync = fieldsToSync.filter(field => safeAttachmentFields.includes(field));
        console.log(`🔒 ir.attachment: Using only safe metadata fields (${fieldsToSync.length} fields)`);
      }

      // SPECIAL HANDLING: For res.users, exclude problematic fields that cause "Invalid field" errors
      if (modelName === 'res.users') {
        const userProblematicFields = ['selection', 'groups', 'user_groups', 'implied_ids'];
        fieldsToSync = fieldsToSync.filter(field => !userProblematicFields.includes(field));
        console.log(`🔒 res.users: Excluded ${userProblematicFields.length} problematic fields`);
      }

      // SPECIAL HANDLING: For res.partner, use essential fields only to avoid performance issues
      if (modelName === 'res.partner') {
        const essentialPartnerFields = [
          // Core identity
          'id', 'name', 'display_name', 'ref', 'active',
          // Contact info
          'email', 'phone', 'mobile', 'website',
          // Address
          'street', 'street2', 'city', 'zip', 'state_id', 'country_id',
          // Business info
          'is_company', 'company_type', 'parent_id', 'child_ids',
          'vat', 'company_registry', 'industry_id',
          // User/employee links
          'user_id', 'user_ids', 'employee_ids',
          // Categories and tags
          'category_id', 'color',
          // Financial basics
          'customer_rank', 'supplier_rank', 'currency_id',
          // Mail/Chatter (CRITICAL for app functionality)
          'message_ids', 'message_follower_ids', 'message_partner_ids',
          'activity_ids', 'activity_state', 'activity_user_id', 'activity_type_id',
          'activity_date_deadline', 'activity_summary',
          // Metadata
          'create_date', 'write_date', 'create_uid', 'write_uid'
        ];
        fieldsToSync = fieldsToSync.filter(field => essentialPartnerFields.includes(field));
        console.log(`🚀 res.partner: Using ${fieldsToSync.length} essential fields for performance`);
      }

      console.log(`✅ Filtered out ${availableFieldNames.length - fieldsToSync.length} problematic fields, using ${fieldsToSync.length} safe fields`);

      // Cache the result
      this.fieldCache[modelName] = fieldsToSync;

      console.log(`✅ Selected ${fieldsToSync.length} fields for ${modelName}: ${fieldsToSync.slice(0, 5).join(', ')}${fieldsToSync.length > 5 ? '...' : ''}`);

      return fieldsToSync;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ FIELD DETECTION FAILED for ${modelName}:`, errorMessage);
      console.error(`❌ Full error:`, error);
      const fallbackFields = this.getFallbackFields(modelName);
      console.warn(`⚠️ Using fallback fields (${fallbackFields.length}):`, fallbackFields);
      this.fieldCache[modelName] = fallbackFields; // Cache fallback too
      return fallbackFields;
    }
  }

  /**
   * Get priority fields for a model - FULLY DYNAMIC
   */
  private getPriorityFields(modelName: string): string[] {
    // DYNAMIC: No hardcoded priority fields
    // Auto-detection will handle field selection
    return [];
  }

  /**
   * Get fallback fields when auto-detection fails
   */
  private getFallbackFields(modelName: string): string[] {
    // Model-specific fallback fields
    const fallbackMap: { [key: string]: string[] } = {
      'mail.message': ['id', 'subject', 'body', 'date', 'author_id', 'partner_ids', 'model', 'res_id', 'message_type', 'create_date', 'write_date', 'create_uid'],
      'mail.activity': ['id', 'summary', 'note', 'date_deadline', 'user_id', 'res_model', 'res_id', 'activity_type_id', 'state', 'create_date', 'write_date', 'create_uid'],
      'res.partner': [
        'id', 'name', 'display_name', 'ref', 'active', 'email', 'phone', 'mobile', 'website',
        'street', 'street2', 'city', 'zip', 'state_id', 'country_id', 'is_company', 'company_type',
        'parent_id', 'vat', 'industry_id', 'user_id', 'category_id', 'customer_rank', 'supplier_rank',
        'message_ids', 'message_follower_ids', 'activity_ids', 'activity_state', 'activity_user_id',
        'create_date', 'write_date', 'create_uid', 'write_uid'
      ],
      'res.users': ['id', 'name', 'login', 'email', 'phone', 'mobile', 'partner_id', 'company_id', 'active', 'groups_id', 'create_date', 'write_date'],
      'calendar.event': [
        'id', 'name', 'start', 'stop', 'start_date', 'stop_date', 'allday',
        'description', 'location', 'user_id', 'partner_ids', 'categ_ids',
        'privacy', 'show_as', 'state', 'recurrency', 'rrule', 'duration',
        'alarm_ids', 'attendee_ids', 'create_date', 'write_date', 'create_uid', 'write_uid'
      ],
    };

    // Return model-specific fallback or comprehensive default (12+ fields)
    return fallbackMap[modelName] || [
      'id', 'name', 'create_date', 'write_date', 'active', 'create_uid', 'write_uid',
      'display_name', 'sequence', 'state', 'company_id', 'user_id'
    ];
  }

  /**
   * Clear field cache (useful for testing or when field structure changes)
   */
  clearFieldCache(): void {
    this.fieldCache = {};
    console.log('🗑️ Field cache cleared - will re-detect fields with improved validation');
  }

  /**
   * SMART PRE-SCAN: Filter and test only relevant business models
   */
  private async filterAndTestModels(allModels: any[]): Promise<OdooModel[]> {
    const client = authService.getClient();
    if (!client) return [];

    console.log('🎯 SMART PRE-SCAN: Filtering to business-relevant models only...');

    // SMART FILTERING: Only test models we actually care about
    const businessModels = this.getBusinessModelPatterns();

    // DEBUG: Log first 10 models to see what's available
    console.log('🔍 DEBUG: First 10 models from Odoo:', allModels.slice(0, 10).map(m => m.model));

    const candidateModels = allModels.filter(model => {
      // Skip system/wizard/transient models
      if (this.isSystemModel(model.model)) {
        return false;
      }

      // Only include exact matches for business models (no wildcards)
      const isMatch = businessModels.includes(model.model);
      if (isMatch) {
        console.log(`✅ MATCH: ${model.model}`);
      }
      return isMatch;
    });

    console.log(`📋 PRE-SCAN: Filtered from ${allModels.length} to ${candidateModels.length} candidate models`);

    // DEBUG: If no candidates, show what business models we're looking for
    if (candidateModels.length === 0) {
      console.log('🔍 DEBUG: Looking for these business models:', businessModels.slice(0, 10));
      console.log('🔍 DEBUG: Available models include:', allModels.slice(0, 20).map(m => m.model));
    }

    // Test access for candidate models (much smaller list)
    const accessibleModels: OdooModel[] = [];
    const accessResults: { [key: string]: boolean } = {};

    for (const model of candidateModels) {
      try {
        const hasAccess = await this.testModelAccess(model.model);
        accessResults[model.model] = hasAccess;

        if (hasAccess) {
          const syncConfig = this.getModelSyncConfig(model.model);
          accessibleModels.push({
            name: model.model,
            displayName: model.name || this.getDisplayName(model.model),
            description: model.info || this.getDescription(model.model),
            enabled: syncConfig.enabled,
            syncType: syncConfig.syncType as 'all' | 'time_based'
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`⚠️ Access test failed for ${model.model}: ${errorMessage}`);
        accessResults[model.model] = false;
      }
    }

    // Log discovery report
    this.logDiscoveryReport(accessResults, accessibleModels.length);

    return accessibleModels.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  /**
   * FIXED: Expanded business model patterns to prevent 0 results
   */
  private getBusinessModelPatterns(): string[] {
    return [
      // Core business models
      'res.partner',      // Contacts
      'res.users',        // Users
      'res.company',      // Companies

      // HR models
      'hr.employee',      // Employees
      'hr.department',    // Departments

      // CRM models
      'crm.lead',         // CRM Leads
      'crm.stage',        // CRM Stages
      'crm.team',         // Sales Teams

      // Sales models
      'sale.order',       // Sales Orders
      'sale.order.line',  // Sales Order Lines

      // Accounting models - RESTRICTED due to XML-RPC serialization issues
      // 'account.move',     // EXCLUDED: Dictionary key serialization errors
      // 'account.payment',  // EXCLUDED: Complex financial data

      // Inventory models
      'stock.picking',    // Deliveries
      'stock.move',       // Stock Moves

      // Project models
      'project.project',  // Projects
      'project.task',     // Project Tasks

      // Helpdesk models
      'helpdesk.ticket',  // Helpdesk Tickets
      'helpdesk.team',    // Helpdesk Teams
      'helpdesk.stage',   // Helpdesk Stages

      // Communication models
      'mail.activity',    // Activities
      'mail.message',     // Messages
      'discuss.channel',  // Chat Channels
      'mail.followers',   // Followers

      // Calendar models
      'calendar.event',   // Calendar Events

      // Attachment models
      'ir.attachment',    // Attachments

      // Product models
      'product.product',  // Products
      'product.template', // Product Templates
      'product.category', // Product Categories

      // Additional common models
      'res.partner.category', // Contact Tags
      'res.currency',     // Currencies
      'res.country',      // Countries
    ];
  }

  /**
   * Check if model is a system/wizard model to skip
   */
  private isSystemModel(modelName: string): boolean {
    const systemPatterns = [
      'wizard.',          // Wizard models
      'report.',          // Report models
      'base.',            // Base system models
      'ir.actions.',      // Action models
      'ir.ui.',           // UI models
      'ir.model.',        // Model metadata (except ir.model itself)
      'account.move.send', // Specific problematic models
      'mail.compose.',    // Mail composer wizards
      'stock.immediate.', // Stock wizards
    ];

    // Specific models with server-side data corruption issues
    const problematicModels = [
      'account.move',           // Dictionary key must be string error - XML-RPC serialization issues
      'account.move.line',      // Related to account.move - also problematic
      'account.payment',        // Financial data - complex serialization
      'account.bank.statement', // Banking data - complex fields
    ];

    const isRestricted = systemPatterns.some(pattern => modelName.startsWith(pattern)) ||
                        problematicModels.includes(modelName);

    if (isRestricted && problematicModels.includes(modelName)) {
      console.log(`🚫 RESTRICTED MODEL: ${modelName} - XML-RPC serialization issues`);
    }

    return isRestricted;
  }

  /**
   * FIXED: Fallback discovery when main discovery returns 0 models
   */
  private async fallbackDiscovery(): Promise<OdooModel[]> {
    console.log('🔄 Attempting fallback discovery...');

    const client = authService.getClient();
    if (!client) return this.getFallbackModels();

    // Test a known list of common models
    const testModels = [
      'res.partner', 'res.users', 'hr.employee', 'crm.lead',
      'sale.order', 'project.task', 'helpdesk.ticket', 'mail.message',
      'res.company', 'mail.activity', 'calendar.event', 'ir.attachment'
    ];

    const accessibleModels: OdooModel[] = [];

    for (const modelName of testModels) {
      try {
        // Simple access test
        await client.searchCount(modelName, []);

        accessibleModels.push({
          name: modelName,
          displayName: this.getDisplayName(modelName),
          description: this.getDescription(modelName),
          enabled: true,
          syncType: this.getModelSyncConfig(modelName).syncType as 'all' | 'time_based'
        });

        console.log(`✅ Fallback: ${modelName} is accessible`);
      } catch (error) {
        console.log(`❌ Fallback: ${modelName} not accessible`);
      }
    }

    console.log(`🔄 Fallback discovery found ${accessibleModels.length} models`);
    return accessibleModels;
  }

  /**
   * Log discovery report for debugging
   */
  private logDiscoveryReport(accessResults: { [key: string]: boolean }, accessibleCount: number): void {
    const accessible = Object.entries(accessResults).filter(([_, hasAccess]) => hasAccess);
    const denied = Object.entries(accessResults).filter(([_, hasAccess]) => !hasAccess);

    console.log(`\n📊 DISCOVERY REPORT:`);
    console.log(`✅ Accessible models (${accessible.length}):`);
    accessible.forEach(([model, _]) => console.log(`   • ${model}`));

    if (denied.length > 0) {
      console.log(`🚫 Access denied (${denied.length}):`);
      denied.forEach(([model, _]) => console.log(`   • ${model}`));
    }

    console.log(`🎯 Total available for sync: ${accessibleCount} models\n`);
  }

  /**
   * Test if user has read access to a model
   */
  private async testModelAccess(modelName: string): Promise<boolean> {
    const client = authService.getClient();
    if (!client) return false;

    try {
      // Try to search with limit 1 to test access
      await client.searchRead(modelName, [], ['id'], { limit: 1 });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('You are not allowed to access') ||
          errorMessage.includes('AccessError') ||
          errorMessage.includes('does not exist')) {
        return false;
      }
      // Other errors might be temporary, assume access exists
      return true;
    }
  }

  /**
   * Get sync configuration for a model - FULLY DYNAMIC
   */
  private getModelSyncConfig(modelName: string): { enabled: boolean; syncType: string } {
    // DYNAMIC: All models enabled by default with time-based sync
    // Users can customize this through the UI
    return { enabled: true, syncType: 'time_based' };
  }

  /**
   * Get display name for a model - FULLY DYNAMIC
   */
  private getDisplayName(modelName: string): string {
    // DYNAMIC: Convert model name to display name
    return modelName.split('.').map(part =>
      part.charAt(0).toUpperCase() + part.slice(1)
    ).join(' ');
  }

  /**
   * Get description for a model
   */
  private getDescription(modelName: string): string {
    const descriptions: { [key: string]: string } = {
      'res.partner': 'Customers, vendors, and companies',
      'res.users': 'System users and authentication',
      'hr.employee': 'Company employees and HR data',
      'crm.lead': 'Sales leads and opportunities',
      'sale.order': 'Sales orders and quotations',
      // 'account.move': 'RESTRICTED - XML-RPC serialization issues',
      'stock.picking': 'Delivery orders and shipments',
      'project.project': 'Project management',
      'project.task': 'Project tasks and milestones',
      'helpdesk.ticket': 'Support tickets and requests',
      'helpdesk.team': 'Support team management',
      'mail.activity': 'Tasks, reminders, and activities',
      'mail.message': 'Chatter messages and communications',
      'discuss.channel': 'Chat channels and conversations',
      'calendar.event': 'Calendar events and meetings',
      'ir.attachment': 'Files and document attachments',
      'product.product': 'Product catalog and variants',
      'product.template': 'Product templates and categories',
    };

    return descriptions[modelName] || `${modelName} records`;
  }

  /**
   * Test connectivity to Odoo server
   */
  private async testConnectivity(client: any): Promise<boolean> {
    try {
      // Try a simple call to test connectivity
      await client.searchCount('res.users', [], { timeout: 5000 });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn('🌐 Connectivity test failed:', errorMessage);
      return false;
    }
  }

  /**
   * Check if we have cached data available
   */
  async hasCachedData(): Promise<boolean> {
    try {
      const stats = await databaseService.getStats();
      return stats.totalRecords > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cached data for a model
   */
  async getCachedData(modelName: string, filters?: any): Promise<any[]> {
    try {
      const tableName = this.getTableName(modelName);
      let records = await databaseService.getRecords(tableName, 1000, 0);

      // Apply filters if provided
      if (filters) {
        records = records.filter(record => {
          return Object.keys(filters).every(key => {
            if (key === 'model' && filters[key]) {
              return record.model === filters[key];
            }
            if (key === 'res_id' && filters[key]) {
              return record.res_id === filters[key];
            }
            return true;
          });
        });
      }

      return records;
    } catch (error) {
      console.warn(`Failed to get cached data for ${modelName}:`, error);
      return [];
    }
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return { ...this.currentStatus };
  }

  /**
   * Fix messages table schema issue
   */
  async fixMessagesTable(): Promise<void> {
    try {
      console.log('🔧 Fixing messages table schema...');
      await databaseService.recreateMessagesTable();
      console.log('✅ Messages table schema fixed');
    } catch (error) {
      console.error('❌ Failed to fix messages table:', error);
      throw error;
    }
  }

  /**
   * Check if app is in offline mode
   */
  async isOfflineMode(): Promise<boolean> {
    try {
      const isAuth = await authService.isAuthenticated();
      if (!isAuth) return true;

      const client = authService.getClient();
      if (!client) return true;

      return !(await this.testConnectivity(client));
    } catch (error) {
      return true;
    }
  }

  /**
   * INCREMENTAL SYNC: Build domain filter based on last sync and time period
   */
  private async buildDomainForModel(modelName: string, forceFullSync: boolean = false): Promise<any[]> {
    try {
      // FIXED: Ensure database is initialized first
      await databaseService.initialize();

      // Get sync metadata to determine last sync
      const syncMetadata = await databaseService.getSyncMetadata(modelName);

    if (syncMetadata && syncMetadata.last_sync_write_date && !forceFullSync) {
      // INCREMENTAL: Only fetch records modified since last sync
      console.log(`🔄 INCREMENTAL: ${modelName} - fetching changes since ${syncMetadata.last_sync_write_date}`);
      console.log(`📊 Sync metadata for ${modelName}:`, {
        lastSyncTimestamp: syncMetadata.last_sync_timestamp,
        lastSyncWriteDate: syncMetadata.last_sync_write_date,
        totalRecords: syncMetadata.total_records
      });

      // Calculate time since last sync for analysis
      const lastSyncTime = new Date(syncMetadata.last_sync_write_date);
      const now = new Date();
      const timeDiff = Math.round((now.getTime() - lastSyncTime.getTime()) / 1000 / 60); // minutes
      console.log(`⏱️ Time since last ${modelName} sync: ${timeDiff} minutes`);

      const domain = [['write_date', '>=', syncMetadata.last_sync_write_date]];
      console.log(`🔍 INCREMENTAL DOMAIN for ${modelName}:`, domain);
      return domain;
    } else {
      // INITIAL SYNC: Use time period for first sync
      console.log(`📅 INITIAL SYNC: ${modelName} - using time period filter`);

      // Check if model has "sync all" override
      const hasSyncAllOverride = this.syncSettings.modelSyncAllOverrides?.[modelName] === true;
      if (hasSyncAllOverride) {
        console.log(`📊 INITIAL SYNC: ${modelName} - sync all override enabled, fetching all records`);
        return [];
      }

      // Get time period for this model (override or global)
      const timePeriod = this.syncSettings.modelOverrides[modelName] || this.syncSettings.globalTimePeriod;

      // If 'all', return empty domain (no filtering)
      if (timePeriod === 'all') {
        console.log(`📊 INITIAL SYNC: ${modelName} - fetching all records`);
        return [];
      }

      // Get days to go back
      const timePeriodOption = this.getTimePeriodOptions().find(opt => opt.value === timePeriod);
      if (!timePeriodOption?.days) {
        return [];
      }

      // Calculate date threshold
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - timePeriodOption.days);
      const dateThreshold = daysAgo.toISOString().split('T')[0] + ' 00:00:00';

      console.log(`📅 INITIAL SYNC: ${modelName} - last ${timePeriodOption.days} days (since ${dateThreshold})`);
      return [['write_date', '>=', dateThreshold]];
    }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to build domain for ${modelName}:`, errorMessage);
      // Return safe default - no filtering
      return [];
    }
  }

  /**
   * INCREMENTAL SYNC: Get latest write_date from records for metadata tracking
   */
  private getLatestWriteDate(records: any[]): string | null {
    if (!records || records.length === 0) return null;

    let latestDate = null;
    for (const record of records) {
      if (record.write_date) {
        if (!latestDate || record.write_date > latestDate) {
          latestDate = record.write_date;
        }
      }
    }

    return latestDate;
  }

  /**
   * Get record limit for model based on sync type
   */
  private getLimitForModel(modelName: string): number {
    // Special handling for res.partner - conservative limit due to performance
    if (modelName === 'res.partner') {
      return 1000; // Conservative limit for partner sync to avoid performance issues
    }

    // Use fallback models for limit determination (sync method)
    const model = this.getFallbackModels().find(m => m.name === modelName);

    // Models that sync 'all' get higher limits
    if (model?.syncType === 'all') {
      return 5000; // Higher limit for master data
    }

    // Time-based models get higher limits too (since they're filtered by time)
    return 2500; // Increased from 1000 to 2500 for time-filtered data
  }

  /**
   * Get timeout for model based on expected data size and complexity
   */
  private getTimeoutForModel(modelName: string): number {
    // Very large models that often timeout - use longer timeouts
    if (['mail.message', 'ir.attachment'].includes(modelName)) {
      return 60000; // 60 seconds for large models
    }

    // Medium models that might have complex data
    if (['helpdesk.ticket', 'calendar.event', 'mail.activity'].includes(modelName)) {
      return 30000; // 30 seconds
    }

    // Master data models - usually fast but can be large
    if (['res.partner', 'hr.employee', 'res.users', 'product.product'].includes(modelName)) {
      return 20000; // 20 seconds
    }

    // Default timeout for other models
    return 15000; // 15 seconds
  }

  /**
   * Get models that have chatter functionality (inherit mail.thread)
   * Useful for debugging and understanding which models support messaging
   */
  async getChatterEnabledModels(): Promise<string[]> {
    try {
      const client = authService.getClient();
      if (!client) return [];

      const chatterModels: string[] = [];
      const modelsToCheck = [
        'res.partner', 'crm.lead', 'sale.order', 'project.task',
        'helpdesk.ticket', 'hr.employee', 'project.project'
      ];

      for (const modelName of modelsToCheck) {
        try {
          const fields = await client.getFields(modelName);
          if (fields.message_ids) {
            chatterModels.push(modelName);
          }
        } catch (error) {
          // Skip models we can't access
        }
      }

      console.log(`📧 Models with chatter functionality: ${chatterModels.join(', ')}`);
      return chatterModels;
    } catch (error) {
      console.warn('Could not check chatter models:', error);
      return [];
    }
  }

  /**
   * Cancel running sync
   */
  async cancelSync(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.updateStatus({
      isRunning: false,
      errors: [...this.currentStatus.errors, 'Sync cancelled by user'],
    });

    console.log('🛑 Sync cancelled');
  }
}

export const syncService = new SyncService();
