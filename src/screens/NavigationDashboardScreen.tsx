/**
 * Activity Dashboard Screen
 * Activity-focused dashboard with today's tasks and quick actions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppStore } from '../store';
import { useAppNavigation } from '../components/AppNavigationProvider';

interface QuickAction {
  id: string;
  name: string;
  icon: string;
  color: string;
  onPress: () => void;
}

interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'task' | 'meeting' | 'call' | 'email';
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  status: 'pending' | 'overdue' | 'completed';
}

export default function NavigationDashboardScreen() {
  const { user, databaseStats, loadDatabaseStats } = useAppStore();
  const { showUniversalSearch, navigateToScreen } = useAppNavigation();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDatabaseStats();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDatabaseStats();
    setRefreshing(false);
  };

  // Quick actions for common tasks
  const quickActions: QuickAction[] = [
    {
      id: 'new-lead',
      name: 'New Lead',
      icon: 'person-add',
      color: '#34C759',
      onPress: () => Alert.alert('New Lead', 'Create new lead functionality'),
    },
    {
      id: 'new-task',
      name: 'New Task',
      icon: 'add-task',
      color: '#FF9500',
      onPress: () => Alert.alert('New Task', 'Create new task functionality'),
    },
    {
      id: 'scan',
      name: 'Scan',
      icon: 'qr-code-scanner',
      color: '#9C27B0',
      onPress: () => Alert.alert('Scan', 'QR/Barcode scanner functionality'),
    },
    {
      id: 'photo',
      name: 'Photo',
      icon: 'camera-alt',
      color: '#007AFF',
      onPress: () => Alert.alert('Photo', 'Camera functionality'),
    },
  ];

  // Today's activities (mock data for now)
  const todaysActivities: ActivityItem[] = [
    {
      id: '1',
      title: 'Follow up with John Smith',
      subtitle: 'Call scheduled for 2:00 PM',
      type: 'call',
      priority: 'high',
      dueDate: 'Today 2:00 PM',
      status: 'pending',
    },
    {
      id: '2',
      title: 'Review proposal for ABC Corp',
      subtitle: 'Proposal deadline tomorrow',
      type: 'task',
      priority: 'high',
      dueDate: 'Today 4:00 PM',
      status: 'pending',
    },
    {
      id: '3',
      title: 'Team meeting - Q4 Planning',
      subtitle: 'Conference Room A',
      type: 'meeting',
      priority: 'medium',
      dueDate: 'Today 3:30 PM',
      status: 'pending',
    },
    {
      id: '4',
      title: 'Send quote to XYZ Ltd',
      subtitle: 'Quote #QT-2024-001',
      type: 'email',
      priority: 'medium',
      dueDate: 'Today 5:00 PM',
      status: 'pending',
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return 'phone';
      case 'meeting': return 'event';
      case 'email': return 'email';
      case 'task': return 'task-alt';
      default: return 'event-note';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#FF3B30';
      case 'medium': return '#FF9500';
      case 'low': return '#34C759';
      default: return '#666';
    }
  };

  const renderQuickAction = (action: QuickAction) => (
    <TouchableOpacity key={action.id} style={styles.quickAction} onPress={action.onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: action.color + '15' }]}>
        <MaterialIcons name={action.icon as any} size={24} color={action.color} />
      </View>
      <Text style={styles.quickActionText}>{action.name}</Text>
    </TouchableOpacity>
  );

  const renderActivityItem = (activity: ActivityItem) => (
    <TouchableOpacity key={activity.id} style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: getPriorityColor(activity.priority) + '15' }]}>
        <MaterialIcons
          name={getActivityIcon(activity.type) as any}
          size={20}
          color={getPriorityColor(activity.priority)}
        />
      </View>
      <View style={styles.activityInfo}>
        <Text style={styles.activityTitle}>{activity.title}</Text>
        <Text style={styles.activitySubtitle}>{activity.subtitle}</Text>
        <Text style={styles.activityDue}>{activity.dueDate}</Text>
      </View>
      <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor(activity.priority) }]} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>Today's activities and quick actions</Text>
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

      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Good morning, {user?.name || 'User'}!</Text>
        <Text style={styles.welcomeSubtext}>You have {todaysActivities.length} tasks for today</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map(renderQuickAction)}
          </View>
        </View>

        {/* Today's Activities */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Activities</Text>
            <TouchableOpacity onPress={() => navigateToScreen('Activities')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.activitiesList}>
            {todaysActivities.map(renderActivityItem)}
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
  welcomeSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  seeAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  activitiesList: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  activityDue: {
    fontSize: 11,
    color: '#999',
  },
  priorityIndicator: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  footerSpace: {
    height: 32,
  },
});
