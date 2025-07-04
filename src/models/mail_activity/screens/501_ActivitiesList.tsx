/**
 * 501_ActivitiesList - Professional activity and task management interface
 * Screen Number: 501
 * Model: mail.activity
 * Type: list
 *
 * MIGRATED: From src/screens/ActivitiesScreen.tsx
 * Professional activity and task management interface
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import ActivitiesComponent from '../../../components/ActivitiesComponent';
import { useAppNavigation } from '../../../components/AppNavigationProvider';
import ScreenBadge from '../../../components/ScreenBadge';

export default function ActivitiesScreen() {
  const { showUniversalSearch } = useAppNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <ScreenBadge screenNumber={501} />
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Activities</Text>
          <Text style={styles.headerSubtitle}>Tasks and reminders</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={showUniversalSearch}
          >
            <MaterialIcons name="search" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => Alert.alert('Profile', 'User profile screen')}
          >
            <MaterialIcons name="account-circle" size={32} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Breadcrumb */}
      <View style={styles.breadcrumb}>
        <MaterialIcons name="event-note" size={16} color="#9C27B0" />
        <Text style={styles.breadcrumbText}>Operations</Text>
        <MaterialIcons name="chevron-right" size={16} color="#C7C7CC" />
        <Text style={styles.breadcrumbText}>Activities</Text>
      </View>

      {/* Activities Component */}
      <ActivitiesComponent />
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchButton: {
    padding: 8,
    borderRadius: 8,
  },
  profileButton: {
    padding: 4,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 4,
  },
  breadcrumbText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
});
