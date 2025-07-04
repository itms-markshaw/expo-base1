/**
 * 907_SyncPreferences - Data synchronization settings
 * Screen Number: 907
 * Model: app.settings
 * Type: detail
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import ScreenBadge from '../../../components/ScreenBadge';

export default function SyncPreferencesScreen({ navigation }: any) {
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [backgroundSyncEnabled, setBackgroundSyncEnabled] = useState(true);
  const [wifiOnlySync, setWifiOnlySync] = useState(false);
  const [syncFrequency, setSyncFrequency] = useState('15min');
  const [conflictResolution, setConflictResolution] = useState('ask');

  const syncFrequencies = [
    { id: '5min', name: '5 minutes' },
    { id: '15min', name: '15 minutes' },
    { id: '30min', name: '30 minutes' },
    { id: '1hour', name: '1 hour' },
    { id: 'manual', name: 'Manual only' },
  ];

  const conflictOptions = [
    { id: 'server', name: 'Server wins', description: 'Always use server data' },
    { id: 'local', name: 'Local wins', description: 'Always use local data' },
    { id: 'ask', name: 'Ask user', description: 'Let me decide each time' },
  ];

  const navigateToSyncDashboard = () => {
    navigation.navigate('SyncStack');
  };

  const navigateToSyncModels = () => {
    navigation.navigate('SyncModels');
  };

  const navigateToDatabaseManager = () => {
    navigation.navigate('DatabaseManager');
  };

  const navigateToOfflineQueue = () => {
    navigation.navigate('OfflineQueue');
  };

  const navigateToSyncConflicts = () => {
    navigation.navigate('SyncConflicts');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBadge screenNumber={907} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sync Preferences</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Sync Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="sync" size={24} color="#34C759" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Auto Sync</Text>
                <Text style={styles.settingDescription}>Automatically sync data</Text>
              </View>
            </View>
            <Switch
              value={autoSyncEnabled}
              onValueChange={setAutoSyncEnabled}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={autoSyncEnabled ? '#007AFF' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="cloud-sync" size={24} color="#007AFF" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Background Sync</Text>
                <Text style={styles.settingDescription}>Sync when app is in background</Text>
              </View>
            </View>
            <Switch
              value={backgroundSyncEnabled}
              onValueChange={setBackgroundSyncEnabled}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={backgroundSyncEnabled ? '#007AFF' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="wifi" size={24} color="#FF9500" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>WiFi Only</Text>
                <Text style={styles.settingDescription}>Only sync on WiFi connection</Text>
              </View>
            </View>
            <Switch
              value={wifiOnlySync}
              onValueChange={setWifiOnlySync}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={wifiOnlySync ? '#007AFF' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Sync Frequency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync Frequency</Text>
          
          {syncFrequencies.map((frequency) => (
            <TouchableOpacity
              key={frequency.id}
              style={styles.optionItem}
              onPress={() => setSyncFrequency(frequency.id)}
            >
              <MaterialIcons name="schedule" size={24} color="#666" />
              <Text style={styles.optionText}>{frequency.name}</Text>
              {syncFrequency === frequency.id && (
                <MaterialIcons name="check" size={24} color="#007AFF" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Conflict Resolution */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conflict Resolution</Text>
          <Text style={styles.sectionDescription}>
            How to handle conflicts when the same data is modified both locally and on the server
          </Text>
          
          {conflictOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.conflictOption}
              onPress={() => setConflictResolution(option.id)}
            >
              <View style={styles.conflictInfo}>
                <Text style={styles.conflictTitle}>{option.name}</Text>
                <Text style={styles.conflictDescription}>{option.description}</Text>
              </View>
              {conflictResolution === option.id && (
                <MaterialIcons name="check" size={24} color="#007AFF" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Sync Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sync Management</Text>
          
          <TouchableOpacity style={styles.actionItem} onPress={navigateToSyncDashboard}>
            <MaterialIcons name="dashboard" size={24} color="#5856D6" />
            <Text style={styles.actionText}>Sync Dashboard</Text>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={navigateToSyncModels}>
            <MaterialIcons name="storage" size={24} color="#666" />
            <Text style={styles.actionText}>Model Selection</Text>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={navigateToOfflineQueue}>
            <MaterialIcons name="cloud-queue" size={24} color="#FF9500" />
            <Text style={styles.actionText}>Offline Queue</Text>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={navigateToDatabaseManager}>
            <MaterialIcons name="view-list" size={24} color="#34C759" />
            <Text style={styles.actionText}>Database Manager</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
  },
  conflictOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  conflictInfo: {
    flex: 1,
  },
  conflictTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  conflictDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
  },
});
