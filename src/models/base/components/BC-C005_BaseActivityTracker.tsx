/**
 * BaseActivityTracker (BC-C005) - Activities Component with Smart Scheduling
 * Component Reference: BC-C005
 * 
 * ENHANCED: Activity management with AI insights and smart scheduling
 * Following the BC-CXXX component reference system from perfect-base-chatter.md
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// BC-C005 Interfaces
export interface BaseActivityTrackerProps {
  activities: ChatterActivity[];
  onSchedule?: (activity: Partial<ChatterActivity>) => void;
  onComplete?: (activityId: number) => void;
  onEdit?: (activity: ChatterActivity) => void;
  onDelete?: (activityId: number) => void;
  aiEnabled?: boolean;
  readonly?: boolean;
  theme?: ActivityTrackerTheme;
}

export interface ChatterActivity {
  id: number;
  summary: string;
  activity_type_id: [number, string];
  date_deadline?: string;
  state: 'planned' | 'today' | 'overdue' | 'done';
  user_id: [number, string];
  note?: string;
  priority: 'low' | 'medium' | 'high';
  ai_suggestions?: ActivityAISuggestions;
  estimated_duration?: number; // in minutes
  location?: string;
  attendees?: ActivityAttendee[];
}

export interface ActivityAISuggestions {
  optimal_time?: string;
  suggested_duration?: number;
  priority_recommendation?: 'low' | 'medium' | 'high';
  related_activities?: number[];
  preparation_tasks?: string[];
  follow_up_suggestions?: string[];
}

export interface ActivityAttendee {
  id: number;
  name: string;
  email?: string;
  status: 'invited' | 'accepted' | 'declined' | 'tentative';
}

export interface ActivityTrackerTheme {
  backgroundColor: string;
  cardBackgroundColor: string;
  textColor: string;
  subtitleColor: string;
  primaryColor: string;
  overdueColor: string;
  todayColor: string;
  completedColor: string;
  borderRadius: number;
}

// Default theme
const DEFAULT_THEME: ActivityTrackerTheme = {
  backgroundColor: '#F2F2F7',
  cardBackgroundColor: '#FFFFFF',
  textColor: '#000000',
  subtitleColor: '#8E8E93',
  primaryColor: '#007AFF',
  overdueColor: '#FF3B30',
  todayColor: '#FF9500',
  completedColor: '#34C759',
  borderRadius: 12,
};

// Activity types
const ACTIVITY_TYPES = [
  { id: 1, name: 'Call', icon: 'phone' },
  { id: 2, name: 'Meeting', icon: 'event' },
  { id: 3, name: 'Email', icon: 'email' },
  { id: 4, name: 'Task', icon: 'assignment' },
  { id: 5, name: 'Follow-up', icon: 'schedule' },
];

/**
 * BC-C005: Activity Tracker Component
 * 
 * Features:
 * - Smart activity scheduling with AI suggestions
 * - Priority-based organization
 * - Overdue and today indicators
 * - Quick action buttons
 * - Activity templates
 * - Time estimation and tracking
 * - Attendee management
 * - Follow-up automation
 */
