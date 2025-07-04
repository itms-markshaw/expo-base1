/**
 * OfflineQueueService - Offline Queue Service
 * Model-specific service for sync.management
 *
 * MIGRATED: From src/services/offlineQueue.ts
 * Manages operations that failed due to network issues and retries them when online
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { databaseService } from '../../base/services/BaseDatabaseService';
import { authService } from '../../base/services/BaseAuthService';

export interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'sync';
  modelName: string;
  recordId?: number;
  data: any;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  lastAttempt?: string;
}

class OfflineQueueService {
  private queue: Map<string, QueuedOperation> = new Map();
  private isProcessing = false;
  private retryInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize offline queue service
   */
  async initialize(): Promise<void> {
    try {
      await databaseService.initialize();
      await this.createQueueTable();
      await this.loadPendingOperations();
      await this.loadQueueFromStorage(); // Load backup from AsyncStorage
      this.startRetryProcessor();
      console.log('✅ Offline queue service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize offline queue service:', error);
      throw error;
    }
  }

  /**
   * Create queue table
   */
  private async createQueueTable(): Promise<void> {
    const db = databaseService.getDatabase();
    if (!db) throw new Error('Database not initialized');

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS offline_queue (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        model_name TEXT NOT NULL,
        record_id INTEGER,
        data TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        status TEXT DEFAULT 'pending',
        error TEXT,
        last_attempt TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_offline_queue_status 
      ON offline_queue(status);
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_offline_queue_timestamp
      ON offline_queue(timestamp);
    `);

    // Add unique constraint for duplicate prevention
    await db.execAsync(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_offline_queue_unique
      ON offline_queue(type, model_name, record_id, data)
      WHERE status IN ('pending', 'processing');
    `);
  }

  /**
   * Add operation to queue
   */
  async queueOperation(
    type: 'create' | 'update' | 'delete' | 'sync',
    modelName: string,
    data: any,
    recordId?: number,
    maxRetries: number = 3
  ): Promise<string> {
    // Check for existing pending/processing operations to prevent duplicates
    const existingOp = await this.findDuplicateOperation(type, modelName, data, recordId);
    if (existingOp) {
      console.log(`⚠️ Duplicate operation detected, skipping: ${type} ${modelName}:${recordId || 'new'}`);
      return existingOp.id;
    }

    const operation: QueuedOperation = {
      id: `${type}_${modelName}_${recordId || 'new'}_${Date.now()}`,
      type,
      modelName,
      recordId,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      maxRetries,
      status: 'pending'
    };

    // Add to memory queue
    this.queue.set(operation.id, operation);

    // Save to database
    await this.saveOperation(operation);

    // Also save to AsyncStorage as backup
    await this.saveQueueToStorage();

    console.log(`📥 Queued ${type} operation for ${modelName}:${recordId || 'new'}`);
    return operation.id;
  }

  /**
   * Find duplicate operation to prevent multiple queuing
   */
  private async findDuplicateOperation(
    type: string,
    modelName: string,
    data: any,
    recordId?: number
  ): Promise<QueuedOperation | null> {
    const db = databaseService.getDatabase();
    if (!db) return null;

    try {
      const dataStr = JSON.stringify(data);
      const result = await db.getFirstAsync(`
        SELECT * FROM offline_queue
        WHERE type = ? AND model_name = ? AND record_id = ? AND data = ?
        AND status IN ('pending', 'processing')
        LIMIT 1
      `, [type, modelName, recordId || null, dataStr]);

      if (result) {
        return {
          id: result.id as string,
          type: result.type as any,
          modelName: result.model_name as string,
          recordId: result.record_id as number,
          data: JSON.parse(result.data as string),
          timestamp: result.timestamp as string,
          retryCount: result.retry_count as number,
          maxRetries: result.max_retries as number,
          status: result.status as any,
          error: result.error as string,
          lastAttempt: result.last_attempt as string
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking for duplicate operation:', error);
      return null;
    }
  }

  /**
   * Process all pending operations
   */
  async processQueue(): Promise<{ success: boolean; message: string; processed: number }> {
    if (this.isProcessing) {
      console.log('⏳ Queue processing already in progress');
      return { success: false, message: 'Queue processing already in progress', processed: 0 };
    }

    // Check if we're online
    const isOnline = await this.checkConnectivity();
    if (!isOnline) {
      console.log('📴 Offline - cannot process queue');
      return { success: false, message: 'Cannot process queue while offline', processed: 0 };
    }

    this.isProcessing = true;
    console.log('🔄 Processing offline queue...');

    let processedCount = 0;
    try {
      const pendingOps = Array.from(this.queue.values())
        .filter(op => op.status === 'pending')
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      console.log(`📋 Found ${pendingOps.length} pending operations`);

      if (pendingOps.length === 0) {
        return { success: true, message: 'No pending operations to process', processed: 0 };
      }

      for (const operation of pendingOps) {
        const success = await this.processOperation(operation);
        if (success) {
          processedCount++;
        }

        // Small delay between operations to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const message = `Successfully processed ${processedCount} of ${pendingOps.length} operations`;
      console.log(`✅ ${message}`);
      return { success: true, message, processed: processedCount };
    } catch (error) {
      console.error('❌ Queue processing failed:', error);
      return { success: false, message: `Queue processing failed: ${error.message}`, processed: processedCount };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single operation
   */
  private async processOperation(operation: QueuedOperation): Promise<boolean> {
    try {
      operation.status = 'processing';
      operation.lastAttempt = new Date().toISOString();
      await this.updateOperation(operation);

      const client = authService.getClient();
      if (!client) {
        throw new Error('No Odoo client available');
      }

      let success = false;

      switch (operation.type) {
        case 'create':
          const createResult = await client.create(operation.modelName, operation.data);
          if (createResult) {
            console.log(`✅ Created record in ${operation.modelName}: ${createResult}`);
            success = true;
          }
          break;

        case 'update':
          if (!operation.recordId) throw new Error('Record ID required for update');
          await client.update(operation.modelName, operation.recordId, operation.data);
          console.log(`✅ Updated record ${operation.recordId} in ${operation.modelName}`);
          success = true;
          break;

        case 'delete':
          if (!operation.recordId) throw new Error('Record ID required for delete');
          await client.delete(operation.modelName, operation.recordId);
          console.log(`✅ Deleted record ${operation.recordId} from ${operation.modelName}`);
          success = true;
          break;

        case 'sync':
          // Custom sync operation - would need specific implementation
          console.log(`🔄 Processing sync operation for ${operation.modelName}`);
          success = true;
          break;

        default:
          throw new Error(`Unknown operation type: ${operation.type}`);
      }

      if (success) {
        operation.status = 'completed';
        await this.updateOperation(operation);

        // Remove from memory queue after successful completion
        this.queue.delete(operation.id);

        console.log(`✅ Operation ${operation.id} completed successfully and removed from queue`);

        // Also save updated queue to storage
        await this.saveQueueToStorage();
        return true;
      }

      return false;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Operation ${operation.id} failed:`, errorMessage);

      operation.retryCount++;
      operation.error = errorMessage;

      if (operation.retryCount >= operation.maxRetries) {
        operation.status = 'failed';
        console.error(`💀 Operation ${operation.id} failed permanently after ${operation.retryCount} attempts`);
      } else {
        operation.status = 'pending';
        console.log(`🔄 Operation ${operation.id} will retry (${operation.retryCount}/${operation.maxRetries})`);
      }

      await this.updateOperation(operation);
      return false;
    }
  }

  /**
   * Check network connectivity
   */
  private async checkConnectivity(): Promise<boolean> {
    try {
      const isAuth = await authService.isAuthenticated();
      if (!isAuth) return false;

      const client = authService.getClient();
      if (!client) return false;

      // Simple connectivity test
      await client.searchCount('res.users', []);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Start retry processor
   */
  private startRetryProcessor(): void {
    // Process queue every 2 minutes
    this.retryInterval = setInterval(async () => {
      try {
        await this.processQueue();
      } catch (error) {
        console.warn('Retry processor error:', error);
      }
    }, 2 * 60 * 1000);
  }

  /**
   * Stop retry processor
   */
  stopRetryProcessor(): void {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
  }

  /**
   * Get pending operations count
   */
  getPendingCount(): number {
    return Array.from(this.queue.values()).filter(op => op.status === 'pending').length;
  }

  /**
   * Get failed operations count
   */
  getFailedCount(): number {
    return Array.from(this.queue.values()).filter(op => op.status === 'failed').length;
  }

  /**
   * Get all operations for display
   */
  getAllOperations(): QueuedOperation[] {
    return Array.from(this.queue.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Get queued operations (including from database for debugging)
   */
  async getQueuedOperations(): Promise<QueuedOperation[]> {
    const db = databaseService.getDatabase();
    if (!db) return this.getAllOperations();

    try {
      const results = await db.getAllAsync(`
        SELECT * FROM offline_queue
        ORDER BY timestamp DESC
      `);

      const operations: QueuedOperation[] = [];
      for (const row of results || []) {
        operations.push({
          id: row.id,
          type: row.type,
          modelName: row.model_name,
          recordId: row.record_id,
          data: JSON.parse(row.data),
          timestamp: row.timestamp,
          retryCount: row.retry_count,
          maxRetries: row.max_retries,
          status: row.status,
          error: row.error,
          lastAttempt: row.last_attempt
        });
      }

      return operations;
    } catch (error) {
      console.error('Failed to get queued operations from database:', error);
      return this.getAllOperations();
    }
  }

  /**
   * Clear completed operations
   */
  async clearCompleted(): Promise<void> {
    const db = databaseService.getDatabase();
    if (!db) return;

    await db.runAsync(`
      DELETE FROM offline_queue WHERE status = 'completed'
    `);

    // Remove from memory
    for (const [id, op] of this.queue) {
      if (op.status === 'completed') {
        this.queue.delete(id);
      }
    }

    console.log('🧹 Cleared completed operations from queue');
  }

  /**
   * Clear all operations
   */
  async clearAll(): Promise<void> {
    const db = databaseService.getDatabase();
    if (!db) return;

    await db.runAsync(`DELETE FROM offline_queue`);

    // Clear memory queue
    this.queue.clear();

    console.log('🧹 Cleared all operations from queue');
  }

  /**
   * Retry failed operation
   */
  async retryOperation(operationId: string): Promise<void> {
    const operation = this.queue.get(operationId);
    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }

    if (operation.status !== 'failed') {
      throw new Error(`Operation ${operationId} is not in failed state`);
    }

    // Reset for retry
    operation.status = 'pending';
    operation.retryCount = 0;
    operation.error = undefined;
    
    await this.updateOperation(operation);
    console.log(`🔄 Operation ${operationId} queued for retry`);
  }

  /**
   * Save operation to database
   */
  private async saveOperation(operation: QueuedOperation): Promise<void> {
    const db = databaseService.getDatabase();
    if (!db) return;

    await db.runAsync(`
      INSERT OR REPLACE INTO offline_queue (
        id, type, model_name, record_id, data, timestamp,
        retry_count, max_retries, status, error, last_attempt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      operation.id,
      operation.type,
      operation.modelName,
      operation.recordId || null,
      JSON.stringify(operation.data),
      operation.timestamp,
      operation.retryCount,
      operation.maxRetries,
      operation.status,
      operation.error || null,
      operation.lastAttempt || null
    ]);
  }

  /**
   * Update operation in database
   */
  private async updateOperation(operation: QueuedOperation): Promise<void> {
    const db = databaseService.getDatabase();
    if (!db) return;

    await db.runAsync(`
      UPDATE offline_queue 
      SET retry_count = ?, status = ?, error = ?, last_attempt = ?
      WHERE id = ?
    `, [
      operation.retryCount,
      operation.status,
      operation.error || null,
      operation.lastAttempt || null,
      operation.id
    ]);
  }

  /**
   * Load pending operations from database
   */
  private async loadPendingOperations(): Promise<void> {
    const db = databaseService.getDatabase();
    if (!db) return;

    const results = await db.getAllAsync(`
      SELECT * FROM offline_queue 
      WHERE status IN ('pending', 'failed')
      ORDER BY timestamp ASC
    `);

    for (const row of results || []) {
      const operation: QueuedOperation = {
        id: row.id,
        type: row.type,
        modelName: row.model_name,
        recordId: row.record_id,
        data: JSON.parse(row.data),
        timestamp: row.timestamp,
        retryCount: row.retry_count,
        maxRetries: row.max_retries,
        status: row.status,
        error: row.error,
        lastAttempt: row.last_attempt
      };

      this.queue.set(operation.id, operation);
    }

    console.log(`📋 Loaded ${this.queue.size} operations from offline queue`);
  }

  /**
   * Load queue from AsyncStorage (backup persistence)
   */
  private async loadQueueFromStorage(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem('offline_queue_backup');
      if (queueData) {
        const operations: QueuedOperation[] = JSON.parse(queueData);
        for (const operation of operations) {
          if (!this.queue.has(operation.id)) {
            this.queue.set(operation.id, operation);
          }
        }
        console.log(`📦 Loaded ${operations.length} operations from AsyncStorage backup`);
      }
    } catch (error) {
      console.error('Failed to load offline queue from AsyncStorage:', error);
    }
  }

  /**
   * Save queue to AsyncStorage (backup persistence)
   */
  private async saveQueueToStorage(): Promise<void> {
    try {
      const operations = Array.from(this.queue.values());
      await AsyncStorage.setItem('offline_queue_backup', JSON.stringify(operations));
    } catch (error) {
      console.error('Failed to save offline queue to AsyncStorage:', error);
    }
  }

  /**
   * Get queue statistics for debugging
   */
  getQueueStats(): { total: number; pending: number; failed: number; processing: boolean } {
    const operations = Array.from(this.queue.values());
    const failed = operations.filter(op => op.status === 'failed').length;
    const pending = operations.filter(op => op.status === 'pending').length;

    return {
      total: operations.length,
      pending,
      failed,
      processing: this.isProcessing
    };
  }

  /**
   * Get all operations in the queue
   */
  getAllOperations(): QueuedOperation[] {
    return Array.from(this.queue.values());
  }

  /**
   * Get count of pending operations
   */
  getPendingCount(): number {
    return Array.from(this.queue.values()).filter(op => op.status === 'pending').length;
  }

  /**
   * Get count of failed operations
   */
  getFailedCount(): number {
    return Array.from(this.queue.values()).filter(op => op.status === 'failed').length;
  }
}

export const offlineQueueService = new OfflineQueueService();
