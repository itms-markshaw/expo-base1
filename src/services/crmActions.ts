/**
 * CRM Actions Service - Trigger Odoo Business Logic
 * This shows how to programmatically trigger button actions like "CONFIRM", "CONVERT", etc.
 */

import { authService } from './auth';

interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

class CRMActionsService {
  
  /**
   * Convert lead to opportunity
   * Equivalent to clicking "Convert to Opportunity" button in Odoo
   */
  async convertToOpportunity(leadId: number, partnerData?: any): Promise<ActionResult> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      console.log(`🔄 Converting lead ${leadId} to opportunity...`);

      // Method 1: Direct field update (simple conversion)
      const updateResult = await client.update('crm.lead', leadId, {
        type: 'opportunity',
        probability: 10, // Default probability for new opportunity
      });

      if (updateResult) {
        console.log(`✅ Lead ${leadId} converted to opportunity`);
        return {
          success: true,
          message: 'Lead converted to opportunity successfully',
          data: { leadId, type: 'opportunity' }
        };
      }

      throw new Error('Failed to convert lead');

    } catch (error) {
      console.error('❌ Convert to opportunity failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Mark opportunity as won
   * Equivalent to clicking "Mark Won" button in Odoo
   */
  async markAsWon(leadId: number, closeRevenue?: number): Promise<ActionResult> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      console.log(`🏆 Marking opportunity ${leadId} as won...`);

      // Get current lead data
      const leadData = await client.read('crm.lead', leadId, ['stage_id', 'probability', 'expected_revenue']);
      const lead = leadData[0];

      // Update to won stage
      const updateData: any = {
        probability: 100,
        active: true,
        date_closed: new Date().toISOString().split('T')[0], // Today's date
      };

      if (closeRevenue) {
        updateData.expected_revenue = closeRevenue;
      }

      // Try to find "Won" stage (this varies by Odoo configuration)
      try {
        const wonStages = await client.searchRead('crm.stage', 
          [['is_won', '=', true]], 
          ['id', 'name'], 
          { limit: 1 }
        );
        
        if (wonStages.length > 0) {
          updateData.stage_id = wonStages[0].id;
          console.log(`📍 Setting stage to: ${wonStages[0].name}`);
        }
      } catch (stageError) {
        console.warn('⚠️ Could not find won stage, updating probability only');
      }

      const result = await client.update('crm.lead', leadId, updateData);

      if (result) {
        console.log(`✅ Opportunity ${leadId} marked as won`);
        return {
          success: true,
          message: 'Opportunity marked as won successfully',
          data: { leadId, probability: 100, status: 'won' }
        };
      }

      throw new Error('Failed to mark as won');

    } catch (error) {
      console.error('❌ Mark as won failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Mark opportunity as lost
   * Equivalent to clicking "Mark Lost" button in Odoo
   */
  async markAsLost(leadId: number, lostReason?: string): Promise<ActionResult> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      console.log(`❌ Marking opportunity ${leadId} as lost...`);

      const updateData: any = {
        probability: 0,
        active: false,
        date_closed: new Date().toISOString().split('T')[0],
      };

      // Try to find lost reason
      if (lostReason) {
        try {
          const lostReasons = await client.searchRead('crm.lost.reason', 
            [['name', 'ilike', lostReason]], 
            ['id', 'name'], 
            { limit: 1 }
          );
          
          if (lostReasons.length > 0) {
            updateData.lost_reason_id = lostReasons[0].id;
          }
        } catch (reasonError) {
          console.warn('⚠️ Could not find lost reason');
        }
      }

      // Try to find "Lost" stage
      try {
        const lostStages = await client.searchRead('crm.stage', 
          [['probability', '=', 0]], 
          ['id', 'name'], 
          { limit: 1 }
        );
        
        if (lostStages.length > 0) {
          updateData.stage_id = lostStages[0].id;
        }
      } catch (stageError) {
        console.warn('⚠️ Could not find lost stage');
      }

      const result = await client.update('crm.lead', leadId, updateData);

      if (result) {
        console.log(`✅ Opportunity ${leadId} marked as lost`);
        return {
          success: true,
          message: 'Opportunity marked as lost',
          data: { leadId, probability: 0, status: 'lost' }
        };
      }

      throw new Error('Failed to mark as lost');

    } catch (error) {
      console.error('❌ Mark as lost failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Schedule activity (like clicking "Schedule Activity" button)
   */
  async scheduleActivity(leadId: number, activityType: string, summary: string, dueDate: string): Promise<ActionResult> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      console.log(`📅 Scheduling activity for lead ${leadId}...`);

      // Get activity type ID
      let activityTypeId = null;
      try {
        const activityTypes = await client.searchRead('mail.activity.type', 
          [['name', 'ilike', activityType]], 
          ['id', 'name'], 
          { limit: 1 }
        );
        
        if (activityTypes.length > 0) {
          activityTypeId = activityTypes[0].id;
        }
      } catch (typeError) {
        console.warn('⚠️ Could not find activity type, using default');
      }

      // Get res_model_id for crm.lead
      let resModelId = null;
      try {
        const models = await client.searchRead('ir.model',
          [['model', '=', 'crm.lead']],
          ['id'],
          { limit: 1 }
        );
        if (models.length > 0) {
          resModelId = models[0].id;
        }
      } catch (modelError) {
        console.warn('⚠️ Could not find model ID for crm.lead');
      }

      if (!resModelId) {
        throw new Error('Could not find model ID for crm.lead');
      }

      // Create activity
      const activityData: any = {
        res_model: 'crm.lead',
        res_model_id: resModelId,
        res_id: leadId,
        summary: summary,
        date_deadline: dueDate,
        user_id: authService.getClient()?.uid || 1,
      };

      if (activityTypeId) {
        activityData.activity_type_id = activityTypeId;
      }

      const activityId = await client.create('mail.activity', activityData);

      if (activityId) {
        console.log(`✅ Activity ${activityId} scheduled for lead ${leadId}`);
        return {
          success: true,
          message: 'Activity scheduled successfully',
          data: { leadId, activityId, summary, dueDate }
        };
      }

      throw new Error('Failed to create activity');

    } catch (error) {
      console.error('❌ Schedule activity failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update lead stage (like dragging in kanban view)
   */
  async updateStage(leadId: number, stageName: string): Promise<ActionResult> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      console.log(`📍 Updating lead ${leadId} stage to: ${stageName}...`);

      // Find stage by name
      const stages = await client.searchRead('crm.stage', 
        [['name', 'ilike', stageName]], 
        ['id', 'name', 'probability'], 
        { limit: 1 }
      );

      if (stages.length === 0) {
        throw new Error(`Stage "${stageName}" not found`);
      }

      const stage = stages[0];
      const updateData: any = {
        stage_id: stage.id,
      };

      // Update probability if stage has default probability
      if (stage.probability !== undefined) {
        updateData.probability = stage.probability;
      }

      const result = await client.update('crm.lead', leadId, updateData);

      if (result) {
        console.log(`✅ Lead ${leadId} moved to stage: ${stage.name}`);
        return {
          success: true,
          message: `Lead moved to ${stage.name} stage`,
          data: { leadId, stageId: stage.id, stageName: stage.name, probability: stage.probability }
        };
      }

      throw new Error('Failed to update stage');

    } catch (error) {
      console.error('❌ Update stage failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get available stages for CRM
   */
  async getAvailableStages(): Promise<any[]> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      const stages = await client.searchRead('crm.stage', [], 
        ['id', 'name', 'probability', 'is_won', 'sequence'], 
        { order: 'sequence asc' }
      );

      return stages;
    } catch (error) {
      console.error('❌ Get stages failed:', error.message);
      return [];
    }
  }

  /**
   * Test all CRM actions on a lead
   */
  async testAllActions(leadId: number): Promise<ActionResult[]> {
    console.log(`🧪 Testing all CRM actions on lead ${leadId}...`);
    
    const results: ActionResult[] = [];

    // Test 1: Get available stages
    console.log('📋 Getting available stages...');
    const stages = await this.getAvailableStages();
    results.push({
      success: stages.length > 0,
      message: `Found ${stages.length} stages`,
      data: stages
    });

    // Test 2: Update stage (if stages available)
    if (stages.length > 0) {
      const firstStage = stages[0];
      const stageResult = await this.updateStage(leadId, firstStage.name);
      results.push(stageResult);
    }

    // Test 3: Schedule activity
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const activityResult = await this.scheduleActivity(
      leadId, 
      'Call', 
      'Follow up call', 
      tomorrow.toISOString().split('T')[0]
    );
    results.push(activityResult);

    // Test 4: Convert to opportunity (if it's a lead)
    const convertResult = await this.convertToOpportunity(leadId);
    results.push(convertResult);

    console.log(`✅ Completed ${results.length} CRM action tests`);
    return results;
  }
}

export const crmActionsService = new CRMActionsService();
