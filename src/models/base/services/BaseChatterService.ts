/**
 * Base Chatter Service
 * Universal chatter functionality for all Odoo models
 */

import { authService } from '../../../services/auth';
import { databaseService } from '../../../services/database';
import { BaseMessage, BaseActivity, BaseAttachment, BaseFollower, MessageComposerConfig, ActivityConfig } from '../types/BaseChatter';

export class BaseChatterService {
  /**
   * Get messages for a specific record
   */
  static async getMessages(
    modelName: string,
    recordId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<BaseMessage[]> {
    try {
      const client = authService.getClient();
      if (!client) {
        throw new Error('Not authenticated');
      }

      const messages = await client.searchRead(
        'mail.message',
        [
          ['model', '=', modelName],
          ['res_id', '=', recordId],
          ['message_type', 'in', ['comment', 'email']]
        ],
        [
          'id', 'body', 'author_id', 'date', 'message_type', 'subtype_id',
          'model', 'res_id', 'parent_id', 'attachment_ids', 'tracking_value_ids',
          'is_internal', 'email_from', 'reply_to', 'subject'
        ],
        {
          order: 'date desc',
          limit,
          offset
        }
      );

      return messages as BaseMessage[];
    } catch (error) {
      console.error(`Failed to load messages for ${modelName}:${recordId}:`, error);
      return [];
    }
  }

  /**
   * Post a message to a record
   */
  static async postMessage(config: MessageComposerConfig): Promise<number | null> {
    try {
      const client = authService.getClient();
      if (!client) {
        throw new Error('Not authenticated');
      }

      // Use message_post method for proper chatter integration
      const messageId = await client.call(
        config.modelName,
        'message_post',
        [config.recordId],
        {
          body: config.subject ? `<h3>${config.subject}</h3>${config.messageType}` : config.messageType,
          message_type: config.messageType,
          subtype_xmlid: config.isInternal ? 'mail.mt_note' : 'mail.mt_comment',
          partner_ids: config.recipients || [],
          attachment_ids: config.attachments?.map(a => a.id) || []
        }
      );

      console.log(`Posted message to ${config.modelName}:${config.recordId}: ${messageId}`);
      return messageId;
    } catch (error) {
      console.error(`Failed to post message to ${config.modelName}:${config.recordId}:`, error);
      return null;
    }
  }

  /**
   * Get activities for a specific record
   */
  static async getActivities(modelName: string, recordId: number): Promise<BaseActivity[]> {
    try {
      const client = authService.getClient();
      if (!client) {
        throw new Error('Not authenticated');
      }

      const activities = await client.searchRead(
        'mail.activity',
        [
          ['res_model', '=', modelName],
          ['res_id', '=', recordId]
        ],
        [
          'id', 'activity_type_id', 'summary', 'note', 'date_deadline',
          'user_id', 'res_model', 'res_id', 'state', 'create_date', 'create_uid'
        ],
        {
          order: 'date_deadline asc'
        }
      );

      return activities as BaseActivity[];
    } catch (error) {
      console.error(`Failed to load activities for ${modelName}:${recordId}:`, error);
      return [];
    }
  }

  /**
   * Schedule a new activity
   */
  static async scheduleActivity(config: ActivityConfig): Promise<number | null> {
    try {
      const client = authService.getClient();
      if (!client) {
        throw new Error('Not authenticated');
      }

      const activityId = await client.create('mail.activity', {
        res_model: config.modelName,
        res_id: config.recordId,
        activity_type_id: config.activityTypeId || 1, // Default to "Email" type
        summary: config.summary || 'Follow up',
        note: config.note,
        date_deadline: config.deadline || new Date().toISOString().split('T')[0],
        user_id: config.userId || false // Will default to current user
      });

      console.log(`Scheduled activity for ${config.modelName}:${config.recordId}: ${activityId}`);
      return activityId;
    } catch (error) {
      console.error(`Failed to schedule activity for ${config.modelName}:${config.recordId}:`, error);
      return null;
    }
  }

  /**
   * Mark activity as done
   */
  static async markActivityDone(activityId: number, feedback?: string): Promise<boolean> {
    try {
      const client = authService.getClient();
      if (!client) {
        throw new Error('Not authenticated');
      }

      // Use action_done method to properly complete the activity
      await client.call('mail.activity', 'action_done', [activityId], {
        feedback: feedback || ''
      });

      console.log(`Marked activity ${activityId} as done`);
      return true;
    } catch (error) {
      console.error(`Failed to mark activity ${activityId} as done:`, error);
      return false;
    }
  }

  /**
   * Get attachments for a specific record
   */
  static async getAttachments(modelName: string, recordId: number): Promise<BaseAttachment[]> {
    try {
      const client = authService.getClient();
      if (!client) {
        throw new Error('Not authenticated');
      }

      const attachments = await client.searchRead(
        'ir.attachment',
        [
          ['res_model', '=', modelName],
          ['res_id', '=', recordId]
        ],
        [
          'id', 'name', 'datas_fname', 'file_size', 'mimetype',
          'res_model', 'res_id', 'create_date', 'create_uid', 'url'
        ],
        {
          order: 'create_date desc'
        }
      );

      return attachments as BaseAttachment[];
    } catch (error) {
      console.error(`Failed to load attachments for ${modelName}:${recordId}:`, error);
      return [];
    }
  }

  /**
   * Get followers for a specific record
   */
  static async getFollowers(modelName: string, recordId: number): Promise<BaseFollower[]> {
    try {
      const client = authService.getClient();
      if (!client) {
        throw new Error('Not authenticated');
      }

      const followers = await client.searchRead(
        'mail.followers',
        [
          ['res_model', '=', modelName],
          ['res_id', '=', recordId]
        ],
        ['id', 'partner_id', 'res_model', 'res_id', 'subtype_ids'],
        {
          order: 'id asc'
        }
      );

      return followers as BaseFollower[];
    } catch (error) {
      console.error(`Failed to load followers for ${modelName}:${recordId}:`, error);
      return [];
    }
  }

  /**
   * Add follower to a record
   */
  static async addFollower(modelName: string, recordId: number, partnerId: number): Promise<boolean> {
    try {
      const client = authService.getClient();
      if (!client) {
        throw new Error('Not authenticated');
      }

      // Use message_subscribe method for proper follower management
      await client.call(modelName, 'message_subscribe', [recordId], {
        partner_ids: [partnerId]
      });

      console.log(`Added follower ${partnerId} to ${modelName}:${recordId}`);
      return true;
    } catch (error) {
      console.error(`Failed to add follower to ${modelName}:${recordId}:`, error);
      return false;
    }
  }

  /**
   * Remove follower from a record
   */
  static async removeFollower(modelName: string, recordId: number, partnerId: number): Promise<boolean> {
    try {
      const client = authService.getClient();
      if (!client) {
        throw new Error('Not authenticated');
      }

      // Use message_unsubscribe method for proper follower management
      await client.call(modelName, 'message_unsubscribe', [recordId], {
        partner_ids: [partnerId]
      });

      console.log(`Removed follower ${partnerId} from ${modelName}:${recordId}`);
      return true;
    } catch (error) {
      console.error(`Failed to remove follower from ${modelName}:${recordId}:`, error);
      return false;
    }
  }

  /**
   * Upload attachment to a record
   */
  static async uploadAttachment(
    modelName: string,
    recordId: number,
    file: { name: string; data: string; mimetype: string }
  ): Promise<number | null> {
    try {
      const client = authService.getClient();
      if (!client) {
        throw new Error('Not authenticated');
      }

      const attachmentId = await client.create('ir.attachment', {
        name: file.name,
        datas: file.data,
        mimetype: file.mimetype,
        res_model: modelName,
        res_id: recordId
      });

      console.log(`Uploaded attachment to ${modelName}:${recordId}: ${attachmentId}`);
      return attachmentId;
    } catch (error) {
      console.error(`Failed to upload attachment to ${modelName}:${recordId}:`, error);
      return null;
    }
  }

  /**
   * Delete attachment
   */
  static async deleteAttachment(attachmentId: number): Promise<boolean> {
    try {
      const client = authService.getClient();
      if (!client) {
        throw new Error('Not authenticated');
      }

      const success = await client.unlink('ir.attachment', [attachmentId]);
      console.log(`Deleted attachment ${attachmentId}: ${success}`);
      return success;
    } catch (error) {
      console.error(`Failed to delete attachment ${attachmentId}:`, error);
      return false;
    }
  }
}
