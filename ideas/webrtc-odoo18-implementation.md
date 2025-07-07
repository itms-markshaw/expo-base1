# Complete WebRTC + Odoo 18 Implementation Guide

## 🎯 **Architecture Overview**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Expo App      │────│   Odoo 18 Bus    │────│   Odoo Web      │
│   (WebRTC)      │    │   (Signaling)    │    │   (WebRTC)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │                        │                        │
         v                        v                        v
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ react-native-   │    │ mail.rtc.session │    │ Browser WebRTC  │
│ webrtc          │    │ (Odoo Model)     │    │ Implementation  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🛠️ **Step 1: Expo/React Native Setup**

### **1.1 Install Dependencies**

```bash
# Switch to development builds (WebRTC requires native modules)
npx expo install expo-dev-client

# Install WebRTC
npm install react-native-webrtc

# Install additional dependencies
npx expo install expo-av expo-permissions expo-notifications

# Create development build
npx expo run:ios --device
npx expo run:android --device
```

### **1.2 Configure app.json/app.config.js**

```javascript
// app.config.js
export default {
  expo: {
    name: "Your App",
    plugins: [
      "expo-dev-client",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff",
          "sounds": ["./assets/notification.wav"]
        }
      ]
    ],
    ios: {
      infoPlist: {
        NSCameraUsageDescription: "This app needs access to camera for video calls",
        NSMicrophoneUsageDescription: "This app needs access to microphone for calls",
        UIBackgroundModes: ["audio", "voip"]
      }
    },
    android: {
      permissions: [
        "CAMERA",
        "RECORD_AUDIO",
        "MODIFY_AUDIO_SETTINGS",
        "INTERNET",
        "ACCESS_NETWORK_STATE"
      ]
    }
  }
};
```

## 🔧 **Step 2: Odoo 18 Backend Setup**

### **2.1 Enable RTC Module**

```bash
# In Odoo 18, enable the mail RTC module
# Go to Apps -> Search "discuss" -> Install "Discuss" app
# This includes RTC functionality
```

### **2.2 Create Custom RTC Extension**

Create addon: `addons/mobile_webrtc/`

```python
# addons/mobile_webrtc/__manifest__.py
{
    'name': 'Mobile WebRTC Integration',
    'version': '1.0',
    'depends': ['mail', 'discuss'],
    'data': [
        'security/ir.model.access.csv',
    ],
    'installable': True,
    'auto_install': False,
}
```

