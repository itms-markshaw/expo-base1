/**
 * 901_SettingsMain - Main settings dashboard
 * Screen Number: 901
 * Model: app.settings
 * Type: main
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import ScreenBadge from '../../../components/ScreenBadge';

export default function SettingsMainScreen({ navigation }: any) {
  const navigateToCategory = (screenNumber: string) => {
    const screenMap: { [key: string]: string } = {
      '902': 'AccountSettings',
      '903': 'ServerSettings',
      '904': 'NotificationSettings',
      '905': 'PrivacySettings',
      '906': 'AppearanceSettings',
      '907': 'SyncPreferences',
      '152': 'ChatSettings',
    };

    const screenName = screenMap[screenNumber];
    if (screenName) {
      navigation.navigate(screenName);
    }
  };

  const settingsCategories = [
    {
      id: '902',
      title: 'Account Settings',
      description: 'User profile and account preferences',
      icon: 'account-circle',
      color: '#007AFF',
    },
    {
      id: '152',
      title: 'Chat Settings',
      description: 'Chat channels and messaging preferences',
      icon: 'chat',
      color: '#00BCD4',
    },
    {
      id: '904',
      title: 'Notification Settings',
      description: 'Push notifications and alerts',
      icon: 'notifications',
      color: '#FF9500',
    },
    {
      id: '905',
      title: 'Privacy Settings',
      description: 'Security and privacy controls',
      icon: 'security',
      color: '#34C759',
    },
    {
      id: '907',
      title: 'Sync Preferences',
      description: 'Data synchronization settings',
      icon: 'sync',
      color: '#5856D6',
    },
    {
      id: '906',
      title: 'Appearance Settings',
      description: 'Theme and display preferences',
      icon: 'palette',
      color: '#FF2D92',
    },
    {
      id: '903',
      title: 'Server Settings',
      description: 'Connection and server configuration',
      icon: 'dns',
      color: '#8E8E93',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBadge screenNumber={901} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Categories Header */}
        <View style={styles.categoriesHeader}>
          <Text style={styles.categoriesTitle}>Categories</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>901</Text>
          </View>
        </View>

        {/* Settings Categories */}
        <View style={styles.categoriesContainer}>
          {settingsCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              onPress={() => navigateToCategory(category.id)}
            >
              <View style={[styles.iconContainer, { backgroundColor: `${category.color}15` }]}>
                <MaterialIcons 
                  name={category.icon as any} 
                  size={24} 
                  color={category.color} 
                />
              </View>
              <View style={styles.categoryContent}>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categoryDescription}>{category.description}</Text>
                <Text style={styles.screenNumber}>Screen {category.id}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#C7C7CC" />
            </TouchableOpacity>
          ))}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  content: {
    flex: 1,
  },
  categoriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  categoriesTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
  },
  badge: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  categoriesContainer: {
    paddingHorizontal: 20,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  screenNumber: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
});
