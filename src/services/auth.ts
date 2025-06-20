/**
 * Simple, Working Authentication Service
 * No bullshit, just working Odoo authentication
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { OdooXMLRPCClient } from './OdooXMLRPCClient';
import { ODOO_CONFIG } from '../config/odoo';
import { AuthResult, User } from '../types';

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

      // Get user info
      const userInfo = await this.client.callModel('res.users', 'read', [connectionTest.uid], {
        fields: ['name', 'login', 'email']
      });

      if (!userInfo || userInfo.length === 0) {
        throw new Error('Failed to get user information');
      }

      this.currentUser = {
        id: connectionTest.uid,
        name: userInfo[0].name,
        login: userInfo[0].login,
        email: userInfo[0].email,
      };

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