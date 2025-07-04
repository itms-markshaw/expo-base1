/**
 * 987_ConflictResolution - Resolve data conflicts
 * Screen Number: 987
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { conflictResolutionService, SyncConflict } from '../../../services/conflictResolution';
import ScreenBadge from '../../../components/ScreenBadge';

interface DataConflict {
  id: string;
  modelName: string;
  recordId: number;
  fieldName: string;
  localValue: any;
  serverValue: any;
  localTimestamp: Date;
  serverTimestamp: Date;
  resolved: boolean;
  conflictFields?: string[];
}

export default function ConflictResolutionScreen() {
  const navigation = useNavigation();

  const [conflicts, setConflicts] = useState<DataConflict[]>([]);
  const [selectedConflicts, setSelectedConflicts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load real conflicts from service
  useEffect(() => {
    loadConflicts();
  }, []);

  const loadConflicts = async () => {
    try {
      setLoading(true);
      const realConflicts = await conflictResolutionService.getPendingConflicts();

      // LIMIT CONFLICTS: Only load first 50 to prevent UI freezing
      const limitedConflicts = realConflicts.slice(0, 50);

      // Convert service conflicts to UI format
      const uiConflicts: DataConflict[] = limitedConflicts.map(conflict => ({
        id: conflict.id,
        modelName: conflict.modelName,
        recordId: conflict.recordId,
        fieldName: conflict.conflictFields.length > 1
          ? `${conflict.conflictFields.length} fields`
          : conflict.conflictFields[0] || 'data',
        localValue: conflict.localData,
        serverValue: conflict.serverData,
        localTimestamp: new Date(conflict.timestamp),
        serverTimestamp: new Date(conflict.timestamp),
        resolved: conflict.status === 'resolved',
        conflictFields: conflict.conflictFields // Add this for detailed display
      }));

      setConflicts(uiConflicts);

      // Log if there are more conflicts than displayed
      if (realConflicts.length > 50) {
        console.log(`📊 Showing first 50 of ${realConflicts.length} total conflicts`);
      }
    } catch (error) {
      console.error('Failed to load conflicts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Clear false positive conflicts
  const clearFalsePositives = async () => {
    try {
      setLoading(true);
      const clearedCount = await conflictResolutionService.clearFalsePositiveConflicts();

      Alert.alert(
        'Conflicts Cleared',
        `Cleared ${clearedCount} false positive conflicts caused by data type mismatches.`,
        [{ text: 'OK' }]
      );

      // Reload conflicts to show updated list
      await loadConflicts();
    } catch (error) {
      console.error('Failed to clear false positives:', error);
      Alert.alert('Error', 'Failed to clear false positive conflicts');
    }
  };

  // Format model display name
  const formatModelName = (modelName: string): string => {
    return modelName
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  // Format field display name
  const formatFieldName = (fieldName: string): string => {
    return fieldName
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  // Format value for display
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '(empty)';
    }
    if (typeof value === 'string') {
      return value || '(empty)';
    }
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '(empty array)';
      }
      if (value.length <= 3) {
        return `[${value.join(', ')}]`;
      }
      return `Array with ${value.length} items: [${value.slice(0, 2).join(', ')}, ...]`;
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value);
      if (entries.length === 0) {
        return '(empty object)';
      }

      // Show key-value pairs in a readable format
      const formatted = entries.slice(0, 3).map(([key, val]) => {
        let formattedVal = val;
        if (typeof val === 'string' && val.length > 30) {
          formattedVal = val.substring(0, 30) + '...';
        } else if (typeof val === 'object' && val !== null) {
          formattedVal = Array.isArray(val) ? `[${val.length} items]` : '{object}';
        }
        return `${key}: ${formattedVal}`;
      }).join('\n');

      const hasMore = entries.length > 3;
      return formatted + (hasMore ? `\n... and ${entries.length - 3} more fields` : '');
    }
    return String(value);
  };

  // Resolve single conflict
  const resolveConflict = async (conflictId: string, resolution: 'local' | 'server') => {
    try {
      // Apply resolution using the service
      await conflictResolutionService.resolveConflict(conflictId, resolution);

      // Update UI state
      setConflicts(prev => prev.map(conflict =>
        conflict.id === conflictId
          ? { ...conflict, resolved: true }
          : conflict
      ));

      console.log(`✅ Resolved conflict ${conflictId} with ${resolution} value`);
    } catch (error) {
      console.error(`❌ Failed to resolve conflict ${conflictId}:`, error);
      Alert.alert('Resolution Failed', 'Failed to resolve conflict. Please try again.');
    }
  };

  // Batch resolve conflicts
  const batchResolve = async (resolution: 'local' | 'server') => {
    if (selectedConflicts.length === 0) {
      Alert.alert('No Selection', 'Please select conflicts to resolve');
      return;
    }

    Alert.alert(
      'Batch Resolution',
      `Resolve ${selectedConflicts.length} conflicts using ${resolution} values?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve',
          onPress: async () => {
            try {
              // Resolve each conflict using the service
              for (const conflictId of selectedConflicts) {
                await conflictResolutionService.resolveConflict(conflictId, resolution);
              }

              // Update UI state
              setConflicts(prev => prev.map(conflict =>
                selectedConflicts.includes(conflict.id)
                  ? { ...conflict, resolved: true }
                  : conflict
              ));
              setSelectedConflicts([]);

              console.log(`✅ Batch resolved ${selectedConflicts.length} conflicts`);
            } catch (error) {
              console.error('❌ Batch resolution failed:', error);
              Alert.alert('Batch Resolution Failed', 'Some conflicts could not be resolved. Please try again.');
            }
          }
        },
      ]
    );
  };

  // Toggle conflict selection
  const toggleConflictSelection = (conflictId: string) => {
    setSelectedConflicts(prev => 
      prev.includes(conflictId)
        ? prev.filter(id => id !== conflictId)
        : [...prev, conflictId]
    );
  };

  const unresolvedConflicts = conflicts.filter(c => !c.resolved);
  const resolvedCount = conflicts.length - unresolvedConflicts.length;

  const renderConflict = (conflict: DataConflict) => (
    <View key={conflict.id} style={styles.conflictCard}>
      {/* Header */}
      <View style={styles.conflictHeader}>
        <TouchableOpacity
          onPress={() => toggleConflictSelection(conflict.id)}
          style={styles.checkbox}
        >
          <MaterialIcons 
            name={selectedConflicts.includes(conflict.id) ? "check-box" : "check-box-outline-blank"} 
            size={24} 
            color={selectedConflicts.includes(conflict.id) ? "#2196F3" : "#666"} 
          />
        </TouchableOpacity>
        <View style={styles.conflictInfo}>
          <Text style={styles.conflictModel}>{formatModelName(conflict.modelName)}</Text>
          <Text style={styles.conflictField}>Record ID: {conflict.recordId}</Text>
          <Text style={styles.conflictField}>Field: {formatFieldName(conflict.fieldName)}</Text>
        </View>
        <MaterialIcons name="warning" size={24} color="#FF9800" />
      </View>

      {/* Conflicting Fields Details */}
      {conflict.conflictFields && conflict.conflictFields.length > 0 && (
        <View style={styles.fieldsContainer}>
          <Text style={styles.fieldsTitle}>Conflicting Fields:</Text>
          {conflict.conflictFields.map((fieldName, index) => {
            const localFieldValue = conflict.localValue?.[fieldName];
            const serverFieldValue = conflict.serverValue?.[fieldName];

            return (
              <View key={index} style={styles.fieldConflict}>
                <Text style={styles.fieldName}>{formatFieldName(fieldName)}</Text>
                <View style={styles.fieldValues}>
                  <View style={styles.fieldValueCard}>
                    <Text style={styles.fieldValueLabel}>Local:</Text>
                    <Text style={styles.fieldValueText}>{formatValue(localFieldValue)}</Text>
                  </View>
                  <View style={styles.fieldValueCard}>
                    <Text style={styles.fieldValueLabel}>Server:</Text>
                    <Text style={styles.fieldValueText}>{formatValue(serverFieldValue)}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Full Record Comparison (fallback) */}
      <View style={styles.valuesContainer}>
        {/* Local Value */}
        <View style={styles.valueCard}>
          <View style={styles.valueHeader}>
            <MaterialIcons name="phone-android" size={20} color="#4CAF50" />
            <Text style={styles.valueTitle}>Local (Your Device)</Text>
          </View>
          <Text style={styles.valueText}>{formatValue(conflict.localValue)}</Text>
          <Text style={styles.valueTimestamp}>
            Modified: {conflict.localTimestamp.toLocaleString()}
          </Text>
        </View>

        {/* Server Value */}
        <View style={styles.valueCard}>
          <View style={styles.valueHeader}>
            <MaterialIcons name="cloud" size={20} color="#2196F3" />
            <Text style={styles.valueTitle}>Server</Text>
          </View>
          <Text style={styles.valueText}>{formatValue(conflict.serverValue)}</Text>
          <Text style={styles.valueTimestamp}>
            Modified: {conflict.serverTimestamp.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Resolution Buttons */}
      <View style={styles.resolutionButtons}>
        <TouchableOpacity 
          style={[styles.resolutionButton, styles.keepLocalButton]}
          onPress={() => resolveConflict(conflict.id, 'local')}
        >
          <Text style={styles.keepLocalText}>Keep Mine</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.resolutionButton, styles.useServerButton]}
          onPress={() => resolveConflict(conflict.id, 'server')}
        >
          <Text style={styles.useServerText}>Use Server</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBadge screenNumber={987} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Resolve Conflicts</Text>
        <TouchableOpacity
          onPress={clearFalsePositives}
          style={styles.clearButton}
        >
          <MaterialIcons name="cleaning-services" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{unresolvedConflicts.length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{resolvedCount}</Text>
          <Text style={styles.statLabel}>Resolved</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{selectedConflicts.length}</Text>
          <Text style={styles.statLabel}>Selected</Text>
        </View>
      </View>

      {/* Batch Actions */}
      {selectedConflicts.length > 0 && (
        <View style={styles.batchActions}>
          <TouchableOpacity 
            style={styles.batchButton}
            onPress={() => batchResolve('local')}
          >
            <MaterialIcons name="phone-android" size={20} color="#4CAF50" />
            <Text style={styles.batchButtonText}>Keep Local ({selectedConflicts.length})</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.batchButton}
            onPress={() => batchResolve('server')}
          >
            <MaterialIcons name="cloud" size={20} color="#2196F3" />
            <Text style={styles.batchButtonText}>Use Server ({selectedConflicts.length})</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Conflicts List */}
      <ScrollView style={styles.conflictsList} showsVerticalScrollIndicator={false}>
        {unresolvedConflicts.length > 0 ? (
          unresolvedConflicts.map(renderConflict)
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="check-circle" size={64} color="#4CAF50" />
            <Text style={styles.emptyTitle}>All Conflicts Resolved!</Text>
            <Text style={styles.emptyDescription}>
              There are no pending data conflicts to resolve.
            </Text>
          </View>
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
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  batchActions: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  batchButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    gap: 8,
  },
  batchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  conflictsList: {
    flex: 1,
    padding: 16,
  },
  conflictCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    marginRight: 12,
  },
  conflictInfo: {
    flex: 1,
  },
  conflictModel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  conflictField: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  fieldsContainer: {
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  fieldsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  fieldConflict: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  fieldName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  fieldValues: {
    flexDirection: 'row',
    gap: 8,
  },
  fieldValueCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 6,
    padding: 8,
  },
  fieldValueLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  fieldValueText: {
    fontSize: 14,
    color: '#333',
  },
  valuesContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  valueCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  valueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  valueTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  valueText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  valueTimestamp: {
    fontSize: 12,
    color: '#666',
  },
  resolutionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  resolutionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  keepLocalButton: {
    backgroundColor: '#E8F5E8',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  useServerButton: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  keepLocalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  useServerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  clearButton: {
    padding: 4,
    borderRadius: 4,
  },
});
