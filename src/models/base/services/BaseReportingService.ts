/**
 * BaseReportingService - Odoo Reporting & Analytics Service
 * Base service for all reporting functionality across models
 *
 * MIGRATED: From src/services/odooReporting.ts
 * Advanced XML-RPC integrations for business intelligence
 */

import { authService } from './BaseAuthService';

export interface SalesReport {
  period: string;
  revenue: number;
  leads: number;
  opportunities: number;
  conversion_rate: number;
  top_salesperson: string;
}

export interface InventoryReport {
  product_id: number;
  product_name: string;
  qty_available: number;
  qty_reserved: number;
  reorder_level: number;
  needs_reorder: boolean;
}

export interface ProjectReport {
  project_id: number;
  project_name: string;
  progress: number;
  tasks_total: number;
  tasks_done: number;
  hours_spent: number;
  budget_used: number;
}

class OdooReportingService {

  /**
   * Generate sales performance report
   */
  async getSalesReport(dateFrom: string, dateTo: string): Promise<SalesReport[]> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      // Get opportunities in date range
      const opportunities = await client.searchRead('crm.lead', 
        [
          ['type', '=', 'opportunity'],
          ['create_date', '>=', dateFrom],
          ['create_date', '<=', dateTo]
        ], 
        ['expected_revenue', 'probability', 'user_id', 'stage_id', 'date_closed']
      );

      // Get leads in date range
      const leads = await client.searchRead('crm.lead', 
        [
          ['type', '=', 'lead'],
          ['create_date', '>=', dateFrom],
          ['create_date', '<=', dateTo]
        ], 
        ['user_id']
      );

      // Calculate metrics
      const totalRevenue = opportunities.reduce((sum, opp) => 
        sum + (opp.expected_revenue * (opp.probability / 100)), 0
      );

      const conversionRate = leads.length > 0 ? 
        (opportunities.length / leads.length) * 100 : 0;

      // Find top salesperson
      const salespeople = {};
      opportunities.forEach(opp => {
        if (opp.user_id) {
          const userId = opp.user_id[0];
          const userName = opp.user_id[1];
          if (!salespeople[userId]) {
            salespeople[userId] = { name: userName, revenue: 0, count: 0 };
          }
          salespeople[userId].revenue += opp.expected_revenue * (opp.probability / 100);
          salespeople[userId].count += 1;
        }
      });

      const topSalesperson = Object.values(salespeople)
        .sort((a: any, b: any) => b.revenue - a.revenue)[0] as any;

      return [{
        period: `${dateFrom} to ${dateTo}`,
        revenue: totalRevenue,
        leads: leads.length,
        opportunities: opportunities.length,
        conversion_rate: conversionRate,
        top_salesperson: topSalesperson?.name || 'N/A'
      }];

    } catch (error) {
      console.error('❌ Failed to generate sales report:', error.message);
      return [];
    }
  }

  /**
   * Get inventory status report
   */
  async getInventoryReport(): Promise<InventoryReport[]> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      // Get products with stock information
      const products = await client.searchRead('product.product', 
        [['type', '=', 'product']], 
        ['name', 'qty_available', 'virtual_available', 'reordering_min_qty']
      );

      return products.map(product => ({
        product_id: product.id,
        product_name: product.name,
        qty_available: product.qty_available || 0,
        qty_reserved: (product.qty_available || 0) - (product.virtual_available || 0),
        reorder_level: product.reordering_min_qty || 0,
        needs_reorder: (product.qty_available || 0) <= (product.reordering_min_qty || 0)
      }));

    } catch (error) {
      console.error('❌ Failed to generate inventory report:', error.message);
      return [];
    }
  }

  /**
   * Get project progress report
   */
  async getProjectReport(): Promise<ProjectReport[]> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      // Get projects
      const projects = await client.searchRead('project.project', 
        [['active', '=', true]], 
        ['name']
      );

      const reports = [];

      for (const project of projects) {
        // Get tasks for this project
        const tasks = await client.searchRead('project.task', 
          [['project_id', '=', project.id]], 
          ['stage_id', 'planned_hours', 'effective_hours']
        );

        // Get done tasks (assuming stage with sequence >= 90 is done)
        const stages = await client.searchRead('project.task.type', 
          [], 
          ['sequence', 'fold']
        );

        const doneStages = stages.filter(stage => stage.fold || stage.sequence >= 90);
        const doneStageIds = doneStages.map(stage => stage.id);
        
        const doneTasks = tasks.filter(task => 
          doneStageIds.includes(task.stage_id ? task.stage_id[0] : 0)
        );

        const totalHours = tasks.reduce((sum, task) => sum + (task.effective_hours || 0), 0);
        const progress = tasks.length > 0 ? (doneTasks.length / tasks.length) * 100 : 0;

        reports.push({
          project_id: project.id,
          project_name: project.name,
          progress: Math.round(progress),
          tasks_total: tasks.length,
          tasks_done: doneTasks.length,
          hours_spent: totalHours,
          budget_used: 0 // Would need budget data
        });
      }

      return reports;

    } catch (error) {
      console.error('❌ Failed to generate project report:', error.message);
      return [];
    }
  }

  /**
   * Get financial summary
   */
  async getFinancialSummary(): Promise<any> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      // Get invoices
      const invoices = await client.searchRead('account.move', 
        [
          ['move_type', 'in', ['out_invoice', 'in_invoice']],
          ['state', '=', 'posted']
        ], 
        ['move_type', 'amount_total', 'invoice_date']
      );

      const revenue = invoices
        .filter(inv => inv.move_type === 'out_invoice')
        .reduce((sum, inv) => sum + inv.amount_total, 0);

      const expenses = invoices
        .filter(inv => inv.move_type === 'in_invoice')
        .reduce((sum, inv) => sum + inv.amount_total, 0);

      return {
        revenue,
        expenses,
        profit: revenue - expenses,
        invoice_count: invoices.length
      };

    } catch (error) {
      console.error('❌ Failed to generate financial summary:', error.message);
      return { revenue: 0, expenses: 0, profit: 0, invoice_count: 0 };
    }
  }

  /**
   * Get customer analytics
   */
  async getCustomerAnalytics(): Promise<any> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      // Get customers with sales data
      const customers = await client.searchRead('res.partner', 
        [['is_company', '=', true], ['customer_rank', '>', 0]], 
        ['name', 'total_invoiced', 'credit_limit']
      );

      // Get recent customer activity
      const recentLeads = await client.searchRead('crm.lead', 
        [['create_date', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()]], 
        ['partner_id']
      );

      return {
        total_customers: customers.length,
        total_revenue: customers.reduce((sum, c) => sum + (c.total_invoiced || 0), 0),
        new_leads_30d: recentLeads.length,
        top_customers: customers
          .sort((a, b) => (b.total_invoiced || 0) - (a.total_invoiced || 0))
          .slice(0, 5)
          .map(c => ({ name: c.name, revenue: c.total_invoiced || 0 }))
      };

    } catch (error) {
      console.error('❌ Failed to generate customer analytics:', error.message);
      return { total_customers: 0, total_revenue: 0, new_leads_30d: 0, top_customers: [] };
    }
  }
}

export const odooReportingService = new OdooReportingService();
