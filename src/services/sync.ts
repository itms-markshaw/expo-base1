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
        name: 'res.users',
        displayName: 'Users',
        description: 'System users',
        enabled: true,
      },
    ];
  }

  /**
   * Start sync process
   */
  async startSync(selectedModels: string[] = ['res.partner', 'res.users']): Promise<void> {
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
      'res.users': 'users',
    };
    
    return tableMap[modelName] || modelName.replace('.', '_');
  }

  /**
   * Get fields to sync for model
   */
  private getFieldsForModel(modelName: string): string[] {
    const fieldMap: { [key: string]: string[] } = {
      'res.partner': ['name', 'email', 'phone', 'is_company', 'create_date', 'write_date'],
      'res.users': ['name', 'login', 'email', 'create_date', 'write_date'],
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
