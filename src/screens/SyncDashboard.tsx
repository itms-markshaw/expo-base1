/**
 * Sync Dashboard - Main Hub for Offline Sync Management
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { useAppStore } from '../store';
import { syncService } from '../services/sync';
import { databaseService } from '../services/database';

interface SyncStats {
  totalModels: number;
  syncedModels: number;
  totalRecords: number;
  dataSize: string;
  lastSync: Date | null;
  conflicts: number;
}

type RootStackParamList = {
  SyncModels: undefined;
  SyncSettings: undefined;
  SyncProgress: undefined;
  SyncConflicts: undefined;
};

export default function SyncDashboard() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { syncStatus, syncSettings, selectedModels } = useAppStore();
  
  const [isOnline, setIsOnline] = useState(true);
  const [syncStats, setSyncStats] = useState<SyncStats>({
    totalModels: 844,
    syncedModels: 0, // This will be calculated from database
    totalRecords: 0,
    dataSize: '0 MB',
    lastSync: null, // Will be loaded from database
    conflicts: 0, // Will be calculated from actual conflicts
  });
  const [isLoading, setIsLoading] = useState(false);
  const [syncActivity, setSyncActivity] = useState<Array<{time: string, records: number}>>([]);

  // Helper function to format data size
  const formatDataSize = (bytes: number): string => {
    if (bytes === 0) return '0 MB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Load sync statistics
  const loadSyncStats = useCallback(async () => {
    try {
      // CRITICAL: Initialize database FIRST
      await databaseService.initialize();
      console.log('✅ Database initialized before loading sync stats');

      const metadata = await databaseService.getAllSyncMetadata();
      const syncedModels = metadata.length;
      const totalRecords = metadata.reduce((sum, m) => sum + (m.record_count || 0), 0);
      const dataSize = formatDataSize(totalRecords * 1024); // Rough estimate

      // Get last sync time - use correct column name from database schema
      const lastSyncTimes = metadata.map(m => m.last_sync_timestamp).filter(Boolean);
      const lastSync = lastSyncTimes.length > 0 ? new Date(Math.max(...lastSyncTimes.map(d => new Date(d).getTime()))) : null;

      console.log('📊 Sync metadata loaded:', {
        syncedModels,
        totalRecords,
        lastSyncTimes: lastSyncTimes.slice(0, 3), // Show first 3 for debugging
        lastSync: lastSync?.toISOString()
      });

      // Get actual conflicts count (for now set to 0, will implement conflict detection later)
      const conflicts = 0;

      setSyncStats(prev => ({
        ...prev,
        syncedModels,
        totalRecords,
        dataSize,
        lastSync,
        conflicts,
      }));
    } catch (error) {
      console.error('Failed to load sync stats:', error);
    }
  }, []);

  // Load sync activity data for chart
  const loadSyncActivity = useCallback(async () => {
    try {
      // Generate mock data for demonstration - in real app this would come from sync logs
      const now = new Date();
      const activities = [];

      // Generate hourly data for the last 12 hours
      for (let i = 11; i >= 0; i--) {
        const time = new Date(now.getTime() - (i * 60 * 60 * 1000));
        const hour = time.getHours();

        // Simulate more activity during business hours (9-17)
        let records = 0;
        if (hour >= 9 && hour <= 17) {
          records = Math.floor(Math.random() * 50) + 10; // 10-60 records
        } else {
          records = Math.floor(Math.random() * 20); // 0-20 records
        }

        activities.push({
          time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          records
        });
      }

      setSyncActivity(activities);
    } catch (error) {
      console.error('Failed to load sync activity:', error);
    }
  }, []);

  // Render sync activity chart
  const renderSyncChart = () => {
    if (syncActivity.length === 0) {
      return (
        <View style={styles.chartPlaceholder}>
          <MaterialIcons name="show-chart" size={32} color="#ccc" />
          <Text style={styles.chartPlaceholderText}>No sync activity yet</Text>
        </View>
      );
    }

    const maxRecords = Math.max(...syncActivity.map(a => a.records));

    return (
      <View style={styles.chart}>
        <View style={styles.chartBars}>
          {syncActivity.map((activity, index) => (
            <View key={index} style={styles.chartBarContainer}>
              <View
                style={[
                  styles.chartBar,
                  {
                    height: maxRecords > 0 ? (activity.records / maxRecords) * 60 : 0,
                    backgroundColor: activity.records > 30 ? '#4CAF50' : activity.records > 10 ? '#FF9800' : '#E0E0E0'
                  }
                ]}
              />
              <Text style={styles.chartBarLabel}>{activity.time.slice(0, 2)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.chartLegend}>
          <Text style={styles.chartLegendText}>
            Total: {syncActivity.reduce((sum, a) => sum + a.records, 0)} records today
          </Text>
        </View>
      </View>
    );
  };

  // Perform quick sync
  const handleQuickSync = useCallback(async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot sync while offline');
      return;
    }

    setIsLoading(true);
    try {
      // Navigate to sync progress screen
      navigation.navigate('SyncProgress');
    } catch (error) {
      console.error('Sync failed:', error);
      Alert.alert('Sync Failed', 'Unable to start sync process');
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, navigation]);

  // Load data on mount
  useEffect(() => {
    loadSyncStats();
    loadSyncActivity();
  }, [loadSyncStats, loadSyncActivity]);

  // No need to update sync stats when selected models change since we use selectedModels.length directly

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>

        {/* Last Sync Status */}
        <View style={styles.syncStatusCard}>
          <View style={styles.syncStatusLeft}>
            <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
            <View style={styles.syncStatusTextContainer}>
              <Text style={styles.syncStatusTitle}>
                {syncStats.lastSync ? "Last sync completed" : "Never synced"}
              </Text>
              <Text style={styles.syncStatusTime}>
                {syncStats.lastSync ? syncStats.lastSync.toLocaleString() : "Tap Sync Now to start"}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.syncButton, isLoading && styles.syncButtonDisabled]} 
            onPress={handleQuickSync}
            disabled={isLoading || !isOnline}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <MaterialIcons name="sync" size={20} color="white" />
                <Text style={styles.syncButtonText}>Sync Now</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialIcons name="storage" size={32} color="#2196F3" />
            <Text style={styles.statNumber}>{selectedModels.length}</Text>
            <Text style={styles.statLabel}>Selected Models</Text>
            <Text style={styles.statSubtext}>ready to sync</Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialIcons name="schedule" size={32} color="#FF9800" />
            <Text style={styles.statNumber}>{syncSettings.globalTimePeriod || '3 Days'}</Text>
            <Text style={styles.statLabel}>Sync Period</Text>
            <Text style={styles.statSubtext}>current setting</Text>
          </View>
        </View>

        {/* Sync Activity Chart */}
        <View style={styles.chartContainer}>
          <View style={styles.chartHeader}>
            <MaterialIcons name="trending-up" size={20} color="#666" />
            <Text style={styles.chartTitle}>Sync Activity</Text>
            <Text style={styles.chartSubtitle}>Records synced today</Text>
          </View>
          <View style={styles.chartContent}>
            {renderSyncChart()}
          </View>
        </View>

        {/* Navigation Cards */}
        <View style={styles.navigationContainer}>
          {/* Conflicts Navigation Card - Only show if there are actual conflicts */}
          {syncStats.conflicts > 0 && (
            <TouchableOpacity
              style={styles.navCard}
              onPress={() => navigation.navigate('SyncConflicts')}
            >
              <MaterialIcons name="warning" size={24} color="#FF9800" />
              <Text style={styles.navCardText}>
                {syncStats.conflicts} conflicts need attention
              </Text>
              <MaterialIcons name="chevron-right" size={24} color="#666" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.navCard}
            onPress={() => {
              console.log('🔄 Navigating to SyncModels...');
              navigation.navigate('SyncModels');
            }}
          >
            <MaterialIcons name="storage" size={24} color="#666" />
            <Text style={styles.navCardText}>Manage Models</Text>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navCard}
            onPress={() => {
              console.log('🔄 Navigating to DatabaseManager...');
              navigation.navigate('DatabaseManager');
            }}
          >
            <MaterialIcons name="storage" size={24} color="#666" />
            <Text style={styles.navCardText}>Database Manager</Text>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navCard}
            onPress={() => {
              console.log('🔄 Navigating to SyncSettings...');
              navigation.navigate('SyncSettings');
            }}
          >
            <MaterialIcons name="settings" size={24} color="#666" />
            <Text style={styles.navCardText}>Sync Settings</Text>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },

  syncStatusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  syncStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  syncStatusTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  syncStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  syncStatusTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  syncButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncButtonDisabled: {
    backgroundColor: '#ccc',
  },
  syncButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  statSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },

  navigationContainer: {
    gap: 12,
  },
  navCard: {
    backgroundColor: 'white',
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
  navCardText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 16,
  },

  // Chart Styles
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  chartContent: {
    minHeight: 100,
  },
  chart: {
    flex: 1,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 80,
    marginBottom: 8,
  },
  chartBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  chartBar: {
    width: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 4,
    minHeight: 2,
  },
  chartBarLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  chartLegend: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  chartLegendText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  chartPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  chartPlaceholderText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});
