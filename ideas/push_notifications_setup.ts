# PUSH NOTIFICATIONS IMPLEMENTATION

## 1. REQUIRED DEPENDENCIES
```bash
# Core notification handling
expo install expo-notifications expo-device expo-constants

# For notification permissions and device tokens
expo install expo-permissions

# For Odoo backend integration (if custom)
npm install @react-native-firebase/app @react-native-firebase/messaging
# OR use Expo's managed service (easier)
```

## 2. NOTIFICATION SERVICE SETUP
# Add to src/services/notifications.ts

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

interface NotificationData {
  type: 'new_message' | 'activity_reminder' | 'sync_complete' | 'conflict_detected';
  modelName?: string;
  recordId?: number;
  title: string;
  body: string;
  data?: any;
}

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  /**
   * Initialize notification service
   */
  async initialize(): Promise<void> {
    console.log('🔔 Initializing NotificationService...');

    // Set notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    // Request permissions and get token
    await this.requestPermissions();
    await this.registerForPushNotifications();

    // Set up listeners
    this.setupNotificationListeners();

    console.log('✅ NotificationService initialized');
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

    // Android specific settings
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      // Create specific channels for different notification types
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'New Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: true,
      });

      await Notifications.setNotificationChannelAsync('sync', {
        name: 'Sync Updates',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 100],
        sound: false,
      });
    }

    return true;
  }

  /**
   * Register for push notifications and get token
   */
  private async registerForPushNotifications(): Promise<void> {
    try {
      this.expoPushToken = (
        await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        })
      ).data;

      console.log('📱 Expo Push Token:', this.expoPushToken);

      // Send token to Odoo backend
      await this.sendTokenToOdoo(this.expoPushToken);

    } catch (error) {
      console.error('❌ Failed to get push token:', error);
    }
  }

  /**
   * Send push token to Odoo backend
   */
  private async sendTokenToOdoo(token: string): Promise<void> {
    try {
      const client = authService.getClient();
      if (!client) {
        console.warn('⚠️ No Odoo client available to register push token');
        return;
      }

      // Register device token with Odoo
      // This requires custom Odoo module or using existing notification infrastructure
      await client.callModel('mobile.device', 'create', [{
        user_id: authService.getCurrentUser()?.id,
        push_token: token,
        device_type: Platform.OS,
        app_version: Constants.expoConfig?.version || '1.0.0',
        active: true,
      }]);

      console.log('✅ Push token registered with Odoo');

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
  }

  /**
   * Handle notification received (app in foreground)
   */
  private async handleNotificationReceived(notification: Notifications.Notification): Promise<void> {
    console.log('🔔 Notification received:', notification);

    const { type, modelName, recordId } = notification.request.content.data || {};

    switch (type) {
      case 'new_message':
        // Trigger immediate sync for messages
        await this.syncSpecificModel('mail.message');
        // Update badge count
        await this.updateMessageBadge();
        break;

      case 'activity_reminder':
        // Sync activities
        await this.syncSpecificModel('mail.activity');
        break;

      case 'sync_complete':
        // Refresh sync status in UI
        this.notifyAppOfSyncComplete();
        break;

      case 'conflict_detected':
        // Navigate to conflict resolution screen
        this.notifyAppOfConflict(recordId);
        break;

      default:
        console.log('📬 Unknown notification type:', type);
    }
  }

  /**
   * Handle notification tap/interaction
   */
  private async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    console.log('👆 Notification tapped:', response);

    const { type, modelName, recordId } = response.notification.request.content.data || {};

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

      default:
        // Default action - open app to dashboard
        this.navigateToApp();
    }
  }

  /**
   * Send local notification (for testing or offline scenarios)
   */
  async sendLocalNotification(notificationData: NotificationData): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationData.title,
          body: notificationData.body,
          data: notificationData.data || {},
          sound: true,
          priority: Notifications.AndroidImportance.HIGH,
        },
        trigger: null, // Send immediately
      });

      console.log('📤 Local notification sent');
    } catch (error) {
      console.error('❌ Failed to send local notification:', error);
    }
  }

  /**
   * Update app badge count
   */
  async updateBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
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
    } catch (error) {
      console.error('❌ Failed to clear notifications:', error);
    }
  }

  // Private helper methods
  private async syncSpecificModel(modelName: string): Promise<void> {
    try {
      // Trigger sync for specific model
      await syncService.syncModel(modelName);
    } catch (error) {
      console.error(`❌ Failed to sync ${modelName}:`, error);
    }
  }

  private async updateMessageBadge(): Promise<void> {
    try {
      // Get unread message count from database
      const unreadCount = await databaseService.getUnreadMessageCount();
      await this.updateBadgeCount(unreadCount);
    } catch (error) {
      console.error('❌ Failed to update message badge:', error);
    }
  }

  private notifyAppOfSyncComplete(): void {
    // Emit event or update global state
    // Could use EventEmitter or Redux/Zustand store
  }

  private notifyAppOfConflict(recordId?: number): void {
    // Notify app of conflict requiring user attention
  }

  private navigateToMessages(recordId?: number): void {
    // Navigate to messages screen
    // Implementation depends on your navigation setup
  }

  private navigateToActivities(recordId?: number): void {
    // Navigate to activities screen
  }

  private navigateToConflictResolution(recordId?: number): void {
    // Navigate to conflict resolution screen
  }

  private navigateToApp(): void {
    // Navigate to main app (dashboard)
  }

  /**
   * Cleanup listeners
   */
  destroy(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  /**
   * Get current push token
   */
  getPushToken(): string | null {
    return this.expoPushToken;
  }
}

export const notificationService = new NotificationService();

## 3. ODOO BACKEND REQUIREMENTS

