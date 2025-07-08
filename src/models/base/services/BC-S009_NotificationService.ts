/**
 * Notification Service Foundation - Push notifications and call alerts
 * BC-S009: Sets up the infrastructure needed for audio/video calling
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { authService } from './BaseAuthService';

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
      return true;
    }

    try {
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

      // Register for push notifications (non-blocking) - DISABLED for basic Odoo
      console.log('ℹ️ Push notification registration disabled for basic Odoo installations');
      console.log('ℹ️ To enable: add expo_push_token field to res.users model in Odoo');

      // Still get the token for local use, but don't send to Odoo
      this.registerForPushNotifications()
        .then(token => {
          this.expoPushToken = token;
          if (token) {
            console.log('📱 Push token obtained (stored locally only):', token.substring(0, 20) + '...');
          }
        })
        .catch(error => {
          console.log('⚠️ Push notification registration failed:', error.message);
        });

      this.isInitialized = true;
      return true;

    } catch (error) {
      console.error('Failed to initialize notification service:', error);
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
        console.warn('Push notification permissions not granted');
        return null;
      }
      
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;
      
    } else {
      console.warn('Must use physical device for push notifications');
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

      if (data?.type === 'incoming_call') {
        this.handleCallNotificationTap(data);
      } else if (data?.type === 'chat_message') {
        this.handleChatNotificationTap(data);
      }
    });

    // Handle notifications while app is in foreground
    Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;

      if (data?.type === 'incoming_call') {
        this.handleIncomingCall(data);
      } else if (data?.type === 'chat_message') {
        this.handleChatMessage(data);
      }
    });
  }

  /**
   * Send push token to Odoo backend - DISABLED for basic Odoo installations
   */
  private async sendTokenToOdoo(token: string): Promise<void> {
    // DISABLED: Push token registration disabled for basic Odoo installations
    // This prevents XML-RPC errors when expo_push_token field doesn't exist

    console.log('ℹ️ Push token registration to Odoo is disabled');
    console.log('📱 Push token stored locally only:', token.substring(0, 20) + '...');
    console.log('💡 To enable: Add expo_push_token field to res.users model in Odoo');

    // Store token locally for future use
    this.expoPushToken = token;

    /* ORIGINAL CODE - UNCOMMENT WHEN ODOO HAS PUSH TOKEN FIELDS
    try {
      const client = authService.getClient();
      if (!client) {
        console.log('ℹ️ No authenticated client - storing push token locally only');
        this.expoPushToken = token;
        return;
      }

      // Try to store the push token with timeout
      try {
        const authResult = await client.authenticate();

        const writePromise = client.callModel('res.users', 'write', [authResult.uid], {
          expo_push_token: token
        });

        await Promise.race([
          writePromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Push token write timeout')), 5000)
          )
        ]);

        console.log('✅ Push token stored in Odoo');
      } catch (fieldError: any) {
        console.log('ℹ️ Push token field not available in Odoo:', fieldError.message);
      }

      this.expoPushToken = token;

    } catch (error: any) {
      console.log('⚠️ Could not send push token to Odoo:', error.message);
      this.expoPushToken = token;
    }
    */
  }

  /**
   * Show incoming call notification
   */
  async showIncomingCallNotification(call: CallInvitation): Promise<void> {
    try {
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
      console.error('Failed to show call notification:', error);
    }
  }

  /**
   * Show chat message notification
   */
  async showMessageNotification(notification: ChatNotification): Promise<void> {
    try {
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

    } catch (error) {
      console.error('Failed to show message notification:', error);
    }
  }

  /**
   * Handle incoming call (when app is active)
   */
  private handleIncomingCall(data: any): void {
    // Don't emit another call event here since CallService already handles it
    // This prevents duplicate call events with different data structures
    console.log('📞 Notification service received call notification (handled by CallService)');
  }

  /**
   * Handle chat message (when app is active)
   */
  private handleChatMessage(data: any): void {
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
      this.emit('callNotificationTapped', call);
    }
  }

  /**
   * Handle chat notification tap
   */
  private handleChatNotificationTap(data: any): void {
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

    } catch (error) {
      console.error('Failed to dismiss call notification:', error);
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
