/**
 * BC-W001_BaseWorkflowActions - Universal workflow actions component
 * Component Reference: BC-W001
 * 
 * Universal workflow component that provides consistent workflow functionality
 * across all models with dynamic actions and state management
 */

import React, { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

const { height: screenHeight } = Dimensions.get('window');

export interface WorkflowAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  description?: string;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void | Promise<void>;
}

export interface WorkflowStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  description?: string;
}

interface BaseWorkflowActionsProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  actions: WorkflowAction[];
  steps?: WorkflowStep[];
  currentState?: string;
  loading?: boolean;
  onStateChange?: (newState: string) => void;
}

/**
 * BC-W001: Universal Workflow Actions Component
 * 
 * Features:
 * - Dynamic workflow actions based on current state
 * - Visual workflow step progression
 * - Confirmation dialogs for destructive actions
 * - Loading states and error handling
 * - Responsive bottom sheet design
 * - Action grouping and organization
 */
export default function BaseWorkflowActions({
  visible,
  onClose,
  title = 'Workflow Actions',
  subtitle,
  actions,
  steps = [],
  currentState,
  loading = false,
  onStateChange,
}: BaseWorkflowActionsProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [executingAction, setExecutingAction] = useState<string | null>(null);

  // Snap points for the bottom sheet
  const snapPoints = useMemo(() => ['50%', '90%'], []);

  // Handle sheet changes
  const handleSheetChanges = useCallback((index: number) => {
    setIsFullScreen(index === 1);
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  // Open/close sheet based on visible prop
  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  // Handle action execution
  const handleActionPress = useCallback(async (action: WorkflowAction) => {
    if (action.disabled || executingAction) return;

    // Show confirmation if required
    if (action.requiresConfirmation) {
      Alert.alert(
        'Confirm Action',
        action.confirmationMessage || `Are you sure you want to ${action.label.toLowerCase()}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            style: action.color === '#FF3B30' ? 'destructive' : 'default',
            onPress: () => executeAction(action),
          },
        ]
      );
    } else {
      executeAction(action);
    }
  }, [executingAction]);

  // Execute the action
  const executeAction = useCallback(async (action: WorkflowAction) => {
    try {
      setExecutingAction(action.id);
      await action.onPress();
    } catch (error) {
      console.error('Workflow action failed:', error);
      Alert.alert('Error', 'Failed to execute action. Please try again.');
    } finally {
      setExecutingAction(null);
    }
  }, []);

  // Render workflow step
  const renderStep = useCallback((step: WorkflowStep, index: number) => {
    const getStepIcon = () => {
      switch (step.status) {
        case 'completed':
          return 'check-circle';
        case 'active':
          return 'radio-button-checked';
        case 'error':
          return 'error';
        default:
          return 'radio-button-unchecked';
      }
    };

    const getStepColor = () => {
      switch (step.status) {
        case 'completed':
          return '#34C759';
        case 'active':
          return '#007AFF';
        case 'error':
          return '#FF3B30';
        default:
          return '#C7C7CC';
      }
    };

    return (
      <View key={step.id} style={styles.stepContainer}>
        <View style={styles.stepIndicator}>
          <MaterialIcons
            name={getStepIcon() as any}
            size={24}
            color={getStepColor()}
          />
          {index < steps.length - 1 && (
            <View style={[
              styles.stepConnector,
              { backgroundColor: step.status === 'completed' ? '#34C759' : '#E5E5EA' }
            ]} />
          )}
        </View>
        <View style={styles.stepContent}>
          <Text style={[
            styles.stepLabel,
            { color: step.status === 'pending' ? '#8E8E93' : '#000000' }
          ]}>
            {step.label}
          </Text>
          {step.description && (
            <Text style={styles.stepDescription}>{step.description}</Text>
          )}
        </View>
      </View>
    );
  }, [steps.length]);

  // Render action button
  const renderAction = useCallback((action: WorkflowAction) => {
    const isExecuting = executingAction === action.id;
    const isDisabled = action.disabled || loading || isExecuting;

    return (
      <TouchableOpacity
        key={action.id}
        style={[
          styles.actionButton,
          { backgroundColor: action.color },
          isDisabled && styles.disabledAction
        ]}
        onPress={() => handleActionPress(action)}
        disabled={isDisabled}
      >
        <View style={styles.actionContent}>
          {isExecuting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <MaterialIcons name={action.icon as any} size={20} color="#FFFFFF" />
          )}
          <Text style={styles.actionLabel}>{action.label}</Text>
        </View>
        {action.description && (
          <Text style={styles.actionDescription}>{action.description}</Text>
        )}
      </TouchableOpacity>
    );
  }, [executingAction, loading, handleActionPress]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1} // Start closed
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={true}
      enableContentPanningGesture={!isFullScreen}
      activeOffsetY={isFullScreen ? [-1, 1] : undefined}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.bottomSheetHandle}
    >
      <BottomSheetView style={styles.bottomSheetContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            {currentState && (
              <Text style={styles.currentState}>Current: {currentState}</Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => bottomSheetRef.current?.close()}
            style={styles.closeButton}
          >
            <MaterialIcons name="close" size={24} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Workflow Steps */}
          {steps.length > 0 && (
            <View style={styles.stepsSection}>
              <Text style={styles.sectionTitle}>Workflow Progress</Text>
              {steps.map(renderStep)}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Available Actions</Text>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading actions...</Text>
              </View>
            ) : actions.length > 0 ? (
              <View style={styles.actionsList}>
                {actions.map(renderAction)}
              </View>
            ) : (
              <Text style={styles.noActionsText}>No actions available</Text>
            )}
          </View>
        </ScrollView>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomSheetHandle: {
    backgroundColor: '#C7C7CC',
  },
  bottomSheetContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  currentState: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  stepsSection: {
    marginBottom: 24,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepIndicator: {
    alignItems: 'center',
    marginRight: 12,
  },
  stepConnector: {
    width: 2,
    height: 20,
    marginTop: 4,
  },
  stepContent: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  stepDescription: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  actionsSection: {
    marginBottom: 16,
  },
  actionsList: {
    gap: 12,
  },
  actionButton: {
    borderRadius: 12,
    padding: 16,
  },
  disabledAction: {
    opacity: 0.5,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionDescription: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
  },
  noActionsText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 32,
  },
});
