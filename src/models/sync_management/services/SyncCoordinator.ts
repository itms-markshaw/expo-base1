/**
 * Sync Coordinator - Prevents multiple sync operations from running simultaneously
 * BC-S016: Coordinates sync requests from different services
 */

class SyncCoordinator {
  private isSyncInProgress = false;
  private lastSyncStart = 0;
  private syncQueue: Array<{
    models: string[],
    source: string,
    resolve: Function,
    reject: Function
  }> = [];
  private isProcessingQueue = false;
  private syncServiceRef: any = null;

  /**
   * Set the sync service reference to avoid circular dependency
   */
  setSyncService(syncService: any): void {
    this.syncServiceRef = syncService;
  }

  /**
   * Request sync with coordination
   */
  async requestSync(models: string[], source: string): Promise<boolean> {
    const now = Date.now();
    
    // Check if sync is already in progress
    if (this.isSyncInProgress) {
      console.log(`⏳ Sync coordinator: ${source} request queued (sync in progress)`);
      
      // Add to queue and wait
      return new Promise((resolve, reject) => {
        this.syncQueue.push({ models, source, resolve, reject });
        
        // Auto-reject after 30 seconds to prevent hanging
        setTimeout(() => {
          const index = this.syncQueue.findIndex(item => item.source === source);
          if (index !== -1) {
            this.syncQueue.splice(index, 1);
            reject(new Error('Sync request timeout'));
          }
        }, 30000);
      });
    }

    // Check minimum interval between syncs (5 seconds)
    const timeSinceLastSync = now - this.lastSyncStart;
    if (timeSinceLastSync < 5000) {
      console.log(`⏳ Sync coordinator: ${source} request denied (too soon: ${Math.round(timeSinceLastSync / 1000)}s)`);
      return false;
    }

    // Start sync
    this.isSyncInProgress = true;
    this.lastSyncStart = now;
    
    console.log(`🚀 Sync coordinator: Starting sync for ${source} with models: ${models.join(', ')}`);
    
    try {
      // Check if sync service is available
      if (!this.syncServiceRef) {
        throw new Error('Sync service not initialized in coordinator');
      }

      await this.syncServiceRef.startSync(models);

      console.log(`✅ Sync coordinator: ${source} sync completed`);
      this.isSyncInProgress = false;

      // Process queue
      this.processQueue();

      return true;
    } catch (error: any) {
      console.error(`❌ Sync coordinator: ${source} sync failed:`, error.message);
      this.isSyncInProgress = false;

      // Process queue even if sync failed
      this.processQueue();

      throw error;
    }
  }

  /**
   * Process queued sync requests
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.syncQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.syncQueue.length > 0) {
      const request = this.syncQueue.shift();
      if (!request) break;

      try {
        console.log(`🔄 Sync coordinator: Processing queued request from ${request.source}`);
        const success = await this.requestSync(request.models, request.source);
        request.resolve(success);
      } catch (error) {
        request.reject(error);
      }

      // Small delay between queue processing
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.isProcessingQueue = false;
  }

  /**
   * Check if sync is currently in progress
   */
  isSyncRunning(): boolean {
    return this.isSyncInProgress;
  }

  /**
   * Get sync status info
   */
  getStatus(): {
    isSyncInProgress: boolean;
    queueLength: number;
    lastSyncStart: number;
    timeSinceLastSync: number;
  } {
    return {
      isSyncInProgress: this.isSyncInProgress,
      queueLength: this.syncQueue.length,
      lastSyncStart: this.lastSyncStart,
      timeSinceLastSync: Date.now() - this.lastSyncStart
    };
  }

  /**
   * Force clear sync state (emergency use only)
   */
  forceReset(): void {
    console.log('🔄 Sync coordinator: Force reset requested');
    this.isSyncInProgress = false;
    this.syncQueue.length = 0;
    this.isProcessingQueue = false;
  }

  /**
   * Cancel all queued requests
   */
  cancelQueue(): void {
    console.log(`🔄 Sync coordinator: Cancelling ${this.syncQueue.length} queued requests`);
    
    this.syncQueue.forEach(request => {
      request.reject(new Error('Sync request cancelled'));
    });
    
    this.syncQueue.length = 0;
  }
}

// Create singleton instance
export const syncCoordinator = new SyncCoordinator();
export default syncCoordinator;
