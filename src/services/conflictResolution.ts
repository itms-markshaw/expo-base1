/**
 * Conflict Resolution Service
 * Handles sync conflicts between local and server data
 */

import { databaseService } from './database';
import { authService } from './auth';

export interface SyncConflict {
  id: string;
  modelName: string;
  recordId: number;
  localData: any;
  serverData: any;
  conflictFields: string[];
  timestamp: string;
  status: 'pending' | 'resolved' | 'ignored';
  resolution?: 'local' | 'server' | 'merge';
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface ConflictResolutionStrategy {
  strategy: 'ask_user' | 'prefer_server' | 'prefer_local' | 'merge_smart';
  autoResolveFields?: string[]; // Fields that can be auto-resolved
}

class ConflictResolutionService {
  private conflicts: Map<string, SyncConflict> = new Map();
  private resolutionStrategy: ConflictResolutionStrategy = {
    strategy: 'ask_user'
  };

  /**
   * Initialize conflict resolution service
   */
  async initialize(): Promise<void> {
    try {
      await databaseService.initialize();
      await this.createConflictTables();
      await this.clearMockConflicts(); // Clean up any test data
      await this.loadPendingConflicts();
      console.log('✅ Conflict resolution service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize conflict resolution service:', error);
      throw error;
    }
  }

  /**
   * Create conflict tracking tables
   */
  private async createConflictTables(): Promise<void> {
    const db = databaseService.getDatabase();
    if (!db) throw new Error('Database not initialized');

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_conflicts (
        id TEXT PRIMARY KEY,
        model_name TEXT NOT NULL,
        record_id INTEGER NOT NULL,
        local_data TEXT NOT NULL,
        server_data TEXT NOT NULL,
        conflict_fields TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        resolution TEXT,
        resolved_at TEXT,
        resolved_by TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_sync_conflicts_status 
      ON sync_conflicts(status);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_sync_conflicts_model 
      ON sync_conflicts(model_name, record_id);
    `);
  }

  /**
   * Detect conflicts between local and server data
   */
  async detectConflicts(
    modelName: string, 
    localRecords: any[], 
    serverRecords: any[]
  ): Promise<SyncConflict[]> {
    const conflicts: SyncConflict[] = [];
    
    // Create maps for efficient lookup
    const localMap = new Map(localRecords.map(r => [r.id, r]));
    const serverMap = new Map(serverRecords.map(r => [r.id, r]));

    // Check for conflicts in records that exist in both local and server
    for (const [recordId, localRecord] of localMap) {
      const serverRecord = serverMap.get(recordId);
      if (!serverRecord) continue;

      const conflictFields = this.findConflictingFields(localRecord, serverRecord);
      
      if (conflictFields.length > 0) {
        const conflict: SyncConflict = {
          id: `${modelName}_${recordId}_${Date.now()}`,
          modelName,
          recordId,
          localData: localRecord,
          serverData: serverRecord,
          conflictFields,
          timestamp: new Date().toISOString(),
          status: 'pending'
        };

        conflicts.push(conflict);
        this.conflicts.set(conflict.id, conflict);
      }
    }

    // Save conflicts to database
    if (conflicts.length > 0) {
      await this.saveConflicts(conflicts);
      console.log(`🔍 Detected ${conflicts.length} conflicts for ${modelName}`);
    }

    return conflicts;
  }

  /**
   * Find conflicting fields between local and server records
   */
  private findConflictingFields(localRecord: any, serverRecord: any): string[] {
    const conflictFields: string[] = [];
    // Exclude system fields and local tracking fields
    const excludeFields = ['id', '__last_update', 'create_date', 'write_date', 'synced_at'];

    // Compare all fields except system fields
    const allFields = new Set([
      ...Object.keys(localRecord),
      ...Object.keys(serverRecord)
    ]);

    for (const field of allFields) {
      if (excludeFields.includes(field)) continue;

      const localValue = localRecord[field];
      const serverValue = serverRecord[field];

      // Handle different data types with normalization
      if (!this.valuesEqual(localValue, serverValue)) {
        conflictFields.push(field);
      }
    }

    return conflictFields;
  }

  /**
   * Compare values considering different data types and Odoo/SQLite conversion
   */
  private valuesEqual(localValue: any, serverValue: any): boolean {
    // Handle null/undefined
    if (localValue == null && serverValue == null) return true;
    if (localValue == null || serverValue == null) return false;

    // Handle arrays (many2many, one2many fields)
    if (Array.isArray(localValue) && Array.isArray(serverValue)) {
      if (localValue.length !== serverValue.length) return false;
      return localValue.every((val, index) => val === serverValue[index]);
    }

    // Handle objects
    if (typeof localValue === 'object' && typeof serverValue === 'object') {
      return JSON.stringify(localValue) === JSON.stringify(serverValue);
    }

    // NORMALIZE VALUES FOR COMPARISON
    const normalizedLocal = this.normalizeValue(localValue);
    const normalizedServer = this.normalizeValue(serverValue);

    return normalizedLocal === normalizedServer;
  }

  /**
   * Normalize values for consistent comparison between Odoo and SQLite
   */
  private normalizeValue(value: any): any {
    // Handle null/undefined
    if (value == null) return null;

    // Handle boolean conversion (Odoo: true/false, SQLite: 1/0)
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    if (value === 1 || value === '1' || value === 'true' || value === 'True') {
      return 1;
    }
    if (value === 0 || value === '0' || value === 'false' || value === 'False') {
      return 0;
    }

    // Handle string representations of booleans
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'yes' || lower === 'true') return 1;
      if (lower === 'no' || lower === 'false') return 0;
    }

    // Handle numeric strings
    if (typeof value === 'string' && !isNaN(Number(value))) {
      return Number(value);
    }

    // Handle dates - normalize to string format
    if (value instanceof Date) {
      return value.toISOString();
    }

    // Handle timestamp numbers (convert to consistent format)
    if (typeof value === 'number' && value > 1000000000) {
      // Looks like a timestamp, normalize it
      return new Date(value * 1000).toISOString();
    }

    return value;
  }

  /**
   * Resolve conflict manually (called from UI)
   */
  async resolveConflict(
    conflictId: string,
    strategy: 'local' | 'server'
  ): Promise<boolean> {
    return this.resolveConflictAuto(conflictId, strategy);
  }

  /**
   * Resolve conflict automatically based on strategy
   */
  async resolveConflictAuto(
    conflictId: string,
    strategy: 'local' | 'server' | 'merge'
  ): Promise<boolean> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) return false;

    try {
      let resolvedData: any;

      switch (strategy) {
        case 'local':
          resolvedData = conflict.localData;
          break;
        case 'server':
          resolvedData = conflict.serverData;
          break;
        case 'merge':
          resolvedData = this.mergeRecords(conflict.localData, conflict.serverData);
          break;
        default:
          throw new Error(`Unknown resolution strategy: ${strategy}`);
      }

      // Apply resolution
      await this.applyResolution(conflict, resolvedData, strategy);
      
      console.log(`✅ Auto-resolved conflict ${conflictId} using ${strategy} strategy`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to auto-resolve conflict ${conflictId}:`, error);
      return false;
    }
  }

