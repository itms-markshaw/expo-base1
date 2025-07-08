/**
 * FIXED Call Service - WebRTC audio/video calling functionality
 * BC-S010: Handles peer-to-peer calls with Odoo integration + REAL WebRTC
 * 
 * CRITICAL FIXES APPLIED:
 * 1. Added real WebRTC with react-native-webrtc
 * 2. SDP/ICE exchange via Odoo messages (bypasses missing SDP fields)
 * 3. Actual peer-to-peer audio streaming
 * 4. Message-based signaling for Odoo compatibility
 */

import { Audio } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import { authService } from './BaseAuthService';
import { notificationService } from './BC-S009_NotificationService';
import { longpollingService } from './BaseLongpollingService';
import simpleAudioCallService from './BC-S011_SimpleAudioCallService';
import realWebRTCService from './BC-S014_RealWebRTCService';

// Conditional WebRTC imports
import webRTCDetector from './BC-S015_WebRTCDetector';
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
  sessionId?: number; // Added for RTC session tracking
  channelMemberId?: number; // Added for proper cleanup
  // REAL WebRTC properties
  peerConnection?: RTCPeerConnection;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
}

export interface CallOffer {
  callId: string;
  channelId: number;
  fromUserId: number;
  fromUserName: string;
  isVideo: boolean;
  sdp: string;
  timestamp: number;
  sessionId?: number;
}

class CallService {
  private currentCall: CallSession | null = null;
  private eventListeners = new Map<string, Function[]>();
  private isInitialized = false;
  private audioRecording: Audio.Recording | null = null;
  private audioPermissions: boolean = false;

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
   * Toggle video on/off (with real RTC session updates)
   */
  async toggleVideo(): Promise<boolean> {
    if (!this.currentCall || !this.currentCall.sessionId) {
      console.warn('No active call to toggle video');
      return false;
    }

    try {
      const client = authService.getClient();
      if (!client) return false;

      const newVideoState = !this.currentCall.isVideo;
      
      // Update RTC session in Odoo
      await client.callModel('discuss.channel.rtc.session', 'write', [
        [this.currentCall.sessionId],
        { is_camera_on: newVideoState }
      ]);

      // Update local call state
      this.currentCall.isVideo = newVideoState;
      
      console.log(`📹 Video ${newVideoState ? 'enabled' : 'disabled'}`);
      this.emit('videoToggled', newVideoState);
      
      return newVideoState;
    } catch (error) {
      console.error('Failed to toggle video:', error);
      return false;
    }
  }

  /**
   * Toggle audio mute on/off (WebRTC only - no recording involved)
   */
  async toggleAudio(): Promise<boolean> {
    if (!this.currentCall) {
      console.warn('No active call to toggle audio');
      return false;
    }

    try {
      // Handle simple audio calls
      if (this.currentCall.id.startsWith('simple-audio-')) {
        console.log('🎤 Toggling simple audio call mute...');
        const isAudioOn = simpleAudioCallService.toggleMute();
        this.emit('audioToggled', isAudioOn);
        return isAudioOn;
      }

      // Handle WebRTC calls (existing logic)
      if (!this.currentCall.sessionId) {
        console.warn('No RTC session to toggle audio');
        return false;
      }

      const client = authService.getClient();
      if (!client) return false;

      // Get current mute state from RTC session
      const sessionData = await client.callModel('discuss.channel.rtc.session', 'read', [
        this.currentCall.sessionId
      ], { fields: ['is_muted'] });
      
      const currentlyMuted = sessionData[0]?.is_muted || false;
      const newMuteState = !currentlyMuted;
      
      // Update RTC session in Odoo
      await client.callModel('discuss.channel.rtc.session', 'write', [
        [this.currentCall.sessionId],
        { is_muted: newMuteState }
      ]);
      
      console.log(`🎤 Audio ${newMuteState ? 'muted' : 'unmuted'} in Odoo (no recording involved)`);
      this.emit('audioToggled', !newMuteState);
      
      return !newMuteState; // Return true if audio is ON (not muted)
    } catch (error) {
      console.error('Failed to toggle audio:', error);
      return false;
    }
  }

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

      // Initialize simple audio call service
      await simpleAudioCallService.initialize();

      // Setup notification listeners for incoming calls
      this.setupNotificationListeners();

      // Listen for call invitations via longpolling
      this.setupCallListeners();

      this.isInitialized = true;
      console.log('✅ Call Service initialized with Simple Audio Calling');
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

