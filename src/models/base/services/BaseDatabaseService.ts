/**
 * BaseDatabaseService - Core SQLite database service
 * Base service for all database operations
 *
 * MIGRATED: From src/services/database.ts
 * Creates tables on-the-fly based on Odoo models and fields
 */

import * as SQLite from 'expo-sqlite';
import { OdooRecord } from '../../../types';

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  /**
   * Initialize database
   */
  async initialize(): Promise<void> {
    try {
      console.log('🗄️ Initializing SQLite database...');

      this.db = await SQLite.openDatabaseAsync('odoo_sync.db');

      // Create only essential system tables
      await this.createSystemTables();

      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get database instance
   */
  getDatabase(): SQLite.SQLiteDatabase | null {
    return this.db;
  }

  /**
   * Create essential system tables only
   */
  private async createSystemTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // ONLY create sync metadata table - all other tables are created dynamically
    await this.createSyncMetadataTable();

    console.log('✅ Essential system tables created');
  }

  /**
   * Create sync metadata table
   */
  private async createSyncMetadataTable(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Check if table exists and has correct schema
    const tableExists = await this.tableExists('sync_metadata');

    if (tableExists) {
      // Check if it has the correct columns
      const columns = await this.getTableColumns('sync_metadata');
      const hasCorrectSchema = columns.includes('last_sync_timestamp') &&
                              columns.includes('last_sync_write_date');

      if (hasCorrectSchema) {
        console.log('✅ sync_metadata table already exists with correct schema');
        return;
      } else {
        // Drop and recreate only if schema is wrong
        await this.db.execAsync('DROP TABLE IF EXISTS sync_metadata');
        console.log('🗑️ Dropped old sync_metadata table (wrong schema)');
      }
    }

    // Create with correct schema
    await this.db.execAsync(`
      CREATE TABLE sync_metadata (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model_name TEXT UNIQUE NOT NULL,
        last_sync_timestamp TEXT,
        last_sync_write_date TEXT,
        total_records INTEGER DEFAULT 0,
        sync_type TEXT DEFAULT 'time_based',
        enabled BOOLEAN DEFAULT 1,
        last_error TEXT,
        sync_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created sync_metadata table with correct schema');
  }

  /**
   * DYNAMIC TABLE CREATION: Create table for any Odoo model
   */
  async createTableForModel(tableName: string, fields: string[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Check if table already exists
    const tableExists = await this.tableExists(tableName);
    if (tableExists) {
      console.log(`📋 Table ${tableName} already exists`);
      return;
    }

    // Build dynamic CREATE TABLE statement
    const columns = ['id INTEGER PRIMARY KEY'];

    // Track which standard columns we've already added
    const standardColumns = new Set(['id', 'create_date', 'write_date', 'synced_at']);

    // Add each field as TEXT (we'll handle type conversion in the app)
    for (const field of fields) {
      if (!standardColumns.has(field)) {
        const sanitizedField = this.sanitizeColumnName(field);
        columns.push(`${sanitizedField} TEXT`);
      } else if (field === 'create_date' || field === 'write_date') {
        // Add the field from Odoo data (don't duplicate)
        columns.push(`${field} TEXT`);
        standardColumns.delete(field); // Mark as added
      }
    }

    // Add any remaining standard tracking columns that weren't in the Odoo fields
    if (standardColumns.has('create_date')) {
      columns.push('create_date TEXT');
    }
    if (standardColumns.has('write_date')) {
      columns.push('write_date TEXT');
    }
    if (standardColumns.has('synced_at')) {
      columns.push('synced_at INTEGER DEFAULT (strftime(\'%s\', \'now\'))');
    }

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        ${columns.join(',\n        ')}
      );
    `;

    console.log(`🏗️ Creating dynamic table: ${tableName}`);
    await this.db.execAsync(createTableSQL);
    console.log(`✅ Created table: ${tableName} with ${fields.length} fields`);
  }

  /**
   * Check if table exists
   */
  private async tableExists(tableName: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync(
      `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
      [tableName]
    );

    return !!result;
  }

  /**
   * Save records to a table (creates table if it doesn't exist)
   */
  async saveRecords(tableName: string, records: OdooRecord[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    if (records.length === 0) return;

    console.log(`💾 Saving ${records.length} records to ${tableName}...`);

    try {
      // Extract all unique fields from records
      const allFields = new Set<string>();
      records.forEach(record => {
        Object.keys(record).forEach(key => allFields.add(key));
      });

      // Create table dynamically if it doesn't exist
      await this.createTableForModel(tableName, Array.from(allFields));

      // Process records individually to avoid transaction nesting issues
      for (const record of records) {
        await this.insertOrUpdateRecord(tableName, record);
      }

      // Update sync metadata
      await this.updateSyncMetadata(tableName, {
        totalRecords: records.length,
        lastSyncTimestamp: new Date().toISOString()
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

    // Get table columns
    const columns = await this.getTableColumns(tableName);
    
    // Filter record to only include existing columns, mapping original field names to sanitized column names
    const filteredRecord: any = {};
    for (const column of columns) {
      // Try to find the original field name that maps to this sanitized column
      const originalField = Object.keys(record).find(field =>
        this.sanitizeColumnName(field) === column || field === column
      );

      if (originalField && record.hasOwnProperty(originalField) && column !== 'synced_at') {
        filteredRecord[column] = this.sanitizeValue(record[originalField]);
      }
    }

    // Build INSERT OR REPLACE statement
    const columnNames = Object.keys(filteredRecord);
    const placeholders = columnNames.map(() => '?').join(', ');
    const values = Object.values(filteredRecord);

    const sql = `
      INSERT OR REPLACE INTO ${tableName} (${columnNames.join(', ')})
      VALUES (${placeholders})
    `;

    await this.db.runAsync(sql, values as any[]);
  }

  /**
   * Get table columns
   */
  private async getTableColumns(tableName: string): Promise<string[]> {
    if (!this.db) throw new Error('Database not initialized');

    const tableInfo = await this.db.getAllAsync(`PRAGMA table_info(${tableName})`);
    return tableInfo.map((column: any) => column.name);
  }

  /**
   * Sanitize column name for SQLite
   */
  private sanitizeColumnName(columnName: string): string {
    // SQLite column names must:
    // 1. Not start with a number
    // 2. Only contain letters, numbers, and underscores
    // 3. Not be SQLite reserved words

    let sanitized = columnName
      .replace(/[^a-zA-Z0-9_]/g, '_')  // Replace invalid chars with underscore
      .replace(/^(\d)/, 'col_$1');     // Prefix with 'col_' if starts with number

    // Handle SQLite reserved words
    const reservedWords = ['order', 'group', 'select', 'from', 'where', 'table', 'index', 'create', 'drop', 'alter'];
    if (reservedWords.includes(sanitized.toLowerCase())) {
      sanitized = `col_${sanitized}`;
    }

    return sanitized;
  }

  /**
   * Sanitize value for SQLite
   */
  private sanitizeValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return value;
  }

  /**
   * Get sync metadata for a model
   */
  async getSyncMetadata(modelName: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync(
      'SELECT * FROM sync_metadata WHERE model_name = ?',
      [modelName]
    );

    return result;
  }

  /**
   * Update sync metadata for a model
   */
  async updateSyncMetadata(modelName: string, metadata: {
    lastSyncTimestamp?: string;
    lastSyncWriteDate?: string;
    totalRecords?: number;
    syncType?: string;
    enabled?: boolean;
    lastError?: string;
  }): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const existing = await this.getSyncMetadata(modelName);

    if (existing) {
      // Update existing record
      await this.db.runAsync(`
        UPDATE sync_metadata
        SET last_sync_timestamp = COALESCE(?, last_sync_timestamp),
            last_sync_write_date = COALESCE(?, last_sync_write_date),
            total_records = COALESCE(?, total_records),
            sync_type = COALESCE(?, sync_type),
            enabled = COALESCE(?, enabled),
            last_error = ?,
            sync_count = sync_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE model_name = ?
      `, [
        metadata.lastSyncTimestamp || null,
        metadata.lastSyncWriteDate || null,
        metadata.totalRecords || null,
        metadata.syncType || null,
        metadata.enabled !== undefined ? (metadata.enabled ? 1 : 0) : null,
        metadata.lastError || null,
        modelName
      ]);
    } else {
      // Insert new record
      await this.db.runAsync(`
        INSERT INTO sync_metadata (
          model_name, last_sync_timestamp, last_sync_write_date,
          total_records, sync_type, enabled, last_error, sync_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `, [
        modelName,
        metadata.lastSyncTimestamp || null,
        metadata.lastSyncWriteDate || null,
        metadata.totalRecords || 0,
        metadata.syncType || 'time_based',
        metadata.enabled !== undefined ? (metadata.enabled ? 1 : 0) : 1,
        metadata.lastError || null
      ]);
    }
  }

  /**
   * Get all sync metadata
   */
  async getAllSyncMetadata(): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const results = await this.db.getAllAsync(
      'SELECT * FROM sync_metadata ORDER BY model_name'
    );

    return results || [];
  }

  /**
   * Get all table names from SQLite database
   */
  async getAllTables(): Promise<string[]> {
    if (!this.db) throw new Error('Database not initialized');

    const tables = await this.db.getAllAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );

    return tables.map((table: any) => table.name);
  }

  /**
   * Get records from a table
   */
  async getRecords(tableName: string, limit: number = 100, offset: number = 0): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const tableExists = await this.tableExists(tableName);
    if (!tableExists) {
      console.log(`⚠️ Table ${tableName} does not exist`);
      return [];
    }

    const results = await this.db.getAllAsync(
      `SELECT * FROM ${tableName} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return results || [];
  }

  /**
   * Get records ordered by modification time (most recent first)
   * Prioritizes write_date, then create_date, then id DESC
   */
  async getRecordsOrderedByModification(tableName: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const tableExists = await this.tableExists(tableName);
    if (!tableExists) {
      console.log(`⚠️ Table ${tableName} does not exist`);
      return [];
    }

    // Check which timestamp columns exist in the table
    const tableInfo = await this.db.getAllAsync(`PRAGMA table_info(${tableName})`);
    const columns = tableInfo.map((col: any) => col.name);

    let orderClause = '';
    if (columns.includes('write_date')) {
      orderClause = 'ORDER BY write_date DESC, id DESC';
    } else if (columns.includes('create_date')) {
      orderClause = 'ORDER BY create_date DESC, id DESC';
    } else if (columns.includes('updated_at')) {
      orderClause = 'ORDER BY updated_at DESC, id DESC';
    } else if (columns.includes('created_at')) {
      orderClause = 'ORDER BY created_at DESC, id DESC';
    } else {
      orderClause = 'ORDER BY id DESC';
    }

    const results = await this.db.getAllAsync(
      `SELECT * FROM ${tableName} ${orderClause} LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    console.log(`📋 Retrieved ${results?.length || 0} records from ${tableName} ordered by modification time`);
    return results || [];
  }

  /**
   * Update a specific record in a table
   */
  async updateRecord(tableName: string, recordId: number, data: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tableExists = await this.tableExists(tableName);
    if (!tableExists) {
      throw new Error(`Table ${tableName} does not exist`);
    }

    // Build update query dynamically
    const fields = Object.keys(data).filter(key => key !== 'id');
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => this.sanitizeValue(data[field]));

    await this.db.runAsync(
      `UPDATE ${tableName} SET ${setClause} WHERE id = ?`,
      [...values, recordId]
    );

    console.log(`✅ Updated record ${recordId} in ${tableName}`);
  }

  /**
   * Clear all data
   */
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Get all table names except sync_metadata
    const tables = await this.db.getAllAsync(
      `SELECT name FROM sqlite_master WHERE type='table' AND name != 'sync_metadata' AND name != 'sqlite_sequence'`
    );

    for (const table of tables) {
      await this.db.execAsync(`DELETE FROM ${(table as any).name}`);
    }

    // Clear sync metadata
    await this.db.execAsync('DELETE FROM sync_metadata');

    console.log('✅ All data cleared');
  }

  /**
   * Reset database (drop all tables and recreate)
   */
  async resetDatabase(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Get all table names
    const tables = await this.db.getAllAsync(
      `SELECT name FROM sqlite_master WHERE type='table' AND name != 'sqlite_sequence'`
    );

    for (const table of tables) {
      await this.db.execAsync(`DROP TABLE IF EXISTS ${(table as any).name}`);
    }

    // Recreate system tables
    await this.createSystemTables();

    console.log('✅ Database reset complete');
  }
}

export const databaseService = new DatabaseService();
