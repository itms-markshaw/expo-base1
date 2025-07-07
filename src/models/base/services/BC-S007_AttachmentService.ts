/**
 * BC-S007_AttachmentService - Enhanced attachment service with caching and authentication
 * Service Reference: BC-S007
 * 
 * Provides smooth attachment downloads with progress tracking, caching, and proper authentication
 */

import * as FileSystem from 'expo-file-system';
import { authService } from './BaseAuthService';

export interface AttachmentDownload {
  id: number;
  filename: string;
  mimetype: string;
  file_size: number;
  url?: string;
}

export interface DownloadProgress {
  attachmentId: number;
  progress: number; // 0-1
  bytesDownloaded: number;
  totalBytes: number;
  status: 'downloading' | 'completed' | 'error' | 'cached';
}

class AttachmentService {
  private downloadCache = new Map<number, string>();
  private downloadPromises = new Map<number, Promise<string>>();
  private progressListeners = new Map<number, Function[]>();
  private readonly CACHE_DIR = `${FileSystem.documentDirectory}attachments/`;

  constructor() {
    this.ensureCacheDirectory();
  }

  /**
   * Ensure cache directory exists
   */
  private async ensureCacheDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.CACHE_DIR, { intermediates: true });
        console.log('📁 Created attachment cache directory');
      }
    } catch (error) {
      console.error('❌ Failed to create cache directory:', error);
    }
  }

  /**
   * Download attachment with authentication and caching
   */
  async downloadAttachment(
    attachment: AttachmentDownload,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    const { id, filename, file_size } = attachment;
    
    // Check cache first
    const cachedPath = await this.getCachedPath(id, filename);
    if (cachedPath) {
      console.log(`📎 Using cached attachment: ${filename}`);
      onProgress?.({
        attachmentId: id,
        progress: 1,
        bytesDownloaded: file_size,
        totalBytes: file_size,
        status: 'cached'
      });
      return cachedPath;
    }

    // Check if already downloading
    if (this.downloadPromises.has(id)) {
      console.log(`📎 Joining existing download for: ${filename}`);
      if (onProgress) {
        this.addProgressListener(id, onProgress);
      }
      return this.downloadPromises.get(id)!;
    }

    console.log(`📥 Starting authenticated download for attachment ${id}: ${filename}`);

    // Start new download
    const downloadPromise = this.performAuthenticatedDownload(attachment, onProgress);
    this.downloadPromises.set(id, downloadPromise);

    try {
      const localPath = await downloadPromise;
      this.downloadCache.set(id, localPath);
      console.log(`✅ Downloaded and cached: ${filename}`);
      return localPath;
    } catch (error) {
      console.error(`❌ Download failed for ${filename}:`, error);
      throw error;
    } finally {
      this.downloadPromises.delete(id);
      this.progressListeners.delete(id);
    }
  }

  /**
   * Perform authenticated download via XML-RPC
   */
  private async performAuthenticatedDownload(
    attachment: AttachmentDownload,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    const { id, filename, file_size } = attachment;
    const localPath = this.getLocalPath(id, filename);

    const client = authService.getClient();
    if (!client) {
      throw new Error('No authenticated client available');
    }

    // Simulate progress for XML-RPC downloads
    const simulateProgress = (stage: number, total: number = 5) => {
      const progress = stage / total;
      const progressData: DownloadProgress = {
        attachmentId: id,
        progress,
        bytesDownloaded: Math.floor(file_size * progress),
        totalBytes: file_size,
        status: 'downloading'
      };

      onProgress?.(progressData);
      this.notifyProgressListeners(id, progressData);
    };

    try {
      // Stage 1: Starting download
      simulateProgress(1);

      // Stage 2: Requesting data from server
      simulateProgress(2);

      // Get attachment data via authenticated XML-RPC
      const attachmentData = await client.callModel('ir.attachment', 'read', [id], {
        fields: ['datas']
      });

      if (!attachmentData || attachmentData.length === 0 || !attachmentData[0].datas) {
        throw new Error('No attachment data received');
      }

      // Stage 3: Processing data
      simulateProgress(3);

      const base64Data = attachmentData[0].datas;
      console.log(`✅ Retrieved ${base64Data.length} characters of base64 data via XML-RPC`);

      // Stage 4: Writing to file
      simulateProgress(4);

      await FileSystem.writeAsStringAsync(localPath, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Stage 5: Complete
      simulateProgress(5);

      console.log(`✅ Saved to: ${localPath}`);

      // Final progress update
      const finalProgress: DownloadProgress = {
        attachmentId: id,
        progress: 1,
        bytesDownloaded: file_size,
        totalBytes: file_size,
        status: 'completed'
      };

      onProgress?.(finalProgress);
      this.notifyProgressListeners(id, finalProgress);

      return localPath;

    } catch (error) {
      const errorProgress: DownloadProgress = {
        attachmentId: id,
        progress: 0,
        bytesDownloaded: 0,
        totalBytes: file_size,
        status: 'error'
      };

      onProgress?.(errorProgress);
      this.notifyProgressListeners(id, errorProgress);

      // Cleanup failed download
      try {
        await FileSystem.deleteAsync(localPath, { idempotent: true });
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      throw error;
    }
  }

  /**
   * Check if attachment is cached
   */
  private async getCachedPath(id: number, filename: string): Promise<string | null> {
    // Check memory cache first
    if (this.downloadCache.has(id)) {
      const cachedPath = this.downloadCache.get(id)!;
      const fileInfo = await FileSystem.getInfoAsync(cachedPath);
      if (fileInfo.exists) {
        return cachedPath;
      } else {
        // File was deleted, remove from cache
        this.downloadCache.delete(id);
      }
    }

    // Check file system cache
    const expectedPath = this.getLocalPath(id, filename);
    const fileInfo = await FileSystem.getInfoAsync(expectedPath);
    if (fileInfo.exists) {
      this.downloadCache.set(id, expectedPath);
      return expectedPath;
    }

    return null;
  }

  /**
   * Get local file path for attachment
   */
  private getLocalPath(id: number, filename: string): string {
    // Sanitize filename for file system
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${this.CACHE_DIR}${id}_${sanitizedFilename}`;
  }

  /**
   * Add progress listener for ongoing download
   */
  private addProgressListener(attachmentId: number, listener: (progress: DownloadProgress) => void): void {
    if (!this.progressListeners.has(attachmentId)) {
      this.progressListeners.set(attachmentId, []);
    }
    this.progressListeners.get(attachmentId)!.push(listener);
  }

  /**
   * Notify all progress listeners
   */
  private notifyProgressListeners(attachmentId: number, progress: DownloadProgress): void {
    const listeners = this.progressListeners.get(attachmentId) || [];
    listeners.forEach(listener => {
      try {
        listener(progress);
      } catch (error) {
        console.error('Error in progress listener:', error);
      }
    });
  }

  /**
   * Get MIME type category for UI decisions
   */
  getMimeTypeCategory(mimetype: string): 'image' | 'video' | 'audio' | 'document' | 'other' {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype.includes('pdf') || mimetype.includes('document') || mimetype.includes('text')) return 'document';
    return 'other';
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Clear cache (for maintenance)
   */
  async clearCache(): Promise<void> {
    try {
      await FileSystem.deleteAsync(this.CACHE_DIR, { idempotent: true });
      await this.ensureCacheDirectory();
      this.downloadCache.clear();
      console.log('🗑️ Attachment cache cleared');
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  }
}

// Create singleton instance
export const attachmentService = new AttachmentService();
export default attachmentService;
