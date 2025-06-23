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
import { authService } from '../services/auth';
import WorkflowActionsComponent from './WorkflowActionsComponent';

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

  const filters = [
    { id: 'all', name: 'All', icon: 'list', color: '#666' },
    { id: 'draft', name: 'Draft', icon: 'edit', color: '#FF9500' },
    { id: 'sent', name: 'Sent', icon: 'send', color: '#007AFF' },
    { id: 'sale', name: 'Confirmed', icon: 'check-circle', color: '#34C759' },
    { id: 'done', name: 'Done', icon: 'done-all', color: '#666' },
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
          <Text style={styles.customerName}>{order.partner_id[1]}</Text>
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
            style={styles.addButton}
            onPress={() => setShowCreateModal(true)}
          >
            <MaterialIcons name="add" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        {filters.map((filter) => {
          const count = filter.id === 'all' 
            ? salesOrders.length 
            : salesOrders.filter(o => o.state === filter.id).length;
          
          return (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterChip,
                selectedFilter === filter.id && styles.filterChipActive
              ]}
              onPress={() => setSelectedFilter(filter.id as any)}
            >
              <MaterialIcons
                name={filter.icon as any}
                size={14}
                color={selectedFilter === filter.id ? '#FFF' : filter.color}
              />
              <Text style={[
                styles.filterChipText,
                selectedFilter === filter.id && styles.filterChipTextActive
              ]}>
                {filter.name}
              </Text>
              {count > 0 && (
                <View style={[
                  styles.filterChipBadge,
                  selectedFilter === filter.id && styles.filterChipBadgeActive
                ]}>
                  <Text style={[
                    styles.filterChipBadgeText,
                    selectedFilter === filter.id && styles.filterChipBadgeTextActive
                  ]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
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

      {/* Order Detail Modal */}
      <Modal
        visible={showOrderDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowOrderDetail(false)}
      >
        {selectedOrder && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowOrderDetail(false)}>
                <Text style={styles.cancelButton}>Close</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{selectedOrder.name}</Text>
              <TouchableOpacity onPress={() => {
                setShowOrderDetail(false);
                setShowWorkflowActions(true);
              }}>
                <MaterialIcons name="more-vert" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Order Information</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Customer:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.partner_id[1]}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedOrder.date_order)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Salesperson:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.user_id[1]}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Sales Team:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.team_id[1]}</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Financial Summary</Text>
                <View style={styles.financialSummary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal:</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(selectedOrder.amount_untaxed)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tax:</Text>
                    <Text style={styles.summaryValue}>
                      {formatCurrency(selectedOrder.amount_tax)}
                    </Text>
                  </View>
                  <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalValue}>
                      {formatCurrency(selectedOrder.amount_total)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Status</Text>
                <View style={styles.statusGrid}>
                  <View style={styles.statusItem}>
                    <MaterialIcons 
                      name={getStateIcon(selectedOrder.state) as any} 
                      size={24} 
                      color={getStateColor(selectedOrder.state)} 
                    />
                    <Text style={styles.statusItemLabel}>Order Status</Text>
                    <Text style={[styles.statusItemValue, { color: getStateColor(selectedOrder.state) }]}>
                      {selectedOrder.state.toUpperCase()}
                    </Text>
                  </View>
                  
                  <View style={styles.statusItem}>
                    <MaterialIcons 
                      name="receipt" 
                      size={24} 
                      color={selectedOrder.invoice_status === 'invoiced' ? '#34C759' : '#FF9500'} 
                    />
                    <Text style={styles.statusItemLabel}>Invoice</Text>
                    <Text style={styles.statusItemValue}>
                      {selectedOrder.invoice_status === 'invoiced' ? 'Invoiced' : 'To Invoice'}
                    </Text>
                  </View>
                  
                  <View style={styles.statusItem}>
                    <MaterialIcons 
                      name="local-shipping" 
                      size={24} 
                      color={selectedOrder.delivery_status === 'full' ? '#34C759' : '#FF9500'} 
                    />
                    <Text style={styles.statusItemLabel}>Delivery</Text>
                    <Text style={styles.statusItemValue}>
                      {selectedOrder.delivery_status === 'full' ? 'Delivered' : 'Pending'}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Workflow Actions Modal */}
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
  addButton: {
    padding: 6,
    borderRadius: 6,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  filterChipTextActive: {
    color: '#FFF',
  },
  filterChipBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  filterChipBadgeActive: {
    backgroundColor: '#FFF',
  },
  filterChipBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },
  filterChipBadgeTextActive: {
    color: '#007AFF',
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailSection: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  financialSummary: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
  },
  statusItemLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  statusItemValue: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
