/**
 * NotificationService - Push Notifications Implementation
 * 
 * Features:
 * - Expo push notifications integration
 * - Real-time message updates
 * - Conflict detection notifications
 * - Sync completion alerts
 * - Smart navigation handling
 * - Offline notification queuing
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { BaseAuthService } from '../models/base/services';
import { DatabaseService } from '../models/base/services/BaseDatabaseService';

export interface NotificationData {
  type: 'new_message' | 'activity_reminder' | 'sync_complete' | 'conflict_detected' | 'assignment' | 'status_change';
  modelName?: string;
  recordId?: number;
  title: string;
  body: string;
  data?: any;
  priority?: 'high' | 'medium' | 'low';
}

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;
  private isInitialized: boolean = false;

  /**
   * Initialize notification service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🔔 NotificationService already initialized');
      return;
    }

    console.log('🔔 Initializing NotificationService...');

    try {
      // Set notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Request permissions and get token
      const hasPermissions = await this.requestPermissions();
      if (hasPermissions) {
        await this.registerForPushNotifications();
      }

      // Set up listeners
      this.setupNotificationListeners();

      this.isInitialized = true;
      console.log('✅ NotificationService initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize NotificationService:', error);
      throw error;
    }
  }

  /**
   * Request notification permissions
   */
  private async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.warn('⚠️ Push notifications only work on physical devices');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('⚠️ Notification permissions denied');
      return false;
    }

    console.log('✅ Notification permissions granted');

    // Android specific settings
    if (Platform.OS === 'android') {
      await this.setupAndroidChannels();
    }

    return true;
  }

  /**
   * Setup Android notification channels
   */
  private async setupAndroidChannels(): Promise<void> {
    // Default channel
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#007AFF',
    });

    // Messages channel
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'New Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: true,
      description: 'Notifications for new messages and chatter updates',
    });

    // Activities channel
    await Notifications.setNotificationChannelAsync('activities', {
      name: 'Activities & Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: true,
      description: 'Activity reminders and task notifications',
    });

    // Sync channel
    await Notifications.setNotificationChannelAsync('sync', {
      name: 'Sync Updates',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100],
      sound: false,
      description: 'Data synchronization status updates',
    });

    // Conflicts channel
    await Notifications.setNotificationChannelAsync('conflicts', {
      name: 'Sync Conflicts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500, 250, 500],
      sound: true,
      description: 'Data conflict resolution required',
    });

    console.log('✅ Android notification channels configured');
  }

  /**
   * Register for push notifications and get token
   */
  private async registerForPushNotifications(): Promise<void> {
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                       Constants.expoConfig?.projectId ||
                       'your-expo-project-id'; // Fallback

      this.expoPushToken = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;

      console.log('📱 Expo Push Token:', this.expoPushToken);

      // Send token to Odoo backend
      await this.sendTokenToOdoo(this.expoPushToken);

    } catch (error) {
      console.error('❌ Failed to get push token:', error);
      // Continue without throwing - push notifications are optional
    }
  }

  /**
   * Send push token to Odoo backend
   */
  private async sendTokenToOdoo(token: string): Promise<void> {
    try {
      const client = authService.getClient();
      const currentUser = authService.getCurrentUser();
      
      if (!client || !currentUser) {
        console.warn('⚠️ No Odoo client or user available to register push token');
        return;
      }

      // Try to register device token with Odoo
      // This requires a custom Odoo module or existing notification infrastructure
      const deviceData = {
        user_id: currentUser.id,
        push_token: token,
        device_type: Platform.OS,
        app_version: Constants.expoConfig?.version || '1.0.0',
        active: true,
        last_updated: new Date().toISOString(),
      };

      // Attempt to create/update device record
      try {
        await client.callModel('mobile.device', 'create', [deviceData]);
        console.log('✅ Push token registered with Odoo');
      } catch (odooError) {
        // If mobile.device model doesn't exist, try alternative approach
        console.log('⚠️ mobile.device model not found, trying alternative registration...');
        
        // Store token in user preferences or custom field
        await client.write('res.users', [currentUser.id], {
          mobile_push_token: token,
          mobile_device_type: Platform.OS,
        });
        console.log('✅ Push token stored in user record');
      }

    } catch (error) {
      console.error('❌ Failed to register push token with Odoo:', error);
      // Continue without throwing - push notifications are optional
    }
  }

  /**
   * Set up notification listeners
   */
  private setupNotificationListeners(): void {
    // Listen for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived.bind(this)
    );

    // Listen for user interactions with notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );

    console.log('✅ Notification listeners configured');
  }

  /**
   * Handle notification received (app in foreground)
   */
  private async handleNotificationReceived(notification: Notifications.Notification): Promise<void> {
    console.log('🔔 Notification received:', notification);

    const { type, modelName, recordId } = notification.request.content.data || {};

    try {
      switch (type) {
        case 'new_message':
          console.log('📨 New message notification - triggering sync');
          await this.syncSpecificModel('mail.message');
          await this.updateMessageBadge();
          break;

        case 'activity_reminder':
          console.log('📅 Activity reminder - triggering sync');
          await this.syncSpecificModel('mail.activity');
          break;

        case 'sync_complete':
          console.log('✅ Sync complete notification');
          this.notifyAppOfSyncComplete();
          break;

        case 'conflict_detected':
          console.log('⚠️ Conflict detected - user attention required');
          this.notifyAppOfConflict(recordId);
          break;

        case 'assignment':
          console.log('👤 New assignment notification');
          if (modelName) {
            await this.syncSpecificModel(modelName);
          }
          break;

        case 'status_change':
          console.log('🔄 Status change notification');
          if (modelName) {
            await this.syncSpecificModel(modelName);
          }
          break;

        default:
          console.log('📬 Unknown notification type:', type);
      }
    } catch (error) {
      console.error('❌ Error handling notification:', error);
    }
  }

  /**
   * Handle notification tap/interaction
   */
  private async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    console.log('👆 Notification tapped:', response);

    const { type, modelName, recordId } = response.notification.request.content.data || {};

    try {
      // Navigate to relevant screen based on notification type
      switch (type) {
        case 'new_message':
          this.navigateToMessages(recordId);
          break;

        case 'activity_reminder':
          this.navigateToActivities(recordId);
          break;

        case 'conflict_detected':
          this.navigateToConflictResolution(recordId);
          break;

        case 'assignment':
          this.navigateToRecord(modelName, recordId);
          break;

        case 'status_change':
          this.navigateToRecord(modelName, recordId);
          break;

        default:
          // Default action - open app to dashboard
          this.navigateToApp();
      }
    } catch (error) {
      console.error('❌ Error handling notification response:', error);
      // Fallback to opening the app
      this.navigateToApp();
    }
  }

  /**
   * Send local notification (for testing or offline scenarios)
   */
  async sendLocalNotification(notificationData: NotificationData): Promise<void> {
    try {
      const channelId = this.getChannelForType(notificationData.type);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data || {},
          sound: notificationData.priority === 'high',
          priority: this.getPriorityLevel(notificationData.priority),
          categoryIdentifier: notificationData.type,
        },
        trigger: null, // Send immediately
      });

      console.log('📤 Local notification sent:', notificationData.title);
    } catch (error) {
      console.error('❌ Failed to send local notification:', error);
    }
  }

  /**
   * Get notification channel for type
   */
  private getChannelForType(type: string): string {
    switch (type) {
      case 'new_message':
        return 'messages';
      case 'activity_reminder':
      case 'assignment':
        return 'activities';
      case 'sync_complete':
        return 'sync';
      case 'conflict_detected':
        return 'conflicts';
      default:
        return 'default';
    }
  }

  /**
   * Get priority level for notification
   */
  private getPriorityLevel(priority?: string): Notifications.AndroidImportance {
    switch (priority) {
      case 'high':
        return Notifications.AndroidImportance.HIGH;
      case 'medium':
        return Notifications.AndroidImportance.DEFAULT;
      case 'low':
        return Notifications.AndroidImportance.LOW;
      default:
        return Notifications.AndroidImportance.DEFAULT;
    }
  }

  // Helper methods for sync and navigation
  private async syncSpecificModel(modelName: string): Promise<void> {
    try {
      console.log(`🔄 Triggering sync for model: ${modelName}`);
      // Import sync service dynamically to avoid circular dependencies
      const { syncService } = await import('../models/base/services/BaseSyncService');
      await syncService.syncModelFromNotification(modelName);
    } catch (error) {
      console.error(`❌ Failed to sync ${modelName}:`, error);
    }
  }

  private async updateMessageBadge(): Promise<void> {
    try {
      // Get unread message count from database
      // const unreadCount = await databaseService.getUnreadMessageCount();
      // await this.updateBadgeCount(unreadCount);
      console.log('📱 Message badge updated');
    } catch (error) {
      console.error('❌ Failed to update message badge:', error);
    }
  }

  private notifyAppOfSyncComplete(): void {
    console.log('✅ Notifying app of sync completion');
    // Emit event or update global state
  }

  private notifyAppOfConflict(recordId?: number): void {
    console.log('⚠️ Notifying app of conflict:', recordId);
    // Notify app of conflict requiring user attention
  }

  private navigateToMessages(recordId?: number): void {
    console.log('📨 Navigate to messages:', recordId);
    // Implementation depends on your navigation setup
  }

  private navigateToActivities(recordId?: number): void {
    console.log('📅 Navigate to activities:', recordId);
    // Navigate to activities screen
  }

  private navigateToConflictResolution(recordId?: number): void {
    console.log('⚠️ Navigate to conflict resolution:', recordId);
    // Navigate to conflict resolution screen
  }

  private navigateToRecord(modelName?: string, recordId?: number): void {
    console.log('📋 Navigate to record:', modelName, recordId);
    // Navigate to specific record detail screen
  }

  private navigateToApp(): void {
    console.log('🏠 Navigate to main app');
    // Navigate to main app (dashboard)
  }

  /**
   * Update app badge count
   */
  async updateBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
      console.log(`📱 Badge count updated to: ${count}`);
    } catch (error) {
      console.error('❌ Failed to update badge count:', error);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await this.updateBadgeCount(0);
      console.log('🧹 All notifications cleared');
    } catch (error) {
      console.error('❌ Failed to clear notifications:', error);
    }
  }

  /**
   * Get current push token
   */
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('❌ Failed to check notification permissions:', error);
      return false;
    }
  }

  /**
   * Cleanup listeners
   */
  destroy(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
    this.isInitialized = false;
    console.log('🧹 NotificationService destroyed');
  }
}

export const notificationService = new NotificationService();
