/**
 * Workflow Actions Component
 * Provides one-tap business process automation for any Odoo record
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { odooWorkflowsService, WorkflowAction } from '../services/odooWorkflows';

interface WorkflowActionsProps {
  model: string;
  recordId: number;
  recordName?: string;
  onActionComplete?: () => void;
}

export default function WorkflowActionsComponent({ 
  model, 
  recordId, 
  recordName, 
  onActionComplete 
}: WorkflowActionsProps) {
  const [actions, setActions] = useState<WorkflowAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);
  
  // Confirmation modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<WorkflowAction | null>(null);
  const [confirmationReason, setConfirmationReason] = useState('');

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
      setSelectedAction(action);
      setShowConfirmModal(true);
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
      setShowConfirmModal(false);
      setConfirmationReason('');
    }
  };

  const handleConfirmAction = () => {
    if (selectedAction) {
      executeAction(selectedAction, confirmationReason);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading workflow actions...</Text>
      </View>
    );
  }

  if (actions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="settings" size={48} color="#C7C7CC" />
        <Text style={styles.emptyText}>No workflow actions available</Text>
        <Text style={styles.emptySubtext}>
          Actions will appear here based on the record's current state
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="settings" size={24} color="#007AFF" />
        <Text style={styles.title}>Workflow Actions</Text>
        <Text style={styles.subtitle}>{recordName || `${model}:${recordId}`}</Text>
      </View>

      <ScrollView style={styles.actionsContainer}>
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
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowConfirmModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Confirm Action</Text>
            <TouchableOpacity onPress={handleConfirmAction}>
              <Text style={styles.confirmButton}>Execute</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {selectedAction && (
              <>
                <View style={styles.actionPreview}>
                  <MaterialIcons 
                    name={getActionIcon(selectedAction.icon) as any} 
                    size={32} 
                    color={selectedAction.color} 
                  />
                  <Text style={styles.actionPreviewName}>{selectedAction.name}</Text>
                  <Text style={styles.actionPreviewDescription}>
                    {selectedAction.description}
                  </Text>
                </View>

                <View style={styles.warningBox}>
                  <MaterialIcons name="warning" size={24} color="#FF9500" />
                  <Text style={styles.warningText}>
                    This action will modify the record and cannot be undone. 
                    Please confirm you want to proceed.
                  </Text>
                </View>

                <Text style={styles.inputLabel}>Reason (optional):</Text>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Enter reason for this action..."
                  value={confirmationReason}
                  onChangeText={setConfirmationReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <View style={styles.recordInfo}>
                  <Text style={styles.recordInfoLabel}>Record:</Text>
                  <Text style={styles.recordInfoValue}>
                    {recordName || `${model}:${recordId}`}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 32,
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
  header: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  actionsContainer: {
    flex: 1,
    padding: 16,
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  confirmButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  actionPreview: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 16,
  },
  actionPreviewName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 12,
  },
  actionPreviewDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF5E6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#B8860B',
    marginLeft: 12,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  reasonInput: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  recordInfo: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  recordInfoLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  recordInfoValue: {
    fontSize: 14,
    color: '#1A1A1A',
    marginTop: 2,
  },
});
