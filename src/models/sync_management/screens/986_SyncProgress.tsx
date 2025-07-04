/**
 * 986_SyncProgress - Real-time sync progress
 * Screen Number: 986
 * Model: sync.management
 * Type: detail
 *
 * PRESERVED: All original sync functionality
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
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

import { useAppStore } from '../../../store';
import { syncService } from '../../base/services/BaseSyncService';
import { databaseService } from '../../base/services/BaseDatabaseService';
import { authService } from '../../base/services/BaseAuthService';
import ScreenBadge from '../../../components/ScreenBadge';

interface SyncProgress {
  currentModel: string;
  currentOperation: string;
  modelsCompleted: number;
  totalModels: number;
  recordsProcessed: number;
  totalRecords: number;
  dataTransferred: string;
  isComplete: boolean;
  hasError: boolean;
  errorMessage?: string;
  syncType: 'full' | 'incremental';
  isFirstSync: boolean;
}

// Helper functions for calculating sync totals
const buildDomainForModel = async (modelName: string, syncType: 'full' | 'incremental'): Promise<any[]> => {
  if (syncType === 'full') {
    return []; // No filters for full sync
  }

  // For incremental sync, get last sync timestamp
  try {
    const metadata = await databaseService.getSyncMetadata(modelName);
    if (metadata?.lastSyncWriteDate) {
      return [['write_date', '>', metadata.lastSyncWriteDate]];
    }
  } catch (error) {
    console.warn(`Could not get sync metadata for ${modelName}:`, error);
  }

  return []; // Fallback to full sync if no metadata
};

const getLimitForModel = (modelName: string): number => {
  // Master data models - sync ALL records
  const masterDataModels = [
    'res.partner', 'res.users', 'hr.employee', 'product.product', 'product.template'
  ];

  if (masterDataModels.includes(modelName)) {
    return 999999; // Effectively unlimited
  }

  // Transactional data - limit to recent records
  return 1000;
};

export default function SyncProgressScreen() {
  const navigation = useNavigation();
  const { syncStatus, selectedModels, startSync, cancelSync } = useAppStore();
  
  const [progress, setProgress] = useState<SyncProgress>({
    currentModel: '',
    currentOperation: 'Initializing...',
    modelsCompleted: 0,
    totalModels: selectedModels.length,
    recordsProcessed: 0,
    totalRecords: 0,
    dataTransferred: '0 MB',
    isComplete: false,
    hasError: false,
    syncType: 'full',
    isFirstSync: true,
  });
  
  const [progressAnim] = useState(new Animated.Value(0));
  const [isCancelling, setIsCancelling] = useState(false);

  // Real sync implementation
  const performRealSync = useCallback(async () => {
    const models = selectedModels.length > 0 ? selectedModels : ['res.partner', 'sale.order', 'product.product'];

    try {
      // Initialize database first
      await databaseService.initialize();

      // Determine sync type (full vs incremental)
      const syncType = await determineSyncType(models);
      const isFirstSync = syncType === 'full';

      setProgress(prev => ({
        ...prev,
        totalModels: models.length,
        syncType,
        isFirstSync,
        currentOperation: isFirstSync ? 'Calculating total records...' : 'Calculating incremental records...'
      }));

      // Calculate total records to sync
      let totalRecordsToSync = 0;
      const client = authService.getClient();
      if (client) {
        for (const modelName of models) {
          try {
            // Use the same logic as sync service to count records
            const domain = await buildDomainForModel(modelName, syncType);
            const count = await client.searchCount(modelName, domain);
            const limit = getLimitForModel(modelName);
            totalRecordsToSync += Math.min(count, limit);
          } catch (error) {
            console.warn(`⚠️ Could not count records for ${modelName}:`, error);
          }
        }
      }

      setProgress(prev => ({
        ...prev,
        totalRecords: totalRecordsToSync,
        currentOperation: isFirstSync ? 'Starting full sync...' : 'Starting incremental sync...'
      }));

      console.log(`🔄 Starting ${syncType} sync for ${models.length} models (${totalRecordsToSync} total records)`);

      let totalRecordsProcessed = 0;
      let totalDataSize = 0;

      for (let i = 0; i < models.length; i++) {
        if (isCancelling) {
          console.log('🛑 Sync cancelled by user');
          return;
        }

        const modelName = models[i];

        setProgress(prev => ({
          ...prev,
          currentModel: modelName,
          currentOperation: `Syncing ${modelName}...`,
        }));

        try {
          // Call real sync service for this model
          const recordCount = await syncService.syncModel(modelName);

          totalRecordsProcessed += recordCount;
          totalDataSize += recordCount * 0.002; // Rough estimate: 2KB per record

          // Update progress after each model completes
          setProgress(prev => ({
            ...prev,
            modelsCompleted: i + 1,
            recordsProcessed: totalRecordsProcessed,
            dataTransferred: `${totalDataSize.toFixed(1)} MB`,
            currentOperation: i === models.length - 1 ? 'Finalizing...' : `Completed ${modelName} (${recordCount} records)`,
          }));

          // Update progress bar - ONLY once per model
          const overallProgress = Math.min(((i + 1) / models.length) * 100, 100);
          Animated.timing(progressAnim, {
            toValue: overallProgress,
            duration: 300,
            useNativeDriver: false,
          }).start();

          console.log(`✅ Completed ${modelName}: ${recordCount} records`);

        } catch (modelError) {
          console.error(`❌ Failed to sync ${modelName}:`, modelError);

          setProgress(prev => ({
            ...prev,
            hasError: true,
            errorMessage: `Failed to sync ${modelName}: ${modelError.message}`,
            currentOperation: `Error syncing ${modelName}`,
          }));

          // Continue with next model instead of stopping
          continue;
        }
      }

      // Complete sync
      setProgress(prev => ({
        ...prev,
        isComplete: true,
        currentOperation: `${syncType === 'full' ? 'Full' : 'Incremental'} sync completed successfully!`,
      }));

      // Ensure progress bar reaches 100%
      Animated.timing(progressAnim, {
        toValue: 100,
        duration: 200,
        useNativeDriver: false,
      }).start();

      console.log(`✅ ${syncType} sync completed: ${totalRecordsProcessed} total records`);

    } catch (error) {
      console.error('❌ Sync failed:', error);

      setProgress(prev => ({
        ...prev,
        hasError: true,
        errorMessage: error.message,
        currentOperation: 'Sync failed',
      }));
    }

  }, [selectedModels, isCancelling, progressAnim]);

  // Determine if this is a full sync or incremental sync
  const determineSyncType = useCallback(async (models: string[]): Promise<'full' | 'incremental'> => {
    try {
      let neverSyncedCount = 0;
      let totalModels = models.length;

      // Check sync status for each model (excluding restricted models)
      for (const modelName of models) {
        // Skip restricted models that shouldn't be synced
        if (modelName === 'account.move') {
          console.log(`🚫 ${modelName} is restricted - skipping from sync type detection`);
          totalModels--; // Don't count restricted models
          continue;
        }

        const metadata = await databaseService.getSyncMetadata(modelName);
        if (!metadata || !metadata.last_sync_timestamp || !metadata.last_sync_write_date) {
          neverSyncedCount++;
          console.log(`🔄 ${modelName} has never been synced`);
        } else {
          console.log(`✅ ${modelName} has been synced before (last: ${metadata.last_sync_write_date})`);
        }
      }

      // Determine sync type based on ratio of never-synced models
      if (neverSyncedCount === 0) {
        console.log('🔄 All models have been synced before - incremental sync');
        return 'incremental';
      } else if (neverSyncedCount === totalModels) {
        console.log('🔄 No models have been synced before - full sync (first time)');
        return 'full';
      } else {
        console.log(`🔄 Mixed sync: ${neverSyncedCount}/${totalModels} models never synced - treating as incremental`);
        return 'incremental';
      }
    } catch (error) {
      console.warn('⚠️ Could not determine sync type, defaulting to incremental sync:', error);
      return 'incremental';
    }
  }, []);

  // Update progress when selectedModels changes
  useEffect(() => {
    setProgress(prev => ({
      ...prev,
      totalModels: selectedModels.length
    }));
  }, [selectedModels]);

  // Start sync on mount
  useEffect(() => {
    performRealSync();
  }, [performRealSync]);

  // Handle cancel sync
  const handleCancelSync = () => {
    Alert.alert(
      'Cancel Sync',
      'Are you sure you want to cancel the sync process?',
      [
        { text: 'Continue Syncing', style: 'cancel' },
        { 
          text: 'Cancel Sync', 
          style: 'destructive',
          onPress: () => {
            setIsCancelling(true);
            cancelSync();
            navigation.goBack();
          }
        },
      ]
    );
  };

  // Handle completion
  const handleComplete = () => {
    if (progress.hasError) {
      Alert.alert('Sync Failed', progress.errorMessage || 'An error occurred during sync');
    } else {
      Alert.alert('Sync Complete', 'All data has been synchronized successfully!');
    }
    navigation.goBack();
  };

  // Fix progress calculation - should be based on completed models, not records
  const progressPercentage = progress.totalModels > 0
    ? Math.round((progress.modelsCompleted / progress.totalModels) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBadge screenNumber={986} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Sync Progress</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Progress Circle */}
        <View style={styles.progressContainer}>
          <View style={styles.progressCircle}>
            <Svg width={120} height={120} style={styles.progressSvg}>
              {/* Background circle */}
              <Circle
                cx={60}
                cy={60}
                r={52}
                stroke="#E0E0E0"
                strokeWidth={8}
                fill="none"
              />
              {/* Progress circle */}
              <AnimatedCircle
                cx={60}
                cy={60}
                r={52}
                stroke="#2196F3"
                strokeWidth={8}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 52}
                strokeDashoffset={progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: [2 * Math.PI * 52, 0],
                })}
                transform="rotate(-90 60 60)"
              />
            </Svg>
            <View style={styles.progressInner}>
              <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
              <Text style={styles.progressLabel}>Complete</Text>
            </View>
          </View>
        </View>

        {/* Current Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <MaterialIcons
              name={progress.isComplete ? "check-circle" : progress.hasError ? "error" : "sync"}
              size={24}
              color={progress.isComplete ? "#4CAF50" : progress.hasError ? "#F44336" : "#2196F3"}
            />
            <View style={styles.statusTitleContainer}>
              <Text style={styles.statusTitle}>
                {progress.isComplete ? "Sync Complete" : progress.hasError ? "Sync Failed" : "Syncing..."}
              </Text>
              <Text style={styles.syncTypeLabel}>
                {progress.syncType === 'full' ? "Full Sync" : "Incremental Sync"}
                {progress.syncType === 'full' && " (First Time)"}
              </Text>
            </View>
          </View>
          <Text style={styles.statusOperation}>{progress.currentOperation}</Text>
          {progress.currentModel && (
            <Text style={styles.statusModel}>Current: {progress.currentModel}</Text>
          )}
        </View>

        {/* Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{progress.modelsCompleted}</Text>
            <Text style={styles.statLabel}>Models</Text>
            <Text style={styles.statSubtext}>of {progress.totalModels}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{progress.recordsProcessed.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Records</Text>
            <Text style={styles.statSubtext}>processed</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{progress.dataTransferred}</Text>
            <Text style={styles.statLabel}>Data</Text>
            <Text style={styles.statSubtext}>transferred</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <Animated.View 
              style={[
                styles.progressBarFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  })
                }
              ]} 
            />
          </View>
          <Text style={styles.progressBarText}>
            {progress.recordsProcessed} / {progress.totalRecords} records
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {progress.isComplete || progress.hasError ? (
            <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
              <Text style={styles.completeButtonText}>
                {progress.hasError ? "Close" : "Done"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={handleCancelSync}
              disabled={isCancelling}
            >
              <MaterialIcons name="close" size={20} color="#F44336" />
              <Text style={styles.cancelButtonText}>
                {isCancelling ? "Cancelling..." : "Cancel Sync"}
              </Text>
            </TouchableOpacity>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  progressContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  progressCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressSvg: {
    position: 'absolute',
  },
  progressInner: {
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  syncTypeLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusOperation: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  statusModel: {
    fontSize: 14,
    color: '#999',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 4,
  },
  statSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  progressBarContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2196F3',
  },
  progressBarText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  actionsContainer: {
    marginTop: 20,
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  completeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#F44336',
    gap: 8,
  },
  cancelButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
  },
});
