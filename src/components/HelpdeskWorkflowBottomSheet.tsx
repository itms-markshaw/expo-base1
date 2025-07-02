/**
 * Helpdesk Workflow Bottom Sheet
 * Handles ticket status changes and workflow actions
 */

import React, { useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { authService } from '../services/auth';

interface WorkflowAction {
  id: number;
  name: string;
  sequence?: number;
}

interface HelpdeskWorkflowBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  ticketId: number;
  currentStageId?: number;
  workflowActions: WorkflowAction[];
  onActionComplete: () => void;
}

export default function HelpdeskWorkflowBottomSheet({
  visible,
  onClose,
  ticketId,
  currentStageId,
  workflowActions,
  onActionComplete,
}: HelpdeskWorkflowBottomSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '90%'], []);

  // Handle sheet changes
  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  // Handle stage change
  const handleStageChange = async (stageId: number, stageName: string) => {
    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      await client.write('helpdesk.ticket', [ticketId], {
        stage_id: stageId,
      });

      Alert.alert('Success', `Ticket moved to ${stageName}`);
      onActionComplete();
      onClose();
    } catch (error) {
      console.error('Failed to update ticket stage:', error);
      Alert.alert('Error', 'Failed to update ticket status');
    }
  };

  // Open/close sheet based on visible prop
  React.useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  const renderStageOption = (stage: WorkflowAction) => {
    const isCurrentStage = stage.id === currentStageId;
    
    return (
      <TouchableOpacity
        key={stage.id}
        style={[
          styles.stageOption,
          isCurrentStage && styles.currentStageOption
        ]}
        onPress={() => handleStageChange(stage.id, stage.name)}
        disabled={isCurrentStage}
      >
        <View style={styles.stageOptionContent}>
          <MaterialIcons 
            name={isCurrentStage ? "check-circle" : "radio-button-unchecked"} 
            size={24} 
            color={isCurrentStage ? "#34C759" : "#666"} 
          />
          <Text style={[
            styles.stageOptionText,
            isCurrentStage && styles.currentStageOptionText
          ]}>
            {stage.name}
          </Text>
        </View>
        {isCurrentStage && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Current</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={true}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.bottomSheetHandle}
    >
      <BottomSheetView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Change Status</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <BottomSheetScrollView style={styles.content}>
          <Text style={styles.sectionTitle}>Select New Status</Text>
          
          {workflowActions.map(renderStageOption)}
          
          {workflowActions.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="info-outline" size={48} color="#C7C7CC" />
              <Text style={styles.emptyStateText}>No workflow actions available</Text>
            </View>
          )}
        </BottomSheetScrollView>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomSheetHandle: {
    backgroundColor: '#C7C7CC',
    width: 40,
    height: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 20,
    marginBottom: 16,
  },
  stageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 8,
  },
  currentStageOption: {
    backgroundColor: '#E8F5E8',
    borderWidth: 1,
    borderColor: '#34C759',
  },
  stageOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stageOptionText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
  },
  currentStageOptionText: {
    color: '#34C759',
    fontWeight: '500',
  },
  currentBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
});
