/**
 * Home Screen - Actually shows real data
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../store';
import ActivitiesComponent from '../components/ActivitiesComponent';
import UniversalSearchComponent from '../components/UniversalSearchComponent';
import NavigationDrawer from '../components/NavigationDrawer';
import { NavigationService, NavigationItem } from '../navigation/NavigationConfig';

export default function HomeScreen() {
  const {
    user,
    databaseStats,
    syncStatus,
    loadDatabaseStats,
    startSync,
  } = useAppStore();

  const [showActivities, setShowActivities] = useState(false);
  const [showUniversalSearch, setShowUniversalSearch] = useState(false);
  const [showNavigationDrawer, setShowNavigationDrawer] = useState(false);

  useEffect(() => {
    loadDatabaseStats();
  }, []);

  const handleRefresh = () => {
    loadDatabaseStats();
  };

  const handleQuickSync = () => {
    if (!syncStatus.isRunning) {
      startSync();
    }
  };

  const handleNavigate = (item: NavigationItem) => {
    console.log('Navigate to:', item.name);
    // In a real app, this would use React Navigation
    // navigation.navigate(item.component);
  };

  const handleRecordSelect = (model: string, recordId: number) => {
    console.log('Open record:', model, recordId);
    // In a real app, this would navigate to the record detail
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => setShowUniversalSearch(true)}
            >
              <MaterialIcons name="search" size={24} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => setShowNavigationDrawer(true)}
            >
              <MaterialIcons name="account-circle" size={32} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Universal Search Bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => setShowUniversalSearch(true)}
        >
          <MaterialIcons name="search" size={20} color="#666" />
          <Text style={styles.searchPlaceholder}>Search everything...</Text>
          <MaterialIcons name="mic" size={20} color="#666" />
        </TouchableOpacity>

        {/* Database Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialIcons name="contacts" size={24} color="#007AFF" />
            <Text style={styles.statValue}>
              {databaseStats?.tables?.find((t: any) => t.name === 'contacts')?.recordCount || 0}
            </Text>
            <Text style={styles.statLabel}>Contacts</Text>
          </View>

          <View style={styles.statCard}>
            <MaterialIcons name="people" size={24} color="#34C759" />
            <Text style={styles.statValue}>
              {databaseStats?.tables?.find((t: any) => t.name === 'users')?.recordCount || 0}
            </Text>
            <Text style={styles.statLabel}>Users</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialIcons name="badge" size={24} color="#FF6B35" />
            <Text style={styles.statValue}>
              {databaseStats?.tables?.find((t: any) => t.name === 'employees')?.recordCount || 0}
            </Text>
            <Text style={styles.statLabel}>Employees</Text>
          </View>

          <View style={styles.statCard}>
            <MaterialIcons name="trending-up" size={24} color="#FF9500" />
            <Text style={styles.statValue}>
              {databaseStats?.tables?.find((t: any) => t.name === 'crm_leads')?.recordCount || 0}
            </Text>
            <Text style={styles.statLabel}>CRM Leads</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { flex: 2 }]}>
            <MaterialIcons name="storage" size={24} color="#9C27B0" />
            <Text style={styles.statValue}>{databaseStats?.totalRecords || 0}</Text>
            <Text style={styles.statLabel}>Total Records</Text>
          </View>
        </View>

        {/* Sync Status */}
        {syncStatus.isRunning ? (
          <View style={styles.syncStatusCard}>
            <View style={styles.syncHeader}>
              <MaterialIcons name="sync" size={20} color="#007AFF" />
              <Text style={styles.syncTitle}>Syncing...</Text>
            </View>
            <Text style={styles.syncProgress}>
              {syncStatus.currentModel ? `Current: ${syncStatus.currentModel}` : ''}
            </Text>
            <Text style={styles.syncProgress}>
              Progress: {syncStatus.progress}% ({syncStatus.syncedRecords}/{syncStatus.totalRecords})
            </Text>
          </View>
        ) : null}

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionCard, syncStatus.isRunning && styles.actionCardDisabled]}
            onPress={handleQuickSync}
            disabled={syncStatus.isRunning}
          >
            <MaterialIcons
              name={syncStatus.isRunning ? "hourglass-empty" : "sync"}
              size={32}
              color={syncStatus.isRunning ? "#999" : "#007AFF"}
            />
            <View style={styles.actionText}>
              <Text style={[styles.actionTitle, syncStatus.isRunning && styles.actionTitleDisabled]}>
                {syncStatus.isRunning ? 'Syncing...' : 'Quick Sync'}
              </Text>
              <Text style={styles.actionSubtitle}>
                {syncStatus.isRunning ? 'Please wait' : 'Sync recent changes'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, styles.activitiesCard]}
            onPress={() => setShowActivities(true)}
          >
            <MaterialIcons
              name="event-note"
              size={32}
              color="#FF9500"
            />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>My Activities</Text>
              <Text style={styles.actionSubtitle}>View today's tasks and schedule</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        {/* Last Sync Info */}
        {databaseStats?.tables ? (
          <View style={styles.lastSyncContainer}>
            <Text style={styles.lastSyncTitle}>Last Sync</Text>
            {databaseStats.tables.map((table: any) => (
              <View key={table.name} style={styles.lastSyncItem}>
                <Text style={styles.lastSyncModel}>{table.name}</Text>
                <Text style={styles.lastSyncTime}>
                  {table.lastSync
                    ? new Date(table.lastSync * 1000).toLocaleString()
                    : 'Never'
                  }
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Errors */}
        {syncStatus.errors.length > 0 ? (
          <View style={styles.errorsContainer}>
            <Text style={styles.errorsTitle}>Sync Errors</Text>
            {syncStatus.errors.map((error, index) => (
              <Text key={index} style={styles.errorText}>{error}</Text>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {/* Activities Modal */}
      <Modal
        visible={showActivities}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowActivities(false)}
      >
        <SafeAreaView style={styles.activitiesModal}>
          <View style={styles.activitiesHeader}>
            <TouchableOpacity onPress={() => setShowActivities(false)}>
              <MaterialIcons name="close" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.activitiesTitle}>My Activities</Text>
            <View style={{ width: 24 }} />
          </View>
          <ActivitiesComponent />
        </SafeAreaView>
      </Modal>

      {/* Universal Search Modal */}
      <UniversalSearchComponent
        visible={showUniversalSearch}
        onClose={() => setShowUniversalSearch(false)}
        onNavigate={handleNavigate}
        onRecordSelect={handleRecordSelect}
      />

      {/* Navigation Drawer */}
      <NavigationDrawer
        visible={showNavigationDrawer}
        onClose={() => setShowNavigationDrawer(false)}
        onNavigate={handleNavigate}
        currentRoute="home"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchButton: {
    padding: 8,
    borderRadius: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
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
    marginBottom: 24,
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
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
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  syncStatusCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 24,
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
  actionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionCardDisabled: {
    opacity: 0.6,
  },
  activitiesCard: {
    marginTop: 12,
  },
  actionText: {
    marginLeft: 16,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  actionTitleDisabled: {
    color: '#999',
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  lastSyncContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lastSyncTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  lastSyncItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  lastSyncModel: {
    fontSize: 14,
    color: '#1A1A1A',
    textTransform: 'capitalize',
  },
  lastSyncTime: {
    fontSize: 12,
    color: '#666',
  },
  errorsContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  errorsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D32F2F',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#D32F2F',
    marginBottom: 4,
  },
  activitiesModal: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  activitiesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  activitiesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
});
