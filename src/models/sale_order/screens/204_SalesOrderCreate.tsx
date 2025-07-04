/**
 * 204_SalesOrderCreate - Create new sales order
 * Screen Number: 204
 * Model: sale.order
 * Type: create
 */

import React, { useState } from 'react';
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

interface SalesOrderCreateProps {
  onSave?: (order: SalesOrder) => void;
  onCancel?: () => void;
  initialData?: Partial<SalesOrderFormData>;
}

export default function SalesOrderCreate({
  onSave,
  onCancel,
  initialData = {},
}: SalesOrderCreateProps) {
  const [creating, setCreating] = useState(false);

  const handleSave = async (formData: Partial<SalesOrderFormData>) => {
    setCreating(true);
    try {
      // Validate the data
      const validation = salesOrderService.validateSalesOrderData(formData as SalesOrderFormData);
      if (!validation.valid) {
        Alert.alert('Validation Error', validation.errors.join('\n'));
        return;
      }

      // Create the sales order
      const orderId = await salesOrderService.createSalesOrder(formData as SalesOrderFormData);
      if (orderId > 0) {
        // Load the created order to get full details
        const newOrder = await salesOrderService.getSalesOrderDetail(orderId);
        if (newOrder) {
          onSave?.(newOrder);
          Alert.alert('Success', 'Sales order created successfully');
        }
      } else {
        Alert.alert('Error', 'Failed to create sales order');
      }
    } catch (error) {
      console.error('Failed to create sales order:', error);
      Alert.alert('Error', 'Failed to create sales order');
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Discard Sales Order',
      'Are you sure you want to discard this new sales order?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: onCancel },
      ]
    );
  };

  const getCreateFields = () => {
    const today = new Date().toISOString().split('T')[0];
    const validityDate = new Date();
    validityDate.setDate(validityDate.getDate() + 30); // Default 30 days validity
    const defaultValidityDate = validityDate.toISOString().split('T')[0];

    return [
      // Customer Selection (Required)
      {
        key: 'partner_id',
        label: 'Customer',
        type: 'text' as const,
        value: initialData.partner_id?.toString() || '',
        required: true,
        placeholder: 'Enter customer ID (required)',
      },

      // Date Fields
      {
        key: 'date_order',
        label: 'Order Date',
        type: 'text' as const,
        value: initialData.date_order || today,
        required: true,
        placeholder: 'YYYY-MM-DD',
      },
      {
        key: 'validity_date',
        label: 'Validity Date',
        type: 'text' as const,
        value: initialData.validity_date || defaultValidityDate,
        placeholder: 'YYYY-MM-DD',
      },
      {
        key: 'commitment_date',
        label: 'Commitment Date',
        type: 'text' as const,
        value: initialData.commitment_date || '',
        placeholder: 'YYYY-MM-DD',
      },
      {
        key: 'expected_date',
        label: 'Expected Date',
        type: 'text' as const,
        value: initialData.expected_date || '',
        placeholder: 'YYYY-MM-DD',
      },

      // Sales Information
      {
        key: 'user_id',
        label: 'Salesperson',
        type: 'text' as const,
        value: initialData.user_id?.toString() || '',
        placeholder: 'Enter salesperson ID',
      },
      {
        key: 'team_id',
        label: 'Sales Team',
        type: 'text' as const,
        value: initialData.team_id?.toString() || '',
        placeholder: 'Enter sales team ID',
      },

      // Address Information
      {
        key: 'partner_invoice_id',
        label: 'Invoice Address',
        type: 'text' as const,
        value: initialData.partner_invoice_id?.toString() || '',
        placeholder: 'Enter invoice address ID (optional)',
      },
      {
        key: 'partner_shipping_id',
        label: 'Delivery Address',
        type: 'text' as const,
        value: initialData.partner_shipping_id?.toString() || '',
        placeholder: 'Enter delivery address ID (optional)',
      },

      // Financial Information
      {
        key: 'pricelist_id',
        label: 'Pricelist',
        type: 'text' as const,
        value: initialData.pricelist_id?.toString() || '',
        placeholder: 'Enter pricelist ID (optional)',
      },
      {
        key: 'payment_term_id',
        label: 'Payment Terms',
        type: 'text' as const,
        value: initialData.payment_term_id?.toString() || '',
        placeholder: 'Enter payment terms ID (optional)',
      },
      {
        key: 'fiscal_position_id',
        label: 'Fiscal Position',
        type: 'text' as const,
        value: initialData.fiscal_position_id?.toString() || '',
        placeholder: 'Enter fiscal position ID (optional)',
      },

      // Reference Fields
      {
        key: 'client_order_ref',
        label: 'Customer Reference',
        type: 'text' as const,
        value: initialData.client_order_ref || '',
        placeholder: 'Enter customer reference',
      },
      {
        key: 'origin',
        label: 'Source Document',
        type: 'text' as const,
        value: initialData.origin || '',
        placeholder: 'Enter source document',
      },

      // CRM Information
      {
        key: 'opportunity_id',
        label: 'Opportunity',
        type: 'text' as const,
        value: initialData.opportunity_id?.toString() || '',
        placeholder: 'Enter opportunity ID (optional)',
      },
      {
        key: 'campaign_id',
        label: 'Campaign',
        type: 'text' as const,
        value: initialData.campaign_id?.toString() || '',
        placeholder: 'Enter campaign ID (optional)',
      },
      {
        key: 'medium_id',
        label: 'Medium',
        type: 'text' as const,
        value: initialData.medium_id?.toString() || '',
        placeholder: 'Enter medium ID (optional)',
      },
      {
        key: 'source_id',
        label: 'Source',
        type: 'text' as const,
        value: initialData.source_id?.toString() || '',
        placeholder: 'Enter source ID (optional)',
      },

      // Terms and Conditions
      {
        key: 'note',
        label: 'Terms and Conditions',
        type: 'multiline' as const,
        value: initialData.note || '',
        placeholder: 'Enter terms and conditions',
      },
    ];
  };

  return (
    <SafeAreaView style={styles.container}>
      <BaseFormView
        record={null}
        mode="create"
        loading={creating}
        readonly={false}
        fields={getCreateFields()}
        title="New Sales Order"
        showHeader={true}
        showActions={false}
        onSave={handleSave}
        onCancel={handleCancel}
      />
          <ScreenBadge screenNumber={204} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});