  /**
   * Merge local and server records intelligently
   */
  private mergeRecords(localRecord: any, serverRecord: any): any {
    const merged = { ...serverRecord }; // Start with server data as base

    // Prefer local values for certain fields
    const preferLocalFields = ['name', 'email', 'phone', 'mobile'];
    
    for (const field of preferLocalFields) {
      if (localRecord[field] && localRecord[field] !== serverRecord[field]) {
        merged[field] = localRecord[field];
      }
    }

    // For write_date, use the most recent
    if (localRecord.write_date && serverRecord.write_date) {
      const localDate = new Date(localRecord.write_date);
      const serverDate = new Date(serverRecord.write_date);
      merged.write_date = localDate > serverDate ? localRecord.write_date : serverRecord.write_date;
    }

    return merged;
  }

  /**
   * Apply conflict resolution
   */
  private async applyResolution(
    conflict: SyncConflict, 
    resolvedData: any, 
    resolution: 'local' | 'server' | 'merge'
  ): Promise<void> {
    // Update local database with resolved data
    const tableName = this.getTableName(conflict.modelName);
    await databaseService.updateRecord(tableName, conflict.recordId, resolvedData);

    // Update conflict status
    conflict.status = 'resolved';
    conflict.resolution = resolution;
    conflict.resolvedAt = new Date().toISOString();
    conflict.resolvedBy = 'auto';

    // Save to database
    await this.updateConflictStatus(conflict);
    
    // Remove from memory
    this.conflicts.delete(conflict.id);
  }

  /**
   * Get all pending conflicts
   */
  async getPendingConflicts(): Promise<SyncConflict[]> {
    return Array.from(this.conflicts.values()).filter(c => c.status === 'pending');
  }

  /**
   * Get conflicts for a specific model
   */
  async getConflictsForModel(modelName: string): Promise<SyncConflict[]> {
    return Array.from(this.conflicts.values()).filter(c => 
      c.modelName === modelName && c.status === 'pending'
    );
  }

  /**
   * Save conflicts to database
   */
  async saveConflictsToDatabase(conflicts: SyncConflict[]): Promise<void> {
    return this.saveConflicts(conflicts);
  }

