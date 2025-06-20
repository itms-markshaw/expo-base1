/**
 * Settings Screen
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../store';
import { databaseService } from '../services/database';
import { ODOO_CONFIG } from '../config/odoo';

export default function SettingsScreen() {
  const { user, logout, databaseStats, loadDatabaseStats } = useAppStore();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            Alert.alert('Logged Out', 'You have been logged out successfully');
          },
        },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all synced data from your device. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.clearAllData();
              await loadDatabaseStats();
              Alert.alert('Success', 'All data cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const handleRefreshStats = async () => {
    try {
      await loadDatabaseStats();
      Alert.alert('Success', 'Database stats refreshed');
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh stats');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* User Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <View style={styles.userCard}>
            <MaterialIcons name="account-circle" size={48} color="#007AFF" />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name || 'Unknown User'}</Text>
              <Text style={styles.userEmail}>{user?.email || user?.login || 'No email'}</Text>
            </View>
          </View>
        </View>

        {/* Server Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Server Connection</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Server URL</Text>
              <Text style={styles.infoValue}>{ODOO_CONFIG.baseURL}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Database</Text>
              <Text style={styles.infoValue}>{ODOO_CONFIG.db}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={styles.infoValue}>{ODOO_CONFIG.username}</Text>
            </View>
          </View>
        </View>

        {/* Database Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Local Database</Text>
          
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Records</Text>
              <Text style={styles.statValue}>{databaseStats?.totalRecords || 0}</Text>
            </View>
            
            {databaseStats?.tables?.map((table: any) => (
              <View key={table.name} style={styles.statRow}>
                <Text style={styles.statLabel}>{table.name}</Text>
                <Text style={styles.statValue}>{table.recordCount}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity style={styles.actionItem} onPress={handleRefreshStats}>
            <MaterialIcons name="refresh" size={24} color="#007AFF" />
            <View style={styles.actionText}>
              <Text style={styles.actionLabel}>Refresh Stats</Text>
              <Text style={styles.actionSubtitle}>Update database statistics</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#C7C7CC" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionItem} onPress={handleClearData}>
            <MaterialIcons name="delete" size={24} color="#FF9500" />
            <View style={styles.actionText}>
              <Text style={styles.actionLabel}>Clear All Data</Text>
              <Text style={styles.actionSubtitle}>Delete all synced data</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#C7C7CC" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionItem} onPress={handleLogout}>
            <MaterialIcons name="logout" size={24} color="#FF3B30" />
            <View style={styles.actionText}>
              <Text style={[styles.actionLabel, { color: '#FF3B30' }]}>Logout</Text>
              <Text style={styles.actionSubtitle}>Sign out of your account</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Build</Text>
              <Text style={styles.infoValue}>Production</Text>
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
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  userCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  infoValue: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    textAlign: 'right',
  },
  statsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statLabel: {
    fontSize: 16,
    color: '#1A1A1A',
    textTransform: 'capitalize',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  actionItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    flex: 1,
    marginLeft: 16,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
});
