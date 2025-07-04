/**
 * BaseActionsService - Handle button actions like CONFIRM, CANCEL, etc.
 * Base service for all action functionality across models
 *
 * MIGRATED: From src/services/odooActions.ts
 * This service provides the equivalent of clicking buttons in Odoo web interface
 */

import { authService } from './BaseAuthService';

export interface OdooAction {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  model: string;
  method?: string;
  fieldUpdates?: { [key: string]: any };
  confirmMessage?: string;
}

class OdooActionsService {

  /**
   * Get available actions for a model
   */
  getActionsForModel(model: string): OdooAction[] {
    const actions: OdooAction[] = [];

    // CRM Lead Actions
    if (model === 'crm.lead') {
      actions.push(
        {
          id: 'convert_opportunity',
          name: 'Convert to Opportunity',
          description: 'Convert this lead to an opportunity',
          icon: 'trending-up',
          color: '#007AFF',
          model: model,
          fieldUpdates: { type: 'opportunity', probability: 25 },
          confirmMessage: 'Convert this lead to an opportunity?'
        },
        {
          id: 'mark_won',
          name: 'Mark Won',
          description: 'Mark this opportunity as won',
          icon: 'check-circle',
          color: '#34C759',
          model: model,
          fieldUpdates: { 
            probability: 100, 
            date_closed: new Date().toISOString().split('T')[0] 
          },
          confirmMessage: 'Mark this opportunity as won?'
        },
        {
          id: 'mark_lost',
          name: 'Mark Lost',
          description: 'Mark this opportunity as lost',
          icon: 'cancel',
          color: '#FF3B30',
          model: model,
          fieldUpdates: { probability: 0, active: false },
          confirmMessage: 'Mark this opportunity as lost?'
        },
        {
          id: 'schedule_call',
          name: 'Schedule Call',
          description: 'Schedule a follow-up call',
          icon: 'phone',
          color: '#FF9500',
          model: model,
          method: 'schedule_activity'
        }
      );
    }

    // Contact Actions
    if (model === 'res.partner') {
      actions.push(
        {
          id: 'mark_customer',
          name: 'Mark as Customer',
          description: 'Mark this contact as a customer',
          icon: 'person',
          color: '#34C759',
          model: model,
          fieldUpdates: { is_company: false, customer_rank: 1 }
        },
        {
          id: 'mark_vendor',
          name: 'Mark as Vendor',
          description: 'Mark this contact as a vendor',
          icon: 'business',
          color: '#FF9500',
          model: model,
          fieldUpdates: { is_company: true, supplier_rank: 1 }
        },
        {
          id: 'archive',
          name: 'Archive',
          description: 'Archive this contact',
          icon: 'archive',
          color: '#666',
          model: model,
          fieldUpdates: { active: false },
          confirmMessage: 'Archive this contact?'
        }
      );
    }

    // User Actions
    if (model === 'res.users') {
      actions.push(
        {
          id: 'activate',
          name: 'Activate',
          description: 'Activate this user',
          icon: 'check-circle',
          color: '#34C759',
          model: model,
          fieldUpdates: { active: true }
        },
        {
          id: 'deactivate',
          name: 'Deactivate',
          description: 'Deactivate this user',
          icon: 'block',
          color: '#FF3B30',
          model: model,
          fieldUpdates: { active: false },
          confirmMessage: 'Deactivate this user?'
        }
      );
    }

    return actions;
  }

