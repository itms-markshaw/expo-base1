/**
 * 206_SalesOrderChatter - Sales order chatter/messages view
 * Screen Number: 206
 * Model: sale.order
 * Type: chatter
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import BaseChatter from '../../base/components/BaseChatter';
import { salesOrderService } from '../services/SalesOrderService';
import { SalesOrder } from '../types/SalesOrder';
import ScreenBadge from '../../../components/ScreenBadge';

interface SalesOrderChatterProps {
  orderId: number;
  onBack?: () => void;
  readonly?: boolean;
}

export default function SalesOrderChatter({
  orderId,
  onBack,
  readonly = false,
}: SalesOrderChatterProps) {
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

  const formatCurrency = (amount: number, currencySymbol: string = '$') => {
    return `${currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getCurrencySymbol = () => {
    if (!order) return '$';
    const currency = Array.isArray(order.currency_id) ? order.currency_id[1] : '';
    if (currency.includes('USD') || currency.includes('$')) return '$';
    if (currency.includes('EUR') || currency.includes('€')) return '€';
    if (currency.includes('GBP') || currency.includes('£')) return '£';
    return '$'; // Default
  };

  const getOrderStatusColor = (state: string) => {
    switch (state) {
      case 'draft': return '#8E8E93';
      case 'sent': return '#007AFF';
      case 'sale': return '#34C759';
      case 'done': return '#5856D6';
      case 'cancel': return '#FF3B30';
      default: return '#8E8E93';
    }
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
            {order?.name || 'Sales Order'} - Chatter
          </Text>
          <Text style={styles.headerSubtitle}>
            Messages, activities, and attachments
          </Text>
        </View>
      </View>
      
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.headerAction}
          onPress={() => {
            // Navigate to sales order detail (202)
            console.log('Navigate to sales order detail:', orderId);
          }}
        >
          <MaterialIcons name="info" size={20} color="#007AFF" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.headerAction}
          onPress={() => {
            // Navigate to sales order edit (203)
            console.log('Navigate to sales order edit:', orderId);
          }}
        >
          <MaterialIcons name="edit" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderOrderSummary = () => {
    if (!order) return null;

    return (
      <View style={styles.orderSummary}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryLeft}>
            <Text style={styles.orderNumber}>{order.name}</Text>
            <Text style={styles.customerName}>
              {Array.isArray(order.partner_id) ? order.partner_id[1] : 'Unknown Customer'}
            </Text>
          </View>
          
          <View style={styles.summaryRight}>
            <Text style={styles.orderAmount}>
              {formatCurrency(order.amount_total, getCurrencySymbol())}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getOrderStatusColor(order.state) + '15' }]}>
              <Text style={[styles.statusText, { color: getOrderStatusColor(order.state) }]}>
                {order.state.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.summaryDetails}>
          <View style={styles.summaryItem}>
            <MaterialIcons name="event" size={14} color="#8E8E93" />
            <Text style={styles.summaryItemText}>
              {new Date(order.date_order).toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.summaryItem}>
            <MaterialIcons name="receipt" size={14} color="#8E8E93" />
            <Text style={styles.summaryItemText}>
              Invoice: {order.invoice_status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.summaryItem}>
            <MaterialIcons name="local-shipping" size={14} color="#8E8E93" />
            <Text style={styles.summaryItemText}>
              Delivery: {order.delivery_status.toUpperCase()}
            </Text>
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
          <Text style={styles.loadingText}>Loading sales order...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>Sales order not found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadOrder}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderOrderSummary()}
      
      <BaseChatter
        modelName="sale.order"
        recordId={orderId}
        readonly={readonly}
        config={{
          showFollowers: true,
          showActivities: true,
          showAttachments: true,
          allowInternalNotes: true,
          allowEmails: true,
          compactMode: false,
        }}
      />
          <ScreenBadge screenNumber={206} />
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerAction: {
    padding: 8,
  },
  orderSummary: {
    backgroundColor: '#FFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  summaryLeft: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  customerName: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  orderAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
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
  summaryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryItemText: {
    fontSize: 12,
    color: '#8E8E93',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
