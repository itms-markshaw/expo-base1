/**
 * Home Screen - Actually shows real data
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../store';

export default function HomeScreen() {
  const {
    user,
    databaseStats,
    syncStatus,
    loadDatabaseStats,
    startSync,
  } = useAppStore();

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
          <View>
            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <MaterialIcons name="account-circle" size={32} color="#007AFF" />
          </TouchableOpacity>
        </View>

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
          
          <View style={styles.statCard}>
            <MaterialIcons name="storage" size={24} color="#FF9500" />
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
    paddingBottom: 24,
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
});
