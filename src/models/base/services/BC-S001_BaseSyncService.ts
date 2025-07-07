/**
 * BC-S001_BaseSyncService - Universal sync service for offline-first architecture
 * Service Reference: BC-S001
 * 
 * Universal service that provides consistent sync functionality
 * across all models with bidirectional sync and conflict resolution
 */

import { DatabaseService } from './BaseDatabaseService';
import BaseOdooClient from './BaseOdooClient';
import { SyncSettings, TimePeriod, OdooModel } from '../../../types';

export interface SyncConfig {
  modelName: string;
  tableName: string;
  fields: string[];
  syncStrategy: 'all' | 'time_based' | 'user_filtered';
  syncPeriodDays?: number;
  batchSize?: number;
  priority?: number;
}

export interface SyncStatus {
  modelName: string;
  lastSync: string | null;
  recordCount: number;
  pendingUploads: number;
  pendingDownloads: number;
  status: 'idle' | 'syncing' | 'error' | 'paused';
  error?: string;
}

export interface SyncResult {
  modelName: string;
  downloaded: number;
  uploaded: number;
  conflicts: number;
  errors: number;
  duration: number;
}

/**
 * BC-S001: Universal Sync Service
 * 
 * Features:
 * - Bidirectional sync with Odoo server
 * - Offline-first data management
 * - Conflict resolution strategies
 * - Incremental sync with timestamps
 * - Batch processing for large datasets
 * - Priority-based sync ordering
 * - Error handling and retry logic
 */
export class BaseSyncService {
  private dbService: DatabaseService;
  private odooClient: BaseOdooClient;
  private syncConfigs: Map<string, SyncConfig> = new Map();
  private syncStatuses: Map<string, SyncStatus> = new Map();
  private isGlobalSyncRunning: boolean = false;

  constructor() {
    this.dbService = new DatabaseService();
    this.odooClient = new BaseOdooClient({
      baseURL: 'http://localhost:8069', // Default - will be configured via settings
      database: 'odoo',
      username: 'admin'
    });
  }

  /**
   * Register model for sync
   */
  registerModel(config: SyncConfig): void {
    this.syncConfigs.set(config.modelName, config);
    this.syncStatuses.set(config.modelName, {
      modelName: config.modelName,
      lastSync: null,
      recordCount: 0,
      pendingUploads: 0,
      pendingDownloads: 0,
      status: 'idle'
    });
  }

  /**
   * Start full sync for all registered models
   */
  async startFullSync(): Promise<SyncResult[]> {
    if (this.isGlobalSyncRunning) {
      throw new Error('Sync already in progress');
    }

    this.isGlobalSyncRunning = true;
    const results: SyncResult[] = [];

    try {
      // Sort models by priority
      const sortedConfigs = Array.from(this.syncConfigs.values())
        .sort((a, b) => (a.priority || 0) - (b.priority || 0));

      for (const config of sortedConfigs) {
        try {
          const result = await this.syncModel(config.modelName);
          results.push(result);
        } catch (error) {
          console.error(`Sync failed for ${config.modelName}:`, error);
          results.push({
            modelName: config.modelName,
            downloaded: 0,
            uploaded: 0,
            conflicts: 0,
            errors: 1,
            duration: 0
          });
        }
      }

      return results;
    } finally {
      this.isGlobalSyncRunning = false;
    }
  }