```python
# addons/mobile_webrtc/models/discuss_channel.py
from odoo import models, api, fields
import json
import logging

_logger = logging.getLogger(__name__)

class DiscussChannel(models.Model):
    _inherit = 'discuss.channel'

    @api.model
    def mobile_start_webrtc_call(self, channel_id, call_type='video', ice_servers=None):
        """Start WebRTC call from mobile app"""
        
        channel = self.browse(channel_id)
        if not channel.exists():
            raise ValueError(f"Channel {channel_id} not found")

        # Create RTC session
        rtc_session = self.env['discuss.channel.rtc.session'].create({
            'channel_id': channel_id,
            'partner_id': self.env.user.partner_id.id,
            'is_camera_on': call_type == 'video',
            'is_muted': False,
            'is_screen_sharing_on': False,
        })

        # Generate call ID for mobile tracking
        call_id = f"mobile_call_{rtc_session.id}_{int(time.time())}"

        # Prepare WebRTC signaling data
        webrtc_data = {
            'call_id': call_id,
            'session_id': rtc_session.id,
            'channel_id': channel_id,
            'caller_id': self.env.user.partner_id.id,
            'caller_name': self.env.user.name,
            'call_type': call_type,
            'ice_servers': ice_servers or self._get_default_ice_servers(),
            'timestamp': fields.Datetime.now().isoformat(),
        }

        # Send bus notification to all channel members
        notifications = []
        for member in channel.channel_member_ids:
            if member.partner_id.id != self.env.user.partner_id.id:
                notifications.append([
                    f'discuss.channel_{channel_id}',
                    {
                        'type': 'webrtc_call_invitation',
                        'payload': webrtc_data
                    }
                ])

        if notifications:
            self.env['bus.bus']._sendmany(notifications)
            _logger.info(f"📞 WebRTC call invitation sent to {len(notifications)} members")

        return webrtc_data

    @api.model
    def mobile_webrtc_signal(self, call_id, signal_type, signal_data):
        """Handle WebRTC signaling (offer, answer, ice candidates)"""
        
        # Find the channel and session
        session_id = int(call_id.split('_')[2]) if '_' in call_id else None
        if not session_id:
            raise ValueError("Invalid call ID")

        rtc_session = self.env['discuss.channel.rtc.session'].browse(session_id)
        if not rtc_session.exists():
            raise ValueError("RTC session not found")

        # Prepare signaling data
        signaling_data = {
            'call_id': call_id,
            'session_id': session_id,
            'signal_type': signal_type,  # 'offer', 'answer', 'ice_candidate'
            'signal_data': signal_data,
            'from_partner_id': self.env.user.partner_id.id,
            'timestamp': fields.Datetime.now().isoformat(),
        }

        # Send to other participants
        channel_id = rtc_session.channel_id.id
        notifications = []
        for member in rtc_session.channel_id.channel_member_ids:
            if member.partner_id.id != self.env.user.partner_id.id:
                notifications.append([
                    f'discuss.channel_{channel_id}',
                    {
                        'type': 'webrtc_signaling',
                        'payload': signaling_data
                    }
                ])

        if notifications:
            self.env['bus.bus']._sendmany(notifications)
            _logger.info(f"📡 WebRTC signal sent: {signal_type}")

        return True

    def _get_default_ice_servers(self):
        """Default ICE servers for WebRTC"""
        return [
            {'urls': 'stun:stun.l.google.com:19302'},
            {'urls': 'stun:stun1.l.google.com:19302'},
            # Add TURN servers if needed for production
            # {
            #     'urls': 'turn:your-turn-server.com:3478',
            #     'username': 'username',
            #     'credential': 'password'
            # }
        ]

    @api.model
    def mobile_end_webrtc_call(self, call_id):
        """End WebRTC call"""
        session_id = int(call_id.split('_')[2]) if '_' in call_id else None
        if session_id:
            rtc_session = self.env['discuss.channel.rtc.session'].browse(session_id)
            if rtc_session.exists():
                # Notify other participants
                channel_id = rtc_session.channel_id.id
                self.env['bus.bus']._sendmany([[
                    f'discuss.channel_{channel_id}',
                    {
                        'type': 'webrtc_call_ended',
                        'payload': {'call_id': call_id, 'session_id': session_id}
                    }
                ]])
                
                # Remove session
                rtc_session.unlink()
                return True
        return False
```

```csv
# addons/mobile_webrtc/security/ir.model.access.csv
id,name,model_id:id,group_id:id,perm_read,perm_write,perm_create,perm_unlink
access_mobile_webrtc_user,mobile.webrtc.user,discuss.model_discuss_channel,base.group_user,1,1,1,1
access_mobile_webrtc_rtc_user,mobile.webrtc.rtc.user,discuss.model_discuss_channel_rtc_session,base.group_user,1,1,1,1
```

## 📱 **Step 3: React Native WebRTC Service**

### **3.1 WebRTC Service Implementation**