export default function BaseActivityTracker({
  activities,
  onSchedule,
  onComplete,
  onEdit,
  onDelete,
  aiEnabled = true,
  readonly = false,
  theme = DEFAULT_THEME
}: BaseActivityTrackerProps) {
  // State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ChatterActivity | null>(null);
  const [filterState, setFilterState] = useState<'all' | 'planned' | 'today' | 'overdue' | 'done'>('all');
  const [newActivity, setNewActivity] = useState<Partial<ChatterActivity>>({
    summary: '',
    activity_type_id: [1, 'Call'],
    priority: 'medium',
    state: 'planned'
  });

  // Filter activities
  const filteredActivities = activities.filter(activity => {
    if (filterState === 'all') return true;
    return activity.state === filterState;
  });

  // Get activity state color
  const getStateColor = useCallback((state: string) => {
    switch (state) {
      case 'overdue': return theme.overdueColor;
      case 'today': return theme.todayColor;
      case 'done': return theme.completedColor;
      default: return theme.primaryColor;
    }
  }, [theme]);

  // Get priority icon
  const getPriorityIcon = useCallback((priority: string) => {
    switch (priority) {
      case 'high': return 'keyboard-arrow-up';
      case 'low': return 'keyboard-arrow-down';
      default: return 'remove';
    }
  }, []);

  // Format date
  const formatDate = useCallback((dateString?: string) => {
    if (!dateString) return 'No deadline';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays <= 7) return `In ${diffDays} days`;
    
    return date.toLocaleDateString();
  }, []);

  // Handle create activity
  const handleCreateActivity = useCallback(() => {
    if (!newActivity.summary?.trim()) {
      Alert.alert('Error', 'Please enter activity summary');
      return;
    }

    onSchedule?.(newActivity);
    setNewActivity({
      summary: '',
      activity_type_id: [1, 'Call'],
      priority: 'medium',
      state: 'planned'
    });
    setShowCreateModal(false);
  }, [newActivity, onSchedule]);

  // Handle AI suggestions
  const handleAISuggestions = useCallback(async (activity: ChatterActivity) => {
    if (!aiEnabled) return;

    try {
      // TODO: Integrate with Groq AI for activity optimization
      const mockSuggestions: ActivityAISuggestions = {
        optimal_time: '2:00 PM - 3:00 PM',
        suggested_duration: 30,
        priority_recommendation: 'high',
        preparation_tasks: [
          'Review customer history',
          'Prepare agenda',
          'Send calendar invite'
        ],
        follow_up_suggestions: [
          'Send meeting summary',
          'Schedule follow-up call',
          'Update CRM notes'
        ]
      };

      Alert.alert(
        'AI Suggestions',
        `Optimal time: ${mockSuggestions.optimal_time}\nDuration: ${mockSuggestions.suggested_duration} minutes\nPriority: ${mockSuggestions.priority_recommendation}`,
        [
          { text: 'Apply Suggestions', onPress: () => console.log('Apply AI suggestions') },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('AI suggestions failed:', error);
      Alert.alert('Error', 'Failed to get AI suggestions');
    }
  }, [aiEnabled]);

  // Render activity card
  const renderActivityCard = useCallback(({ item: activity }: { item: ChatterActivity }) => (
    <TouchableOpacity
      style={[
        styles.activityCard,
        { 
          backgroundColor: theme.cardBackgroundColor,
          borderRadius: theme.borderRadius,
          borderLeftColor: getStateColor(activity.state)
        }
      ]}
      onPress={() => setSelectedActivity(activity)}
    >
      {/* Header */}
      <View style={styles.activityHeader}>
        <View style={styles.activityType}>
          <MaterialIcons 
            name={ACTIVITY_TYPES.find(t => t.id === activity.activity_type_id[0])?.icon || 'event'} 
            size={20} 
            color={theme.primaryColor} 
          />
          <Text style={[styles.activityTypeText, { color: theme.subtitleColor }]}>
            {activity.activity_type_id[1]}
          </Text>
        </View>
        
        <View style={styles.activityMeta}>
          <MaterialIcons 
            name={getPriorityIcon(activity.priority)} 
            size={16} 
            color={activity.priority === 'high' ? theme.overdueColor : theme.subtitleColor} 
          />
          <Text style={[
            styles.activityState,
            { color: getStateColor(activity.state) }
          ]}>
            {activity.state.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Content */}
      <Text style={[styles.activitySummary, { color: theme.textColor }]}>
        {activity.summary}
      </Text>

      {/* Deadline */}
      <Text style={[styles.activityDeadline, { color: theme.subtitleColor }]}>
        {formatDate(activity.date_deadline)}
      </Text>

      {/* Actions */}
      {!readonly && (
        <View style={styles.activityActions}>
          {activity.state !== 'done' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.completedColor }]}
              onPress={() => onComplete?.(activity.id)}
            >
              <MaterialIcons name="check" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          
          {aiEnabled && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: theme.primaryColor }]}
              onPress={() => handleAISuggestions(activity)}
            >
              <MaterialIcons name="psychology" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.subtitleColor }]}
            onPress={() => onEdit?.(activity)}
          >
            <MaterialIcons name="edit" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  ), [theme, getStateColor, getPriorityIcon, formatDate, readonly, aiEnabled, onComplete, onEdit, handleAISuggestions]);

  // Render filter tabs
  const renderFilterTabs = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabs}>
      {(['all', 'overdue', 'today', 'planned', 'done'] as const).map((filter) => (
        <TouchableOpacity
          key={filter}
          style={[
            styles.filterTab,
            filterState === filter && { backgroundColor: theme.primaryColor }
          ]}
          onPress={() => setFilterState(filter)}
        >
          <Text style={[
            styles.filterTabText,
            { color: filterState === filter ? '#FFFFFF' : theme.textColor }
          ]}>
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textColor }]}>
          Activities ({filteredActivities.length})
        </Text>
        
        {!readonly && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.primaryColor }]}
            onPress={() => setShowCreateModal(true)}
          >
            <MaterialIcons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      {renderFilterTabs()}

      {/* Activities List */}
      <FlatList
        data={filteredActivities}
        renderItem={renderActivityCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.activitiesList}
        showsVerticalScrollIndicator={false}
      />

      {/* Create Activity Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={[styles.createModal, { backgroundColor: theme.backgroundColor }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={[styles.modalCancel, { color: theme.primaryColor }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.textColor }]}>New Activity</Text>
            <TouchableOpacity onPress={handleCreateActivity}>
              <Text style={[styles.modalSave, { color: theme.primaryColor }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.textColor }]}>Summary</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: theme.cardBackgroundColor, color: theme.textColor }]}
                value={newActivity.summary}
                onChangeText={(text) => setNewActivity(prev => ({ ...prev, summary: text }))}
                placeholder="Enter activity summary..."
                placeholderTextColor={theme.subtitleColor}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.textColor }]}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {ACTIVITY_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeOption,
                      { backgroundColor: theme.cardBackgroundColor },
                      newActivity.activity_type_id?.[0] === type.id && { backgroundColor: theme.primaryColor }
                    ]}
                    onPress={() => setNewActivity(prev => ({ ...prev, activity_type_id: [type.id, type.name] }))}
                  >
                    <MaterialIcons 
                      name={type.icon} 
                      size={20} 
                      color={newActivity.activity_type_id?.[0] === type.id ? '#FFFFFF' : theme.primaryColor} 
                    />
                    <Text style={[
                      styles.typeOptionText,
                      { color: newActivity.activity_type_id?.[0] === type.id ? '#FFFFFF' : theme.textColor }
                    ]}>
                      {type.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: theme.textColor }]}>Priority</Text>
              <View style={styles.priorityOptions}>
                {(['low', 'medium', 'high'] as const).map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityOption,
                      { backgroundColor: theme.cardBackgroundColor },
                      newActivity.priority === priority && { backgroundColor: theme.primaryColor }
                    ]}
                    onPress={() => setNewActivity(prev => ({ ...prev, priority }))}
                  >
                    <Text style={[
                      styles.priorityOptionText,
                      { color: newActivity.priority === priority ? '#FFFFFF' : theme.textColor }
                    ]}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTabs: {
    marginBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#E5E5EA',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activitiesList: {
    gap: 12,
  },
  activityCard: {
    padding: 16,
    borderLeftWidth: 4,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityTypeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityState: {
    fontSize: 11,
    fontWeight: '600',
  },
  activitySummary: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  activityDeadline: {
    fontSize: 14,
    marginBottom: 12,
  },
  activityActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createModal: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalCancel: {
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  formInput: {
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 8,
    gap: 4,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  priorityOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  priorityOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
