/**
 * Calendar Screen
 * Unified calendar view with Odoo activities and device calendar events
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import CalendarDashboardComponent from '../components/CalendarDashboardComponent';
import CalendarIntegrationComponent from '../components/CalendarIntegrationComponent';

type CalendarView = 'day' | 'week' | 'month';

export default function CalendarScreen() {
  const [currentView, setCurrentView] = useState<CalendarView>('day');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const views = [
    { id: 'day' as CalendarView, name: 'Day', icon: 'today' },
    { id: 'week' as CalendarView, name: 'Week', icon: 'view-week' },
    { id: 'month' as CalendarView, name: 'Month', icon: 'calendar-month' },
  ];

  const renderContent = () => {
    switch (currentView) {
      case 'day':
        return <CalendarDashboardComponent />;
      case 'week':
        return (
          <View style={styles.comingSoon}>
            <MaterialIcons name="view-week" size={64} color="#007AFF" />
            <Text style={styles.comingSoonTitle}>Week View</Text>
            <Text style={styles.comingSoonText}>
              Weekly calendar view with drag-and-drop scheduling coming soon.
            </Text>
          </View>
        );
      case 'month':
        return (
          <View style={styles.comingSoon}>
            <MaterialIcons name="calendar-month" size={64} color="#007AFF" />
            <Text style={styles.comingSoonTitle}>Month View</Text>
            <Text style={styles.comingSoonText}>
              Monthly calendar overview with event density indicators coming soon.
            </Text>
          </View>
        );
      default:
        return <CalendarDashboardComponent />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendar</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowCreateModal(true)}
          >
            <MaterialIcons name="add" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialIcons name="search" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* View Selector */}
      <View style={styles.viewSelector}>
        {views.map((view) => (
          <TouchableOpacity
            key={view.id}
            style={[
              styles.viewTab,
              currentView === view.id && styles.viewTabActive
            ]}
            onPress={() => setCurrentView(view.id)}
          >
            <MaterialIcons
              name={view.icon as any}
              size={18}
              color={currentView === view.id ? '#007AFF' : '#666'}
            />
            <Text style={[
              styles.viewTabText,
              currentView === view.id && styles.viewTabTextActive
            ]}>
              {view.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* Create Activity Modal */}
      <CalendarIntegrationComponent
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onActivityCreated={(activityId) => {
          console.log('Activity created from calendar:', activityId);
          // Refresh calendar data if needed
        }}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 6,
  },
  viewSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingHorizontal: 4,
  },
  viewTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 6,
  },
  viewTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  viewTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  viewTabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  comingSoon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
    textAlign: 'center',
  },
  comingSoonText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
});