```typescript
// src/models/discuss_channel/services/WebRTCService.ts
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  MediaStream,
  mediaDevices,
  RTCView,
} from 'react-native-webrtc';
import { authService } from '../../base/services/BaseAuthService';
import longpollingService from '../../base/services/BaseLongpollingService';

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
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private currentCall: WebRTCCall | null = null;
  private eventListeners = new Map<string, Function[]>();

  private readonly PEER_CONNECTION_CONFIG = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  constructor() {
    this.setupSignalingListeners();
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
   * Initiate WebRTC call
   */
  async initiateCall(channelId: number, callType: 'audio' | 'video' = 'video'): Promise<string> {
    try {
      console.log(`📞 Initiating ${callType} WebRTC call in channel ${channelId}`);

      const client = authService.getClient();
      if (!client) throw new Error('No authenticated client');

      // Start call on Odoo backend
      const callData = await client.callModel('discuss.channel', 'mobile_start_webrtc_call', [], {
        channel_id: channelId,
        call_type: callType,
      });

      console.log('📞 Call data received:', callData);

      // Set up local media
      await this.setupLocalMedia(callType);

      // Create peer connection
      await this.createPeerConnection();

      // Store call info
      this.currentCall = {
        callId: callData.call_id,
        sessionId: callData.session_id,
        channelId,
        callerId: callData.caller_id,
        callerName: callData.caller_name,
        callType,
        status: 'initiating',
        isIncoming: false,
      };

      // Create and send offer
      await this.createAndSendOffer();

      this.emit('callInitiated', this.currentCall);
      return callData.call_id;

    } catch (error) {
      console.error('❌ Failed to initiate WebRTC call:', error);
      throw error;
    }
  }

  /**
   * Answer incoming WebRTC call
   */
  async answerCall(callId: string): Promise<void> {
    try {
      console.log(`📞 Answering WebRTC call: ${callId}`);

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

      if (this.currentCall) {
        const client = authService.getClient();
        if (client) {
          await client.callModel('discuss.channel', 'mobile_end_webrtc_call', [], {
            call_id: this.currentCall.callId,
          });
        }
      }

      this.cleanup();
      this.emit('callEnded', { callId: this.currentCall?.callId });

    } catch (error) {
      console.error('❌ Failed to end WebRTC call:', error);
    }
  }

  /**
   * Setup local media (camera/microphone)
   */
  private async setupLocalMedia(callType: 'audio' | 'video'): Promise<void> {
    try {
      console.log(`📹 Setting up local media for ${callType} call`);

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

      this.peerConnection = new RTCPeerConnection(this.PEER_CONNECTION_CONFIG);

      // Add local stream tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection!.addTrack(track, this.localStream!);
        });
      }

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        console.log('📡 Remote stream received');
        this.remoteStream = event.streams[0];
        this.emit('remoteStreamReceived', this.remoteStream);
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
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
      this.localStream.getTracks().forEach(track => track.stop());
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
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Get remote stream
   */
  getRemoteStream(): MediaStream | null {
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
```

## 📱 **Step 4: WebRTC UI Components**

### **4.1 Video Call Screen**

