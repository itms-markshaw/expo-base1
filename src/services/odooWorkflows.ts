/**
 * Odoo Workflows & Automation Service
 * Advanced workflow actions, approvals, and business process automation
 */

import { authService } from './auth';

export interface WorkflowAction {
  id: string;
  name: string;
  description: string;
  model: string;
  method: string;
  icon: string;
  color: string;
  requires_confirmation: boolean;
}

export interface ApprovalRequest {
  id: number;
  name: string;
  request_owner_id: [number, string];
  category_id: [number, string];
  request_status: string;
  date_start: string;
  date_end?: string;
  reason: string;
}

class OdooWorkflowsService {

  /**
   * Get available workflow actions for a model/record
   */
  async getWorkflowActions(model: string, recordId: number): Promise<WorkflowAction[]> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      const actions: WorkflowAction[] = [];

      // CRM Lead/Opportunity actions
      if (model === 'crm.lead') {
        const record = await client.read(model, recordId, ['type', 'stage_id', 'probability']);
        if (record.length > 0) {
          const lead = record[0];

          if (lead.type === 'lead') {
            actions.push({
              id: 'convert_to_opportunity',
              name: 'Convert to Opportunity',
              description: 'Convert this lead to an opportunity',
              model,
              method: 'convert_opportunity',
              icon: 'trending-up',
              color: '#007AFF',
              requires_confirmation: true
            });
          }

          if (lead.type === 'opportunity') {
            actions.push({
              id: 'mark_won',
              name: 'Mark as Won',
              description: 'Mark this opportunity as won',
              model,
              method: 'action_set_won',
              icon: 'check-circle',
              color: '#34C759',
              requires_confirmation: true
            });

            actions.push({
              id: 'mark_lost',
              name: 'Mark as Lost',
              description: 'Mark this opportunity as lost',
              model,
              method: 'action_set_lost',
              icon: 'cancel',
              color: '#FF3B30',
              requires_confirmation: true
            });
          }

          actions.push({
            id: 'schedule_activity',
            name: 'Schedule Activity',
            description: 'Schedule a follow-up activity',
            model,
            method: 'activity_schedule',
            icon: 'event',
            color: '#FF9500',
            requires_confirmation: false
          });
        }
      }

      // Purchase Order actions
      if (model === 'purchase.order') {
        const record = await client.read(model, recordId, ['state', 'invoice_status']);
        if (record.length > 0) {
          const po = record[0];

          if (po.state === 'draft') {
            actions.push({
              id: 'confirm_order',
              name: 'Confirm Purchase Order',
              description: 'Send order to vendor and start procurement',
              model,
              method: 'button_confirm',
              icon: 'check-circle',
              color: '#34C759',
              requires_confirmation: true
            });

            actions.push({
              id: 'send_rfq',
              name: 'Send RFQ',
              description: 'Email request for quotation to vendor',
              model,
              method: 'action_rfq_send',
              icon: 'email',
              color: '#007AFF',
              requires_confirmation: false
            });
          }

          if (po.state === 'sent') {
            actions.push({
              id: 'confirm_order',
              name: 'Confirm Purchase Order',
              description: 'Vendor confirmed - finalize the order',
              model,
              method: 'button_confirm',
              icon: 'check-circle',
              color: '#34C759',
              requires_confirmation: true
            });
          }

          if (po.state === 'purchase') {
            actions.push({
              id: 'receive_products',
              name: 'Receive Products',
              description: 'Record product receipt',
              model,
              method: 'action_view_picking',
              icon: 'local-shipping',
              color: '#007AFF',
              requires_confirmation: false
            });

            if (po.invoice_status === 'to invoice') {
              actions.push({
                id: 'create_bill',
                name: 'Create Vendor Bill',
                description: 'Generate vendor bill for payment',
                model,
                method: 'action_create_invoice',
                icon: 'receipt',
                color: '#FF9500',
                requires_confirmation: false
              });
            }
          }

          if (po.state === 'done') {
            actions.push({
              id: 'create_return',
              name: 'Return Products',
              description: 'Process product return to vendor',
              model,
              method: 'action_view_picking',
              icon: 'keyboard-return',
              color: '#FF3B30',
              requires_confirmation: true
            });
          }
        }
      }

