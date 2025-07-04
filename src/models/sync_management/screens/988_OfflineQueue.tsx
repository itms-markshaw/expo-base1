/**
 * 988_OfflineQueue - View and manage queued operations
 * Screen Number: 988
 * Model: sync.management
 * Type: detail
 *
 * PRESERVED: All original sync functionality
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
import { offlineQueueService, QueuedOperation } from '../../../services/offlineQueue';
import ScreenBadge from '../../../components/ScreenBadge';

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

  const clearAll = () => {
    Alert.alert(
      'Clear All Operations',
      'Are you sure you want to clear all operations from the queue? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await offlineQueueService.clearAll();
              await loadOperations();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear operations');
            }
          }
        }
      ]
    );
  };

  const processQueue = async () => {
    try {
      const result = await offlineQueueService.processQueue();
      await loadOperations();

      if (result.success) {
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Error', result.message);
      }
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

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBadge screenNumber={988} />
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

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          {operations.length === 0
            ? 'No queued operations'
            : `${pendingOps.length} pending • ${failedOps.length} failed • ${operations.length} total`
          }
        </Text>
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
          style={[styles.actionButton, { backgroundColor: '#FF5722' }]}
          onPress={clearAll}
        >
          <MaterialIcons name="delete-sweep" size={20} color="white" />
          <Text style={styles.actionButtonText}>Clear All</Text>
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
  summaryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
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
