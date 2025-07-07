/**
 * MockNotificationService - Development fallback for push notifications
 * 
 * This service provides the same interface as NotificationService but works
 * without expo-notifications dependencies for development purposes.
 */

import { Platform, Alert } from 'react-native';
import { BaseAuthService } from '../models/base/services';

export interface NotificationData {
  type: 'new_message' | 'activity_reminder' | 'sync_complete' | 'conflict_detected' | 'assignment' | 'status_change';
  modelName?: string;
  recordId?: number;
  title: string;
  body: string;
  data?: any;
  priority?: 'high' | 'medium' | 'low';
}

class MockNotificationService {
  private isInitialized: boolean = false;
  private mockPushToken: string = 'mock-push-token-' + Math.random().toString(36).substr(2, 9);

  /**
   * Initialize notification service (mock)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🔔 MockNotificationService already initialized');
      return;
    }

    console.log('🔔 Initializing MockNotificationService (Development Mode)...');

    try {
      // Simulate initialization delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      this.isInitialized = true;
      console.log('✅ MockNotificationService initialized successfully');
      console.log('📱 Mock Push Token:', this.mockPushToken);
    } catch (error) {
      console.error('❌ Failed to initialize MockNotificationService:', error);
      throw error;
    }
  }

  /**
   * Send local notification (mock - shows alert instead)
   */
  async sendLocalNotification(notificationData: NotificationData): Promise<void> {
    try {
      console.log('📤 [MOCK] Sending notification:', notificationData);
      
      // Show alert instead of actual notification for development
      Alert.alert(
        `🔔 ${notificationData.title}`,
        notificationData.body,
        [
          {
            text: 'Dismiss',
            style: 'cancel'
          },
          {
            text: 'View',
            onPress: () => {
              console.log('📱 [MOCK] User tapped notification:', notificationData.type);
              this.handleMockNotificationTap(notificationData);
            }
          }
        ]
      );

      console.log('📤 [MOCK] Notification sent successfully');
    } catch (error) {
      console.error('❌ [MOCK] Failed to send notification:', error);
    }
  }

  /**
   * Handle mock notification tap
   */
  private handleMockNotificationTap(notificationData: NotificationData): void {
    console.log('👆 [MOCK] Notification tapped:', notificationData.type);
    
    // Simulate navigation or action
    switch (notificationData.type) {
      case 'new_message':
        console.log('📨 [MOCK] Would navigate to messages');
        break;
      case 'activity_reminder':
        console.log('📅 [MOCK] Would navigate to activities');
        break;
      case 'sync_complete':
        console.log('✅ [MOCK] Would show sync status');
        break;
      case 'conflict_detected':
        console.log('⚠️ [MOCK] Would navigate to conflict resolution');
        break;
      case 'assignment':
        console.log('👤 [MOCK] Would navigate to assigned record');
        break;
      case 'status_change':
        console.log('🔄 [MOCK] Would navigate to updated record');
        break;
    }
  }

  /**
   * Update app badge count (mock)
   */
  async updateBadgeCount(count: number): Promise<void> {
    console.log(`📱 [MOCK] Badge count would be updated to: ${count}`);
  }

  /**
   * Clear all notifications (mock)
   */
  async clearAllNotifications(): Promise<void> {
    console.log('🧹 [MOCK] All notifications would be cleared');
  }

  /**
   * Get current push token (mock)
   */
  getPushToken(): string | null {
    return this.mockPushToken;
  }

  /**
   * Check if notifications are enabled (mock)
   */
  async areNotificationsEnabled(): Promise<boolean> {
    console.log('📱 [MOCK] Notifications would be enabled');
    return true; // Always return true in mock mode
  }

  /**
   * Request permissions (mock)
   */
  async requestPermissions(): Promise<boolean> {
    console.log('📱 [MOCK] Notification permissions would be requested');
    
    // Simulate permission request
    return new Promise((resolve) => {
      Alert.alert(
        'Mock Notification Permissions',
        'In production, this would request actual notification permissions.',
        [
          {
            text: 'Deny',
            onPress: () => resolve(false)
          },
          {
            text: 'Allow',
            onPress: () => resolve(true)
          }
        ]
      );
    });
  }

  /**
   * Send token to Odoo backend (mock)
   */
  async sendTokenToOdoo(token: string): Promise<void> {
    try {
      console.log('📤 [MOCK] Sending push token to Odoo:', token);
      
      const client = authService.getClient();
      const currentUser = authService.getCurrentUser();
      
      if (!client || !currentUser) {
        console.warn('⚠️ [MOCK] No Odoo client or user available');
        return;
      }

      // Mock the token registration
      console.log('✅ [MOCK] Push token would be registered with Odoo');
      
    } catch (error) {
      console.error('❌ [MOCK] Failed to register push token:', error);
    }
  }

  /**
   * Test all notification types
   */
  async testAllNotificationTypes(): Promise<void> {
    const testNotifications: NotificationData[] = [
      {
        type: 'new_message',
        title: 'New Message',
        body: 'You have a new message from John Doe',
        priority: 'high',
        data: { modelName: 'mail.message', recordId: 123 }
      },
      {
        type: 'activity_reminder',
        title: 'Activity Reminder',
        body: 'Meeting with client in 15 minutes',
        priority: 'high',
        data: { modelName: 'mail.activity', recordId: 456 }
      },
      {
        type: 'sync_complete',
        title: 'Sync Complete',
        body: 'Successfully synced 25 records',
        priority: 'low',
        data: { syncedRecords: 25, modelCount: 5 }
      },
      {
        type: 'conflict_detected',
        title: 'Conflict Detected',
        body: 'Data conflict in Contact record needs resolution',
        priority: 'high',
        data: { modelName: 'res.partner', recordId: 789 }
      },
      {
        type: 'assignment',
        title: 'New Assignment',
        body: 'You have been assigned a new task',
        priority: 'medium',
        data: { modelName: 'project.task', recordId: 101 }
      },
      {
        type: 'status_change',
        title: 'Status Update',
        body: 'Sales order SO001 has been confirmed',
        priority: 'medium',
        data: { modelName: 'sale.order', recordId: 202 }
      }
    ];

    console.log('🧪 [MOCK] Testing all notification types...');
    
    for (let i = 0; i < testNotifications.length; i++) {
      const notification = testNotifications[i];
      console.log(`📤 [MOCK] Sending test notification ${i + 1}/${testNotifications.length}: ${notification.type}`);
      
      // Send with delay to avoid overwhelming
      setTimeout(() => {
        this.sendLocalNotification(notification);
      }, i * 2000);
    }
  }

  /**
   * Cleanup (mock)
   */
  destroy(): void {
    this.isInitialized = false;
    console.log('🧹 [MOCK] MockNotificationService destroyed');
  }
}

export const mockNotificationService = new MockNotificationService();