      // Sale Order actions
      if (model === 'sale.order') {
        const record = await client.read(model, recordId, ['state', 'invoice_status', 'delivery_status']);
        if (record.length > 0) {
          const so = record[0];

          if (so.state === 'draft') {
            actions.push({
              id: 'confirm_sale',
              name: 'Confirm Sale Order',
              description: 'Confirm this sale order and start fulfillment',
              model,
              method: 'action_confirm',
              icon: 'check-circle',
              color: '#34C759',
              requires_confirmation: true
            });

            actions.push({
              id: 'send_quotation',
              name: 'Send Quotation',
              description: 'Email quotation to customer',
              model,
              method: 'action_quotation_send',
              icon: 'email',
              color: '#007AFF',
              requires_confirmation: false
            });
          }

          if (so.state === 'sent') {
            actions.push({
              id: 'confirm_sale',
              name: 'Confirm Sale Order',
              description: 'Customer accepted - confirm the order',
              model,
              method: 'action_confirm',
              icon: 'check-circle',
              color: '#34C759',
              requires_confirmation: true
            });
          }

          if (so.state === 'sale') {
            if (so.invoice_status === 'to invoice') {
              actions.push({
                id: 'create_invoice',
                name: 'Create Invoice',
                description: 'Generate invoice for this order',
                model,
                method: '_create_invoices',
                icon: 'receipt',
                color: '#FF9500',
                requires_confirmation: false
              });
            }

            if (so.delivery_status === 'pending') {
              actions.push({
                id: 'create_delivery',
                name: 'Create Delivery',
                description: 'Generate delivery order',
                model,
                method: 'action_view_delivery',
                icon: 'local-shipping',
                color: '#9C27B0',
                requires_confirmation: false
              });
            }

            actions.push({
              id: 'add_payment',
              name: 'Register Payment',
              description: 'Record customer payment',
              model,
              method: 'action_view_invoice',
              icon: 'payment',
              color: '#FF6B35',
              requires_confirmation: false
            });
          }

          if (so.state === 'done') {
            actions.push({
              id: 'create_return',
              name: 'Process Return',
              description: 'Handle product return',
              model,
              method: 'action_view_delivery',
              icon: 'keyboard-return',
              color: '#FF3B30',
              requires_confirmation: true
            });
          }

          // Universal actions for all states
          actions.push({
            id: 'duplicate_order',
            name: 'Duplicate Order',
            description: 'Create copy of this order',
            model,
            method: 'copy',
            icon: 'content-copy',
            color: '#666',
            requires_confirmation: false
          });
        }
      }

      // Project Task actions
      if (model === 'project.task') {
        actions.push({
          id: 'mark_done',
          name: 'Mark as Done',
          description: 'Mark this task as completed',
          model,
          method: 'action_done',
          icon: 'check-circle',
          color: '#34C759',
          requires_confirmation: false
        });

        actions.push({
          id: 'log_timesheet',
          name: 'Log Time',
          description: 'Log time spent on this task',
          model,
          method: 'action_timesheet',
          icon: 'access-time',
          color: '#007AFF',
          requires_confirmation: false
        });
      }

