/**
 * Comprehensive Activities Component
 * Full-screen activities management with swipe actions, quick tasks, and workflow progression
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { authService } from '../models/base/services/BaseAuthService';
import CalendarIntegrationComponent from './CalendarIntegrationComponent';
import { calendarService } from '../models/calendar_event/services/CalendarEventService';
import FilterBottomSheet from './FilterBottomSheet';
import { formatRelationalField } from '../utils/relationalFieldUtils';

interface Activity {
  id: number;
  summary: string;
  note?: string;
  date_deadline: string;
  state: 'overdue' | 'today' | 'planned' | 'done';
  activity_type_id: [number, string];
  res_model: string;
  res_id: number;
  res_name: string;
  user_id: [number, string];
  create_uid: [number, string];
  create_date: string;
  priority: 'low' | 'normal' | 'high';
}

interface ActivityType {
  id: number;
  name: string;
  icon: string;
  decoration_type: string;
  default_note?: string;
}

export default function ActivitiesComponent() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'today' | 'overdue' | 'planned'>('today');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  
  // Form states
  const [newActivity, setNewActivity] = useState({
    summary: '',
    note: '',
    date_deadline: new Date().toISOString().split('T')[0],
    activity_type_id: 1,
    res_model: 'res.partner',
    res_id: 1,
    priority: 'normal' as const,
  });

  const filters = [
    { id: 'today', name: 'Today', icon: 'today', count: 0 },
    { id: 'overdue', name: 'Overdue', icon: 'warning', count: 0 },
    { id: 'planned', name: 'Planned', icon: 'schedule', count: 0 },
    { id: 'all', name: 'All', icon: 'list', count: 0 },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadActivities(),
        loadActivityTypes(),
      ]);
    } catch (error) {
      console.error('Failed to load activities data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      const client = authService.getClient();
      if (!client) return;

      // Get current user's activities
      const activities = await client.searchRead('mail.activity',
        [['user_id', '=', client.uid]],
        [
          'id', 'summary', 'note', 'date_deadline', 'state',
          'activity_type_id', 'res_model', 'res_id', 'res_name',
          'user_id', 'create_uid', 'create_date'
        ],
        { order: 'date_deadline asc' }
      );

      // Categorize activities
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      const categorizedActivities = activities.map(activity => {
        const deadline = new Date(activity.date_deadline);
        const deadlineStr = activity.date_deadline;
        
        let state: Activity['state'];
        if (deadlineStr < today) {
          state = 'overdue';
        } else if (deadlineStr === today) {
          state = 'today';
        } else {
          state = 'planned';
        }

        return {
          ...activity,
          state,
          priority: 'normal' as const, // Default priority
        };
      });

      setActivities(categorizedActivities);
    } catch (error) {
      console.error('Failed to load activities:', error);
      setActivities([]);
    }
  };

  const loadActivityTypes = async () => {
    try {
      const client = authService.getClient();
      if (!client) return;

      const types = await client.searchRead('mail.activity.type',
        [],
        ['id', 'name', 'icon', 'decoration_type', 'default_note'],
        { order: 'sequence asc' }
      );

      setActivityTypes(types);
    } catch (error) {
      console.error('Failed to load activity types:', error);
      // Fallback activity types
      setActivityTypes([
        { id: 1, name: 'Call', icon: 'phone', decoration_type: 'info' },
        { id: 2, name: 'Meeting', icon: 'event', decoration_type: 'warning' },
        { id: 3, name: 'Email', icon: 'email', decoration_type: 'success' },
        { id: 4, name: 'To Do', icon: 'check', decoration_type: 'danger' },
      ]);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getFilteredActivities = () => {
    switch (selectedFilter) {
      case 'today':
        return activities.filter(a => a.state === 'today');
      case 'overdue':
        return activities.filter(a => a.state === 'overdue');
      case 'planned':
        return activities.filter(a => a.state === 'planned');
      default:
        return activities;
    }
  };

  const getActivityIcon = (activityTypeId: number) => {
    const type = activityTypes.find(t => t.id === activityTypeId);
    return type?.icon || 'event';
  };

  const getActivityColor = (state: Activity['state'], priority: Activity['priority']) => {
    if (state === 'overdue') return '#FF3B30';
    if (priority === 'high') return '#FF9500';
    if (state === 'today') return '#007AFF';
    return '#34C759';
  };

  const getPriorityIcon = (priority: Activity['priority']) => {
    switch (priority) {
      case 'high': return 'priority-high';
      case 'low': return 'low-priority';
      default: return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateStr = date.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';
    if (dateStr === tomorrowStr) return 'Tomorrow';
    
    return date.toLocaleDateString();
  };

  const handleActivityPress = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowEditModal(true);
  };

  const handleSwipeAction = (activity: Activity, action: 'done' | 'reschedule' | 'delete') => {
    switch (action) {
      case 'done':
        markActivityDone(activity);
        break;
      case 'reschedule':
        rescheduleActivity(activity);
        break;
      case 'delete':
        deleteActivity(activity);
        break;
    }
  };

  const markActivityDone = async (activity: Activity) => {
    try {
      const client = authService.getClient();
      if (!client) return;

      await client.callModel('mail.activity', 'action_done', [activity.id]);
      
      // Post completion message
      await client.callModel(activity.res_model, 'message_post', [activity.res_id], {
        body: `<p>✅ <strong>Activity Completed:</strong> ${activity.summary}</p><p>Completed via mobile app</p>`,
      });

      await loadActivities();
      Alert.alert('Success', 'Activity marked as done');
    } catch (error) {
      Alert.alert('Error', 'Failed to mark activity as done');
    }
  };

  const rescheduleActivity = (activity: Activity) => {
    Alert.prompt(
      'Reschedule Activity',
      'Enter new date (YYYY-MM-DD):',
      async (newDate) => {
        if (newDate && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
          try {
            const client = authService.getClient();
            if (!client) return;

            await client.update('mail.activity', activity.id, {
              date_deadline: newDate,
            });

            await loadActivities();
            Alert.alert('Success', 'Activity rescheduled');
          } catch (error) {
            Alert.alert('Error', 'Failed to reschedule activity');
          }
        }
      },
      'plain-text',
      activity.date_deadline
    );
  };

  const deleteActivity = async (activity: Activity) => {
    Alert.alert(
      'Delete Activity',
      'Are you sure you want to delete this activity?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const client = authService.getClient();
              if (!client) return;

              await client.delete('mail.activity', activity.id);
              await loadActivities();
              Alert.alert('Success', 'Activity deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete activity');
            }
          },
        },
      ]
    );
  };

  const createActivity = async () => {
    try {
      const client = authService.getClient();
      if (!client) return;

      const activityData = {
        summary: newActivity.summary,
        note: newActivity.note,
        date_deadline: newActivity.date_deadline,
        activity_type_id: newActivity.activity_type_id,
        res_model: newActivity.res_model,
        res_id: newActivity.res_id,
        user_id: client.uid,
      };

      await client.create('mail.activity', activityData);
      
      setShowCreateModal(false);
      setNewActivity({
        summary: '',
        note: '',
        date_deadline: new Date().toISOString().split('T')[0],
        activity_type_id: 1,
        res_model: 'res.partner',
        res_id: 1,
        priority: 'normal',
      });
      
      await loadActivities();
      Alert.alert('Success', 'Activity created successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to create activity');
    }
  };

  const updateActivityCounts = () => {
    const counts = {
      today: activities.filter(a => a.state === 'today').length,
      overdue: activities.filter(a => a.state === 'overdue').length,
      planned: activities.filter(a => a.state === 'planned').length,
      all: activities.length,
    };

    return filters.map(filter => ({
      ...filter,
      count: counts[filter.id as keyof typeof counts],
    }));
  };

  const renderActivityCard = (activity: Activity) => (
    <View key={activity.id} style={styles.activityCard}>
      <TouchableOpacity
        style={[
          styles.activityMain,
          { borderLeftColor: getActivityColor(activity.state, activity.priority) }
        ]}
        onPress={() => handleActivityPress(activity)}
      >
        <View style={styles.activityRow}>
          <View style={[
            styles.activityIcon,
            { backgroundColor: getActivityColor(activity.state, activity.priority) + '15' }
          ]}>
            <MaterialIcons
              name={getActivityIcon(activity.activity_type_id[0]) as any}
              size={16}
              color={getActivityColor(activity.state, activity.priority)}
            />
          </View>

          <View style={styles.activityContent}>
            <View style={styles.activityHeader}>
              <Text style={styles.activitySummary} numberOfLines={1}>
                {activity.summary}
              </Text>
              <Text style={styles.activityTime}>
                {formatDate(activity.date_deadline)}
              </Text>
            </View>
            <View style={styles.activityMeta}>
              <Text style={styles.activityType}>
                {formatRelationalField(activity.activity_type_id)}
              </Text>
              <Text style={styles.activityRecord} numberOfLines={1}>
                {activity.res_name}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.activityMenuButton}
            onPress={() => handleActivityPress(activity)}
          >
            <MaterialIcons name="more-vert" size={16} color="#C7C7CC" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {/* Compact Swipe Actions */}
      <View style={styles.swipeActions}>
        <TouchableOpacity
          style={[styles.swipeAction, styles.doneAction]}
          onPress={() => handleSwipeAction(activity, 'done')}
        >
          <MaterialIcons name="check" size={16} color="#FFF" />
          <Text style={styles.swipeActionText}>Done</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.swipeAction, styles.rescheduleAction]}
          onPress={() => handleSwipeAction(activity, 'reschedule')}
        >
          <MaterialIcons name="schedule" size={16} color="#FFF" />
          <Text style={styles.swipeActionText}>Later</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.swipeAction, styles.deleteAction]}
          onPress={() => handleSwipeAction(activity, 'delete')}
        >
          <MaterialIcons name="delete" size={16} color="#FFF" />
          <Text style={styles.swipeActionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading activities...</Text>
      </View>
    );
  }

  const filteredActivities = getFilteredActivities();
  const filtersWithCounts = updateActivityCounts();

  return (
    <View style={styles.container}>
      {/* Compact Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>My Activities</Text>
          <Text style={styles.headerSubtitle}>
            {selectedFilter === 'all' ? 'All activities' :
             selectedFilter === 'today' ? 'Today\'s activities' :
             selectedFilter === 'overdue' ? 'Overdue activities' :
             'Planned activities'} • {filteredActivities.length}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterSheet(true)}
          >
            <MaterialIcons name="filter-list" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCalendarModal(true)}
          >
            <MaterialIcons name="event" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCreateModal(true)}
          >
            <MaterialIcons name="add" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Activities List */}
      <ScrollView
        style={styles.activitiesList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {filteredActivities.map(renderActivityCard)}

        {filteredActivities.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="event-available" size={64} color="#C7C7CC" />
            <Text style={styles.emptyTitle}>No activities</Text>
            <Text style={styles.emptySubtitle}>
              {selectedFilter === 'today' ? 'No activities scheduled for today' :
               selectedFilter === 'overdue' ? 'No overdue activities' :
               selectedFilter === 'planned' ? 'No planned activities' :
               'No activities found'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Create Activity Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Activity</Text>
            <TouchableOpacity onPress={createActivity}>
              <Text style={styles.saveButton}>Create</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Summary:</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Activity summary..."
              value={newActivity.summary}
              onChangeText={(text) => setNewActivity({...newActivity, summary: text})}
            />

            <Text style={styles.inputLabel}>Type:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
              {activityTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.typeOption,
                    newActivity.activity_type_id === type.id && styles.typeOptionActive
                  ]}
                  onPress={() => setNewActivity({...newActivity, activity_type_id: type.id})}
                >
                  <MaterialIcons name={type.icon as any} size={20} color={
                    newActivity.activity_type_id === type.id ? '#FFF' : '#666'
                  } />
                  <Text style={[
                    styles.typeOptionText,
                    newActivity.activity_type_id === type.id && styles.typeOptionTextActive
                  ]}>
                    {type.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Due Date:</Text>
            <TextInput
              style={styles.textInput}
              placeholder="YYYY-MM-DD"
              value={newActivity.date_deadline}
              onChangeText={(text) => setNewActivity({...newActivity, date_deadline: text})}
            />

            <Text style={styles.inputLabel}>Notes:</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Additional notes..."
              value={newActivity.note}
              onChangeText={(text) => setNewActivity({...newActivity, note: text})}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Calendar Integration Modal */}
      <CalendarIntegrationComponent
        visible={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        onActivityCreated={(activityId) => {
          console.log('Activity created with calendar:', activityId);
          loadActivities();
        }}
      />

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        title="Filter Activities"
        filters={filtersWithCounts}
        selectedFilter={selectedFilter}
        onFilterSelect={(filterId) => setSelectedFilter(filterId as any)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
    gap: 12,
  },
  activityCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterButton: {
    padding: 6,
    borderRadius: 6,
  },
  addButton: {
    padding: 6,
    borderRadius: 6,
  },
  activitiesList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  activityCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  activityMain: {
    borderLeftWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  activitySummary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 8,
  },
  activityTime: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityType: {
    fontSize: 11,
    color: '#007AFF',
    fontWeight: '500',
    backgroundColor: '#007AFF15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activityRecord: {
    fontSize: 11,
    color: '#666',
    flex: 1,
  },
  activityMenuButton: {
    padding: 4,
    marginLeft: 8,
  },
  swipeActions: {
    flexDirection: 'row',
    height: 44,
  },
  swipeAction: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  swipeActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
  doneAction: {
    backgroundColor: '#34C759',
  },
  rescheduleAction: {
    backgroundColor: '#FF9500',
  },
  deleteAction: {
    backgroundColor: '#FF3B30',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  typeSelector: {
    marginBottom: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  typeOptionActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 6,
  },
  typeOptionTextActive: {
    color: '#FFF',
  },
});
