/**
 * Real WebRTC Service - Phase 3 & 4 Implementation
 * BC-S014: Full WebRTC with Google STUN servers for development builds
 */

import webRTCDetector from './BC-S015_WebRTCDetector';
import { authService } from './BaseAuthService';
import longpollingService from './BaseLongpollingService';

interface WebRTCCall {
  id: string;
  channelId: number;
  sessionId: number;
  peerConnection: any; // RTCPeerConnection (conditional)
  localStream?: any; // MediaStream (conditional)
  remoteStream?: any; // MediaStream (conditional)
  isInitiator: boolean;
  callType: 'audio' | 'video';
  status: 'connecting' | 'connected' | 'ended';
}

class RealWebRTCService {
  private currentCall: WebRTCCall | null = null;
  private eventListeners = new Map<string, Function[]>();

  // Phase 3: Google STUN Server Configuration
  private readonly stunServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ];

  constructor() {
    this.setupSignalingListeners();
  }

  /**
   * Phase 3: Create RTCPeerConnection with Google STUN servers (conditional)
   */
  private createPeerConnection(): any {
    if (!webRTCDetector.isAvailable()) {
      throw new Error('RTCPeerConnection not available - use Expo development build');
    }

    console.log('🌐 Creating RTCPeerConnection with Google STUN servers...');

    const configuration = {
      iceServers: this.stunServers,
      iceCandidatePoolSize: 10,
    };

    console.log('📡 STUN servers configured:', this.stunServers);

    const peerConnection = webRTCDetector.createPeerConnection(configuration);

    // Phase 3: ICE candidate handling
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.currentCall) {
        console.log('🧊 ICE candidate generated via Google STUN:', event.candidate);
        this.sendIceCandidate(event.candidate);
      }
    };

    // Phase 4: Remote stream handling
    peerConnection.onaddstream = (event) => {
      console.log('📺 Remote stream received:', event.stream);
      if (this.currentCall) {
        this.currentCall.remoteStream = event.stream;
        this.emit('remoteStreamReceived', event.stream);
      }
    };

    // Connection state monitoring
    peerConnection.oniceconnectionstatechange = () => {
      console.log('🔗 ICE connection state:', peerConnection.iceConnectionState);
      
      if (peerConnection.iceConnectionState === 'connected') {
        console.log('🎉 P2P connection established via STUN servers!');
        if (this.currentCall) {
          this.currentCall.status = 'connected';
          this.emit('callConnected', this.currentCall);
        }
      } else if (peerConnection.iceConnectionState === 'failed') {
        console.log('❌ P2P connection failed');
        this.emit('callFailed', 'ICE connection failed');
      }
    };

    return peerConnection;
  }

  /**
   * Phase 4: Start WebRTC call with real audio
   */
  async startCall(channelId: number, sessionId: number, callType: 'audio' | 'video' = 'audio'): Promise<string> {
    try {
      console.log(`🚀 Phase 4: Starting real WebRTC ${callType} call...`);
      console.log(`📞 Channel: ${channelId}, Session: ${sessionId}`);

      // Step 1: Create peer connection with STUN servers
      const peerConnection = this.createPeerConnection();

      // Step 2: Get local media (audio/video)
      const localStream = await this.getLocalMedia(callType);
      console.log('🎤 Local media stream obtained:', localStream);

      // Step 3: Add local stream to peer connection
      peerConnection.addStream(localStream);

      // Step 4: Create call object
      const callId = `webrtc-${channelId}-${Date.now()}`;
      this.currentCall = {
        id: callId,
        channelId,
        sessionId,
        peerConnection,
        localStream,
        isInitiator: true,
        callType,
        status: 'connecting'
      };

      // Step 5: Create SDP offer
      console.log('📝 Creating SDP offer...');
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video'
      });

      await peerConnection.setLocalDescription(offer);
      console.log('✅ Local description set');

      // Step 6: Send offer via Odoo signaling
      await this.sendSdpOffer(offer);

      console.log('🎉 WebRTC call initiated with Google STUN servers!');
      return callId;

    } catch (error) {
      console.error('❌ Failed to start WebRTC call:', error);
      throw error;
    }
  }

  /**
   * Phase 4: Get local media stream (conditional)
   */
  private async getLocalMedia(callType: 'audio' | 'video'): Promise<any> {
    if (!webRTCDetector.isAvailable()) {
      throw new Error('Media access not available - use Expo development build');
    }

    try {
      console.log(`🎤 Requesting ${callType} permissions...`);

      const constraints = {
        audio: true,
        video: callType === 'video' ? {
          width: { min: 640, ideal: 1280 },
          height: { min: 480, ideal: 720 },
          frameRate: { min: 16, ideal: 30 }
        } : false
      };

      const stream = await webRTCDetector.getUserMedia(constraints);
      console.log('✅ Local media stream obtained');
      return stream;

    } catch (error) {
      console.error('❌ Failed to get local media:', error);
      throw new Error(`Failed to access ${callType}: ${error.message}`);
    }
  }

  /**
   * Phase 3: Send SDP offer via Odoo signaling
   */
  private async sendSdpOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.currentCall) return;

    const client = authService.getClient();
    if (!client) throw new Error('No authenticated client');

    const signalingMessage = {
      type: 'webrtc-sdp-offer',
      sessionId: this.currentCall.sessionId,
      sdp: offer,
      timestamp: Date.now(),
      from: 'mobile-app',
      to: 'web-client',
      stunServers: this.stunServers.map(server => server.urls)
    };

    try {
      await client.callModel('discuss.channel', 'message_post', [this.currentCall.channelId], {
        body: JSON.stringify(signalingMessage),
        message_type: 'notification',
        subject: 'WebRTC SDP Offer - Real Call'
      });

      console.log('📡 SDP offer sent via Odoo signaling');
    } catch (error) {
      console.error('❌ Failed to send SDP offer:', error);
      throw error;
    }
  }

  /**
   * Phase 3: Send ICE candidate via Odoo signaling
   */
  private async sendIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    if (!this.currentCall) return;

    const client = authService.getClient();
    if (!client) return;

    const signalingMessage = {
      type: 'webrtc-ice-candidate',
      sessionId: this.currentCall.sessionId,
      candidate: {
        candidate: candidate.candidate,
        sdpMLineIndex: candidate.sdpMLineIndex,
        sdpMid: candidate.sdpMid
      },
      timestamp: Date.now(),
      from: 'mobile-app',
      stunServer: 'Generated via Google STUN servers'
    };

    try {
      await client.callModel('discuss.channel', 'message_post', [this.currentCall.channelId], {
        body: JSON.stringify(signalingMessage),
        message_type: 'notification',
        subject: 'WebRTC ICE Candidate - Real Call'
      });

      console.log('🧊 ICE candidate sent via Odoo signaling');
    } catch (error) {
      console.error('❌ Failed to send ICE candidate:', error);
    }
  }

  /**
   * Phase 3: Setup signaling listeners for incoming WebRTC messages
   */
  private setupSignalingListeners(): void {
    console.log('📡 Setting up real WebRTC signaling listeners...');

    longpollingService.on('chatMessage', (message: any) => {
      this.handleSignalingMessage(message);
    });

    longpollingService.on('message', (message: any) => {
      if (message.payload) {
        this.handleSignalingMessage(message.payload);
      }
    });
  }

  /**
   * Phase 3: Handle incoming signaling messages
   */
  private async handleSignalingMessage(message: any): Promise<void> {
    try {
      if (message.subject && message.subject.includes('WebRTC') && message.subject.includes('Real Call')) {
        console.log('📡 Received real WebRTC signaling message:', message.subject);
        
        const signalingData = JSON.parse(message.body);
        
        if (signalingData.type === 'webrtc-sdp-answer' && this.currentCall) {
          await this.handleSdpAnswer(signalingData.sdp);
        } else if (signalingData.type === 'webrtc-ice-candidate' && this.currentCall) {
          await this.handleIceCandidate(signalingData.candidate);
        }
      }
    } catch (error) {
      console.log('⚠️ Error handling signaling message:', error.message);
    }
  }

  /**
   * Phase 4: Handle SDP answer (conditional)
   */
  private async handleSdpAnswer(sdp: any): Promise<void> {
    if (!this.currentCall || !webRTCDetector.isAvailable()) return;

    try {
      console.log('📝 Received SDP answer, setting remote description...');
      const RTCSessionDescription = webRTCDetector.getRTCSessionDescription();
      await this.currentCall.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      console.log('✅ Remote description set - P2P connection establishing...');
    } catch (error) {
      console.error('❌ Failed to handle SDP answer:', error);
    }
  }

  /**
   * Phase 4: Handle ICE candidate (conditional)
   */
  private async handleIceCandidate(candidateData: any): Promise<void> {
    if (!this.currentCall || !webRTCDetector.isAvailable()) return;

    try {
      const RTCIceCandidate = webRTCDetector.getRTCIceCandidate();
      const candidate = new RTCIceCandidate({
        candidate: candidateData.candidate,
        sdpMLineIndex: candidateData.sdpMLineIndex,
        sdpMid: candidateData.sdpMid
      });

      console.log('🧊 Adding ICE candidate to peer connection...');
      await this.currentCall.peerConnection.addIceCandidate(candidate);
      console.log('✅ ICE candidate added');
    } catch (error) {
      console.error('❌ Failed to handle ICE candidate:', error);
    }
  }

  /**
   * End current call
   */
  async endCall(): Promise<void> {
    if (!this.currentCall) return;

    try {
      console.log('📞 Ending WebRTC call...');

      // Close peer connection
      this.currentCall.peerConnection.close();

      // Stop local stream
      if (this.currentCall.localStream) {
        this.currentCall.localStream.getTracks().forEach(track => track.stop());
      }

      this.currentCall.status = 'ended';
      this.emit('callEnded', this.currentCall);
      
      this.currentCall = null;
      console.log('✅ WebRTC call ended');

    } catch (error) {
      console.error('❌ Error ending call:', error);
    }
  }

  /**
   * Get current call
   */
  getCurrentCall(): WebRTCCall | null {
    return this.currentCall;
  }

  /**
   * Event emitter methods
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
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
export const realWebRTCService = new RealWebRTCService();
export default realWebRTCService;
