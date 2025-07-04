/**
 * Basic Chatter Component - Ultra-Reliable Version
 * Avoids problematic fields and focuses on core functionality
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
import { authService } from '../services/BaseAuthService';
import { formatRelationalField } from '../../../utils/relationalFieldUtils';

interface BasicChatterProps {
  model: string;
  recordId: number;
  recordName?: string;
}

interface BasicMessage {
  id: number;
  body: string;
  create_date: string;
  author_id?: [number, string];
}

interface BasicActivity {
  id: number;
  summary: string;
  date_deadline: string;
  user_id?: [number, string];
}

export default function BasicChatterComponent({ model, recordId, recordName }: BasicChatterProps) {
  const [messages, setMessages] = useState<BasicMessage[]>([]);
  const [activities, setActivities] = useState<BasicActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Bottom sheet states
  const [showMessageSheet, setShowMessageSheet] = useState(false);
  const [showActivitySheet, setShowActivitySheet] = useState(false);

  // Form states
  const [messageText, setMessageText] = useState('');
  const [activitySummary, setActivitySummary] = useState('');

  useEffect(() => {
    loadData();
  }, [model, recordId]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadMessages(),
        loadActivities(),
      ]);
    } catch (error) {
      console.error('Failed to load chatter data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const client = authService.getClient();
      if (!client) return;

      // Use the most basic message query possible
      const messages = await client.searchRead('mail.message', 
        [
          ['model', '=', model], 
          ['res_id', '=', recordId]
        ], 
        ['id', 'body', 'create_date', 'author_id'], 
        { 
          limit: 10, 
          order: 'create_date desc' 
        }
      );

      setMessages(messages);
    } catch (error) {
      console.log('⚠️ Could not load messages:', error.message);
      setMessages([]);
    }
  };

  const loadActivities = async () => {
    try {
      const client = authService.getClient();
      if (!client) return;

      const activities = await client.searchRead('mail.activity', 
        [
          ['res_model', '=', model], 
          ['res_id', '=', recordId]
        ], 
        ['id', 'summary', 'date_deadline', 'user_id'], 
        { 
          order: 'date_deadline asc' 
        }
      );

      setActivities(activities);
    } catch (error) {
      console.log('⚠️ Could not load activities:', error.message);
      setActivities([]);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handlePostMessage = async () => {
    if (!messageText.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      // Use the reliable message_post method
      await client.callModel(model, 'message_post', [], {
        body: messageText,
      });

      setMessageText('');
      setShowMessageSheet(false);
      await loadData();
      Alert.alert('Success', 'Message posted successfully');
    } catch (error) {
      console.error('Failed to post message:', error);
      Alert.alert('Error', 'Failed to post message');
    }
  };

  const handleScheduleActivity = async () => {
    if (!activitySummary.trim()) {
      Alert.alert('Error', 'Please enter activity summary');
      return;
    }

    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get model ID
      const models = await client.searchRead('ir.model', 
        [['model', '=', model]], 
        ['id'], 
        { limit: 1 }
      );

      if (models.length === 0) {
        throw new Error('Could not find model');
      }

      const activityData = {
        res_model: model,
        res_model_id: models[0].id,
        res_id: recordId,
        summary: activitySummary,
        date_deadline: tomorrow.toISOString().split('T')[0],
        user_id: client.uid,
      };

      await client.create('mail.activity', activityData);

      setActivitySummary('');
      setShowActivitySheet(false);
      await loadData();
      Alert.alert('Success', 'Activity scheduled successfully');
    } catch (error) {
      console.error('Failed to schedule activity:', error);
      Alert.alert('Error', 'Failed to schedule activity');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, '').trim();
  };

  const renderBottomSheet = (visible: boolean, onClose: () => void, title: string, children: React.ReactNode) => (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.bottomSheet}>
        <View style={styles.bottomSheetHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.bottomSheetTitle}>{title}</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.bottomSheetContent}>
          {children}
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {recordName || `${model}:${recordId}`}
        </Text>
        <Text style={styles.subtitle}>
          {messages.length} messages • {activities.length} activities
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowMessageSheet(true)}
        >
          <MaterialIcons name="message" size={20} color="#007AFF" />
          <Text style={styles.actionButtonText}>Message</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowActivitySheet(true)}
        >
          <MaterialIcons name="event" size={20} color="#FF9500" />
          <Text style={styles.actionButtonText}>Activity</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Activities Section */}
        {activities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Activities</Text>
            {activities.map((activity) => (
              <View key={activity.id} style={styles.activityCard}>
                <Text style={styles.activitySummary}>{activity.summary}</Text>
                <Text style={styles.activityDue}>
                  Due: {formatDate(activity.date_deadline)}
                </Text>
                {activity.user_id && (
                  <Text style={styles.activityUser}>
                    Assigned to: {formatRelationalField(activity.user_id)}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Messages Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💬 Messages</Text>
          {messages.map((message) => (
            <View key={message.id} style={styles.messageCard}>
              <View style={styles.messageHeader}>
                <Text style={styles.messageAuthor}>
                  {message.author_id ? message.author_id[1] : 'System'}
                </Text>
                <Text style={styles.messageDate}>
                  {formatDateTime(message.create_date)}
                </Text>
              </View>
              <Text style={styles.messageBody}>
                {stripHtml(message.body)}
              </Text>
            </View>
          ))}
          
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="message" size={48} color="#C7C7CC" />
              <Text style={styles.emptyStateText}>No messages yet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Message Bottom Sheet */}
      {renderBottomSheet(
        showMessageSheet,
        () => setShowMessageSheet(false),
        'Add Message',
        <View>
          <TextInput
            style={styles.textInput}
            placeholder="Type your message..."
            value={messageText}
            onChangeText={setMessageText}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handlePostMessage}
          >
            <Text style={styles.primaryButtonText}>Post Message</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Activity Bottom Sheet */}
      {renderBottomSheet(
        showActivitySheet,
        () => setShowActivitySheet(false),
        'Schedule Activity',
        <View>
          <TextInput
            style={styles.textInput}
            placeholder="Activity summary (e.g., Call customer)"
            value={activitySummary}
            onChangeText={setActivitySummary}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleScheduleActivity}
          >
            <Text style={styles.primaryButtonText}>Schedule Activity</Text>
          </TouchableOpacity>
        </View>
      )}
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
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  activityCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  activitySummary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  activityDue: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  activityUser: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  messageCard: {
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
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  messageAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  messageDate: {
    fontSize: 12,
    color: '#666',
  },
  messageBody: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  bottomSheetContent: {
    flex: 1,
    padding: 16,
  },
  textInput: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
