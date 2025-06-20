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

    const tables = ['contacts', 'users'];
    const stats = [];
    let totalRecords = 0;

    for (const table of tables) {
      const count = await this.countRecords(table);
      const metadata = await this.getSyncMetadata(table);

      stats.push({
        name: table,
        recordCount: count,
        lastSync: metadata?.last_sync || null,
      });

      totalRecords += count;
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
    await this.db.execAsync('DELETE FROM sync_metadata');

    console.log('✅ All data cleared');
  }
}

export const databaseService = new DatabaseService();