  /**
   * Execute an Odoo action
   */
  async executeAction(
    action: OdooAction, 
    recordId: number, 
    feedback?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      console.log(`🎬 Executing action: ${action.name} on ${action.model}:${recordId}`);

      // Handle different action types
      if (action.fieldUpdates) {
        // Simple field update
        await client.update(action.model, recordId, action.fieldUpdates);
        console.log(`✅ Updated fields:`, action.fieldUpdates);
      } else if (action.method) {
        // Call specific method
        await this.callActionMethod(action.model, recordId, action.method, feedback);
      }

      // Post a message about the action
      await this.postActionMessage(action.model, recordId, action.name, feedback);

      return {
        success: true,
        message: `${action.name} completed successfully`
      };

    } catch (error) {
      console.error(`❌ Failed to execute action ${action.name}:`, error.message);
      return {
        success: false,
        message: `Failed to execute ${action.name}: ${error.message}`
      };
    }
  }

  /**
   * Call a specific action method
   */
  private async callActionMethod(
    model: string, 
    recordId: number, 
    method: string, 
    feedback?: string
  ): Promise<void> {
    const client = authService.getClient();
    if (!client) throw new Error('Not authenticated');

    switch (method) {
      case 'schedule_activity':
        // Schedule a call activity
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Get model ID
        const models = await client.searchRead('ir.model', 
          [['model', '=', model]], 
          ['id'], 
          { limit: 1 }
        );
        
        if (models.length > 0) {
          const activityData = {
            res_model: model,
            res_model_id: models[0].id,
            res_id: recordId,
            activity_type_id: 1, // Default to first activity type
            summary: feedback || 'Follow-up call',
            date_deadline: tomorrow.toISOString().split('T')[0],
            user_id: client.uid,
          };

          await client.create('mail.activity', activityData);
          console.log('✅ Scheduled activity');
        }
        break;

      default:
        console.log(`⚠️ Unknown method: ${method}`);
    }
  }

  /**
   * Post a message about the action
   */
  private async postActionMessage(
    model: string, 
    recordId: number, 
    actionName: string, 
    feedback?: string
  ): Promise<void> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      let messageBody = `<p><strong>Action:</strong> ${actionName}</p>`;
      if (feedback) {
        messageBody += `<p><strong>Note:</strong> ${feedback}</p>`;
      }

      // Use message_post method which is more reliable
      await client.callModel(model, 'message_post', [], {
        body: messageBody,
        message_type: 'comment',
      });

      console.log('✅ Posted action message');
    } catch (error) {
      console.error('⚠️ Failed to post action message:', error.message);
      // Don't fail the whole action if message posting fails
    }
  }

  /**
   * Get current record state for validation
   */
  async getRecordState(model: string, recordId: number): Promise<any> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      const fields = ['id', 'name', 'active'];
      
      // Add model-specific fields
      if (model === 'crm.lead') {
        fields.push('type', 'probability', 'stage_id');
      } else if (model === 'res.partner') {
        fields.push('is_company', 'customer_rank', 'supplier_rank');
      }

      const records = await client.read(model, recordId, fields);
      return records.length > 0 ? records[0] : null;
    } catch (error) {
      console.error('❌ Failed to get record state:', error.message);
      return null;
    }
  }

  /**
   * Validate if action can be performed
   */
  async canPerformAction(action: OdooAction, recordId: number): Promise<{ canPerform: boolean; reason?: string }> {
    try {
      const recordState = await this.getRecordState(action.model, recordId);
      if (!recordState) {
        return { canPerform: false, reason: 'Record not found' };
      }

      // Model-specific validations
      if (action.model === 'crm.lead') {
        if (action.id === 'convert_opportunity' && recordState.type === 'opportunity') {
          return { canPerform: false, reason: 'Already an opportunity' };
        }
        if (action.id === 'mark_won' && recordState.probability === 100) {
          return { canPerform: false, reason: 'Already marked as won' };
        }
        if (action.id === 'mark_lost' && recordState.probability === 0) {
          return { canPerform: false, reason: 'Already marked as lost' };
        }
      }

      if (action.model === 'res.partner') {
        if (action.id === 'archive' && !recordState.active) {
          return { canPerform: false, reason: 'Already archived' };
        }
      }

      return { canPerform: true };
    } catch (error) {
      return { canPerform: false, reason: 'Validation failed' };
    }
  }

  /**
   * Get action history for a record
   */
  async getActionHistory(model: string, recordId: number): Promise<any[]> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      const messages = await client.searchRead('mail.message', 
        [
          ['res_model', '=', model], 
          ['res_id', '=', recordId],
          ['body', 'ilike', '<strong>Action:</strong>']
        ], 
        ['id', 'body', 'create_date', 'author_id'], 
        { 
          limit: 10, 
          order: 'create_date desc' 
        }
      );

      return messages;
    } catch (error) {
      console.error('❌ Failed to get action history:', error.message);
      return [];
    }
  }
}

export const odooActionsService = new OdooActionsService();
