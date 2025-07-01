import React, { useMemo, useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { authService } from '../services/auth';

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
  display_name?: string;
}

interface SalesOrderDetailBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onWorkflowActions: () => void;
  order: SalesOrder | null;
}

const { height: screenHeight } = Dimensions.get('window');

export default function SalesOrderDetailBottomSheet({
  visible,
  onClose,
  onWorkflowActions,
  order,
}: SalesOrderDetailBottomSheetProps) {
  const [orderLines, setOrderLines] = useState<SalesOrderLine[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreData, setHasMoreData] = useState(true);

  const ITEMS_PER_PAGE = 20;

  // Utility functions
  const formatCurrency = (amount: number, currencySymbol: string = '$') => {
    return `${currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No Date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatRelationalField = (field: any, fallback: string = 'Unknown') => {
    if (!field) return fallback;
    if (Array.isArray(field) && field.length > 1) {
      return field[1];
    }
    return fallback;
  };

  // Infinite scroll implementation
  const loadOrderLines = async (page: number = 0, reset: boolean = false) => {
    if (!order || (!hasMoreData && !reset)) return;
    
    if (page === 0) {
      setLoadingLines(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const client = authService.getClient();
      if (!client) return;

      const lines = await client.searchRead('sale.order.line',
        [['order_id', '=', order.id]],
        ['id', 'product_id', 'name', 'display_name', 'product_uom_qty', 'price_unit', 'price_subtotal', 'discount'],
        { 
          order: 'sequence asc',
          limit: ITEMS_PER_PAGE,
          offset: page * ITEMS_PER_PAGE
        }
      );

      if (reset) {
        setOrderLines(lines);
      } else {
        setOrderLines(prev => [...prev, ...lines]);
      }

      setHasMoreData(lines.length === ITEMS_PER_PAGE);
      setCurrentPage(page);
      
    } catch (error) {
      console.error('Error loading order lines:', error);
    } finally {
      setLoadingLines(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMoreData) {
      loadOrderLines(currentPage + 1);
    }
  };

  // Debug visibility changes
  useEffect(() => {
    console.log('BottomSheet visibility changed:', visible, 'order:', order?.name);
  }, [visible, order]);

  // Load initial data
  useEffect(() => {
    if (order && visible) {
      loadOrderLines(0, true);
    }
  }, [order?.id, visible]);



  // Create flat data structure
  const flatListData = useMemo(() => {
    if (!order) return [];
    
    const data = [];
    
    // Order Information
    data.push({
      id: 'order-info',
      type: 'section',
      title: 'Order Information',
      content: [
        { label: 'Customer', value: formatRelationalField(order.partner_id, 'No Customer') },
        { label: 'Date', value: formatDate(order.date_order) },
        { label: 'Salesperson', value: formatRelationalField(order.user_id) },
        { label: 'Sales Team', value: formatRelationalField(order.team_id) },
      ]
    });

    // Status
    data.push({
      id: 'status',
      type: 'status',
      title: 'Status',
      orderStatus: order.state,
      invoiceStatus: order.invoice_status,
      deliveryStatus: order.delivery_status,
    });

    // Line Items Header
    data.push({
      id: 'line-items-header',
      type: 'section-header',
      title: 'Line Items'
    });

    // Each Line Item
    orderLines.forEach(line => {
      data.push({
        id: `line-${line.id}`,
        type: 'line-item',
        line
      });
    });

    // Financial Summary
    data.push({
      id: 'financial-summary',
      type: 'section',
      title: 'Financial Summary',
      content: [
        { label: 'Subtotal', value: formatCurrency(order.amount_untaxed) },
        { label: 'Tax', value: formatCurrency(order.amount_tax) },
        { label: 'Total', value: formatCurrency(order.amount_total), isTotal: true },
      ]
    });

    return data;
  }, [order, orderLines]);

  // Render function
  const renderItem = useCallback(({ item }: { item: any }) => {
    switch (item.type) {
      case 'section':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{item.title}</Text>
            {item.content.map((info: any, index: number) => (
              <View key={index} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{info.label}:</Text>
                <Text style={[styles.infoValue, info.isTotal && styles.totalValue]}>
                  {info.value}
                </Text>
              </View>
            ))}
          </View>
        );
      
      case 'status':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{item.title}</Text>
            <View style={styles.statusGrid}>
              <View style={styles.statusItem}>
                <MaterialIcons 
                  name="check-circle" 
                  size={24} 
                  color={item.orderStatus === 'sale' ? '#4CAF50' : '#FFC107'} 
                />
                <Text style={styles.statusItemLabel}>Order Status</Text>
                <Text style={[styles.statusItemValue, { color: item.orderStatus === 'sale' ? '#4CAF50' : '#FFC107' }]}>
                  {item.orderStatus?.toUpperCase() || 'SALE'}
                </Text>
              </View>
              <View style={styles.statusItem}>
                <MaterialIcons 
                  name="receipt" 
                  size={24} 
                  color={item.invoiceStatus === 'invoiced' ? '#4CAF50' : '#FF9800'} 
                />
                <Text style={styles.statusItemLabel}>Invoice</Text>
                <Text style={[styles.statusItemValue, { color: item.invoiceStatus === 'invoiced' ? '#4CAF50' : '#FF9800' }]}>
                  {item.invoiceStatus === 'invoiced' ? 'Invoiced' : 'Pending'}
                </Text>
              </View>
              <View style={styles.statusItem}>
                <MaterialIcons 
                  name="local-shipping" 
                  size={24} 
                  color={item.deliveryStatus === 'full' ? '#4CAF50' : '#FF9800'} 
                />
                <Text style={styles.statusItemLabel}>Delivery</Text>
                <Text style={[styles.statusItemValue, { color: item.deliveryStatus === 'full' ? '#4CAF50' : '#FF9800' }]}>
                  {item.deliveryStatus === 'full' ? 'Delivered' : 'Pending'}
                </Text>
              </View>
            </View>
          </View>
        );
      
      case 'section-header':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{item.title}</Text>
          </View>
        );
      
      case 'line-item':
        return (
          <View style={styles.lineItem}>
            <View style={styles.lineItemHeader}>
              <Text style={styles.lineItemName}>{item.line.display_name || item.line.name}</Text>
              <Text style={styles.lineItemPrice}>{formatCurrency(item.line.price_subtotal)}</Text>
            </View>
            <Text style={styles.lineItemDetails}>
              Qty: {item.line.product_uom_qty} × {formatCurrency(item.line.price_unit)}
            </Text>
          </View>
        );
      
      default:
        return null;
    }
  }, []);

  if (!order) {
    console.log('No order provided to BottomSheet');
    return null;
  }

  console.log('Rendering Modal for order:', order.name, 'visible:', visible);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{order.name}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Content with Working Infinite Scroll */}
        <FlatList
          data={flatListData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          bounces={true}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>Loading more...</Text>
              </View>
            ) : null
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  bottomSheetBackground: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  bottomSheetHandle: {
    backgroundColor: '#DDD',
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
    flexGrow: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  totalValue: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1A1A1A',
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
  },
  statusItemLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  statusItemValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  lineItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  lineItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 12,
  },
  lineItemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  lineItemDetails: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
});
