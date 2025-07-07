/**
 * Call Service - WebRTC audio/video calling functionality
 * BC-S010: Handles peer-to-peer calls with Odoo integration
 */

import { Audio } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import { authService } from './BaseAuthService';
import { notificationService } from './BC-S009_NotificationService';
import { longpollingService } from './BaseLongpollingService';

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
   * Start a new call (simplified for Expo compatibility)
   */
  async startCall(channelId: number, channelName: string, isVideo: boolean = false): Promise<boolean> {
    try {
      if (this.currentCall) {
        throw new Error('Another call is already in progress');
      }

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

      // Send call invitation via Odoo (simplified signaling)
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
      // Stop audio recording if active
      if (this.audioRecording) {
        await this.audioRecording.stopAndUnloadAsync();
        this.audioRecording = null;
      }

      // Update call session
      if (this.currentCall) {
        this.currentCall.status = 'ended';
        this.currentCall.endTime = new Date();
        if (this.currentCall.startTime) {
          this.currentCall.duration =
            (this.currentCall.endTime.getTime() - this.currentCall.startTime.getTime()) / 1000;
        }

        // Send call end notification via Odoo
        await this.sendCallEnd(this.currentCall.id);

        this.emit('callEnded', this.currentCall);
        this.currentCall = null;
      }

    } catch (error) {
      console.error('Error ending call:', error);
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

      // Send via Odoo message system (simplified)
      await client.callModel('discuss.channel', 'message_post', [channelId], {
        body: `📞 ${isVideo ? 'Video' : 'Audio'} call started`,
        message_type: 'notification',
        subtype_xmlid: 'mail.mt_comment',
      });

      // Simulate call connection
      this.simulateCallConnection();

    } catch (error) {
      console.error('Failed to send call invitation:', error);
    }
  }

  /**
   * Send call answer via Odoo
   */
  private async sendCallAnswer(callId: string): Promise<void> {
    try {
      const client = authService.getClient();
      if (!client) return;

      // For now, just simulate the answer
      console.log(`📞 Call ${callId} answered`);

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

      await client.callModel('discuss.channel', 'end_call', [], {
        call_id: callId,
        end_time: Date.now(),
      });

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
   * Handle call invitation from longpolling
   */
  handleCallInvitation(invitation: any): void {
    console.log('📞 Processing call invitation:', invitation);

    // Get current user to prevent self-call notifications
    const currentUserId = this.getCurrentUserId();

    // Don't show call notifications to the person who initiated the call
    if (invitation.caller_id === currentUserId) {
      console.log('📞 Ignoring self-initiated call notification');
      return;
    }

    // Create CallOffer format that matches IncomingCallModal expectations
    const callData = {
      callId: invitation.call_id || invitation.id,
      channelId: invitation.channel_id,
      fromUserId: invitation.caller_id,
      fromUserName: invitation.caller_name || 'Unknown User',
      isVideo: invitation.call_type === 'video' || invitation.isVideo,
      sdp: invitation.sdp || '',
      timestamp: invitation.timestamp || Date.now()
    };

    console.log('📞 Emitting incoming call event:', callData);

    // Show notification if app is backgrounded
    notificationService.showIncomingCallNotification(callData);

    // Emit event for UI if app is active
    this.emit('incomingCall', callData);
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
   * Test call notification flow (for debugging)
   */
  async testCallNotification(): Promise<void> {
    console.log('🧪 Testing call notification flow...');

    // Simulate incoming call data from a different user
    const testCall = {
      call_id: 'test-' + Date.now(),
      caller_id: 999, // Different user ID to avoid self-call filtering
      caller_name: 'Test Caller',
      caller_avatar: null,
      channel_id: 22, // Use current channel ID
      channel_name: 'Test Channel',
      call_type: 'audio',
      timestamp: Date.now()
    };

    console.log('🧪 Simulating call invitation:', testCall);
    this.handleCallInvitation(testCall);
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
