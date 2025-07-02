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
import { useRouter } from 'expo-router';
import NetInfo from '@react-native-async-storage/async-storage';

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

export default function SyncDashboard() {
  const router = useRouter();
  const { syncStatus, selectedModels, syncSettings } = useAppStore();

  const [isOnline, setIsOnline] = useState(true);
  const [syncStats, setSyncStats] = useState<SyncStats>({
    totalModels: 844,
    syncedModels: 0,
    totalRecords: 0,
    dataSize: '0 MB',
    lastSync: null,
    conflicts: 0,
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
      const metadata = await databaseService.getAllSyncMetadata();
      const syncedModels = metadata.length;
      const totalRecords = metadata.reduce((sum, m) => sum + (m.record_count || 0), 0);
      const dataSize = formatDataSize(totalRecords * 1024); // Rough estimate

      // Get last sync time
      const lastSyncTimes = metadata.map(m => m.last_sync).filter(Boolean);
      const lastSync = lastSyncTimes.length > 0 ? new Date(Math.max(...lastSyncTimes.map(d => new Date(d).getTime()))) : null;

      // Get actual conflicts from database (for now set to 0, will implement conflict detection later)
      const conflicts = 0;

      setSyncStats({
        totalModels: 844,
        syncedModels,
        totalRecords,
        dataSize,
        lastSync,
        conflicts,
      });
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
      router.push('/sync/progress');
    } catch (error) {
      console.error('Sync failed:', error);
      Alert.alert('Sync Failed', 'Unable to start sync process');
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, router]);

  // Load data on mount
  useEffect(() => {
    loadSyncStats();
  }, [loadSyncStats]);

  // Filter out mail.thread from available models (it's abstract)
  const filteredModels = availableModels.filter(model => model.name !== 'mail.thread');

  // Helper to get sync metadata for a model
  const getModelSyncMetadata = (modelName: string) => {
    return syncMetadata.find(meta => meta.model_name === modelName);
  };

  const handleStartSync = async () => {
    if (selectedModels.length === 0) {
      Alert.alert('No Models Selected', 'Please select at least one model to sync.');
      return;
    }

    try {
      await startSync();
      Alert.alert('Sync Complete', 'Data has been synced successfully!');
    } catch (error) {
      Alert.alert('Sync Failed', error.message);
    }
  };

  const handleCancelSync = async () => {
    Alert.alert(
      'Cancel Sync',
      'Are you sure you want to cancel the sync?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', onPress: () => cancelSync() },
      ]
    );
  };

  const handleGlobalTimePeriodChange = (timePeriod: TimePeriod) => {
    updateSyncSettings({ globalTimePeriod: timePeriod });
  };

  // Bottom sheet callbacks
  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      setSelectedModelForTimePeriod(null);
    }
  }, []);

  const handleModelTimePeriodPress = useCallback((modelName: string) => {
    setSelectedModelForTimePeriod(modelName);
    bottomSheetRef.current?.snapToIndex(0); // Open to first snap point (30%)
  }, []);

  const handleModelTimePeriodSelect = useCallback((timePeriod: TimePeriod) => {
    if (selectedModelForTimePeriod) {
      updateModelTimePeriod(selectedModelForTimePeriod, timePeriod);
    }
    bottomSheetRef.current?.close();
  }, [selectedModelForTimePeriod, updateModelTimePeriod]);

  const getEffectiveTimePeriod = (modelName: string): TimePeriod => {
    return syncSettings.modelOverrides[modelName] || syncSettings.globalTimePeriod;
  };

  const getTimePeriodLabel = (timePeriod: TimePeriod): string => {
    const option = timePeriodOptions.find(opt => opt.value === timePeriod);
    return option?.label || timePeriod;
  };



  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Sync Data</Text>
          <Text style={styles.subtitle}>
            Choose which data to sync from Odoo
          </Text>
        </View>

        {/* Sync Status */}
        {syncStatus.isRunning ? (
          <View style={styles.syncStatusCard}>
            <View style={styles.syncHeader}>
              <MaterialIcons name="sync" size={24} color="#007AFF" />
              <Text style={styles.syncTitle}>Syncing in Progress</Text>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${syncStatus.progress}%` }]}
                />
              </View>
              <Text style={styles.progressText}>{syncStatus.progress}%</Text>
            </View>

            {syncStatus.currentModel ? (
              <Text style={styles.currentModel}>
                Current: {syncStatus.currentModel}
              </Text>
            ) : null}

            <Text style={styles.recordsText}>
              {syncStatus.syncedRecords} / {syncStatus.totalRecords} records
            </Text>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelSync}
            >
              <MaterialIcons name="stop" size={16} color="#FFF" />
              <Text style={styles.cancelButtonText}>Cancel Sync</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Global Time Period */}
        <View style={styles.timePeriodContainer}>
          <Text style={styles.sectionTitle}>Sync Time Period</Text>
          <Text style={styles.sectionSubtitle}>
            Choose how far back to sync records (master data like contacts always syncs all)
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timePeriodScroll}>
            {timePeriodOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.timePeriodChip,
                  syncSettings.globalTimePeriod === option.value && styles.timePeriodChipSelected
                ]}
                onPress={() => handleGlobalTimePeriodChange(option.value)}
                disabled={syncStatus.isRunning}
              >
                <Text style={[
                  styles.timePeriodChipText,
                  syncSettings.globalTimePeriod === option.value && styles.timePeriodChipTextSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Model Selection */}
        <View style={styles.modelsContainer}>
          <Text style={styles.sectionTitle}>Select Models to Sync</Text>

          {filteredModels.map((model) => {
            const effectiveTimePeriod = getEffectiveTimePeriod(model.name);
            const isOverridden = syncSettings.modelOverrides[model.name] !== undefined;

            return (
              <View key={model.name} style={styles.modelCard}>
                <View style={styles.modelInfo}>
                  <MaterialIcons
                    name={model.name === 'res.partner' ? 'contacts' : 'people'}
                    size={24}
                    color="#007AFF"
                  />
                  <View style={styles.modelText}>
                    <Text style={styles.modelName}>{model.displayName}</Text>
                    <Text style={styles.modelDescription}>{model.description}</Text>

                    {/* INCREMENTAL SYNC: Show sync metadata */}
                    {(() => {
                      const metadata = getModelSyncMetadata(model.name);
                      return metadata && (
                        <View style={styles.syncMetadata}>
                          <MaterialIcons name="sync" size={12} color="#28a745" />
                          <Text style={styles.syncMetadataText}>
                            Last sync: {new Date(metadata.last_sync_timestamp).toLocaleDateString()}
                            {metadata.total_records > 0 && ` • ${metadata.total_records} records`}
                            {metadata.last_error && ' • Error'}
                          </Text>
                        </View>
                      );
                    })()}

                    {/* Time Period Info */}
                    <TouchableOpacity
                      style={styles.timePeriodInfo}
                      onPress={() => handleModelTimePeriodPress(model.name)}
                      disabled={syncStatus.isRunning}
                    >
                      <MaterialIcons name="schedule" size={14} color="#666" />
                      <Text style={[
                        styles.timePeriodInfoText,
                        isOverridden && styles.timePeriodInfoTextOverridden
                      ]}>
                        {getTimePeriodLabel(effectiveTimePeriod)}
                        {isOverridden && ' (custom)'}
                      </Text>
                      <MaterialIcons name="edit" size={14} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Switch
                  value={selectedModels.includes(model.name)}
                  onValueChange={() => toggleModel(model.name)}
                  disabled={syncStatus.isRunning}
                />
              </View>
            );
          })}
        </View>

        {/* Sync Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.syncButton,
              (syncStatus.isRunning || selectedModels.length === 0) && styles.syncButtonDisabled
            ]}
            onPress={handleStartSync}
            disabled={syncStatus.isRunning || selectedModels.length === 0}
          >
            <MaterialIcons
              name={syncStatus.isRunning ? "hourglass-empty" : "sync"}
              size={20}
              color="#FFF"
            />
            <Text style={styles.syncButtonText}>
              {syncStatus.isRunning ? 'Syncing...' : 'Start Sync'}
            </Text>
          </TouchableOpacity>


        </View>

        {/* Errors */}
        {syncStatus.errors.length > 0 ? (
          <View style={styles.errorsContainer}>
            <Text style={styles.errorsTitle}>Sync Errors</Text>
            {syncStatus.errors.map((error, index) => (
              <View key={index} style={styles.errorItem}>
                <MaterialIcons name="error" size={16} color="#D32F2F" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ))}
          </View>
        ) : null}

      </ScrollView>

      {/* Bottom Sheet - Outside ScrollView for proper overlay */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1} // Start closed
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose={true}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetHandle}
      >
        <BottomSheetView style={styles.bottomSheetContainer}>
          {/* Header */}
          <View style={styles.bottomSheetHeader}>
            <Text style={styles.bottomSheetTitle}>
              Select Time Period for {selectedModelForTimePeriod ?
                filteredModels.find(m => m.name === selectedModelForTimePeriod)?.displayName : ''
              }
            </Text>
            <TouchableOpacity
              onPress={() => bottomSheetRef.current?.close()}
              style={styles.bottomSheetCloseButton}
            >
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <BottomSheetScrollView style={styles.bottomSheetContent}>
            {timePeriodOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.bottomSheetOption}
                onPress={() => handleModelTimePeriodSelect(option.value)}
              >
                <View style={styles.bottomSheetOptionContent}>
                  <Text style={styles.bottomSheetOptionTitle}>{option.label}</Text>
                  <Text style={styles.bottomSheetOptionDescription}>{option.description}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#C7C7CC" />
              </TouchableOpacity>
            ))}
          </BottomSheetScrollView>
        </BottomSheetView>
      </BottomSheet>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  syncStatusCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  syncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  syncTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    minWidth: 40,
  },
  currentModel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  recordsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  modelsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  modelCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modelText: {
    marginLeft: 16,
    flex: 1,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  modelDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  timePeriodContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  timePeriodScroll: {
    flexDirection: 'row',
  },
  timePeriodChip: {
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  timePeriodChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  timePeriodChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  timePeriodChipTextSelected: {
    color: '#FFF',
  },
  timePeriodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timePeriodInfoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    marginRight: 4,
  },
  timePeriodInfoTextOverridden: {
    color: '#007AFF',
    fontWeight: '500',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  syncButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  syncButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
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
    marginBottom: 12,
  },
  errorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#D32F2F',
    marginLeft: 8,
    flex: 1,
  },
  bottomSheetBackground: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomSheetHandle: {
    backgroundColor: '#C7C7CC',
    width: 40,
  },
  bottomSheetContainer: {
    flex: 1,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  bottomSheetCloseButton: {
    padding: 4,
  },
  bottomSheetContent: {
    flex: 1,
  },
  bottomSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  // INCREMENTAL SYNC: Sync metadata styles
  syncMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 2,
  },
  syncMetadataText: {
    fontSize: 11,
    color: '#28a745',
    marginLeft: 4,
    fontWeight: '500',
  },
  bottomSheetOptionContent: {
    flex: 1,
  },
  bottomSheetOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  bottomSheetOptionDescription: {
    fontSize: 14,
    color: '#666',
  },
});
