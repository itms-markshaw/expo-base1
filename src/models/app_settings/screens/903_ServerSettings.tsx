/**
 * 903_ServerSettings - Connection and server configuration
 * Screen Number: 903
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
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ODOO_CONFIG } from '../../../config/odoo';
import ScreenBadge from '../../../components/ScreenBadge';

export default function ServerSettingsScreen({ navigation }: any) {
  // Safe config access with fallbacks
  const [serverUrl, setServerUrl] = useState(ODOO_CONFIG?.baseURL || 'https://itmsgroup.com.au');
  const [database, setDatabase] = useState(ODOO_CONFIG?.db || 'your-database');
  const [port, setPort] = useState('8069'); // Default port
  const [useHttps, setUseHttps] = useState(
    (ODOO_CONFIG?.baseURL && ODOO_CONFIG.baseURL.startsWith('https')) || false
  );
  const [timeout, setTimeout] = useState('30');
  const [retryAttempts, setRetryAttempts] = useState('3');

  const testConnection = async () => {
    Alert.alert('Testing Connection', 'Connecting to server...', [
      { text: 'Cancel', style: 'cancel' }
    ]);
    
    // TODO: Implement actual connection test
    setTimeout(() => {
      Alert.alert('Connection Test', 'Successfully connected to server!');
    }, 2000);
  };

  const saveSettings = () => {
    // TODO: Implement settings save
    Alert.alert('Success', 'Server settings saved');
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'Reset all server settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => {
          setServerUrl('https://your-odoo-server.com');
          setDatabase('your-database');
          setPort('8069');
          setUseHttps(true);
          setTimeout('30');
          setRetryAttempts('3');
        }},
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBadge screenNumber={903} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Server Settings</Text>
        <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Connection Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Settings</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Server URL</Text>
            <TextInput
              style={styles.input}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="https://your-odoo-server.com"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Database Name</Text>
            <TextInput
              style={styles.input}
              value={database}
              onChangeText={setDatabase}
              placeholder="your-database"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Port</Text>
            <TextInput
              style={styles.input}
              value={port}
              onChangeText={setPort}
              placeholder="8069"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <MaterialIcons name="security" size={24} color="#34C759" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Use HTTPS</Text>
                <Text style={styles.settingDescription}>Secure connection</Text>
              </View>
            </View>
            <Switch
              value={useHttps}
              onValueChange={setUseHttps}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={useHttps ? '#007AFF' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Advanced Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced Settings</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Connection Timeout (seconds)</Text>
            <TextInput
              style={styles.input}
              value={timeout}
              onChangeText={setTimeout}
              placeholder="30"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Retry Attempts</Text>
            <TextInput
              style={styles.input}
              value={retryAttempts}
              onChangeText={setRetryAttempts}
              placeholder="3"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Connection Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Status</Text>
          
          <View style={styles.statusItem}>
            <MaterialIcons name="circle" size={12} color="#34C759" />
            <Text style={styles.statusText}>Connected</Text>
            <Text style={styles.statusTime}>Last sync: 2 minutes ago</Text>
          </View>

          <TouchableOpacity style={styles.testButton} onPress={testConnection}>
            <MaterialIcons name="wifi-tethering" size={24} color="#007AFF" />
            <Text style={styles.testButtonText}>Test Connection</Text>
          </TouchableOpacity>
        </View>

        {/* Server Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Server Information</Text>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Odoo Version</Text>
            <Text style={styles.infoValue}>18.0</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Server Time</Text>
            <Text style={styles.infoValue}>2024-07-04 09:05:23 UTC</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Database Size</Text>
            <Text style={styles.infoValue}>2.4 GB</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity style={styles.actionItem} onPress={resetToDefaults}>
            <MaterialIcons name="refresh" size={24} color="#FF9500" />
            <Text style={styles.actionText}>Reset to Defaults</Text>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <MaterialIcons name="download" size={24} color="#007AFF" />
            <Text style={styles.actionText}>Export Configuration</Text>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <MaterialIcons name="upload" size={24} color="#34C759" />
            <Text style={styles.actionText}>Import Configuration</Text>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  saveButton: {
    padding: 8,
  },
  saveText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
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
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginLeft: 8,
    flex: 1,
  },
  statusTime: {
    fontSize: 14,
    color: '#666',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  testButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 8,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
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
