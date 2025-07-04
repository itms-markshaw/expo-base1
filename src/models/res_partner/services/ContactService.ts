/**
 * Contact Service (res.partner)
 * Specialized service for contact/partner operations
 */

import { BaseModelService } from '../../base/services/BaseModelService';
import { Contact, ContactFormData, ContactFilters, ContactSearchCriteria, CONTACT_FIELDS } from '../types/Contact';

export class ContactService extends BaseModelService<Contact> {
  constructor() {
    super('res.partner', CONTACT_FIELDS.LIST, CONTACT_FIELDS.SEARCH);
  }

  /**
   * Search contacts with advanced criteria
   */
  async searchContacts(criteria: ContactSearchCriteria = {}): Promise<Contact[]> {
    const domain = this.buildContactDomain(criteria);
    const fields = criteria.query ? CONTACT_FIELDS.LIST : CONTACT_FIELDS.DETAIL;
    
    return this.searchRead(domain, fields, {
      order: this.buildOrderClause(criteria.sortBy, criteria.sortOrder),
      limit: 100,
    });
  }

  /**
   * Get contact by ID with full details
   */
  async getContactDetail(id: number): Promise<Contact | null> {
    return this.read(id, CONTACT_FIELDS.DETAIL);
  }

  /**
   * Create new contact
   */
  async createContact(data: ContactFormData): Promise<number> {
    const contactData = this.prepareContactData(data);
    return this.create(contactData);
  }

  /**
   * Update existing contact
   */
  async updateContact(id: number, data: Partial<ContactFormData>): Promise<boolean> {
    const contactData = this.prepareContactData(data);
    return this.update(id, contactData);
  }

  /**
   * Get customers only
   */
  async getCustomers(limit: number = 50): Promise<Contact[]> {
    return this.searchRead(
      [['customer_rank', '>', 0]],
      CONTACT_FIELDS.LIST,
      { order: 'name asc', limit }
    );
  }

  /**
   * Get suppliers only
   */
  async getSuppliers(limit: number = 50): Promise<Contact[]> {
    return this.searchRead(
      [['supplier_rank', '>', 0]],
      CONTACT_FIELDS.LIST,
      { order: 'name asc', limit }
    );
  }

  /**
   * Get companies only
   */
  async getCompanies(limit: number = 50): Promise<Contact[]> {
    return this.searchRead(
      [['is_company', '=', true]],
      CONTACT_FIELDS.LIST,
      { order: 'name asc', limit }
    );
  }

  /**
   * Get individuals only
   */
  async getIndividuals(limit: number = 50): Promise<Contact[]> {
    return this.searchRead(
      [['is_company', '=', false]],
      CONTACT_FIELDS.LIST,
      { order: 'name asc', limit }
    );
  }

  /**
   * Search contacts by email
   */
  async searchByEmail(email: string): Promise<Contact[]> {
    return this.searchRead(
      [['email', 'ilike', email]],
      CONTACT_FIELDS.LIST,
      { order: 'name asc', limit: 20 }
    );
  }

  /**
   * Search contacts by phone
   */
  async searchByPhone(phone: string): Promise<Contact[]> {
    return this.searchRead(
      ['|', ['phone', 'ilike', phone], ['mobile', 'ilike', phone]],
      CONTACT_FIELDS.LIST,
      { order: 'name asc', limit: 20 }
    );
  }

  /**
   * Get contact's children (for companies)
   */
  async getContactChildren(parentId: number): Promise<Contact[]> {
    return this.searchRead(
      [['parent_id', '=', parentId]],
      CONTACT_FIELDS.LIST,
      { order: 'name asc' }
    );
  }

  /**
   * Build domain for contact search
   */
  private buildContactDomain(criteria: ContactSearchCriteria): any[] {
    const domain: any[] = [];

    // Text search
    if (criteria.query && criteria.query.trim()) {
      const searchDomain = this.buildSearchDomain(criteria.query);
      domain.push(...searchDomain);
    }

    // Filters
    if (criteria.filters) {
      const { filters } = criteria;

      // Type filter
      switch (filters.type) {
        case 'customers':
          domain.push(['customer_rank', '>', 0]);
          break;
        case 'suppliers':
          domain.push(['supplier_rank', '>', 0]);
          break;
        case 'companies':
          domain.push(['is_company', '=', true]);
          break;
        case 'individuals':
          domain.push(['is_company', '=', false]);
          break;
      }

      // Country filter
      if (filters.country) {
        domain.push(['country_id', '=', filters.country]);
      }

      // State filter
      if (filters.state) {
        domain.push(['state_id', '=', filters.state]);
      }

      // Category filter
      if (filters.category && filters.category.length > 0) {
        domain.push(['category_id', 'in', filters.category]);
      }

      // Active filter
      if (filters.active !== undefined) {
        domain.push(['active', '=', filters.active]);
      }
    }

    return domain;
  }

  /**
   * Build order clause for sorting
   */
  private buildOrderClause(sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc'): string {
    const validSortFields = ['name', 'email', 'create_date', 'write_date'];
    const field = validSortFields.includes(sortBy || '') ? sortBy : 'name';
    return `${field} ${sortOrder}`;
  }

  /**
   * Prepare contact data for create/update
   */
  private prepareContactData(data: Partial<ContactFormData>): any {
    const prepared: any = { ...data };

    // Ensure required fields
    if (data.name) {
      prepared.name = data.name.trim();
    }

    // Handle email
    if (data.email) {
      prepared.email = data.email.trim().toLowerCase();
    }

    // Handle phone numbers
    if (data.phone) {
      prepared.phone = data.phone.trim();
    }
    if (data.mobile) {
      prepared.mobile = data.mobile.trim();
    }

    // Handle boolean fields
    if (data.is_company !== undefined) {
      prepared.is_company = data.is_company;
    }
    if (data.active !== undefined) {
      prepared.active = data.active;
    }

    // Handle numeric fields
    if (data.customer_rank !== undefined) {
      prepared.customer_rank = data.customer_rank;
    }
    if (data.supplier_rank !== undefined) {
      prepared.supplier_rank = data.supplier_rank;
    }

    // Handle relational fields
    if (data.parent_id) {
      prepared.parent_id = data.parent_id;
    }
    if (data.title) {
      prepared.title = data.title;
    }
    if (data.state_id) {
      prepared.state_id = data.state_id;
    }
    if (data.country_id) {
      prepared.country_id = data.country_id;
    }

    return prepared;
  }

  /**
   * Validate contact data
   */
  validateContactData(data: ContactFormData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!data.name || !data.name.trim()) {
      errors.push('Name is required');
    }

    // Email validation
    if (data.email && data.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email.trim())) {
        errors.push('Invalid email format');
      }
    }

    // Phone validation (basic)
    if (data.phone && data.phone.trim()) {
      const phoneRegex = /^[\d\s\-\+\(\)]+$/;
      if (!phoneRegex.test(data.phone.trim())) {
        errors.push('Invalid phone format');
      }
    }

    // Mobile validation (basic)
    if (data.mobile && data.mobile.trim()) {
      const mobileRegex = /^[\d\s\-\+\(\)]+$/;
      if (!mobileRegex.test(data.mobile.trim())) {
        errors.push('Invalid mobile format');
      }
    }

    // Website validation
    if (data.website && data.website.trim()) {
      try {
        new URL(data.website.trim());
      } catch {
        errors.push('Invalid website URL');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const contactService = new ContactService();