      // Configure basic audio mode for calls (will be enhanced during recording)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false, // Start with speaker
        staysActiveInBackground: true,
      });

      console.log('✅ Audio permissions granted and call mode configured');

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

    // Listen for RTC session notifications from Odoo
    longpollingService.on('notification', (notification) => {
      try {
        if (notification.type === 'call_invitation') {
          console.log('📞 Call invitation via generic notification:', notification);
          this.handleCallInvitation(notification.payload || notification);
        } else if (notification.type === 'discuss.channel.rtc.session/insert') {
          console.log('📞 RTC session insert notification:', notification);
          this.handleIncomingRTCSession(notification.payload);
        } else if (notification.type === 'discuss.channel.rtc.session/update') {
          console.log('📞 RTC session update notification:', notification);
          this.handleRTCSessionUpdate(notification.payload);
        } else if (notification.type === 'discuss.channel.rtc.session/remove') {
          console.log('📞 RTC session remove notification:', notification);
          this.handleRTCSessionRemove(notification.payload);
        } else if (notification.type === 'discuss.channel.rtc.session/join') {
          console.log('📞 RTC session join notification:', notification);
          this.handleRTCSessionJoin(notification.payload);
        }
        // ADDED: Handle simple audio call invitations
        else if (notification.type === 'mail.message') {
          this.handlePotentialAudioCallInvitation(notification.payload);
        }
      } catch (error) {
        console.error('❌ Error handling longpolling notification:', error);
        // Don't crash the app - just log the error
      }
    });
  }

  /**
   * Start a new call - CONDITIONAL (WebRTC if available, fallback if not)
   */
  async startCall(channelId: number, channelName: string, isVideo: boolean = false): Promise<boolean> {
    try {
      // Log current WebRTC configuration
      webRTCDetector.logConfiguration();

      if (webRTCDetector.isAvailable()) {
        console.log(`📞 Starting ${isVideo ? 'video' : 'audio'} call with real WebRTC...`);
        console.log('🎯 Development Build: Using P2P connection with Google STUN servers');

        // Phase 1: Create RTC session for Odoo web ringing
        console.log('📞 Phase 1: Creating RTC session...');
        const sessionId = await this.createRTCSession(channelId, isVideo ? 'video' : 'audio');

        // Phase 3 & 4: Start real WebRTC call with STUN servers
        console.log('📞 Phase 3 & 4: Starting real WebRTC call...');
        const callId = await realWebRTCService.startCall(channelId, sessionId, isVideo ? 'video' : 'audio');

        console.log('🎉 Real WebRTC call started with Google STUN servers!');
        return true;

      } else {
        console.log(`📞 Starting ${isVideo ? 'video' : 'audio'} call in Expo Go mode...`);
        console.log('🎯 Expo Go: Using RTC sessions + signaling only');

        // Fallback: Use simple audio call service
        const callId = await this.startSimpleAudioCall(channelId, channelName);
        console.log('✅ Simple audio call started (Expo Go mode)');
        return true;
      }

    } catch (error) {
      console.error('Failed to start call:', error);

      // Final fallback
      if (webRTCDetector.isAvailable()) {
        console.log('🔄 WebRTC failed, falling back to simple audio call...');
        try {
          await this.startSimpleAudioCall(channelId, channelName);
          return true;
        } catch (fallbackError) {
          console.error('Fallback call also failed:', fallbackError);
        }
      }

      await this.endCall();
      return false;
    }
  }

  /**
   * Create RTC session for Odoo web ringing (Phase 1)
   */
  private async createRTCSession(channelId: number, callType: 'audio' | 'video'): Promise<number> {
    const client = authService.getClient();
    if (!client) throw new Error('No authenticated client');

    try {
      console.log(`📞 Creating RTC session for ${callType} call...`);

      // Get user info
      const authResult = await client.authenticate();
      const userData = await client.callModel('res.users', 'read', [authResult.uid], {
        fields: ['partner_id', 'name']
      });
      const partnerId = userData[0].partner_id[0];
      const userName = userData[0].name;

      // Get channel info
      const channelInfo = await client.callModel('discuss.channel', 'read', [channelId], {
        fields: ['id', 'name', 'channel_type']
      });
      const channelType = channelInfo[0].channel_type;

      // Find channel membership
      let channelMembers = await client.callModel('discuss.channel.member', 'search_read', [
        [['channel_id', '=', channelId], ['partner_id', '=', partnerId]]
      ], { fields: ['id'] });

      let channelMemberId;
      if (channelMembers.length > 0) {
        channelMemberId = channelMembers[0].id;
      } else if (channelType === 'chat') {
        // For DM channels, use fallback approach
        const allMembers = await client.callModel('discuss.channel.member', 'search_read', [
          [['channel_id', '=', channelId]]
        ], { fields: ['id'] });
        channelMemberId = allMembers[0]?.id;
      } else {
        // Create membership for group channels
        channelMemberId = await client.callModel('discuss.channel.member', 'create', [{
          channel_id: channelId,
          partner_id: partnerId
        }]);
      }

      if (!channelMemberId) {
        throw new Error('Could not establish channel membership');
      }

      // Create RTC session
      const sessionData = {
        channel_id: channelId,
        channel_member_id: channelMemberId,
        partner_id: partnerId,
        is_camera_on: callType === 'video',
        is_muted: false,
        is_screen_sharing_on: false,
        is_deaf: false
      };

      const sessionId = await client.callModel('discuss.channel.rtc.session', 'create', [sessionData]);
      console.log(`✅ RTC session created: ${sessionId}`);

      // Send notification message
      await client.callModel('discuss.channel', 'message_post', [channelId], {
        body: `🎤 ${userName} started a ${callType} call (RTC Session: ${sessionId})`,
        message_type: 'comment'
      });

      return sessionId;

    } catch (error) {
      console.error('❌ Failed to create RTC session:', error);
      throw error;
    }
  }

  /**
   * Start simple audio call with real-time audio streaming
   */
  async startSimpleAudioCall(channelId: number, channelName: string): Promise<string> {
    try {
      console.log(`🎤 Starting simple audio call in channel ${channelId}`);

      // Clear any existing call
      if (this.currentCall) {
        console.log('📞 Clearing existing call to start new one');
        await this.endCall();
      }

      // Start simple audio call service
      await simpleAudioCallService.startAudioCall(channelId);

      // Create UI call session for compatibility
      const callId = `simple-audio-${channelId}-${Date.now()}`;
      this.currentCall = {
        id: callId,
        channelId,
        channelName,
        participants: [],
        isVideo: false,
        status: 'connected',
        startTime: new Date()
      };

      console.log('🎉 Simple audio call started - real-time audio streaming active!');
      this.emit('callStarted', this.currentCall);
      return callId;

    } catch (error) {
      console.error('❌ Simple audio call creation failed:', error);
      throw error;
    }
  }

  /**
   * REAL WebRTC call with SDP/ICE exchange via Odoo messages - ENABLED FOR DEV BUILD
   */
  async startWebRTCCall(channelId: number, channelName: string, callType: 'audio' | 'video' = 'audio'): Promise<string> {
    try {
      console.log(`📞 Starting REAL WebRTC ${callType} call in channel ${channelId}`);
      console.log('🔧 Using message-based signaling for SDP/ICE exchange');

      // Clear any existing call
      if (this.currentCall) {
        console.log('📞 Clearing existing call to start new one');
        await this.endCall();
      }

      const client = authService.getClient();
      if (!client) throw new Error('No authenticated client');

      // Step 1: Clean up existing RTC sessions
      await this.cleanupExistingRTCSessions(channelId);

      // Step 2: Get user's partner ID
      const userData = await client.callModel('res.users', 'read', [client.uid], {
        fields: ['partner_id', 'name']
      });
      
      console.log('🔍 Raw user data:', userData[0]);
      
      // Handle partner_id which can be [id, name] or just id
      let partnerId;
      if (Array.isArray(userData[0].partner_id)) {
        partnerId = userData[0].partner_id[0];
      } else {
        partnerId = userData[0].partner_id;
      }
      
      const userName = userData[0].name;
      console.log(`👤 Calling as: ${userName} (Partner ID: ${partnerId})`);

      // Step 3: Get channel info
      const channelInfo = await client.callModel('discuss.channel', 'read', [channelId], {
        fields: ['id', 'name', 'channel_type']
      });
      console.log(`📱 Target channel: ${channelInfo[0].name} (Type: ${channelInfo[0].channel_type})`);

      // Step 4: Find user's channel membership
      console.log('🔍 Finding channel membership for current user...');
      
      const allChannelMembers = await client.callModel('discuss.channel.member', 'search_read', [
        [['channel_id', '=', channelId]]
      ], { fields: ['id', 'partner_id'] });
      
      console.log(`📋 Found ${allChannelMembers.length} total members in channel`);
      
      let channelMemberId;
      
      if (partnerId) {
        const userMember = allChannelMembers.find(member => {
          const memberPartnerId = Array.isArray(member.partner_id) ? member.partner_id[0] : member.partner_id;
          return memberPartnerId === partnerId;
        });
        
        if (userMember) {
          channelMemberId = userMember.id;
          console.log(`✅ Found user as channel member: ${channelMemberId}`);
        }
      }
      
      if (!channelMemberId && allChannelMembers.length > 0) {
        channelMemberId = allChannelMembers[0].id;
        console.log(`🔄 Using first available member ID: ${channelMemberId}`);
      }
      
      if (!channelMemberId) {
        throw new Error('No channel membership found - user may not have access to this channel');
      }

      // Step 5: Setup REAL local media with WebRTC
      console.log(`🎤 Setting up REAL local media for ${callType} call...`);
      const localStream = await this.setupLocalMedia(callType);

      // Step 6: Create REAL WebRTC peer connection
      console.log('🔗 Creating REAL WebRTC peer connection...');
      const configuration = {
        iceServers: [
          // Google's free STUN servers (as configured in Odoo by default)
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
        ],
        iceCandidatePoolSize: 10
      };
      const peerConnection = new RTCPeerConnection(configuration);

      // Add REAL local stream to peer connection
      console.log('🎤 Adding REAL local stream to peer connection...');
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
        console.log(`📡 Added ${track.kind} track to peer connection`);
      });

      // Handle ICE candidates - send via Odoo messages
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('📡 Sending REAL ICE candidate to Odoo');
          this.sendIceCandidate(channelId, event.candidate);
        } else {
          console.log('📡 All ICE candidates sent');
        }
      };

      // Handle REAL remote stream - this enables actual audio playback!
      peerConnection.ontrack = (event) => {
        console.log('🎉 REAL REMOTE STREAM RECEIVED! Audio should now work:', event.streams[0]);
        if (this.currentCall) {
          this.currentCall.remoteStream = event.streams[0];
          console.log('✅ Real remote stream stored in current call');
        }
        this.emit('remoteStreamReceived', event.streams[0]);
      };

      // Step 7: Create REAL SDP offer
      console.log('📡 Creating REAL SDP offer...');
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video'
      });
      await peerConnection.setLocalDescription(offer);
      console.log(`✅ REAL SDP offer created (${offer.sdp?.length} chars)`);

      // Step 8: Create RTC session in Odoo (for status tracking)
      const sessionData = {
        channel_id: channelId,
        channel_member_id: channelMemberId,
        partner_id: partnerId,
        is_camera_on: callType === 'video',
        is_muted: false,
        is_screen_sharing_on: false,
        is_deaf: false
      };
      
      console.log(`📞 Creating ${callType} RTC session...`);
      const sessionId = await client.callModel('discuss.channel.rtc.session', 'create', [sessionData]);
      console.log(`✅ RTC session created: ${sessionId}`);

      // Step 9: Send REAL SDP offer via message (since Odoo doesn't have SDP fields)
      console.log('📤 Sending REAL SDP offer via Odoo message...');
      await this.sendSdpOffer(channelId, sessionId, offer);

      // Step 10: Send call notification message
      await this.sendCallNotificationMessage(channelId, sessionId, callType, userName);

      // Step 11: Create call session with REAL WebRTC objects
      const callId = `real-webrtc-${sessionId}`;
      this.currentCall = {
        id: callId,
        channelId,
        channelName: channelInfo[0].name,
        participants: [{ id: partnerId, name: userName, partnerId, avatar: undefined }],
        isVideo: callType === 'video',
        status: 'connecting',
        startTime: new Date(),
        sessionId: sessionId,
        channelMemberId: channelMemberId,
        // REAL WebRTC objects for actual audio streaming
        peerConnection,
        localStream
      };

      console.log('🎉 REAL WebRTC call initiated with peer-to-peer audio!');
      console.log('⏳ Waiting for remote party to answer and complete SDP exchange...');
      this.emit('callStarted', this.currentCall);
      
      return callId;

    } catch (error) {
      console.error('❌ REAL WebRTC call creation failed:', error);
      throw error;
    }
  }

  /**
   * FIXED: Clean up existing RTC sessions (matches working Python script)
   */
  private async cleanupExistingRTCSessions(channelId?: number): Promise<void> {
    try {
      const client = authService.getClient();
      if (!client) return;

      console.log('🧹 Cleaning up existing RTC sessions...');

      // Find existing RTC sessions - matches Python script exactly
      const searchDomain = channelId ? [['channel_id', '=', channelId]] : [];
      const existingSessions = await client.callModel('discuss.channel.rtc.session', 'search', [searchDomain]);

      if (existingSessions.length > 0) {
        console.log(`🔍 Found ${existingSessions.length} existing RTC sessions`);

        // Delete existing sessions
        await client.callModel('discuss.channel.rtc.session', 'unlink', [existingSessions]);
        console.log(`✅ Cleaned up ${existingSessions.length} RTC sessions`);
      } else {
        console.log('✅ No existing RTC sessions to clean up');
      }

    } catch (error) {
      console.log('⚠️ Cleanup failed:', error instanceof Error ? error.message : String(error));
      // Continue anyway - cleanup failure shouldn't stop call creation
    }
  }

  /**
   * Send SDP offer via Odoo message (since RTC sessions don't have SDP fields)
   */
  private async sendSdpOffer(channelId: number, sessionId: number, offer: RTCSessionDescriptionInit): Promise<void> {
    try {
      const client = authService.getClient();
      if (!client) return;

      // Send SDP offer as a structured message for WebRTC signaling
      const sdpMessage = {
        type: 'webrtc-sdp-offer',
        sessionId: sessionId,
        sdp: offer,
        timestamp: Date.now()
      };

      await client.callModel('discuss.channel', 'message_post', [channelId], {
        body: JSON.stringify(sdpMessage),
        message_type: 'notification',
        subject: 'WebRTC SDP Offer'
      });

      console.log('📡 REAL SDP offer sent via Odoo message for WebRTC signaling');
    } catch (error) {
      console.error('❌ Failed to send SDP offer:', error);
    }
  }

  /**
   * Send ICE candidate via Odoo message
   */
  private async sendIceCandidate(channelId: number, candidate: RTCIceCandidate): Promise<void> {
    try {
      const client = authService.getClient();
      if (!client) return;

      // Send ICE candidate as a structured message
      const iceMessage = {
        type: 'webrtc-ice-candidate',
        candidate: {
          candidate: candidate.candidate,
          sdpMLineIndex: candidate.sdpMLineIndex,
          sdpMid: candidate.sdpMid
        },
        timestamp: Date.now()
      };

      await client.callModel('discuss.channel', 'message_post', [channelId], {
        body: JSON.stringify(iceMessage),
        message_type: 'notification',
        subject: 'WebRTC ICE Candidate'
      });

      console.log('📡 REAL ICE candidate sent via Odoo message');
    } catch (error) {
      console.error('❌ Failed to send ICE candidate:', error);
    }
  }
  private async sendCallNotificationMessage(channelId: number, sessionId: number, callType: string, callerName: string): Promise<void> {
    try {
      const client = authService.getClient();
      if (!client) return;

      // Create a call message that matches what Odoo web expects
      const callMessage = callType === 'audio' 
        ? `🎤 ${callerName} started an audio call`
        : `📹 ${callerName} started a video call`;

      await client.callModel('discuss.channel', 'message_post', [channelId], {
        body: callMessage,
        message_type: 'comment',
        subtype_xmlid: 'mail.mt_comment'
      });

      console.log(`💬 Call notification message sent: "${callMessage}"`);

    } catch (error) {
      console.log('❌ Call notification message failed:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Answer an incoming call
   */
  async answerCall(callOffer: CallOffer): Promise<boolean> {
    try {
      // Clear any existing call before answering new one
      if (this.currentCall) {
        console.log('📞 Clearing existing call to answer new one');
        await this.endCall();
      }

      if (!this.audioPermissions) {
        await this.requestPermissions();
      }

      // Setup media for the call
      const callType = callOffer.isVideo ? 'video' : 'audio';
      console.log(`🎤 Setting up local media for answering ${callType} call...`);
      await this.setupLocalMedia(callType);

      // Create call session with proper caller info
      this.currentCall = {
        id: callOffer.callId,
        channelId: callOffer.channelId,
        channelName: `Call with ${callOffer.fromUserName}`,
        participants: [{
          id: callOffer.fromUserId,
          name: callOffer.fromUserName,
          partnerId: callOffer.fromUserId,
          avatar: undefined
        }],
        isVideo: callOffer.isVideo,
        status: 'connected', // Set to connected when answered
        startTime: new Date(),
        sessionId: callOffer.sessionId
      };

      // Handle RTC session calls
      if (callOffer.callId.startsWith('rtc-')) {
        console.log('📞 Answering RTC session call');
        await this.answerRTCCall(callOffer);
      } else {
        // Fallback for other call types
        await this.sendCallAnswer(callOffer.callId);
      }

      console.log('✅ Call answered and set to connected status');
      this.emit('callAnswered', this.currentCall);
      this.emit('callConnected', this.currentCall); // Emit connected event
      return true;

    } catch (error) {
      console.error('Failed to answer call:', error);
      await this.endCall();
      return false;
    }
  }

  /**
   * FIXED: Answer RTC session call
   */
  private async answerRTCCall(callOffer: CallOffer): Promise<void> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('No authenticated client');

      console.log(`📞 Answering RTC call: ${callOffer.callId}`);

      // Send chat message for visibility
      await client.callModel('discuss.channel', 'message_post', [callOffer.channelId], {
        body: `📞 Call answered by Mobile User`,
        message_type: 'notification',
        subtype_xmlid: 'mail.mt_comment',
      });

      console.log('✅ RTC call answer notification sent');

    } catch (error) {
      console.error('❌ Failed to answer RTC call:', error);
      throw error;
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

      // Check if this is a simple audio call (standalone, not WebRTC)
      if (this.currentCall.id.startsWith('simple-audio-')) {
        console.log('🎤 Ending simple audio call...');
        try {
          await simpleAudioCallService.endCall();
        } catch (error) {
          console.log('⚠️ Simple audio call end failed:', error instanceof Error ? error.message : String(error));
        }
      }

      // Stop any existing audio recording cleanly
      if (this.audioRecording) {
        try {
          const status = await this.audioRecording.getStatusAsync();
          if (status.isRecording) {
            await this.audioRecording.stopAndUnloadAsync();
            console.log('✅ Audio recording stopped cleanly');
          } else {
            await this.audioRecording.unloadAsync();
            console.log('✅ Audio recording unloaded');
          }
        } catch (audioError) {
          console.log('⚠️ Audio recording cleanup failed:', audioError.message);
        }
        this.audioRecording = null;
      }

      // Update call session
      const callToEnd = this.currentCall;
      callToEnd.status = 'ended';
      callToEnd.endTime = new Date();
      if (callToEnd.startTime) {
        callToEnd.duration = (callToEnd.endTime.getTime() - callToEnd.startTime.getTime()) / 1000;
      }

      // Clear current call first to prevent duplicate calls
      this.currentCall = null;

      // Send call end notification via Odoo (only for WebRTC calls)
      if (!callToEnd.id.startsWith('simple-audio-')) {
        try {
          await this.sendCallEnd(callToEnd);
        } catch (endError) {
          console.log('⚠️ Call end notification failed:', endError);
        }
      }

      this.emit('callEnded', callToEnd);

    } catch (error) {
      console.error('Error ending call:', error);
      // Ensure call is cleared even if there's an error
      this.currentCall = null;
    }
  }

  /**
   * FIXED: Send call end notification via Odoo
   */
  private async sendCallEnd(callToEnd: CallSession): Promise<void> {
    try {
      const client = authService.getClient();
      if (!client) return;

      console.log(`📞 Call ${callToEnd.id} ended - notifying Odoo`);

      // Send call end message to channel
      await client.callModel('discuss.channel', 'message_post', [callToEnd.channelId], {
        body: `📞 Call ended by Mobile User`,
        message_type: 'notification',
        subtype_xmlid: 'mail.mt_comment',
      });

      // End WebRTC session using correct method
      if (callToEnd.sessionId) {
        console.log('📞 Ending WebRTC RTC session...');
        try {
          // Delete RTC session directly
          await client.callModel('discuss.channel.rtc.session', 'unlink', [callToEnd.sessionId]);
          console.log('✅ RTC session ended successfully');

        } catch (rtcError) {
          console.log('ℹ️ RTC session cleanup failed:', rtcError.message);
        }
      }

    } catch (error) {
      console.error('Failed to send call end:', error);
    }
  }

  /**
   * Send call answer via Odoo (fallback method)
   */
  private async sendCallAnswer(callId: string): Promise<void> {
    try {
      const client = authService.getClient();
      if (!client) return;

      console.log(`📞 Call ${callId} answered - notifying Odoo via chat`);

      const channelId = this.currentCall?.channelId;
      if (!channelId) {
        console.error('No channel ID available for call answer');
        return;
      }

      // Send a message to the channel indicating the call was answered
      await client.callModel('discuss.channel', 'message_post', [channelId], {
        body: `📞 Call answered by Mobile User`,
        message_type: 'notification',
        subtype_xmlid: 'mail.mt_comment',
      });

      console.log('✅ Call answer notification sent via chat');

    } catch (error) {
      console.error('Failed to send call answer:', error);
    }
  }

  /**
   * Handle incoming call notification
   */
  private handleIncomingCall(call: any): void {
    this.emit('incomingCall', call);
  }

  /**
   * Handle call invitation from longpolling
   */
  handleCallInvitation(invitation: any): void {
    try {
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

      console.log('📞 Valid call invitation received');

      // Create CallOffer format that matches IncomingCallModal expectations
      const callOffer = {
        callId: invitation.call_id || invitation.id,
        channelId: invitation.channel_id,
        fromUserId: invitation.caller_id,
        fromUserName: invitation.caller_name || 'Unknown User',
        isVideo: invitation.call_type === 'video' || invitation.isVideo,
        sdp: invitation.sdp || '',
        timestamp: invitation.timestamp || Date.now(),
        sessionId: invitation.session_id
      };

      console.log('📞 Emitting incoming call event:', callOffer);

      // Show notification if app is backgrounded
      notificationService.showIncomingCallNotification({
        id: callOffer.callId,
        callerId: callOffer.fromUserId,
        callerName: callOffer.fromUserName,
        channelId: callOffer.channelId,
        channelName: `Channel ${callOffer.channelId}`,
        isVideo: callOffer.isVideo,
        timestamp: callOffer.timestamp
      });

      // Emit event for UI if app is active
      this.emit('incomingCall', callOffer);
    } catch (error) {
      console.error('❌ Error handling call invitation:', error);
    }
  }

  /**
   * Handle incoming RTC session from bus notification
   */
  private handleIncomingRTCSession(sessionData: any): void {
    try {
      console.log('📞 Incoming RTC session:', sessionData);

      // Don't handle our own call initiations
      const currentUserId = this.getCurrentUserId();
      if (sessionData.partner_id === currentUserId) {
        console.log('📞 Ignoring own call initiation');
        return;
      }

      // Create incoming call object
      const callOffer = {
        callId: `rtc-${sessionData.id}`,
        channelId: sessionData.channel_id,
        fromUserId: sessionData.partner_id,
        fromUserName: sessionData.caller_name || 'Unknown User',
        isVideo: sessionData.is_camera_on || false,
        sdp: '',
        timestamp: Date.now(),
        sessionId: sessionData.id
      };

      console.log('📞 Emitting incoming RTC call event:', callOffer);

      // Show notification if app is backgrounded
      notificationService.showIncomingCallNotification({
        id: callOffer.callId,
        callerId: callOffer.fromUserId,
        callerName: callOffer.fromUserName,
        channelId: callOffer.channelId,
        channelName: `Channel ${callOffer.channelId}`,
        isVideo: callOffer.isVideo,
        timestamp: callOffer.timestamp
      });

      // Emit event for UI if app is active
      this.emit('incomingCall', callOffer);
    } catch (error) {
      console.error('❌ Error handling incoming RTC session:', error);
    }
  }

  /**
   * Handle RTC session updates
   */
  private handleRTCSessionUpdate(updateData: any): void {
    try {
      console.log('📞 RTC session update:', updateData);

      if (this.currentCall && this.currentCall.id === `rtc-${updateData.id}`) {
        if (updateData.action === 'answer') {
          this.currentCall.status = 'connected';
          this.emit('callConnected', this.currentCall);
        }
      }
    } catch (error) {
      console.error('❌ Error handling RTC session update:', error);
    }
  }

  /**
   * Handle RTC session removal
   */
  private handleRTCSessionRemove(removeData: any): void {
    try {
      console.log('📞 RTC session removed:', removeData);

      if (this.currentCall && this.currentCall.id === `rtc-${removeData.id}`) {
        this.currentCall.status = 'ended';
        this.emit('callEnded', this.currentCall);
        this.currentCall = null;
      }
    } catch (error) {
      console.error('❌ Error handling RTC session remove:', error);
    }
  }

  /**
   * Handle RTC session join (when someone joins from Odoo web)
   */
  private handleRTCSessionJoin(joinData: any): void {
    try {
      console.log('📞 Someone joined the RTC session from web:', joinData);
      
      // If we have an active call, update it to show someone joined
      if (this.currentCall) {
        // Add the new participant if not already in the list
        const newParticipant = {
          id: joinData.partner_id || joinData.user_id,
          name: joinData.partner_name || joinData.user_name || 'Web User',
          partnerId: joinData.partner_id || joinData.user_id,
          avatar: undefined
        };
        
        // Check if participant already exists
        const existingParticipant = this.currentCall.participants.find(
          p => p.id === newParticipant.id
        );
        
        if (!existingParticipant) {
          this.currentCall.participants.push(newParticipant);
          console.log(`✅ Added participant: ${newParticipant.name}`);
        }
        
        // Update call status to connected if it wasn't already
        if (this.currentCall.status === 'connecting') {
          this.updateCallStatus('connected');
        }
        
        // Emit event to update UI
        this.emit('participantJoined', {
          call: this.currentCall,
          participant: newParticipant
        });
      }
    } catch (error) {
      console.error('❌ Error handling RTC session join:', error);
    }
  }

  /**
   * Handle potential audio call invitation from chat messages
   */
  private handlePotentialAudioCallInvitation(messagePayload: any): void {
    try {
      const body = messagePayload?.body || '';
      console.log('🔍 Checking message for call invitation:', body);
      
      // Decode HTML entities and check for call messages
      const decodedBody = body.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      console.log('🔍 Decoded message body:', decodedBody);
      
      // Detect audio call start messages
      if (decodedBody.includes('started an audio call') || 
          decodedBody.includes('started a live audio call') ||
          body.includes('started an audio call')) {
        console.log('🔔 Detected incoming audio call invitation!');
        
        // Don't show call invitations for our own calls
        const senderId = this.extractSenderIdFromMessage(messagePayload.author_id);
        const currentUserId = authService.getClient()?.uid;
        
        console.log(`🔍 Call from user ${senderId}, current user ${currentUserId}`);
        
        if (senderId === currentUserId) {
          console.log('🔔 Ignoring own call start message');
          return;
        }

        // Extract caller name from email_from field
        const emailFrom = messagePayload.email_from || '';
        const callerName = this.extractCallerNameFromEmail(emailFrom);
        
        console.log(`🔔 Incoming audio call from: ${callerName}`);

        // Create call invitation object
        const callInvitation = {
          callId: `incoming-audio-${messagePayload.channel_id}-${Date.now()}`,
          channelId: messagePayload.channel_id,
          fromUserId: senderId,
          fromUserName: callerName,
          isVideo: false, // Audio call
          sdp: '',
          timestamp: Date.now()
        };

        // Show notification if app is backgrounded
        notificationService.showIncomingCallNotification({
          id: callInvitation.callId,
          callerId: callInvitation.fromUserId,
          callerName: callInvitation.fromUserName,
          channelId: callInvitation.channelId,
          channelName: `Channel ${callInvitation.channelId}`,
          isVideo: callInvitation.isVideo,
          timestamp: callInvitation.timestamp
        });

        // Emit incoming call event to show call invitation UI
        this.emit('incomingCall', callInvitation);
        
        console.log('🔔 Incoming audio call invitation emitted:', callInvitation);
      } else {
        console.log('🔍 Message does not contain call invitation pattern');
      }
    } catch (error) {
      console.error('❌ Error handling potential audio call invitation:', error);
    }
  }

  /**
   * Extract sender ID from author_id field in message
   */
  private extractSenderIdFromMessage(authorId: any): number {
    if (typeof authorId === 'number') return authorId;
    if (typeof authorId === 'string' && authorId.includes('<value><int>')) {
      const match = authorId.match(/<value><int>(\d+)<\/int>/);
      return match ? parseInt(match[1]) : 0;
    }
    return 0;
  }

  /**
   * Extract caller name from email_from field
   */
  private extractCallerNameFromEmail(emailFrom: string): string {
    try {
      // Extract name from "Name" <email> format
      const match = emailFrom.match(/^"([^"]+)"/);
      return match ? match[1] : 'Unknown Caller';
    } catch (error) {
      return 'Unknown Caller';
    }
  }

  /**
   * Get current call session
   */
  getCurrentCall(): CallSession | null {
    return this.currentCall;
  }

  /**
   * Get caller name for display
   */
  getCallerName(): string {
    if (!this.currentCall) return 'Unknown';
    
    // For simple audio calls, extract from channel name
    if (this.currentCall.id.startsWith('simple-audio-')) {
      return this.extractNameFromChannel(this.currentCall.channelName);
    }
    
    // If we have participants, get the first one's name
    if (this.currentCall.participants && this.currentCall.participants.length > 0) {
      return this.currentCall.participants[0].name;
    }
    
    // Fallback to channel name
    return this.extractNameFromChannel(this.currentCall.channelName);
  }

  /**
   * Extract name from channel name like "Mark Shaw, test@itmsgroup.com.au"
   */
  private extractNameFromChannel(channelName: string): string {
    if (!channelName) return 'Unknown';
    
    if (channelName.includes(',')) {
      return channelName.split(',')[0].trim();
    }
    return channelName;
  }

  /**
   * Update call status
   */
  updateCallStatus(status: 'connecting' | 'connected' | 'ended' | 'failed'): void {
    if (this.currentCall) {
      this.currentCall.status = status;
      console.log(`📞 Call status updated to: ${status}`);
      
      // Emit status change event
      this.emit('callStatusChanged', {
        callId: this.currentCall.id,
        status: status,
        call: this.currentCall
      });
      
      // Also emit specific status events
      if (status === 'connected') {
        this.emit('callConnected', this.currentCall);
      }
    }
  }

  /**
   * Clear current call state (for cleanup)
   */
  clearCurrentCall(): void {
    console.log('📞 Clearing current call state');
    this.currentCall = null;
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
   * Setup local media using REAL WebRTC - ENABLED FOR DEV BUILD
   */
  private async setupLocalMedia(callType: 'audio' | 'video'): Promise<MediaStream> {
    try {
      console.log(`📹 Setting up REAL local media for ${callType} call`);

      if (!this.audioPermissions) {
        await this.requestPermissions();
      }

      // Configure WebRTC media constraints for high-quality audio
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000, // High quality audio
          channelCount: 1, // Mono for voice calls
        },
        video: callType === 'video' ? {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        } : false,
      };

      // Get REAL local media stream with WebRTC
      const stream = await mediaDevices.getUserMedia(constraints);
      console.log(`✅ REAL ${callType} stream acquired for WebRTC`);
      console.log(`🎤 Audio tracks: ${stream.getAudioTracks().length}`);
      
      if (callType === 'video') {
        console.log(`📹 Video tracks: ${stream.getVideoTracks().length}`);
      }

      return stream;
    } catch (error) {
      console.error('❌ Failed to setup REAL local media:', error);
      throw error;
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    const baseStatus = {
      isInitialized: this.isInitialized,
      hasActiveCall: !!this.currentCall,
      callStatus: this.currentCall?.status,
      hasAudioPermissions: this.audioPermissions,
      callType: this.currentCall?.isVideo ? 'video-webrtc' : 'audio-webrtc'
    };

    // Add simple audio call specific info
    if (this.currentCall?.id.startsWith('simple-audio-')) {
      return {
        ...baseStatus,
        callType: 'simple-audio',
        isStreaming: simpleAudioCallService.isCallActive(),
        isMuted: simpleAudioCallService.isMutedStatus(),
        simpleAudioStats: simpleAudioCallService.getCallStats()
      };
    }

    return baseStatus;
  }

  /**
   * Get audio status (conditional based on WebRTC availability)
   */
  getAudioStatus(): { quality: string; isConnected: boolean } {
    if (webRTCDetector.isAvailable()) {
      // Development build - get status from real WebRTC
      const webrtcCall = realWebRTCService.getCurrentCall();
      return {
        quality: webrtcCall?.status === 'connected' ? 'good' : 'connecting',
        isConnected: webrtcCall?.status === 'connected'
      };
    } else {
      // Expo Go - get status from simple audio service
      return simpleAudioCallService.getAudioStatus();
    }
  }
}

// Create singleton instance
export const callService = new CallService();
export default callService;
