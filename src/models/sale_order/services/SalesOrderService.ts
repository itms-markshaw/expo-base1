/**
 * Sales Order Service (sale.order)
 * Specialized service for sales order operations
 */

import { BaseModelService } from '../../base/services/BaseModelService';
import { authService } from '../../../services/auth';
import {
  SalesOrder,
  SalesOrderLine,
  SalesOrderFormData,
  SalesOrderFilters,
  SalesOrderSearchCriteria,
  SALES_ORDER_FIELDS,
  SALES_ORDER_LINE_FIELDS
} from '../types/SalesOrder';

export class SalesOrderService extends BaseModelService<SalesOrder> {
  constructor() {
    super('sale.order', SALES_ORDER_FIELDS.LIST, SALES_ORDER_FIELDS.SEARCH);
  }

  /**
   * Search sales orders with advanced criteria
   */
  async searchSalesOrders(criteria: SalesOrderSearchCriteria = {}): Promise<SalesOrder[]> {
    const domain = this.buildSalesOrderDomain(criteria);
    const fields = criteria.query ? SALES_ORDER_FIELDS.LIST : SALES_ORDER_FIELDS.DETAIL;
    
    return this.searchRead(domain, fields, {
      order: this.buildOrderClause(criteria.sortBy, criteria.sortOrder),
      limit: 100,
    });
  }

  /**
   * Get sales order by ID with full details
   */
  async getSalesOrderDetail(id: number): Promise<SalesOrder | null> {
    return this.read(id, SALES_ORDER_FIELDS.DETAIL);
  }

  /**
   * Create new sales order
   */
  async createSalesOrder(data: SalesOrderFormData): Promise<number> {
    const orderData = this.prepareSalesOrderData(data);
    return this.create(orderData);
  }

  /**
   * Update existing sales order
   */
  async updateSalesOrder(id: number, data: Partial<SalesOrderFormData>): Promise<boolean> {
    const orderData = this.prepareSalesOrderData(data);
    return this.update(id, orderData);
  }

  /**
   * Get sales order lines for a specific order
   */
  async getSalesOrderLines(orderId: number, limit: number = 50, offset: number = 0): Promise<SalesOrderLine[]> {
    try {
      const client = authService.getClient();
      if (!client) {
        throw new Error('Not authenticated');
      }

      const lines = await client.searchRead(
        'sale.order.line',
        [['order_id', '=', orderId]],
        SALES_ORDER_LINE_FIELDS.DETAIL,
        {
          order: 'sequence asc, id asc',
          limit,
          offset
        }
      );

      return lines as SalesOrderLine[];
    } catch (error) {
      console.error(`Failed to load order lines for order ${orderId}:`, error);
      return [];
    }
  }

  /**
   * Get orders by state
   */
  async getOrdersByState(state: string, limit: number = 50): Promise<SalesOrder[]> {
    return this.searchRead(
      [['state', '=', state]],
      SALES_ORDER_FIELDS.LIST,
      { order: 'date_order desc', limit }
    );
  }

  /**
   * Get orders by salesperson
   */
  async getOrdersBySalesperson(userId: number, limit: number = 50): Promise<SalesOrder[]> {
    return this.searchRead(
      [['user_id', '=', userId]],
      SALES_ORDER_FIELDS.LIST,
      { order: 'date_order desc', limit }
    );
  }

  /**
   * Get orders by customer
   */
  async getOrdersByCustomer(partnerId: number, limit: number = 50): Promise<SalesOrder[]> {
    return this.searchRead(
      [['partner_id', '=', partnerId]],
      SALES_ORDER_FIELDS.LIST,
      { order: 'date_order desc', limit }
    );
  }

  /**
   * Get orders by team
   */
  async getOrdersByTeam(teamId: number, limit: number = 50): Promise<SalesOrder[]> {
    return this.searchRead(
      [['team_id', '=', teamId]],
      SALES_ORDER_FIELDS.LIST,
      { order: 'date_order desc', limit }
    );
  }

  /**
   * Get orders in date range
   */
  async getOrdersInDateRange(dateFrom: string, dateTo: string, limit: number = 100): Promise<SalesOrder[]> {
    return this.searchRead(
      [
        ['date_order', '>=', dateFrom],
        ['date_order', '<=', dateTo]
      ],
      SALES_ORDER_FIELDS.LIST,
      { order: 'date_order desc', limit }
    );
  }

  /**
   * Confirm sales order (draft -> sale)
   */
  async confirmOrder(orderId: number): Promise<boolean> {
    try {
      const client = authService.getClient();
      if (!client) {
        throw new Error('Not authenticated');
      }

      await client.call('sale.order', 'action_confirm', [orderId]);
      console.log(`Confirmed sales order ${orderId}`);
      return true;
    } catch (error) {
      console.error(`Failed to confirm order ${orderId}:`, error);
      return false;
    }
  }

