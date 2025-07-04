/**
 * 202_SalesOrderDetail - Sales order detail/form view (read-only)
 * Screen Number: 202
 * Model: sale.order
 * Type: detail
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
  Share,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import BaseFormView from '../../base/components/BaseFormView';
import { salesOrderService } from '../services/SalesOrderService';
import { SalesOrder, SALES_ORDER_FIELDS } from '../types/SalesOrder';
import ScreenBadge from '../../../components/ScreenBadge';

interface SalesOrderDetailProps {
  orderId: number;
  onEdit?: (order: SalesOrder) => void;
  onDelete?: (order: SalesOrder) => void;
  onChatter?: (order: SalesOrder) => void;
  onOrderLines?: (order: SalesOrder) => void;
  onWorkflow?: (order: SalesOrder) => void;
}

export default function SalesOrderDetail({
  orderId,
  onEdit,
  onDelete,
  onChatter,
  onOrderLines,
  onWorkflow,
}: SalesOrderDetailProps) {
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

  const handleEdit = () => {
    if (order) {
      onEdit?.(order);
      // Navigate to 203_SalesOrderEdit
      console.log('Navigate to edit sales order:', order.id);
    }
  };

  const handleDelete = () => {
    if (!order) return;

    Alert.alert(
      'Delete Sales Order',
      `Are you sure you want to delete "${order.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await salesOrderService.delete(order.id);
              onDelete?.(order);
              Alert.alert('Success', 'Sales order deleted successfully');
            } catch (error) {
              console.error('Failed to delete sales order:', error);
              Alert.alert('Error', 'Failed to delete sales order');
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    if (!order) return;

    const shareContent = `Sales Order: ${order.name}\n` +
      `Customer: ${Array.isArray(order.partner_id) ? order.partner_id[1] : 'Unknown'}\n` +
      `Date: ${new Date(order.date_order).toLocaleDateString()}\n` +
      `Amount: ${formatCurrency(order.amount_total)}\n` +
      `Status: ${order.state.toUpperCase()}`;

    try {
      await Share.share({
        message: shareContent,
        title: `Sales Order: ${order.name}`,
      });
    } catch (error) {
      console.error('Failed to share sales order:', error);
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
    if (!order) return '$';
    const currency = formatRelationalField(order.currency_id);
    if (currency.includes('USD') || currency.includes('$')) return '$';
    if (currency.includes('EUR') || currency.includes('€')) return '€';
    if (currency.includes('GBP') || currency.includes('£')) return '£';
    return '$'; // Default
  };

  const getOrderFields = () => {
    if (!order) return [];

    return [
      // Basic Information
      {
        key: 'name',
        label: 'Order Number',
        type: 'readonly' as const,
        value: order.name,
      },
      {
        key: 'state',
        label: 'Status',
        type: 'readonly' as const,
        value: order.state.toUpperCase(),
      },
      {
        key: 'partner_id',
        label: 'Customer',
        type: 'readonly' as const,
        value: formatRelationalField(order.partner_id),
      },
      {
        key: 'date_order',
        label: 'Order Date',
        type: 'readonly' as const,
        value: formatDate(order.date_order),
      },
      {
        key: 'validity_date',
        label: 'Validity Date',
        type: 'readonly' as const,
        value: order.validity_date ? formatDate(order.validity_date) : 'Not set',
      },
      {
        key: 'confirmation_date',
        label: 'Confirmation Date',
        type: 'readonly' as const,
        value: order.confirmation_date ? formatDate(order.confirmation_date) : 'Not confirmed',
      },

      // Contact Information
      {
        key: 'partner_invoice_id',
        label: 'Invoice Address',
        type: 'readonly' as const,
        value: formatRelationalField(order.partner_invoice_id),
      },
      {
        key: 'partner_shipping_id',
        label: 'Delivery Address',
        type: 'readonly' as const,
        value: formatRelationalField(order.partner_shipping_id),
      },

      // Sales Information
      {
        key: 'user_id',
        label: 'Salesperson',
        type: 'readonly' as const,
        value: formatRelationalField(order.user_id),
      },
      {
        key: 'team_id',
        label: 'Sales Team',
        type: 'readonly' as const,
        value: formatRelationalField(order.team_id),
      },
      {
        key: 'pricelist_id',
        label: 'Pricelist',
        type: 'readonly' as const,
        value: formatRelationalField(order.pricelist_id),
      },
      {
        key: 'payment_term_id',
        label: 'Payment Terms',
        type: 'readonly' as const,
        value: formatRelationalField(order.payment_term_id),
      },

      // Status Information
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

      // Amounts
      {
        key: 'amount_untaxed',
        label: 'Subtotal',
        type: 'readonly' as const,
        value: formatCurrency(order.amount_untaxed, getCurrencySymbol()),
      },
      {
        key: 'amount_tax',
        label: 'Tax',
        type: 'readonly' as const,
        value: formatCurrency(order.amount_tax, getCurrencySymbol()),
      },
      {
        key: 'amount_total',
        label: 'Total',
        type: 'readonly' as const,
        value: formatCurrency(order.amount_total, getCurrencySymbol()),
      },

      // Additional Information
      {
        key: 'client_order_ref',
        label: 'Customer Reference',
        type: 'readonly' as const,
        value: order.client_order_ref || 'Not set',
      },
      {
        key: 'origin',
        label: 'Source Document',
        type: 'readonly' as const,
        value: order.origin || 'Not set',
      },
      {
        key: 'opportunity_id',
        label: 'Opportunity',
        type: 'readonly' as const,
        value: formatRelationalField(order.opportunity_id),
      },
      {
        key: 'commitment_date',
        label: 'Commitment Date',
        type: 'readonly' as const,
        value: order.commitment_date ? formatDate(order.commitment_date) : 'Not set',
      },
      {
        key: 'expected_date',
        label: 'Expected Date',
        type: 'readonly' as const,
        value: order.expected_date ? formatDate(order.expected_date) : 'Not set',
      },
      {
        key: 'note',
        label: 'Terms and Conditions',
        type: 'multiline' as const,
        value: order.note || 'No terms specified',
      },
    ];
  };

  const getCustomActions = () => [
    {
      icon: 'list',
      label: 'Order Lines',
      onPress: () => {
        if (order) {
          onOrderLines?.(order);
          // Navigate to 209_SalesOrderLines
          console.log('Navigate to order lines:', order.id);
        }
      },
      color: '#5856D6',
    },
    {
      icon: 'message',
      label: 'Chatter',
      onPress: () => {
        if (order) {
          onChatter?.(order);
          // Navigate to 206_SalesOrderChatter
          console.log('Navigate to order chatter:', order.id);
        }
      },
      color: '#007AFF',
    },
    {
      icon: 'settings',
      label: 'Workflow',
      onPress: () => {
        if (order) {
          onWorkflow?.(order);
          // Navigate to 210_SalesOrderWorkflow
          console.log('Navigate to order workflow:', order.id);
        }
      },
      color: '#FF9500',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <BaseFormView
        record={order}
        mode="view"
        loading={loading}
        readonly={true}
        fields={getOrderFields()}
        title={order?.name}
        showHeader={true}
        showActions={true}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onShare={handleShare}
        customActions={getCustomActions()}
      />
          <ScreenBadge screenNumber={202} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});
