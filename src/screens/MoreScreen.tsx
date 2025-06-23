/**
 * More Screen
 * Additional features and modules navigation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../store';
import { useAppNavigation } from '../components/AppNavigationProvider';

interface MoreItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  onPress: () => void;
}

interface MoreCategory {
  id: string;
  name: string;
  items: MoreItem[];
}

export default function MoreScreen() {
  const { user } = useAppStore();
  const { navigateToScreen } = useAppNavigation();

  // More categories with additional modules
  const moreCategories: MoreCategory[] = [
    {
      id: 'business',
      name: 'Business Modules',
      items: [
        {
          id: 'contacts',
          name: 'Contacts',
          icon: 'people',
          color: '#007AFF',
          description: 'Customers and suppliers',
          onPress: () => navigateToScreen('Contacts'),
        },
        {
          id: 'employees',
          name: 'Employees',
          icon: 'badge',
          color: '#FF6B35',
          description: 'Human resources',
          onPress: () => navigateToScreen('Employees'),
        },
        {
          id: 'projects',
          name: 'Projects',
          icon: 'folder',
          color: '#FF9500',
          description: 'Project management',
          onPress: () => navigateToScreen('Projects'),
        },
        {
          id: 'helpdesk',
          name: 'Helpdesk',
          icon: 'support',
          color: '#FF3B30',
          description: 'Support tickets',
          onPress: () => navigateToScreen('Helpdesk'),
        },
      ],
    },
    {
      id: 'communication',
      name: 'Communication',
      items: [
        {
          id: 'messages',
          name: 'Messages',
          icon: 'message',
          color: '#007AFF',
          description: 'Communications',
          onPress: () => navigateToScreen('Messages'),
        },
        {
          id: 'attachments',
          name: 'Attachments',
          icon: 'attach-file',
          color: '#34C759',
          description: 'File management',
          onPress: () => navigateToScreen('Attachments'),
        },
      ],
    },
    {
      id: 'tools',
      name: 'Tools & Settings',
      items: [
        {
          id: 'calendar',
          name: 'Calendar',
          icon: 'event',
          color: '#FF3B30',
          description: 'Schedule and events',
          onPress: () => navigateToScreen('Calendar'),
        },
        {
          id: 'mobile',
          name: 'Field Service',
          icon: 'smartphone',
          color: '#9C27B0',
          description: 'Mobile tools',
          onPress: () => navigateToScreen('Mobile'),
        },
        {
          id: 'sync',
          name: 'Data Sync',
          icon: 'sync',
          color: '#666',
          description: 'Synchronization',
          onPress: () => navigateToScreen('Sync'),
        },
      ],
    },
  ];

  const renderMoreItem = (item: MoreItem) => (
    <TouchableOpacity key={item.id} style={styles.moreItem} onPress={item.onPress}>
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

  const renderMoreCategory = (category: MoreCategory) => (
    <View key={category.id} style={styles.categoryContainer}>
      <Text style={styles.categoryName}>{category.name}</Text>
      <View style={styles.categoryItems}>
        {category.items.map(renderMoreItem)}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>More</Text>
          <Text style={styles.headerSubtitle}>Additional features and tools</Text>
        </View>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => Alert.alert('Profile', 'User profile screen would open here')}
        >
          <MaterialIcons name="account-circle" size={32} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* More Categories */}
      <ScrollView
        style={styles.categoriesList}
        showsVerticalScrollIndicator={false}
      >
        {moreCategories.map(renderMoreCategory)}
        
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
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  profileButton: {
    padding: 4,
  },
  categoriesList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  categoryContainer: {
    marginBottom: 24,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  categoryItems: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 12,
    color: '#666',
  },
  footerSpace: {
    height: 32,
  },
});
