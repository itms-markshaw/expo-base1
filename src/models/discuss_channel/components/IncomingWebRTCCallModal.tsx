/**
 * Incoming WebRTC Call Modal - Shows incoming video/audio call interface
 * Component for handling incoming WebRTC calls with proper UI
 */

import React from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
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
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.8)" />
      <View style={styles.overlay}>
        <View style={styles.callCard}>
          {/* Call Type Icon */}
          <View style={styles.avatarContainer}>
            <MaterialIcons 
              name={call.callType === 'video' ? 'videocam' : 'phone'} 
              size={60} 
              color="#007AFF" 
            />
          </View>
          
          {/* Caller Info */}
          <Text style={styles.callerName}>{call.callerName}</Text>
          <Text style={styles.callType}>
            Incoming {call.callType} call
          </Text>
          
          {/* Call Actions */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.button, styles.declineButton]}
              onPress={onDecline}
              activeOpacity={0.8}
            >
              <MaterialIcons name="call-end" size={32} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.acceptButton]}
              onPress={onAccept}
              activeOpacity={0.8}
            >
              <MaterialIcons 
                name={call.callType === 'video' ? 'videocam' : 'call'} 
                size={32} 
                color="white" 
              />
            </TouchableOpacity>
          </View>

          {/* Additional Info */}
          <Text style={styles.additionalInfo}>
            Channel: {call.channelId}
          </Text>
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#007AFF',
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
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 40,
    marginBottom: 20,
  },
  button: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  declineButton: {
    backgroundColor: '#FF3B30',
  },
  additionalInfo: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default IncomingWebRTCCallModal;
