/**
 * Base Model Service
 * Universal CRUD operations for all Odoo models
 */

import { authService } from '../../../services/auth';
import { databaseService } from '../../../services/database';
import { offlineQueueService } from '../../../services/offlineQueue';
import { BaseModel } from '../types/BaseModel';

export class BaseModelService<T extends BaseModel> {
  protected modelName: string;
  protected defaultFields: string[];
  protected searchFields: string[];

  constructor(modelName: string, defaultFields: string[] = [], searchFields: string[] = []) {
    this.modelName = modelName;
    this.defaultFields = defaultFields.length > 0 ? defaultFields : ['id', 'display_name', 'create_date', 'write_date'];
    this.searchFields = searchFields.length > 0 ? searchFields : ['name', 'display_name'];
  }

  /**
   * Search and read records from Odoo
   */
  async searchRead(
    domain: any[] = [],
    fields: string[] = this.defaultFields,
    options: {
      order?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<T[]> {
    try {
      const client = authService.getClient();
      if (!client) {
        throw new Error('Not authenticated');
      }

      const records = await client.searchRead(
        this.modelName,
        domain,
        fields,
        {
          order: options.order || 'id desc',
          limit: options.limit || 100,
          offset: options.offset || 0,
        }
      );

      return records as T[];
    } catch (error) {
      console.error(`Failed to search ${this.modelName}:`, error);
      // Fallback to local data if available
      return this.getLocalRecords(options.limit, options.offset);
    }
  }

  /**
   * Read specific record by ID
   */
  async read(id: number, fields: string[] = this.defaultFields): Promise<T | null> {
    try {
      const client = authService.getClient();
      if (!client) {
        throw new Error('Not authenticated');
      }

      const records = await client.read(this.modelName, [id], fields);
      return records.length > 0 ? records[0] as T : null;
    } catch (error) {
      console.error(`Failed to read ${this.modelName} ${id}:`, error);
      // Fallback to local data
      return this.getLocalRecord(id);
    }
  }

  /**
   * Create new record
   */
  async create(data: Partial<T>): Promise<number> {
    try {
      const client = authService.getClient();
      if (!client) {
        // Queue for offline processing
        const operationId = await offlineQueueService.queueOperation('create', this.modelName, data);
        console.log(`Queued create operation: ${operationId}`);
        return -1; // Temporary ID for offline
      }

      const recordId = await client.create(this.modelName, data);
      console.log(`Created ${this.modelName} record: ${recordId}`);
      return recordId;
    } catch (error) {
      console.error(`Failed to create ${this.modelName}:`, error);
      // Queue for offline processing
      const operationId = await offlineQueueService.queueOperation('create', this.modelName, data);
      console.log(`Queued create operation due to error: ${operationId}`);
      throw error;
    }
  }

  /**
   * Update existing record
   */
  async update(id: number, data: Partial<T>): Promise<boolean> {
    try {
      const client = authService.getClient();
      if (!client) {
        // Queue for offline processing
        const operationId = await offlineQueueService.queueOperation('update', this.modelName, data, id);
        console.log(`Queued update operation: ${operationId}`);
        return false;
      }

      const success = await client.write(this.modelName, [id], data);
      console.log(`Updated ${this.modelName} record ${id}: ${success}`);
      return success;
    } catch (error) {
      console.error(`Failed to update ${this.modelName} ${id}:`, error);
      // Queue for offline processing
      const operationId = await offlineQueueService.queueOperation('update', this.modelName, data, id);
      console.log(`Queued update operation due to error: ${operationId}`);
      throw error;
    }
  }

  /**
   * Delete record
   */
  async delete(id: number): Promise<boolean> {
    try {
      const client = authService.getClient();
      if (!client) {
        // Queue for offline processing
        const operationId = await offlineQueueService.queueOperation('delete', this.modelName, { id }, id);
        console.log(`Queued delete operation: ${operationId}`);
        return false;
      }

      const success = await client.unlink(this.modelName, [id]);
      console.log(`Deleted ${this.modelName} record ${id}: ${success}`);
      return success;
    } catch (error) {
      console.error(`Failed to delete ${this.modelName} ${id}:`, error);
      // Queue for offline processing
      const operationId = await offlineQueueService.queueOperation('delete', this.modelName, { id }, id);
      console.log(`Queued delete operation due to error: ${operationId}`);
      throw error;
    }
  }

  /**
   * Search records with query
   */
  async search(query: string, limit: number = 20): Promise<T[]> {
    if (!query.trim()) {
      return this.searchRead([], this.defaultFields, { limit });
    }

    const domain = this.buildSearchDomain(query);
    return this.searchRead(domain, this.defaultFields, { limit });
  }

  /**
   * Get records from local SQLite database
   */
  async getLocalRecords(limit: number = 100, offset: number = 0): Promise<T[]> {
    try {
      const records = await databaseService.getRecords(this.modelName, limit, offset);
      return records as T[];
    } catch (error) {
      console.error(`Failed to get local ${this.modelName} records:`, error);
      return [];
    }
  }

  /**
   * Get specific record from local database
   */
  async getLocalRecord(id: number): Promise<T | null> {
    try {
      const records = await databaseService.getRecords(this.modelName, 1, 0);
      const record = records.find(r => r.id === id);
      return record as T || null;
    } catch (error) {
      console.error(`Failed to get local ${this.modelName} record ${id}:`, error);
      return null;
    }
  }

  /**
   * Build search domain for text search
   */
  protected buildSearchDomain(query: string): any[] {
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    const domain: any[] = [];

    searchTerms.forEach(term => {
      const fieldConditions = this.searchFields.map(field => [field, 'ilike', term]);
      if (fieldConditions.length > 1) {
        domain.push(['|', ...fieldConditions]);
      } else if (fieldConditions.length === 1) {
        domain.push(fieldConditions[0]);
      }
    });

    return domain;
  }

  /**
   * Get model configuration
   */
  getModelName(): string {
    return this.modelName;
  }

  getDefaultFields(): string[] {
    return this.defaultFields;
  }

  getSearchFields(): string[] {
    return this.searchFields;
  }
}
