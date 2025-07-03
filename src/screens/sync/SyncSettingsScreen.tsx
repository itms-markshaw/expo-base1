/**
 * Sync Settings Screen - Configure sync preferences
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { useAppStore } from '../../store';
import { syncService } from '../../services/sync';
import { autoSyncService, AutoSyncSettings } from '../../services/autoSync';
import { databaseService } from '../../services/database';
import { TimePeriod } from '../../types';

export default function SyncSettingsScreen() {
  const navigation = useNavigation();
  const { syncSettings, updateSyncSettings } = useAppStore();
  
  const [localSettings, setLocalSettings] = useState({
    globalTimePeriod: syncSettings.globalTimePeriod || '1week',
    autoSync: syncSettings.autoSync || true,
    conflictResolution: syncSettings.conflictResolution || 'ask_user',
    backgroundSync: syncSettings.backgroundSync || true,
  });

  const [autoSyncSettings, setAutoSyncSettings] = useState<AutoSyncSettings>(autoSyncService.getSettings());

  const timePeriodOptions = syncService.getTimePeriodOptions();

  const conflictOptions = [
    { value: 'ask_user', label: 'Ask User', description: 'Prompt for each conflict' },
    { value: 'server_wins', label: 'Server Wins', description: 'Always use server data' },
    { value: 'keep_local', label: 'Keep Local', description: 'Always keep local changes' },
  ];

  const handleSave = () => {
    updateSyncSettings(localSettings);
    Alert.alert('Settings Saved', 'Your sync preferences have been updated.');
    navigation.goBack();
  };

  const handleClearData = () => {
    Alert.alert(
      'Reset Database',
      'This will completely drop and recreate the SQLite database, removing all tables and data. This fixes database corruption issues. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Database',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Resetting entire SQLite database...');
              await databaseService.resetDatabase();
              Alert.alert('Database Reset', 'SQLite database has been completely recreated. All tables and data have been removed.');
            } catch (error) {
              console.error('Failed to reset database:', error);
              Alert.alert('Error', 'Failed to reset database. Please try again.');
            }
          }
        },
      ]
    );
  };

  const renderTimePeriodOption = (option: typeof timePeriodOptions[0]) => (
    <TouchableOpacity
      key={option.value}
      style={[
        styles.optionItem,
        localSettings.globalTimePeriod === option.value && styles.optionItemSelected
      ]}
      onPress={() => setLocalSettings(prev => ({ ...prev, globalTimePeriod: option.value as TimePeriod }))}
    >
      <View style={styles.optionLeft}>
        <MaterialIcons 
          name={localSettings.globalTimePeriod === option.value ? "radio-button-checked" : "radio-button-unchecked"} 
          size={24} 
          color={localSettings.globalTimePeriod === option.value ? "#2196F3" : "#666"} 
        />
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>{option.label}</Text>
          <Text style={styles.optionDescription}>{option.description}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderConflictOption = (option: typeof conflictOptions[0]) => (
    <TouchableOpacity
      key={option.value}
      style={[
        styles.optionItem,
        localSettings.conflictResolution === option.value && styles.optionItemSelected
      ]}
      onPress={() => setLocalSettings(prev => ({ ...prev, conflictResolution: option.value }))}
    >
      <View style={styles.optionLeft}>
        <MaterialIcons 
          name={localSettings.conflictResolution === option.value ? "radio-button-checked" : "radio-button-unchecked"} 
          size={24} 
          color={localSettings.conflictResolution === option.value ? "#2196F3" : "#666"} 
        />
        <View style={styles.optionText}>
          <Text style={styles.optionTitle}>{option.label}</Text>
          <Text style={styles.optionDescription}>{option.description}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Sync Settings</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveButton}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Sync Period Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync Period</Text>
          <Text style={styles.sectionDescription}>
            How far back to sync data from the server
          </Text>
          <View style={styles.sectionContent}>
            {timePeriodOptions.map(renderTimePeriodOption)}
          </View>
        </View>

        {/* Auto Sync Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Automatic Sync</Text>
          <View style={styles.switchItem}>
            <View style={styles.switchLeft}>
              <Text style={styles.switchTitle}>Auto-sync</Text>
              <Text style={styles.switchDescription}>
                Automatically sync when app opens
              </Text>
            </View>
            <Switch
              value={localSettings.autoSync}
              onValueChange={(value) => {
                setLocalSettings(prev => ({ ...prev, autoSync: value }));
                // Update auto-sync service settings
                autoSyncService.updateSettings({
                  autoSyncOnLaunch: value,
                  autoSyncOnForeground: value,
                  autoSyncOnNetworkReconnect: value
                });
              }}
              trackColor={{ false: '#e0e0e0', true: '#2196F3' }}
              thumbColor={localSettings.autoSync ? '#fff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.switchItem}>
            <View style={styles.switchLeft}>
              <Text style={styles.switchTitle}>Background sync</Text>
              <Text style={styles.switchDescription}>
                Sync data every 15 minutes when app is in background
              </Text>
            </View>
            <Switch
              value={localSettings.backgroundSync}
              onValueChange={(value) => {
                setLocalSettings(prev => ({ ...prev, backgroundSync: value }));
                // Update auto-sync service settings
                autoSyncService.updateSettings({
                  backgroundSyncEnabled: value
                });
              }}
              trackColor={{ false: '#e0e0e0', true: '#2196F3' }}
              thumbColor={localSettings.backgroundSync ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Conflict Resolution Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conflict Resolution</Text>
          <Text style={styles.sectionDescription}>
            How to handle conflicts between local and server data
          </Text>
          <View style={styles.sectionContent}>
            {conflictOptions.map(renderConflictOption)}
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          <TouchableOpacity style={styles.dangerButton} onPress={handleClearData}>
            <MaterialIcons name="refresh" size={24} color="#F44336" />
            <View style={styles.dangerButtonText}>
              <Text style={styles.dangerButtonTitle}>Reset Database</Text>
              <Text style={styles.dangerButtonDescription}>
                Drop and recreate SQLite database (fixes corruption)
              </Text>
            </View>
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
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginTop: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
  },
  sectionContent: {
    paddingHorizontal: 16,
  },
  optionItem: {
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  optionItemSelected: {
    backgroundColor: '#E3F2FD',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    marginLeft: 12,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  switchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  switchLeft: {
    flex: 1,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  switchDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
    marginHorizontal: 16,
  },
  dangerButtonText: {
    marginLeft: 12,
    flex: 1,
  },
  dangerButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
  },
  dangerButtonDescription: {
    fontSize: 14,
    color: '#F44336',
    marginTop: 2,
  },
});
