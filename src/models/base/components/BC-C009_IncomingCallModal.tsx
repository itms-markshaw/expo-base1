/**
 * Incoming Call Modal - Shows incoming call interface
 * BC-C009: Full-screen modal for incoming audio/video calls
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { callService, CallOffer } from '../services/BC-S010_CallService';

interface IncomingCallModalProps {
  visible: boolean;
  callOffer: CallOffer | null;
  onAnswer: () => void;
  onDecline: () => void;
  onClose: () => void;
}

export default function IncomingCallModal({
  visible,
  callOffer,
  onAnswer,
  onDecline,
  onClose,
}: IncomingCallModalProps) {
  const [pulseAnimation] = useState(new Animated.Value(1));
  const [slideAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible && callOffer) {
      // Start vibration pattern for incoming call
      if (Platform.OS === 'ios') {
        // iOS vibration pattern
        const vibrationPattern = [0, 1000, 1000, 1000, 1000, 1000];
        Vibration.vibrate(vibrationPattern, true);
      } else {
        // Android vibration pattern
        Vibration.vibrate([0, 1000, 1000, 1000], true);
      }

      // Start animations
      startPulseAnimation();
      startSlideAnimation();

      // Auto-decline after 30 seconds
      const timeout = setTimeout(() => {
        handleDecline();
      }, 30000);

      return () => {
        Vibration.cancel();
        clearTimeout(timeout);
      };
    } else {
      Vibration.cancel();
    }
  }, [visible, callOffer]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startSlideAnimation = () => {
    Animated.timing(slideAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleAnswer = async () => {
    try {
      Vibration.cancel();
      
      if (callOffer) {
        const success = await callService.answerCall(callOffer);
        if (success) {
          onAnswer();
        } else {
          onClose();
        }
      }
    } catch (error) {
      console.error('Failed to answer call:', error);
      onClose();
    }
  };

  const handleDecline = () => {
    Vibration.cancel();
    onDecline();
  };

  if (!visible || !callOffer) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <Animated.View
        style={[
          styles.container,
          {
            transform: [
              {
                translateY: slideAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* Background */}
        <View style={styles.background} />

        {/* Call Info */}
        <View style={styles.callInfo}>
          <Animated.View
            style={[
              styles.avatarContainer,
              {
                transform: [{ scale: pulseAnimation }],
              },
            ]}
          >
            <View style={styles.avatar}>
              <MaterialIcons name="person" size={60} color="#FFF" />
            </View>
          </Animated.View>

          <Text style={styles.callerName}>{callOffer.fromUserName}</Text>
          <Text style={styles.callType}>
            {callOffer.isVideo ? '📹 Video Call' : '📞 Voice Call'}
          </Text>
          <Text style={styles.callStatus}>Incoming call...</Text>
        </View>

        {/* Call Actions */}
        <View style={styles.actionsContainer}>
          {/* Decline Button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={handleDecline}
            activeOpacity={0.8}
          >
            <MaterialIcons name="call-end" size={32} color="#FFF" />
          </TouchableOpacity>

          {/* Answer Button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.answerButton]}
            onPress={handleAnswer}
            activeOpacity={0.8}
          >
            <MaterialIcons name="call" size={32} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Additional Actions */}
        <View style={styles.additionalActions}>
          <TouchableOpacity style={styles.additionalButton}>
            <MaterialIcons name="message" size={24} color="#FFF" />
            <Text style={styles.additionalButtonText}>Message</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.additionalButton}>
            <MaterialIcons name="schedule" size={24} color="#FFF" />
            <Text style={styles.additionalButtonText}>Remind Me</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 100,
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a1a1a',
  },
  callInfo: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  avatarContainer: {
    marginBottom: 30,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  callerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  callType: {
    fontSize: 18,
    color: '#FFF',
    marginBottom: 4,
    textAlign: 'center',
  },
  callStatus: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    marginBottom: 40,
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  declineButton: {
    backgroundColor: '#FF3B30',
  },
  answerButton: {
    backgroundColor: '#34C759',
  },
  additionalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  additionalButton: {
    alignItems: 'center',
    padding: 10,
  },
  additionalButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 4,
  },
});