### Option A: Custom Odoo Module (Recommended)
```python
# addons/mobile_notifications/__manifest__.py
{
    'name': 'Mobile Push Notifications',
    'version': '1.0',
    'depends': ['base', 'mail'],
    'data': [
        'security/ir.model.access.csv',
        'views/mobile_device_views.xml',
    ],
    'installable': True,
}

# addons/mobile_notifications/models/mobile_device.py
from odoo import models, fields, api
import requests
import json

class MobileDevice(models.Model):
    _name = 'mobile.device'
    _description = 'Mobile Device Registration'

    user_id = fields.Many2one('res.users', string='User', required=True)
    push_token = fields.Char(string='Push Token', required=True)
    device_type = fields.Selection([('ios', 'iOS'), ('android', 'Android')], required=True)
    app_version = fields.Char(string='App Version')
    active = fields.Boolean(string='Active', default=True)
    created_date = fields.Datetime(string='Created Date', default=fields.Datetime.now)

    @api.model
    def send_push_notification(self, user_ids, title, body, data=None):
        """Send push notification to specific users"""
        devices = self.search([
            ('user_id', 'in', user_ids),
            ('active', '=', True)
        ])
        
        for device in devices:
            self._send_expo_notification(device.push_token, title, body, data or {})
    
    def _send_expo_notification(self, token, title, body, data):
        """Send notification via Expo Push Service"""
        payload = {
            'to': token,
            'title': title,
            'body': body,
            'data': data,
            'sound': 'default',
            'priority': 'high',
        }
        
        try:
            response = requests.post(
                'https://exp.host/--/api/v2/push/send',
                headers={'Content-Type': 'application/json'},
                data=json.dumps(payload)
            )
            return response.json()
        except Exception as e:
            print(f"Failed to send push notification: {e}")

# addons/mobile_notifications/models/mail_message.py
from odoo import models, api

class MailMessage(models.Model):
    _inherit = 'mail.message'

    @api.model_create_multi
    def create(self, vals_list):
        """Override to send push notifications for new messages"""
        messages = super().create(vals_list)
        
        for message in messages:
            if message.message_type in ['comment', 'notification']:
                # Send push notification to followers
                follower_users = message.res_id and self.env[message.model].browse(message.res_id).message_follower_ids.mapped('partner_id.user_ids') or []
                
                if follower_users:
                    self.env['mobile.device'].send_push_notification(
                        user_ids=follower_users.ids,
                        title=f'New message on {message.record_name or message.model}',
                        body=message.body[:100] + '...' if len(message.body) > 100 else message.body,
                        data={
                            'type': 'new_message',
                            'message_id': message.id,
                            'model': message.model,
                            'res_id': message.res_id,
                        }
                    )
        
        return messages
```

### Option B: Use Existing Odoo Discuss/Mail Infrastructure
```python
# If Odoo has existing push notification setup
# Configure in Odoo settings > Discuss > Push Notifications
# Add webhook endpoints for mobile app registration
```

## 4. NOTIFICATION CATEGORIES & TRIGGERS

| **Notification Type** | **Trigger** | **Priority** | **Sound** | **Vibration** | **Auto-Sync** |
|----------------------|-------------|--------------|-----------|---------------|----------------|
| **New Message** | mail.message create | High | ✅ | ✅ | ✅ Immediate |
| **Activity Reminder** | mail.activity deadline | High | ✅ | ✅ | ✅ Immediate |
| **Mention** | @username in message | High | ✅ | ✅ | ✅ Immediate |
| **Sync Complete** | Background sync finish | Low | ❌ | ❌ | ❌ |
| **Conflict Detected** | Sync conflict found | Medium | ✅ | ❌ | ❌ |
| **Assignment** | Task/ticket assigned | Medium | ✅ | ✅ | ✅ Immediate |
| **Status Change** | Record state change | Low | ❌ | ❌ | 🟡 Delayed |

## 5. INTEGRATION WITH SYNC SERVICE

```typescript
// Add to existing sync.ts
class EnhancedSyncServiceWithNotifications extends SyncService {
  
  /**
   * Sync triggered by push notification
   */
  async syncFromNotification(notificationData: any): Promise<void> {
    const { type, modelName, recordId } = notificationData;
    
    switch (type) {
      case 'new_message':
        // Immediate sync for messages
        await this.syncModel('mail.message');
        break;
        
      case 'activity_reminder':
        // Sync activities
        await this.syncModel('mail.activity');
        break;
        
      case 'record_update':
        // Sync specific model
        if (modelName) {
          await this.syncModel(modelName);
        }
        break;
    }
  }
  
  /**
   * Enhanced sync with notification support
   */
  async startSyncWithNotifications(selectedModels: string[]): Promise<void> {
    try {
      await this.startSync(selectedModels);
      
      // Send local notification on sync complete
      await notificationService.sendLocalNotification({
        type: 'sync_complete',
        title: 'Sync Complete',
        body: `Successfully synced ${selectedModels.length} models`,
      });
      
    } catch (error) {
      // Send notification on sync error
      await notificationService.sendLocalNotification({
        type: 'sync_error',
        title: 'Sync Failed',
        body: 'Check your connection and try again',
      });
      throw error;
    }
  }
}
```

## 6. APP.TSX INTEGRATION

```typescript
// Update App.tsx
import React, { useEffect } from 'react';
import { notificationService } from './src/services/notifications';

export default function App() {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize notification service
        await notificationService.initialize();
        
        // Initialize other services
        await autoSyncService.initialize();
        await backgroundSyncService.initialize();
        
      } catch (error) {
        console.error('❌ App initialization failed:', error);
      }
    };

    initializeApp();

    return () => {
      notificationService.destroy();
      autoSyncService.destroy();
    };
  }, []);

  return (
    // Your app content
  );
}
```