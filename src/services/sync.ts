/**
 * Simple Sync Service That Actually Works
 * No fancy bullshit, just sync Odoo data to SQLite
 */

import { authService } from './auth';
import { databaseService } from './database';
import { OdooModel, SyncStatus } from '../types';

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
   * Get available models to sync
   */
  getAvailableModels(): OdooModel[] {
    return [
      {
        name: 'res.partner',
        displayName: 'Contacts',
        description: 'Customers, vendors, and companies',
        enabled: true,
      },
      {
        name: 'sale.order',
        displayName: 'Sales Orders',
        description: 'Sales orders and quotations',
        enabled: true,
      },
      {
        name: 'crm.lead',
        displayName: 'CRM Leads',
        description: 'Sales leads and opportunities',
        enabled: true,
      },
      {
        name: 'hr.employee',
        displayName: 'Employees',
        description: 'Company employees and HR data',
        enabled: true,
      },
      {
        name: 'mail.activity',
        displayName: 'Activities',
        description: 'Tasks, reminders, and activities',
        enabled: true,
      },
      {
        name: 'mail.message',
        displayName: 'Messages',
        description: 'Chatter messages and communications',
        enabled: true,
        priority: 1, // High priority for chat
      },
      {
        name: 'discuss.channel',
        displayName: 'Chat Channels',
        description: 'Chat channels and conversations',
        enabled: true,
        priority: 1, // High priority for chat
      },

      {
        name: 'ir.attachment',
        displayName: 'Attachments',
        description: 'Files and document attachments',
        enabled: true,
      },
      {
        name: 'calendar.event',
        displayName: 'Calendar Events',
        description: 'Calendar events and meetings',
        enabled: true,
      },
      {
        name: 'res.users',
        displayName: 'Users',
        description: 'System users and authentication',
        enabled: true,
      },
      {
        name: 'product.product',
        displayName: 'Products',
        description: 'Product catalog and variants',
        enabled: true,
      },
      {
        name: 'product.template',
        displayName: 'Product Templates',
        description: 'Product templates and categories',
        enabled: true,
      },
      {
        name: 'account.move',
        displayName: 'Invoices',
        description: 'Invoices and accounting entries',
        enabled: true,
      },
      {
        name: 'stock.picking',
        displayName: 'Deliveries',
        description: 'Delivery orders and shipments',
        enabled: true,
      },
      {
        name: 'project.project',
        displayName: 'Projects',
        description: 'Project management',
        enabled: true,
      },
      {
        name: 'project.task',
        displayName: 'Project Tasks',
        description: 'Project tasks and milestones',
        enabled: true,
      },
      {
        name: 'helpdesk.ticket',
        displayName: 'Helpdesk Tickets',
        description: 'Support tickets and requests',
        enabled: true,
      },
      {
        name: 'helpdesk.team',
        displayName: 'Helpdesk Teams',
        description: 'Support team management (auto-detected fields)',
        enabled: true,
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
          const count = await client.searchCount(modelName);
          totalRecords += Math.min(count, 1000); // Limit to 1000 records per model
        } catch (error) {
          console.warn(`⚠️ Could not count records for ${modelName}:`, error.message);
        }
      }

      this.updateStatus({ totalRecords });

      // Sync each model
      let syncedRecords = 0;
      for (let i = 0; i < selectedModels.length; i++) {
        const modelName = selectedModels[i];
        
        this.updateStatus({
          currentModel: modelName,
          progress: Math.round((i / selectedModels.length) * 100),
        });

        try {
          console.log(`📥 Syncing ${modelName}...`);
          const records = await this.syncModel(modelName);
          syncedRecords += records;
          
          this.updateStatus({ syncedRecords });
          
        } catch (error) {
          console.error(`❌ Failed to sync ${modelName}:`, error.message);
          this.updateStatus({
            errors: [...this.currentStatus.errors, `${modelName}: ${error.message}`],
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
      console.error('❌ Sync failed:', error.message);

      // Check if we have cached data to fall back to
      const hasCached = await this.hasCachedData();
      const errorMessage = hasCached
        ? `Sync failed but cached data is available: ${error.message}`
        : `Sync failed: ${error.message}`;

      this.updateStatus({
        isRunning: false,
        errors: [...this.currentStatus.errors, errorMessage],
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

      // Fetch records (limit to 1000 for now)
      const records = await client.searchRead(modelName, [], fields, { limit: 1000 });

      if (records.length === 0) {
        console.log(`📭 No records found for ${modelName}`);
        return 0;
      }

      // Save to database
      await databaseService.saveRecords(tableName, records);

      console.log(`✅ Synced ${records.length} ${modelName} records`);
      return records.length;
    } catch (error) {
      console.error(`❌ Failed to sync ${modelName}:`, error.message);

      // Check for specific error types and provide helpful messages
      if (error.message.includes('You are not allowed to access')) {
        console.warn(`⚠️ Skipping ${modelName} - insufficient permissions (this is normal for some models)`);
      } else if (error.message.includes('Invalid field')) {
        console.warn(`⚠️ Skipping ${modelName} - field mapping issue`);
      } else if (error.message.includes('no such table')) {
        console.warn(`⚠️ Skipping ${modelName} - database table missing`);
      } else {
        console.warn(`⚠️ Skipping ${modelName} - sync error: ${error.message}`);
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
      console.warn(`⚠️ Field detection failed for ${modelName}, using fallback:`, error.message);
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
    // Safe fallback fields that exist in most models
    return ['name', 'create_date', 'write_date'];
  }

  /**
   * Clear field cache (useful for testing or when field structure changes)
   */
  clearFieldCache(): void {
    this.fieldCache = {};
    console.log('🗑️ Field cache cleared');
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
      console.warn('🌐 Connectivity test failed:', error.message);
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
