/**
 * Sales Order Card Component
 * Individual sales order card for list views
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SalesOrder } from '../types/SalesOrder';

interface SalesOrderCardProps {
  order: SalesOrder;
  onPress: (order: SalesOrder) => void;
  compact?: boolean;
}

export default function SalesOrderCard({ order, onPress, compact = false }: SalesOrderCardProps) {
  const formatRelationalField = (field: [number, string] | undefined, fallback: string = '') => {
    return Array.isArray(field) ? field[1] : fallback;
  };

  const formatCurrency = (amount: number, currencySymbol: string = '$') => {
    return `${currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'draft': return '#8E8E93';
      case 'sent': return '#007AFF';
      case 'sale': return '#34C759';
      case 'done': return '#5856D6';
      case 'cancel': return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'draft': return 'edit';
      case 'sent': return 'send';
      case 'sale': return 'check-circle';
      case 'done': return 'done-all';
      case 'cancel': return 'cancel';
      default: return 'help';
    }
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'upselling': return '#FF9500';
      case 'invoiced': return '#34C759';
      case 'to invoice': return '#007AFF';
      case 'no': return '#8E8E93';
      default: return '#8E8E93';
    }
  };

  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9500';
      case 'partial': return '#007AFF';
      case 'full': return '#34C759';
      case 'no': return '#8E8E93';
      default: return '#8E8E93';
    }
  };

  const getCurrencySymbol = () => {
    const currency = formatRelationalField(order.currency_id);
    if (currency.includes('USD') || currency.includes('$')) return '$';
    if (currency.includes('EUR') || currency.includes('€')) return '€';
    if (currency.includes('GBP') || currency.includes('£')) return '£';
    return '$'; // Default
  };

  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.compactCard]}
      onPress={() => onPress(order)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        {/* Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={[styles.orderNumber, compact && styles.compactOrderNumber]}>
              {order.name}
            </Text>
            <Text style={[styles.customerName, compact && styles.compactCustomerName]} numberOfLines={1}>
              {formatRelationalField(order.partner_id, 'No Customer')}
            </Text>
          </View>
          
          <View style={styles.orderMeta}>
            <View style={[styles.statusBadge, { backgroundColor: getStateColor(order.state) + '15' }]}>
              <MaterialIcons 
                name={getStateIcon(order.state) as any} 
                size={12} 
                color={getStateColor(order.state)} 
              />
              <Text style={[styles.statusText, { color: getStateColor(order.state) }]}>
                {order.state.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Details */}
        {!compact && (
          <>
            <View style={styles.orderDetails}>
              <View style={styles.detailRow}>
                <MaterialIcons name="event" size={14} color="#8E8E93" />
                <Text style={styles.detailText}>
                  {formatDate(order.date_order)}
                </Text>
              </View>
              
              {order.user_id && (
                <View style={styles.detailRow}>
                  <MaterialIcons name="person" size={14} color="#8E8E93" />
                  <Text style={styles.detailText}>
                    {formatRelationalField(order.user_id)}
                  </Text>
                </View>
              )}
              
              {order.team_id && (
                <View style={styles.detailRow}>
                  <MaterialIcons name="group" size={14} color="#8E8E93" />
                  <Text style={styles.detailText}>
                    {formatRelationalField(order.team_id)}
                  </Text>
                </View>
              )}
            </View>

            {/* Status Indicators */}
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Invoice</Text>
                <View style={[styles.statusDot, { backgroundColor: getInvoiceStatusColor(order.invoice_status) }]} />
                <Text style={[styles.statusValue, { color: getInvoiceStatusColor(order.invoice_status) }]}>
                  {order.invoice_status.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
              
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Delivery</Text>
                <View style={[styles.statusDot, { backgroundColor: getDeliveryStatusColor(order.delivery_status) }]} />
                <Text style={[styles.statusValue, { color: getDeliveryStatusColor(order.delivery_status) }]}>
                  {order.delivery_status.toUpperCase()}
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Amount */}
        <View style={styles.amountSection}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Total</Text>
            <Text style={[styles.amountValue, compact && styles.compactAmountValue]}>
              {formatCurrency(order.amount_total, getCurrencySymbol())}
            </Text>
          </View>
          
          {!compact && (
            <View style={styles.amountBreakdown}>
              <Text style={styles.amountBreakdownText}>
                Subtotal: {formatCurrency(order.amount_untaxed, getCurrencySymbol())} • 
                Tax: {formatCurrency(order.amount_tax, getCurrencySymbol())}
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              // Handle quick action - could open bottom sheet
              console.log('Quick action for order:', order.id);
            }}
          >
            <MaterialIcons name="more-vert" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  compactCard: {
    padding: 12,
  },
  cardContent: {
    flex: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  compactOrderNumber: {
    fontSize: 14,
  },
  customerName: {
    fontSize: 14,
    color: '#8E8E93',
  },
  compactCustomerName: {
    fontSize: 12,
  },
  orderMeta: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  orderDetails: {
    marginBottom: 12,
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 10,
    color: '#8E8E93',
    marginBottom: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 10,
    fontWeight: '600',
  },
  amountSection: {
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  compactAmountValue: {
    fontSize: 16,
  },
  amountBreakdown: {
    marginTop: 4,
  },
  amountBreakdownText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'right',
  },
  actions: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  actionButton: {
    padding: 4,
  },
});
