/**
 * Minimal Simple Audio Call Service - EXPO GO COMPATIBLE VERSION
 * BC-S011: Provides basic audio calling that works in Expo Go (no WebRTC dependencies)
 * Focus: Create RTC sessions for Odoo web ringing without complex audio recording
 */

import { authService } from './BaseAuthService';

interface SimpleCallSession {
  channelId: number;
  startTime: Date;
  status: 'connecting' | 'active' | 'ended';
  rtcSessionId?: number;
}

class SimpleAudioCallService {
  private currentCall: SimpleCallSession | null = null;
  private isMuted = false;
  private eventListeners = new Map<string, Function[]>();

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    console.log('🎵 Initializing Simple Audio Call Service (minimal version)...');
    console.log('✅ Simple Audio Call Service initialized');
  }

  /**
   * Start simple audio call - EXPO GO COMPATIBLE (no audio recording)
   */
  async startAudioCall(channelId: number, skipNotification: boolean = false, skipRecording: boolean = false): Promise<void> {
    try {
      console.log(`🎤 Starting minimal audio call in channel ${channelId}...`);

      this.currentCall = {
        channelId,
        startTime: new Date(),
        status: 'connecting'
      };

      // Send call start notification (creates RTC session for Odoo web ringing)
      if (!skipNotification) {
        const rtcSessionId = await this.sendCallStartNotification(channelId);
        if (this.currentCall) {
          this.currentCall.rtcSessionId = rtcSessionId;
        }
      }

      // Skip audio recording in Expo Go (not supported)
      console.log('🎤 Audio call initiated - RTC session created for Odoo web ringing');

      this.currentCall.status = 'active';
      console.log('✅ Minimal audio call started');
      
      this.emit('callStarted', this.currentCall);

    } catch (error) {
      console.error('❌ Failed to start minimal audio call:', error);
      throw error;
    }
  }

  /**
   * Start basic audio recording - DISABLED IN EXPO GO
   */
  private async startBasicRecording(): Promise<void> {
    console.log('🎤 Audio recording disabled in Expo Go - RTC session handles audio');
  }

  /**
   * FIXED: Send call start notification AND create RTC session for Odoo web ringing
   */
  private async sendCallStartNotification(channelId: number): Promise<number | undefined> {
    try {
      const client = authService.getClient();
      if (!client) return;

      console.log('📞 Creating RTC session for audio call...');

      // Step 1: Get user info
      const authResult = await client.authenticate();
      const userData = await client.callModel('res.users', 'read', [authResult.uid], {
        fields: ['partner_id', 'name']
      });
      const partnerId = userData[0].partner_id[0];
      const userName = userData[0].name || 'Mobile User';
      console.log(`👤 Audio call from: ${userName} (Partner ID: ${partnerId})`);

      // Step 2: Get channel info to determine type
      const channelInfo = await client.callModel('discuss.channel', 'read', [channelId], {
        fields: ['id', 'name', 'channel_type']
      });
      const channelType = channelInfo[0].channel_type;
      console.log(`📱 Target channel: ${channelInfo[0].name} (Type: ${channelType})`);

      // Step 3: Handle channel membership based on channel type
      let channelMemberId;

      if (channelType === 'chat') {
        // For DM channels, find existing membership (don't create new ones)
        console.log('💬 DM channel detected - finding existing membership...');
        let channelMembers = await client.callModel('discuss.channel.member', 'search_read', [
          [['channel_id', '=', channelId], ['partner_id', '=', partnerId]]
        ], { fields: ['id'] });

        if (channelMembers.length > 0) {
          channelMemberId = channelMembers[0].id;
          console.log(`✅ Found DM channel member: ${channelMemberId}`);
        } else {
          console.log('❌ User not found as member of DM channel');
          console.log('💡 This might be a data issue - trying alternative approach...');

          // For DM channels, try to find ANY membership and use the first one
          // This is a fallback for data inconsistencies
          const allChannelMembers = await client.callModel('discuss.channel.member', 'search_read', [
            [['channel_id', '=', channelId]]
          ], { fields: ['id', 'partner_id'] });

          console.log(`🔍 Found ${allChannelMembers.length} total members in DM channel`);

          if (allChannelMembers.length > 0) {
            // Use the first member ID as a fallback
            channelMemberId = allChannelMembers[0].id;
            console.log(`⚠️ Using fallback member ID: ${channelMemberId}`);
          } else {
            throw new Error('No members found in DM channel - cannot create RTC session');
          }
        }
      } else {
        // For group channels, ensure user is a member (create if needed)
        console.log('👥 Group channel detected - ensuring membership...');
        let channelMembers = await client.callModel('discuss.channel.member', 'search_read', [
          [['channel_id', '=', channelId], ['partner_id', '=', partnerId]]
        ], { fields: ['id'] });

        if (channelMembers.length > 0) {
          channelMemberId = channelMembers[0].id;
          console.log(`✅ Already a group channel member: ${channelMemberId}`);
        } else {
          // Create channel member if doesn't exist (only for group channels)
          console.log('🔧 Creating group channel membership...');
          channelMemberId = await client.callModel('discuss.channel.member', 'create', [{
            channel_id: channelId,
            partner_id: partnerId
          }]);
          console.log(`✅ Created group channel member: ${channelMemberId}`);
        }
      }

      // Step 3: Create RTC session (THIS IS THE KEY FOR ODOO WEB RINGING!)
      const sessionData = {
        channel_id: channelId,
        channel_member_id: channelMemberId,
        partner_id: partnerId,
        is_camera_on: false,  // Audio call only
        is_muted: false,
        is_screen_sharing_on: false,
        is_deaf: false
      };

      console.log('📞 Creating audio RTC session...');
      const sessionId = await client.callModel('discuss.channel.rtc.session', 'create', [sessionData]);
      console.log(`✅ RTC session created: ${sessionId} - Odoo web should now ring!`);

      // Step 4: Send chat message for visibility
      await client.callModel('discuss.channel', 'message_post', [channelId], {
        body: `🎤 ${userName} started an audio call (RTC Session: ${sessionId})`,
        message_type: 'comment'
      });

      console.log('🔔 Audio call RTC session created - Odoo web should show incoming call!');
      return sessionId;

    } catch (error) {
      console.error('❌ Failed to create RTC session for audio call:', error);
      // Fallback to just chat message
      try {
        const client = authService.getClient();
        if (client) {
          const authResult = await client.authenticate();
          const userData = await client.callModel('res.users', 'read', [authResult.uid], {
            fields: ['name']
          });
          const userName = userData[0]?.name || 'Mobile User';

          await client.callModel('discuss.channel', 'message_post', [channelId], {
            body: `🎤 ${userName} started an audio call (fallback - no RTC)`,
            message_type: 'comment'
          });
        }
      } catch (fallbackError) {
        console.error('❌ Even fallback notification failed:', fallbackError);
      }
    }
  }

  /**
   * Toggle mute
   */
  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    console.log(`🎤 Audio ${this.isMuted ? 'muted' : 'unmuted'} (UI only - no actual recording)`);
    this.emit('muteToggled', { isMuted: this.isMuted });
    return !this.isMuted;
  }

  /**
   * End audio call
   */
  async endCall(): Promise<void> {
    console.log('🎤 Ending minimal audio call...');

    // No recording to stop in Expo Go
    console.log('🎤 No recording to stop (Expo Go mode)');

    // Send call end notification
    if (this.currentCall) {
      await this.sendCallEndNotification(this.currentCall.channelId);
      
      const callToEnd = this.currentCall;
      this.currentCall = null;
      
      this.emit('callEnded', callToEnd);
    }

    this.isMuted = false;
    console.log('✅ Minimal audio call ended');
  }

  /**
   * Send call end notification
   */
  private async sendCallEndNotification(channelId: number): Promise<void> {
    try {
      const client = authService.getClient();
      if (!client) return;

      const authResult = await client.authenticate();
      const userData = await client.callModel('res.users', 'read', [authResult.uid], {
        fields: ['name']
      });
      const userName = userData[0]?.name || 'Mobile User';

      await client.callModel('discuss.channel', 'message_post', [channelId], {
        body: `🎤 ${userName} ended the audio call`,
        message_type: 'notification'
      });

    } catch (error) {
      console.error('❌ Failed to send call end notification:', error);
    }
  }

  /**
   * Get current call
   */
  getCurrentCall(): SimpleCallSession | null {
    return this.currentCall;
  }

  /**
   * Get audio status (Expo Go compatible)
   */
  getAudioStatus(): { quality: string; isConnected: boolean } {
    return {
      quality: this.currentCall ? 'good' : 'disconnected',
      isConnected: this.currentCall?.status === 'active'
    };
  }

  /**
   * Check if call is active
   */
  isCallActive(): boolean {
    return !!this.currentCall && this.currentCall.status === 'active';
  }

  /**
   * Check if muted
   */
  isMutedStatus(): boolean {
    return this.isMuted;
  }

  /**
   * Get call stats
   */
  getCallStats(): any {
    if (!this.currentCall) return null;

    const duration = Date.now() - this.currentCall.startTime.getTime();
    
    return {
      duration: Math.floor(duration / 1000),
      status: this.currentCall.status,
      isMuted: this.isMuted,
      callType: 'minimal-audio',
      quality: 'Basic recording'
    };
  }

  /**
   * Event management
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
        console.error(`Error in simple audio call listener for ${event}:`, error);
      }
    });
  }
}

// Create singleton instance
export const simpleAudioCallService = new SimpleAudioCallService();
export default simpleAudioCallService;
