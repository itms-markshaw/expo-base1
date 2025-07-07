/**
 * BC-S008_AttachmentUploadService - Upload attachments to Odoo with proper message linking
 * Service Reference: BC-S008
 * 
 * Handles uploading files to Odoo and linking them to chat messages
 */

import * as FileSystem from 'expo-file-system';
import { authService } from './BaseAuthService';

export interface AttachmentUpload {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

export interface UploadProgress {
  progress: number; // 0-1
  bytesUploaded: number;
  totalBytes: number;
  status: 'uploading' | 'completed' | 'error';
}

class AttachmentUploadService {
  
  /**
   * Upload attachment to Odoo and return attachment ID
   */
  async uploadAttachment(
    attachment: AttachmentUpload,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<number> {
    const client = authService.getClient();
    if (!client) {
      throw new Error('No authenticated client available');
    }

    try {
      console.log(`📤 Starting upload for: ${attachment.name}`);
      
      // Stage 1: Reading file
      onProgress?.({
        progress: 0.1,
        bytesUploaded: 0,
        totalBytes: attachment.size || 0,
        status: 'uploading'
      });

      // Read file as base64
      const base64Data = await FileSystem.readAsStringAsync(attachment.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log(`📤 Read ${base64Data.length} characters of base64 data`);

      // Stage 2: Uploading to server
      onProgress?.({
        progress: 0.5,
        bytesUploaded: Math.floor((attachment.size || 0) * 0.5),
        totalBytes: attachment.size || 0,
        status: 'uploading'
      });

      // Create attachment in Odoo
      const attachmentData = {
        name: attachment.name,
        datas: base64Data,
        mimetype: attachment.type,
        res_model: 'discuss.channel', // Will be linked to channel
        res_id: 0, // Will be set when linking to message
        type: 'binary',
        public: false,
      };

      const attachmentId = await client.callModel('ir.attachment', 'create', [attachmentData]);

      console.log(`✅ Created attachment with ID: ${attachmentId}`);

      // Stage 3: Complete
      onProgress?.({
        progress: 1,
        bytesUploaded: attachment.size || 0,
        totalBytes: attachment.size || 0,
        status: 'completed'
      });

      return attachmentId;

    } catch (error) {
      console.error('❌ Upload failed:', error);
      
      onProgress?.({
        progress: 0,
        bytesUploaded: 0,
        totalBytes: attachment.size || 0,
        status: 'error'
      });

      throw error;
    }
  }

  /**
   * Send message with attachment to Odoo channel
   */
  async sendMessageWithAttachment(
    channelId: number,
    messageText: string,
    attachment: AttachmentUpload,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<boolean> {
    const client = authService.getClient();
    if (!client) {
      throw new Error('No authenticated client available');
    }

    try {
      console.log(`📤 Sending message with attachment to channel ${channelId}`);

      // Upload attachment first
      const attachmentId = await this.uploadAttachment(attachment, onProgress);

      // Create message body - don't include attachment filename for images
      const isImage = attachment.type?.startsWith('image/');
      const messageBody = messageText || (isImage ? '' : `📎 ${attachment.name}`);

      // Send message using message_post (proper Odoo method for chat)
      const messageResult = await client.callModel('discuss.channel', 'message_post', [channelId], {
        body: messageBody,
        message_type: 'comment',
        attachment_ids: [attachmentId], // Link the attachment
      });

      console.log(`✅ Message sent with attachment. Message ID: ${messageResult}`);

      // Update attachment to link to the channel (not needed since it's already linked via message_post)
      // The attachment is automatically linked when using message_post with attachment_ids

      return true;

    } catch (error) {
      console.error('❌ Failed to send message with attachment:', error);
      throw error;
    }
  }

  /**
   * Get file info from URI
   */
  async getFileInfo(uri: string): Promise<{ size: number; exists: boolean }> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      return {
        size: fileInfo.size || 0,
        exists: fileInfo.exists
      };
    } catch (error) {
      console.error('Failed to get file info:', error);
      return { size: 0, exists: false };
    }
  }

  /**
   * Validate file for upload
   */
  validateFile(attachment: AttachmentUpload): { valid: boolean; error?: string } {
    // Check file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (attachment.size && attachment.size > maxSize) {
      return {
        valid: false,
        error: 'File size exceeds 10MB limit'
      };
    }

    // Check file type (basic validation)
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedTypes.includes(attachment.type)) {
      return {
        valid: false,
        error: 'File type not supported'
      };
    }

    return { valid: true };
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
   * Get MIME type from file extension
   */
  getMimeTypeFromExtension(filename: string): string {
    const extension = filename.toLowerCase().split('.').pop();
    
    const mimeTypes: { [key: string]: string } = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    return mimeTypes[extension || ''] || 'application/octet-stream';
  }
}

// Create singleton instance
export const attachmentUploadService = new AttachmentUploadService();
export default attachmentUploadService;
