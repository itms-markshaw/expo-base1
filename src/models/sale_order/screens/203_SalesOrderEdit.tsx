/**
 * 203_SalesOrderEdit - Sales order edit form view
 * Screen Number: 203
 * Model: sale.order
 * Type: edit
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import BaseFormView from '../../base/components/BaseFormView';
import { salesOrderService } from '../services/SalesOrderService';
import { SalesOrder, SalesOrderFormData } from '../types/SalesOrder';
import ScreenBadge from '../../../components/ScreenBadge';

interface SalesOrderEditProps {
  orderId: number;
  onSave?: (order: SalesOrder) => void;
  onCancel?: () => void;
}

export default function SalesOrderEdit({
  orderId,
  onSave,
  onCancel,
}: SalesOrderEditProps) {
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleSave = async (formData: Partial<SalesOrder>) => {
    if (!order) return;

    try {
      // Validate the data
      const validation = salesOrderService.validateSalesOrderData(formData as SalesOrderFormData);
      if (!validation.valid) {
        Alert.alert('Validation Error', validation.errors.join('\n'));
        return;
      }

      // Update the order
      const success = await salesOrderService.updateSalesOrder(order.id, formData as SalesOrderFormData);
      if (success) {
        // Reload the updated order
        const updatedOrder = await salesOrderService.getSalesOrderDetail(order.id);
        if (updatedOrder) {
          setOrder(updatedOrder);
          onSave?.(updatedOrder);
          Alert.alert('Success', 'Sales order updated successfully');
        }
      } else {
        Alert.alert('Error', 'Failed to update sales order');
      }
    } catch (error) {
      console.error('Failed to save sales order:', error);
      Alert.alert('Error', 'Failed to save sales order changes');
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Discard Changes',
      'Are you sure you want to discard your changes?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: onCancel },
      ]
    );
  };

  const formatRelationalField = (field: [number, string] | undefined) => {
    return Array.isArray(field) ? field[0] : undefined;
  };

  const getEditableFields = () => {
    if (!order) return [];

    return [
      // Basic Information (read-only for existing orders)
      {
        key: 'name',
        label: 'Order Number',
        type: 'readonly' as const,
        value: order.name,
      },
      {
        key: 'partner_id',
        label: 'Customer',
        type: 'readonly' as const,
        value: Array.isArray(order.partner_id) ? order.partner_id[1] : 'Unknown',
      },

      // Editable Date Fields
      {
        key: 'date_order',
        label: 'Order Date',
        type: 'text' as const,
        value: order.date_order.split('T')[0], // Format as YYYY-MM-DD
        placeholder: 'YYYY-MM-DD',
      },
      {
        key: 'validity_date',
        label: 'Validity Date',
        type: 'text' as const,
        value: order.validity_date ? order.validity_date.split('T')[0] : '',
        placeholder: 'YYYY-MM-DD',
      },
      {
        key: 'commitment_date',
        label: 'Commitment Date',
        type: 'text' as const,
        value: order.commitment_date ? order.commitment_date.split('T')[0] : '',
        placeholder: 'YYYY-MM-DD',
      },
      {
        key: 'expected_date',
        label: 'Expected Date',
        type: 'text' as const,
        value: order.expected_date ? order.expected_date.split('T')[0] : '',
        placeholder: 'YYYY-MM-DD',
      },

      // Reference Fields
      {
        key: 'client_order_ref',
        label: 'Customer Reference',
        type: 'text' as const,
        value: order.client_order_ref || '',
        placeholder: 'Enter customer reference',
      },
      {
        key: 'origin',
        label: 'Source Document',
        type: 'text' as const,
        value: order.origin || '',
        placeholder: 'Enter source document',
      },

      // Status Information (read-only)
      {
        key: 'state',
        label: 'Status',
        type: 'readonly' as const,
        value: order.state.toUpperCase(),
      },
      {
        key: 'invoice_status',
        label: 'Invoice Status',
        type: 'readonly' as const,
        value: order.invoice_status.replace('_', ' ').toUpperCase(),
      },
      {
        key: 'delivery_status',
        label: 'Delivery Status',
        type: 'readonly' as const,
        value: order.delivery_status.toUpperCase(),
      },

      // Amount Information (read-only)
      {
        key: 'amount_untaxed',
        label: 'Subtotal',
        type: 'readonly' as const,
        value: `$${order.amount_untaxed.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      },
      {
        key: 'amount_tax',
        label: 'Tax',
        type: 'readonly' as const,
        value: `$${order.amount_tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      },
      {
        key: 'amount_total',
        label: 'Total',
        type: 'readonly' as const,
        value: `$${order.amount_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      },

      // Terms and Conditions
      {
        key: 'note',
        label: 'Terms and Conditions',
        type: 'multiline' as const,
        value: order.note || '',
        placeholder: 'Enter terms and conditions',
      },
    ];
  };

  return (
    <SafeAreaView style={styles.container}>
      <BaseFormView
        record={order}
        mode="edit"
        loading={loading}
        readonly={false}
        fields={getEditableFields()}
        title={`Edit ${order?.name || 'Sales Order'}`}
        showHeader={true}
        showActions={false}
        onSave={handleSave}
        onCancel={handleCancel}
      />
          <ScreenBadge screenNumber={203} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});
