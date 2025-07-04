/**
 * Contact Model Types (res.partner)
 * Type definitions for Odoo contacts/partners
 */

import { BaseChatterModel } from '../../base/types/BaseModel';

export interface Contact extends BaseChatterModel {
  name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  is_company: boolean;
  parent_id?: [number, string];
  child_ids?: number[];
  category_id?: number[];
  title?: [number, string];
  function?: string;
  street?: string;
  street2?: string;
  city?: string;
  state_id?: [number, string];
  zip?: string;
  country_id?: [number, string];
  vat?: string;
  customer_rank: number;
  supplier_rank: number;
  employee?: boolean;
  user_ids?: number[];
  bank_ids?: number[];
  comment?: string;
  credit_limit?: number;
  active: boolean;
  image_1920?: string;
  image_128?: string;
  lang?: string;
  tz?: string;
  signup_token?: string;
  signup_type?: string;
  signup_expiration?: string;
  partner_share?: boolean;
  commercial_partner_id?: [number, string];
  commercial_company_name?: string;
  company_name?: string;
}

export interface ContactFormData {
  name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;
  is_company: boolean;
  parent_id?: number;
  title?: number;
  function?: string;
  street?: string;
  street2?: string;
  city?: string;
  state_id?: number;
  zip?: string;
  country_id?: number;
  vat?: string;
  customer_rank?: number;
  supplier_rank?: number;
  comment?: string;
  active?: boolean;
  lang?: string;
  tz?: string;
}

export interface ContactFilters {
  type: 'all' | 'customers' | 'suppliers' | 'companies' | 'individuals';
  country?: number;
  state?: number;
  category?: number[];
  active?: boolean;
}

export interface ContactSearchCriteria {
  query?: string;
  filters?: ContactFilters;
  sortBy?: 'name' | 'email' | 'create_date' | 'write_date';
  sortOrder?: 'asc' | 'desc';
}

export const CONTACT_TYPES = {
  ALL: 'all',
  CUSTOMERS: 'customers',
  SUPPLIERS: 'suppliers',
  COMPANIES: 'companies',
  INDIVIDUALS: 'individuals',
} as const;

export const CONTACT_FIELDS = {
  LIST: [
    'id', 'name', 'email', 'phone', 'mobile', 'is_company', 
    'customer_rank', 'supplier_rank', 'category_id', 'country_id',
    'city', 'active', 'image_128', 'create_date', 'write_date'
  ],
  DETAIL: [
    'id', 'name', 'email', 'phone', 'mobile', 'website', 'is_company',
    'parent_id', 'child_ids', 'category_id', 'title', 'function',
    'street', 'street2', 'city', 'state_id', 'zip', 'country_id',
    'vat', 'customer_rank', 'supplier_rank', 'employee', 'user_ids',
    'bank_ids', 'comment', 'credit_limit', 'active', 'image_1920',
    'image_128', 'lang', 'tz', 'commercial_partner_id', 'commercial_company_name',
    'company_name', 'create_date', 'write_date', 'create_uid', 'write_uid'
  ],
  SEARCH: ['name', 'email', 'phone', 'mobile', 'vat', 'city'],
} as const;
