/**
 * Business Intelligence Dashboard Component
 * Real-time KPIs, charts, analytics, and business insights
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { odooReportingService } from '../services/BaseReportingService';

const { width: screenWidth } = Dimensions.get('window');

interface KPICard {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
  color: string;
}

interface ChartData {
  label: string;
  value: number;
  color: string;
}

export default function BusinessIntelligenceComponent() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'quarter'>('month');
  
  // KPI Data
  const [kpis, setKpis] = useState<KPICard[]>([]);
  const [salesData, setSalesData] = useState<ChartData[]>([]);
  const [customerData, setCustomerData] = useState<any>(null);
  const [inventoryAlerts, setInventoryAlerts] = useState<any[]>([]);

  const periods = [
    { id: 'today', name: 'Today', icon: 'today' },
    { id: 'week', name: 'Week', icon: 'date-range' },
    { id: 'month', name: 'Month', icon: 'calendar-month' },
    { id: 'quarter', name: 'Quarter', icon: 'calendar-view-month' },
  ];

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadKPIs(),
        loadSalesData(),
        loadCustomerAnalytics(),
        loadInventoryAlerts(),
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadKPIs = async () => {
    try {
      // Calculate date range based on selected period
      const now = new Date();
      let dateFrom = new Date();
      
      switch (selectedPeriod) {
        case 'today':
          dateFrom.setHours(0, 0, 0, 0);
          break;
        case 'week':
          dateFrom.setDate(now.getDate() - 7);
          break;
        case 'month':
          dateFrom.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          dateFrom.setMonth(now.getMonth() - 3);
          break;
      }

      const salesReport = await odooReportingService.getSalesReport(
        dateFrom.toISOString(),
        now.toISOString()
      );

      const financialSummary = await odooReportingService.getFinancialSummary();

      const mockKPIs: KPICard[] = [
        {
          title: 'Revenue',
          value: `$${(salesReport[0]?.revenue || 0).toLocaleString()}`,
          change: '+12.5%',
          trend: 'up',
          icon: 'trending-up',
          color: '#34C759',
        },
        {
          title: 'New Leads',
          value: (salesReport[0]?.leads || 0).toString(),
          change: '+8.2%',
          trend: 'up',
          icon: 'person-add',
          color: '#007AFF',
        },
        {
          title: 'Conversion Rate',
          value: `${(salesReport[0]?.conversion_rate || 0).toFixed(1)}%`,
          change: '-2.1%',
          trend: 'down',
          icon: 'swap-horiz',
          color: '#FF9500',
        },
        {
          title: 'Profit Margin',
          value: `${((financialSummary.profit / financialSummary.revenue) * 100 || 0).toFixed(1)}%`,
          change: '+5.3%',
          trend: 'up',
          icon: 'account-balance',
          color: '#9C27B0',
        },
      ];

      setKpis(mockKPIs);
    } catch (error) {
      console.error('Failed to load KPIs:', error);
    }
  };

  const loadSalesData = async () => {
    try {
      // Mock sales data for chart
      const mockSalesData: ChartData[] = [
        { label: 'Jan', value: 45000, color: '#007AFF' },
        { label: 'Feb', value: 52000, color: '#34C759' },
        { label: 'Mar', value: 48000, color: '#FF9500' },
        { label: 'Apr', value: 61000, color: '#9C27B0' },
        { label: 'May', value: 55000, color: '#FF3B30' },
        { label: 'Jun', value: 67000, color: '#00C7BE' },
      ];

      setSalesData(mockSalesData);
    } catch (error) {
      console.error('Failed to load sales data:', error);
    }
  };

  const loadCustomerAnalytics = async () => {
    try {
      const analytics = await odooReportingService.getCustomerAnalytics();
      setCustomerData(analytics);
    } catch (error) {
      console.error('Failed to load customer analytics:', error);
    }
  };

  const loadInventoryAlerts = async () => {
    try {
      const inventory = await odooReportingService.getInventoryReport();
      const alerts = inventory.filter(item => item.needs_reorder).slice(0, 5);
      setInventoryAlerts(alerts);
    } catch (error) {
      console.error('Failed to load inventory alerts:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const renderKPICard = (kpi: KPICard) => (
    <View key={kpi.title} style={[styles.kpiCard, { borderLeftColor: kpi.color }]}>
      <View style={styles.kpiHeader}>
        <MaterialIcons name={kpi.icon as any} size={24} color={kpi.color} />
        <View style={[styles.trendBadge, { backgroundColor: kpi.trend === 'up' ? '#E8F5E8' : '#FFE8E8' }]}>
          <MaterialIcons 
            name={kpi.trend === 'up' ? 'arrow-upward' : 'arrow-downward'} 
            size={12} 
            color={kpi.trend === 'up' ? '#34C759' : '#FF3B30'} 
          />
          <Text style={[
            styles.trendText,
            { color: kpi.trend === 'up' ? '#34C759' : '#FF3B30' }
          ]}>
            {kpi.change}
          </Text>
        </View>
      </View>
      <Text style={styles.kpiValue}>{kpi.value}</Text>
      <Text style={styles.kpiTitle}>{kpi.title}</Text>
    </View>
  );

  const renderSimpleChart = () => {
    const maxValue = Math.max(...salesData.map(d => d.value));
    
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>📊 Sales Trend</Text>
        <View style={styles.chart}>
          {salesData.map((data, index) => (
            <View key={index} style={styles.chartBar}>
              <View 
                style={[
                  styles.bar,
                  { 
                    height: (data.value / maxValue) * 100,
                    backgroundColor: data.color 
                  }
                ]} 
              />
              <Text style={styles.chartLabel}>{data.label}</Text>
              <Text style={styles.chartValue}>${(data.value / 1000).toFixed(0)}K</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <MaterialIcons name="dashboard" size={24} color="#007AFF" />
        <Text style={styles.headerTitle}>Business Intelligence</Text>
        <Text style={styles.headerSubtitle}>Real-time insights and analytics</Text>
      </View>

      {/* Period Selector */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.periodSelector}
        contentContainerStyle={styles.periodSelectorContent}
      >
        {periods.map((period) => (
          <TouchableOpacity
            key={period.id}
            style={[
              styles.periodTab,
              selectedPeriod === period.id && styles.periodTabActive
            ]}
            onPress={() => setSelectedPeriod(period.id as any)}
          >
            <MaterialIcons 
              name={period.icon as any} 
              size={20} 
              color={selectedPeriod === period.id ? '#FFF' : '#666'} 
            />
            <Text style={[
              styles.periodTabText,
              selectedPeriod === period.id && styles.periodTabTextActive
            ]}>
              {period.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* KPI Cards */}
      <View style={styles.kpiSection}>
        <Text style={styles.sectionTitle}>📈 Key Performance Indicators</Text>
        <View style={styles.kpiGrid}>
          {kpis.map(renderKPICard)}
        </View>
      </View>

      {/* Sales Chart */}
      {renderSimpleChart()}

      {/* Customer Analytics */}
      {customerData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Customer Analytics</Text>
          <View style={styles.analyticsGrid}>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsValue}>{customerData.total_customers}</Text>
              <Text style={styles.analyticsLabel}>Total Customers</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsValue}>${(customerData.total_revenue / 1000).toFixed(0)}K</Text>
              <Text style={styles.analyticsLabel}>Customer Revenue</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsValue}>{customerData.new_leads_30d}</Text>
              <Text style={styles.analyticsLabel}>New Leads (30d)</Text>
            </View>
          </View>
        </View>
      )}

      {/* Inventory Alerts */}
      {inventoryAlerts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Inventory Alerts</Text>
          {inventoryAlerts.map((item, index) => (
            <View key={index} style={styles.alertCard}>
              <MaterialIcons name="warning" size={20} color="#FF9500" />
              <View style={styles.alertInfo}>
                <Text style={styles.alertTitle}>{item.product_name}</Text>
                <Text style={styles.alertText}>
                  Stock: {item.qty_available} (Reorder at: {item.reorder_level})
                </Text>
              </View>
              <TouchableOpacity style={styles.alertAction}>
                <MaterialIcons name="shopping-cart" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction}>
            <MaterialIcons name="add-chart" size={24} color="#007AFF" />
            <Text style={styles.quickActionText}>Generate Report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <MaterialIcons name="export-notes" size={24} color="#34C759" />
            <Text style={styles.quickActionText}>Export Data</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <MaterialIcons name="settings" size={24} color="#FF9500" />
            <Text style={styles.quickActionText}>Configure</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  periodSelector: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  periodSelectorContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  periodTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
  },
  periodTabActive: {
    backgroundColor: '#007AFF',
  },
  periodTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
  },
  periodTabTextActive: {
    color: '#FFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  kpiSection: {
    padding: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  kpiCard: {
    width: (screenWidth - 48) / 2,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  kpiTitle: {
    fontSize: 14,
    color: '#666',
  },
  chartContainer: {
    backgroundColor: '#FFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 20,
    borderRadius: 4,
    marginBottom: 8,
  },
  chartLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  chartValue: {
    fontSize: 10,
    color: '#999',
  },
  section: {
    padding: 16,
  },
  analyticsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  analyticsCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  analyticsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  alertInfo: {
    flex: 1,
    marginLeft: 12,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  alertText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  alertAction: {
    padding: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickAction: {
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 12,
    color: '#1A1A1A',
    marginTop: 8,
    textAlign: 'center',
  },
});
