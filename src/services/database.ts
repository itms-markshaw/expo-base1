/**
 * Simple SQLite Database Service
 * Actually works, no fancy ORM bullshit
 */

import * as SQLite from 'expo-sqlite';
import { OdooRecord } from '../types';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  /**
   * Initialize database
   */
  async initialize(): Promise<void> {
    try {
      console.log('🗄️ Initializing SQLite database...');

      this.db = await SQLite.openDatabaseAsync('odoo_sync.db');

      // Create basic tables
      await this.createTables();

      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create basic tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Contacts table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        is_company BOOLEAN DEFAULT 0,
        create_date TEXT,
        write_date TEXT,
        synced_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    // Users table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        login TEXT UNIQUE,
        email TEXT,
        create_date TEXT,
        write_date TEXT,
        synced_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    // CRM Leads table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS crm_leads (
        id INTEGER PRIMARY KEY,
        name TEXT,
        partner_name TEXT,
        email_from TEXT,
        phone TEXT,
        mobile TEXT,
        website TEXT,
        street TEXT,
        street2 TEXT,
        city TEXT,
        state_id INTEGER,
        zip TEXT,
        country_id INTEGER,
        stage_id INTEGER,
        stage_name TEXT,
        user_id INTEGER,
        user_name TEXT,
        team_id INTEGER,
        team_name TEXT,
        company_id INTEGER,
        source_id INTEGER,
        medium_id INTEGER,
        campaign_id INTEGER,
        referred TEXT,
        probability REAL,
        expected_revenue REAL,
        priority TEXT,
        type TEXT,
        active BOOLEAN DEFAULT 1,
        description TEXT,
        create_date TEXT,
        write_date TEXT,
        date_deadline TEXT,
        date_closed TEXT,
        date_conversion TEXT,
        lost_reason_id INTEGER,
        tag_ids TEXT,
        synced_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    // Employees table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY,
        name TEXT,
        work_email TEXT,
        work_phone TEXT,
        mobile_phone TEXT,
        job_title TEXT,
        department_id INTEGER,
        department_name TEXT,
        parent_id INTEGER,
        parent_name TEXT,
        coach_id INTEGER,
        coach_name TEXT,
        company_id INTEGER,
        company_name TEXT,
        user_id INTEGER,
        user_name TEXT,
        resource_id INTEGER,
        employee_type TEXT,
        active BOOLEAN DEFAULT 1,
        create_date TEXT,
        write_date TEXT,
        synced_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    // Sales Orders table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sale_orders (
        id INTEGER PRIMARY KEY,
        name TEXT,
        partner_id INTEGER,
        partner_name TEXT,
        date_order TEXT,
        validity_date TEXT,
        user_id INTEGER,
        user_name TEXT,
        team_id INTEGER,
        team_name TEXT,
        amount_untaxed REAL,
        amount_tax REAL,
        amount_total REAL,
        currency_id INTEGER,
        currency_name TEXT,
        state TEXT,
        invoice_status TEXT,
        delivery_status TEXT,
        note TEXT,
        create_date TEXT,
        write_date TEXT,
        synced_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    // Activities table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY,
        summary TEXT,
        note TEXT,
        date_deadline TEXT,
        user_id INTEGER,
        user_name TEXT,
        res_model TEXT,
        res_id INTEGER,
        res_name TEXT,
        activity_type_id INTEGER,
        activity_type_name TEXT,
        state TEXT,
        create_date TEXT,
        write_date TEXT,
        synced_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    // Messages table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY,
        name TEXT,
        subject TEXT,
        body TEXT,
        date TEXT,
        author_id INTEGER,
        author_name TEXT,
        email_from TEXT,
        message_type TEXT,
        subtype_id INTEGER,
        subtype_name TEXT,
        model TEXT,
        res_id INTEGER,
        record_name TEXT,
        reply_to TEXT,
        attachment_ids TEXT,
        create_date TEXT,
        write_date TEXT,
        synced_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    // Chat Channels table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS chat_channels (
        id INTEGER PRIMARY KEY,
        name TEXT,
        description TEXT,
        channel_type TEXT,
        create_date TEXT,
        write_date TEXT,
        synced_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    // Mail Threads table (for when permissions allow)
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS mail_threads (
        id INTEGER PRIMARY KEY,
        message_ids TEXT,
        message_follower_ids TEXT,
        message_partner_ids TEXT,
        create_date TEXT,
        write_date TEXT,
        synced_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    // Attachments table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS attachments (
        id INTEGER PRIMARY KEY,
        name TEXT,
        description TEXT,
        res_model TEXT,
        res_id INTEGER,
        res_name TEXT,
        type TEXT,
        url TEXT,
        file_size INTEGER,
        mimetype TEXT,
        create_date TEXT,
        write_date TEXT,
        synced_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    // Calendar Events table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS calendar_events (
        id INTEGER PRIMARY KEY,
        name TEXT,
        description TEXT,
        start TEXT,
        stop TEXT,
        allday BOOLEAN DEFAULT 0,
        duration REAL,
        user_id INTEGER,
        user_name TEXT,
        partner_ids TEXT,
        location TEXT,
        privacy TEXT,
        show_as TEXT,
        create_date TEXT,
        write_date TEXT,
        synced_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    // Helpdesk Tickets table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS helpdesk_tickets (
        id INTEGER PRIMARY KEY,
        name TEXT,
        description TEXT,
        partner_id INTEGER,
        partner_name TEXT,
        user_id INTEGER,
        user_name TEXT,
        team_id INTEGER,
        team_name TEXT,
        stage_id INTEGER,
        stage_name TEXT,
        priority TEXT,
        kanban_state TEXT,
        active BOOLEAN DEFAULT 1,
        create_date TEXT,
        write_date TEXT,
        close_date TEXT,
        synced_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    // Helpdesk Teams table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS helpdesk_teams (
        id INTEGER PRIMARY KEY,
        name TEXT,
        description TEXT,
        member_ids TEXT,
        color INTEGER,
        alias_name TEXT,
        alias_domain TEXT,
        active BOOLEAN DEFAULT 1,
        create_date TEXT,
        write_date TEXT,
        synced_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    // Projects table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY,
        name TEXT,
        description TEXT,
        user_id INTEGER,
        user_name TEXT,
        partner_id INTEGER,
        partner_name TEXT,
        date_start TEXT,
        date TEXT,
        privacy_visibility TEXT,
        active BOOLEAN DEFAULT 1,
        create_date TEXT,
        write_date TEXT,
        synced_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    // Project Tasks table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS project_tasks (
        id INTEGER PRIMARY KEY,
        name TEXT,
        description TEXT,
        project_id INTEGER,
        project_name TEXT,
        user_ids TEXT,
        partner_id INTEGER,
        partner_name TEXT,
        date_deadline TEXT,
        stage_id INTEGER,
        stage_name TEXT,
        priority TEXT,
        active BOOLEAN DEFAULT 1,
        create_date TEXT,
        write_date TEXT,
        synced_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    // Products table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        name TEXT,
        default_code TEXT,
        barcode TEXT,
        product_tmpl_id INTEGER,
        list_price REAL,
        standard_price REAL,
        categ_id INTEGER,
        categ_name TEXT,
        uom_id INTEGER,
        uom_name TEXT,
        active BOOLEAN DEFAULT 1,
        create_date TEXT,
        write_date TEXT,
        synced_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    // Product Templates table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS product_templates (
        id INTEGER PRIMARY KEY,
        name TEXT,
        description TEXT,
        list_price REAL,
        standard_price REAL,
        categ_id INTEGER,
        categ_name TEXT,
        uom_id INTEGER,
        uom_name TEXT,
        uom_po_id INTEGER,
        uom_po_name TEXT,
        type TEXT,
        sale_ok BOOLEAN DEFAULT 1,
        purchase_ok BOOLEAN DEFAULT 1,
        active BOOLEAN DEFAULT 1,
        create_date TEXT,
        write_date TEXT,
        synced_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    // Invoices table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY,
        name TEXT,
        partner_id INTEGER,
        partner_name TEXT,
        invoice_date TEXT,
        invoice_date_due TEXT,
        amount_untaxed REAL,
        amount_tax REAL,
        amount_total REAL,
        currency_id INTEGER,
        currency_name TEXT,
        state TEXT,
        move_type TEXT,
        ref TEXT,
        create_date TEXT,
        write_date TEXT,
        synced_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    // Deliveries table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS deliveries (
        id INTEGER PRIMARY KEY,
        name TEXT,
        partner_id INTEGER,
        partner_name TEXT,
        picking_type_id INTEGER,
        picking_type_name TEXT,
        location_id INTEGER,
        location_name TEXT,
        location_dest_id INTEGER,
        location_dest_name TEXT,
        scheduled_date TEXT,
        date_done TEXT,
        state TEXT,
        origin TEXT,
        note TEXT,
        create_date TEXT,
        write_date TEXT,
        synced_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    // Sync metadata table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        model_name TEXT PRIMARY KEY,
        last_sync INTEGER,
        record_count INTEGER DEFAULT 0,
        last_sync_id INTEGER DEFAULT 0
      );
    `);

    console.log('✅ Database tables created');

    // Run migrations for existing tables
    await this.runMigrations();
  }

  /**
   * Run database migrations for schema updates
   */
  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    console.log('🔄 Running database migrations...');

    try {
      // Migration 1: Add name column to messages table if it doesn't exist
      const tableInfo = await this.db.getAllAsync(`PRAGMA table_info(messages)`);
      const hasNameColumn = tableInfo.some((column: any) => column.name === 'name');

      if (!hasNameColumn) {
        try {
          await this.db.execAsync(`
            ALTER TABLE messages ADD COLUMN name TEXT DEFAULT '';
          `);
          console.log('✅ Added name column to messages table');
        } catch (alterError: any) {
          console.warn('⚠️ ALTER TABLE failed, recreating messages table:', alterError.message);
          await this.recreateMessagesTable();
        }
      } else {
        console.log('📋 Messages table already has name column');
      }
    } catch (error: any) {
      console.warn('⚠️ Migration warning for messages.name:', error.message);
    }

    console.log('✅ Database migrations completed');
  }

  /**
   * Force recreate messages table with proper schema
   */
  async recreateMessagesTable(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    console.log('🔄 Recreating messages table...');

    try {
      // Drop existing table
      await this.db.execAsync(`DROP TABLE IF EXISTS messages`);
      console.log('🗑️ Dropped existing messages table');

      // Recreate with proper schema
      await this.db.execAsync(`
        CREATE TABLE messages (
          id INTEGER PRIMARY KEY,
          name TEXT,
          subject TEXT,
          body TEXT,
          date TEXT,
          author_id INTEGER,
          author_name TEXT,
          email_from TEXT,
          message_type TEXT,
          subtype_id INTEGER,
          subtype_name TEXT,
          model TEXT,
          res_id INTEGER,
          record_name TEXT,
          reply_to TEXT,
          attachment_ids TEXT,
          create_date TEXT,
          write_date TEXT,
          synced_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
      `);
      console.log('✅ Recreated messages table with proper schema');

    } catch (error) {
      console.error('❌ Failed to recreate messages table:', error);
      throw error;
    }
  }

  /**
   * Save records to a table
   */
  async saveRecords(tableName: string, records: OdooRecord[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    if (records.length === 0) return;

    console.log(`💾 Saving ${records.length} records to ${tableName}...`);

    try {
      await this.db.withTransactionAsync(async () => {
        for (const record of records) {
          await this.insertOrUpdateRecord(tableName, record);
        }

        // Update sync metadata
        await this.updateSyncMetadata(tableName, records.length);
      });

      console.log(`✅ Saved ${records.length} records to ${tableName}`);
    } catch (error) {
      console.error(`❌ Failed to save records to ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Safely extract name from Odoo relational field array
   * Handles cases where the name might be invalid (like "a")
   */
  private extractRelationalName(field: any, fallbackName?: string): string | null {
    if (field && Array.isArray(field) && field.length > 1) {
      let name = field[1];
      if (name && typeof name === 'string') {
        // Clean up company name from author (e.g., "ITMS Group Pty Ltd, Mark Shaw" -> "Mark Shaw")
        if (name.includes(',')) {
          const parts = name.split(',').map(part => part.trim());
          if (parts.length > 1) {
            name = parts[parts.length - 1];
          }
        }

        // Ensure we have a valid name (not just "a" or other single/invalid characters)
        if (name.length > 1 && !this.isInvalidName(name)) {
          return name;
        }
      }
    }
    return fallbackName || null;
  }

  /**
   * Check if a name is invalid (common Odoo data issues)
   */
  private isInvalidName(name: string): boolean {
    if (!name || typeof name !== 'string') return true;

    // Single character names are usually invalid
    if (name.length === 1) return true;

    // Common invalid patterns from Odoo
    const invalidPatterns = [
      /^a$/i,           // Just "a"
      /^[a-z]$/i,       // Single letters
      /^\d+$/,          // Just numbers
      /^[\s\-_]+$/,     // Just whitespace/dashes/underscores
      /^null$/i,        // "null" string
      /^undefined$/i,   // "undefined" string
      /^false$/i,       // "false" string
      /^true$/i,        // "true" string
    ];

    return invalidPatterns.some(pattern => pattern.test(name.trim()));
  }

  /**
   * Insert or update a single record
   */
  private async insertOrUpdateRecord(tableName: string, record: OdooRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Filter record to only include basic columns we know exist
    const filteredRecord: any = {
      id: record.id,
      synced_at: Math.floor(Date.now() / 1000)
    };

    // Add name field only for tables that have it (activities table doesn't have name column)
    if (tableName !== 'activities') {
      // For messages, use subject as name since mail.message doesn't have a name field
      if (tableName === 'messages') {
        filteredRecord.name = record.subject || record.name || 'Message';
      } else {
        filteredRecord.name = record.name || '';
      }
    }

    // Add table-specific fields
    if (tableName === 'contacts') {
      filteredRecord.email = record.email || null;
      filteredRecord.phone = record.phone || null;
      filteredRecord.is_company = record.is_company ? 1 : 0;
    } else if (tableName === 'users') {
      filteredRecord.login = record.login || '';
      filteredRecord.email = record.email || null;
    } else if (tableName === 'employees') {
      // Employees table
      filteredRecord.work_email = record.work_email || null;
      filteredRecord.work_phone = record.work_phone || null;
      filteredRecord.mobile_phone = record.mobile_phone || null;
      filteredRecord.job_title = record.job_title || null;
      filteredRecord.department_id = record.department_id ? (Array.isArray(record.department_id) ? record.department_id[0] : record.department_id) : null;
      filteredRecord.department_name = this.extractRelationalName(record.department_id, record.department_name);
      filteredRecord.parent_id = record.parent_id ? (Array.isArray(record.parent_id) ? record.parent_id[0] : record.parent_id) : null;
      filteredRecord.parent_name = this.extractRelationalName(record.parent_id, record.parent_name);
      filteredRecord.coach_id = record.coach_id ? (Array.isArray(record.coach_id) ? record.coach_id[0] : record.coach_id) : null;
      filteredRecord.coach_name = this.extractRelationalName(record.coach_id, record.coach_name);
      filteredRecord.company_id = record.company_id ? (Array.isArray(record.company_id) ? record.company_id[0] : record.company_id) : null;
      filteredRecord.company_name = this.extractRelationalName(record.company_id, record.company_name);
      filteredRecord.user_id = record.user_id ? (Array.isArray(record.user_id) ? record.user_id[0] : record.user_id) : null;
      filteredRecord.user_name = this.extractRelationalName(record.user_id, record.user_name);
      filteredRecord.resource_id = record.resource_id ? (Array.isArray(record.resource_id) ? record.resource_id[0] : record.resource_id) : null;
      filteredRecord.employee_type = record.employee_type || null;
      filteredRecord.active = record.active !== false ? 1 : 0;
    } else if (tableName === 'crm_leads') {
      // CRM Lead specific fields
      filteredRecord.partner_name = record.partner_name || null;
      filteredRecord.email_from = record.email_from || null;
      filteredRecord.phone = record.phone || null;
      filteredRecord.mobile = record.mobile || null;
      filteredRecord.website = record.website || null;
      filteredRecord.street = record.street || null;
      filteredRecord.street2 = record.street2 || null;
      filteredRecord.city = record.city || null;
      filteredRecord.state_id = record.state_id ? (Array.isArray(record.state_id) ? record.state_id[0] : record.state_id) : null;
      filteredRecord.zip = record.zip || null;
      filteredRecord.country_id = record.country_id ? (Array.isArray(record.country_id) ? record.country_id[0] : record.country_id) : null;
      filteredRecord.stage_id = record.stage_id ? (Array.isArray(record.stage_id) ? record.stage_id[0] : record.stage_id) : null;
      filteredRecord.stage_name = this.extractRelationalName(record.stage_id, record.stage_name);
      filteredRecord.user_id = record.user_id ? (Array.isArray(record.user_id) ? record.user_id[0] : record.user_id) : null;
      filteredRecord.user_name = this.extractRelationalName(record.user_id, record.user_name);
      filteredRecord.team_id = record.team_id ? (Array.isArray(record.team_id) ? record.team_id[0] : record.team_id) : null;
      filteredRecord.team_name = this.extractRelationalName(record.team_id, record.team_name);
      filteredRecord.company_id = record.company_id ? (Array.isArray(record.company_id) ? record.company_id[0] : record.company_id) : null;
      filteredRecord.source_id = record.source_id ? (Array.isArray(record.source_id) ? record.source_id[0] : record.source_id) : null;
      filteredRecord.medium_id = record.medium_id ? (Array.isArray(record.medium_id) ? record.medium_id[0] : record.medium_id) : null;
      filteredRecord.campaign_id = record.campaign_id ? (Array.isArray(record.campaign_id) ? record.campaign_id[0] : record.campaign_id) : null;
      filteredRecord.referred = record.referred || null;
      filteredRecord.probability = record.probability || 0;
      filteredRecord.expected_revenue = record.expected_revenue || 0;
      filteredRecord.priority = record.priority || null;
      filteredRecord.type = record.type || null;
      filteredRecord.active = record.active !== false ? 1 : 0;
      filteredRecord.description = record.description || null;
      filteredRecord.date_deadline = record.date_deadline || null;
      filteredRecord.date_closed = record.date_closed || null;
      filteredRecord.date_conversion = record.date_conversion || null;
      filteredRecord.lost_reason_id = record.lost_reason_id ? (Array.isArray(record.lost_reason_id) ? record.lost_reason_id[0] : record.lost_reason_id) : null;
      filteredRecord.tag_ids = record.tag_ids ? JSON.stringify(record.tag_ids) : null;
    } else if (tableName === 'sale_orders') {
      // Sales Orders specific fields
      filteredRecord.partner_id = record.partner_id ? (Array.isArray(record.partner_id) ? record.partner_id[0] : record.partner_id) : null;
      filteredRecord.partner_name = this.extractRelationalName(record.partner_id, record.partner_name);
      filteredRecord.date_order = record.date_order || null;
      filteredRecord.validity_date = record.validity_date || null;
      filteredRecord.user_id = record.user_id ? (Array.isArray(record.user_id) ? record.user_id[0] : record.user_id) : null;
      filteredRecord.user_name = this.extractRelationalName(record.user_id, record.user_name);
      filteredRecord.team_id = record.team_id ? (Array.isArray(record.team_id) ? record.team_id[0] : record.team_id) : null;
      filteredRecord.team_name = this.extractRelationalName(record.team_id, record.team_name);
      filteredRecord.amount_untaxed = record.amount_untaxed || 0;
      filteredRecord.amount_tax = record.amount_tax || 0;
      filteredRecord.amount_total = record.amount_total || 0;
      filteredRecord.currency_id = record.currency_id ? (Array.isArray(record.currency_id) ? record.currency_id[0] : record.currency_id) : null;
      filteredRecord.currency_name = this.extractRelationalName(record.currency_id, record.currency_name);
      filteredRecord.state = record.state || null;
      filteredRecord.invoice_status = record.invoice_status || null;
      filteredRecord.delivery_status = record.delivery_status || null;
      filteredRecord.note = record.note || null;
    } else if (tableName === 'activities') {
      // Activities specific fields - no 'name' column, use summary
      filteredRecord.summary = record.summary || null;
      filteredRecord.note = record.note || null;
      filteredRecord.date_deadline = record.date_deadline || null;
      filteredRecord.user_id = record.user_id ? (Array.isArray(record.user_id) ? record.user_id[0] : record.user_id) : null;
      filteredRecord.user_name = this.extractRelationalName(record.user_id, record.user_name);
      filteredRecord.res_model = record.res_model || null;
      filteredRecord.res_id = record.res_id || null;
      filteredRecord.res_name = record.res_name || null;
      filteredRecord.activity_type_id = record.activity_type_id ? (Array.isArray(record.activity_type_id) ? record.activity_type_id[0] : record.activity_type_id) : null;
      filteredRecord.activity_type_name = this.extractRelationalName(record.activity_type_id, record.activity_type_name);
      filteredRecord.state = record.state || null;
    } else if (tableName === 'messages') {
      // Messages specific fields (name already set above)
      filteredRecord.subject = record.subject || null;
      filteredRecord.body = record.body || null;
      filteredRecord.date = record.date || null;
      filteredRecord.author_id = record.author_id ? (Array.isArray(record.author_id) ? record.author_id[0] : record.author_id) : null;
      filteredRecord.author_name = this.extractRelationalName(record.author_id, record.author_name);
      filteredRecord.email_from = record.email_from || null;
      filteredRecord.message_type = record.message_type || null;
      filteredRecord.subtype_id = record.subtype_id ? (Array.isArray(record.subtype_id) ? record.subtype_id[0] : record.subtype_id) : null;
      filteredRecord.subtype_name = this.extractRelationalName(record.subtype_id, record.subtype_name);
      filteredRecord.model = record.model || null;
      filteredRecord.res_id = record.res_id || null;
      filteredRecord.record_name = record.record_name || null;
      filteredRecord.reply_to = record.reply_to || null;
      filteredRecord.attachment_ids = record.attachment_ids ? JSON.stringify(record.attachment_ids) : null;
    } else if (tableName === 'chat_channels') {
      // Chat Channels specific fields (simplified)
      filteredRecord.name = record.name || 'Unnamed Channel';
      filteredRecord.description = record.description || null;
      filteredRecord.channel_type = record.channel_type || null;
    } else if (tableName === 'mail_threads') {
      // Mail Threads specific fields
      filteredRecord.message_ids = Array.isArray(record.message_ids) ? JSON.stringify(record.message_ids) : null;
      filteredRecord.message_follower_ids = Array.isArray(record.message_follower_ids) ? JSON.stringify(record.message_follower_ids) : null;
      filteredRecord.message_partner_ids = Array.isArray(record.message_partner_ids) ? JSON.stringify(record.message_partner_ids) : null;
    } else if (tableName === 'project_tasks') {
      // Project Tasks specific fields
      filteredRecord.name = record.name || 'Task';
      filteredRecord.description = record.description || null;
      filteredRecord.project_id = record.project_id ? (Array.isArray(record.project_id) ? record.project_id[0] : record.project_id) : null;
      filteredRecord.project_name = this.extractRelationalName(record.project_id, record.project_name);
      filteredRecord.user_ids = Array.isArray(record.user_ids) ? JSON.stringify(record.user_ids) : null;
      filteredRecord.partner_id = record.partner_id ? (Array.isArray(record.partner_id) ? record.partner_id[0] : record.partner_id) : null;
      filteredRecord.partner_name = this.extractRelationalName(record.partner_id, record.partner_name);
      filteredRecord.date_deadline = record.date_deadline || null;
      filteredRecord.stage_id = record.stage_id ? (Array.isArray(record.stage_id) ? record.stage_id[0] : record.stage_id) : null;
      filteredRecord.stage_name = this.extractRelationalName(record.stage_id, record.stage_name);
      filteredRecord.priority = record.priority || null;
      filteredRecord.active = record.active !== false ? 1 : 0;
    } else if (tableName === 'products') {
      // Products specific fields
      filteredRecord.name = record.name || 'Product';
      filteredRecord.default_code = record.default_code || null;
      filteredRecord.barcode = record.barcode || null;
      filteredRecord.product_tmpl_id = record.product_tmpl_id || null;
      filteredRecord.list_price = record.list_price || 0;
      filteredRecord.standard_price = record.standard_price || 0;
      filteredRecord.categ_id = record.categ_id ? (Array.isArray(record.categ_id) ? record.categ_id[0] : record.categ_id) : null;
      filteredRecord.categ_name = this.extractRelationalName(record.categ_id, record.categ_name);
      filteredRecord.uom_id = record.uom_id ? (Array.isArray(record.uom_id) ? record.uom_id[0] : record.uom_id) : null;
      filteredRecord.uom_name = this.extractRelationalName(record.uom_id, record.uom_name);
      filteredRecord.active = record.active !== false ? 1 : 0;
    } else if (tableName === 'product_templates') {
      // Product Templates specific fields
      filteredRecord.name = record.name || 'Product Template';
      filteredRecord.description = record.description || null;
      filteredRecord.list_price = record.list_price || 0;
      filteredRecord.standard_price = record.standard_price || 0;
      filteredRecord.categ_id = record.categ_id ? (Array.isArray(record.categ_id) ? record.categ_id[0] : record.categ_id) : null;
      filteredRecord.categ_name = this.extractRelationalName(record.categ_id, record.categ_name);
      filteredRecord.uom_id = record.uom_id ? (Array.isArray(record.uom_id) ? record.uom_id[0] : record.uom_id) : null;
      filteredRecord.uom_name = this.extractRelationalName(record.uom_id, record.uom_name);
      filteredRecord.uom_po_id = record.uom_po_id ? (Array.isArray(record.uom_po_id) ? record.uom_po_id[0] : record.uom_po_id) : null;
      filteredRecord.uom_po_name = this.extractRelationalName(record.uom_po_id, record.uom_po_name);
      filteredRecord.type = record.type || null;
      filteredRecord.sale_ok = record.sale_ok !== false ? 1 : 0;
      filteredRecord.purchase_ok = record.purchase_ok !== false ? 1 : 0;
      filteredRecord.active = record.active !== false ? 1 : 0;
    } else if (tableName === 'invoices') {
      // Invoices specific fields
      filteredRecord.name = record.name || 'Invoice';
      filteredRecord.partner_id = record.partner_id ? (Array.isArray(record.partner_id) ? record.partner_id[0] : record.partner_id) : null;
      filteredRecord.partner_name = this.extractRelationalName(record.partner_id, record.partner_name);
      filteredRecord.invoice_date = record.invoice_date || null;
      filteredRecord.invoice_date_due = record.invoice_date_due || null;
      filteredRecord.amount_untaxed = record.amount_untaxed || 0;
      filteredRecord.amount_tax = record.amount_tax || 0;
      filteredRecord.amount_total = record.amount_total || 0;
      filteredRecord.currency_id = record.currency_id ? (Array.isArray(record.currency_id) ? record.currency_id[0] : record.currency_id) : null;
      filteredRecord.currency_name = this.extractRelationalName(record.currency_id, record.currency_name);
      filteredRecord.state = record.state || null;
      filteredRecord.move_type = record.move_type || null;
      filteredRecord.ref = record.ref || null;
    } else if (tableName === 'deliveries') {
      // Deliveries specific fields
      filteredRecord.name = record.name || 'Delivery';
      filteredRecord.partner_id = record.partner_id ? (Array.isArray(record.partner_id) ? record.partner_id[0] : record.partner_id) : null;
      filteredRecord.partner_name = this.extractRelationalName(record.partner_id, record.partner_name);
      filteredRecord.picking_type_id = record.picking_type_id ? (Array.isArray(record.picking_type_id) ? record.picking_type_id[0] : record.picking_type_id) : null;
      filteredRecord.picking_type_name = this.extractRelationalName(record.picking_type_id, record.picking_type_name);
      filteredRecord.location_id = record.location_id ? (Array.isArray(record.location_id) ? record.location_id[0] : record.location_id) : null;
      filteredRecord.location_name = this.extractRelationalName(record.location_id, record.location_name);
      filteredRecord.location_dest_id = record.location_dest_id ? (Array.isArray(record.location_dest_id) ? record.location_dest_id[0] : record.location_dest_id) : null;
      filteredRecord.location_dest_name = this.extractRelationalName(record.location_dest_id, record.location_dest_name);
      filteredRecord.scheduled_date = record.scheduled_date || null;
      filteredRecord.date_done = record.date_done || null;
      filteredRecord.state = record.state || null;
      filteredRecord.origin = record.origin || null;
      filteredRecord.note = record.note || null;
    } else if (tableName === 'calendar_events') {
      // Calendar Events specific fields
      filteredRecord.name = record.name || 'Event';
      filteredRecord.description = record.description || null;
      filteredRecord.start = record.start || null;
      filteredRecord.stop = record.stop || null;
      filteredRecord.allday = record.allday ? 1 : 0;
      filteredRecord.duration = record.duration || null;
      filteredRecord.user_id = record.user_id ? (Array.isArray(record.user_id) ? record.user_id[0] : record.user_id) : null;
      filteredRecord.user_name = this.extractRelationalName(record.user_id, record.user_name);
      filteredRecord.partner_ids = Array.isArray(record.partner_ids) ? JSON.stringify(record.partner_ids) : null;
      filteredRecord.location = record.location || null;
      filteredRecord.privacy = record.privacy || null;
      filteredRecord.show_as = record.show_as || null;
    } else if (tableName === 'helpdesk_teams') {
      // Helpdesk Teams specific fields
      filteredRecord.name = record.name || 'Team';
      filteredRecord.description = record.description || null;
      filteredRecord.member_ids = Array.isArray(record.member_ids) ? JSON.stringify(record.member_ids) : null;
      filteredRecord.color = record.color || null;
      filteredRecord.alias_name = record.alias_name || null;
      filteredRecord.alias_domain = record.alias_domain || null;
      filteredRecord.active = record.active !== false ? 1 : 0;
    } else {
      // Generic handling for other tables - just store basic fields
      Object.keys(record).forEach(key => {
        if (key !== 'id' && key !== 'name' && key !== 'synced_at') {
          filteredRecord[key] = record[key];
        }
      });
    }

    // Add common fields
    filteredRecord.create_date = record.create_date || null;
    filteredRecord.write_date = record.write_date || null;

    const columnNames = Object.keys(filteredRecord);
    const placeholders = columnNames.map(() => '?').join(', ');
    const values: (string | number | null)[] = Object.values(filteredRecord).map(value => {
      if (value === undefined || value === null) return null;
      if (typeof value === 'object') return JSON.stringify(value);
      if (typeof value === 'boolean') return value ? 1 : 0;
      return value as string | number;
    });

    // Use INSERT OR REPLACE for upsert
    const sql = `
      INSERT OR REPLACE INTO ${tableName} (${columnNames.join(', ')})
      VALUES (${placeholders})
    `;

    await this.db.runAsync(sql, values);
  }

  /**
   * Update sync metadata
   */
  private async updateSyncMetadata(modelName: string, recordCount: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const now = Math.floor(Date.now() / 1000);

    await this.db.runAsync(`
      INSERT OR REPLACE INTO sync_metadata (model_name, last_sync, record_count)
      VALUES (?, ?, ?)
    `, [modelName, now, recordCount]);
  }

  /**
   * Get records from table
   */
  async getRecords(tableName: string, limit: number = 100, offset: number = 0): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const sql = `SELECT * FROM ${tableName} ORDER BY id DESC LIMIT ? OFFSET ?`;
    return await this.db.getAllAsync(sql, [limit, offset]);
  }

  /**
   * Count records in table
   */
  async countRecords(tableName: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync(`SELECT COUNT(*) as count FROM ${tableName}`);
    return (result as any)?.count || 0;
  }

  /**
   * Get sync metadata
   */
  async getSyncMetadata(modelName: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.getFirstAsync(
      'SELECT * FROM sync_metadata WHERE model_name = ?',
      [modelName]
    );
  }

  /**
   * Get database stats
   */
  async getStats(): Promise<{ totalRecords: number; tables: any[] }> {
    if (!this.db) throw new Error('Database not initialized');

    const tables = [
      'contacts', 'users', 'employees', 'crm_leads', 'sale_orders',
      'activities', 'messages', 'chat_channels', 'mail_threads', 'attachments', 'calendar_events',
      'helpdesk_tickets', 'helpdesk_teams', 'projects', 'project_tasks', 'products', 'product_templates', 'invoices', 'deliveries'
    ];
    const stats = [];
    let totalRecords = 0;

    for (const table of tables) {
      try {
        const count = await this.countRecords(table);
        const metadata = await this.getSyncMetadata(table);

        stats.push({
          name: table,
          recordCount: count,
          lastSync: metadata?.last_sync || null,
        });

        totalRecords += count;
      } catch (error) {
        // Table might not exist yet, add with 0 count
        console.log(`Table ${table} not found, adding with 0 count`);
        stats.push({
          name: table,
          recordCount: 0,
          lastSync: null,
        });
      }
    }

    return {
      totalRecords,
      tables: stats,
    };
  }

  /**
   * Clear all data
   */
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync('DELETE FROM contacts');
    await this.db.execAsync('DELETE FROM users');
    await this.db.execAsync('DELETE FROM employees');
    await this.db.execAsync('DELETE FROM crm_leads');
    await this.db.execAsync('DELETE FROM sale_orders');
    await this.db.execAsync('DELETE FROM activities');
    await this.db.execAsync('DELETE FROM messages');
    await this.db.execAsync('DELETE FROM chat_channels');
    await this.db.execAsync('DELETE FROM mail_threads');
    await this.db.execAsync('DELETE FROM attachments');
    await this.db.execAsync('DELETE FROM calendar_events');
    await this.db.execAsync('DELETE FROM helpdesk_tickets');
    await this.db.execAsync('DELETE FROM helpdesk_teams');
    await this.db.execAsync('DELETE FROM projects');
    await this.db.execAsync('DELETE FROM project_tasks');
    await this.db.execAsync('DELETE FROM products');
    await this.db.execAsync('DELETE FROM product_templates');
    await this.db.execAsync('DELETE FROM invoices');
    await this.db.execAsync('DELETE FROM deliveries');
    await this.db.execAsync('DELETE FROM sync_metadata');

    console.log('✅ All data cleared');
  }

  /**
   * Reset database (for testing/debugging)
   */
  async resetDatabase(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    console.log('🔄 Resetting database...');

    // Drop all tables
    await this.db.execAsync('DROP TABLE IF EXISTS contacts');
    await this.db.execAsync('DROP TABLE IF EXISTS users');
    await this.db.execAsync('DROP TABLE IF EXISTS employees');
    await this.db.execAsync('DROP TABLE IF EXISTS crm_leads');
    await this.db.execAsync('DROP TABLE IF EXISTS sale_orders');
    await this.db.execAsync('DROP TABLE IF EXISTS activities');
    await this.db.execAsync('DROP TABLE IF EXISTS messages');
    await this.db.execAsync('DROP TABLE IF EXISTS chat_channels');
    await this.db.execAsync('DROP TABLE IF EXISTS mail_threads');
    await this.db.execAsync('DROP TABLE IF EXISTS attachments');
    await this.db.execAsync('DROP TABLE IF EXISTS calendar_events');
    await this.db.execAsync('DROP TABLE IF EXISTS helpdesk_tickets');
    await this.db.execAsync('DROP TABLE IF EXISTS helpdesk_teams');
    await this.db.execAsync('DROP TABLE IF EXISTS projects');
    await this.db.execAsync('DROP TABLE IF EXISTS project_tasks');
    await this.db.execAsync('DROP TABLE IF EXISTS products');
    await this.db.execAsync('DROP TABLE IF EXISTS product_templates');
    await this.db.execAsync('DROP TABLE IF EXISTS invoices');
    await this.db.execAsync('DROP TABLE IF EXISTS deliveries');
    await this.db.execAsync('DROP TABLE IF EXISTS sync_metadata');

    // Recreate tables
    await this.createTables();

    console.log('✅ Database reset complete');
  }
}

export const databaseService = new DatabaseService();
