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
        name TEXT,
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
   * Insert or update a single record
   */
  private async insertOrUpdateRecord(tableName: string, record: OdooRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Filter record to only include basic columns we know exist
    const filteredRecord: any = {
      id: record.id,
      name: record.name || '',
      synced_at: Math.floor(Date.now() / 1000)
    };

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
      filteredRecord.department_name = record.department_id && Array.isArray(record.department_id) ? record.department_id[1] : null;
      filteredRecord.parent_id = record.parent_id ? (Array.isArray(record.parent_id) ? record.parent_id[0] : record.parent_id) : null;
      filteredRecord.parent_name = record.parent_id && Array.isArray(record.parent_id) ? record.parent_id[1] : null;
      filteredRecord.coach_id = record.coach_id ? (Array.isArray(record.coach_id) ? record.coach_id[0] : record.coach_id) : null;
      filteredRecord.coach_name = record.coach_id && Array.isArray(record.coach_id) ? record.coach_id[1] : null;
      filteredRecord.company_id = record.company_id ? (Array.isArray(record.company_id) ? record.company_id[0] : record.company_id) : null;
      filteredRecord.company_name = record.company_id && Array.isArray(record.company_id) ? record.company_id[1] : null;
      filteredRecord.user_id = record.user_id ? (Array.isArray(record.user_id) ? record.user_id[0] : record.user_id) : null;
      filteredRecord.user_name = record.user_id && Array.isArray(record.user_id) ? record.user_id[1] : null;
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
      filteredRecord.stage_name = record.stage_id && Array.isArray(record.stage_id) ? record.stage_id[1] : null;
      filteredRecord.user_id = record.user_id ? (Array.isArray(record.user_id) ? record.user_id[0] : record.user_id) : null;
      filteredRecord.user_name = record.user_id && Array.isArray(record.user_id) ? record.user_id[1] : null;
      filteredRecord.team_id = record.team_id ? (Array.isArray(record.team_id) ? record.team_id[0] : record.team_id) : null;
      filteredRecord.team_name = record.team_id && Array.isArray(record.team_id) ? record.team_id[1] : null;
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
      filteredRecord.partner_name = record.partner_id && Array.isArray(record.partner_id) ? record.partner_id[1] : null;
      filteredRecord.date_order = record.date_order || null;
      filteredRecord.validity_date = record.validity_date || null;
      filteredRecord.user_id = record.user_id ? (Array.isArray(record.user_id) ? record.user_id[0] : record.user_id) : null;
      filteredRecord.user_name = record.user_id && Array.isArray(record.user_id) ? record.user_id[1] : null;
      filteredRecord.team_id = record.team_id ? (Array.isArray(record.team_id) ? record.team_id[0] : record.team_id) : null;
      filteredRecord.team_name = record.team_id && Array.isArray(record.team_id) ? record.team_id[1] : null;
      filteredRecord.amount_untaxed = record.amount_untaxed || 0;
      filteredRecord.amount_tax = record.amount_tax || 0;
      filteredRecord.amount_total = record.amount_total || 0;
      filteredRecord.currency_id = record.currency_id ? (Array.isArray(record.currency_id) ? record.currency_id[0] : record.currency_id) : null;
      filteredRecord.currency_name = record.currency_id && Array.isArray(record.currency_id) ? record.currency_id[1] : null;
      filteredRecord.state = record.state || null;
      filteredRecord.invoice_status = record.invoice_status || null;
      filteredRecord.delivery_status = record.delivery_status || null;
      filteredRecord.note = record.note || null;
    } else if (tableName === 'activities') {
      // Activities specific fields
      filteredRecord.name = record.summary || record.name || 'Activity';
      filteredRecord.summary = record.summary || null;
      filteredRecord.note = record.note || null;
      filteredRecord.date_deadline = record.date_deadline || null;
      filteredRecord.user_id = record.user_id ? (Array.isArray(record.user_id) ? record.user_id[0] : record.user_id) : null;
      filteredRecord.user_name = record.user_id && Array.isArray(record.user_id) ? record.user_id[1] : null;
      filteredRecord.res_model = record.res_model || null;
      filteredRecord.res_id = record.res_id || null;
      filteredRecord.res_name = record.res_name || null;
      filteredRecord.activity_type_id = record.activity_type_id ? (Array.isArray(record.activity_type_id) ? record.activity_type_id[0] : record.activity_type_id) : null;
      filteredRecord.activity_type_name = record.activity_type_id && Array.isArray(record.activity_type_id) ? record.activity_type_id[1] : null;
      filteredRecord.state = record.state || null;
    } else if (tableName === 'messages') {
      // Messages specific fields
      filteredRecord.name = record.subject || record.name || 'Message';
      filteredRecord.subject = record.subject || null;
      filteredRecord.body = record.body || null;
      filteredRecord.date = record.date || null;
      filteredRecord.author_id = record.author_id ? (Array.isArray(record.author_id) ? record.author_id[0] : record.author_id) : null;
      filteredRecord.author_name = record.author_id && Array.isArray(record.author_id) ? record.author_id[1] : null;
      filteredRecord.email_from = record.email_from || null;
      filteredRecord.message_type = record.message_type || null;
      filteredRecord.subtype_id = record.subtype_id ? (Array.isArray(record.subtype_id) ? record.subtype_id[0] : record.subtype_id) : null;
      filteredRecord.subtype_name = record.subtype_id && Array.isArray(record.subtype_id) ? record.subtype_id[1] : null;
      filteredRecord.model = record.model || null;
      filteredRecord.res_id = record.res_id || null;
      filteredRecord.record_name = record.record_name || null;
      filteredRecord.reply_to = record.reply_to || null;
      filteredRecord.attachment_ids = record.attachment_ids ? JSON.stringify(record.attachment_ids) : null;
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
    const values = Object.values(filteredRecord);

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
      'activities', 'messages', 'attachments', 'calendar_events',
      'helpdesk_tickets', 'projects'
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
    await this.db.execAsync('DELETE FROM attachments');
    await this.db.execAsync('DELETE FROM calendar_events');
    await this.db.execAsync('DELETE FROM helpdesk_tickets');
    await this.db.execAsync('DELETE FROM projects');
    await this.db.execAsync('DELETE FROM sync_metadata');

    console.log('✅ All data cleared');
  }
}

export const databaseService = new DatabaseService();
