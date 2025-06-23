/**
 * ERP Dashboard Screen
 * Professional navigation-based dashboard interface
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../store';
import { useNavigation } from '../components/AppNavigationProvider';

const { width: screenWidth } = Dimensions.get('window');

interface DashboardModule {
  id: string;
  name: string;
  icon: string;
  color: string;
  count?: number;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  onPress: () => void;
}

interface QuickAction {
  id: string;
  name: string;
  icon: string;
  color: string;
  onPress: () => void;
}

export default function ERPDashboardScreen() {
  const {
    user,
    databaseStats,
    syncStatus,
    loadDatabaseStats,
    startSync,
  } = useAppStore();

  const { showNavigationDrawer, showUniversalSearch, navigateToScreen } = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDatabaseStats();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDatabaseStats();
    setRefreshing(false);
  };



  const dashboardModules: DashboardModule[] = [
    {
      id: 'contacts',
      name: 'Contacts',
      icon: 'people',
      color: '#007AFF',
      count: databaseStats?.tables?.find((t: any) => t.name === 'contacts')?.recordCount || 0,
      trend: 'up',
      trendValue: '+5%',
      onPress: () => navigateToScreen('Contacts'),
    },
    {
      id: 'sales',
      name: 'Sales Orders',
      icon: 'shopping-cart',
      color: '#34C759',
      count: databaseStats?.tables?.find((t: any) => t.name === 'sale_orders')?.recordCount || 0,
      trend: 'up',
      trendValue: '+12%',
      onPress: () => navigateToScreen('Sales Orders'),
    },
    {
      id: 'activities',
      name: 'Activities',
      icon: 'event-note',
      color: '#9C27B0',
      count: databaseStats?.tables?.find((t: any) => t.name === 'activities')?.recordCount || 24,
      trend: 'up',
      trendValue: '+3%',
      onPress: () => navigateToScreen('Activities'),
    },
    {
      id: 'calendar',
      name: 'Calendar',
      icon: 'event',
      color: '#FF3B30',
      count: databaseStats?.tables?.find((t: any) => t.name === 'calendar_events')?.recordCount || 8,
      onPress: () => navigateToScreen('Calendar'),
    },
    {
      id: 'employees',
      name: 'Employees',
      icon: 'badge',
      color: '#FF6B35',
      count: databaseStats?.tables?.find((t: any) => t.name === 'employees')?.recordCount || 0,
      trend: 'stable',
      onPress: () => navigateToScreen('Employees'),
    },
    {
      id: 'leads',
      name: 'CRM Leads',
      icon: 'trending-up',
      color: '#FF9500',
      count: databaseStats?.tables?.find((t: any) => t.name === 'crm_leads')?.recordCount || 0,
      trend: 'up',
      trendValue: '+8%',
      onPress: () => navigateToScreen('CRM Leads'),
    },
    {
      id: 'messages',
      name: 'Messages',
      icon: 'message',
      color: '#007AFF',
      count: databaseStats?.tables?.find((t: any) => t.name === 'messages')?.recordCount || 0,
      trend: 'up',
      trendValue: '+15%',
      onPress: () => navigateToScreen('Messages'),
    },
    {
      id: 'attachments',
      name: 'Attachments',
      icon: 'attach-file',
      color: '#34C759',
      count: databaseStats?.tables?.find((t: any) => t.name === 'attachments')?.recordCount || 0,
      trend: 'up',
      trendValue: '+7%',
      onPress: () => navigateToScreen('Attachments'),
    },
    {
      id: 'projects',
      name: 'Projects',
      icon: 'folder',
      color: '#FF9500',
      count: databaseStats?.tables?.find((t: any) => t.name === 'projects')?.recordCount || 0,
      trend: 'stable',
      onPress: () => navigateToScreen('Projects'),
    },
    {
      id: 'mobile',
      name: 'Field Service',
      icon: 'smartphone',
      color: '#9C27B0',
      count: 12, // Mock data for field tasks
      trend: 'up',
      trendValue: '+4%',
      onPress: () => navigateToScreen('Mobile'),
    },
    {
      id: 'helpdesk',
      name: 'Helpdesk',
      icon: 'support',
      color: '#FF3B30',
      count: databaseStats?.tables?.find((t: any) => t.name === 'helpdesk_tickets')?.recordCount || 0,
      trend: 'up',
      trendValue: '+6%',
      onPress: () => navigateToScreen('Helpdesk'),
    },
    {
      id: 'sync',
      name: 'Data Sync',
      icon: 'sync',
      color: '#666',
      count: databaseStats?.tables?.length || 0,
      trend: 'stable',
      onPress: () => navigateToScreen('Sync'),
    },
  ];

  const quickActions: QuickAction[] = [
    {
      id: 'new-order',
      name: 'New Order',
      icon: 'add-shopping-cart',
      color: '#34C759',
      onPress: () => navigateToScreen('Sales Orders'),
    },
    {
      id: 'new-contact',
      name: 'Add Contact',
      icon: 'person-add',
      color: '#007AFF',
      onPress: () => navigateToScreen('Contacts'),
    },
    {
      id: 'new-activity',
      name: 'Schedule Task',
      icon: 'add-task',
      color: '#FF9500',
      onPress: () => navigateToScreen('Activities'),
    },
    {
      id: 'sync-data',
      name: 'Sync Data',
      icon: 'sync',
      color: '#9C27B0',
      onPress: () => navigateToScreen('Sync'),
    },
  ];

  const renderModuleCard = (module: DashboardModule) => (
    <TouchableOpacity
      key={module.id}
      style={[styles.moduleCard, { borderLeftColor: module.color }]}
      onPress={module.onPress}
    >
      <View style={styles.moduleHeader}>
        <View style={[styles.moduleIcon, { backgroundColor: module.color + '15' }]}>
          <MaterialIcons name={module.icon as any} size={18} color={module.color} />
        </View>
        <View style={styles.moduleInfo}>
          <Text style={styles.moduleName}>{module.name}</Text>
          <Text style={styles.moduleCount}>{module.count?.toLocaleString() || '0'}</Text>
        </View>
        {module.trend && (
          <View style={styles.trendContainer}>
            <MaterialIcons
              name={module.trend === 'up' ? 'trending-up' : module.trend === 'down' ? 'trending-down' : 'trending-flat'}
              size={12}
              color={module.trend === 'up' ? '#34C759' : module.trend === 'down' ? '#FF3B30' : '#666'}
            />
            {module.trendValue && (
              <Text style={[
                styles.trendValue,
                { color: module.trend === 'up' ? '#34C759' : module.trend === 'down' ? '#FF3B30' : '#666' }
              ]}>
                {module.trendValue}
              </Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderQuickAction = (action: QuickAction) => (
    <TouchableOpacity
      key={action.id}
      style={styles.quickActionCard}
      onPress={action.onPress}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
        <MaterialIcons name={action.icon as any} size={20} color="#FFF" />
      </View>
      <Text style={styles.quickActionText}>{action.name}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.welcomeText}>Welcome back</Text>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={showUniversalSearch}
          >
            <MaterialIcons name="search" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={showNavigationDrawer}
          >
            <MaterialIcons name="account-circle" size={32} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Universal Search Bar */}
      <TouchableOpacity
        style={styles.searchBar}
        onPress={showUniversalSearch}
      >
        <MaterialIcons name="search" size={20} color="#666" />
        <Text style={styles.searchPlaceholder}>Search everything...</Text>
        <MaterialIcons name="mic" size={20} color="#666" />
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map(renderQuickAction)}
          </View>
        </View>

        {/* Business Modules */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Modules</Text>
          <View style={styles.modulesGrid}>
            {dashboardModules.map(renderModuleCard)}
          </View>
        </View>

        {/* Sync Status */}
        {syncStatus.isRunning && (
          <View style={styles.section}>
            <View style={styles.syncCard}>
              <View style={styles.syncHeader}>
                <MaterialIcons name="sync" size={20} color="#007AFF" />
                <Text style={styles.syncTitle}>Syncing Data...</Text>
              </View>
              <Text style={styles.syncProgress}>
                {syncStatus.currentModel ? `Current: ${syncStatus.currentModel}` : ''}
              </Text>
              <Text style={styles.syncProgress}>
                Progress: {syncStatus.progress}% ({syncStatus.syncedRecords}/{syncStatus.totalRecords})
              </Text>
            </View>
          </View>
        )}

        {/* System Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Overview</Text>
          <View style={styles.overviewCard}>
            <View style={styles.overviewItem}>
              <MaterialIcons name="storage" size={24} color="#9C27B0" />
              <Text style={styles.overviewValue}>{databaseStats?.totalRecords || 0}</Text>
              <Text style={styles.overviewLabel}>Total Records</Text>
            </View>
            <View style={styles.overviewItem}>
              <MaterialIcons name="sync" size={24} color="#34C759" />
              <Text style={styles.overviewValue}>
                {databaseStats?.tables?.length || 0}
              </Text>
              <Text style={styles.overviewLabel}>Synced Tables</Text>
            </View>
            <View style={styles.overviewItem}>
              <MaterialIcons name="schedule" size={24} color="#FF9500" />
              <Text style={styles.overviewValue}>
                {databaseStats?.tables?.[0]?.lastSync 
                  ? new Date(databaseStats.tables[0].lastSync * 1000).toLocaleDateString()
                  : 'Never'
                }
              </Text>
              <Text style={styles.overviewLabel}>Last Sync</Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#FFF',
  },
  headerLeft: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  searchButton: {
    padding: 8,
    borderRadius: 8,
  },
  profileButton: {
    padding: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 12,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: '#999',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  moduleCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 8,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    width: '48%',
    marginBottom: 8,
    minHeight: 60,
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moduleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  moduleCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trendValue: {
    fontSize: 10,
    fontWeight: '600',
  },
  syncCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
  },
  syncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  syncTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  syncProgress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  overviewCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overviewItem: {
    alignItems: 'center',
    flex: 1,
  },
  overviewValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 8,
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});
