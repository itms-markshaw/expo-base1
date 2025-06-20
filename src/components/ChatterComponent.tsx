/**
 * Universal Chatter Component
 * Provides messaging, activities, and followers for any Odoo model
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { 
  chatterService, 
  ChatterMessage, 
  ChatterActivity, 
  ChatterFollower,
  ActivityType 
} from '../services/chatterService';

interface ChatterComponentProps {
  model: string;
  recordId: number;
  recordName?: string;
}

type ChatterTab = 'messages' | 'activities' | 'followers';

export default function ChatterComponent({ model, recordId, recordName }: ChatterComponentProps) {
  const [activeTab, setActiveTab] = useState<ChatterTab>('messages');
  const [messages, setMessages] = useState<ChatterMessage[]>([]);
  const [activities, setActivities] = useState<ChatterActivity[]>([]);
  const [followers, setFollowers] = useState<ChatterFollower[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Message composition
  const [showMessageComposer, setShowMessageComposer] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  // Activity scheduling
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activitySummary, setActivitySummary] = useState('');
  const [selectedActivityType, setSelectedActivityType] = useState<number | null>(null);
  const [activityDueDate, setActivityDueDate] = useState('');

  useEffect(() => {
    loadData();
    loadActivityTypes();
  }, [model, recordId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [messagesData, activitiesData, followersData] = await Promise.all([
        chatterService.getMessages(model, recordId),
        chatterService.getActivities(model, recordId),
        chatterService.getFollowers(model, recordId),
      ]);

      setMessages(messagesData);
      setActivities(activitiesData);
      setFollowers(followersData);
    } catch (error) {
      console.error('Failed to load chatter data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActivityTypes = async () => {
    try {
      const types = await chatterService.getActivityTypes();
      setActivityTypes(types);
    } catch (error) {
      console.error('Failed to load activity types:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handlePostMessage = async () => {
    if (!messageText.trim()) return;

    try {
      const messageId = await chatterService.postMessage(
        model,
        recordId,
        messageText,
        isInternalNote
      );

      if (messageId) {
        setMessageText('');
        setShowMessageComposer(false);
        await loadData(); // Refresh to show new message
        Alert.alert('Success', 'Message posted successfully');
      } else {
        Alert.alert('Error', 'Failed to post message');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to post message');
    }
  };

  const handleScheduleActivity = async () => {
    if (!activitySummary.trim() || !selectedActivityType || !activityDueDate) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const activityId = await chatterService.scheduleActivity(
        model,
        recordId,
        selectedActivityType,
        activitySummary,
        activityDueDate
      );

      if (activityId) {
        setActivitySummary('');
        setSelectedActivityType(null);
        setActivityDueDate('');
        setShowActivityModal(false);
        await loadData(); // Refresh to show new activity
        Alert.alert('Success', 'Activity scheduled successfully');
      } else {
        Alert.alert('Error', 'Failed to schedule activity');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to schedule activity');
    }
  };

  const handleMarkActivityDone = async (activityId: number) => {
    Alert.alert(
      'Mark Activity Done',
      'Mark this activity as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Done',
          onPress: async () => {
            const success = await chatterService.markActivityDone(activityId);
            if (success) {
              await loadData();
              Alert.alert('Success', 'Activity marked as done');
            } else {
              Alert.alert('Error', 'Failed to mark activity as done');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getActivityStateColor = (state: string) => {
    switch (state) {
      case 'overdue': return '#FF3B30';
      case 'today': return '#FF9500';
      case 'planned': return '#34C759';
      default: return '#666';
    }
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
        onPress={() => setActiveTab('messages')}
      >
        <MaterialIcons 
          name="message" 
          size={20} 
          color={activeTab === 'messages' ? '#007AFF' : '#666'} 
        />
        <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>
          Messages ({messages.length})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'activities' && styles.activeTab]}
        onPress={() => setActiveTab('activities')}
      >
        <MaterialIcons 
          name="event" 
          size={20} 
          color={activeTab === 'activities' ? '#007AFF' : '#666'} 
        />
        <Text style={[styles.tabText, activeTab === 'activities' && styles.activeTabText]}>
          Activities ({activities.length})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'followers' && styles.activeTab]}
        onPress={() => setActiveTab('followers')}
      >
        <MaterialIcons 
          name="people" 
          size={20} 
          color={activeTab === 'followers' ? '#007AFF' : '#666'} 
        />
        <Text style={[styles.tabText, activeTab === 'followers' && styles.activeTabText]}>
          Followers ({followers.length})
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderMessages = () => (
    <View style={styles.tabContent}>
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowMessageComposer(true)}
        >
          <MaterialIcons name="add-comment" size={20} color="#007AFF" />
          <Text style={styles.actionButtonText}>Add Message</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.messagesList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {messages.map((message) => (
          <View key={message.id} style={styles.messageCard}>
            <View style={styles.messageHeader}>
              <Text style={styles.messageAuthor}>
                {message.author_id ? message.author_id[1] : 'System'}
              </Text>
              <Text style={styles.messageDate}>
                {formatDateTime(message.create_date)}
              </Text>
              {message.is_internal && (
                <View style={styles.internalBadge}>
                  <Text style={styles.internalBadgeText}>Internal</Text>
                </View>
              )}
            </View>
            {message.subject && (
              <Text style={styles.messageSubject}>{message.subject}</Text>
            )}
            <Text style={styles.messageBody}>
              {message.body.replace(/<[^>]*>/g, '')} {/* Strip HTML */}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderActivities = () => (
    <View style={styles.tabContent}>
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowActivityModal(true)}
        >
          <MaterialIcons name="add" size={20} color="#007AFF" />
          <Text style={styles.actionButtonText}>Schedule Activity</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.activitiesList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {activities.map((activity) => (
          <View key={activity.id} style={styles.activityCard}>
            <View style={styles.activityHeader}>
              <View style={styles.activityInfo}>
                <Text style={styles.activitySummary}>{activity.summary}</Text>
                <Text style={styles.activityType}>
                  {activity.activity_type_id[1]}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => handleMarkActivityDone(activity.id)}
              >
                <MaterialIcons name="check" size={20} color="#34C759" />
              </TouchableOpacity>
            </View>
            <View style={styles.activityDetails}>
              <Text style={styles.activityUser}>
                Assigned to: {activity.user_id[1]}
              </Text>
              <Text style={[
                styles.activityDueDate,
                { color: getActivityStateColor(activity.state) }
              ]}>
                Due: {formatDate(activity.date_deadline)} ({activity.state})
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const renderFollowers = () => (
    <View style={styles.tabContent}>
      <ScrollView 
        style={styles.followersList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {followers.map((follower) => (
          <View key={follower.id} style={styles.followerCard}>
            <MaterialIcons name="person" size={24} color="#666" />
            <Text style={styles.followerName}>
              {follower.partner_id[1]}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Chatter - {recordName || `${model}:${recordId}`}
        </Text>
      </View>

      {renderTabBar()}

      {activeTab === 'messages' && renderMessages()}
      {activeTab === 'activities' && renderActivities()}
      {activeTab === 'followers' && renderFollowers()}

      {/* Message Composer Modal */}
      <Modal
        visible={showMessageComposer}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMessageComposer(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Message</Text>
            <TouchableOpacity onPress={handlePostMessage}>
              <Text style={styles.modalSave}>Post</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[styles.toggle, !isInternalNote && styles.toggleActive]}
                onPress={() => setIsInternalNote(false)}
              >
                <Text style={[styles.toggleText, !isInternalNote && styles.toggleTextActive]}>
                  Public Comment
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggle, isInternalNote && styles.toggleActive]}
                onPress={() => setIsInternalNote(true)}
              >
                <Text style={[styles.toggleText, isInternalNote && styles.toggleTextActive]}>
                  Internal Note
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.messageInput}
              placeholder="Type your message..."
              value={messageText}
              onChangeText={setMessageText}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>
        </View>
      </Modal>

      {/* Activity Modal */}
      <Modal
        visible={showActivityModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowActivityModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Schedule Activity</Text>
            <TouchableOpacity onPress={handleScheduleActivity}>
              <Text style={styles.modalSave}>Schedule</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <TextInput
              style={styles.input}
              placeholder="Activity summary"
              value={activitySummary}
              onChangeText={setActivitySummary}
            />

            <TextInput
              style={styles.input}
              placeholder="Due date (YYYY-MM-DD)"
              value={activityDueDate}
              onChangeText={setActivityDueDate}
            />

            <Text style={styles.label}>Activity Type:</Text>
            <ScrollView style={styles.activityTypesList}>
              {activityTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.activityTypeItem,
                    selectedActivityType === type.id && styles.activityTypeItemSelected
                  ]}
                  onPress={() => setSelectedActivityType(type.id)}
                >
                  <Text style={[
                    styles.activityTypeName,
                    selectedActivityType === type.id && styles.activityTypeNameSelected
                  ]}>
                    {type.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#FFF',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  actionBar: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '600',
  },
  messagesList: {
    flex: 1,
    padding: 16,
  },
  messageCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  messageDate: {
    fontSize: 12,
    color: '#666',
  },
  internalBadge: {
    backgroundColor: '#FF9500',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  internalBadgeText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '600',
  },
  messageSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  messageBody: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  activitiesList: {
    flex: 1,
    padding: 16,
  },
  activityCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  activityInfo: {
    flex: 1,
  },
  activitySummary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  activityType: {
    fontSize: 12,
    color: '#666',
  },
  doneButton: {
    padding: 4,
  },
  activityDetails: {
    marginTop: 4,
  },
  activityUser: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  activityDueDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  followersList: {
    flex: 1,
    padding: 16,
  },
  followerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  followerName: {
    fontSize: 14,
    color: '#1A1A1A',
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
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalCancel: {
    fontSize: 16,
    color: '#666',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  modalSave: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#E5E5E5',
    borderRadius: 8,
    padding: 2,
  },
  toggle: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#007AFF',
  },
  toggleText: {
    fontSize: 14,
    color: '#666',
  },
  toggleTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  messageInput: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    minHeight: 120,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  activityTypesList: {
    maxHeight: 200,
  },
  activityTypeItem: {
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  activityTypeItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  activityTypeName: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  activityTypeNameSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
});
