/**
 * Expandable Chatter Component - Messages expand in bottom sheets with reply and @mentions
 * Features: Expandable messages, reply functionality, @mention picker, log buttons
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
import { authService } from '../services/auth';

interface ExpandableChatterProps {
  model: string;
  recordId: number;
  recordName?: string;
}

interface BasicMessage {
  id: number;
  body: string;
  create_date: string;
  author_id?: [number, string];
  message_type?: string;
}

interface BasicActivity {
  id: number;
  summary: string;
  date_deadline: string;
  user_id?: [number, string];
}

interface Employee {
  id: number;
  name: string;
  work_email?: string;
  job_title?: string;
  user_id?: [number, string];
}

export default function ExpandableChatterComponent({ model, recordId, recordName }: ExpandableChatterProps) {
  const [messages, setMessages] = useState<BasicMessage[]>([]);
  const [activities, setActivities] = useState<BasicActivity[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Bottom sheet states
  const [showMessageSheet, setShowMessageSheet] = useState(false);
  const [showActivitySheet, setShowActivitySheet] = useState(false);
  const [showMessageDetail, setShowMessageDetail] = useState(false);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<BasicMessage | null>(null);

  // Form states
  const [messageText, setMessageText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [activitySummary, setActivitySummary] = useState('');
  const [selectedMentions, setSelectedMentions] = useState<Employee[]>([]);

  useEffect(() => {
    loadData();
    loadEmployees();
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

      // Try with model field first
      try {
        const messages = await client.searchRead('mail.message', 
          [
            ['model', '=', model], 
            ['res_id', '=', recordId]
          ], 
          ['id', 'body', 'create_date', 'author_id', 'message_type'], 
          { 
            limit: 20, 
            order: 'create_date desc' 
          }
        );
        setMessages(messages);
      } catch (modelError) {
        // Fallback to res_model field
        const messages = await client.searchRead('mail.message', 
          [
            ['res_model', '=', model], 
            ['res_id', '=', recordId]
          ], 
          ['id', 'body', 'create_date', 'author_id'], 
          { 
            limit: 20, 
            order: 'create_date desc' 
          }
        );
        setMessages(messages);
      }
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

  const loadEmployees = async () => {
    try {
      const client = authService.getClient();
      if (!client) return;

      const employees = await client.searchRead('hr.employee', 
        [['active', '=', true]], 
        ['id', 'name', 'work_email', 'job_title', 'user_id'], 
        { 
          limit: 50,
          order: 'name asc' 
        }
      );

      setEmployees(employees);
    } catch (error) {
      console.log('⚠️ Could not load employees:', error.message);
      setEmployees([]);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleMessageTap = (message: BasicMessage) => {
    setSelectedMessage(message);
    setShowMessageDetail(true);
  };

  const handlePostMessage = async () => {
    if (!messageText.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      // Format message with mentions
      let formattedMessage = messageText;
      if (selectedMentions.length > 0) {
        selectedMentions.forEach(employee => {
          const mentionTag = `@${employee.name}`;
          if (employee.user_id) {
            const mentionHtml = `<a href="#" data-oe-model="res.users" data-oe-id="${employee.user_id[0]}">@${employee.name}</a>`;
            formattedMessage = formattedMessage.replace(mentionTag, mentionHtml);
          }
        });
      }

      await client.callModel(model, 'message_post', [recordId], {
        body: formattedMessage,
      });

      setMessageText('');
      setSelectedMentions([]);
      setShowMessageSheet(false);
      await loadData();
      Alert.alert('Success', 'Message posted successfully');
    } catch (error) {
      console.error('Failed to post message:', error);
      Alert.alert('Error', 'Failed to post message');
    }
  };

  const handleReplyToMessage = async () => {
    if (!replyText.trim() || !selectedMessage) {
      Alert.alert('Error', 'Please enter a reply');
      return;
    }

    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      // Format reply with mentions
      let formattedReply = replyText;
      if (selectedMentions.length > 0) {
        selectedMentions.forEach(employee => {
          const mentionTag = `@${employee.name}`;
          if (employee.user_id) {
            const mentionHtml = `<a href="#" data-oe-model="res.users" data-oe-id="${employee.user_id[0]}">@${employee.name}</a>`;
            formattedReply = formattedReply.replace(mentionTag, mentionHtml);
          }
        });
      }

      const replyBody = `<p><strong>Reply to:</strong> ${stripHtml(selectedMessage.body).substring(0, 50)}...</p><p>${formattedReply}</p>`;

      await client.callModel(model, 'message_post', [recordId], {
        body: replyBody,
      });

      setReplyText('');
      setSelectedMentions([]);
      setShowMessageDetail(false);
      await loadData();
      Alert.alert('Success', 'Reply posted successfully');
    } catch (error) {
      console.error('Failed to post reply:', error);
      Alert.alert('Error', 'Failed to post reply');
    }
  };

  const handleLogNote = async () => {
    if (!selectedMessage) return;

    try {
      const client = authService.getClient();
      if (!client) throw new Error('Not authenticated');

      const logBody = `<p><strong>Internal Log:</strong> Message reviewed and noted</p><p><em>Original message:</em> ${stripHtml(selectedMessage.body).substring(0, 100)}...</p>`;

      await client.callModel(model, 'message_post', [recordId], {
        body: logBody,
        message_type: 'comment',
        subtype_xmlid: 'mail.mt_note', // Internal note
      });

      setShowMessageDetail(false);
      await loadData();
      Alert.alert('Success', 'Internal note logged');
    } catch (error) {
      console.error('Failed to log note:', error);
      Alert.alert('Error', 'Failed to log note');
    }
  };

  const handleAddMention = (employee: Employee) => {
    if (!selectedMentions.find(m => m.id === employee.id)) {
      setSelectedMentions([...selectedMentions, employee]);
      const currentText = showMessageDetail ? replyText : messageText;
      const newText = currentText + `@${employee.name} `;
      
      if (showMessageDetail) {
        setReplyText(newText);
      } else {
        setMessageText(newText);
      }
    }
    setShowMentionPicker(false);
  };

  const handleRemoveMention = (employeeId: number) => {
    const employee = selectedMentions.find(m => m.id === employeeId);
    if (employee) {
      setSelectedMentions(selectedMentions.filter(m => m.id !== employeeId));
      const mentionTag = `@${employee.name} `;
      
      if (showMessageDetail) {
        setReplyText(replyText.replace(mentionTag, ''));
      } else {
        setMessageText(messageText.replace(mentionTag, ''));
      }
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
          <MaterialIcons name="add-comment" size={20} color="#007AFF" />
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
                    Assigned to: {activity.user_id[1]}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Messages Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💬 Messages (Tap to expand)</Text>
          {messages.map((message) => (
            <TouchableOpacity
              key={message.id}
              style={styles.messageCard}
              onPress={() => handleMessageTap(message)}
            >
              <View style={styles.messageHeader}>
                <Text style={styles.messageAuthor}>
                  {message.author_id ? message.author_id[1] : 'System'}
                </Text>
                <View style={styles.messageActions}>
                  <Text style={styles.messageDate}>
                    {formatDateTime(message.create_date)}
                  </Text>
                  <MaterialIcons name="expand-more" size={16} color="#666" />
                </View>
              </View>
              <Text style={styles.messageBody} numberOfLines={2}>
                {stripHtml(message.body)}
              </Text>
              {message.message_type && (
                <View style={styles.messageTypeBadge}>
                  <Text style={styles.messageTypeText}>{message.message_type}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
          
          {messages.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="message" size={48} color="#C7C7CC" />
              <Text style={styles.emptyStateText}>No messages yet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Message Composer Bottom Sheet */}
      {renderBottomSheet(
        showMessageSheet,
        () => setShowMessageSheet(false),
        'Add Message',
        <View>
          {/* Selected Mentions */}
          {selectedMentions.length > 0 && (
            <View style={styles.mentionsContainer}>
              <Text style={styles.mentionsLabel}>Mentions:</Text>
              <View style={styles.mentionsList}>
                {selectedMentions.map((employee) => (
                  <View key={employee.id} style={styles.mentionChip}>
                    <Text style={styles.mentionChipText}>@{employee.name}</Text>
                    <TouchableOpacity onPress={() => handleRemoveMention(employee.id)}>
                      <MaterialIcons name="close" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.inputContainer}>
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
              style={styles.mentionButton}
              onPress={() => setShowMentionPicker(true)}
            >
              <MaterialIcons name="alternate-email" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handlePostMessage}
          >
            <Text style={styles.primaryButtonText}>Post Message</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Message Detail Bottom Sheet */}
      {renderBottomSheet(
        showMessageDetail,
        () => setShowMessageDetail(false),
        'Message Details',
        selectedMessage && (
          <View>
            {/* Original Message */}
            <View style={styles.originalMessage}>
              <Text style={styles.originalMessageAuthor}>
                {selectedMessage.author_id ? selectedMessage.author_id[1] : 'System'}
              </Text>
              <Text style={styles.originalMessageDate}>
                {formatDateTime(selectedMessage.create_date)}
              </Text>
              <Text style={styles.originalMessageBody}>
                {stripHtml(selectedMessage.body)}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.messageDetailActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.replyButton]}
                onPress={handleLogNote}
              >
                <MaterialIcons name="note-add" size={20} color="#FF9500" />
                <Text style={styles.actionButtonText}>Log Note</Text>
              </TouchableOpacity>
            </View>

            {/* Reply Section */}
            <Text style={styles.replyLabel}>Reply:</Text>
            
            {/* Selected Mentions for Reply */}
            {selectedMentions.length > 0 && (
              <View style={styles.mentionsContainer}>
                <Text style={styles.mentionsLabel}>Mentions:</Text>
                <View style={styles.mentionsList}>
                  {selectedMentions.map((employee) => (
                    <View key={employee.id} style={styles.mentionChip}>
                      <Text style={styles.mentionChipText}>@{employee.name}</Text>
                      <TouchableOpacity onPress={() => handleRemoveMention(employee.id)}>
                        <MaterialIcons name="close" size={16} color="#666" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Type your reply..."
                value={replyText}
                onChangeText={setReplyText}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={styles.mentionButton}
                onPress={() => setShowMentionPicker(true)}
              >
                <MaterialIcons name="alternate-email" size={24} color="#007AFF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleReplyToMessage}
            >
              <Text style={styles.primaryButtonText}>Send Reply</Text>
            </TouchableOpacity>
          </View>
        )
      )}

      {/* Mention Picker Modal */}
      <Modal
        visible={showMentionPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.bottomSheet}>
          <View style={styles.bottomSheetHeader}>
            <TouchableOpacity onPress={() => setShowMentionPicker(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.bottomSheetTitle}>Select Employee to Mention</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.bottomSheetContent}>
            {employees.map((employee) => (
              <TouchableOpacity
                key={employee.id}
                style={styles.employeeItem}
                onPress={() => handleAddMention(employee)}
              >
                <MaterialIcons name="person" size={24} color="#666" />
                <View style={styles.employeeInfo}>
                  <Text style={styles.employeeName}>{employee.name}</Text>
                  {employee.job_title && (
                    <Text style={styles.employeeTitle}>{employee.job_title}</Text>
                  )}
                  {employee.work_email && (
                    <Text style={styles.employeeEmail}>{employee.work_email}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
            
            {employees.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialIcons name="person" size={48} color="#C7C7CC" />
                <Text style={styles.emptyStateText}>No employees found</Text>
              </View>
            )}
          </ScrollView>
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
  replyButton: {
    backgroundColor: '#FFF5E6',
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
    alignItems: 'center',
    marginBottom: 8,
  },
  messageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  messageTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E8',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 8,
  },
  messageTypeText: {
    fontSize: 11,
    color: '#34C759',
    fontWeight: '600',
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
  mentionsContainer: {
    marginBottom: 12,
  },
  mentionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  mentionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mentionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  mentionChipText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    paddingRight: 48,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  mentionButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 8,
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
  originalMessage: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  originalMessageAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  originalMessageDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  originalMessageBody: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  messageDetailActions: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  replyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  employeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  employeeInfo: {
    marginLeft: 12,
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  employeeTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  employeeEmail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
});
