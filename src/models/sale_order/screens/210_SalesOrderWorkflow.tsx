/**
 * 210_SalesOrderWorkflow - Advanced workflow actions for sales orders
 * Screen Number: 210
 * Model: sale.order
 * Type: workflow
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
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { salesOrderService } from '../services/SalesOrderService';
import { SalesOrder } from '../types/SalesOrder';
import ScreenBadge from '../../../components/ScreenBadge';

interface WorkflowAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  enabled: boolean;
  requiresConfirmation: boolean;
  confirmationMessage?: string;
}

interface SalesOrderWorkflowProps {
  orderId: number;
  onBack?: () => void;
  onActionComplete?: (action: string) => void;
}

export default function SalesOrderWorkflow({
  orderId,
  onBack,
  onActionComplete,
}: SalesOrderWorkflowProps) {
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<WorkflowAction | null>(null);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const orderData = await salesOrderService.getSalesOrderDetail(orderId);
      setOrder(orderData);
    } catch (error) {
      console.error('Failed to load sales order:', error);
      Alert.alert('Error', 'Failed to load sales order details');
    } finally {
      setLoading(false);
    }
  };

  const getWorkflowActions = (): WorkflowAction[] => {
    if (!order) return [];

    const actions: WorkflowAction[] = [];

    // State-specific actions
    switch (order.state) {
      case 'draft':
        actions.push(
          {
            id: 'send_quote',
            title: 'Send Quotation',
            description: 'Send quotation to customer via email',
            icon: 'email',
            color: '#007AFF',
            enabled: true,
            requiresConfirmation: true,
            confirmationMessage: 'Send quotation to customer?',
          },
          {
            id: 'confirm_order',
            title: 'Confirm Order',
            description: 'Confirm order and create delivery',
            icon: 'check-circle',
            color: '#34C759',
            enabled: true,
            requiresConfirmation: true,
            confirmationMessage: 'Confirm this sales order?',
          }
        );
        break;

      case 'sent':
        actions.push(
          {
            id: 'confirm_order',
            title: 'Confirm Order',
            description: 'Confirm order and create delivery',
            icon: 'check-circle',
            color: '#34C759',
            enabled: true,
            requiresConfirmation: true,
            confirmationMessage: 'Confirm this sales order?',
          },
          {
            id: 'cancel_order',
            title: 'Cancel Order',
            description: 'Cancel this sales order',
            icon: 'cancel',
            color: '#FF3B30',
            enabled: true,
            requiresConfirmation: true,
            confirmationMessage: 'Are you sure you want to cancel this order?',
          }
        );
        break;

      case 'sale':
        actions.push(
          {
            id: 'create_invoice',
            title: 'Create Invoice',
            description: 'Generate invoice for this order',
            icon: 'receipt',
            color: '#FF9500',
            enabled: order.invoice_status !== 'invoiced',
            requiresConfirmation: true,
            confirmationMessage: 'Create invoice for this order?',
          },
          {
            id: 'create_delivery',
            title: 'Create Delivery',
            description: 'Create delivery order',
            icon: 'local-shipping',
            color: '#5856D6',
            enabled: order.delivery_status !== 'full',
            requiresConfirmation: false,
          }
        );
        break;
    }

    // Universal actions (available in most states)
    if (order.state !== 'cancel' && order.state !== 'done') {
      actions.push(
        {
          id: 'duplicate_order',
          title: 'Duplicate Order',
          description: 'Create a copy of this order',
          icon: 'content-copy',
          color: '#8E8E93',
          enabled: true,
          requiresConfirmation: true,
          confirmationMessage: 'Create a duplicate of this order?',
        },
        {
          id: 'print_order',
          title: 'Print Order',
          description: 'Print or export order document',
          icon: 'print',
          color: '#666',
          enabled: true,
          requiresConfirmation: false,
        }
      );
    }

    // Advanced actions
    actions.push(
      {
        id: 'update_prices',
        title: 'Update Prices',
        description: 'Recalculate prices from pricelist',
        icon: 'refresh',
        color: '#007AFF',
        enabled: order.state === 'draft' || order.state === 'sent',
        requiresConfirmation: true,
        confirmationMessage: 'Update all line prices from current pricelist?',
      },
      {
        id: 'add_discount',
        title: 'Apply Discount',
        description: 'Apply global discount to order',
        icon: 'local-offer',
        color: '#34C759',
        enabled: order.state === 'draft' || order.state === 'sent',
        requiresConfirmation: false,
      }
    );

    return actions;
  };

  const handleActionPress = (action: WorkflowAction) => {
    if (!action.enabled) return;

    if (action.requiresConfirmation) {
      setPendingAction(action);
      setShowConfirmModal(true);
    } else {
      executeAction(action);
    }
  };

  const executeAction = async (action: WorkflowAction) => {
    setProcessingAction(action.id);
    setShowConfirmModal(false);
    setPendingAction(null);

    try {
      let result = false;

      switch (action.id) {
        case 'send_quote':
          result = await salesOrderService.sendQuotation(orderId);
          break;
        case 'confirm_order':
          result = await salesOrderService.confirmOrder(orderId);
          break;
        case 'cancel_order':
          result = await salesOrderService.cancelOrder(orderId);
          break;
        case 'create_invoice':
          result = await salesOrderService.createInvoice(orderId);
          break;
        case 'create_delivery':
          result = await salesOrderService.createDelivery(orderId);
          break;
        case 'duplicate_order':
          result = await salesOrderService.duplicateOrder(orderId);
          break;
        case 'print_order':
          result = await salesOrderService.printOrder(orderId);
          break;
        case 'update_prices':
          result = await salesOrderService.updatePrices(orderId);
          break;
        case 'add_discount':
          // This would open a discount modal
          Alert.alert('Feature Coming Soon', 'Discount application will be available soon');
          result = true;
          break;
        default:
          Alert.alert('Error', 'Unknown action');
          result = false;
      }

      if (result) {
        Alert.alert('Success', `${action.title} completed successfully`);
        await loadOrder(); // Reload to get updated state
        onActionComplete?.(action.id);
      } else {
        Alert.alert('Error', `Failed to ${action.title.toLowerCase()}`);
      }
    } catch (error) {
      console.error(`Failed to execute action ${action.id}:`, error);
      Alert.alert('Error', `Failed to ${action.title.toLowerCase()}`);
    } finally {
      setProcessingAction(null);
    }
  };

  const renderWorkflowAction = (action: WorkflowAction) => {
    const isProcessing = processingAction === action.id;
    const isDisabled = !action.enabled || isProcessing;

    return (
      <TouchableOpacity
        key={action.id}
        style={[
          styles.actionCard,
          isDisabled && styles.actionCardDisabled,
        ]}
        onPress={() => handleActionPress(action)}
        disabled={isDisabled}
      >
        <View style={styles.actionIcon}>
          <MaterialIcons
            name={isProcessing ? 'hourglass-empty' : action.icon}
            size={24}
            color={isDisabled ? '#C7C7CC' : action.color}
          />
        </View>
        
        <View style={styles.actionContent}>
          <Text style={[styles.actionTitle, isDisabled && styles.actionTitleDisabled]}>
            {action.title}
          </Text>
          <Text style={[styles.actionDescription, isDisabled && styles.actionDescriptionDisabled]}>
            {isProcessing ? 'Processing...' : action.description}
          </Text>
        </View>
        
        <View style={styles.actionArrow}>
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={isDisabled ? '#C7C7CC' : '#8E8E93'}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {order?.name || 'Sales Order'} - Workflow
          </Text>
          <Text style={styles.headerSubtitle}>
            Available actions for {order?.state?.toUpperCase() || 'UNKNOWN'} state
          </Text>
        </View>
      </View>
    </View>
  );

  const renderOrderStatus = () => {
    if (!order) return null;

    const getStatusColor = (state: string) => {
      switch (state) {
        case 'draft': return '#8E8E93';
        case 'sent': return '#007AFF';
        case 'sale': return '#34C759';
        case 'done': return '#5856D6';
        case 'cancel': return '#FF3B30';
        default: return '#8E8E93';
      }
    };

    return (
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusTitle}>Current Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.state) + '15' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(order.state) }]}>
              {order.state.toUpperCase()}
            </Text>
          </View>
        </View>
        
        <View style={styles.statusDetails}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Invoice Status:</Text>
            <Text style={styles.statusValue}>{order.invoice_status.replace('_', ' ').toUpperCase()}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Delivery Status:</Text>
            <Text style={styles.statusValue}>{order.delivery_status.toUpperCase()}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading workflow actions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const workflowActions = getWorkflowActions();

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView style={styles.scrollView}>
        {renderOrderStatus()}
        
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Available Actions</Text>
          {workflowActions.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="check-circle" size={64} color="#C7C7CC" />
              <Text style={styles.emptyTitle}>No actions available</Text>
              <Text style={styles.emptySubtext}>
                This order is in a final state with no available workflow actions
              </Text>
            </View>
          ) : (
            workflowActions.map(renderWorkflowAction)
          )}
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{pendingAction?.title}</Text>
            <Text style={styles.modalMessage}>
              {pendingAction?.confirmationMessage || 'Are you sure you want to proceed?'}
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={() => pendingAction && executeAction(pendingAction)}
              >
                <Text style={styles.modalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
          <ScreenBadge screenNumber={210} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: '#FFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusDetails: {
    gap: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  actionsSection: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  actionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionCardDisabled: {
    opacity: 0.5,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  actionTitleDisabled: {
    color: '#C7C7CC',
  },
  actionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  actionDescriptionDisabled: {
    color: '#C7C7CC',
  },
  actionArrow: {
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#F8F9FA',
  },
  modalConfirmButton: {
    backgroundColor: '#007AFF',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
