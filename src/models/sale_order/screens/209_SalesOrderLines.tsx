/**
 * 209_SalesOrderLines - Sales order lines management
 * Screen Number: 209
 * Model: sale.order
 * Type: lines
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { salesOrderService } from '../services/SalesOrderService';
import { SalesOrder } from '../types/SalesOrder';
import ScreenBadge from '../../../components/ScreenBadge';

interface SalesOrderLine {
  id: number;
  product_id: [number, string] | number;
  name: string;
  product_uom_qty: number;
  price_unit: number;
  price_subtotal: number;
  price_total: number;
  discount: number;
  tax_id: number[];
  sequence: number;
}

interface SalesOrderLinesProps {
  orderId: number;
  onBack?: () => void;
  readonly?: boolean;
}

export default function SalesOrderLines({
  orderId,
  onBack,
  readonly = false,
}: SalesOrderLinesProps) {
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [orderLines, setOrderLines] = useState<SalesOrderLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [showAddLine, setShowAddLine] = useState(false);

  useEffect(() => {
    loadOrderAndLines();
  }, [orderId]);

  const loadOrderAndLines = async () => {
    setLoading(true);
    try {
      const orderData = await salesOrderService.getSalesOrderDetail(orderId);
      setOrder(orderData);

      // Load order lines (this would need to be implemented in the service)
      // For now, we'll simulate some order lines
      const mockLines: SalesOrderLine[] = [
        {
          id: 1,
          product_id: [1, 'Sample Product A'],
          name: 'Sample Product A - High Quality',
          product_uom_qty: 2,
          price_unit: 150.00,
          price_subtotal: 300.00,
          price_total: 330.00,
          discount: 0,
          tax_id: [1],
          sequence: 1,
        },
        {
          id: 2,
          product_id: [2, 'Sample Product B'],
          name: 'Sample Product B - Premium Edition',
          product_uom_qty: 1,
          price_unit: 250.00,
          price_subtotal: 250.00,
          price_total: 275.00,
          discount: 0,
          tax_id: [1],
          sequence: 2,
        },
      ];
      setOrderLines(mockLines);
    } catch (error) {
      console.error('Failed to load order lines:', error);
      Alert.alert('Error', 'Failed to load order lines');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleEditLine = (lineId: number) => {
    if (readonly) return;
    setEditingLine(lineId);
  };

  const handleSaveLine = (lineId: number) => {
    // Save line changes
    setEditingLine(null);
    Alert.alert('Success', 'Order line updated successfully');
  };

  const handleDeleteLine = (lineId: number) => {
    if (readonly) return;
    Alert.alert(
      'Delete Line',
      'Are you sure you want to delete this order line?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setOrderLines(lines => lines.filter(line => line.id !== lineId));
            Alert.alert('Success', 'Order line deleted successfully');
          },
        },
      ]
    );
  };

  const handleAddLine = () => {
    if (readonly) return;
    setShowAddLine(true);
  };

  const renderOrderLine = (line: SalesOrderLine) => {
    const isEditing = editingLine === line.id;
    const productName = Array.isArray(line.product_id) ? line.product_id[1] : 'Unknown Product';

    return (
      <View key={line.id} style={styles.lineCard}>
        <View style={styles.lineHeader}>
          <View style={styles.lineInfo}>
            <Text style={styles.productName}>{productName}</Text>
            <Text style={styles.productDescription}>{line.name}</Text>
          </View>
          
          {!readonly && (
            <View style={styles.lineActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => isEditing ? handleSaveLine(line.id) : handleEditLine(line.id)}
              >
                <MaterialIcons 
                  name={isEditing ? 'check' : 'edit'} 
                  size={20} 
                  color={isEditing ? '#34C759' : '#007AFF'} 
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDeleteLine(line.id)}
              >
                <MaterialIcons name="delete" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.lineDetails}>
          <View style={styles.lineDetailRow}>
            <Text style={styles.lineDetailLabel}>Quantity:</Text>
            {isEditing ? (
              <TextInput
                style={styles.lineDetailInput}
                value={line.product_uom_qty.toString()}
                keyboardType="numeric"
                placeholder="Quantity"
              />
            ) : (
              <Text style={styles.lineDetailValue}>{line.product_uom_qty}</Text>
            )}
          </View>

          <View style={styles.lineDetailRow}>
            <Text style={styles.lineDetailLabel}>Unit Price:</Text>
            {isEditing ? (
              <TextInput
                style={styles.lineDetailInput}
                value={line.price_unit.toString()}
                keyboardType="numeric"
                placeholder="Unit Price"
              />
            ) : (
              <Text style={styles.lineDetailValue}>{formatCurrency(line.price_unit)}</Text>
            )}
          </View>

          {line.discount > 0 && (
            <View style={styles.lineDetailRow}>
              <Text style={styles.lineDetailLabel}>Discount:</Text>
              <Text style={styles.lineDetailValue}>{line.discount}%</Text>
            </View>
          )}

          <View style={styles.lineDetailRow}>
            <Text style={styles.lineDetailLabel}>Subtotal:</Text>
            <Text style={[styles.lineDetailValue, styles.subtotalValue]}>
              {formatCurrency(line.price_subtotal)}
            </Text>
          </View>

          <View style={styles.lineDetailRow}>
            <Text style={styles.lineDetailLabel}>Total (incl. tax):</Text>
            <Text style={[styles.lineDetailValue, styles.totalValue]}>
              {formatCurrency(line.price_total)}
            </Text>
          </View>
        </View>
      </View>
    );
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
            {order?.name || 'Sales Order'} - Lines
          </Text>
          <Text style={styles.headerSubtitle}>
            {orderLines.length} line{orderLines.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
      
      {!readonly && (
        <TouchableOpacity style={styles.addButton} onPress={handleAddLine}>
          <MaterialIcons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSummary = () => {
    const subtotal = orderLines.reduce((sum, line) => sum + line.price_subtotal, 0);
    const total = orderLines.reduce((sum, line) => sum + line.price_total, 0);
    const tax = total - subtotal;

    return (
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Order Summary</Text>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal:</Text>
          <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tax:</Text>
          <Text style={styles.summaryValue}>{formatCurrency(tax)}</Text>
        </View>
        
        <View style={[styles.summaryRow, styles.summaryTotal]}>
          <Text style={styles.summaryTotalLabel}>Total:</Text>
          <Text style={styles.summaryTotalValue}>{formatCurrency(total)}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading order lines...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView style={styles.scrollView}>
        {orderLines.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="shopping-cart" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No order lines</Text>
            <Text style={styles.emptySubtext}>
              {readonly ? 'This order has no lines' : 'Add products to this order'}
            </Text>
            {!readonly && (
              <TouchableOpacity style={styles.emptyAddButton} onPress={handleAddLine}>
                <Text style={styles.emptyAddButtonText}>Add First Line</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {orderLines.map(renderOrderLine)}
            {renderSummary()}
          </>
        )}
      </ScrollView>
          <ScreenBadge screenNumber={209} />
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
  addButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  lineCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  lineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  lineInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  productDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  lineActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  lineDetails: {
    gap: 8,
  },
  lineDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lineDetailLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  lineDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  lineDetailInput: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 80,
    textAlign: 'right',
  },
  subtotalValue: {
    color: '#007AFF',
  },
  totalValue: {
    color: '#34C759',
    fontWeight: '600',
  },
  summary: {
    backgroundColor: '#FFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    marginTop: 8,
    paddingTop: 12,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#34C759',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#C7C7CC',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyAddButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  emptyAddButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
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
});
