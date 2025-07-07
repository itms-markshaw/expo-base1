/**
 * OfflineMessageService - Offline-First Message Storage
 * Provides SQLite-based message storage with sync capabilities
 * 
 * Features:
 * - Offline-first message storage
 * - Sync queue management
 * - Media attachment handling
 * - Message conflict resolution
 */

import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

export interface OfflineMessage {
  id: string;
  server_id?: number;
  channel_id: number;
  author_id: number;
  author_name: string;
  body: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'document';
  timestamp: number;
  sync_status: 'pending' | 'synced' | 'failed';
  local_media_path?: string;
  server_media_url?: string;
  media_type?: string;
  media_size?: number;
  media_duration?: number;
  reply_to_id?: string;
  mentions?: string; // JSON array of user IDs
  reactions?: string; // JSON object of reactions
  edited_timestamp?: number;
  create_date: string;
  write_date: string;
}

export interface MediaAttachment {
  uri: string;
  type: 'image' | 'video' | 'audio' | 'document';
  mimeType: string;
  size: number;
  name?: string;
  duration?: number;
  thumbnailUri?: string;
  waveform?: number[];
}

export class OfflineMessageService {
  private db: SQLite.Database | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔧 Initializing OfflineMessageService...');
      
      this.db = await SQLite.openDatabaseAsync('chat_messages.db');
      
      await this.createTables();
      await this.runMigrations();
      
      this.isInitialized = true;
      console.log('✅ OfflineMessageService initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize OfflineMessageService:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        server_id INTEGER,
        channel_id INTEGER NOT NULL,
        author_id INTEGER,
        author_name TEXT,
        body TEXT,
        message_type TEXT DEFAULT 'text',
        timestamp INTEGER NOT NULL,
        sync_status TEXT DEFAULT 'pending',
        local_media_path TEXT,
        server_media_url TEXT,
        media_type TEXT,
        media_size INTEGER,
        media_duration INTEGER,
        reply_to_id TEXT,
        mentions TEXT,
        reactions TEXT,
        edited_timestamp INTEGER,
        create_date TEXT,
        write_date TEXT,
        FOREIGN KEY (reply_to_id) REFERENCES messages(id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_channel_timestamp ON messages(channel_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_sync_status ON messages(sync_status);
      CREATE INDEX IF NOT EXISTS idx_server_id ON messages(server_id);
      CREATE INDEX IF NOT EXISTS idx_author_id ON messages(author_id);
      
      CREATE TABLE IF NOT EXISTS media_cache (
        id TEXT PRIMARY KEY,
        original_url TEXT NOT NULL,
        local_path TEXT NOT NULL,
        mime_type TEXT,
        file_size INTEGER,
        cached_at INTEGER,
        last_accessed INTEGER
      );
      
      CREATE INDEX IF NOT EXISTS idx_media_url ON media_cache(original_url);
      CREATE INDEX IF NOT EXISTS idx_media_accessed ON media_cache(last_accessed);
    `);
  }

  private async runMigrations(): Promise<void> {
    // Add any future database migrations here
    console.log('🔄 Running database migrations...');
  }

  async saveMessage(messageData: Partial<OfflineMessage>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const localId = messageData.id || await this.generateLocalId();
    const timestamp = messageData.timestamp || Date.now();
    const now = new Date().toISOString();

    const message: OfflineMessage = {
      id: localId,
      server_id: messageData.server_id || undefined,
      channel_id: messageData.channel_id!,
      author_id: messageData.author_id!,
      author_name: messageData.author_name || 'Unknown',
      body: messageData.body || '',
      message_type: messageData.message_type || 'text',
      timestamp,
      sync_status: messageData.server_id ? 'synced' : 'pending',
      local_media_path: messageData.local_media_path,
      server_media_url: messageData.server_media_url,
      media_type: messageData.media_type,
      media_size: messageData.media_size,
      media_duration: messageData.media_duration,
      reply_to_id: messageData.reply_to_id,
      mentions: messageData.mentions,
      reactions: messageData.reactions,
      edited_timestamp: messageData.edited_timestamp,
      create_date: messageData.create_date || now,
      write_date: messageData.write_date || now,
    };

    await this.db.runAsync(
      `INSERT OR REPLACE INTO messages (
        id, server_id, channel_id, author_id, author_name, 
        body, message_type, timestamp, sync_status, local_media_path,
        server_media_url, media_type, media_size, media_duration,
        reply_to_id, mentions, reactions, edited_timestamp,
        create_date, write_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id, message.server_id, message.channel_id, message.author_id,
        message.author_name, message.body, message.message_type, message.timestamp,
        message.sync_status, message.local_media_path, message.server_media_url,
        message.media_type, message.media_size, message.media_duration,
        message.reply_to_id, message.mentions, message.reactions,
        message.edited_timestamp, message.create_date, message.write_date
      ]
    );

    console.log(`💾 Saved message ${localId} to SQLite (status: ${message.sync_status})`);
    return localId;
  }

  async getChannelMessages(channelId: number, limit = 50, offset = 0): Promise<OfflineMessage[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(
      'SELECT * FROM messages WHERE channel_id = ? ORDER BY timestamp DESC LIMIT ? OFFSET ?',
      [channelId, limit, offset]
    ) as OfflineMessage[];

    return result.reverse(); // Return in chronological order
  }

  async getPendingSyncMessages(): Promise<OfflineMessage[]> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(
      'SELECT * FROM messages WHERE sync_status = "pending" ORDER BY timestamp ASC'
    ) as OfflineMessage[];

    return result;
  }