  /**
   * Save conflicts to database (internal method)
   */
  private async saveConflicts(conflicts: SyncConflict[]): Promise<void> {
    const db = databaseService.getDatabase();
    if (!db) throw new Error('Database not initialized');

    for (const conflict of conflicts) {
      await db.runAsync(`
        INSERT OR REPLACE INTO sync_conflicts (
          id, model_name, record_id, local_data, server_data, 
          conflict_fields, timestamp, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        conflict.id,
        conflict.modelName,
        conflict.recordId,
        JSON.stringify(conflict.localData),
        JSON.stringify(conflict.serverData),
        JSON.stringify(conflict.conflictFields),
        conflict.timestamp,
        conflict.status
      ]);
    }
  }

  /**
   * Load pending conflicts from database
   */
  private async loadPendingConflicts(): Promise<void> {
    const db = databaseService.getDatabase();
    if (!db) return;

    const results = await db.getAllAsync(`
      SELECT * FROM sync_conflicts WHERE status = 'pending'
    `);

    for (const row of results || []) {
      const conflict: SyncConflict = {
        id: row.id,
        modelName: row.model_name,
        recordId: row.record_id,
        localData: JSON.parse(row.local_data),
        serverData: JSON.parse(row.server_data),
        conflictFields: JSON.parse(row.conflict_fields),
        timestamp: row.timestamp,
        status: row.status,
        resolution: row.resolution,
        resolvedAt: row.resolved_at,
        resolvedBy: row.resolved_by
      };

      this.conflicts.set(conflict.id, conflict);
    }

    console.log(`📋 Loaded ${this.conflicts.size} pending conflicts`);
  }

  /**
   * Update conflict status in database
   */
  private async updateConflictStatus(conflict: SyncConflict): Promise<void> {
    const db = databaseService.getDatabase();
    if (!db) return;

    await db.runAsync(`
      UPDATE sync_conflicts 
      SET status = ?, resolution = ?, resolved_at = ?, resolved_by = ?
      WHERE id = ?
    `, [
      conflict.status,
      conflict.resolution,
      conflict.resolvedAt,
      conflict.resolvedBy,
      conflict.id
    ]);
  }

  /**
   * Get table name for model
   */
  private getTableName(modelName: string): string {
    return modelName.replace(/\./g, '_');
  }

  /**
   * Set resolution strategy
   */
  setResolutionStrategy(strategy: ConflictResolutionStrategy): void {
    this.resolutionStrategy = strategy;
  }

  /**
   * Get current resolution strategy
   */
  getResolutionStrategy(): ConflictResolutionStrategy {
    return this.resolutionStrategy;
  }

  /**
   * Clear resolved conflicts older than specified days
   */
  async cleanupOldConflicts(daysOld: number = 30): Promise<void> {
    const db = databaseService.getDatabase();
    if (!db) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    await db.runAsync(`
      DELETE FROM sync_conflicts
      WHERE status = 'resolved' AND resolved_at < ?
    `, [cutoffDate.toISOString()]);

    console.log(`🧹 Cleaned up conflicts older than ${daysOld} days`);
  }

  /**
   * Clear all mock/test conflicts (for cleanup)
   */
  async clearMockConflicts(): Promise<void> {
    const db = databaseService.getDatabase();
    if (!db) return;

    // Remove conflicts with test data patterns
    await db.runAsync(`
      DELETE FROM sync_conflicts
      WHERE local_data LIKE '%Test Contact%'
         OR local_data LIKE '%local@test.com%'
         OR local_data LIKE '%server@test.com%'
    `);

    // Clear from memory as well
    for (const [conflictId, conflict] of this.conflicts.entries()) {
      const localData = JSON.stringify(conflict.localData);
      if (localData.includes('Test Contact') ||
          localData.includes('local@test.com') ||
          localData.includes('server@test.com')) {
        this.conflicts.delete(conflictId);
      }
    }

    console.log('🧹 Cleared mock/test conflicts');
  }

  /**
   * Get all pending conflicts
   */
  async getAllConflicts(): Promise<SyncConflict[]> {
    return Array.from(this.conflicts.values()).filter(c => c.status === 'pending');
  }

  /**
   * Clear false positive conflicts caused by data type comparison issues
   */
  async clearFalsePositiveConflicts(): Promise<number> {
    const db = databaseService.getDatabase();
    if (!db) throw new Error('Database not initialized');

    console.log('🧹 Clearing false positive conflicts...');

    // Get all pending conflicts
    const conflicts = await db.getAllAsync(`
      SELECT * FROM sync_conflicts WHERE status = 'pending'
    `);

    let clearedCount = 0;

    for (const conflict of conflicts) {
      try {
        const localData = JSON.parse(conflict.local_data);
        const serverData = JSON.parse(conflict.server_data);

        // Re-check conflicts with improved comparison
        const actualConflictFields = this.findConflictingFields(localData, serverData);

        if (actualConflictFields.length === 0) {
          // No actual conflicts - remove this false positive
          await db.runAsync(`
            DELETE FROM sync_conflicts WHERE id = ?
          `, [conflict.id]);

          // Remove from memory cache
          this.conflicts.delete(conflict.id);
          clearedCount++;

          console.log(`✅ Cleared false positive conflict: ${conflict.model_name} record ${conflict.record_id}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to re-check conflict ${conflict.id}:`, error);
      }
    }

    console.log(`🧹 Cleared ${clearedCount} false positive conflicts`);
    return clearedCount;
  }
}

export const conflictResolutionService = new ConflictResolutionService();
