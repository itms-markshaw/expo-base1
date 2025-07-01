/**
 * Simple Chatter Component - Intuitive and Reliable
 * Focuses on core functionality with bottom sheets and Odoo-style buttons
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
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { chatterService, ChatterMessage, ChatterActivity } from '../services/chatterService';
import { odooActionsService, OdooAction } from '../services/odooActions';
import { attachmentsService, OdooAttachment } from '../services/attachmentsService';
import { formatRelationalField } from '../utils/relationalFieldUtils';

interface SimpleChatterProps {
  model: string;
  recordId: number;
  recordName?: string;
}

const { height: screenHeight } = Dimensions.get('window');

export default function SimpleChatterComponent({ model, recordId, recordName }: SimpleChatterProps) {
  const [activeTab, setActiveTab] = useState<'messages' | 'activities' | 'attachments'>('messages');
  const [messages, setMessages] = useState<ChatterMessage[]>([]);
  const [activities, setActivities] = useState<ChatterActivity[]>([]);
  const [attachments, setAttachments] = useState<OdooAttachment[]>([]);
  const [availableActions, setAvailableActions] = useState<OdooAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Bottom sheet states
  const [showMessageSheet, setShowMessageSheet] = useState(false);
  const [showActivitySheet, setShowActivitySheet] = useState(false);
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);

  // Message composition
  const [messageText, setMessageText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);

  // Activity scheduling
  const [activitySummary, setActivitySummary] = useState('');
  const [activityDueDate, setActivityDueDate] = useState('');

  useEffect(() => {
    loadData();
    loadActions();
  }, [model, recordId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [messagesData, activitiesData, attachmentsData] = await Promise.all([
        chatterService.getMessages(model, recordId, 10),
        chatterService.getActivities(model, recordId),
        attachmentsService.getAttachments(model, recordId),
      ]);

      setMessages(messagesData);
      setActivities(activitiesData);
      setAttachments(attachmentsData);
    } catch (error) {
      console.error('Failed to load chatter data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActions = () => {
    const actions = odooActionsService.getActionsForModel(model);
    setAvailableActions(actions);
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
      const result = await chatterService.postMessage(
        model,
        recordId,
        messageText,
        isInternalNote
      );

      if (result) {
        setMessageText('');
        setShowMessageSheet(false);
        await loadData();
        Alert.alert('Success', 'Message posted successfully');
      } else {
        Alert.alert('Error', 'Failed to post message');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to post message');
    }
  };

  const handleScheduleActivity = async () => {
    if (!activitySummary.trim()) {
      Alert.alert('Error', 'Please enter activity summary');
      return;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dueDate = activityDueDate || tomorrow.toISOString().split('T')[0];

    try {
      const result = await chatterService.scheduleActivity(
        model,
        recordId,
        1, // Default activity type
        activitySummary,
        dueDate
      );

      if (result) {
        setActivitySummary('');
        setActivityDueDate('');
        setShowActivitySheet(false);
        await loadData();
        Alert.alert('Success', 'Activity scheduled successfully');
      } else {
        Alert.alert('Error', 'Failed to schedule activity');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to schedule activity');
    }
  };

  const handleOdooAction = async (action: OdooAction) => {
    if (action.confirmMessage) {
      Alert.alert(
        'Confirm Action',
        action.confirmMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: () => executeAction(action) }
        ]
      );
    } else {
      executeAction(action);
    }
  };

  const executeAction = async (action: OdooAction) => {
    try {
      const result = await odooActionsService.executeAction(action, recordId);

      setShowActionsSheet(false);
      await loadData();

      if (result.success) {
        Alert.alert('Success', result.message);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to execute ${action.name}`);
    }
  };

  const handleUploadAttachment = async () => {
    try {
      const file = await attachmentsService.pickFile();
      if (!file) return;

      const attachmentId = await attachmentsService.uploadAttachment(
        model,
        recordId,
        file
      );

      if (attachmentId) {
        setShowAttachmentSheet(false);
        await loadData();
        Alert.alert('Success', 'File uploaded successfully');
      } else {
        Alert.alert('Error', 'Failed to upload file');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload file');
    }
  };

  const handleDownloadAttachment = async (attachment: OdooAttachment) => {
    try {
      const localUri = await attachmentsService.downloadAttachment(attachment);
      if (localUri) {
        Alert.alert('Success', `File downloaded to: ${localUri}`);
      } else {
        Alert.alert('Error', 'Failed to download file');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to download file');
    }
  };

  const handleDeleteAttachment = async (attachment: OdooAttachment) => {
    Alert.alert(
      'Delete Attachment',
      `Delete "${attachment.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await attachmentsService.deleteAttachment(
              attachment.id,
              model,
              recordId
            );
            if (success) {
              await loadData();
              Alert.alert('Success', 'Attachment deleted');
            } else {
              Alert.alert('Error', 'Failed to delete attachment');
            }
          }
        }
      ]
    );
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
          {messages.length} messages • {activities.length} activities • {attachments.length} files
        </Text>
      </View>

      {/* Tab Bar */}
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
            Messages
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
            Activities
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'attachments' && styles.activeTab]}
          onPress={() => setActiveTab('attachments')}
        >
          <MaterialIcons
            name="attach-file"
            size={20}
            color={activeTab === 'attachments' ? '#007AFF' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'attachments' && styles.activeTabText]}>
            Files
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        {activeTab === 'messages' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowMessageSheet(true)}
          >
            <MaterialIcons name="add-comment" size={20} color="#007AFF" />
            <Text style={styles.actionButtonText}>Add Message</Text>
          </TouchableOpacity>
        )}

        {activeTab === 'activities' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowActivitySheet(true)}
          >
            <MaterialIcons name="add" size={20} color="#FF9500" />
            <Text style={styles.actionButtonText}>Schedule Activity</Text>
          </TouchableOpacity>
        )}

        {activeTab === 'attachments' && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleUploadAttachment}
          >
            <MaterialIcons name="cloud-upload" size={20} color="#34C759" />
            <Text style={styles.actionButtonText}>Upload File</Text>
          </TouchableOpacity>
        )}

        {availableActions.length > 0 && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowActionsSheet(true)}
          >
            <MaterialIcons name="settings" size={20} color="#9C27B0" />
            <Text style={styles.actionButtonText}>Actions</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {activeTab === 'messages' && (
          <View style={styles.section}>
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
        )}

        {activeTab === 'activities' && (
          <View style={styles.section}>
            {activities.map((activity) => (
              <View key={activity.id} style={styles.activityCard}>
                <Text style={styles.activitySummary}>{activity.summary}</Text>
                <Text style={styles.activityDue}>
                  Due: {formatDate(activity.date_deadline)}
                </Text>
                <Text style={styles.activityUser}>
                  Assigned to: {activity.user_id ? formatRelationalField(activity.user_id) : 'Unassigned'}
                </Text>
              </View>
            ))}

            {activities.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialIcons name="event" size={48} color="#C7C7CC" />
                <Text style={styles.emptyStateText}>No activities scheduled</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'attachments' && (
          <View style={styles.section}>
            {attachments.map((attachment) => (
              <View key={attachment.id} style={styles.attachmentCard}>
                <View style={styles.attachmentHeader}>
                  <MaterialIcons
                    name={attachmentsService.getFileIcon(attachment.mimetype) as any}
                    size={24}
                    color={attachmentsService.getFileColor(attachment.mimetype)}
                  />
                  <View style={styles.attachmentInfo}>
                    <Text style={styles.attachmentName}>{attachment.name}</Text>
                    <Text style={styles.attachmentDetails}>
                      {attachmentsService.formatFileSize(attachment.file_size)} • {formatDate(attachment.create_date)}
                    </Text>
                    <Text style={styles.attachmentAuthor}>
                      Uploaded by {attachment.create_uid[1]}
                    </Text>
                  </View>
                  <View style={styles.attachmentActions}>
                    <TouchableOpacity
                      style={styles.attachmentAction}
                      onPress={() => handleDownloadAttachment(attachment)}
                    >
                      <MaterialIcons name="download" size={20} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.attachmentAction}
                      onPress={() => handleDeleteAttachment(attachment)}
                    >
                      <MaterialIcons name="delete" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            {attachments.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialIcons name="attach-file" size={48} color="#C7C7CC" />
                <Text style={styles.emptyStateText}>No files attached</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Message Bottom Sheet */}
      {renderBottomSheet(
        showMessageSheet,
        () => setShowMessageSheet(false),
        'Add Message',
        <View>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggle, !isInternalNote && styles.toggleActive]}
              onPress={() => setIsInternalNote(false)}
            >
              <Text style={[styles.toggleText, !isInternalNote && styles.toggleTextActive]}>
                Comment
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

          <TextInput
            style={styles.textInput}
            placeholder="Due date (YYYY-MM-DD) - optional"
            value={activityDueDate}
            onChangeText={setActivityDueDate}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleScheduleActivity}
          >
            <Text style={styles.primaryButtonText}>Schedule Activity</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Actions Bottom Sheet */}
      {availableActions.length > 0 && renderBottomSheet(
        showActionsSheet,
        () => setShowActionsSheet(false),
        'Odoo Actions',
        <View>
          {availableActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.actionItem}
              onPress={() => handleOdooAction(action)}
            >
              <MaterialIcons name={action.icon as any} size={24} color={action.color} />
              <View style={styles.actionItemContent}>
                <Text style={styles.actionItemTitle}>{action.name}</Text>
                <Text style={styles.actionItemDesc}>{action.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
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
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E5E5',
    borderRadius: 8,
    padding: 2,
    marginBottom: 16,
  },
  toggle: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
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
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionItemContent: {
    marginLeft: 12,
    flex: 1,
  },
  actionItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  actionItemDesc: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
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
    gap: 4,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  activityUser: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  attachmentCard: {
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
  attachmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachmentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  attachmentDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  attachmentAuthor: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  attachmentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  attachmentAction: {
    padding: 4,
  },
});
