/**
 * Call Service - WebRTC audio/video calling functionality
 * BC-S010: Handles peer-to-peer calls with Odoo integration
 */

import { Audio } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import { authService } from './BaseAuthService';
import { notificationService } from './BC-S009_NotificationService';
import { longpollingService } from './BaseLongpollingService';
import webRTCService from '../../discuss_channel/services/WebRTCService';

export interface CallParticipant {
  id: number;
  name: string;
  avatar?: string;
  partnerId: number;
}

export interface CallSession {
  id: string;
  channelId: number;
  channelName: string;
  participants: CallParticipant[];
  isVideo: boolean;
  status: 'connecting' | 'connected' | 'ended' | 'failed';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
}

export interface CallOffer {
  callId: string;
  channelId: number;
  fromUserId: number;
  fromUserName: string;
  isVideo: boolean;
  sdp: string;
  timestamp: number;
}

class CallService {
  private currentCall: CallSession | null = null;
  private eventListeners = new Map<string, Function[]>();
  private isInitialized = false;
  private audioRecording: Audio.Recording | null = null;
  private audioPermissions: boolean = false;

  /**
   * Initialize call service
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    try {
      console.log('📞 Initializing Call Service...');

      // Request permissions for camera and microphone
      await this.requestPermissions();

      // Setup notification listeners for incoming calls
      this.setupNotificationListeners();

      // CRITICAL: Listen for call invitations via longpolling
      this.setupCallListeners();

      this.isInitialized = true;
      console.log('✅ Call Service initialized');
      return true;

    } catch (error) {
      console.error('Failed to initialize call service:', error);
      return false;
    }
  }

  /**
   * Request audio permissions using Expo Audio
   */
  private async requestPermissions(): Promise<void> {
    try {
      // Request audio recording permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Audio permission is required for calls');
      }

      this.audioPermissions = true;

      // Configure audio mode for calls
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });

    } catch (error) {
      console.error('Failed to get audio permissions:', error);
      throw new Error('Audio permission is required for calls');
    }
  }

  /**
   * Setup notification listeners for incoming calls
   */
  private setupNotificationListeners(): void {
    notificationService.on('incomingCall', (call) => {
      this.handleIncomingCall(call);
    });

    notificationService.on('callNotificationTapped', (call) => {
      this.emit('showIncomingCallModal', call);
    });
  }

  /**
   * Setup call invitation listeners
   */
  private setupCallListeners(): void {
    console.log('📞 Setting up call invitation listeners...');

    // Listen for call invitations via longpolling
    longpollingService.on('callInvitation', (invitation) => {
      console.log('📞 Call invitation received in CallService:', invitation);
      this.handleCallInvitation(invitation);
    });

    // Also listen for generic notifications that might contain calls
    longpollingService.on('notification', (notification) => {
      if (notification.type === 'call_invitation') {
        console.log('📞 Call invitation via generic notification:', notification);
        this.handleCallInvitation(notification.payload || notification);
      }
    });
  }

  /**
   * Start a new call with WebRTC support
   */
  async startCall(channelId: number, channelName: string, isVideo: boolean = false): Promise<boolean> {
    try {
      if (this.currentCall) {
        throw new Error('Another call is already in progress');
      }

      // For video calls, use WebRTC if available
      if (isVideo && webRTCService.isAvailable()) {
        console.log('📞 Starting WebRTC video call');
        const callId = await webRTCService.initiateCall(channelId, 'video');

        // Create call session for compatibility
        this.currentCall = {
          id: callId,
          channelId,
          channelName,
          participants: [],
          isVideo: true,
          status: 'connecting',
          startTime: new Date(),
        };

        this.emit('callStarted', this.currentCall);
        return true;
      }

      // For audio calls or when WebRTC is not available, use chat-based calling
      if (!this.audioPermissions) {
        await this.requestPermissions();
      }

      const callId = `call_${Date.now()}_${channelId}`;

      // Create call session
      this.currentCall = {
        id: callId,
        channelId,
        channelName,
        participants: [],
        isVideo,
        status: 'connecting',
        startTime: new Date(),
      };

      // Send call invitation via Odoo (chat-based signaling)
      await this.sendCallInvitation(callId, channelId, isVideo);

      this.emit('callStarted', this.currentCall);
      return true;

    } catch (error) {
      console.error('Failed to start call:', error);
      await this.endCall();
      return false;
    }
  }

  /**
   * Start WebRTC call specifically
   */
  async startWebRTCCall(channelId: number, channelName: string, callType: 'audio' | 'video' = 'video'): Promise<string> {
    try {
      if (!webRTCService.isAvailable()) {
        throw new Error('WebRTC not available - please use development build');
      }

      console.log(`📞 Starting WebRTC ${callType} call in channel ${channelId}`);
      const callId = await webRTCService.initiateCall(channelId, callType);

      // Create call session for compatibility
      this.currentCall = {
        id: callId,
        channelId,
        channelName,
        participants: [],
        isVideo: callType === 'video',
        status: 'connecting',
        startTime: new Date(),
      };

      this.emit('callStarted', this.currentCall);
      return callId;

    } catch (error) {
      console.error('Failed to start WebRTC call:', error);
      throw error;
    }
  }

  /**
   * Answer an incoming call (simplified for Expo compatibility)
   */
  async answerCall(callOffer: CallOffer): Promise<boolean> {
    try {
      if (this.currentCall) {
        throw new Error('Another call is already in progress');
      }

      if (!this.audioPermissions) {
        await this.requestPermissions();
      }

      // Create call session
      this.currentCall = {
        id: callOffer.callId,
        channelId: callOffer.channelId,
        channelName: `Call with ${callOffer.fromUserName}`,
        participants: [],
        isVideo: callOffer.isVideo,
        status: 'connecting',
        startTime: new Date(),
      };

      // Send answer via Odoo (simplified signaling)
      await this.sendCallAnswer(callOffer.callId);

      this.emit('callAnswered', this.currentCall);
      return true;

    } catch (error) {
      console.error('Failed to answer call:', error);
      await this.endCall();
      return false;
    }
  }

  /**
   * End the current call
   */
  async endCall(): Promise<void> {
    try {
      // Prevent multiple end call attempts
      if (!this.currentCall || this.currentCall.status === 'ended') {
        console.log('📞 Call already ended or no active call');
        return;
      }

      console.log(`📞 Ending call: ${this.currentCall.id}`);

      // Stop audio recording if active
      if (this.audioRecording) {
        await this.audioRecording.stopAndUnloadAsync();
        this.audioRecording = null;
      }

      // Update call session
      const callToEnd = this.currentCall;
      this.currentCall.status = 'ended';
      this.currentCall.endTime = new Date();
      if (this.currentCall.startTime) {
        this.currentCall.duration =
          (this.currentCall.endTime.getTime() - this.currentCall.startTime.getTime()) / 1000;
      }

      // Clear current call first to prevent duplicate calls
      this.currentCall = null;

      // Send call end notification via Odoo (only once)
      await this.sendCallEnd(callToEnd.id);

      this.emit('callEnded', callToEnd);

    } catch (error) {
      console.error('Error ending call:', error);
      // Ensure call is cleared even if there's an error
      this.currentCall = null;
    }
  }

  /**
   * Simulate call connection (for demo purposes)
   */
  private simulateCallConnection(): void {
    if (this.currentCall) {
      // Simulate connection after 2 seconds
      setTimeout(() => {
        if (this.currentCall) {
          this.currentCall.status = 'connected';
          this.emit('callConnected', this.currentCall);
        }
      }, 2000);
    }
  }

  /**
   * Send call invitation via Odoo
   */
  private async sendCallInvitation(callId: string, channelId: number, isVideo: boolean): Promise<void> {
    try {
      const client = authService.getClient();
      if (!client) return;

      console.log(`📞 Starting ${isVideo ? 'video' : 'audio'} call using chat-based system`);

      // Chat-based call system (no RTC required)
      try {
        // Send call invitation message to channel
        await client.callModel('discuss.channel', 'message_post', [channelId], {
          body: `📞 ${isVideo ? 'Video' : 'Audio'} call started by ${client.username || 'Mobile User'}`,
          message_type: 'notification',
          subtype_xmlid: 'mail.mt_comment',
        });

        console.log('✅ Call invitation sent via chat message');

        // Optional: Try RTC if available (but don't fail if it doesn't work)
        try {
          const sessionData = await client.callModel('mail.rtc.session', 'create', [{
            channel_id: channelId,
            session_type: isVideo ? 'video' : 'audio',
            is_camera_on: isVideo,
            is_muted: false,
            is_screen_sharing_on: false,
          }]);

          const sessionId = Array.isArray(sessionData) ? sessionData[0] : sessionData;
          console.log(`✅ Bonus: RTC session created: ${sessionId}`);

          // Try to join the session
          try {
            await client.callModel('mail.rtc.session', 'action_join', [sessionId]);
            console.log(`✅ Bonus: Joined RTC session: ${sessionId}`);
          } catch (joinError) {
            console.log('ℹ️ RTC join not available (expected for basic Odoo)');
          }

        } catch (rtcError) {
          console.log('ℹ️ RTC not available (using chat-based calling only)');
          // This is expected and fine - chat-based calling works without RTC
        }

      } catch (messageError) {
        console.error('❌ Failed to send call invitation message:', messageError);
        throw messageError;
      }

      // Simulate call connection
      this.simulateCallConnection();

    } catch (error) {
      console.error('Failed to send call invitation:', error);
    }
  }

  /**
   * Notify channel members about RTC session
   */
  private async notifyChannelMembers(channelId: number, sessionId: number, callType: string): Promise<void> {
    try {
      const client = authService.getClient();
      if (!client) return;

      // Get channel members
      const channelData = await client.searchRead('discuss.channel', [['id', '=', channelId]],
        ['channel_member_ids']);

      if (channelData.length === 0) return;

      const memberIds = channelData[0].channel_member_ids;

      // Send bus notifications to each member
      const notifications = memberIds.map((memberId: number) => [
        `mail.rtc.session_${sessionId}`,
        {
          type: 'mail.rtc.session/inserted',
          payload: {
            id: sessionId,
            channel_id: channelId,
            session_type: callType,
            caller_name: client.username || 'Mobile User',
            is_camera_on: callType === 'video',
            is_muted: false,
          }
        }
      ]);

      await client.callModel('bus.bus', 'sendmany', [notifications]);
      console.log(`📡 Sent RTC notifications to ${notifications.length} members`);

    } catch (error) {
      console.log('⚠️ Could not send bus notifications:', error.message);
    }
  }

  /**
   * Send call answer via Odoo
   */
  private async sendCallAnswer(callId: string): Promise<void> {
    try {
      const client = authService.getClient();
      if (!client) return;

      console.log(`📞 Call ${callId} answered - notifying Odoo via chat`);

      // Extract channel ID from call ID
      const channelId = this.currentCall?.channelId;
      if (!channelId) {
        console.error('No channel ID available for call answer');
        return;
      }

      // Send a message to the channel indicating the call was answered
      await client.callModel('discuss.channel', 'message_post', [channelId], {
        body: `📞 Call answered by ${client.username || 'Mobile User'}`,
        message_type: 'notification',
        subtype_xmlid: 'mail.mt_comment',
      });

      console.log('✅ Call answer notification sent via chat');

      // Skip RTC session updates for chat-based calling
      console.log('ℹ️ Using chat-based calling (RTC not required)');

      // Simulate call connection
      this.simulateCallConnection();

    } catch (error) {
      console.error('Failed to send call answer:', error);
    }
  }

  /**
   * Send call end notification via Odoo
   */
  private async sendCallEnd(callId: string): Promise<void> {
    try {
      const client = authService.getClient();
      if (!client) return;

      console.log(`📞 Call ${callId} ended - notifying Odoo`);

      // Get channel ID from current call
      const channelId = this.currentCall?.channelId;
      if (channelId) {
        // Send call end message to channel
        await client.callModel('discuss.channel', 'message_post', [channelId], {
          body: `📞 Call ended by ${client.username || 'Mobile User'}`,
          message_type: 'notification',
          subtype_xmlid: 'mail.mt_comment',
        });

        // Try to end RTC session if it exists
        try {
          await client.callModel('mail.rtc.session', 'unlink', [], {
            session_id: callId,
          });
          console.log('✅ Ended RTC session in Odoo');
        } catch (rtcError) {
          console.log('ℹ️ RTC session cleanup not available (normal for basic Odoo)');
        }
      }

    } catch (error) {
      console.error('Failed to send call end:', error);
    }
  }

  /**
   * Handle incoming call notification
   */
  private handleIncomingCall(call: any): void {
    // Show incoming call UI
    this.emit('incomingCall', call);
  }

  /**
   * Handle call invitation from longpolling (chat-based calling)
   */
  handleCallInvitation(invitation: any): void {
    console.log('📞 Processing call invitation:', invitation);

    // Validate invitation data
    if (!invitation || !invitation.call_id || !invitation.caller_id) {
      console.log('📞 Invalid call invitation data, ignoring');
      return;
    }

    // Get current user to prevent self-call notifications
    const currentUserId = this.getCurrentUserId();

    // Don't show call notifications to the person who initiated the call
    if (invitation.caller_id === currentUserId) {
      console.log('📞 Ignoring self-initiated call notification');
      return;
    }

    // For chat-based calls, we accept all valid invitations
    console.log('📞 Valid chat-based call invitation received');

    // Create CallOffer format that matches IncomingCallModal expectations
    const callOffer = {
      callId: invitation.call_id || invitation.id,
      channelId: invitation.channel_id,
      fromUserId: invitation.caller_id,
      fromUserName: invitation.caller_name || 'Unknown User',
      isVideo: invitation.call_type === 'video' || invitation.isVideo,
      sdp: invitation.sdp || '',
      timestamp: invitation.timestamp || Date.now()
    };

    // Create CallInvitation format for notification service
    const callInvitation = {
      id: callOffer.callId,
      callerId: callOffer.fromUserId,
      callerName: callOffer.fromUserName,
      channelId: callOffer.channelId,
      channelName: `Channel ${callOffer.channelId}`,
      isVideo: callOffer.isVideo,
      timestamp: callOffer.timestamp
    };

    console.log('📞 Emitting incoming call event for chat-based call:', callOffer);

    // Show notification if app is backgrounded
    notificationService.showIncomingCallNotification(callInvitation);

    // Emit event for UI if app is active (use CallOffer format)
    this.emit('incomingCall', callOffer);
  }

  /**
   * Get current call session
   */
  getCurrentCall(): CallSession | null {
    return this.currentCall;
  }

  /**
   * Toggle video on/off (simplified for demo)
   */
  toggleVideo(): boolean {
    // For demo purposes, just return a toggle state
    // In a real implementation, this would control camera
    return Math.random() > 0.5;
  }

  /**
   * Toggle audio on/off (simplified for demo)
   */
  toggleAudio(): boolean {
    // For demo purposes, just return a toggle state
    // In a real implementation, this would control microphone
    return Math.random() > 0.5;
  }

  /**
   * Start audio recording (for demo purposes)
   */
  async startAudioRecording(): Promise<boolean> {
    try {
      if (!this.audioPermissions) {
        await this.requestPermissions();
      }

      this.audioRecording = new Audio.Recording();
      await this.audioRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await this.audioRecording.startAsync();
      return true;
    } catch (error) {
      console.error('Failed to start audio recording:', error);
      return false;
    }
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
        console.error(`Error in call service listener for ${event}:`, error);
      }
    });
  }



  /**
   * Get current user ID from auth service
   */
  private getCurrentUserId(): number | null {
    try {
      const client = authService.getClient();
      return client?.uid || null;
    } catch (error) {
      console.warn('Could not get current user ID:', error);
      return null;
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      hasActiveCall: !!this.currentCall,
      callStatus: this.currentCall?.status,
      hasAudioPermissions: this.audioPermissions,
      isRecording: !!this.audioRecording,
    };
  }
}

// Create singleton instance
export const callService = new CallService();
export default callService;
