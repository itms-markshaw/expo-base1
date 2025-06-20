/**
 * Chatter Service - Universal Odoo Communication Component
 * Handles messages, activities, followers, and tracking for any Odoo model
 */

import { authService } from './auth';

export interface ChatterMessage {
  id: number;
  subject?: string;
  body: string;
  message_type: 'email' | 'comment' | 'notification';
  subtype_id?: [number, string];
  author_id?: [number, string];
  partner_ids?: number[];
  create_date: string;
  attachment_ids?: number[];
  tracking_value_ids?: number[];
  is_internal?: boolean;
}

export interface ChatterActivity {
  id: number;
  summary: string;
  activity_type_id: [number, string];
  user_id: [number, string];
  date_deadline: string;
  note?: string;
  res_model: string;
  res_id: number;
  create_date: string;
  state: 'overdue' | 'today' | 'planned';
}

export interface ChatterFollower {
  id: number;
  partner_id: [number, string];
  subtype_ids: number[];
  res_model: string;
  res_id: number;
}

export interface ActivityType {
  id: number;
  name: string;
  icon?: string;
  delay_count?: number;
  delay_unit?: string;
  summary?: string;
}

export interface MessageSubtype {
  id: number;
  name: string;
  description?: string;
  internal: boolean;
  default: boolean;
}

class ChatterService {
  
  /**
   * Get messages for a record
   */
  async getMessages(model: string, recordId: number, limit: number = 20): Promise<ChatterMessage[]> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      const messages = await client.searchRead('mail.message', 
        [
          ['res_model', '=', model], 
          ['res_id', '=', recordId],
          ['message_type', 'in', ['comment', 'email', 'notification']]
        ], 
        [
          'id', 'subject', 'body', 'message_type', 'subtype_id', 
          'author_id', 'partner_ids', 'create_date', 'attachment_ids',
          'tracking_value_ids'
        ], 
        { 
          limit, 
          order: 'create_date desc' 
        }
      );