```typescript
// src/models/discuss_channel/screens/152_VideoCallScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { MaterialIcons } from '@expo/vector-icons';
import webRTCService, { WebRTCCall } from '../services/WebRTCService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface VideoCallScreenProps {
  route: {
    params: {
      callId: string;
      isIncoming?: boolean;
    };
  };
  navigation: any;
}

export default function VideoCallScreen({ route, navigation }: VideoCallScreenProps) {
  const { callId, isIncoming = false } = route.params;
  
  const [call, setCall] = useState<WebRTCCall | null>(null);
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const callStartTime = useRef<Date | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setupCallListeners();
    
    // Get current call info
    const currentCall = webRTCService.getCurrentCall();
    if (currentCall && currentCall.callId === callId) {
      setCall(currentCall);
      
      // Get existing streams
      const localStr = webRTCService.getLocalStream();
      const remoteStr = webRTCService.getRemoteStream();
      
      if (localStr) setLocalStream(localStr);
      if (remoteStr) setRemoteStream(remoteStr);
    }

    return () => {
      clearInterval(durationInterval.current);
      // Don't cleanup WebRTC here - let the service handle it
    };
  }, [callId]);

  const setupCallListeners = () => {
    webRTCService.on('localStreamObtained', (stream) => {
      console.log('📹 Local stream obtained in UI');
      setLocalStream(stream);
    });

    webRTCService.on('remoteStreamReceived', (stream) => {
      console.log('📹 Remote stream received in UI');
      setRemoteStream(stream);
    });

    webRTCService.on('callStatusChanged', (updatedCall) => {
      setCall(updatedCall);
      
      if (updatedCall.status === 'connected' && !callStartTime.current) {
        callStartTime.current = new Date();
        setIsConnected(true);
        startDurationTimer();
      }
    });

    webRTCService.on('callEnded', () => {
      navigation.goBack();
    });

    webRTCService.on('cameraToggled', (enabled) => {
      setIsCameraOn(enabled);
    });

    webRTCService.on('microphoneToggled', (enabled) => {
      setIsMicOn(enabled);
    });
  };

  const startDurationTimer = () => {
    durationInterval.current = setInterval(() => {
      if (callStartTime.current) {
        const duration = Math.floor((Date.now() - callStartTime.current.getTime()) / 1000);
        setCallDuration(duration);
      }
    }, 1000);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = async () => {
    try {
      await webRTCService.endCall();
      navigation.goBack();
    } catch (error) {
      console.error('Failed to end call:', error);
      navigation.goBack();
    }
  };

  const handleToggleCamera = async () => {
    try {
      await webRTCService.toggleCamera();
    } catch (error) {
      console.error('Failed to toggle camera:', error);
    }
  };

  const handleToggleMicrophone = async () => {
    try {
      await webRTCService.toggleMicrophone();
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
    }
  };

  const handleSwitchCamera = async () => {
    try {
      await webRTCService.switchCamera();
    } catch (error) {
      console.error('Failed to switch camera:', error);
    }
  };

  const handleAnswerCall = async () => {
    try {
      await webRTCService.answerCall(callId);
    } catch (error) {
      console.error('Failed to answer call:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Remote Video (Full Screen) */}
      <View style={styles.remoteVideoContainer}>
        {remoteStream ? (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={styles.remoteVideo}
            objectFit="cover"
          />
        ) : (
          <View style={styles.noVideoContainer}>
            <MaterialIcons name="videocam-off" size={64} color="#666" />
            <Text style={styles.noVideoText}>
              {isConnected ? 'No video' : 'Connecting...'}
            </Text>
          </View>
        )}
      </View>

      {/* Local Video (Picture-in-Picture) */}
      {localStream && (
        <View style={styles.localVideoContainer}>
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.localVideo}
            objectFit="cover"
            mirror={true}
          />
        </View>
      )}

      {/* Call Info Overlay */}
      <View style={styles.callInfoOverlay}>
        <Text style={styles.callerName}>
          {call?.callerName || 'Unknown'}
        </Text>
        <Text style={styles.callStatus}>
          {isConnected ? formatDuration(callDuration) : call?.status || 'Connecting...'}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        {/* Answer/Decline (for incoming calls) */}
        {isIncoming && call?.status === 'ringing' && (
          <View style={styles.incomingControls}>
            <TouchableOpacity 
              style={[styles.controlButton, styles.declineButton]}
              onPress={handleEndCall}
            >
              <MaterialIcons name="call-end" size={32} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.controlButton, styles.answerButton]}
              onPress={handleAnswerCall}
            >
              <MaterialIcons name="call" size={32} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {/* Active Call Controls */}
        {(!isIncoming || call?.status !== 'ringing') && (
          <View style={styles.activeControls}>
            <TouchableOpacity 
              style={[styles.controlButton, styles.secondaryButton]}
              onPress={handleToggleMicrophone}
            >
              <MaterialIcons 
                name={isMicOn ? "mic" : "mic-off"} 
                size={24} 
                color="white" 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.controlButton, styles.endCallButton]}
              onPress={handleEndCall}
            >
              <MaterialIcons name="call-end" size={32} color="white" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.controlButton, styles.secondaryButton]}
              onPress={handleToggleCamera}
            >
              <MaterialIcons 
                name={isCameraOn ? "videocam" : "videocam-off"} 
                size={24} 
                color="white" 
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Additional Controls */}
        <View style={styles.additionalControls}>
          <TouchableOpacity 
            style={styles.smallControlButton}
            onPress={handleSwitchCamera}
          >
            <MaterialIcons name="flip-camera-ios" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  noVideoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noVideoText: {
    color: '#666',
    fontSize: 18,
    marginTop: 16,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },
  callInfoOverlay: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  callerName: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  callStatus: {
    color: 'white',
    fontSize: 16,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  incomingControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: 200,
  },
  activeControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  controlButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  answerButton: {
    backgroundColor: '#34C759',
  },
  declineButton: {
    backgroundColor: '#FF3B30',
  },
  endCallButton: {
    backgroundColor: '#FF3B30',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  additionalControls: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 20,
  },
  smallControlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

### **4.2 Incoming Call Modal**

```typescript
// src/models/discuss_channel/components/IncomingWebRTCCallModal.tsx
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { WebRTCCall } from '../services/WebRTCService';