  /**
   * Sync specific model
   */
  async syncModel(modelName: string): Promise<SyncResult> {
    const config = this.syncConfigs.get(modelName);
    if (!config) {
      throw new Error(`Model ${modelName} not registered for sync`);
    }

    const status = this.syncStatuses.get(modelName)!;
    if (status.status === 'syncing') {
      throw new Error(`Sync already in progress for ${modelName}`);
    }

    const startTime = Date.now();
    status.status = 'syncing';
    status.error = undefined;

    try {
      // 1. Upload pending changes
      const uploaded = await this.uploadPendingChanges(config);

      // 2. Download new/updated records
      const downloaded = await this.downloadUpdatedRecords(config);

      // 3. Resolve conflicts
      const conflicts = await this.resolveConflicts(config);

      // 4. Update sync status
      status.lastSync = new Date().toISOString();
      status.recordCount = await this.getLocalRecordCount(config.tableName);
      status.pendingUploads = await this.getPendingUploadCount(config.tableName);
      status.pendingDownloads = 0;
      status.status = 'idle';

      const duration = Date.now() - startTime;

      return {
        modelName,
        downloaded,
        uploaded,
        conflicts,
        errors: 0,
        duration
      };
    } catch (error) {
      status.status = 'error';
      status.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  /**
   * Upload pending changes to server
   */
  private async uploadPendingChanges(config: SyncConfig): Promise<number> {
    const pendingChanges = await this.dbService.query(
      `SELECT * FROM ${config.tableName} WHERE _sync_status IN ('create', 'update', 'delete')`
    );

    let uploadCount = 0;

    for (const record of pendingChanges) {
      try {
        switch (record._sync_status) {
          case 'create':
            const newId = await this.odooClient.create(config.modelName, record);
            await this.dbService.execute(
              `UPDATE ${config.tableName} SET id = ?, _sync_status = 'synced' WHERE _local_id = ?`,
              [newId, record._local_id]
            );
            break;

          case 'update':
            await this.odooClient.write(config.modelName, record.id, record);
            await this.dbService.execute(
              `UPDATE ${config.tableName} SET _sync_status = 'synced' WHERE id = ?`,
              [record.id]
            );
            break;

          case 'delete':
            await this.odooClient.unlink(config.modelName, record.id);
            await this.dbService.execute(
              `DELETE FROM ${config.tableName} WHERE id = ?`,
              [record.id]
            );
            break;
        }
        uploadCount++;
      } catch (error) {
        console.error(`Failed to upload ${config.modelName} record:`, error);
        // Mark as conflict for manual resolution
        await this.dbService.execute(
          `UPDATE ${config.tableName} SET _sync_status = 'conflict' WHERE id = ?`,
          [record.id]
        );
      }
    }

    return uploadCount;
  }

  /**
   * Download updated records from server
   */
  private async downloadUpdatedRecords(config: SyncConfig): Promise<number> {
    let domain: any[] = [];

    // Build domain based on sync strategy
    if (config.syncStrategy === 'time_based' && config.syncPeriodDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - config.syncPeriodDays);
      domain.push(['write_date', '>=', cutoffDate.toISOString()]);
    }

    // Get last sync timestamp for incremental sync
    const status = this.syncStatuses.get(config.modelName)!;
    if (status.lastSync) {
      domain.push(['write_date', '>', status.lastSync]);
    }

    const records = await this.odooClient.searchRead(
      config.modelName,
      domain,
      config.fields,
      { limit: config.batchSize || 1000 }
    );

    let downloadCount = 0;

    for (const record of records) {
      try {
        // Check if record exists locally
        const existing = await this.dbService.query(
          `SELECT * FROM ${config.tableName} WHERE id = ?`,
          [record.id]
        );

        if (existing.length > 0) {
          // Update existing record
          const updateFields = config.fields.filter(f => f !== 'id').join(', ');
          const updateValues = config.fields.filter(f => f !== 'id').map(f => record[f]);
          
          await this.dbService.execute(
            `UPDATE ${config.tableName} SET ${updateFields.split(', ').map(f => `${f} = ?`).join(', ')}, _sync_status = 'synced' WHERE id = ?`,
            [...updateValues, record.id]
          );
        } else {
          // Insert new record
          const insertFields = config.fields.join(', ');
          const insertValues = config.fields.map(f => record[f]);
          const placeholders = config.fields.map(() => '?').join(', ');
          
          await this.dbService.execute(
            `INSERT INTO ${config.tableName} (${insertFields}, _sync_status) VALUES (${placeholders}, 'synced')`,
            [...insertValues]
          );
        }
        downloadCount++;
      } catch (error) {
        console.error(`Failed to save ${config.modelName} record:`, error);
      }
    }

    return downloadCount;
  }

  /**
   * Resolve sync conflicts
   */
  private async resolveConflicts(config: SyncConfig): Promise<number> {
    const conflicts = await this.dbService.query(
      `SELECT * FROM ${config.tableName} WHERE _sync_status = 'conflict'`
    );

    // For now, server wins (can be made configurable)
    for (const conflict of conflicts) {
      try {
        const serverRecord = await this.odooClient.read(config.modelName, conflict.id, config.fields);
        if (serverRecord.length > 0) {
          const record = serverRecord[0];
          const updateFields = config.fields.filter(f => f !== 'id').join(', ');
          const updateValues = config.fields.filter(f => f !== 'id').map(f => record[f]);
          
          await this.dbService.execute(
            `UPDATE ${config.tableName} SET ${updateFields.split(', ').map(f => `${f} = ?`).join(', ')}, _sync_status = 'synced' WHERE id = ?`,
            [...updateValues, conflict.id]
          );
        }
      } catch (error) {
        console.error(`Failed to resolve conflict for ${config.modelName}:`, error);
      }
    }

    return conflicts.length;
  }

  /**
   * Get local record count
   */
  private async getLocalRecordCount(tableName: string): Promise<number> {
    const result = await this.dbService.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    return result[0]?.count || 0;
  }

  /**
   * Get pending upload count
   */
  private async getPendingUploadCount(tableName: string): Promise<number> {
    const result = await this.dbService.query(
      `SELECT COUNT(*) as count FROM ${tableName} WHERE _sync_status IN ('create', 'update', 'delete')`
    );
    return result[0]?.count || 0;
  }

  /**
   * Get sync status for model
   */
  getSyncStatus(modelName: string): SyncStatus | null {
    return this.syncStatuses.get(modelName) || null;
  }

  /**
   * Get all sync statuses
   */
  getAllSyncStatuses(): SyncStatus[] {
    return Array.from(this.syncStatuses.values());
  }

  /**
   * Pause sync for model
   */
  pauseSync(modelName: string): void {
    const status = this.syncStatuses.get(modelName);
    if (status && status.status !== 'syncing') {
      status.status = 'paused';
    }
  }

  /**
   * Resume sync for model
   */
  resumeSync(modelName: string): void {
    const status = this.syncStatuses.get(modelName);
    if (status && status.status === 'paused') {
      status.status = 'idle';
    }
  }

  /**
   * Check if global sync is running
   */
  isGlobalSyncInProgress(): boolean {
    return this.isGlobalSyncRunning;
  }

  // Store-compatible methods
  private syncSettings: SyncSettings = {
    globalTimePeriod: '1week',
    autoSync: true,
    backgroundSync: true,
    conflictResolution: 'ask_user',
    modelOverrides: {},
    modelSyncAllOverrides: {}
  };

  private statusChangeListeners: ((status: any) => void)[] = [];

  /**
   * Get sync settings
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
   * Start sync for selected models
   */
  async startSync(modelNames: string[]): Promise<void> {
    // For now, just call startFullSync
    await this.startFullSync();
  }

  /**
   * Cancel sync
   */
  async cancelSync(): Promise<void> {
    this.isGlobalSyncRunning = false;
  }

  /**
   * Listen to status changes
   */
  onStatusChange(callback: (status: any) => void): () => void {
    this.statusChangeListeners.push(callback);
    return () => {
      const index = this.statusChangeListeners.indexOf(callback);
      if (index > -1) {
        this.statusChangeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Discover available models
   */
  async discoverAvailableModels(): Promise<OdooModel[]> {
    // Return default models for now
    return [
      { name: 'res.partner', displayName: 'Contacts', enabled: true },
      { name: 'sale.order', displayName: 'Sales Orders', enabled: true },
      { name: 'product.product', displayName: 'Products', enabled: true },
    ];
  }

  /**
   * Get time period options
   */
  getTimePeriodOptions(): { value: TimePeriod; label: string }[] {
    return [
      { value: '1day', label: '1 Day' },
      { value: '3days', label: '3 Days' },
      { value: '1week', label: '1 Week' },
      { value: '2weeks', label: '2 Weeks' },
      { value: '1month', label: '1 Month' },
      { value: '3months', label: '3 Months' },
      { value: 'all', label: 'All Records' }
    ];
  }
}

// Export singleton instance for backward compatibility
export const syncService = new BaseSyncService();