      return actions;

    } catch (error) {
      console.error('❌ Failed to get workflow actions:', error.message);
      return [];
    }
  }

  /**
   * Execute a workflow action
   */
  async executeWorkflowAction(action: WorkflowAction, recordId: number, params: any = {}): Promise<boolean> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      console.log(`🔄 Executing workflow action: ${action.name} on ${action.model}:${recordId}`);

      // Handle special cases that return objects
      if (action.method === 'activity_schedule') {
        // Create activity directly instead of calling method that returns object
        const activityData = {
          res_model: action.model,
          res_id: recordId,
          summary: params.summary || `Follow up on ${action.model}`,
          date_deadline: params.date_deadline || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          user_id: client.uid,
          activity_type_id: params.activity_type_id || 1, // Default activity type
          note: params.note || '',
        };

        const activityId = await client.create('mail.activity', activityData);
        console.log(`✅ Created activity: ${activityId}`);

      } else if (action.method === 'convert_opportunity') {
        // Handle lead conversion properly
        await client.callModel(action.model, 'convert_opportunity', [recordId], {
          partner_id: params.partner_id || false,
          user_id: params.user_id || client.uid,
          team_id: params.team_id || false,
        });

      } else if (action.method === 'copy') {
        // Handle record duplication
        const newRecordId = await client.callModel(action.model, 'copy', [recordId], params);
        console.log(`✅ Created duplicate record: ${newRecordId}`);

      } else {
        // Execute standard workflow methods
        try {
          const result = await client.callModel(action.model, action.method, [recordId], params);
          // Only log if result is not an object that can't be serialized
          if (typeof result !== 'object' || result === null || Array.isArray(result)) {
            console.log(`✅ Workflow result: ${result}`);
          }
        } catch (methodError) {
          // If method fails, try alternative approaches
          if (action.method === 'action_confirm') {
            // Try write method for state changes
            await client.update(action.model, recordId, { state: 'sale' });
          } else if (action.method === 'button_confirm') {
            await client.update(action.model, recordId, { state: 'purchase' });
          } else {
            throw methodError;
          }
        }
      }

      // Log the action in chatter
      await client.callModel(action.model, 'message_post', [recordId], {
        body: `<p><strong>Workflow Action:</strong> ${action.name}</p><p>${action.description}</p><p><strong>Executed by:</strong> Mobile App</p>`,
      });

      console.log(`✅ Workflow action executed successfully`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to execute workflow action: ${error.message}`);
      return false;
    }
  }

  /**
   * Get approval requests
   */
  async getApprovalRequests(userId?: number): Promise<ApprovalRequest[]> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      const domain = userId ? [['request_owner_id', '=', userId]] : [];
      
      const requests = await client.searchRead('approval.request', 
        domain, 
        ['name', 'request_owner_id', 'category_id', 'request_status', 'date_start', 'date_end', 'reason']
      );

      return requests;

    } catch (error) {
      console.error('❌ Failed to get approval requests:', error.message);
      return [];
    }
  }

  /**
   * Create approval request
   */
  async createApprovalRequest(data: {
    category_id: number;
    name: string;
    reason: string;
    date_start: string;
    date_end?: string;
  }): Promise<number | null> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      const requestId = await client.create('approval.request', data);
      console.log(`✅ Created approval request with ID: ${requestId}`);
      return requestId;

    } catch (error) {
      console.error('❌ Failed to create approval request:', error.message);
      return null;
    }
  }

  /**
   * Approve/Reject approval request
   */
  async processApprovalRequest(requestId: number, action: 'approve' | 'refuse', reason?: string): Promise<boolean> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      const method = action === 'approve' ? 'action_approve' : 'action_refuse';
      const params = reason ? { reason } : {};

      await client.callModel('approval.request', method, [requestId], params);
      console.log(`✅ ${action === 'approve' ? 'Approved' : 'Rejected'} approval request ${requestId}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to ${action} approval request:`, error.message);
      return false;
    }
  }

  /**
   * Get automated actions (ir.cron jobs)
   */
  async getAutomatedActions(): Promise<any[]> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      const cronJobs = await client.searchRead('ir.cron', 
        [['active', '=', true]], 
        ['name', 'model_id', 'function', 'interval_number', 'interval_type', 'nextcall']
      );

      return cronJobs.map(job => ({
        id: job.id,
        name: job.name,
        model: job.model_id ? job.model_id[1] : 'Unknown',
        function: job.function,
        interval: `${job.interval_number} ${job.interval_type}`,
        next_run: job.nextcall
      }));

    } catch (error) {
      console.error('❌ Failed to get automated actions:', error.message);
      return [];
    }
  }

  /**
   * Trigger manual automation
   */
  async triggerAutomation(cronId: number): Promise<boolean> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      await client.callModel('ir.cron', 'method_direct_trigger', [cronId]);
      console.log(`✅ Triggered automation ${cronId}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to trigger automation:', error.message);
      return false;
    }
  }

  /**
   * Get workflow stages for a model
   */
  async getWorkflowStages(model: string): Promise<any[]> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      let stageModel = '';
      let domain = [];

      // Map models to their stage models
      if (model === 'crm.lead') {
        stageModel = 'crm.stage';
      } else if (model === 'project.task') {
        stageModel = 'project.task.type';
      } else if (model === 'helpdesk.ticket') {
        stageModel = 'helpdesk.stage';
      } else {
        return [];
      }

      const stages = await client.searchRead(stageModel, 
        domain, 
        ['name', 'sequence', 'fold', 'probability']
      );

      return stages.sort((a, b) => a.sequence - b.sequence);

    } catch (error) {
      console.error('❌ Failed to get workflow stages:', error.message);
      return [];
    }
  }

  /**
   * Move record to different stage
   */
  async moveToStage(model: string, recordId: number, stageId: number): Promise<boolean> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      const updateData: any = {};
      
      if (model === 'crm.lead') {
        updateData.stage_id = stageId;
      } else if (model === 'project.task') {
        updateData.stage_id = stageId;
      } else if (model === 'helpdesk.ticket') {
        updateData.stage_id = stageId;
      }

      await client.update(model, recordId, updateData);

      // Log stage change in chatter
      const stage = await client.read(model === 'crm.lead' ? 'crm.stage' : 
                                    model === 'project.task' ? 'project.task.type' : 
                                    'helpdesk.stage', stageId, ['name']);
      
      if (stage.length > 0) {
        await client.callModel(model, 'message_post', [recordId], {
          body: `<p><strong>Stage Changed:</strong> Moved to ${stage[0].name}</p>`,
        });
      }

      console.log(`✅ Moved record to stage ${stageId}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to move to stage:', error.message);
      return false;
    }
  }
}

export const odooWorkflowsService = new OdooWorkflowsService();
