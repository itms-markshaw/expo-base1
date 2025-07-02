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
    totalRecords: 1247,
    dataSize: '2.4 MB',
    lastSync: new Date('2025-07-02T10:27:51'),
    conflicts: 2,
  });
  const [isLoading, setIsLoading] = useState(false);

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

      // Get last sync time
      const lastSyncTimes = metadata.map(m => m.last_sync).filter(Boolean);
      const lastSync = lastSyncTimes.length > 0 ? new Date(Math.max(...lastSyncTimes.map(d => new Date(d).getTime()))) : null;

      setSyncStats(prev => ({
        ...prev,
        totalRecords,
        dataSize,
        lastSync,
      }));
    } catch (error) {
      console.error('Failed to load sync stats:', error);
    }
  }, []);

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
  }, [loadSyncStats]);

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

        {/* Navigation Cards */}
        <View style={styles.navigationContainer}>
          {/* Conflicts Navigation Card */}
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
              console.log('🔄 Navigating to SyncSettings...');
              navigation.navigate('SyncSettings');
            }}
          >
            <MaterialIcons name="settings" size={24} color="#666" />
            <Text style={styles.navCardText}>Sync Settings</Text>
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
});
