/**
 * BC-C009_OfflineChatManager - Offline Chat Queue Management
 * Component Reference: BC-C009
 * 
 * Universal component for managing offline chat operations:
 * - Shows offline status and pending sync count
 * - Provides retry functionality for failed messages
 * - Displays connection status indicators
 * - Handles offline queue management
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { offlineMessageService } from '../../mail_message/services/OfflineMessageService';

export interface OfflineChatManagerProps {
  visible: boolean;
  onRetryAll: () => void;
  onDismiss: () => void;
  connectionStatus?: 'online' | 'offline' | 'syncing';
  style?: any;
}

export interface OfflineStats {
  totalMessages: number;
  pendingSync: number;
  failedSync: number;
  isConnected: boolean;
  lastSyncTime?: number;
}

/**
 * BC-C009: Offline Chat Manager
 * 
 * Features:
 * - Real-time offline status monitoring
 * - Pending message count display
 * - Retry failed messages functionality
 * - Connection status indicators
 * - Smooth animations and transitions
 * - Compact design for minimal UI impact
 */
export default function OfflineChatManager({
  visible,
  onRetryAll,
  onDismiss,
  connectionStatus = 'online',
  style
}: OfflineChatManagerProps) {
  const [offlineStats, setOfflineStats] = useState<OfflineStats>({
    totalMessages: 0,
    pendingSync: 0,
    failedSync: 0,
    isConnected: true
  });
  const [isRetrying, setIsRetrying] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Update offline statistics
  const updateOfflineStats = useCallback(async () => {
    try {
      const stats = await offlineMessageService.getStats();
      setOfflineStats(prev => ({
        ...prev,
        totalMessages: stats.totalMessages,
        pendingSync: stats.pendingSync,
        failedSync: stats.failedSync,
        isConnected: connectionStatus === 'online'
      }));
    } catch (error) {
      console.error('Failed to update offline stats:', error);
    }
  }, [connectionStatus]);

  // Initialize and setup periodic updates
  useEffect(() => {
    updateOfflineStats();
    
    const interval = setInterval(updateOfflineStats, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [updateOfflineStats]);

  // Animate visibility
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, fadeAnim]);

  // Handle retry all messages
  const handleRetryAll = async () => {
    if (isRetrying) return;

    try {
      setIsRetrying(true);
      await onRetryAll();
      await updateOfflineStats();
      
      // Show success feedback
      Alert.alert(
        'Sync Complete',
        'All pending messages have been processed.',
        [{ text: 'OK', onPress: onDismiss }]
      );
    } catch (error) {
      console.error('Failed to retry messages:', error);
      Alert.alert(
        'Sync Failed',
        'Some messages could not be synced. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsRetrying(false);
    }
  };

  // Get status color based on connection and sync state
  const getStatusColor = (): string => {
    if (!offlineStats.isConnected) return '#FF3B30'; // Red for offline
    if (offlineStats.failedSync > 0) return '#FF9500'; // Orange for failed
    if (offlineStats.pendingSync > 0) return '#007AFF'; // Blue for pending
    return '#34C759'; // Green for all synced
  };

  // Get status icon
  const getStatusIcon = (): string => {
    if (!offlineStats.isConnected) return 'cloud-off';
    if (isRetrying) return 'sync';
    if (offlineStats.failedSync > 0) return 'error';
    if (offlineStats.pendingSync > 0) return 'cloud-upload';
    return 'cloud-done';
  };

  // Get status text
  const getStatusText = (): string => {
    if (!offlineStats.isConnected) {
      const totalPending = offlineStats.pendingSync + offlineStats.failedSync;
      return `Offline - ${totalPending} messages queued`;
    }
    
    if (isRetrying) return 'Syncing messages...';
    
    if (offlineStats.failedSync > 0) {
      return `${offlineStats.failedSync} messages failed to sync`;
    }
    
    if (offlineStats.pendingSync > 0) {
      return `${offlineStats.pendingSync} messages pending sync`;
    }
    
    return 'All messages synced';
  };

  // Don't show if no pending/failed messages and connected
  const shouldShow = visible && (
    !offlineStats.isConnected || 
    offlineStats.pendingSync > 0 || 
    offlineStats.failedSync > 0
  );

  if (!shouldShow) return null;

  return (
    <Animated.View 
      style={[
        styles.container,
        { opacity: fadeAnim },
        style
      ]}
    >
      <View style={[styles.statusBar, { backgroundColor: getStatusColor() + '20' }]}>
        {/* Status Icon */}
        <View style={styles.iconContainer}>
          <MaterialIcons 
            name={getStatusIcon()} 
            size={16} 
            color={getStatusColor()}
            style={isRetrying ? styles.spinningIcon : undefined}
          />
        </View>

        {/* Status Text */}
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {(offlineStats.pendingSync > 0 || offlineStats.failedSync > 0) && (
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: getStatusColor() }]} 
              onPress={handleRetryAll}
              disabled={isRetrying}
            >
              <Text style={styles.retryText}>
                {isRetrying ? 'Syncing...' : 'Retry All'}
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
            <MaterialIcons name="close" size={16} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Detailed Stats (Optional) */}
      {offlineStats.totalMessages > 0 && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            Total: {offlineStats.totalMessages} messages
          </Text>
          {offlineStats.lastSyncTime && (
            <Text style={styles.statsText}>
              Last sync: {new Date(offlineStats.lastSyncTime).toLocaleTimeString()}
            </Text>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  iconContainer: {
    width: 20,
    alignItems: 'center',
  },
  spinningIcon: {
    // Add rotation animation if needed
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  retryText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
  },
  dismissButton: {
    padding: 4,
    borderRadius: 4,
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  statsText: {
    fontSize: 11,
    color: '#666',
    lineHeight: 14,
  },
});

// Export for BC component registry
export const BC_C009_OfflineChatManager = OfflineChatManager;
