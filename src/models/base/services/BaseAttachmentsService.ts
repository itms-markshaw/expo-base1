/**
 * BaseAttachmentsService - Handle ir.attachment for Odoo chatter
 * Base service for all attachment functionality across models
 *
 * MIGRATED: From src/services/attachmentsService.ts
 * Manages file uploads, downloads, and attachment metadata
 */

import { authService } from './BaseAuthService';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

export interface OdooAttachment {
  id: number;
  name: string;
  datas_fname?: string; // May not exist in newer Odoo versions
  mimetype: string;
  file_size: number;
  res_model: string;
  res_id: number;
  res_name?: string;
  create_date: string;
  create_uid: [number, string];
  url?: string;
  type: 'binary' | 'url';
  public: boolean;
  checksum?: string;
}

export interface AttachmentUpload {
  name: string;
  uri: string;
  type: string;
  size: number;
}

class AttachmentsService {

  /**
   * Get attachments for a record
   */
  async getAttachments(model: string, recordId: number): Promise<OdooAttachment[]> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      // Try with basic fields first to avoid field name issues
      const attachments = await client.searchRead('ir.attachment',
        [
          ['res_model', '=', model],
          ['res_id', '=', recordId]
        ],
        [
          'id', 'name', 'mimetype', 'file_size',
          'res_model', 'res_id', 'create_date', 'create_uid',
          'type', 'public'
        ],
        {
          order: 'create_date desc'
        }
      );

