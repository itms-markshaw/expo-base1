/**
 * Workflow Actions Component
 * Provides one-tap business process automation for any Odoo record
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { odooWorkflowsService, WorkflowAction } from '../services/odooWorkflows';

interface WorkflowActionsProps {
  visible: boolean;
  onClose: () => void;
  model: string;
  recordId: number;
  recordName?: string;
  onActionComplete?: () => void;
}

export default function WorkflowActionsComponent({
  visible,
  onClose,
  model,
  recordId,
  recordName,
  onActionComplete
}: WorkflowActionsProps) {
  const [actions, setActions] = useState<WorkflowAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);



  // Bottom sheet refs and snap points
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '80%'], []); // Start at 50%, expand to 80%

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.snapToIndex(0); // Open to first snap point (50%)
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  // Bottom sheet callbacks
  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    loadWorkflowActions();
  }, [model, recordId]);

  const loadWorkflowActions = async () => {
    setLoading(true);
    try {
      const availableActions = await odooWorkflowsService.getWorkflowActions(model, recordId);
      setActions(availableActions);
    } catch (error) {
      console.error('Failed to load workflow actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActionPress = (action: WorkflowAction) => {
    if (action.requires_confirmation) {
      Alert.alert(
        'Confirm Action',
        `Are you sure you want to execute "${action.name}"?\n\nThis action will modify the record and cannot be undone.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Execute',
            style: 'destructive',
            onPress: () => executeAction(action),
          },
        ]
      );
    } else {
      executeAction(action);
    }
  };

  const executeAction = async (action: WorkflowAction, reason?: string) => {
    setExecuting(action.id);
    try {
      const params = reason ? { reason } : {};
      const success = await odooWorkflowsService.executeWorkflowAction(action, recordId, params);

      if (success) {
        Alert.alert(
          'Success',
          `${action.name} completed successfully`,
          [{ text: 'OK', onPress: () => {
            onActionComplete?.();
            loadWorkflowActions(); // Reload to get updated actions
          }}]
        );
      } else {
        Alert.alert('Error', `Failed to execute ${action.name}`);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to execute ${action.name}: ${error.message}`);
    } finally {
      setExecuting(null);
    }
  };



  const getActionIcon = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
      'trending-up': 'trending-up',
      'check-circle': 'check-circle',
      'cancel': 'cancel',
      'event': 'event',
      'check': 'check',
      'local-shipping': 'local-shipping',
      'receipt': 'receipt',
      'access-time': 'access-time',
    };
    return iconMap[iconName] || 'settings';
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1} // Start closed
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={true}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.bottomSheetHandle}
    >
      <BottomSheetView style={styles.bottomSheetContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Workflow Actions</Text>
          <TouchableOpacity
            onPress={() => bottomSheetRef.current?.close()}
            style={styles.closeButton}
          >
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <BottomSheetScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading workflow actions...</Text>
            </View>
          )}

          {!loading && actions.length === 0 && (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="settings" size={48} color="#C7C7CC" />
              <Text style={styles.emptyText}>No workflow actions available</Text>
              <Text style={styles.emptySubtext}>
                Actions will appear here based on the record's current state
              </Text>
            </View>
          )}

          {!loading && actions.length > 0 && (
            <View style={styles.actionsContainer}>
              <Text style={styles.subtitle}>{recordName || `${model}:${recordId}`}</Text>

              {actions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={[
                    styles.actionCard,
                    { borderLeftColor: action.color }
                  ]}
                  onPress={() => handleActionPress(action)}
                  disabled={executing === action.id}
                >
                  <View style={styles.actionHeader}>
                    <View style={styles.actionIconContainer}>
                      <MaterialIcons
                        name={getActionIcon(action.icon) as any}
                        size={24}
                        color={action.color}
                      />
                    </View>
                    <View style={styles.actionInfo}>
                      <Text style={styles.actionName}>{action.name}</Text>
                      <Text style={styles.actionDescription}>{action.description}</Text>
                    </View>
                    <View style={styles.actionStatus}>
                      {executing === action.id ? (
                        <ActivityIndicator size="small" color={action.color} />
                      ) : (
                        <MaterialIcons
                          name={action.requires_confirmation ? "warning" : "play-arrow"}
                          size={20}
                          color={action.requires_confirmation ? "#FF9500" : "#34C759"}
                        />
                      )}
                    </View>
                  </View>

                  {action.requires_confirmation && (
                    <View style={styles.confirmationBadge}>
                      <MaterialIcons name="warning" size={16} color="#FF9500" />
                      <Text style={styles.confirmationText}>Requires confirmation</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </BottomSheetScrollView>

      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomSheetHandle: {
    backgroundColor: '#C7C7CC',
    width: 40,
    height: 4,
  },
  bottomSheetContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    marginBottom: 16,
  },
  actionsContainer: {
    paddingTop: 8,
  },
  actionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionInfo: {
    flex: 1,
  },
  actionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  actionDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    lineHeight: 18,
  },
  actionStatus: {
    marginLeft: 8,
  },
  confirmationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  confirmationText: {
    fontSize: 12,
    color: '#FF9500',
    marginLeft: 4,
    fontWeight: '600',
  },
});
