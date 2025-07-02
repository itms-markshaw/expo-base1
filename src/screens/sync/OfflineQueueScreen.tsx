/**
 * Offline Queue Management Screen - View and manage queued operations
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { offlineQueueService, QueuedOperation } from '../../services/offlineQueue';

export default function OfflineQueueScreen() {
  const navigation = useNavigation();
  
  const [operations, setOperations] = useState<QueuedOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOperations();
  }, []);

  const loadOperations = async () => {
    try {
      setLoading(true);
      await offlineQueueService.initialize();

      // Get all operations from the service
      const allOps = offlineQueueService.getAllOperations();
      setOperations(allOps);
    } catch (error) {
      console.error('Failed to load queue operations:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOperations();
    setRefreshing(false);
  };

  const retryOperation = async (operationId: string) => {
    try {
      await offlineQueueService.retryOperation(operationId);
      await loadOperations(); // Refresh list
      Alert.alert('Success', 'Operation queued for retry');
    } catch (error) {
      Alert.alert('Error', 'Failed to retry operation');
    }
  };

  const clearCompleted = async () => {
    Alert.alert(
      'Clear Completed',
      'Remove all completed operations from the queue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          onPress: async () => {
            try {
              await offlineQueueService.clearCompleted();
              await loadOperations();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear completed operations');
            }
          }
        }
      ]
    );
  };

  const processQueue = async () => {
    try {
      await offlineQueueService.processQueue();
      await loadOperations();
      Alert.alert('Success', 'Queue processing completed');
    } catch (error) {
      Alert.alert('Error', 'Failed to process queue');
    }
  };

  const formatModelName = (modelName: string): string => {
    return modelName
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return '#2196F3';
      case 'processing': return '#FF9800';
      case 'completed': return '#4CAF50';
      case 'failed': return '#F44336';
      default: return '#666';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'pending': return 'schedule';
      case 'processing': return 'sync';
      case 'completed': return 'check-circle';
      case 'failed': return 'error';
      default: return 'help';
    }
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'create': return 'add';
      case 'update': return 'edit';
      case 'delete': return 'delete';
      case 'sync': return 'sync';
      default: return 'storage';
    }
  };

  const pendingOps = operations.filter(op => op.status === 'pending');
  const failedOps = operations.filter(op => op.status === 'failed');
  const completedOps = operations.filter(op => op.status === 'completed');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Offline Queue</Text>
        <TouchableOpacity onPress={onRefresh}>
          <MaterialIcons name="refresh" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{pendingOps.length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#F44336' }]}>{failedOps.length}</Text>
          <Text style={styles.statLabel}>Failed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#4CAF50' }]}>{completedOps.length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
          onPress={processQueue}
          disabled={pendingOps.length === 0}
        >
          <MaterialIcons name="play-arrow" size={20} color="white" />
          <Text style={styles.actionButtonText}>Process Queue</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
          onPress={clearCompleted}
          disabled={completedOps.length === 0}
        >
          <MaterialIcons name="clear-all" size={20} color="white" />
          <Text style={styles.actionButtonText}>Clear Completed</Text>
        </TouchableOpacity>
      </View>

      {/* Operations List */}
      <ScrollView 
        style={styles.operationsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {operations.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="inbox" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>No queued operations</Text>
          </View>
        ) : (
          operations.map((operation) => (
            <View key={operation.id} style={styles.operationCard}>
              <View style={styles.operationHeader}>
                <View style={styles.operationInfo}>
                  <MaterialIcons 
                    name={getTypeIcon(operation.type)} 
                    size={20} 
                    color="#666" 
                  />
                  <Text style={styles.operationType}>{operation.type.toUpperCase()}</Text>
                  <Text style={styles.operationModel}>
                    {formatModelName(operation.modelName)}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(operation.status) }]}>
                  <MaterialIcons 
                    name={getStatusIcon(operation.status)} 
                    size={16} 
                    color="white" 
                  />
                  <Text style={styles.statusText}>{operation.status}</Text>
                </View>
              </View>
              
              <View style={styles.operationDetails}>
                <Text style={styles.operationTimestamp}>
                  {formatTimestamp(operation.timestamp)}
                </Text>
                {operation.recordId && (
                  <Text style={styles.operationRecord}>ID: {operation.recordId}</Text>
                )}
                {operation.retryCount > 0 && (
                  <Text style={styles.operationRetries}>
                    Retries: {operation.retryCount}/{operation.maxRetries}
                  </Text>
                )}
              </View>

              {operation.error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{operation.error}</Text>
                </View>
              )}

              {operation.status === 'failed' && (
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={() => retryOperation(operation.id)}
                >
                  <MaterialIcons name="refresh" size={16} color="#2196F3" />
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  operationsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  operationCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  operationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  operationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  operationType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  operationModel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  operationDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  operationTimestamp: {
    fontSize: 12,
    color: '#666',
  },
  operationRecord: {
    fontSize: 12,
    color: '#666',
  },
  operationRetries: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
  },
  errorContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#ffebee',
    borderRadius: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#d32f2f',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#2196F3',
    gap: 4,
  },
  retryButtonText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
});