  async updateSyncStatus(localId: string, status: 'pending' | 'synced' | 'failed', serverId?: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const updateData = [status, localId];
    let query = 'UPDATE messages SET sync_status = ?';
    
    if (serverId) {
      query += ', server_id = ?';
      updateData.splice(1, 0, serverId);
    }
    
    query += ' WHERE id = ?';

    await this.db.runAsync(query, updateData);
    console.log(`🔄 Updated message ${localId} sync status to ${status}`);
  }

  async getLastMessage(channelId: number): Promise<OfflineMessage | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync(
      'SELECT * FROM messages WHERE channel_id = ? ORDER BY timestamp DESC LIMIT 1',
      [channelId]
    ) as OfflineMessage | null;

    return result;
  }

  async deleteMessage(messageId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM messages WHERE id = ?', [messageId]);
    console.log(`🗑️ Deleted message ${messageId}`);
  }

  async clearChannelMessages(channelId: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync('DELETE FROM messages WHERE channel_id = ?', [channelId]);
    console.log(`🗑️ Cleared all messages for channel ${channelId}`);
  }

  async saveMediaToCache(url: string, localPath: string, mimeType: string, fileSize: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const cacheId = await this.generateLocalId();
    const now = Date.now();

    await this.db.runAsync(
      `INSERT OR REPLACE INTO media_cache (
        id, original_url, local_path, mime_type, file_size, cached_at, last_accessed
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cacheId, url, localPath, mimeType, fileSize, now, now]
    );
  }

  async getCachedMediaPath(url: string): Promise<string | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync(
      'SELECT local_path FROM media_cache WHERE original_url = ?',
      [url]
    ) as { local_path: string } | null;

    if (result) {
      // Update last accessed time
      await this.db.runAsync(
        'UPDATE media_cache SET last_accessed = ? WHERE original_url = ?',
        [Date.now(), url]
      );
      return result.local_path;
    }

    return null;
  }

  private async generateLocalId(): Promise<string> {
    // Simple but effective local ID generation without crypto dependency
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const counter = Math.floor(Math.random() * 1000);
    return `local_${timestamp}_${random}_${counter}`;
  }

  async getStats(): Promise<{
    totalMessages: number;
    pendingSync: number;
    failedSync: number;
    cacheSize: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const totalMessages = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM messages') as { count: number };
    const pendingSync = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM messages WHERE sync_status = "pending"') as { count: number };
    const failedSync = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM messages WHERE sync_status = "failed"') as { count: number };
    const cacheSize = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM media_cache') as { count: number };

    return {
      totalMessages: totalMessages.count,
      pendingSync: pendingSync.count,
      failedSync: failedSync.count,
      cacheSize: cacheSize.count,
    };
  }
}

// Export singleton instance
export const offlineMessageService = new OfflineMessageService();
