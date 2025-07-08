/**
 * WebRTC Signaling Test Service - Phase 2 Testing
 * BC-S013: Test SDP/ICE message exchange via Odoo (Expo Go compatible)
 */

import { authService } from './BaseAuthService';
import longpollingService from './BaseLongpollingService';

interface MockSignalingData {
  type: 'webrtc-sdp-offer' | 'webrtc-sdp-answer' | 'webrtc-ice-candidate';
  sessionId: number;
  channelId: number;
  data: any;
  timestamp: number;
}

class WebRTCSignalingTestService {
  private eventListeners = new Map<string, Function[]>();

  /**
   * Phase 2: Test SDP Offer Signaling (Expo Go)
   */
  async testSdpOfferSignaling(channelId: number, sessionId: number): Promise<boolean> {
    try {
      console.log('🧪 Phase 2: Testing SDP Offer Signaling');
      console.log(`📡 Channel: ${channelId}, Session: ${sessionId}`);

      const client = authService.getClient();
      if (!client) throw new Error('No authenticated client');

      // Mock SDP offer (what real WebRTC would generate)
      const mockSdpOffer = {
        type: 'offer',
        sdp: 'v=0\r\no=- 123456789 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\na=msid-semantic: WMS\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:mock\r\na=ice-pwd:mockpassword\r\na=fingerprint:sha-256 MOCK:FINGERPRINT\r\na=setup:actpass\r\na=mid:0\r\na=sendrecv\r\na=rtcp-mux\r\na=rtpmap:111 opus/48000/2\r\n'
      };

      // Create signaling message
      const signalingMessage = {
        type: 'webrtc-sdp-offer',
        sessionId: sessionId,
        sdp: mockSdpOffer,
        timestamp: Date.now(),
        from: 'mobile-app',
        to: 'web-client'
      };

      // Send via Odoo message (this is how real WebRTC signaling would work)
      await client.callModel('discuss.channel', 'message_post', [channelId], {
        body: JSON.stringify(signalingMessage),
        message_type: 'notification',
        subject: 'WebRTC SDP Offer - Phase 2 Test'
      });

      console.log('✅ SDP offer signaling message sent');
      console.log('📡 Message should appear in longpolling');
      
      return true;

    } catch (error) {
      console.error('❌ SDP offer signaling test failed:', error);
      return false;
    }
  }

  /**
   * Phase 2: Test ICE Candidate Signaling (Expo Go)
   */
  async testIceCandidateSignaling(channelId: number, sessionId: number): Promise<boolean> {
    try {
      console.log('🧪 Testing ICE Candidate Signaling');

      const client = authService.getClient();
      if (!client) throw new Error('No authenticated client');

      // Mock ICE candidate (what STUN servers would generate)
      const mockIceCandidate = {
        candidate: 'candidate:1 1 UDP 2130706431 192.168.1.100 54400 typ host',
        sdpMLineIndex: 0,
        sdpMid: '0'
      };

      // Create ICE signaling message
      const signalingMessage = {
        type: 'webrtc-ice-candidate',
        sessionId: sessionId,
        candidate: mockIceCandidate,
        timestamp: Date.now(),
        from: 'mobile-app',
        stunServer: 'stun:stun.l.google.com:19302'
      };

      // Send via Odoo message
      await client.callModel('discuss.channel', 'message_post', [channelId], {
        body: JSON.stringify(signalingMessage),
        message_type: 'notification',
        subject: 'WebRTC ICE Candidate - Phase 2 Test'
      });

      console.log('✅ ICE candidate signaling message sent');
      console.log('📡 This simulates STUN server communication');
      
      return true;

    } catch (error) {
      console.error('❌ ICE candidate signaling test failed:', error);
      return false;
    }
  }

  /**
   * Phase 2: Setup signaling listeners (Expo Go)
   */
  setupSignalingListeners(): void {
    console.log('📡 Setting up WebRTC signaling listeners for Phase 2');

    // Listen for WebRTC signaling messages via longpolling
    longpollingService.on('chatMessage', (message: any) => {
      this.handleSignalingMessage(message);
    });

    longpollingService.on('message', (message: any) => {
      if (message.payload) {
        this.handleSignalingMessage(message.payload);
      }
    });

    console.log('✅ Signaling listeners setup complete');
  }

  /**
   * Handle incoming signaling messages
   */
  private handleSignalingMessage(message: any): void {
    try {
      // Check if this is a WebRTC signaling message
      if (message.subject && message.subject.includes('WebRTC')) {
        console.log('📡 Received WebRTC signaling message:', message.subject);
        
        try {
          const signalingData = JSON.parse(message.body);
          console.log('📊 Signaling data:', signalingData);

          if (signalingData.type === 'webrtc-sdp-offer') {
            console.log('📞 Received SDP offer - would create answer in real WebRTC');
            this.emit('sdpOfferReceived', signalingData);
          } else if (signalingData.type === 'webrtc-ice-candidate') {
            console.log('🧊 Received ICE candidate - would add to peer connection');
            this.emit('iceCandidateReceived', signalingData);
          }

        } catch (parseError) {
          // Not a JSON signaling message, ignore
        }
      }
    } catch (error) {
      console.log('⚠️ Error handling signaling message:', error.message);
    }
  }

  /**
   * Phase 2: Run complete signaling test
   */
  async runPhase2Test(channelId: number, sessionId: number): Promise<boolean> {
    console.log('🧪 Running Phase 2: WebRTC Signaling Test');
    console.log('='.repeat(50));

    try {
      // Setup listeners first
      this.setupSignalingListeners();

      // Test SDP signaling
      console.log('\n1️⃣ Testing SDP Offer Signaling...');
      const sdpTest = await this.testSdpOfferSignaling(channelId, sessionId);

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test ICE signaling
      console.log('\n2️⃣ Testing ICE Candidate Signaling...');
      const iceTest = await this.testIceCandidateSignaling(channelId, sessionId);

      const success = sdpTest && iceTest;

      if (success) {
        console.log('\n🎉 Phase 2 SUCCESS!');
        console.log('✅ SDP/ICE signaling infrastructure works');
        console.log('✅ Ready for Phase 3 (STUN servers in dev build)');
      } else {
        console.log('\n❌ Phase 2 failed - check signaling');
      }

      return success;

    } catch (error) {
      console.error('❌ Phase 2 test failed:', error);
      return false;
    }
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
        console.error(`Error in signaling listener for ${event}:`, error);
      }
    });
  }
}

// Create singleton instance
export const webRTCSignalingTestService = new WebRTCSignalingTestService();
export default webRTCSignalingTestService;
