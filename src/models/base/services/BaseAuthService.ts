/**
 * BaseAuthService - Core authentication service
 * Base service for all Odoo authentication
 *
 * MIGRATED: From src/services/auth.ts
 * Simple, working Odoo authentication
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { OdooXMLRPCClient } from './BaseOdooClient';
import { ODOO_CONFIG } from '../../../config/odoo';
import { AuthResult, User } from '../../../types';

class AuthService {
  private client: OdooXMLRPCClient | null = null;
  private currentUser: User | null = null;

  /**
   * Login to Odoo server
   */
  async login(): Promise<AuthResult> {
    try {
      console.log('🔐 Attempting login to Odoo...');

      // Create XML-RPC client
      this.client = new OdooXMLRPCClient({
        baseURL: ODOO_CONFIG.baseURL,
        database: ODOO_CONFIG.db,
        username: ODOO_CONFIG.username,
        apiKey: ODOO_CONFIG.apiKey,
      });

      // Test connection and authenticate
      const connectionTest = await this.client.testConnection();

      if (!connectionTest.success) {
        throw new Error(connectionTest.error || 'Connection failed');
      }

      // Get comprehensive user info including critical IDs
      const userInfo = await this.client.callModel('res.users', 'read', [connectionTest.uid], {
        fields: ['name', 'login', 'email', 'partner_id', 'company_id']
      });

      if (!userInfo || userInfo.length === 0) {
        throw new Error('Failed to get user information');
      }

      // Parse partner_id from different possible formats
      let partnerId = userInfo[0].partner_id;
      if (Array.isArray(partnerId) && partnerId.length > 0) {
        partnerId = partnerId[0];
      } else if (typeof partnerId === 'string') {
        const match = partnerId.match(/<value><int>(\d+)<\/int>/);
        if (match) {
          partnerId = parseInt(match[1]);
        } else {
          const parsed = parseInt(partnerId);
          if (!isNaN(parsed)) {
            partnerId = parsed;
          }
        }
      }

      // Parse company_id similarly
      let companyId = userInfo[0].company_id;
      if (Array.isArray(companyId) && companyId.length > 0) {
        companyId = companyId[0];
      }

      this.currentUser = {
        id: connectionTest.uid,
        name: userInfo[0].name,
        login: userInfo[0].login,
        email: userInfo[0].email,
        partner_id: partnerId,
        company_id: companyId,
      };

      console.log(`👤 User authenticated: ID=${this.currentUser.id}, Partner=${this.currentUser.partner_id}, Company=${this.currentUser.company_id}`);

      // Store session
      await AsyncStorage.setItem('odoo_user', JSON.stringify(this.currentUser));
      await AsyncStorage.setItem('odoo_authenticated', 'true');

      console.log('✅ Login successful:', this.currentUser.name);

      return {
        success: true,
        user: this.currentUser,
      };

    } catch (error) {
      console.error('❌ Login failed:', error.message);
      this.client = null;
      this.currentUser = null;

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      // Check if we have a stored session
      const isAuth = await AsyncStorage.getItem('odoo_authenticated');
      const userStr = await AsyncStorage.getItem('odoo_user');

      if (isAuth === 'true' && userStr) {
        this.currentUser = JSON.parse(userStr);

        // Recreate client if needed
        if (!this.client) {
          this.client = new OdooXMLRPCClient({
            baseURL: ODOO_CONFIG.baseURL,
            database: ODOO_CONFIG.db,
            username: ODOO_CONFIG.username,
            apiKey: ODOO_CONFIG.apiKey,
          });
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      return false;
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    this.client = null;
    this.currentUser = null;
    await AsyncStorage.removeItem('odoo_authenticated');
    await AsyncStorage.removeItem('odoo_user');
    console.log('✅ Logged out');
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get Odoo client
   */
  getClient(): OdooXMLRPCClient | null {
    return this.client;
  }
}

export const authService = new AuthService();