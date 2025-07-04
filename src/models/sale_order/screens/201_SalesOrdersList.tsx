/**
 * 201_SalesOrdersList - Main sales orders list view
 * Screen Number: 201
 * Model: sale.order
 * Type: list
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import BaseListView from '../../base/components/BaseListView';
import { salesOrderService } from '../services/SalesOrderService';
import { SalesOrder, SalesOrderFilters, SALES_ORDER_STATES } from '../types/SalesOrder';
import SalesOrderCard from '../components/SalesOrderCard';
import ScreenBadge from '../../../components/ScreenBadge';

export default function SalesOrdersList() {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const filters = [
    { id: 'draft', label: 'Draft', value: { state: 'draft' } },
    { id: 'sent', label: 'Sent', value: { state: 'sent' } },
    { id: 'sale', label: 'Sales Order', value: { state: 'sale' } },
    { id: 'done', label: 'Done', value: { state: 'done' } },
    { id: 'cancel', label: 'Cancelled', value: { state: 'cancel' } },
  ];

  useEffect(() => {
    loadSalesOrders();
  }, []);

  const loadSalesOrders = async () => {
    setLoading(true);
    try {
      const ordersData = await salesOrderService.searchSalesOrders({
        query: searchQuery,
        filters: getActiveFilters(),
        sortBy: 'date_order',
        sortOrder: 'desc',
      });
      setSalesOrders(ordersData);
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

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim() || activeFilter !== 'all') {
      await loadSalesOrders();
    }
  };

  const handleFilterChange = async (filterId: string) => {
    setActiveFilter(filterId);
    await loadSalesOrders();
  };

  const handleOrderPress = (order: SalesOrder) => {
    // Navigate to sales order detail screen (202)
    console.log('Navigate to sales order detail:', order.id);
    // TODO: Implement navigation to 202_SalesOrderDetail
  };

  const handleAddOrder = () => {
    // Navigate to create sales order screen (204)
    console.log('Navigate to create sales order');
    // TODO: Implement navigation to 204_SalesOrderCreate
  };

  const getActiveFilters = (): SalesOrderFilters => {
    const filter = filters.find(f => f.id === activeFilter);
    return filter ? filter.value as SalesOrderFilters : {};
  };

  const renderOrderItem = (order: SalesOrder) => (
    <SalesOrderCard
      order={order}
      onPress={() => handleOrderPress(order)}
    />
  );

  const getHeaderSubtitle = () => {
    const filterLabel = filters.find(f => f.id === activeFilter)?.label || 'All orders';
    const totalAmount = salesOrders.reduce((sum, order) => sum + order.amount_total, 0);
    return `${filterLabel} • ${salesOrders.length} orders • $${totalAmount.toLocaleString()}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <BaseListView
        data={salesOrders}
        loading={loading}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onItemPress={handleOrderPress}
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        filters={filters}
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        renderItem={renderOrderItem}
        headerTitle="Sales Orders"
        headerSubtitle={getHeaderSubtitle()}
        emptyStateIcon="shopping-cart"
        emptyStateTitle="No sales orders found"
        emptyStateSubtext={
          searchQuery 
            ? "Try adjusting your search terms" 
            : "Create your first sales order to get started"
        }
        showSearch={true}
        showFilters={true}
        showAddButton={true}
        onAddPress={handleAddOrder}
      />
      <ScreenBadge screenNumber={201} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});