  /**
   * Cancel sales order
   */
  async cancelOrder(orderId: number): Promise<boolean> {
    try {
      const client = authService.getClient();
      if (!client) {
        throw new Error('Not authenticated');
      }

      await client.call('sale.order', 'action_cancel', [orderId]);
      console.log(`Cancelled sales order ${orderId}`);
      return true;
    } catch (error) {
      console.error(`Failed to cancel order ${orderId}:`, error);
      return false;
    }
  }

  /**
   * Send quotation by email
   */
  async sendQuotation(orderId: number): Promise<boolean> {
    try {
      const client = authService.getClient();
      if (!client) {
        throw new Error('Not authenticated');
      }

      await client.call('sale.order', 'action_quotation_send', [orderId]);
      console.log(`Sent quotation for order ${orderId}`);
      return true;
    } catch (error) {
      console.error(`Failed to send quotation for order ${orderId}:`, error);
      return false;
    }
  }

  /**
   * Create invoice from sales order
   */
  async createInvoice(orderId: number): Promise<boolean> {
    try {
      const client = authService.getClient();
      if (!client) {
        throw new Error('Not authenticated');
      }

      await client.call('sale.order', '_create_invoices', [orderId]);
      console.log(`Created invoice for order ${orderId}`);
      return true;
    } catch (error) {
      console.error(`Failed to create invoice for order ${orderId}:`, error);
      return false;
    }
  }

  /**
   * Build domain for sales order search
   */
  private buildSalesOrderDomain(criteria: SalesOrderSearchCriteria): any[] {
    const domain: any[] = [];

    // Text search
    if (criteria.query && criteria.query.trim()) {
      const searchDomain = this.buildSearchDomain(criteria.query);
      domain.push(...searchDomain);
    }

    // Filters
    if (criteria.filters) {
      const { filters } = criteria;

      if (filters.state) {
        domain.push(['state', '=', filters.state]);
      }

      if (filters.user_id) {
        domain.push(['user_id', '=', filters.user_id]);
      }

      if (filters.team_id) {
        domain.push(['team_id', '=', filters.team_id]);
      }

      if (filters.partner_id) {
        domain.push(['partner_id', '=', filters.partner_id]);
      }

      if (filters.date_from) {
        domain.push(['date_order', '>=', filters.date_from]);
      }

      if (filters.date_to) {
        domain.push(['date_order', '<=', filters.date_to]);
      }

      if (filters.amount_min) {
        domain.push(['amount_total', '>=', filters.amount_min]);
      }

      if (filters.amount_max) {
        domain.push(['amount_total', '<=', filters.amount_max]);
      }
    }

    return domain;
  }

  /**
   * Build order clause for sorting
   */
  private buildOrderClause(sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc'): string {
    const validSortFields = ['name', 'date_order', 'amount_total', 'partner_id', 'state'];
    const field = validSortFields.includes(sortBy || '') ? sortBy : 'date_order';
    return `${field} ${sortOrder}`;
  }

  /**
   * Prepare sales order data for create/update
   */
  private prepareSalesOrderData(data: Partial<SalesOrderFormData>): any {
    const prepared: any = { ...data };

    // Handle date fields
    if (data.date_order) {
      prepared.date_order = data.date_order;
    }
    if (data.validity_date) {
      prepared.validity_date = data.validity_date;
    }
    if (data.commitment_date) {
      prepared.commitment_date = data.commitment_date;
    }
    if (data.expected_date) {
      prepared.expected_date = data.expected_date;
    }

    // Handle relational fields
    if (data.partner_id) {
      prepared.partner_id = data.partner_id;
    }
    if (data.partner_invoice_id) {
      prepared.partner_invoice_id = data.partner_invoice_id;
    }
    if (data.partner_shipping_id) {
      prepared.partner_shipping_id = data.partner_shipping_id;
    }
    if (data.user_id) {
      prepared.user_id = data.user_id;
    }
    if (data.team_id) {
      prepared.team_id = data.team_id;
    }
    if (data.pricelist_id) {
      prepared.pricelist_id = data.pricelist_id;
    }
    if (data.payment_term_id) {
      prepared.payment_term_id = data.payment_term_id;
    }
    if (data.fiscal_position_id) {
      prepared.fiscal_position_id = data.fiscal_position_id;
    }
    if (data.opportunity_id) {
      prepared.opportunity_id = data.opportunity_id;
    }
    if (data.campaign_id) {
      prepared.campaign_id = data.campaign_id;
    }
    if (data.medium_id) {
      prepared.medium_id = data.medium_id;
    }
    if (data.source_id) {
      prepared.source_id = data.source_id;
    }

    // Handle many2many fields
    if (data.tag_ids) {
      prepared.tag_ids = [[6, 0, data.tag_ids]]; // Replace all tags
    }

    return prepared;
  }

  /**
   * Validate sales order data
   */
  validateSalesOrderData(data: SalesOrderFormData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!data.partner_id) {
      errors.push('Customer is required');
    }

    // Date validation
    if (data.date_order && data.validity_date) {
      const orderDate = new Date(data.date_order);
      const validityDate = new Date(data.validity_date);
      if (validityDate < orderDate) {
        errors.push('Validity date cannot be before order date');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const salesOrderService = new SalesOrderService();