      return messages.map(msg => ({
        ...msg,
        is_internal: msg.subtype_id && msg.subtype_id[1]?.toLowerCase().includes('internal')
      }));
    } catch (error) {
      console.error('❌ Failed to get messages:', error.message);
      return [];
    }
  }

  /**
   * Post a message (comment or internal note)
   */
  async postMessage(
    model: string, 
    recordId: number, 
    body: string, 
    isInternal: boolean = false,
    subject?: string
  ): Promise<number | null> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      // Get appropriate subtype
      const subtypeId = await this.getMessageSubtype(isInternal);

      const messageData: any = {
        model: model,
        res_id: recordId,
        body: body,
        message_type: 'comment',
        author_id: client.uid,
      };

      if (subject) {
        messageData.subject = subject;
      }

      if (subtypeId) {
        messageData.subtype_id = subtypeId;
      }

      const messageId = await client.create('mail.message', messageData);
      console.log(`✅ Posted message ${messageId} to ${model}:${recordId}`);
      return messageId;
    } catch (error) {
      console.error('❌ Failed to post message:', error.message);
      return null;
    }
  }

  /**
   * Get activities for a record
   */
  async getActivities(model: string, recordId: number): Promise<ChatterActivity[]> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      const activities = await client.searchRead('mail.activity', 
        [
          ['res_model', '=', model], 
          ['res_id', '=', recordId]
        ], 
        [
          'id', 'summary', 'activity_type_id', 'user_id', 
          'date_deadline', 'note', 'res_model', 'res_id', 'create_date'
        ], 
        { 
          order: 'date_deadline asc' 
        }
      );

      // Add state based on deadline
      const today = new Date().toISOString().split('T')[0];
      return activities.map(activity => ({
        ...activity,
        state: activity.date_deadline < today ? 'overdue' : 
               activity.date_deadline === today ? 'today' : 'planned'
      }));
    } catch (error) {
      console.error('❌ Failed to get activities:', error.message);
      return [];
    }
  }

  /**
   * Schedule an activity
   */
  async scheduleActivity(
    model: string,
    recordId: number,
    activityTypeId: number,
    summary: string,
    dueDate: string,
    userId?: number,
    note?: string
  ): Promise<number | null> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      // Get model ID
      const modelId = await this.getModelId(model);
      if (!modelId) throw new Error(`Could not find model ID for ${model}`);

      const activityData: any = {
        res_model: model,
        res_model_id: modelId,
        res_id: recordId,
        activity_type_id: activityTypeId,
        summary: summary,
        date_deadline: dueDate,
        user_id: userId || client.uid,
      };

      if (note) {
        activityData.note = note;
      }

      const activityId = await client.create('mail.activity', activityData);
      console.log(`✅ Scheduled activity ${activityId} for ${model}:${recordId}`);
      return activityId;
    } catch (error) {
      console.error('❌ Failed to schedule activity:', error.message);
      return null;
    }
  }

  /**
   * Mark activity as done
   */
  async markActivityDone(activityId: number, feedback?: string): Promise<boolean> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      // In Odoo, marking activity as done usually means calling action_done method
      // For simplicity, we'll delete the activity and optionally post a message
      if (feedback) {
        // Get activity details first
        const activity = await client.read('mail.activity', activityId, 
          ['res_model', 'res_id', 'summary']
        );
        
        if (activity.length > 0) {
          const act = activity[0];
          await this.postMessage(
            act.res_model, 
            act.res_id, 
            `<p><strong>Activity completed:</strong> ${act.summary}</p><p>${feedback}</p>`,
            false
          );
        }
      }

      await client.delete('mail.activity', activityId);
      console.log(`✅ Marked activity ${activityId} as done`);
      return true;
    } catch (error) {
      console.error('❌ Failed to mark activity as done:', error.message);
      return false;
    }
  }

  /**
   * Get followers for a record
   */
  async getFollowers(model: string, recordId: number): Promise<ChatterFollower[]> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      const followers = await client.searchRead('mail.followers', 
        [
          ['res_model', '=', model], 
          ['res_id', '=', recordId]
        ], 
        ['id', 'partner_id', 'subtype_ids', 'res_model', 'res_id']
      );

      return followers;
    } catch (error) {
      console.error('❌ Failed to get followers:', error.message);
      return [];
    }
  }

  /**
   * Add follower to a record
   */
  async addFollower(model: string, recordId: number, partnerId: number): Promise<boolean> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      const followerData = {
        res_model: model,
        res_id: recordId,
        partner_id: partnerId,
      };

      await client.create('mail.followers', followerData);
      console.log(`✅ Added follower ${partnerId} to ${model}:${recordId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to add follower:', error.message);
      return false;
    }
  }

  /**
   * Get available activity types
   */
  async getActivityTypes(): Promise<ActivityType[]> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      const types = await client.searchRead('mail.activity.type', [], 
        ['id', 'name', 'icon', 'delay_count', 'delay_unit', 'summary'], 
        { order: 'sequence, name' }
      );

      return types;
    } catch (error) {
      console.error('❌ Failed to get activity types:', error.message);
      return [];
    }
  }

  /**
   * Get message subtypes
   */
  async getMessageSubtypes(): Promise<MessageSubtype[]> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      const subtypes = await client.searchRead('mail.message.subtype', [], 
        ['id', 'name', 'description', 'internal', 'default']
      );

      return subtypes;
    } catch (error) {
      console.error('❌ Failed to get message subtypes:', error.message);
      return [];
    }
  }

  /**
   * Get tracking values (field changes) for messages
   */
  async getTrackingValues(messageIds: number[]): Promise<any[]> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      if (messageIds.length === 0) return [];

      const trackingValues = await client.searchRead('mail.tracking.value', 
        [['mail_message_id', 'in', messageIds]], 
        ['id', 'field', 'field_desc', 'old_value_text', 'new_value_text', 'mail_message_id']
      );

      return trackingValues;
    } catch (error) {
      console.error('❌ Failed to get tracking values:', error.message);
      return [];
    }
  }

  /**
   * Helper: Get model ID for a model name
   */
  private async getModelId(modelName: string): Promise<number | null> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      const models = await client.searchRead('ir.model', 
        [['model', '=', modelName]], 
        ['id'], 
        { limit: 1 }
      );

      return models.length > 0 ? models[0].id : null;
    } catch (error) {
      console.error('❌ Failed to get model ID:', error.message);
      return null;
    }
  }

  /**
   * Helper: Get appropriate message subtype
   */
  private async getMessageSubtype(isInternal: boolean): Promise<number | null> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      const subtypes = await client.searchRead('mail.message.subtype', 
        [['internal', '=', isInternal]], 
        ['id'], 
        { limit: 1 }
      );

      return subtypes.length > 0 ? subtypes[0].id : null;
    } catch (error) {
      console.error('❌ Failed to get message subtype:', error.message);
      return null;
    }
  }
}

export const chatterService = new ChatterService();
