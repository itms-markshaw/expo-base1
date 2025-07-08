/**
 * Call Screen - Active audio/video call interface
 * Screen 152: Full-screen call interface with controls
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
// RTCView removed - using Expo-compatible components
import { callService, CallSession } from '../../base/services/BC-S010_CallService';

interface CallScreenProps {
  route: {
    params: {
      callSession: CallSession;
    };
  };
  navigation: any;
}

export default function CallScreen({ route, navigation }: CallScreenProps) {
  const { callSession } = route.params;

  // Deserialize dates from navigation params
  const deserializedCallSession = {
    ...callSession,
    startTime: callSession.startTime ? new Date(callSession.startTime) : undefined,
    endTime: callSession.endTime ? new Date(callSession.endTime) : undefined,
  };

  const [currentCall, setCurrentCall] = useState<CallSession>(deserializedCallSession);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callSession.isVideo);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    // Update call duration every second
    const interval = setInterval(() => {
      if (currentCall.startTime && currentCall.status === 'connected') {
        const duration = Math.floor((Date.now() - currentCall.startTime.getTime()) / 1000);
        setCallDuration(duration);
      }
    }, 1000);

    // Update audio quality info every 5 seconds
    const audioInterval = setInterval(async () => {
      if (currentCall.status === 'connected') {
        try {
          const quality = await callService.getAudioStatus();
          setAudioQuality(quality);
        } catch (error) {
          console.log('Audio quality check failed:', error.message);
        }
      }
    }, 5000);

    // Listen for call events
    const handleCallConnected = (call: CallSession) => {
      setCurrentCall(call);
    };

    const handleCallStatusChanged = (data: any) => {
      if (data.call) {
        setCurrentCall(data.call);
      }
    };

    const handleCallEnded = () => {
      navigation.goBack();
    };

    callService.on('callConnected', handleCallConnected);
    callService.on('callStatusChanged', handleCallStatusChanged);
    callService.on('callEnded', handleCallEnded);

    return () => {
      clearInterval(interval);
      callService.off('callConnected', handleCallConnected);
      callService.off('callStatusChanged', handleCallStatusChanged);
      callService.off('callEnded', handleCallEnded);
    };
  }, [currentCall, navigation]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = async () => {
    await callService.endCall();
    navigation.goBack();
  };

  const handleToggleVideo = async () => {
    const enabled = await callService.toggleVideo();
    setIsVideoEnabled(enabled);
  };

  const handleToggleAudio = async () => {
    const enabled = await callService.toggleAudio();
    setIsAudioEnabled(enabled);
  };

  const handleToggleSpeaker = () => {
    // Toggle speaker mode (implementation depends on platform)
    setIsSpeakerEnabled(!isSpeakerEnabled);
  };

  const renderVideoView = () => {
    if (!currentCall.isVideo) {
      return null;
    }

    return (
      <View style={styles.videoContainer}>
        {/* Remote Video Placeholder */}
        <View style={styles.remoteVideo}>
          <View style={styles.videoPlaceholder}>
            <MaterialIcons name="person" size={80} color="#FFF" />
            <Text style={styles.videoPlaceholderText}>Remote Video</Text>
          </View>
        </View>

        {/* Local Video Placeholder (Picture-in-Picture) */}
        {isVideoEnabled && (
          <View style={styles.localVideoContainer}>
            <View style={styles.localVideo}>
              <View style={styles.videoPlaceholder}>
                <MaterialIcons name="videocam" size={40} color="#FFF" />
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderAudioView = () => {
    if (currentCall.isVideo) {
      return null;
    }

    return (
      <View style={styles.audioContainer}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={80} color="#FFF" />
          </View>
        </View>
        <Text style={styles.participantName}>
          {callService.getCallerName()}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Video or Audio View */}
      {currentCall.isVideo ? renderVideoView() : renderAudioView()}

      {/* Call Info Overlay */}
      <View style={styles.callInfoOverlay}>
        <Text style={styles.channelName}>{currentCall.channelName}</Text>
        <Text style={styles.callStatus}>
          {currentCall.status === 'connecting' ? 'Connecting...' : formatDuration(callDuration)}
        </Text>
      </View>

      {/* Call Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.controlsRow}>
          {/* Audio Toggle */}
          <TouchableOpacity
            style={[
              styles.controlButton,
              !isAudioEnabled && styles.controlButtonDisabled,
            ]}
            onPress={handleToggleAudio}
          >
            <MaterialIcons
              name={isAudioEnabled ? 'mic' : 'mic-off'}
              size={24}
              color="#FFF"
            />
          </TouchableOpacity>

          {/* Video Toggle (only for video calls) */}
          {currentCall.isVideo && (
            <TouchableOpacity
              style={[
                styles.controlButton,
                !isVideoEnabled && styles.controlButtonDisabled,
              ]}
              onPress={handleToggleVideo}
            >
              <MaterialIcons
                name={isVideoEnabled ? 'videocam' : 'videocam-off'}
                size={24}
                color="#FFF"
              />
            </TouchableOpacity>
          )}

          {/* Speaker Toggle */}
          <TouchableOpacity
            style={[
              styles.controlButton,
              isSpeakerEnabled && styles.controlButtonActive,
            ]}
            onPress={handleToggleSpeaker}
          >
            <MaterialIcons
              name={isSpeakerEnabled ? 'volume-up' : 'volume-down'}
              size={24}
              color="#FFF"
            />
          </TouchableOpacity>

          {/* End Call */}
          <TouchableOpacity
            style={[styles.controlButton, styles.endCallButton]}
            onPress={handleEndCall}
          >
            <MaterialIcons name="call-end" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  localVideoContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  localVideo: {
    flex: 1,
  },
  audioContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  avatarContainer: {
    marginBottom: 30,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  participantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  callInfoOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  channelName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  callStatus: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  qualityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  qualityText: {
    fontSize: 10,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '600',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  controlButtonActive: {
    backgroundColor: '#007AFF',
  },
  controlButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  endCallButton: {
    backgroundColor: '#FF3B30',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  videoPlaceholderText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 8,
  },
});
