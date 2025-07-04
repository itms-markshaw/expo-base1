/**
 * 108_ContactActivities - Contact activities/tasks view
 * Screen Number: 108
 * Model: res.partner
 * Type: activities
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  FlatList,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BaseChatterService } from '../../base/services/BaseChatterService';
import { BaseActivity, ActivityConfig } from '../../base/types/BaseChatter';
import { contactService } from '../services/ContactService';
import { Contact } from '../types/Contact';
import ScreenBadge from '../../../components/ScreenBadge';

interface ContactActivitiesProps {
  contactId: number;
  onBack?: () => void;
  readonly?: boolean;
}

export default function ContactActivities({
  contactId,
  onBack,
  readonly = false,
}: ContactActivitiesProps) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [activities, setActivities] = useState<BaseActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newActivity, setNewActivity] = useState({
    summary: '',
    note: '',
    deadline: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, [contactId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contactData, activitiesData] = await Promise.all([
        contactService.getContactDetail(contactId),
        BaseChatterService.getActivities('res.partner', contactId),
      ]);
      
      setContact(contactData);
      setActivities(activitiesData);
    } catch (error) {
      console.error('Failed to load contact activities:', error);
      Alert.alert('Error', 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateActivity = async () => {
    if (!newActivity.summary.trim()) {
      Alert.alert('Error', 'Activity summary is required');
      return;
    }

    setCreating(true);
    try {
      const activityConfig: ActivityConfig = {
        modelName: 'res.partner',
        recordId: contactId,
        summary: newActivity.summary,
        note: newActivity.note || undefined,
        deadline: newActivity.deadline,
      };

      const activityId = await BaseChatterService.scheduleActivity(activityConfig);
      if (activityId) {
        Alert.alert('Success', 'Activity scheduled successfully');
        setShowCreateModal(false);
        setNewActivity({
          summary: '',
          note: '',
          deadline: new Date().toISOString().split('T')[0],
        });
        await loadData(); // Refresh the list
      } else {
        Alert.alert('Error', 'Failed to schedule activity');
      }
    } catch (error) {
      console.error('Failed to create activity:', error);
      Alert.alert('Error', 'Failed to schedule activity');
    } finally {
      setCreating(false);
    }
  };

  const handleMarkDone = async (activity: BaseActivity) => {
    Alert.alert(
      'Mark as Done',
      `Mark "${activity.summary}" as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Done',
          onPress: async () => {
            try {
              const success = await BaseChatterService.markActivityDone(activity.id);
              if (success) {
                Alert.alert('Success', 'Activity marked as done');
                await loadData(); // Refresh the list
              } else {
                Alert.alert('Error', 'Failed to mark activity as done');
              }
            } catch (error) {
              console.error('Failed to mark activity as done:', error);
              Alert.alert('Error', 'Failed to mark activity as done');
            }
          },
        },
      ]
    );
  };

  const getActivityIcon = (state: string) => {
    switch (state) {
      case 'overdue': return 'warning';
      case 'today': return 'today';
      case 'planned': return 'schedule';
      default: return 'event-note';
    }
  };

  const getActivityColor = (state: string) => {
    switch (state) {
      case 'overdue': return '#FF3B30';
      case 'today': return '#FF9500';
      case 'planned': return '#007AFF';
      default: return '#8E8E93';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <MaterialIcons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {contact?.name || 'Contact'} - Activities
          </Text>
          <Text style={styles.headerSubtitle}>
            {activities.length} activit{activities.length !== 1 ? 'ies' : 'y'}
          </Text>
        </View>
      </View>
      
      {!readonly && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <MaterialIcons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderActivity = ({ item }: { item: BaseActivity }) => (
    <View style={styles.activityCard}>
      <View style={styles.activityHeader}>
        <View style={styles.activityIcon}>
          <MaterialIcons 
            name={getActivityIcon(item.state) as any} 
            size={20} 
            color={getActivityColor(item.state)} 
          />
        </View>
        
        <View style={styles.activityInfo}>
          <Text style={styles.activitySummary}>{item.summary}</Text>
          <Text style={styles.activityType}>
            {Array.isArray(item.activity_type_id) ? item.activity_type_id[1] : 'Activity'}
          </Text>
          <Text style={[styles.activityDeadline, { color: getActivityColor(item.state) }]}>
            Due: {formatDate(item.date_deadline)}
          </Text>
        </View>
        
        {!readonly && (
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => handleMarkDone(item)}
          >
            <MaterialIcons name="check-circle" size={24} color="#34C759" />
          </TouchableOpacity>
        )}
      </View>
      
      {item.note && (
        <Text style={styles.activityNote}>{item.note}</Text>
      )}
      
      <View style={styles.activityFooter}>
        <Text style={styles.activityAssignee}>
          Assigned to: {Array.isArray(item.user_id) ? item.user_id[1] : 'Unknown'}
        </Text>
        <Text style={styles.activityCreated}>
          Created: {new Date(item.create_date).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="event-note" size={64} color="#C7C7CC" />
      <Text style={styles.emptyTitle}>No activities</Text>
      <Text style={styles.emptySubtext}>
        {readonly 
          ? 'This contact has no scheduled activities'
          : 'Schedule activities to track follow-ups and tasks'
        }
      </Text>
      {!readonly && (
        <TouchableOpacity
          style={styles.emptyAddButton}
          onPress={() => setShowCreateModal(true)}
        >
          <MaterialIcons name="add" size={20} color="#FFF" />
          <Text style={styles.emptyAddButtonText}>Schedule First Activity</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderCreateModal = () => (
    <Modal
      visible={showCreateModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalCancelButton}
            onPress={() => setShowCreateModal(false)}
          >
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          
          <Text style={styles.modalTitle}>New Activity</Text>
          
          <TouchableOpacity
            style={[styles.modalSaveButton, creating && styles.modalSaveButtonDisabled]}
            onPress={handleCreateActivity}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.modalSaveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalContent}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Summary *</Text>
            <TextInput
              style={styles.textInput}
              value={newActivity.summary}
              onChangeText={(text) => setNewActivity(prev => ({ ...prev, summary: text }))}
              placeholder="Enter activity summary"
              placeholderTextColor="#C7C7CC"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Due Date</Text>
            <TextInput
              style={styles.textInput}
              value={newActivity.deadline}
              onChangeText={(text) => setNewActivity(prev => ({ ...prev, deadline: text }))}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#C7C7CC"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={newActivity.note}
              onChangeText={(text) => setNewActivity(prev => ({ ...prev, note: text }))}
              placeholder="Enter additional notes"
              placeholderTextColor="#C7C7CC"
              multiline
              numberOfLines={4}
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading activities...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}

      <FlatList
        data={activities}
        renderItem={renderActivity}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={activities.length === 0 ? styles.emptyContainer : styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
      />

      {renderCreateModal()}
          <ScreenBadge screenNumber={108} />
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
    borderBottomColor: '#E5E5EA',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  addButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
  },
  activityCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  activityIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  activityInfo: {
    flex: 1,
  },
  activitySummary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  activityType: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  activityDeadline: {
    fontSize: 14,
    fontWeight: '500',
  },
  doneButton: {
    padding: 4,
  },
  activityNote: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  activityFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 8,
    gap: 2,
  },
  activityAssignee: {
    fontSize: 12,
    color: '#8E8E93',
  },
  activityCreated: {
    fontSize: 12,
    color: '#C7C7CC',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#C7C7CC',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 24,
  },
  emptyAddButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalCancelButton: {
    padding: 8,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalSaveButton: {
    padding: 8,
  },
  modalSaveButtonDisabled: {
    opacity: 0.5,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
});
