/**
 * WebRTC Service for Odoo 18 Integration
 * Handles real-time video/audio calling with WebRTC
 */

import { authService } from '../../base/services/BaseAuthService';
import longpollingService from '../../base/services/BaseLongpollingService';
import { ODOO_CONFIG } from '../../../config/odoo';

// WebRTC imports (will be available after react-native-webrtc installation)
let RTCPeerConnection: any;
let RTCIceCandidate: any;
let RTCSessionDescription: any;
let MediaStream: any;
let mediaDevices: any;
let RTCView: any;

// Try to import WebRTC modules
try {
  const webrtc = require('react-native-webrtc');
  RTCPeerConnection = webrtc.RTCPeerConnection;
  RTCIceCandidate = webrtc.RTCIceCandidate;
  RTCSessionDescription = webrtc.RTCSessionDescription;
  MediaStream = webrtc.MediaStream;
  mediaDevices = webrtc.mediaDevices;
  RTCView = webrtc.RTCView;
} catch (error) {
  console.log('📱 WebRTC not available - using fallback mode');
}

export interface WebRTCCall {
  callId: string;
  sessionId: number;
  channelId: number;
  callerId: number;
  callerName: string;
  callType: 'audio' | 'video';
  status: 'initiating' | 'ringing' | 'connecting' | 'connected' | 'ended';
  isIncoming: boolean;
}

class WebRTCService {
  private peerConnection: any = null;
  private localStream: any = null;
  private remoteStream: any = null;
  private currentCall: WebRTCCall | null = null;
  private eventListeners = new Map<string, Function[]>();
  private isWebRTCAvailable = false;

  private readonly PEER_CONNECTION_CONFIG = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  constructor() {
    this.isWebRTCAvailable = !!RTCPeerConnection;
    if (this.isWebRTCAvailable) {
      this.setupSignalingListeners();
      console.log('📞 WebRTC Service initialized with native WebRTC support');
    } else {
      console.log('📞 WebRTC Service initialized in fallback mode');
    }
  }

  /**
   * Check if WebRTC is available
   */
  isAvailable(): boolean {
    return this.isWebRTCAvailable;
  }

  /**
   * Setup signaling listeners for WebRTC
   */
  private setupSignalingListeners(): void {
    console.log('📡 Setting up WebRTC signaling listeners');

    longpollingService.on('notification', (notification) => {
      if (notification.type === 'webrtc_call_invitation') {
        this.handleCallInvitation(notification.payload);
      } else if (notification.type === 'webrtc_signaling') {
        this.handleSignaling(notification.payload);
      } else if (notification.type === 'webrtc_call_ended') {
        this.handleCallEnded(notification.payload);
      }
    });
  }

  /**
   * Initiate WebRTC call using HTTP endpoints
   */
  async initiateCall(channelId: number, callType: 'audio' | 'video' = 'video'): Promise<string> {
    try {
      console.log(`📞 Initiating ${callType} WebRTC call in channel ${channelId}`);

      if (!this.isWebRTCAvailable) {
        throw new Error('WebRTC not available - please use development build');
      }

      const client = authService.getClient();
      if (!client) throw new Error('No authenticated client');

      // First, create RTC session using the working model
      const sessionData = await this.createRTCSession(channelId, callType);
      console.log('📞 RTC session created:', sessionData);

      // Join the call using HTTP endpoint
      const joinResponse = await this.joinCallViaHTTP(channelId, sessionData.sessionId);
      console.log('📞 Joined call via HTTP:', joinResponse);

      // Set up local media
      await this.setupLocalMedia(callType);

      // Create peer connection
      await this.createPeerConnection();

      // Generate unique call ID
      const callId = `call_${channelId}_${Date.now()}`;

      // Store call info
      this.currentCall = {
        callId,
        sessionId: sessionData.sessionId,
        channelId,
        callerId: sessionData.partnerId,
        callerName: sessionData.partnerName || 'Unknown',
        callType,
        status: 'initiating',
        isIncoming: false,
      };

      // Create and send offer
      await this.createAndSendOffer();

      // Notify other members about the call
      await this.notifyCallMembers(channelId, callId, callType);

      this.emit('callInitiated', this.currentCall);
      return callId;

    } catch (error) {
      console.error('❌ Failed to initiate WebRTC call:', error);
      throw error;
    }
  }