const { width } = Dimensions.get('window');

interface IncomingWebRTCCallModalProps {
  visible: boolean;
  call: WebRTCCall | null;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingWebRTCCallModal({ 
  visible, 
  call, 
  onAccept, 
  onDecline 
}: IncomingWebRTCCallModalProps) {
  if (!call) return null;

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.callCard}>
          <View style={styles.avatarContainer}>
            <MaterialIcons 
              name={call.callType === 'video' ? 'videocam' : 'phone'} 
              size={60} 
              color="#007AFF" 
            />
          </View>
          
          <Text style={styles.callerName}>{call.callerName}</Text>
          <Text style={styles.callType}>
            Incoming {call.callType} call
          </Text>
          
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.button, styles.declineButton]}
              onPress={onDecline}
            >
              <MaterialIcons name="call-end" size={32} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.acceptButton]}
              onPress={onAccept}
            >
              <MaterialIcons name="call" size={32} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    width: width * 0.8,
    maxWidth: 320,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  callerName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  callType: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  actions: {
    flexDirection: 'row',
    gap: 40,
  },
  button: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  declineButton: {
    backgroundColor: '#FF3B30',
  },
});
```

## 🔧 **Step 5: Integration with Existing Chat**

### **5.1 Update CallService**

```typescript
// Update your existing CallService.ts
import webRTCService from './WebRTCService';

class CallService {
  // ... existing code ...

  async initiateCall(channelId: number, callType: 'audio' | 'video' = 'audio'): Promise<string> {
    try {
      // For video calls, use WebRTC
      if (callType === 'video') {
        return await webRTCService.initiateCall(channelId, callType);
      }
      
      // For audio calls, use your existing phone system
      return await this.initiatePhoneCall(channelId);
      
    } catch (error) {
      console.error('❌ Failed to initiate call:', error);
      throw error;
    }
  }

  private async initiatePhoneCall(channelId: number): Promise<string> {
    // Your existing phone call logic
    const client = authService.getClient();
    const callId = `phone-${Date.now()}`;
    
    await client.callModel('discuss.channel', 'message_post', [channelId], {
      body: '📞 Audio call started by Mobile User',
      message_type: 'notification',
    });
    
    return callId;
  }
}
```

### **5.2 Update Chat Screen**

```typescript
// In 151_ChatList.tsx - add WebRTC support
import webRTCService, { WebRTCCall } from '../services/WebRTCService';
import { IncomingWebRTCCallModal } from '../components/IncomingWebRTCCallModal';

