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
      },
      {
        name: 'mail.thread',
        displayName: 'Mail Threads',
        description: 'Message threads and conversations',
        enabled: true,
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
        enabled: false,
      },
      {
        name: 'product.template',
        displayName: 'Product Templates',
        description: 'Product templates and categories',
        enabled: false,
      },
      {
        name: 'account.move',
        displayName: 'Invoices',
        description: 'Invoices and accounting entries',
        enabled: false,
      },
      {
        name: 'stock.picking',
        displayName: 'Deliveries',
        description: 'Delivery orders and shipments',
        enabled: false,
      },
      {
        name: 'project.project',
        displayName: 'Projects',
        description: 'Project management',
        enabled: false,
      },
      {
        name: 'project.task',
        displayName: 'Project Tasks',
        description: 'Project tasks and milestones',
        enabled: false,
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
        description: 'Support team management',
        enabled: true,
      },
    ];
  }

  /**
   * Start sync process
   */
  async startSync(selectedModels: string[] = [
    'res.partner',
    'sale.order',
    'crm.lead',
    'hr.employee',
    'mail.activity',
    'mail.message',
    'ir.attachment',
    'calendar.event',
    'res.users',
    'helpdesk.ticket',
    'helpdesk.team'
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

      // Check authentication
      const isAuth = await authService.isAuthenticated();
      if (!isAuth) {
        throw new Error('Not authenticated');
      }

      const client = authService.getClient();
      if (!client) {
        throw new Error('No Odoo client available');
      }

      // Initialize database
      await databaseService.initialize();

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
      this.updateStatus({
        isRunning: false,
        errors: [...this.currentStatus.errors, error.message],
      });
      throw error;
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

    // Get table name
    const tableName = this.getTableName(modelName);

    // Get fields to sync
    const fields = this.getFieldsForModel(modelName);

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
   * Get fields to sync for model
   */
  private getFieldsForModel(modelName: string): string[] {
    const fieldMap: { [key: string]: string[] } = {
      'res.partner': [
        'name', 'email', 'phone', 'mobile', 'is_company', 'customer_rank', 'supplier_rank',
        'street', 'street2', 'city', 'state_id', 'zip', 'country_id', 'website',
        'category_id', 'user_id', 'company_id', 'active', 'create_date', 'write_date'
      ],
      'sale.order': [
        'name', 'partner_id', 'date_order', 'validity_date', 'user_id', 'team_id',
        'amount_untaxed', 'amount_tax', 'amount_total', 'currency_id', 'state',
        'invoice_status', 'delivery_status', 'note', 'create_date', 'write_date'
      ],
      'crm.lead': [
        'name', 'partner_name', 'email_from', 'phone', 'mobile', 'website',
        'street', 'street2', 'city', 'state_id', 'zip', 'country_id',
        'stage_id', 'user_id', 'team_id', 'company_id', 'source_id', 'medium_id', 'campaign_id',
        'referred', 'probability', 'expected_revenue', 'priority', 'type', 'active',
        'description', 'create_date', 'write_date', 'date_deadline', 'date_closed',
        'date_conversion', 'lost_reason_id', 'tag_ids'
      ],
      'hr.employee': [
        'name', 'work_email', 'work_phone', 'job_title',
        'department_id', 'company_id', 'user_id',
        'active', 'create_date', 'write_date'
      ],
      'mail.activity': [
        'summary', 'note', 'date_deadline', 'user_id', 'res_model', 'res_id',
        'res_name', 'activity_type_id', 'state', 'create_date', 'write_date'
      ],
      'mail.message': [
        'subject', 'body', 'date', 'author_id', 'email_from', 'message_type',
        'subtype_id', 'model', 'res_id', 'record_name', 'reply_to',
        'attachment_ids', 'create_date', 'write_date'
      ],
      'mail.thread': [
        'message_ids', 'message_follower_ids', 'message_partner_ids',
        'create_date', 'write_date'
      ],
      'ir.attachment': [
        'name', 'datas_fname', 'description', 'res_model', 'res_id',
        'res_name', 'type', 'url', 'file_size', 'mimetype',
        'create_date', 'write_date'
      ],
      'calendar.event': [
        'name', 'description', 'start', 'stop', 'allday', 'duration',
        'user_id', 'partner_ids', 'location', 'privacy', 'show_as',
        'state', 'create_date', 'write_date'
      ],
      'res.users': [
        'name', 'login', 'email', 'partner_id', 'company_id', 'company_ids',
        'groups_id', 'active', 'create_date', 'write_date'
      ],
      'product.product': [
        'name', 'default_code', 'barcode', 'product_tmpl_id', 'list_price',
        'standard_price', 'categ_id', 'uom_id', 'active', 'create_date', 'write_date'
      ],
      'product.template': [
        'name', 'description', 'list_price', 'standard_price', 'categ_id',
        'uom_id', 'uom_po_id', 'type', 'sale_ok', 'purchase_ok',
        'active', 'create_date', 'write_date'
      ],
      'account.move': [
        'name', 'partner_id', 'invoice_date', 'invoice_date_due', 'amount_untaxed',
        'amount_tax', 'amount_total', 'currency_id', 'state', 'move_type',
        'ref', 'create_date', 'write_date'
      ],
      'stock.picking': [
        'name', 'partner_id', 'picking_type_id', 'location_id', 'location_dest_id',
        'scheduled_date', 'date_done', 'state', 'origin', 'note',
        'create_date', 'write_date'
      ],
      'project.project': [
        'name', 'description', 'user_id', 'partner_id', 'date_start', 'date',
        'state', 'privacy_visibility', 'active', 'create_date', 'write_date'
      ],
      'project.task': [
        'name', 'description', 'project_id', 'user_id', 'partner_id',
        'date_deadline', 'stage_id', 'priority', 'active', 'create_date', 'write_date'
      ],
      'helpdesk.ticket': [
        'name', 'description', 'partner_id', 'user_id', 'team_id', 'stage_id',
        'priority', 'kanban_state', 'active', 'create_date', 'write_date', 'close_date'
      ],
      'helpdesk.team': [
        'name', 'description', 'user_id', 'member_ids', 'active', 'color',
        'alias_name', 'alias_domain', 'create_date', 'write_date'
      ],
    };

    return fieldMap[modelName] || ['name', 'create_date', 'write_date'];
  }

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus {
    return { ...this.currentStatus };
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
