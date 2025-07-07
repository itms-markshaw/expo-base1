/**
 * Notification Service Foundation - Push notifications and call alerts
 * Sets up the infrastructure needed for audio/video calling
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { authService } from '../../base/services/BaseAuthService';

export interface CallInvitation {
  id: string;
  callerId: number;
  callerName: string;
  callerAvatar?: string;
  channelId: number;
  channelName: string;
  isVideo: boolean;
  timestamp: number;
}

export interface ChatNotification {
  id: string;
  channelId: number;
  channelName: string;
  authorId: number;
  authorName: string;
  messageBody: string;
  timestamp: number;
  isMention: boolean;
}

class NotificationService {
  private expoPushToken: string | null = null;
  private eventListeners = new Map<string, Function[]>();
  private incomingCalls = new Map<string, CallInvitation>();
  private isInitialized = false;

  /**
   * Initialize notification service
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      console.log('🔔 Notification service already initialized');
      return true;
    }

    try {
      console.log('🔔 Initializing notification service...');

      // Configure notification behavior
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          const data = notification.request.content.data;
          
          // Handle incoming calls with high priority
          if (data?.type === 'incoming_call') {
            return {
              shouldShowAlert: true,
              shouldPlaySound: true,
              shouldSetBadge: false,
              priority: Notifications.AndroidNotificationPriority.MAX,
            };
          }

          // Handle chat messages
          if (data?.type === 'chat_message') {
            return {
              shouldShowAlert: true,
              shouldPlaySound: true,
              shouldSetBadge: true,
            };
          }

          // Default behavior
          return {
            shouldShowAlert: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
          };
        },
      });

      // Setup notification response handler
      this.setupNotificationResponseHandler();

      // Register for push notifications
      this.expoPushToken = await this.registerForPushNotifications();
      
      if (this.expoPushToken) {
        console.log('🔔 Push token obtained:', this.expoPushToken);
        await this.sendTokenToOdoo(this.expoPushToken);
      }

      this.isInitialized = true;
      console.log('✅ Notification service initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize notification service:', error);
      return false;
    }
  }

  /**
   * Register for push notifications
   */
  private async registerForPushNotifications(): Promise<string | null> {
    let token = null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      // Create high-priority channel for calls
      await Notifications.setNotificationChannelAsync('calls', {
        name: 'Incoming Calls',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250, 250, 250],
        lightColor: '#007AFF',
        sound: 'call_ringtone.wav',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('⚠️ Push notification permissions not granted');
        return null;
      }
      
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;
      
    } else {
      console.warn('⚠️ Must use physical device for push notifications');
    }

    return token;
  }

  /**
   * Setup notification response handler
   */
  private setupNotificationResponseHandler(): void {
    // Handle notification taps
    Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      
      console.log('🔔 Notification tapped:', data);

      if (data?.type === 'incoming_call') {
        this.handleCallNotificationTap(data);
      } else if (data?.type === 'chat_message') {
        this.handleChatNotificationTap(data);
      }
    });

    // Handle notifications while app is in foreground
    Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      
      console.log('🔔 Notification received while app active:', data);

      if (data?.type === 'incoming_call') {
        this.handleIncomingCall(data);
      } else if (data?.type === 'chat_message') {
        this.handleChatMessage(data);
      }
    });
  }

  /**
   * Send push token to Odoo backend
   */
  private async sendTokenToOdoo(token: string): Promise<void> {
    try {
      const client = authService.getClient();
      if (!client) {
        console.warn('⚠️ No authenticated client to send push token');
        return;
      }

      // Store the push token in user preferences or a custom model
      await client.callModel('res.users', 'write', [client.uid], {
        expo_push_token: token,
        mobile_device_info: {
          platform: Platform.OS,
          device_name: Device.deviceName,
          app_version: Constants.expoConfig?.version,
        }
      });

      console.log('✅ Push token sent to Odoo');

    } catch (error) {
      console.error('❌ Failed to send push token to Odoo:', error);
    }
  }

  /**
   * Show incoming call notification
   */
  async showIncomingCallNotification(call: CallInvitation): Promise<void> {
    try {
      console.log('📞 Showing incoming call notification:', call);

      // Store call for handling
      this.incomingCalls.set(call.id, call);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `📞 Incoming ${call.isVideo ? 'video' : 'voice'} call`,
          body: `${call.callerName} is calling...`,
          sound: 'call_ringtone.wav',
          priority: Notifications.AndroidNotificationPriority.MAX,
          sticky: true,
          categoryIdentifier: 'call',
          data: { 
            type: 'incoming_call',
            callId: call.id,
            channelId: call.channelId,
            callerId: call.callerId,
            callerName: call.callerName,
            isVideo: call.isVideo,
          },
        },
        trigger: null, // Show immediately
      });

      // Auto-dismiss after 30 seconds if not answered
      setTimeout(async () => {
        if (this.incomingCalls.has(call.id)) {
          await this.dismissCallNotification(call.id);
        }
      }, 30000);

    } catch (error) {
      console.error('❌ Failed to show call notification:', error);
    }
  }

  /**
   * Show chat message notification
   */
  async showMessageNotification(notification: ChatNotification): Promise<void> {
    try {
      // Don't show notification if app is in foreground and user is in the same channel
      // This would be handled by the chat service

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.isMention ? `💬 ${notification.authorName} mentioned you` : notification.channelName,
          body: this.extractTextFromHTML(notification.messageBody),
          sound: notification.isMention ? 'mention_sound.wav' : 'message_sound.wav',
          badge: 1,
          data: { 
            type: 'chat_message',
            channelId: notification.channelId,
            messageId: notification.id,
          },
        },
        trigger: null,
      });

      console.log('💬 Message notification scheduled:', notificationId);

    } catch (error) {
      console.error('❌ Failed to show message notification:', error);
    }
  }

  /**
   * Handle incoming call (when app is active)
   */
  private handleIncomingCall(data: any): void {
    const call: CallInvitation = {
      id: data.callId,
      callerId: data.callerId,
      callerName: data.callerName,
      channelId: data.channelId,
      channelName: data.channelName || '',
      isVideo: data.isVideo || false,
      timestamp: Date.now(),
    };

    console.log('📞 Handling incoming call while app active:', call);

    // Emit event for UI to show incoming call modal
    this.emit('incomingCall', call);
  }

  /**
   * Handle chat message (when app is active)
   */
  private handleChatMessage(data: any): void {
    console.log('💬 Handling chat message while app active:', data);

    // Emit event for UI to show in-app notification
    this.emit('newMessage', {
      channelId: data.channelId,
      messageId: data.messageId,
    });
  }

  /**
   * Handle call notification tap
   */
  private handleCallNotificationTap(data: any): void {
    const callId = data.callId;
    const call = this.incomingCalls.get(callId);

    if (call) {
      console.log('📞 Call notification tapped, opening call interface');
      this.emit('callNotificationTapped', call);
    }
  }

  /**
   * Handle chat notification tap
   */
  private handleChatNotificationTap(data: any): void {
    console.log('💬 Chat notification tapped, opening channel:', data.channelId);
    this.emit('chatNotificationTapped', {
      channelId: data.channelId,
      messageId: data.messageId,
    });
  }

  /**
   * Dismiss call notification
   */
  async dismissCallNotification(callId: string): Promise<void> {
    try {
      // Remove from active calls
      this.incomingCalls.delete(callId);

      // Dismiss all call notifications (simpler approach)
      await Notifications.dismissAllNotificationsAsync();

      console.log('📞 Call notification dismissed:', callId);

    } catch (error) {
      console.error('❌ Failed to dismiss call notification:', error);
    }
  }

  /**
   * Clear all chat notifications
   */
  async clearChatNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
      console.log('💬 All notifications cleared');
    } catch (error) {
      console.error('❌ Failed to clear notifications:', error);
    }
  }

  /**
   * Test notification (for development)
   */
  async testNotification(type: 'call' | 'message'): Promise<void> {
    if (type === 'call') {
      await this.showIncomingCallNotification({
        id: 'test-call-' + Date.now(),
        callerId: 123,
        callerName: 'Test Caller',
        channelId: 1,
        channelName: 'Test Channel',
        isVideo: true,
        timestamp: Date.now(),
      });
    } else {
      await this.showMessageNotification({
        id: 'test-msg-' + Date.now(),
        channelId: 1,
        channelName: 'Test Channel',
        authorId: 123,
        authorName: 'Test User',
        messageBody: 'This is a test message notification',
        timestamp: Date.now(),
        isMention: false,
      });
    }
  }

  /**
   * Extract plain text from HTML content
   */
  private extractTextFromHTML(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Event listener management
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in notification listener for ${event}:`, error);
      }
    });
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      hasPushToken: !!this.expoPushToken,
      activeCalls: this.incomingCalls.size,
    };
  }
}

// Create singleton instance
export const notificationService = new NotificationService();
export default notificationService;