export default function ChatScreen() {
  // ... existing state ...
  const [incomingWebRTCCall, setIncomingWebRTCCall] = useState<WebRTCCall | null>(null);
  const [showWebRTCCallModal, setShowWebRTCCallModal] = useState(false);

  useEffect(() => {
    // ... existing listeners ...

    // Add WebRTC listeners
    webRTCService.on('incomingCall', (call: WebRTCCall) => {
      console.log('📞 Incoming WebRTC call:', call);
      setIncomingWebRTCCall(call);
      setShowWebRTCCallModal(true);
    });

    return () => {
      // ... existing cleanup ...
      webRTCService.off('incomingCall', handleIncomingWebRTCCall);
    };
  }, []);

  const handleAcceptWebRTCCall = () => {
    if (incomingWebRTCCall) {
      navigation.navigate('VideoCall', {
        callId: incomingWebRTCCall.callId,
        isIncoming: true,
      });
      setShowWebRTCCallModal(false);
    }
  };

  const handleDeclineWebRTCCall = async () => {
    if (incomingWebRTCCall) {
      await webRTCService.endCall();
      setShowWebRTCCallModal(false);
      setIncomingWebRTCCall(null);
    }
  };

  const handleVideoCallPress = async () => {
    if (!selectedChannel) return;

    try {
      const callId = await webRTCService.initiateCall(selectedChannel.id, 'video');
      navigation.navigate('VideoCall', {
        callId,
        isIncoming: false,
      });
    } catch (error) {
      Alert.alert('Call Failed', 'Failed to start video call');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ... existing UI ... */}

      {/* Update video call button */}
      <TouchableOpacity onPress={handleVideoCallPress}>
        <MaterialIcons name="videocam" size={24} color="#007AFF" />
      </TouchableOpacity>

      {/* WebRTC Call Modal */}
      <IncomingWebRTCCallModal
        visible={showWebRTCCallModal}
        call={incomingWebRTCCall}
        onAccept={handleAcceptWebRTCCall}
        onDecline={handleDeclineWebRTCCall}
      />

      {/* ... rest of existing UI ... */}
    </SafeAreaView>
  );
}
```

## 🚀 **Step 6: Navigation Setup**

```typescript
// Add to your navigation stack
import VideoCallScreen from '../models/discuss_channel/screens/152_VideoCallScreen';

// In your navigator:
<Stack.Screen 
  name="VideoCall" 
  component={VideoCallScreen}
  options={{
    headerShown: false,
    presentation: 'fullScreenModal',
  }}
/>
```

## 🧪 **Step 7: Testing & Deployment**

### **7.1 Development Build**

```bash
# Create development build (required for WebRTC)
npx expo run:ios --device
npx expo run:android --device

# For production
eas build --platform ios
eas build --platform android
```

### **7.2 Testing Steps**

1. **Install Odoo addon**: Deploy the `mobile_webrtc` addon
2. **Build development app**: Use `expo-dev-client` 
3. **Test video call**: Press video button in chat
4. **Check Odoo logs**: Verify RTC session creation
5. **Test signaling**: Check WebRTC offer/answer exchange

### **7.3 Production Considerations**

```typescript
// Add TURN servers for production
const PRODUCTION_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: 'turn:your-turn-server.com:3478',
    username: 'your-username',
    credential: 'your-password'
  }
];
```

## 🎯 **Expected Results**

After implementation:

1. **Video call button** → Creates WebRTC session in Odoo
2. **Odoo web shows** → Active video call interface
3. **Mobile app shows** → Full-screen video call UI
4. **Real-time video** → Works between mobile and web
5. **Call controls** → Mute, camera toggle, end call
6. **Signaling** → Handled via Odoo bus system

## ⚠️ **Important Notes**

- **Development builds required** - WebRTC won't work in Expo Go
- **TURN servers needed** - For production deployments behind firewalls
- **Permissions required** - Camera and microphone access
- **Network intensive** - Ensure good WiFi/cellular connection
- **Battery usage** - Video calls drain battery quickly

This gives you **true in-app video calling** integrated with Odoo 18's messaging system!