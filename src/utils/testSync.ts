/**
 * Test utilities for sync functionality
 * Used to test auto-sync, conflict resolution, and offline queue
 */

import { autoSyncService } from '../models/sync_management/services/AutoSyncService';
import { conflictResolutionService } from '../models/sync_management/services/ConflictResolutionService';
import { offlineQueueService } from '../models/sync_management/services/OfflineQueueService';
import { syncService } from '../models/base/services/BaseSyncService';

export class SyncTestUtils {
  /**
   * Test auto-sync functionality
   */
  static async testAutoSync(): Promise<void> {
    console.log('🧪 Testing auto-sync functionality...');
    
    try {
      // Initialize auto-sync service
      await autoSyncService.initialize();
      
      // Get current settings
      const settings = autoSyncService.getSettings();
      console.log('📋 Current auto-sync settings:', settings);
      
      // Test force sync
      await autoSyncService.forceSyncNow();
      
      // Get sync info
      const syncInfo = autoSyncService.getSyncInfo();
      console.log('📊 Sync info:', syncInfo);
      
      console.log('✅ Auto-sync test completed');
    } catch (error) {
      console.error('❌ Auto-sync test failed:', error);
    }
  }

  /**
   * Test conflict resolution (without creating mock data)
   */
  static async testConflictResolution(): Promise<void> {
    console.log('🧪 Testing conflict resolution service...');

    try {
      // Initialize conflict resolution service
      await conflictResolutionService.initialize();

      // Get existing pending conflicts (from real sync operations)
      const pendingConflicts = await conflictResolutionService.getPendingConflicts();
      console.log(`📋 Found ${pendingConflicts.length} real conflicts`);

      if (pendingConflicts.length > 0) {
        console.log('🔍 Conflict details:');
        pendingConflicts.forEach((conflict, index) => {
          console.log(`  ${index + 1}. ${conflict.modelName} (Record ${conflict.recordId})`);
          console.log(`     Fields: ${conflict.conflictFields.join(', ')}`);
          console.log(`     Status: ${conflict.status}`);
        });
      } else {
        console.log('✅ No conflicts found - sync is working smoothly');
      }

      console.log('✅ Conflict resolution service test completed');
    } catch (error) {
      console.error('❌ Conflict resolution test failed:', error);
    }
  }

  /**
   * Test offline queue
   */
  static async testOfflineQueue(): Promise<void> {
    console.log('🧪 Testing offline queue...');
    
    try {
      // Initialize offline queue service
      await offlineQueueService.initialize();
      
      // Queue a test operation
      const operationId = await offlineQueueService.queueOperation(
        'create',
        'res.partner',
        {
          name: 'Test Queue Contact',
          email: 'queue@test.com'
        }
      );
      
      console.log(`📥 Queued operation: ${operationId}`);
      
      // Get queue status
      const pendingCount = offlineQueueService.getPendingCount();
      const failedCount = offlineQueueService.getFailedCount();
      
      console.log(`📊 Queue status - Pending: ${pendingCount}, Failed: ${failedCount}`);
      
      // Process queue (this will likely fail due to test data, but that's expected)
      await offlineQueueService.processQueue();
      
      // Get all operations
      const allOperations = offlineQueueService.getAllOperations();
      console.log(`📋 Total operations in queue: ${allOperations.length}`);
      
      console.log('✅ Offline queue test completed');
    } catch (error) {
      console.error('❌ Offline queue test failed:', error);
    }
  }

  /**
   * Test sync with conflict detection
   */
  static async testSyncWithConflicts(): Promise<void> {
    console.log('🧪 Testing sync with conflict detection...');

    try {
      // Start a sync operation with a small set of models
      const testModels = ['res.partner', 'res.users'];

      console.log(`🚀 Starting sync for models: ${testModels.join(', ')}`);

      await syncService.startSync(testModels);

      console.log('✅ Sync with conflict detection test completed');
    } catch (error) {
      console.error('❌ Sync with conflict detection test failed:', error);
    }
  }

  /**
   * Test incremental sync functionality
   */
  static async testIncrementalSync(): Promise<void> {
    console.log('🧪 Testing incremental sync...');

    try {
      const testModel = 'res.partner';

      // First sync - should be initial sync
      console.log('📥 Running initial sync...');
      await syncService.startSync([testModel]);

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Second sync - should be incremental
      console.log('🔄 Running incremental sync...');
      await syncService.startSync([testModel]);

      console.log('✅ Incremental sync test completed');
    } catch (error) {
      console.error('❌ Incremental sync test failed:', error);
    }
  }

  /**
   * Run all tests
   */
  static async runAllTests(): Promise<void> {
    console.log('🧪 Running all sync tests...');

    await this.testAutoSync();
    await this.testConflictResolution();
    await this.testOfflineQueue();
    await this.testSyncWithConflicts();
    await this.testIncrementalSync();

    console.log('✅ All sync tests completed');
  }

  /**
   * Get system status for debugging
   */
  static async getSystemStatus(): Promise<{
    autoSync: any;
    conflicts: number;
    queueStatus: any;
    syncStatus: any;
  }> {
    try {
      // Initialize services
      await autoSyncService.initialize();
      await conflictResolutionService.initialize();
      await offlineQueueService.initialize();
      
      const syncInfo = autoSyncService.getSyncInfo();
      const pendingConflicts = await conflictResolutionService.getPendingConflicts();
      const queueStatus = {
        pending: offlineQueueService.getPendingCount(),
        failed: offlineQueueService.getFailedCount(),
        total: offlineQueueService.getAllOperations().length
      };
      const syncStatus = syncService.getStatus();
      
      return {
        autoSync: syncInfo,
        conflicts: pendingConflicts.length,
        queueStatus,
        syncStatus
      };
    } catch (error) {
      console.error('Failed to get system status:', error);
      return {
        autoSync: null,
        conflicts: 0,
        queueStatus: { pending: 0, failed: 0, total: 0 },
        syncStatus: null
      };
    }
  }
}

// Export for easy access in development
export const testSync = SyncTestUtils;
