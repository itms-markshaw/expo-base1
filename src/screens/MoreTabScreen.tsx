/**
 * More Tab Screen - Additional features and navigation
 */

import React, { useState } from 'react';
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
import { useAppNavigation } from '../components/AppNavigationProvider';
import { useAppStore } from '../store';

interface MoreItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  screenName: string;
}

export default function MoreTabScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const { navigateToScreen } = useAppNavigation();
  const { user } = useAppStore();

  const moreItems: MoreItem[] = [
    {
      id: 'activities',
      name: 'Activities',
      description: 'Tasks, events, and reminders',
      icon: 'event-note',
      color: '#FF9500',
      screenName: 'Activities',
    },
    {
      id: 'crm',
      name: 'CRM Leads',
      description: 'Manage leads and opportunities',
      icon: 'trending-up',
      color: '#34C759',
      screenName: 'CRM Leads',
    },
    {
      id: 'chat',
      name: 'Chat',
      description: 'Real-time messaging and communication',
      icon: 'chat',
      color: '#00C851',
      screenName: 'Chat',
    },
    {
      id: 'messages',
      name: 'Messages',
      description: 'Email and communication history',
      icon: 'message',
      color: '#007AFF',
      screenName: 'Messages',
    },
    {
      id: 'attachments',
      name: 'Attachments',
      description: 'Files and documents',
      icon: 'attach-file',
      color: '#FF9500',
      screenName: 'Attachments',
    },
    {
      id: 'projects',
      name: 'Projects',
      description: 'Project management and tasks',
      icon: 'folder',
      color: '#9C27B0',
      screenName: 'Projects',
    },
    {
      id: 'employees',
      name: 'Employees',
      description: 'HR and employee management',
      icon: 'badge',
      color: '#FF3B30',
      screenName: 'Employees',
    },
    {
      id: 'helpdesk',
      name: 'Helpdesk',
      description: 'Support tickets and issues',
      icon: 'support',
      color: '#FF9500',
      screenName: 'Helpdesk',
    },
    {
      id: 'mobile',
      name: 'Field Service',
      description: 'Mobile tools and documentation',
      icon: 'smartphone',
      color: '#34C759',
      screenName: 'Mobile',
    },
    {
      id: 'sync',
      name: 'Data Sync',
      description: 'Synchronize with Odoo server',
      icon: 'sync',
      color: '#666',
      screenName: 'Sync',
    },
    {
      id: 'data',
      name: 'Data Management',
      description: 'View and manage synced data',
      icon: 'storage',
      color: '#666',
      screenName: 'Data',
    },
    {
      id: 'testing',
      name: 'Testing',
      description: 'System diagnostics and testing',
      icon: 'bug-report',
      color: '#666',
      screenName: 'Testing',
    },
    {
      id: 'calendar',
      name: 'Calendar',
      description: 'Schedule and appointments',
      icon: 'calendar-today',
      color: '#007AFF',
      screenName: 'Calendar',
    },
    {
      id: 'settings',
      name: 'Settings',
      description: 'App configuration and preferences',
      icon: 'settings',
      color: '#8E8E93',
      screenName: 'Settings',
    },
  ];

  const handleRefresh = () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleItemPress = (item: MoreItem) => {
    navigateToScreen(item.screenName);
  };

  const renderMoreItem = (item: MoreItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.moreItem}
      onPress={() => handleItemPress(item)}
    >
      <View style={[styles.itemIcon, { backgroundColor: item.color + '15' }]}>
        <MaterialIcons name={item.icon as any} size={24} color={item.color} />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemDescription}>{item.description}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>More</Text>
          <Text style={styles.headerSubtitle}>{user?.name || 'Additional Features'}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* More Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Features</Text>
          <View style={styles.itemsList}>
            {moreItems.map(renderMoreItem)}
          </View>
        </View>

        <View style={styles.footerSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  itemsList: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  moreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
  },
  footerSpace: {
    height: 100,
  },
});
