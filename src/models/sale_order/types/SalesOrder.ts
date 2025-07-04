/**
 * Sales Order Model Types (sale.order)
 * Type definitions for Odoo sales orders
 */

import { BaseChatterModel } from '../../base/types/BaseModel';

export interface SalesOrder extends BaseChatterModel {
  name: string;
  partner_id: [number, string];
  partner_invoice_id?: [number, string];
  partner_shipping_id?: [number, string];
  date_order: string;
  validity_date?: string;
  confirmation_date?: string;
  amount_untaxed: number;
  amount_tax: number;
  amount_total: number;
  currency_id: [number, string];
  state: 'draft' | 'sent' | 'sale' | 'done' | 'cancel';
  invoice_status: 'upselling' | 'invoiced' | 'to invoice' | 'no';
  delivery_status: 'pending' | 'partial' | 'full' | 'no';
  user_id: [number, string];
  team_id?: [number, string];
  company_id: [number, string];
  pricelist_id?: [number, string];
  payment_term_id?: [number, string];
  fiscal_position_id?: [number, string];
  order_line: number[];
  note?: string;
  client_order_ref?: string;
  origin?: string;
  opportunity_id?: [number, string];
  campaign_id?: [number, string];
  medium_id?: [number, string];
  source_id?: [number, string];
  tag_ids?: number[];
  invoice_count?: number;
  delivery_count?: number;
  signed_by?: string;
  signed_on?: string;
  commitment_date?: string;
  expected_date?: string;
}

export interface SalesOrderLine {
  id: number;
  order_id: [number, string];
  product_id: [number, string];
  product_template_id?: [number, string];
  name: string;
  display_name?: string;
  product_uom_qty: number;
  product_uom: [number, string];
  price_unit: number;
  price_subtotal: number;
  price_total: number;
  discount: number;
  tax_id?: number[];
  sequence?: number;
  analytic_tag_ids?: number[];
  qty_delivered?: number;
  qty_invoiced?: number;
  qty_to_invoice?: number;
  product_packaging?: [number, string];
  route_id?: [number, string];
  move_ids?: number[];
  invoice_lines?: number[];
  is_expense?: boolean;
  is_downpayment?: boolean;
  state?: string;
  customer_lead?: number;
}

export interface SalesOrderFormData {
  partner_id: number;
  partner_invoice_id?: number;
  partner_shipping_id?: number;
  date_order?: string;
  validity_date?: string;
  user_id?: number;
  team_id?: number;
  pricelist_id?: number;
  payment_term_id?: number;
  fiscal_position_id?: number;
  note?: string;
  client_order_ref?: string;
  origin?: string;
  opportunity_id?: number;
  campaign_id?: number;
  medium_id?: number;
  source_id?: number;
  tag_ids?: number[];
  commitment_date?: string;
  expected_date?: string;
}

export interface SalesOrderFilters {
  state?: 'draft' | 'sent' | 'sale' | 'done' | 'cancel';
  user_id?: number;
  team_id?: number;
  partner_id?: number;
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
}

export interface SalesOrderSearchCriteria {
  query?: string;
  filters?: SalesOrderFilters;
  sortBy?: 'name' | 'date_order' | 'amount_total' | 'partner_id' | 'state';
  sortOrder?: 'asc' | 'desc';
}

export const SALES_ORDER_STATES = {
  DRAFT: 'draft',
  SENT: 'sent',
  SALE: 'sale',
  DONE: 'done',
  CANCEL: 'cancel',
} as const;

export const INVOICE_STATUS = {
  UPSELLING: 'upselling',
  INVOICED: 'invoiced',
  TO_INVOICE: 'to invoice',
  NO: 'no',
} as const;

export const DELIVERY_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  FULL: 'full',
  NO: 'no',
} as const;

export const SALES_ORDER_FIELDS = {
  LIST: [
    'id', 'name', 'partner_id', 'date_order', 'amount_total',
    'amount_untaxed', 'amount_tax', 'state', 'invoice_status',
    'delivery_status', 'user_id', 'team_id', 'currency_id',
    'create_date', 'write_date'
  ],
  DETAIL: [
    'id', 'name', 'partner_id', 'partner_invoice_id', 'partner_shipping_id',
    'date_order', 'validity_date', 'confirmation_date', 'amount_untaxed',
    'amount_tax', 'amount_total', 'currency_id', 'state', 'invoice_status',
    'delivery_status', 'user_id', 'team_id', 'company_id', 'pricelist_id',
    'payment_term_id', 'fiscal_position_id', 'order_line', 'note',
    'client_order_ref', 'origin', 'opportunity_id', 'campaign_id',
    'medium_id', 'source_id', 'tag_ids', 'invoice_count', 'delivery_count',
    'signed_by', 'signed_on', 'commitment_date', 'expected_date',
    'create_date', 'write_date', 'create_uid', 'write_uid'
  ],
  SEARCH: ['name', 'client_order_ref', 'origin'],
} as const;

export const SALES_ORDER_LINE_FIELDS = {
  LIST: [
    'id', 'order_id', 'product_id', 'name', 'product_uom_qty',
    'price_unit', 'price_subtotal', 'discount', 'sequence'
  ],
  DETAIL: [
    'id', 'order_id', 'product_id', 'product_template_id', 'name',
    'display_name', 'product_uom_qty', 'product_uom', 'price_unit',
    'price_subtotal', 'price_total', 'discount', 'tax_id', 'sequence',
    'analytic_tag_ids', 'qty_delivered', 'qty_invoiced', 'qty_to_invoice',
    'product_packaging', 'route_id', 'move_ids', 'invoice_lines',
    'is_expense', 'is_downpayment', 'state', 'customer_lead'
  ],
} as const;
