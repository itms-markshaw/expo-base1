/**
 * WebRTC Detector Service - Conditional WebRTC Support
 * BC-S015: Automatically detects WebRTC availability and switches modes
 */

// WebRTC types for fallback
interface WebRTCTypes {
  mediaDevices?: any;
  RTCPeerConnection?: any;
  RTCIceCandidate?: any;
  RTCSessionDescription?: any;
  MediaStream?: any;
  RTCView?: any;
}

class WebRTCDetectorService {
  private webRTCModules: WebRTCTypes = {};
  private isWebRTCAvailable: boolean = false;
  private detectionComplete: boolean = false;

  constructor() {
    this.detectWebRTCAvailability();
  }

  /**
   * Detect if WebRTC is available (Development Build vs Expo Go)
   */
  private detectWebRTCAvailability(): void {
    try {
      console.log('🔍 Detecting WebRTC availability...');
      
      // Try to import react-native-webrtc
      const webrtc = require('react-native-webrtc');
      
      // If we get here, WebRTC is available
      this.webRTCModules = {
        mediaDevices: webrtc.mediaDevices,
        RTCPeerConnection: webrtc.RTCPeerConnection,
        RTCIceCandidate: webrtc.RTCIceCandidate,
        RTCSessionDescription: webrtc.RTCSessionDescription,
        MediaStream: webrtc.MediaStream,
        RTCView: webrtc.RTCView
      };
      
      this.isWebRTCAvailable = true;
      console.log('✅ WebRTC detected - Development Build mode');
      console.log('🚀 Full P2P calling with STUN servers available');
      
    } catch (error) {
      // WebRTC not available - Expo Go mode
      this.isWebRTCAvailable = false;
      console.log('📱 WebRTC not detected - Expo Go mode');
      console.log('🔄 Using fallback: RTC sessions + signaling only');
    }
    
    this.detectionComplete = true;
  }

  /**
   * Check if WebRTC is available
   */
  isAvailable(): boolean {
    return this.isWebRTCAvailable;
  }

  /**
   * Get WebRTC modules (safe access)
   */
  getModules(): WebRTCTypes {
    return this.webRTCModules;
  }

  /**
   * Get RTCPeerConnection class
   */
  getRTCPeerConnection(): any {
    if (!this.isWebRTCAvailable) {
      throw new Error('RTCPeerConnection not available in Expo Go');
    }
    return this.webRTCModules.RTCPeerConnection;
  }

  /**
   * Get mediaDevices
   */
  getMediaDevices(): any {
    if (!this.isWebRTCAvailable) {
      throw new Error('mediaDevices not available in Expo Go');
    }
    return this.webRTCModules.mediaDevices;
  }

  /**
   * Get RTCIceCandidate class
   */
  getRTCIceCandidate(): any {
    if (!this.isWebRTCAvailable) {
      throw new Error('RTCIceCandidate not available in Expo Go');
    }
    return this.webRTCModules.RTCIceCandidate;
  }

  /**
   * Get RTCSessionDescription class
   */
  getRTCSessionDescription(): any {
    if (!this.isWebRTCAvailable) {
      throw new Error('RTCSessionDescription not available in Expo Go');
    }
    return this.webRTCModules.RTCSessionDescription;
  }

  /**
   * Get RTCView component
   */
  getRTCView(): any {
    if (!this.isWebRTCAvailable) {
      throw new Error('RTCView not available in Expo Go');
    }
    return this.webRTCModules.RTCView;
  }

  /**
   * Get current mode description
   */
  getModeDescription(): string {
    if (!this.detectionComplete) {
      return 'Detecting...';
    }
    
    if (this.isWebRTCAvailable) {
      return 'Development Build - Full WebRTC';
    } else {
      return 'Expo Go - RTC Sessions Only';
    }
  }

  /**
   * Get available features
   */
  getAvailableFeatures(): string[] {
    const features: string[] = [
      'RTC Session Creation',
      'WebRTC Signaling',
      'Odoo Web Ringing'
    ];

    if (this.isWebRTCAvailable) {
      features.push(
        'Google STUN Servers',
        'P2P Audio Streaming',
        'Real WebRTC Calls',
        'ICE Candidate Generation',
        'Media Device Access'
      );
    }

    return features;
  }

  /**
   * Test WebRTC functionality safely
   */
  async testWebRTCCapabilities(): Promise<{
    webrtcAvailable: boolean;
    mediaAccess: boolean;
    stunServers: boolean;
    features: string[];
  }> {
    const result = {
      webrtcAvailable: this.isWebRTCAvailable,
      mediaAccess: false,
      stunServers: false,
      features: this.getAvailableFeatures()
    };

    if (this.isWebRTCAvailable) {
      try {
        // Test media access
        const mediaDevices = this.getMediaDevices();
        if (mediaDevices && mediaDevices.getUserMedia) {
          result.mediaAccess = true;
        }

        // Test STUN server configuration
        const RTCPeerConnection = this.getRTCPeerConnection();
        if (RTCPeerConnection) {
          const testConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
          });
          result.stunServers = true;
          testConnection.close();
        }

      } catch (error) {
        console.log('⚠️ WebRTC capability test failed:', error.message);
      }
    }

    return result;
  }

  /**
   * Create conditional peer connection
   */
  createPeerConnection(config?: any): any {
    if (!this.isWebRTCAvailable) {
      throw new Error('Cannot create peer connection in Expo Go mode');
    }

    const RTCPeerConnection = this.getRTCPeerConnection();
    return new RTCPeerConnection(config);
  }

  /**
   * Get user media conditionally
   */
  async getUserMedia(constraints: any): Promise<any> {
    if (!this.isWebRTCAvailable) {
      throw new Error('Cannot access media devices in Expo Go mode');
    }

    const mediaDevices = this.getMediaDevices();
    return await mediaDevices.getUserMedia(constraints);
  }

  /**
   * Log current configuration
   */
  logConfiguration(): void {
    console.log('📱 WebRTC Configuration:');
    console.log(`   Mode: ${this.getModeDescription()}`);
    console.log(`   WebRTC Available: ${this.isWebRTCAvailable}`);
    console.log('   Available Features:');
    this.getAvailableFeatures().forEach(feature => {
      console.log(`     ✅ ${feature}`);
    });
  }
}

// Create singleton instance
export const webRTCDetector = new WebRTCDetectorService();
export default webRTCDetector;