  /**
   * Create RTC session using the working model
   */
  private async createRTCSession(channelId: number, callType: 'audio' | 'video'): Promise<any> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('No authenticated client');

      // Authenticate to get UID
      const authResult = await client.authenticate();
      const currentUid = authResult.uid;

      // Get current user info
      const users = await client.callModel('res.users', 'read', [currentUid], {
        fields: ['partner_id', 'name']
      });
      const partnerId = users[0].partner_id[0];
      const partnerName = users[0].name;

      // Get channel member ID (required field)
      const members = await client.callModel('discuss.channel.member', 'search_read', [
        [['channel_id', '=', channelId], ['partner_id', '=', partnerId]]
      ], { fields: ['id'], limit: 1 });

      if (!members.length) {
        throw new Error('User is not a member of this channel');
      }

      const channelMemberId = members[0].id;

      // Create RTC session
      const sessionData = {
        channel_id: channelId,
        partner_id: partnerId,
        channel_member_id: channelMemberId,
        is_camera_on: callType === 'video',
        is_muted: false,
        is_screen_sharing_on: false,
      };

      const sessionId = await client.callModel('discuss.channel.rtc.session', 'create', [sessionData]);

      return {
        sessionId,
        partnerId,
        partnerName,
        channelMemberId,
      };

    } catch (error) {
      console.error('❌ Failed to create RTC session:', error);
      throw error;
    }
  }

  /**
   * Join call via HTTP endpoint
   */
  private async joinCallViaHTTP(channelId: number, sessionId: number): Promise<any> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('No authenticated client');

      const response = await fetch(`${ODOO_CONFIG.baseURL}/mail/rtc/channel/join_call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ODOO_CONFIG.apiKey}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {
            channel_id: channelId,
            session_id: sessionId,
          },
          id: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('❌ Failed to join call via HTTP:', error);
      throw error;
    }
  }

  /**
   * Notify call members via HTTP endpoint
   */
  private async notifyCallMembers(channelId: number, callId: string, callType: string): Promise<any> {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('No authenticated client');

      const response = await fetch(`${ODOO_CONFIG.baseURL}/mail/rtc/session/notify_call_members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ODOO_CONFIG.apiKey}`,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'call',
          params: {
            channel_id: channelId,
            call_id: callId,
            call_type: callType,
          },
          id: Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('❌ Failed to notify call members:', error);
      throw error;
    }
  }

  /**
   * Answer incoming WebRTC call
   */
  async answerCall(callId: string): Promise<void> {
    try {
      console.log(`📞 Answering WebRTC call: ${callId}`);

      if (!this.isWebRTCAvailable) {
        throw new Error('WebRTC not available');
      }

      if (!this.currentCall || this.currentCall.callId !== callId) {
        throw new Error('No matching call to answer');
      }

      // Set up local media
      await this.setupLocalMedia(this.currentCall.callType);

      // Create peer connection if not exists
      if (!this.peerConnection) {
        await this.createPeerConnection();
      }

      // Update call status
      this.currentCall.status = 'connecting';
      this.emit('callStatusChanged', this.currentCall);

    } catch (error) {
      console.error('❌ Failed to answer WebRTC call:', error);
      throw error;
    }
  }

  /**
   * End WebRTC call
   */
  async endCall(): Promise<void> {
    try {
      console.log('📞 Ending WebRTC call');

      // Prevent multiple end call attempts
      if (!this.currentCall) {
        console.log('📞 No active WebRTC call to end');
        return;
      }

      const callToEnd = this.currentCall;

      // Try to notify Odoo backend (but don't fail if it doesn't work)
      try {
        const client = authService.getClient();
        if (client) {
          await client.callModel('discuss.channel', 'mobile_end_webrtc_call', [], {
            call_id: callToEnd.callId,
          });
        }
      } catch (backendError) {
        console.log('ℹ️ Backend call end notification failed (expected for basic Odoo)');
      }

      this.cleanup();
      this.emit('callEnded', { callId: callToEnd.callId });

    } catch (error) {
      console.error('❌ Failed to end WebRTC call:', error);
      // Ensure cleanup happens even if there's an error
      this.cleanup();
    }
  }

  /**
   * Setup local media (camera/microphone)
   */
  private async setupLocalMedia(callType: 'audio' | 'video'): Promise<void> {
    try {
      console.log(`📹 Setting up local media for ${callType} call`);

      if (!mediaDevices) {
        throw new Error('Media devices not available');
      }

      const constraints = {
        audio: true,
        video: callType === 'video' ? {
          width: { min: 640, ideal: 1280 },
          height: { min: 480, ideal: 720 },
          facingMode: 'user',
        } : false,
      };

      this.localStream = await mediaDevices.getUserMedia(constraints);
      console.log('✅ Local media stream obtained');

      this.emit('localStreamObtained', this.localStream);

    } catch (error) {
      console.error('❌ Failed to get local media:', error);
      throw error;
    }
  }

  /**
   * Create peer connection
   */
  private async createPeerConnection(): Promise<void> {
    try {
      console.log('🔗 Creating peer connection');

      if (!RTCPeerConnection) {
        throw new Error('RTCPeerConnection not available');
      }

      this.peerConnection = new RTCPeerConnection(this.PEER_CONNECTION_CONFIG);

      // Add local stream tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach((track: any) => {
          this.peerConnection!.addTrack(track, this.localStream!);
        });
      }

      // Handle remote stream
      this.peerConnection.ontrack = (event: any) => {
        console.log('📡 Remote stream received');
        this.remoteStream = event.streams[0];
        this.emit('remoteStreamReceived', this.remoteStream);
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event: any) => {
        if (event.candidate) {
          console.log('🧊 ICE candidate generated');
          this.sendSignaling('ice_candidate', {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid,
          });
        }
      };

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection!.connectionState;
        console.log(`🔗 Connection state: ${state}`);
        
        if (state === 'connected' && this.currentCall) {
          this.currentCall.status = 'connected';
          this.emit('callStatusChanged', this.currentCall);
        }
      };

      console.log('✅ Peer connection created');

    } catch (error) {
      console.error('❌ Failed to create peer connection:', error);
      throw error;
    }
  }

  /**
   * Create and send offer
   */
  private async createAndSendOffer(): Promise<void> {
    try {
      if (!this.peerConnection) throw new Error('No peer connection');

      console.log('📤 Creating offer');
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      await this.sendSignaling('offer', {
        type: offer.type,
        sdp: offer.sdp,
      });

      console.log('✅ Offer sent');

    } catch (error) {
      console.error('❌ Failed to create/send offer:', error);
      throw error;
    }
  }

  /**
   * Send signaling data to Odoo
   */
  private async sendSignaling(signalType: string, signalData: any): Promise<void> {
    try {
      if (!this.currentCall) return;

      const client = authService.getClient();
      if (!client) return;

      await client.callModel('discuss.channel', 'mobile_webrtc_signal', [], {
        call_id: this.currentCall.callId,
        signal_type: signalType,
        signal_data: signalData,
      });

      console.log(`📡 Signaling sent: ${signalType}`);

    } catch (error) {
      console.error(`❌ Failed to send ${signalType}:`, error);
    }
  }

  /**
   * Handle incoming call invitation
   */
  private handleCallInvitation(callData: any): void {
    console.log('📞 Incoming WebRTC call invitation:', callData);

    this.currentCall = {
      callId: callData.call_id,
      sessionId: callData.session_id,
      channelId: callData.channel_id,
      callerId: callData.caller_id,
      callerName: callData.caller_name,
      callType: callData.call_type,
      status: 'ringing',
      isIncoming: true,
    };

    this.emit('incomingCall', this.currentCall);
  }

  /**
   * Handle WebRTC signaling
   */
  private async handleSignaling(signalingData: any): Promise<void> {
    try {
      console.log(`📡 Received signaling: ${signalingData.signal_type}`);

      if (!this.peerConnection) {
        await this.createPeerConnection();
      }

      const { signal_type, signal_data } = signalingData;

      switch (signal_type) {
        case 'offer':
          await this.handleOffer(signal_data);
          break;
        case 'answer':
          await this.handleAnswer(signal_data);
          break;
        case 'ice_candidate':
          await this.handleIceCandidate(signal_data);
          break;
      }

    } catch (error) {
      console.error('❌ Failed to handle signaling:', error);
    }
  }

  /**
   * Handle offer
   */
  private async handleOffer(offerData: any): Promise<void> {
    try {
      if (!this.peerConnection) return;

      console.log('📥 Handling offer');
      const offer = new RTCSessionDescription(offerData);
      await this.peerConnection.setRemoteDescription(offer);

      // Create answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      await this.sendSignaling('answer', {
        type: answer.type,
        sdp: answer.sdp,
      });

      console.log('✅ Answer sent');

    } catch (error) {
      console.error('❌ Failed to handle offer:', error);
    }
  }

  /**
   * Handle answer
   */
  private async handleAnswer(answerData: any): Promise<void> {
    try {
      if (!this.peerConnection) return;

      console.log('📥 Handling answer');
      const answer = new RTCSessionDescription(answerData);
      await this.peerConnection.setRemoteDescription(answer);

      console.log('✅ Answer processed');

    } catch (error) {
      console.error('❌ Failed to handle answer:', error);
    }
  }

  /**
   * Handle ICE candidate
   */
  private async handleIceCandidate(candidateData: any): Promise<void> {
    try {
      if (!this.peerConnection) return;

      console.log('🧊 Adding ICE candidate');
      const candidate = new RTCIceCandidate({
        candidate: candidateData.candidate,
        sdpMLineIndex: candidateData.sdpMLineIndex,
        sdpMid: candidateData.sdpMid,
      });

      await this.peerConnection.addIceCandidate(candidate);

    } catch (error) {
      console.error('❌ Failed to add ICE candidate:', error);
    }
  }

  /**
   * Handle call ended
   */
  private handleCallEnded(callData: any): void {
    console.log('📞 Call ended remotely:', callData);
    this.cleanup();
    this.emit('callEnded', callData);
  }

  /**
   * Cleanup WebRTC resources
   */
  private cleanup(): void {
    console.log('🧹 Cleaning up WebRTC resources');

    if (this.localStream) {
      this.localStream.getTracks().forEach((track: any) => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.currentCall = null;
  }

  /**
   * Get current call
   */
  getCurrentCall(): WebRTCCall | null {
    return this.currentCall;
  }

  /**
   * Get local stream
   */
  getLocalStream(): any {
    return this.localStream;
  }

  /**
   * Get remote stream
   */
  getRemoteStream(): any {
    return this.remoteStream;
  }

  /**
   * Toggle camera
   */
  async toggleCamera(): Promise<void> {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.emit('cameraToggled', videoTrack.enabled);
      }
    }
  }

  /**
   * Toggle microphone
   */
  async toggleMicrophone(): Promise<void> {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.emit('microphoneToggled', audioTrack.enabled);
      }
    }
  }

  /**
   * Switch camera (front/back)
   */
  async switchCamera(): Promise<void> {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        // @ts-ignore - react-native-webrtc specific method
        videoTrack._switchCamera();
        this.emit('cameraSwitched');
      }
    }
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
        console.error(`Error in WebRTC listener for ${event}:`, error);
      }
    });
  }
}

// Create singleton instance
export const webRTCService = new WebRTCService();
export default webRTCService;