      // Add default values for missing fields
      return attachments.map(att => ({
        ...att,
        datas_fname: att.datas_fname || att.name,
        res_name: att.res_name || '',
        url: att.url || '',
        checksum: att.checksum || '',
      }));
    } catch (error) {
      console.error('❌ Failed to get attachments:', error.message);

      // Fallback: try with even more basic fields
      try {
        console.log('🔄 Trying fallback attachment query...');
        const basicAttachments = await client.searchRead('ir.attachment',
          [
            ['res_model', '=', model],
            ['res_id', '=', recordId]
          ],
          ['id', 'name', 'mimetype', 'create_date'],
          { order: 'create_date desc' }
        );

        return basicAttachments.map(att => ({
          ...att,
          datas_fname: att.name,
          file_size: 0,
          res_model: model,
          res_id: recordId,
          res_name: '',
          create_uid: [1, 'System'],
          url: '',
          type: 'binary' as const,
          public: false,
          checksum: '',
        }));
      } catch (fallbackError) {
        console.error('❌ Fallback attachment query also failed:', fallbackError.message);
        return [];
      }
    }
  }

  /**
   * Upload attachment to Odoo
   */
  async uploadAttachment(
    model: string, 
    recordId: number, 
    file: AttachmentUpload,
    description?: string
  ): Promise<number | null> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      console.log(`📎 Uploading attachment: ${file.name} (${file.size} bytes)`);

      // Read file as base64
      const base64Data = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create attachment record (use compatible field names)
      const attachmentData: any = {
        name: file.name,
        datas: base64Data,
        res_model: model,
        res_id: recordId,
        mimetype: file.type,
        type: 'binary',
        public: false,
      };

      // Add datas_fname only if it exists in this Odoo version
      try {
        const fields = await client.getFields('ir.attachment');
        if (fields.datas_fname) {
          attachmentData.datas_fname = file.name;
        }
      } catch (fieldError) {
        // Ignore field check errors
      }

      if (description) {
        attachmentData.description = description;
      }

      const attachmentId = await client.create('ir.attachment', attachmentData);
      console.log(`✅ Uploaded attachment with ID: ${attachmentId}`);

      // Post a message about the attachment
      await this.postAttachmentMessage(model, recordId, file.name, 'uploaded');

      return attachmentId;
    } catch (error) {
      console.error('❌ Failed to upload attachment:', error.message);
      return null;
    }
  }

  /**
   * Download attachment from Odoo
   */
  async downloadAttachment(attachment: OdooAttachment): Promise<string | null> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      console.log(`📥 Downloading attachment: ${attachment.name}`);

      // Get attachment data
      const attachmentData = await client.read('ir.attachment', attachment.id, ['datas']);
      if (!attachmentData || attachmentData.length === 0) {
        throw new Error('Attachment data not found');
      }

      const base64Data = attachmentData[0].datas;
      if (!base64Data) {
        throw new Error('No attachment data available');
      }

      // Create local file path
      const fileName = attachment.datas_fname || attachment.name;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      // Write file to local storage
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log(`✅ Downloaded attachment to: ${fileUri}`);
      return fileUri;
    } catch (error) {
      console.error('❌ Failed to download attachment:', error.message);
      return null;
    }
  }

  /**
   * Delete attachment from Odoo
   */
  async deleteAttachment(attachmentId: number, model: string, recordId: number): Promise<boolean> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      // Get attachment name before deletion
      const attachment = await client.read('ir.attachment', attachmentId, ['name']);
      const attachmentName = attachment.length > 0 ? attachment[0].name : 'Unknown';

      // Delete attachment
      await client.delete('ir.attachment', attachmentId);
      console.log(`✅ Deleted attachment: ${attachmentName}`);

      // Post a message about the deletion
      await this.postAttachmentMessage(model, recordId, attachmentName, 'deleted');

      return true;
    } catch (error) {
      console.error('❌ Failed to delete attachment:', error.message);
      return false;
    }
  }

  /**
   * Pick file from device
   */
  async pickFile(): Promise<AttachmentUpload | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
        return {
          name: result.name,
          uri: result.uri,
          type: result.mimeType || 'application/octet-stream',
          size: result.size || 0,
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Failed to pick file:', error.message);
      return null;
    }
  }

  /**
   * Get attachment file size in human readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file icon based on mimetype
   */
  getFileIcon(mimetype: string): string {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'videocam';
    if (mimetype.startsWith('audio/')) return 'audiotrack';
    if (mimetype.includes('pdf')) return 'picture-as-pdf';
    if (mimetype.includes('word') || mimetype.includes('document')) return 'description';
    if (mimetype.includes('sheet') || mimetype.includes('excel')) return 'table-chart';
    if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) return 'slideshow';
    if (mimetype.includes('zip') || mimetype.includes('archive')) return 'archive';
    if (mimetype.includes('text/')) return 'text-snippet';
    return 'attach-file';
  }

  /**
   * Get file color based on mimetype
   */
  getFileColor(mimetype: string): string {
    if (mimetype.startsWith('image/')) return '#FF9500';
    if (mimetype.startsWith('video/')) return '#007AFF';
    if (mimetype.startsWith('audio/')) return '#34C759';
    if (mimetype.includes('pdf')) return '#FF3B30';
    if (mimetype.includes('word') || mimetype.includes('document')) return '#007AFF';
    if (mimetype.includes('sheet') || mimetype.includes('excel')) return '#34C759';
    if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) return '#FF9500';
    if (mimetype.includes('zip') || mimetype.includes('archive')) return '#8E8E93';
    return '#666';
  }

  /**
   * Check if file is an image
   */
  isImage(mimetype: string): boolean {
    return mimetype.startsWith('image/');
  }

  /**
   * Check if file can be previewed
   */
  canPreview(mimetype: string): boolean {
    return mimetype.startsWith('image/') || 
           mimetype.includes('pdf') || 
           mimetype.startsWith('text/');
  }

  /**
   * Get attachment URL for preview (if supported)
   */
  getAttachmentUrl(attachment: OdooAttachment): string | null {
    const client = authService.getClient();
    if (!client || !attachment.id) return null;

    // For images and PDFs, we can generate a preview URL
    if (this.canPreview(attachment.mimetype)) {
      const baseUrl = client.baseURL.replace('/xmlrpc/2/', '');
      return `${baseUrl}/web/content/${attachment.id}?download=true`;
    }

    return null;
  }

  /**
   * Post a message about attachment action
   */
  private async postAttachmentMessage(
    model: string, 
    recordId: number, 
    fileName: string, 
    action: 'uploaded' | 'deleted'
  ): Promise<void> {
    try {
      const client = authService.getClient();
      if (!client) return;

      const actionText = action === 'uploaded' ? 'uploaded' : 'deleted';
      const emoji = action === 'uploaded' ? '📎' : '🗑️';
      
      await client.callModel(model, 'message_post', [], {
        body: `<p>${emoji} <strong>Attachment ${actionText}:</strong> ${fileName}</p>`,
        message_type: 'comment',
      });
    } catch (error) {
      console.error('⚠️ Failed to post attachment message:', error.message);
      // Don't fail the whole operation if message posting fails
    }
  }

  /**
   * Get attachment statistics for a record
   */
  async getAttachmentStats(model: string, recordId: number): Promise<{
    count: number;
    totalSize: number;
    types: { [key: string]: number };
  }> {
    try {
      const attachments = await this.getAttachments(model, recordId);
      
      const stats = {
        count: attachments.length,
        totalSize: attachments.reduce((sum, att) => sum + (att.file_size || 0), 0),
        types: {} as { [key: string]: number }
      };

      // Count by file type
      attachments.forEach(att => {
        const category = this.getFileCategory(att.mimetype);
        stats.types[category] = (stats.types[category] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('❌ Failed to get attachment stats:', error.message);
      return { count: 0, totalSize: 0, types: {} };
    }
  }

  /**
   * Get file category for statistics
   */
  private getFileCategory(mimetype: string): string {
    if (mimetype.startsWith('image/')) return 'Images';
    if (mimetype.startsWith('video/')) return 'Videos';
    if (mimetype.startsWith('audio/')) return 'Audio';
    if (mimetype.includes('pdf')) return 'PDFs';
    if (mimetype.includes('word') || mimetype.includes('document')) return 'Documents';
    if (mimetype.includes('sheet') || mimetype.includes('excel')) return 'Spreadsheets';
    if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) return 'Presentations';
    return 'Other';
  }
}

export const attachmentsService = new AttachmentsService();
