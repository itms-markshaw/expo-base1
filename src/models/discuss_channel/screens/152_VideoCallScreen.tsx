/**
 * Video Call Screen - Full-screen WebRTC video calling interface
 * Screen 152: WebRTC video/audio calling with Odoo 18 integration
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import webRTCService, { WebRTCCall } from '../services/WebRTCService';

// Try to import RTCView
let RTCView: any;
try {
  const webrtc = require('react-native-webrtc');
  RTCView = webrtc.RTCView;
} catch (error) {
  console.log('📱 RTCView not available - using fallback');
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface VideoCallScreenProps {
  route: {
    params: {
      callId: string;
      isIncoming?: boolean;
    };
  };
}

export default function VideoCallScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { callId, isIncoming = false } = (route.params as any) || {};
  
  const [call, setCall] = useState<WebRTCCall | null>(null);
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isWebRTCAvailable, setIsWebRTCAvailable] = useState(false);

  const callStartTime = useRef<Date | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if WebRTC is available
    setIsWebRTCAvailable(webRTCService.isAvailable());
    
    if (!webRTCService.isAvailable()) {
      Alert.alert(
        'WebRTC Not Available',
        'Video calling requires a development build with react-native-webrtc. Please use expo-dev-client.',
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      );
      return;
    }

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

  // Fallback UI for when WebRTC is not available
  if (!isWebRTCAvailable) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.fallbackContainer}>
          <MaterialIcons name="videocam-off" size={64} color="#666" />
          <Text style={styles.fallbackTitle}>WebRTC Not Available</Text>
          <Text style={styles.fallbackText}>
            Video calling requires a development build with react-native-webrtc.
            Please use expo-dev-client to enable video calling.
          </Text>
          <TouchableOpacity style={styles.fallbackButton} onPress={() => navigation.goBack()}>
            <Text style={styles.fallbackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Remote Video (Full Screen) */}
      <View style={styles.remoteVideoContainer}>
        {remoteStream && RTCView ? (
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
      {localStream && RTCView && (
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
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  fallbackTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  fallbackText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  fallbackButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  fallbackButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
