/**
 * 205_SalesOrderBottomSheet - Sales order quick actions bottom sheet
 * Screen Number: 205
 * Model: sale.order
 * Type: bottomsheet
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import BaseBottomSheet from '../../base/components/BaseBottomSheet';
import { SalesOrder, SalesOrderLine } from '../types/SalesOrder';
import { salesOrderService } from '../services/SalesOrderService';
import { BottomSheetAction } from '../../base/types/BaseModel';
import ScreenBadge from '../../../components/ScreenBadge';

interface SalesOrderBottomSheetProps {
  order: SalesOrder;
  visible: boolean;
  onClose: () => void;
  onEdit?: (order: SalesOrder) => void;
  onDelete?: (order: SalesOrder) => void;
  onChatter?: (order: SalesOrder) => void;
  onWorkflowActions?: (order: SalesOrder) => void;
  onOrderLines?: (order: SalesOrder) => void;
}

export default function SalesOrderBottomSheet({
  order,
  visible,
  onClose,
  onEdit,
  onDelete,
  onChatter,
  onWorkflowActions,
  onOrderLines,
}: SalesOrderBottomSheetProps) {
  const [orderLines, setOrderLines] = useState<SalesOrderLine[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);

  useEffect(() => {
    if (visible && order) {
      loadOrderLines();
    }
  }, [visible, order]);

  const loadOrderLines = async () => {
    setLoadingLines(true);
    try {
      const lines = await salesOrderService.getSalesOrderLines(order.id, 5); // Load first 5 lines
      setOrderLines(lines);
    } catch (error) {
      console.error('Failed to load order lines:', error);
    } finally {
      setLoadingLines(false);
    }
  };

  const handleConfirmOrder = async () => {
    Alert.alert(
      'Confirm Order',
      `Are you sure you want to confirm "${order.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const success = await salesOrderService.confirmOrder(order.id);
              if (success) {
                Alert.alert('Success', 'Order confirmed successfully');
                onClose();
              } else {
                Alert.alert('Error', 'Failed to confirm order');
              }
            } catch (error) {
              console.error('Failed to confirm order:', error);
              Alert.alert('Error', 'Failed to confirm order');
            }
          },
        },
      ]
    );
  };

  const handleSendQuotation = async () => {
    try {
      const success = await salesOrderService.sendQuotation(order.id);
      if (success) {
        Alert.alert('Success', 'Quotation sent successfully');
      } else {
        Alert.alert('Error', 'Failed to send quotation');
      }
    } catch (error) {
      console.error('Failed to send quotation:', error);
      Alert.alert('Error', 'Failed to send quotation');
    }
  };

  const handleCreateInvoice = async () => {
    try {
      const success = await salesOrderService.createInvoice(order.id);
      if (success) {
        Alert.alert('Success', 'Invoice created successfully');
      } else {
        Alert.alert('Error', 'Failed to create invoice');
      }
    } catch (error) {
      console.error('Failed to create invoice:', error);
      Alert.alert('Error', 'Failed to create invoice');
    }
  };

  const formatRelationalField = (field: [number, string] | undefined, fallback: string = 'Not set') => {
    return Array.isArray(field) ? field[1] : fallback;
  };

  const formatCurrency = (amount: number, currencySymbol: string = '$') => {
    return `${currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getCurrencySymbol = () => {
    const currency = formatRelationalField(order.currency_id);
    if (currency.includes('USD') || currency.includes('$')) return '$';
    if (currency.includes('EUR') || currency.includes('€')) return '€';
    if (currency.includes('GBP') || currency.includes('£')) return '£';
    return '$'; // Default
  };

  const getOrderActions = (): BottomSheetAction<SalesOrder>[] => {
    const actions: BottomSheetAction<SalesOrder>[] = [];

    // State-specific actions
    if (order.state === 'draft') {
      actions.push({
        id: 'send_quotation',
        label: 'Send Quote',
        icon: 'send',
        color: '#007AFF',
        onPress: () => handleSendQuotation(),
      });

      actions.push({
        id: 'confirm',
        label: 'Confirm',
        icon: 'check-circle',
        color: '#34C759',
        onPress: () => handleConfirmOrder(),
      });
    }

    if (order.state === 'sale' && order.invoice_status === 'to invoice') {
      actions.push({
        id: 'create_invoice',
        label: 'Invoice',
        icon: 'receipt',
        color: '#FF9500',
        onPress: () => handleCreateInvoice(),
      });
    }

    // Universal actions
    actions.push({
      id: 'order_lines',
      label: 'Order Lines',
      icon: 'list',
      color: '#5856D6',
      onPress: (order) => onOrderLines?.(order),
    });

    actions.push({
      id: 'chatter',
      label: 'Chatter',
      icon: 'message',
      color: '#007AFF',
      onPress: (order) => onChatter?.(order),
    });

    actions.push({
      id: 'workflow',
      label: 'Workflow',
      icon: 'settings',
      color: '#FF9500',
      onPress: (order) => onWorkflowActions?.(order),
    });

    actions.push({
      id: 'edit',
      label: 'Edit',
      icon: 'edit',
      color: '#007AFF',
      onPress: (order) => onEdit?.(order),
    });

    return actions;
  };

  const renderOrderHeader = () => (
    <View style={styles.orderHeader}>
      <View style={styles.orderInfo}>
        <Text style={styles.orderNumber}>{order.name}</Text>
        <Text style={styles.customerName}>
          {formatRelationalField(order.partner_id, 'No Customer')}
        </Text>
        <Text style={styles.orderDate}>
          {formatDate(order.date_order)}
        </Text>
      </View>
      <View style={styles.orderAmount}>
        <Text style={styles.amountValue}>
          {formatCurrency(order.amount_total, getCurrencySymbol())}
        </Text>
        <Text style={styles.amountLabel}>Total</Text>
      </View>
    </View>
  );

  const renderOrderDetails = () => (
    <View style={styles.orderDetails}>
      <Text style={styles.sectionTitle}>Order Details</Text>
      
      <View style={styles.detailGrid}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Status</Text>
          <Text style={styles.detailValue}>{order.state.toUpperCase()}</Text>
        </View>
        
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Invoice Status</Text>
          <Text style={styles.detailValue}>{order.invoice_status.replace('_', ' ').toUpperCase()}</Text>
        </View>
        
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Delivery Status</Text>
          <Text style={styles.detailValue}>{order.delivery_status.toUpperCase()}</Text>
        </View>
        
        {order.user_id && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Salesperson</Text>
            <Text style={styles.detailValue}>{formatRelationalField(order.user_id)}</Text>
          </View>
        )}
        
        {order.team_id && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Sales Team</Text>
            <Text style={styles.detailValue}>{formatRelationalField(order.team_id)}</Text>
          </View>
        )}
      </View>

      <View style={styles.amountBreakdown}>
        <View style={styles.amountRow}>
          <Text style={styles.amountRowLabel}>Subtotal</Text>
          <Text style={styles.amountRowValue}>
            {formatCurrency(order.amount_untaxed, getCurrencySymbol())}
          </Text>
        </View>
        <View style={styles.amountRow}>
          <Text style={styles.amountRowLabel}>Tax</Text>
          <Text style={styles.amountRowValue}>
            {formatCurrency(order.amount_tax, getCurrencySymbol())}
          </Text>
        </View>
        <View style={[styles.amountRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>
            {formatCurrency(order.amount_total, getCurrencySymbol())}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderOrderLines = () => {
    if (loadingLines) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Loading order lines...</Text>
        </View>
      );
    }

    if (orderLines.length === 0) {
      return (
        <View style={styles.emptyLines}>
          <Text style={styles.emptyLinesText}>No order lines</Text>
        </View>
      );
    }

    return (
      <View style={styles.orderLines}>
        <Text style={styles.sectionTitle}>Order Lines ({orderLines.length})</Text>
        {orderLines.slice(0, 3).map((line, index) => (
          <View key={line.id} style={styles.lineItem}>
            <Text style={styles.lineProduct} numberOfLines={1}>
              {formatRelationalField(line.product_id)}
            </Text>
            <Text style={styles.lineDetails}>
              {line.product_uom_qty} × {formatCurrency(line.price_unit, getCurrencySymbol())} = {formatCurrency(line.price_subtotal, getCurrencySymbol())}
            </Text>
          </View>
        ))}
        {orderLines.length > 3 && (
          <Text style={styles.moreLines}>
            +{orderLines.length - 3} more lines
          </Text>
        )}
            <ScreenBadge screenNumber={205} />
    </View>
    );
  };

  return (
    <BaseBottomSheet
      record={order}
      visible={visible}
      onClose={onClose}
      actions={getOrderActions()}
      title={order.name}
      subtitle={`${order.state.toUpperCase()} • ${formatCurrency(order.amount_total, getCurrencySymbol())}`}
      headerContent={renderOrderHeader()}
      snapPoints={['40%', '70%', '95%']}
    >
      {renderOrderDetails()}
      {renderOrderLines()}
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    marginBottom: 16,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  customerName: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 2,
  },
  orderDate: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  orderAmount: {
    alignItems: 'flex-end',
  },
  amountValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  amountLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  orderDetails: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  detailGrid: {
    gap: 8,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  amountBreakdown: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  amountRowLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  amountRowValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingTop: 8,
    marginTop: 4,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  orderLines: {
    marginBottom: 16,
  },
  lineItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  lineProduct: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  lineDetails: {
    fontSize: 12,
    color: '#8E8E93',
  },
  moreLines: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
  },
  emptyLines: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyLinesText: {
    fontSize: 14,
    color: '#8E8E93',
  },
});
