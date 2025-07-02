/**
 * Simple Sync Service That Actually Works
 * No fancy bullshit, just sync Odoo data to SQLite
 */

import { authService } from './auth';
import { databaseService } from './database';
import { OdooModel, SyncStatus, TimePeriod, TimePeriodOption, SyncSettings } from '../types';

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
    globalTimePeriod: '1month',
    modelOverrides: {
      'res.partner': 'all',      // Contacts - sync all
      'hr.employee': 'all',      // Employees - sync all
      'res.users': 'all',        // Users - sync all
      'product.product': 'all',  // Products - sync all
      'product.template': 'all', // Product templates - sync all
    }
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
    return { ...this.syncSettings };
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

      // RETURN ALL 844 MODELS - NO FILTERING
      console.log(`🔍 Found ${allModels.length} total models from ir.model`);

      // Convert ALL models to OdooModel format
      const allOdooModels = allModels.map(model => ({
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
    'account.move',
    'stock.picking',      // Deliveries
    'helpdesk.ticket',    // This one works fine
    'helpdesk.team',      // Now using auto-detection with proper table
    'project.project',    // Now using auto-detection
    'project.task'        // Now using auto-detection
  ]): Promise<void> {
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

      // Initialize database first (offline-first approach)
      await databaseService.initialize();

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
          const records = await this.syncModel(modelName);
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
  private async syncModel(modelName: string): Promise<number> {
    const client = authService.getClient();
    if (!client) throw new Error('No Odoo client available');

    try {
      // Get table name
      const tableName = this.getTableName(modelName);

      // Get fields to sync using auto-detection
      const fields = await this.getFieldsForModel(modelName);

      // Build domain based on incremental sync and time period settings
      const domain = await this.buildDomainForModel(modelName);

      // Fetch records with time filtering and smart limits
      const limit = this.getLimitForModel(modelName);

      // Set timeout based on model type - longer for problematic models
      const timeout = this.getTimeoutForModel(modelName);

      const records = await client.searchRead(modelName, domain, fields, {
        limit,
        order: 'write_date desc', // Get most recent records first
        timeout // Add timeout to prevent hanging
      });

      if (records.length === 0) {
        console.log(`📭 No records found for ${modelName}`);
        return 0;
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
   * Get table name for model
   */
  private getTableName(modelName: string): string {
    const tableMap: { [key: string]: string } = {
      'res.partner': 'contacts',
      'sale.order': 'sale_orders',
      'crm.lead': 'crm_leads',
      'hr.employee': 'employees',
      'mail.activity': 'activities',
      'mail.message': 'messages',
      'discuss.channel': 'chat_channels',
      'mail.thread': 'mail_threads',
      'ir.attachment': 'attachments',
      'calendar.event': 'calendar_events',
      'res.users': 'users',
      'product.product': 'products',
      'product.template': 'product_templates',
      'account.move': 'invoices',
      'stock.picking': 'deliveries',
      'project.project': 'projects',
      'project.task': 'project_tasks',
      'helpdesk.ticket': 'helpdesk_tickets',
      'helpdesk.team': 'helpdesk_teams',
    };

    return tableMap[modelName] || modelName.replace('.', '_');
  }

  /**
   * Get fields to sync for model using automatic field detection
   */
  private async getFieldsForModel(modelName: string): Promise<string[]> {
    // Check cache first
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

      // Define priority fields we want to sync (if they exist)
      const priorityFields = this.getPriorityFields(modelName);

      // Filter priority fields to only include ones that actually exist
      const validPriorityFields = priorityFields.filter(field => availableFieldNames.includes(field));

      // Add essential fields that should always be included if they exist
      const essentialFields = ['id', 'name', 'create_date', 'write_date', 'active'];
      const validEssentialFields = essentialFields.filter(field =>
        availableFieldNames.includes(field) && !validPriorityFields.includes(field)
      );

      // Combine priority and essential fields
      const fieldsToSync = [...validPriorityFields, ...validEssentialFields];

      // Cache the result
      this.fieldCache[modelName] = fieldsToSync;

      console.log(`✅ Selected ${fieldsToSync.length} fields for ${modelName}: ${fieldsToSync.slice(0, 5).join(', ')}${fieldsToSync.length > 5 ? '...' : ''}`);

      return fieldsToSync;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`⚠️ Field detection failed for ${modelName}, using fallback:`, errorMessage);
      const fallbackFields = this.getFallbackFields(modelName);
      this.fieldCache[modelName] = fallbackFields; // Cache fallback too
      return fallbackFields;
    }
  }

  /**
   * Get priority fields for each model (fields we prefer to sync if available)
   */
  private getPriorityFields(modelName: string): string[] {
    const priorityFieldMap: { [key: string]: string[] } = {
      'res.partner': [
        'name', 'email', 'phone', 'mobile', 'is_company', 'customer_rank', 'supplier_rank',
        'street', 'street2', 'city', 'state_id', 'zip', 'country_id', 'website',
        'category_id', 'user_id', 'company_id'
      ],
      'sale.order': [
        'name', 'partner_id', 'date_order', 'validity_date', 'user_id', 'team_id',
        'amount_untaxed', 'amount_tax', 'amount_total', 'currency_id', 'state',
        'invoice_status', 'delivery_status', 'note'
      ],
      'crm.lead': [
        'name', 'partner_name', 'email_from', 'phone', 'mobile', 'website',
        'street', 'street2', 'city', 'state_id', 'zip', 'country_id',
        'stage_id', 'user_id', 'team_id', 'company_id', 'source_id', 'medium_id', 'campaign_id',
        'referred', 'probability', 'expected_revenue', 'priority', 'type',
        'description', 'date_deadline', 'date_closed', 'date_conversion', 'lost_reason_id', 'tag_ids'
      ],
      'hr.employee': [
        'name', 'work_email', 'work_phone', 'job_title',
        'department_id', 'company_id', 'user_id'
      ],
      'mail.activity': [
        'summary', 'note', 'date_deadline', 'user_id', 'res_model', 'res_id',
        'res_name', 'activity_type_id', 'state'
      ],
      'mail.message': [
        'subject', 'body', 'date', 'author_id', 'email_from', 'message_type',
        'subtype_id', 'model', 'res_id', 'record_name', 'reply_to', 'attachment_ids'
      ],
      'discuss.channel': [
        'name', 'description', 'channel_type'
      ],
      'mail.thread': [
        'message_ids', 'message_follower_ids', 'message_partner_ids'
      ],
      'ir.attachment': [
        'name', 'description', 'res_model', 'res_id',
        'res_name', 'type', 'url', 'file_size', 'mimetype'
      ],
      'calendar.event': [
        'name', 'description', 'start', 'stop', 'allday', 'duration',
        'user_id', 'partner_ids', 'location', 'privacy', 'show_as'
      ],
      'res.users': [
        'name', 'login', 'email', 'partner_id', 'company_id', 'company_ids', 'groups_id'
      ],
      'product.product': [
        'name', 'default_code', 'barcode', 'product_tmpl_id', 'list_price',
        'standard_price', 'categ_id', 'uom_id'
      ],
      'product.template': [
        'name', 'description', 'list_price', 'standard_price', 'categ_id',
        'uom_id', 'uom_po_id', 'type', 'sale_ok', 'purchase_ok'
      ],
      'account.move': [
        'name', 'partner_id', 'invoice_date', 'invoice_date_due', 'amount_untaxed',
        'amount_tax', 'amount_total', 'currency_id', 'state', 'move_type', 'ref'
      ],
      'stock.picking': [
        'name', 'partner_id', 'picking_type_id', 'location_id', 'location_dest_id',
        'scheduled_date', 'date_done', 'state', 'origin', 'note'
      ],
      'project.project': [
        'name', 'description', 'user_id', 'partner_id', 'date_start', 'date',
        'privacy_visibility'
      ],
      'project.task': [
        'name', 'description', 'project_id', 'user_ids', 'partner_id',
        'date_deadline', 'stage_id', 'priority'
      ],
      'helpdesk.ticket': [
        'name', 'description', 'partner_id', 'user_id', 'team_id', 'stage_id',
        'priority', 'kanban_state', 'close_date'
      ],
      'helpdesk.team': [
        'name', 'description', 'member_ids', 'color', 'alias_name', 'alias_domain'
      ],
    };

    return priorityFieldMap[modelName] || [];
  }

  /**
   * Get fallback fields when auto-detection fails
   */
  private getFallbackFields(modelName: string): string[] {
    // Model-specific fallback fields
    const fallbackMap: { [key: string]: string[] } = {
      'mail.message': ['subject', 'body', 'date', 'author_id', 'create_date', 'write_date'],
      'mail.activity': ['summary', 'note', 'date_deadline', 'user_id', 'res_model', 'res_id', 'create_date', 'write_date'],
    };

    // Return model-specific fallback or safe default
    return fallbackMap[modelName] || ['name', 'create_date', 'write_date'];
  }

  /**
   * Clear field cache (useful for testing or when field structure changes)
   */
  clearFieldCache(): void {
    this.fieldCache = {};
    console.log('🗑️ Field cache cleared');
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

      // Accounting models
      'account.move',     // Invoices
      'account.payment',  // Payments

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

    return systemPatterns.some(pattern => modelName.startsWith(pattern));
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
   * Get sync configuration for a model
   */
  private getModelSyncConfig(modelName: string): { enabled: boolean; syncType: string } {
    // Master data models - sync all records
    if (['res.partner', 'res.users', 'hr.employee', 'product.template', 'product.product'].includes(modelName)) {
      return { enabled: true, syncType: 'all' };
    }

    // High priority transactional models
    if (['crm.lead', 'sale.order', 'helpdesk.ticket', 'mail.activity'].includes(modelName)) {
      return { enabled: true, syncType: 'time_based' };
    }

    // Chat models
    if (['discuss.channel', 'mail.message'].includes(modelName)) {
      return { enabled: true, syncType: 'time_based' };
    }

    // Large/optional models - disabled by default
    if (['ir.attachment', 'account.move', 'stock.picking'].includes(modelName)) {
      return { enabled: false, syncType: 'time_based' };
    }

    // Default for other models
    return { enabled: true, syncType: 'time_based' };
  }

  /**
   * Get display name for a model
   */
  private getDisplayName(modelName: string): string {
    const displayNames: { [key: string]: string } = {
      'res.partner': 'Contacts',
      'res.users': 'Users',
      'hr.employee': 'Employees',
      'crm.lead': 'CRM Leads',
      'sale.order': 'Sales Orders',
      'account.move': 'Invoices',
      'stock.picking': 'Deliveries',
      'project.project': 'Projects',
      'project.task': 'Project Tasks',
      'helpdesk.ticket': 'Helpdesk Tickets',
      'helpdesk.team': 'Helpdesk Teams',
      'mail.activity': 'Activities',
      'mail.message': 'Messages',
      'discuss.channel': 'Chat Channels',
      'calendar.event': 'Calendar Events',
      'ir.attachment': 'Attachments',
      'product.product': 'Products',
      'product.template': 'Product Templates',
    };

    return displayNames[modelName] || modelName.split('.').map(part =>
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
      'account.move': 'Invoices and accounting entries',
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
  private async buildDomainForModel(modelName: string): Promise<any[]> {
    try {
      // FIXED: Ensure database is initialized first
      await databaseService.initialize();

      // Get sync metadata to determine last sync
      const syncMetadata = await databaseService.getSyncMetadata(modelName);

    if (syncMetadata && syncMetadata.last_sync_write_date) {
      // INCREMENTAL: Only fetch records modified since last sync
      console.log(`🔄 INCREMENTAL: ${modelName} - fetching changes since ${syncMetadata.last_sync_write_date}`);
      return [['write_date', '>', syncMetadata.last_sync_write_date]];
    } else {
      // INITIAL SYNC: Use time period for first sync
      console.log(`📅 INITIAL SYNC: ${modelName} - using time period filter`);

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
