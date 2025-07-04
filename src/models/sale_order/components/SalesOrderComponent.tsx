/**
 * Sales Order Management Component
 * Complete sales order lifecycle management with workflow automation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { authService } from '../../base/services/BaseAuthService';
import { BaseWorkflowActions } from '../../base/components';
import SalesOrderDetailBottomSheet from './SalesOrderDetailBottomSheet';
import { BaseFilterSheet } from '../../base/components';
import { formatRelationalField } from '../../../utils/relationalFieldUtils';

interface SalesOrder {
  id: number;
  name: string;
  partner_id: [number, string];
  date_order: string;
  amount_total: number;
  amount_untaxed: number;
  amount_tax: number;
  state: 'draft' | 'sent' | 'sale' | 'done' | 'cancel';
  invoice_status: 'upselling' | 'invoiced' | 'to invoice' | 'no';
  delivery_status: 'pending' | 'partial' | 'full' | 'no';
  user_id: [number, string];
  team_id: [number, string];
  order_line: any[];
  currency_id: [number, string];
}

interface SalesOrderLine {
  id: number;
  product_id: [number, string];
  name: string;
  product_uom_qty: number;
  price_unit: number;
  price_subtotal: number;
  discount: number;
}

export default function SalesOrderComponent() {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'draft' | 'sent' | 'sale' | 'done'>('all');
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [showWorkflowActions, setShowWorkflowActions] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const getFiltersWithCounts = () => [
    { id: 'all', name: 'All', icon: 'list', count: salesOrders.length },
    { id: 'draft', name: 'Draft', icon: 'edit', count: salesOrders.filter(o => o.state === 'draft').length },
    { id: 'sent', name: 'Sent', icon: 'send', count: salesOrders.filter(o => o.state === 'sent').length },
    { id: 'sale', name: 'Confirmed', icon: 'check-circle', count: salesOrders.filter(o => o.state === 'sale').length },
    { id: 'done', name: 'Done', icon: 'done-all', count: salesOrders.filter(o => o.state === 'done').length },
  ];

  useEffect(() => {
    loadSalesOrders();
  }, []);

  const loadSalesOrders = async () => {
    setLoading(true);
    try {
      const client = authService.getClient();
      if (!client) return;

      const orders = await client.searchRead('sale.order',
        [],
        [
          'id', 'name', 'partner_id', 'date_order', 'amount_total',
          'amount_untaxed', 'amount_tax', 'state', 'invoice_status',
          'delivery_status', 'user_id', 'team_id', 'currency_id'
        ],
        { order: 'date_order desc', limit: 50 }
      );

      setSalesOrders(orders);
    } catch (error) {
      console.error('Failed to load sales orders:', error);
      Alert.alert('Error', 'Failed to load sales orders');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSalesOrders();
    setRefreshing(false);
  };

  const getFilteredOrders = () => {
    if (selectedFilter === 'all') return salesOrders;
    return salesOrders.filter(order => order.state === selectedFilter);
  };

  const getStateColor = (state: string) => {
    const colors = {
      draft: '#FF9500',
      sent: '#007AFF',
      sale: '#34C759',
      done: '#666',
      cancel: '#FF3B30',
    };
    return colors[state as keyof typeof colors] || '#666';
  };

  const getStateIcon = (state: string) => {
    const icons = {
      draft: 'edit',
      sent: 'send',
      sale: 'check-circle',
      done: 'done-all',
      cancel: 'cancel',
    };
    return icons[state as keyof typeof icons] || 'help';
  };

  const formatCurrency = (amount: number, currencySymbol: string = '$') => {
    return `${currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleOrderPress = async (order: SalesOrder) => {
    setSelectedOrder(order);
    setShowOrderDetail(true);
  };

  const handleWorkflowAction = (order: SalesOrder) => {
    setSelectedOrder(order);
    setShowWorkflowActions(true);
  };

  const renderOrderCard = (order: SalesOrder) => (
    <TouchableOpacity
      key={order.id}
      style={styles.orderCard}
      onPress={() => handleOrderPress(order)}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>{order.name}</Text>
          <Text style={styles.customerName}>{formatRelationalField(order.partner_id, 'No Customer')}</Text>
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

      <View style={styles.orderDetails}>
        <View style={styles.orderAmount}>
          <Text style={styles.amountLabel}>Total</Text>
          <Text style={styles.amountValue}>
            {formatCurrency(order.amount_total)}
          </Text>
        </View>
        
        <View style={styles.orderDate}>
          <Text style={styles.dateLabel}>Date</Text>
          <Text style={styles.dateValue}>{formatDate(order.date_order)}</Text>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <View style={styles.orderProgress}>
          <View style={styles.progressItem}>
            <MaterialIcons 
              name={order.invoice_status === 'invoiced' ? 'receipt' : 'receipt-long'} 
              size={14} 
              color={order.invoice_status === 'invoiced' ? '#34C759' : '#FF9500'} 
            />
            <Text style={styles.progressText}>
              {order.invoice_status === 'invoiced' ? 'Invoiced' : 'To Invoice'}
            </Text>
          </View>
          
          <View style={styles.progressItem}>
            <MaterialIcons 
              name={order.delivery_status === 'full' ? 'local-shipping' : 'schedule'} 
              size={14} 
              color={order.delivery_status === 'full' ? '#34C759' : '#FF9500'} 
            />
            <Text style={styles.progressText}>
              {order.delivery_status === 'full' ? 'Delivered' : 'Pending'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleWorkflowAction(order)}
        >
          <MaterialIcons name="more-horiz" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const filteredOrders = getFilteredOrders();

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading sales orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sales Orders</Text>
        <View style={styles.headerActions}>
          <Text style={styles.orderCount}>{filteredOrders.length}</Text>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterSheet(true)}
          >
            <MaterialIcons name="filter-list" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCreateModal(true)}
          >
            <MaterialIcons name="add" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Orders List */}
      <ScrollView
        style={styles.ordersList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {filteredOrders.map(renderOrderCard)}

        {filteredOrders.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="shopping-cart" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No sales orders</Text>
            <Text style={styles.emptySubtext}>
              {selectedFilter === 'all' 
                ? 'No sales orders found' 
                : `No ${selectedFilter} orders found`}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Order Detail Bottom Sheet */}
      <SalesOrderDetailBottomSheet
        visible={showOrderDetail}
        onClose={() => setShowOrderDetail(false)}
        onWorkflowActions={() => {
          setShowOrderDetail(false);
          setShowWorkflowActions(true);
        }}
        order={selectedOrder}
      />

      {/* Workflow Actions Bottom Sheet */}
      {selectedOrder && (
        <WorkflowActionsComponent
          visible={showWorkflowActions}
          onClose={() => setShowWorkflowActions(false)}
          model="sale.order"
          recordId={selectedOrder.id}
          recordName={selectedOrder.name}
          onActionComplete={() => {
            setShowWorkflowActions(false);
            loadSalesOrders();
          }}
        />
      )}

      {/* Filter Bottom Sheet */}
      <BaseFilterSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        title="Filter Sales Orders"
        filters={getFiltersWithCounts()}
        selectedFilter={selectedFilter}
        onFilterSelect={(filterId) => setSelectedFilter(filterId as any)}
      />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterButton: {
    padding: 6,
    borderRadius: 6,
  },
  addButton: {
    padding: 6,
    borderRadius: 6,
  },

  ordersList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    color: '#1A1A1A',
    marginBottom: 2,
  },
  customerName: {
    fontSize: 14,
    color: '#666',
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
    fontSize: 11,
    fontWeight: '600',
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderAmount: {
    alignItems: 'flex-start',
  },
  amountLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  orderDate: {
    alignItems: 'flex-end',
  },
  dateLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderProgress: {
    flexDirection: 'row',
    gap: 16,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressText: {
    fontSize: 11,
    color: '#666',
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
