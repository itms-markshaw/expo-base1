/**
 * Sales Order Detail Bottom Sheet - GOOGLE MAPS STYLE
 * Simple @gorhom/bottom-sheet with working infinite scroll like Google Maps
 */

import React, { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { authService } from '../models/base/services/BaseAuthService';

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
  display_name?: string;
  product_uom_qty: number;
  price_unit: number;
  price_subtotal: number;
  discount: number;
  sequence?: number;
}

interface SalesOrderDetailBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onWorkflowActions: () => void;
  order: SalesOrder | null;
}

export default function SalesOrderDetailBottomSheet({
  visible,
  onClose,
  onWorkflowActions,
  order,
}: SalesOrderDetailBottomSheetProps) {
  // Bottom sheet refs and snap points - STABLE FOR GESTURES
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['25%', '50%', '95%'], []); // Fixed snap points for consistency

  // 🔄 Infinite Scroll State - CORRECTED SYNTAX
  const [orderLines, setOrderLines] = useState<SalesOrderLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [currentPage, setCurrentPage] = useState(0); // Fixed syntax error
  const [error, setError] = useState<string | null>(null);

  // Configuration
  const ITEMS_PER_PAGE = 20;

  // Handle visibility changes - SMOOTH OPEN/CLOSE
  useEffect(() => {
    if (visible && order) {
      console.log(`📋 Opening order: ${order.name}`);
      bottomSheetRef.current?.snapToIndex(1); // Open to 50%
      loadOrderLines(0, true);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible, order]);

  // Bottom sheet callbacks - OPTIMIZED FOR GESTURES
  const handleSheetChanges = useCallback((index: number) => {
    console.log(`📋 Sheet index: ${index}`);
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  // 📥 Load order lines with pagination
  const loadOrderLines = async (page: number = 0, reset: boolean = false) => {
    if (!order || (!hasMoreData && !reset) || loadingMore) return;

    console.log(`📥 Loading page ${page}`);
    if (page === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      const lines = await client.searchRead(
        'sale.order.line',
        [['order_id', '=', order.id]],
        ['id', 'product_id', 'name', 'display_name', 'product_uom_qty', 'price_unit', 'price_subtotal', 'discount'],
        {
          order: 'sequence asc, id asc',
          limit: ITEMS_PER_PAGE,
          offset: page * ITEMS_PER_PAGE,
        }
      );

      console.log(`✅ Loaded ${lines.length} lines`);
      if (reset) {
        setOrderLines(lines);
        setCurrentPage(0);
      } else {
        setOrderLines((prev) => [...prev, ...lines]);
        setCurrentPage(page);
      }
      setHasMoreData(lines.length === ITEMS_PER_PAGE);
      setError(null);
    } catch (error) {
      console.error('❌ Failed to load lines:', error);
      setError('Failed to load items');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // 🔄 Handle infinite scroll - OPTIMIZED
  const handleLoadMore = useCallback(() => {
    console.log(
      `🔄 onEndReached - loadingMore: ${loadingMore}, hasMoreData: ${hasMoreData}, loading: ${loading}, orderLines: ${orderLines.length}`
    );
    if (!loadingMore && hasMoreData && !loading && orderLines.length > 0) {
      console.log('🔄 Loading more data');
      loadOrderLines(currentPage + 1, false);
    }
  }, [loadingMore, hasMoreData, currentPage, loading, orderLines.length]);

  // Utility functions
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No Date';
    return new Date(dateString).toLocaleDateString();
  };

  const formatRelationalField = (field: any, fallback: string = 'Unknown') => {
    if (!field) return fallback;
    if (Array.isArray(field) && field.length > 1) return field[1];
    return fallback;
  };

  // 📋 Create data for FlatList - GOOGLE MAPS SEARCH RESULTS
  const flatListData = useMemo(() => {
    if (!order) return [];

    const data = [];
    data.push({ id: 'header', type: 'header', order });
    data.push({ id: 'status', type: 'status', order });
    orderLines.forEach((line) => {
      data.push({ id: `line-${line.id}`, type: 'line-item', line });
    });
    data.push({ id: 'total', type: 'total', order });
    return data;
  }, [order, orderLines]);

  // 🎨 Render items - GOOGLE MAPS STYLE
  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      switch (item.type) {
        case 'header':
          return (
            <View style={styles.header}>
              <View style={styles.headerMain}>
                <Text style={styles.orderNumber}>{item.order.name}</Text>
                <TouchableOpacity onPress={onWorkflowActions} style={styles.moreButton}>
                  <MaterialIcons name="more-vert" size={24} color="#007AFF" />
                </TouchableOpacity>
              </View>
              <Text style={styles.customer}>
                {formatRelationalField(item.order.partner_id, 'No Customer')}
              </Text>
              <Text style={styles.date}>{formatDate(item.order.date_order)}</Text>
            </View>
          );
        case 'status':
          return (
            <View style={styles.statusContainer}>
              <View style={styles.statusItem}>
                <MaterialIcons name="check-circle" size={16} color="#34C759" />
                <Text style={styles.statusText}>{item.order.state.toUpperCase()}</Text>
              </View>
              <View style={styles.statusItem}>
                <MaterialIcons name="receipt" size={16} color="#007AFF" />
                <Text style={styles.statusText}>
                  {item.order.invoice_status === 'invoiced' ? 'INVOICED' : 'TO INVOICE'}
                </Text>
              </View>
            </View>
          );
        case 'line-item':
          return (
            <View style={styles.lineItem}>
              <View style={styles.lineItemMain}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.line.display_name || item.line.name || 'Product'}
                </Text>
                <Text style={styles.itemPrice}>
                  {formatCurrency(item.line.price_subtotal)}
                </Text>
              </View>
              <Text style={styles.itemDetails}>
                Qty: {item.line.product_uom_qty} × {formatCurrency(item.line.price_unit)}
              </Text>
            </View>
          );
        case 'total':
          return (
            <View style={styles.totalContainer}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{formatCurrency(item.order.amount_untaxed)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax</Text>
                <Text style={styles.totalValue}>{formatCurrency(item.order.amount_tax)}</Text>
              </View>
              <View style={styles.totalRowFinal}>
                <Text style={styles.totalLabelFinal}>Total</Text>
                <Text style={styles.totalValueFinal}>{formatCurrency(item.order.amount_total)}</Text>
              </View>
            </View>
          );
        default:
          return null;
      }
    },
    [onWorkflowActions]
  );

  // 🔄 Footer for loading more - ENHANCED
  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.loadingFooter}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      );
    }
    return <View style={styles.bottomPadding} />;
  };

  // Optimize item layout for fixed-height items
  const getItemLayout = useCallback(
    (data: any, index: number) => {
      let height = 80; // Default height for line items
      if (data[index].type === 'header') height = 100;
      else if (data[index].type === 'status') height = 60;
      else if (data[index].type === 'total') height = 120;
      return { length: height, offset: height * index, index };
    },
    []
  );

  if (!order) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1} // Start closed
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={true}
      enableHandlePanningGesture={true} // Only handle drags sheet
      enableContentPanningGesture={false} // Prevent content dragging
      overDragResistanceFactor={2} // Smooth over-drag feel
      handleHeight={40} // Larger hit area for handle
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.bottomSheetHandle}
      animationConfigs={{
        duration: 300, // Smooth transitions
        damping: 80, // Google Maps-like snap
      }}
      android_keyboardInputMode="adjustResize"
    >
      <BottomSheetFlatList
        data={flatListData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        // ✨ INFINITE SCROLL - OPTIMIZED
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        // 🔄 REFRESH
        refreshing={loading}
        onRefresh={() => loadOrderLines(0, true)}
        // 📱 GOOGLE MAPS-STYLE SCROLLING
        showsVerticalScrollIndicator={true}
        bounces={true} // Enable slight bounce for natural feel
        overScrollMode="always" // Allow over-scroll
        decelerationRate="fast" // Snappy scrolling like Google Maps
        nestedScrollEnabled={true} // Prioritize FlatList scrolling
        // PERFORMANCE
        removeClippedSubviews={true}
        initialNumToRender={10} // Slightly higher for smoother initial load
        windowSize={5} // Slightly larger window for modern devices
        maxToRenderPerBatch={5} // Balanced for performance
        updateCellsBatchingPeriod={50} // Faster batching
        getItemLayout={getItemLayout} // Optimize rendering
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15, // Softer shadow for Google Maps style
    shadowRadius: 10,
    elevation: 10,
  },
  bottomSheetHandle: {
    backgroundColor: '#DCDCDC',
    width: 40, // Slightly wider handle
    height: 5,
    borderRadius: 2.5,
    marginTop: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80, // Reduced for better content visibility
  },
  // Header - Refined for Google Maps aesthetic
  header: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  moreButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F0F8FF',
  },
  customer: {
    fontSize: 15,
    color: '#666',
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    color: '#999',
  },
  // Status - Tighter spacing
  statusContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  // Line Items - Cleaner design
  lineItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  lineItemMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 10,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  itemDetails: {
    fontSize: 13,
    color: '#666',
  },
  // Total - More prominent
  totalContainer: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    marginTop: 6,
    borderRadius: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  totalRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  totalLabelFinal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  totalValueFinal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#34C759',
  },
  // Loading & Error
  loadingFooter: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  bottomPadding: {
    height: 40, // Reduced for better content fit
  },
  errorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 10,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 6,
  },
  errorText: {
    fontSize: 13,
    color: '#C62828',
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#C62828',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  retryText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
});